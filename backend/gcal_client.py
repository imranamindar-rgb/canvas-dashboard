from __future__ import annotations

import json
import os
import logging

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/gmail.readonly",
]
CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), "google_credentials.json")
TOKEN_FILE = os.path.join(os.path.dirname(__file__), "token.json")

URGENCY_COLORS = {
    "overdue": "8",    # gray
    "critical": "11",  # red
    "high": "6",       # orange
    "medium": "9",     # blue
    "runway": "10",    # green
}


def credentials_available() -> bool:
    """Check if Google OAuth credentials are configured (file or env vars)."""
    if os.path.exists(CREDENTIALS_FILE):
        return True
    if os.environ.get("GOOGLE_CLIENT_JSON"):
        return True
    if os.environ.get("GOOGLE_CLIENT_ID") and os.environ.get("GOOGLE_CLIENT_SECRET"):
        return True
    return False


def _load_client_config() -> dict:
    """Load OAuth client config from env vars or file, normalized to 'web' type."""
    raw: dict | None = None

    client_json_str = os.environ.get("GOOGLE_CLIENT_JSON")
    if client_json_str:
        raw = json.loads(client_json_str)
    elif os.environ.get("GOOGLE_CLIENT_ID") and os.environ.get("GOOGLE_CLIENT_SECRET"):
        raw = {
            "web": {
                "client_id": os.environ["GOOGLE_CLIENT_ID"],
                "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [],
            }
        }
    elif os.path.exists(CREDENTIALS_FILE):
        with open(CREDENTIALS_FILE) as f:
            raw = json.load(f)
    else:
        raise RuntimeError("No Google credentials configured")

    # Normalize "installed" type to "web" type for redirect flow
    if raw and "installed" in raw and "web" not in raw:
        info = raw["installed"]
        raw = {
            "web": {
                "client_id": info["client_id"],
                "client_secret": info["client_secret"],
                "auth_uri": info.get("auth_uri", "https://accounts.google.com/o/oauth2/auth"),
                "token_uri": info.get("token_uri", "https://oauth2.googleapis.com/token"),
                "redirect_uris": info.get("redirect_uris", []),
            }
        }

    return raw


def is_authorized() -> bool:
    # Support token stored in env var (for Render persistence across restarts)
    token_json_env = os.environ.get("GOOGLE_TOKEN_JSON")
    if token_json_env and not os.path.exists(TOKEN_FILE):
        try:
            with open(TOKEN_FILE, "w") as f:
                f.write(token_json_env)
        except Exception:
            logger.exception("Failed to write token from GOOGLE_TOKEN_JSON env var")

    if not os.path.exists(TOKEN_FILE):
        return False
    try:
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
        if creds.valid:
            return True
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(TOKEN_FILE, "w") as f:
                f.write(creds.to_json())
            return True
    except Exception:
        logger.exception("Failed to validate Google credentials")
    return False


def get_auth_url(redirect_uri: str) -> str:
    """Generate OAuth authorization URL for the web redirect flow."""
    client_config = _load_client_config()
    flow = Flow.from_client_config(client_config, scopes=SCOPES, redirect_uri=redirect_uri)
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true",
    )
    return auth_url


def handle_callback(code: str, redirect_uri: str) -> dict:
    """Exchange OAuth authorization code for tokens and save them."""
    try:
        client_config = _load_client_config()
        flow = Flow.from_client_config(client_config, scopes=SCOPES, redirect_uri=redirect_uri)
        flow.fetch_token(code=code)
        creds = flow.credentials
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
        return {"authorized": True}
    except Exception as e:
        logger.exception("OAuth callback failed")
        return {"authorized": False, "error": str(e)}


def build_event(assignment: dict) -> dict:
    due = assignment["due_at"]
    summary = f"[{assignment['course_name']}] {assignment['name']}"

    description_parts = []
    if assignment.get("points_possible") is not None:
        description_parts.append(f"Points: {assignment['points_possible']}")
    description_parts.append(f"Course: {assignment['course_name']}")
    if assignment.get("html_url"):
        description_parts.append(f"Canvas: {assignment['html_url']}")
    description = "\n".join(description_parts)

    return {
        "summary": summary,
        "description": description,
        "start": {"dateTime": due, "timeZone": "UTC"},
        "end": {"dateTime": due, "timeZone": "UTC"},
        "colorId": URGENCY_COLORS.get(assignment.get("urgency", "runway"), "10"),
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "email", "minutes": 1440},
                {"method": "popup", "minutes": 60},
            ],
        },
        "extendedProperties": {
            "private": {
                "canvas_assignment_id": str(assignment["id"]),
            }
        },
    }


def _get_service():
    creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
    return build("calendar", "v3", credentials=creds)


def sync_to_calendar(assignments: list[dict]) -> dict:
    if not is_authorized():
        return {"synced": 0, "error": "Not authorized. Call /api/gcal/authorize first."}

    try:
        service = _get_service()

        # Fetch existing Canvas events to enable upsert
        existing = {}
        page_token = None
        while True:
            resp = service.events().list(
                calendarId="primary",
                privateExtendedProperty="canvas_assignment_id=*",
                pageToken=page_token,
                maxResults=250,
            ).execute()
            for item in resp.get("items", []):
                props = item.get("extendedProperties", {}).get("private", {})
                cid = props.get("canvas_assignment_id")
                if cid:
                    existing[cid] = item["id"]
            page_token = resp.get("nextPageToken")
            if not page_token:
                break

        synced = 0
        errors = []

        def _callback(request_id, response, exception):
            nonlocal synced
            if exception:
                errors.append(str(exception))
            else:
                synced += 1

        batch = service.new_batch_http_request(callback=_callback)
        for a in assignments:
            event = build_event(a)
            aid = str(a["id"])
            if aid in existing:
                batch.add(service.events().update(
                    calendarId="primary",
                    eventId=existing[aid],
                    body=event,
                ))
            else:
                batch.add(service.events().insert(
                    calendarId="primary",
                    body=event,
                ))
        batch.execute()

        result = {"synced": synced}
        if errors:
            result["errors"] = errors
        return result
    except Exception as e:
        logger.exception("Google Calendar sync failed")
        return {"synced": 0, "error": str(e)}
