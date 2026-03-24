"""Persistent store for email-extracted tasks backed by SQLite."""

from __future__ import annotations

import logging
import re
import threading
from datetime import datetime, timezone

from db import cursor
from models import EmailTask

logger = logging.getLogger(__name__)


def _extract_source_message_id(task_id: str) -> str | None:
    """Extract Gmail message_id from task id like 'email-{message_id}-{index}'."""
    m = re.match(r"^email-(.+)-\d+$", task_id)
    return m.group(1) if m else None


class EmailTaskStore:
    def __init__(self) -> None:
        self._last_sync: datetime | None = None
        self._last_message_id: str | None = None
        self._error: str | None = None
        self._lock = threading.Lock()
        # Load last_message_id from DB on startup
        self._load_last_message_id()

    def _load_last_message_id(self) -> None:
        """Load last_message_id from existing tasks in DB."""
        try:
            with cursor() as cur:
                cur.execute(
                    "SELECT source_message_id FROM email_tasks ORDER BY created_at DESC LIMIT 1"
                )
                row = cur.fetchone()
                if row and row["source_message_id"]:
                    self._last_message_id = row["source_message_id"]
        except Exception:
            logger.debug("Could not load last_message_id from DB (table may not exist yet)")

    def update(self, tasks: list[EmailTask], last_message_id: str | None = None) -> None:
        with self._lock:
            now = datetime.now(timezone.utc).isoformat()
            with cursor() as cur:
                for task in tasks:
                    source_msg_id = _extract_source_message_id(task.id)
                    cur.execute(
                        """INSERT INTO email_tasks
                               (id, name, due_at, email_subject, email_date,
                                description, html_url, source_message_id, created_at, updated_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                           ON CONFLICT(id) DO UPDATE SET
                               name = excluded.name,
                               due_at = excluded.due_at,
                               email_subject = excluded.email_subject,
                               email_date = excluded.email_date,
                               description = excluded.description,
                               html_url = excluded.html_url,
                               source_message_id = excluded.source_message_id,
                               updated_at = excluded.updated_at
                        """,
                        (
                            task.id,
                            task.name,
                            task.due_at.isoformat(),
                            task.email_subject,
                            task.email_date.isoformat(),
                            task.description,
                            task.html_url,
                            source_msg_id,
                            now,
                            now,
                        ),
                    )
            self._last_sync = datetime.now(timezone.utc)
            self._last_message_id = last_message_id or self._last_message_id
            self._error = None

    def get_all(self) -> list[dict]:
        with self._lock:
            try:
                with cursor() as cur:
                    cur.execute("SELECT * FROM email_tasks ORDER BY due_at ASC")
                    rows = cur.fetchall()
            except Exception:
                logger.debug("Could not read email_tasks (table may not exist yet)")
                return []

        result = []
        for row in rows:
            try:
                due_at = datetime.fromisoformat(row["due_at"])
                if due_at.tzinfo is None:
                    due_at = due_at.replace(tzinfo=timezone.utc)
            except (ValueError, TypeError):
                due_at = datetime.now(timezone.utc)

            try:
                email_date = datetime.fromisoformat(row["email_date"]) if row["email_date"] else datetime.now(timezone.utc)
                if email_date.tzinfo is None:
                    email_date = email_date.replace(tzinfo=timezone.utc)
            except (ValueError, TypeError):
                email_date = datetime.now(timezone.utc)

            task = EmailTask(
                id=row["id"],
                name=row["name"],
                due_at=due_at,
                email_subject=row["email_subject"] or "",
                email_date=email_date,
                description=row["description"] or "",
                html_url=row["html_url"] or "",
            )
            result.append(task.to_dict())
        return result

    def should_process(self, message_id: str) -> bool:
        return self._last_message_id != message_id

    @property
    def last_message_id(self) -> str | None:
        return self._last_message_id

    @property
    def last_sync(self) -> datetime | None:
        return self._last_sync

    @property
    def error(self) -> str | None:
        return self._error

    @error.setter
    def error(self, value: str | None) -> None:
        self._error = value
