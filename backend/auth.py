"""Authentication middleware for password-gated access."""
from __future__ import annotations

import os
import secrets
import logging
from datetime import datetime, timedelta, timezone
from functools import wraps

from flask import request, jsonify

from db import cursor

logger = logging.getLogger(__name__)

PASSWORD = os.environ.get("DASHBOARD_PASSWORD")
TOKEN_TTL_DAYS = 7


def _cleanup_expired():
    """Remove expired sessions."""
    now = datetime.now(timezone.utc).isoformat()
    with cursor() as cur:
        cur.execute("DELETE FROM auth_sessions WHERE expires_at < ?", (now,))


def authenticate(password: str) -> dict | tuple:
    """Validate password and create session."""
    if not PASSWORD:
        return {"error": "DASHBOARD_PASSWORD not configured"}, 500

    if not secrets.compare_digest(password, PASSWORD):
        return {"error": "invalid_password"}, 401

    _cleanup_expired()

    token = secrets.token_urlsafe(32)
    csrf_token = secrets.token_hex(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(days=TOKEN_TTL_DAYS)).isoformat()

    with cursor() as cur:
        cur.execute(
            "INSERT INTO auth_sessions (token, csrf_token, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, csrf_token, datetime.now(timezone.utc).isoformat(), expires_at),
        )

    return {"token": token, "csrf_token": csrf_token, "expires_at": expires_at}


def _validate_token(token: str) -> dict | None:
    """Return session row if token is valid and not expired."""
    now = datetime.now(timezone.utc).isoformat()
    with cursor() as cur:
        cur.execute(
            "SELECT * FROM auth_sessions WHERE token = ? AND expires_at > ?",
            (token, now),
        )
        return cur.fetchone()


def require_auth(f):
    """Decorator: require valid Bearer token. Skip if DASHBOARD_PASSWORD is not set."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not PASSWORD:
            return f(*args, **kwargs)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "unauthorized"}), 401

        token = auth_header[7:]
        session = _validate_token(token)
        if not session:
            return jsonify({"error": "unauthorized"}), 401

        # CSRF check on state-changing methods
        if request.method in ("POST", "PUT", "DELETE"):
            csrf = request.headers.get("X-CSRF-Token", "")
            if not secrets.compare_digest(csrf, session["csrf_token"]):
                return jsonify({"error": "csrf_invalid"}), 403

        return f(*args, **kwargs)
    return decorated
