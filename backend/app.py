from __future__ import annotations

import os
import re
import logging

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

import anthropic

from scheduler import AssignmentStore
import gcal_client
from email_store import EmailTaskStore
from gmail_client import fetch_latest_announcements
from email_extractor import extract_tasks as extract_email_tasks
import db
import meta_store
from constants import (
    CACHE_TTL_SECONDS_DEFAULT,
    EMAIL_SYNC_RATE_LIMIT,
    NEXT_ACTION_MAX_CHARS,
    NEXT_ACTION_PROMPT_NAME_MAX,
    NEXT_ACTION_PROMPT_DESC_MAX,
    NEXT_ACTION_PROMPT_COURSE_MAX,
    NEXT_ACTION_RATE_LIMIT,
)

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)
cors_origins = os.environ.get("CORS_ORIGIN", "http://localhost:5173").split(",")
CORS(app, origins=cors_origins)

limiter = Limiter(app=app, key_func=get_remote_address, default_limits=[])

api_url = os.environ.get("CANVAS_API_URL", "https://canvas.mit.edu")
api_token = os.environ.get("CANVAS_API_TOKEN", "")
ttl = int(os.environ.get("CACHE_TTL_SECONDS", str(CACHE_TTL_SECONDS_DEFAULT)))

store = AssignmentStore(api_url, api_token, ttl)
email_store = EmailTaskStore()
anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
google_available = gcal_client.credentials_available()


@app.route("/api/health")
def health():
    last = store.last_sync.isoformat() if store.last_sync else None
    status = "error" if store.error else "ok"
    return jsonify({
        "status": status,
        "last_sync": last,
        "assignment_count": len(store.get_all()),
        "error": store.error,
        "sync_errors": store.sync_errors,
    })


@app.route("/api/assignments")
def assignments():
    urgency = request.args.get("urgency")
    course = request.args.get("course")
    view = request.args.get("view")
    data = store.get_all(urgency=urgency, course=course, view=view)
    # Enrich with persistent meta
    ids = [str(a["id"]) for a in data]
    meta = meta_store.bulk_get_meta(ids)
    for a in data:
        m = meta.get(str(a["id"]), {})
        a["next_action"] = m.get("next_action")
        a["effort"] = m.get("effort")
        a["planned_day"] = m.get("planned_day")
        # Override checked from DB (more trusted than localStorage)
        if m.get("checked"):
            a["checked"] = True
            a["checked_at"] = m.get("checked_at")
        else:
            a.setdefault("checked", False)
            a.setdefault("checked_at", None)
    return jsonify(data)


@app.route("/api/stats")
def stats():
    return jsonify(store.get_stats())


@app.route("/api/refresh", methods=["POST"])
def refresh():
    try:
        store.sync()
        return jsonify({"status": "ok", "assignments": store.get_all()})
    except Exception as e:
        logger.exception("Refresh failed")
        return jsonify({"status": "error", "error": "Failed to refresh assignments. Check server logs."}), 500


@app.route("/api/canvas/status")
def canvas_status():
    configured = bool(api_token)
    return jsonify({
        "configured": configured,
        "api_url": api_url if configured else None,
    })


@app.route("/api/gcal/auth")
def gcal_auth():
    if not google_available:
        return jsonify({"authorized": False, "available": False})
    return jsonify({"authorized": gcal_client.is_authorized(), "available": True})


@app.route("/api/gcal/authorize", methods=["POST"])
def gcal_authorize():
    if not google_available:
        return jsonify({"error": "Google integration not configured. Set GOOGLE_CLIENT_JSON env var on Render, or add google_credentials.json locally."}), 400
    redirect_uri = request.url_root.rstrip("/") + "/api/gcal/callback"
    auth_url = gcal_client.get_auth_url(redirect_uri)
    return jsonify({"auth_url": auth_url})


