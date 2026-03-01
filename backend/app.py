from __future__ import annotations

import os
import logging

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

from scheduler import AssignmentStore

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = Flask(__name__)
CORS(app)

api_url = os.environ.get("CANVAS_API_URL", "https://canvas.mit.edu")
api_token = os.environ.get("CANVAS_API_TOKEN", "")
ttl = int(os.environ.get("CACHE_TTL_SECONDS", "300"))

store = AssignmentStore(api_url, api_token, ttl)


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
    return jsonify(store.get_all(urgency=urgency, course=course))


@app.route("/api/stats")
def stats():
    return jsonify(store.get_stats())


@app.route("/api/refresh", methods=["POST"])
def refresh():
    store.sync()
    return jsonify({"status": "ok", "assignments": store.get_all()})


if __name__ == "__main__":
    if not api_token:
        logging.warning("CANVAS_API_TOKEN not set — set it in .env")
    else:
        store.start_background_sync()
    app.run(host="0.0.0.0", port=8000, debug=True)
