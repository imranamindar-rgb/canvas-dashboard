"""In-memory store for email-extracted tasks."""

from __future__ import annotations

import threading
from datetime import datetime, timezone

from models import EmailTask


class EmailTaskStore:
    def __init__(self) -> None:
        self._tasks: list[EmailTask] = []
        self._last_sync: datetime | None = None
        self._last_message_id: str | None = None
        self._error: str | None = None
        self._lock = threading.Lock()

    def update(self, tasks: list[EmailTask], last_message_id: str | None = None) -> None:
        with self._lock:
            self._tasks = tasks
            self._last_sync = datetime.now(timezone.utc)
            self._last_message_id = last_message_id or self._last_message_id
            self._error = None

    def get_all(self) -> list[dict]:
        with self._lock:
            items = list(self._tasks)
        items.sort(key=lambda t: t.due_at)
        return [t.to_dict() for t in items]

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