@app.route("/api/gcal/callback")
def gcal_callback():
    code = request.args.get("code")
    if not code:
        error = request.args.get("error", "access_denied")
        return redirect(f"/?gcal=error&reason={error}")
    redirect_uri = request.url_root.rstrip("/") + "/api/gcal/callback"
    result = gcal_client.handle_callback(code, redirect_uri)
    if result.get("authorized"):
        return redirect("/?gcal=authorized")
    return redirect("/?gcal=error")


@app.route("/api/gcal/sync", methods=["POST"])
def gcal_sync():
    if not google_available:
        return jsonify({"error": "Google integration not configured"}), 400
    assignments = store.get_all()
    result = gcal_client.sync_to_calendar(assignments)
    return jsonify(result)


@app.route("/api/email/status")
def email_status():
    if not google_available:
        return jsonify({"connected": False, "available": False, "last_sync": None, "task_count": 0, "error": None})
    return jsonify({
        "authorized": gcal_client.is_authorized(),
        "last_sync": email_store.last_sync.isoformat() if email_store.last_sync else None,
        "task_count": len(email_store.get_all()),
        "error": email_store.error,
    })


@app.route("/api/email/tasks")
def email_tasks():
    return jsonify(email_store.get_all())


@limiter.limit(EMAIL_SYNC_RATE_LIMIT)
@app.route("/api/email/sync", methods=["POST"])
def email_sync():
    if not google_available:
        return jsonify({"error": "Google integration not configured"}), 400
    if not anthropic_key:
        return jsonify({"error": "ANTHROPIC_API_KEY not configured"}), 400
    try:
        email_data = fetch_latest_announcements()
        if email_data is None:
            return jsonify({"synced": 0, "message": "No announcement emails found"})

        if not email_store.should_process(email_data["message_id"]):
            return jsonify({
                "synced": len(email_store.get_all()),
                "message": "Already processed latest email",
            })

        tasks = extract_email_tasks(email_data, api_key=anthropic_key)
        email_store.update(tasks, last_message_id=email_data["message_id"])
        return jsonify({"synced": len(tasks), "message": f"Extracted {len(tasks)} tasks"})
    except Exception:
        logger.exception("Email sync failed")
        email_store.error = "Email sync failed"
        return jsonify({"error": "Email sync failed. Check server logs for details."}), 500


# --- Assignment metadata endpoints ---

@app.route("/api/assignments/<assignment_id>/meta", methods=["GET"])
def get_assignment_meta(assignment_id):
    """Return {next_action, effort, checked, checked_at} for one assignment."""
    try:
        return jsonify(meta_store.get_meta(assignment_id))
    except Exception:
        logger.exception("Failed to get meta for %s", assignment_id)
        return jsonify({"error": "Failed to load. Please try again."}), 500


@app.route("/api/assignments/<assignment_id>/next-action", methods=["PUT"])
def set_next_action(assignment_id):
    """Body: {"next_action": "string"}. Save it."""
    body = request.get_json(force=True) or {}
    next_action = body.get("next_action", "").strip()
    if len(next_action) > NEXT_ACTION_MAX_CHARS:
        return jsonify({"error": f"next_action too long (max {NEXT_ACTION_MAX_CHARS} chars)"}), 400
    try:
        meta_store.set_next_action(str(assignment_id), next_action)
        return jsonify({"ok": True})
    except Exception:
        logger.exception("Failed to save next action for %s", assignment_id)
        return jsonify({"error": "Failed to save. Please try again."}), 500


@app.route("/api/assignments/<assignment_id>/effort", methods=["PUT"])
def set_effort(assignment_id):
    """Body: {"effort": "S"|"M"|"L"|"XL"}. Save it."""
    body = request.get_json(force=True) or {}
    effort = body.get("effort", "")
    if effort not in ("S", "M", "L", "XL"):
        return jsonify({"error": "effort must be S, M, L, or XL"}), 400
    try:
        meta_store.set_effort(str(assignment_id), effort)
        return jsonify({"ok": True})
    except Exception:
        logger.exception("Failed to save effort for %s", assignment_id)
        return jsonify({"error": "Failed to save. Please try again."}), 500


