from __future__ import annotations

import os
import logging

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]
CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), "google_credentials.json")
TOKEN_FILE = os.path.join(os.path.dirname(__file__), "token.json")

URGENCY_COLORS = {
    "critical": "11",  # red
    "high": "6",       # orange
    "medium": "9",     # blue
    "runway": "10",    # green
}


def is_authorized() -> bool:
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


def authorize() -> dict:
    if not os.path.exists(CREDENTIALS_FILE):
        return {
            "authorized": False,
            "error": "Missing google_credentials.json. Download OAuth Desktop credentials from Google Cloud Console and save as backend/google_credentials.json",
        }
    try:
        flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
        creds = flow.run_local_server(port=8090, prompt="consent")
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
        return {"authorized": True}
    except Exception as e:
        logger.exception("Google OAuth failed")
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
                privateExtendedProperty="canvas_assignment_id=*" if page_token is None else None,
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
