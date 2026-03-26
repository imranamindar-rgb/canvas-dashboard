"""Gmail client for fetching EMBA announcement emails."""

from __future__ import annotations

import base64
import logging
import os
from email.utils import parsedate_to_datetime

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

from constants import EMAIL_SEARCH_NEWER_THAN_DAYS

logger = logging.getLogger(__name__)

TOKEN_FILE = os.path.join(os.path.dirname(__file__), "token.json")
SEARCH_QUERY = f'from:"MIT Executive MBA Program" subject:ANNOUNCEMENTS newer_than:{EMAIL_SEARCH_NEWER_THAN_DAYS}d'


def _get_gmail_service():
    """Build authenticated Gmail API service."""
    from googleapiclient.discovery import build

    try:
        creds = Credentials.from_authorized_user_file(TOKEN_FILE)
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(TOKEN_FILE, "w") as f:
                f.write(creds.to_json())
        return build("gmail", "v1", credentials=creds)
    except FileNotFoundError:
        raise RuntimeError(
            f"Gmail token file not found at {TOKEN_FILE}. "
            "Please authorize via /api/gcal/authorize first."
        )
    except Exception as e:
        raise RuntimeError(f"Failed to build Gmail service: {e}") from e


def fetch_latest_announcements() -> dict | None:
    """Fetch the most recent EMBA announcement email."""
    try:
        service = _get_gmail_service()
    except RuntimeError:
        logger.exception("Failed to initialize Gmail service")
        raise

    try:
        results = (
            service.users()
            .messages()
            .list(userId="me", q=SEARCH_QUERY, maxResults=1)
            .execute()
        )
    except Exception as e:
        logger.exception("Failed to list Gmail messages")
        raise RuntimeError(f"Failed to list Gmail messages: {e}") from e

    messages = results.get("messages", [])
    if not messages:
        return None

    try:
        msg = (
            service.users()
            .messages()
            .get(userId="me", id=messages[0]["id"], format="full")
            .execute()
        )
    except Exception as e:
        logger.exception("Failed to fetch Gmail message %s", messages[0]["id"])
        raise RuntimeError(f"Failed to fetch Gmail message: {e}") from e

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