@app.route("/api/assignments/<assignment_id>/checked", methods=["PUT"])
def set_checked(assignment_id):
    """Body: {"checked": true|false}. Save it."""
    body = request.get_json(force=True) or {}
    checked_raw = body.get("checked")
    if not isinstance(checked_raw, bool):
        return jsonify({"error": "checked must be a boolean"}), 400
    checked = checked_raw
    try:
        meta_store.set_checked(str(assignment_id), checked)
        return jsonify({"ok": True})
    except Exception:
        logger.exception("Failed to save checked for %s", assignment_id)
        return jsonify({"error": "Failed to save. Please try again."}), 500


@app.route("/api/assignments/<assignment_id>/planned-day", methods=["PUT"])
def set_planned_day(assignment_id):
    """Body: {"planned_day": "YYYY-MM-DD" | null}. Save it."""
    body = request.get_json(force=True) or {}
    planned_day = body.get("planned_day")
    if planned_day is not None:
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", str(planned_day)):
            return jsonify({"error": "planned_day must be YYYY-MM-DD or null"}), 400
    try:
        meta_store.set_planned_day(str(assignment_id), planned_day)
        return jsonify({"ok": True})
    except Exception:
        logger.exception("Failed to save planned_day for %s", assignment_id)
        return jsonify({"error": "Failed to save. Please try again."}), 500


@limiter.limit(NEXT_ACTION_RATE_LIMIT)
@app.route("/api/assignments/<assignment_id>/next-action/suggest", methods=["POST"])
def suggest_next_action(assignment_id):
    """Call Claude to suggest a next action for this assignment."""
    if not anthropic_key:
        return jsonify({"error": "ANTHROPIC_API_KEY not configured"}), 400
    body = request.get_json(force=True) or {}
    name = body.get("name", "")
    description = body.get("description", "")
    course = body.get("course_name", "")
    if not name:
        return jsonify({"error": "name required"}), 400
    try:
        client = anthropic.Anthropic(api_key=anthropic_key)
        prompt = (
            f"You are helping an MIT EMBA student identify the single next physical action for an assignment.\n\n"
            f"Course: {course[:NEXT_ACTION_PROMPT_COURSE_MAX]}\n"
            f"Assignment: {name[:NEXT_ACTION_PROMPT_NAME_MAX]}\n"
            f"Description: {description[:NEXT_ACTION_PROMPT_DESC_MAX] if description else 'No description provided'}\n\n"
            f"Respond with ONE sentence (max 120 chars) describing the first concrete physical action the student should take. "
            f"Start with a verb. No preamble, no explanation. Just the action.\n"
            f"Examples: 'Read Case pp. 12–18 and highlight 3 key tensions.' / 'Open Excel and build a DCF skeleton with placeholder values.'"
        )
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=80,
            messages=[{"role": "user", "content": prompt}],
        )
        suggestion = message.content[0].text.strip()
        # Auto-save
        meta_store.set_next_action(str(assignment_id), suggestion)
        return jsonify({"suggestion": suggestion, "saved": True})
    except Exception:
        logger.exception("Next action suggestion failed")
        return jsonify({"error": "Suggestion failed. Check server logs."}), 500


# Serve frontend static files (built React app)
DIST_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")


@app.route("/")
def serve_index():
    return send_from_directory(DIST_DIR, "index.html")


@app.route("/<path:path>")
def serve_static(path):
    file_path = os.path.join(DIST_DIR, path)
    if os.path.isfile(file_path):
        return send_from_directory(DIST_DIR, path)
    return send_from_directory(DIST_DIR, "index.html")


# Initialize database
db.init_db()

# Start background sync when running under gunicorn
if api_token and os.environ.get("GUNICORN_RUNNING"):
    store.start_background_sync()

if __name__ == "__main__":
    if not api_token:
        logging.warning("CANVAS_API_TOKEN not set — set it in .env")
    else:
        store.start_background_sync()
    app.run(host="127.0.0.1", port=8000, debug=os.environ.get("FLASK_DEBUG", "false").lower() == "true")
