"""Gmail client for fetching EMBA announcement emails."""

from __future__ import annotations

import base64
import os
from email.utils import parsedate_to_datetime

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

TOKEN_FILE = os.path.join(os.path.dirname(__file__), "token.json")
SEARCH_QUERY = 'from:"MIT Executive MBA Program" subject:ANNOUNCEMENTS'


def _get_gmail_service():
    """Build authenticated Gmail API service."""
    from googleapiclient.discovery import build

    creds = Credentials.from_authorized_user_file(TOKEN_FILE)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
    return build("gmail", "v1", credentials=creds)


def fetch_latest_announcements() -> dict | None:
    """Fetch the most recent EMBA announcement email."""
    service = _get_gmail_service()
    results = (
        service.users()
        .messages()
        .list(userId="me", q=SEARCH_QUERY, maxResults=1)
        .execute()
    )
    messages = results.get("messages", [])
    if not messages:
        return None

    msg = (
        service.users()
        .messages()
        .get(userId="me", id=messages[0]["id"], format="full")
        .execute()
    )

    headers = {h["name"]: h["value"] for h in msg["payload"]["headers"]}
    subject = headers.get("Subject", "")
    date_str = headers.get("Date", "")

    body_data = _extract_body(msg["payload"])
    body = base64.urlsafe_b64decode(body_data).decode("utf-8") if body_data else ""

    date = None
    if date_str:
        try:
            date = parsedate_to_datetime(date_str)
        except Exception:
            date = None

    return {
        "message_id": msg["id"],
        "subject": subject,
        "date": date.isoformat() if date else None,
        "body": body,
    }


def _extract_body(payload: dict) -> str | None:
    """Recursively extract HTML body from Gmail message payload."""
    if payload.get("mimeType") == "text/html":
        return payload.get("body", {}).get("data")
    for part in payload.get("parts", []):
        result = _extract_body(part)
        if result:
            return result
    return payload.get("body", {}).get("data")
