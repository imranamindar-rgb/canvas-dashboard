from __future__ import annotations

import os
import logging

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

from scheduler import AssignmentStore
import gcal_client
from email_store import EmailTaskStore
from gmail_client import fetch_latest_announcements
from email_extractor import extract_tasks as extract_email_tasks

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)
cors_origins = os.environ.get("CORS_ORIGIN", "http://localhost:5173").split(",")
CORS(app, origins=cors_origins)

api_url = os.environ.get("CANVAS_API_URL", "https://canvas.mit.edu")
api_token = os.environ.get("CANVAS_API_TOKEN", "")
ttl = int(os.environ.get("CACHE_TTL_SECONDS", "300"))

store = AssignmentStore(api_url, api_token, ttl)
email_store = EmailTaskStore()
anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")


@app.route("/api/health")
def health():
    last = store.last_sync.isoformat() if store.last_sync else None
    status = "error" if store.error else "ok"
    return jsonify({
        "status": status,
        "last_sync": last,
        "assignment_count": len(store.get_all()),
        "error": store.error,
    })


@app.route("/api/assignments")
def assignments():
    urgency = request.args.get("urgency")
    course = request.args.get("course")
    view = request.args.get("view")
    return jsonify(store.get_all(urgency=urgency, course=course, view=view))


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


@app.route("/api/gcal/auth")
def gcal_auth():
    return jsonify({"authorized": gcal_client.is_authorized()})


@app.route("/api/gcal/authorize", methods=["POST"])
def gcal_authorize():
    result = gcal_client.authorize()
    return jsonify(result)


@app.route("/api/gcal/sync", methods=["POST"])
def gcal_sync():
    assignments = store.get_all()
    result = gcal_client.sync_to_calendar(assignments)
    return jsonify(result)


@app.route("/api/email/status")
def email_status():
    return jsonify({
        "authorized": gcal_client.is_authorized(),
        "last_sync": email_store.last_sync.isoformat() if email_store.last_sync else None,
        "task_count": len(email_store.get_all()),
        "error": email_store.error,
    })


@app.route("/api/email/tasks")
def email_tasks():
    return jsonify(email_store.get_all())


@app.route("/api/email/sync", methods=["POST"])
def email_sync():
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


# Start background sync when running under gunicorn
if api_token and os.environ.get("GUNICORN_RUNNING"):
    store.start_background_sync()

if __name__ == "__main__":
    if not api_token:
        logging.warning("CANVAS_API_TOKEN not set — set it in .env")
    else:
        store.start_background_sync()
    app.run(host="127.0.0.1", port=8000, debug=os.environ.get("FLASK_DEBUG", "false").lower() == "true")
