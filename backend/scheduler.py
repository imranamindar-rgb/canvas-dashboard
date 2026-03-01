from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timezone

from canvas_client import fetch_all_assignments
from models import Assignment, classify_urgency

logger = logging.getLogger(__name__)


class AssignmentStore:
    def __init__(self, api_url: str, api_token: str, ttl: int = 300):
        self._api_url = api_url
        self._api_token = api_token
        self._ttl = ttl
        self._assignments: dict[int, Assignment] = {}
        self._last_sync: datetime | None = None
        self._error: str | None = None
        self._lock = threading.Lock()

    def sync(self) -> None:
        try:
            assignments = fetch_all_assignments(self._api_url, self._api_token)
            with self._lock:
                self._assignments = {a.id: a for a in assignments}
                self._last_sync = datetime.now(timezone.utc)
                self._error = None
            logger.info("Synced %d assignments from Canvas", len(assignments))
        except Exception as e:
            logger.exception("Canvas sync failed")
            with self._lock:
                self._error = str(e)

    def update(self, assignments: list[Assignment]) -> None:
        with self._lock:
            self._assignments = {a.id: a for a in assignments}
            self._last_sync = datetime.now(timezone.utc)
            self._error = None

    def get_all(
        self, urgency: str | None = None, course: str | None = None
    ) -> list[dict]:
        with self._lock:
            items = list(self._assignments.values())
        items.sort(key=lambda a: a.due_at)
        results = [a.to_dict() for a in items]
        if urgency:
            results = [r for r in results if r["urgency"] == urgency]
        if course:
            results = [r for r in results if r["course_name"] == course]
        return results

    def get_stats(self) -> dict:
        all_items = self.get_all()
        urgency_counts = {"critical": 0, "high": 0, "medium": 0, "runway": 0}
        course_counts: dict[str, int] = {}
        for item in all_items:
            urgency_counts[item["urgency"]] += 1
            course_counts[item["course_name"]] = course_counts.get(item["course_name"], 0) + 1
        return {
            "total": len(all_items),
            "by_urgency": urgency_counts,
            "by_course": course_counts,
        }

    @property
    def last_sync(self) -> datetime | None:
        return self._last_sync

    @property
    def error(self) -> str | None:
        return self._error

    def start_background_sync(self) -> None:
        def _loop():
            while True:
                self.sync()
                time.sleep(self._ttl)

        t = threading.Thread(target=_loop, daemon=True)
        t.start()
        logger.info("Background sync started (interval=%ds)", self._ttl)
