from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timezone, timedelta

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
        self, urgency: str | None = None, course: str | None = None, view: str | None = None
    ) -> list[dict]:
        with self._lock:
            items = list(self._assignments.values())
        items.sort(key=lambda a: a.due_at)
        results = [a.to_dict() for a in items]
        if urgency:
            results = [r for r in results if r["urgency"] == urgency]
        if course:
            results = [r for r in results if r["course_name"] == course]
        if view == "today":
            end_of_today = datetime.now(timezone.utc).replace(
                hour=23, minute=59, second=59, microsecond=999999
            )
            results = [r for r in results if datetime.fromisoformat(r["due_at"]) <= end_of_today]
        elif view == "week":
            end_of_week = datetime.now(timezone.utc) + timedelta(days=7)
            results = [r for r in results if datetime.fromisoformat(r["due_at"]) <= end_of_week]
        return results

    def get_stats(self) -> dict:
        all_items = self.get_all()
        active_items = [i for i in all_items if not i.get("submitted", False)]
        urgency_counts = {"overdue": 0, "critical": 0, "high": 0, "medium": 0, "runway": 0}
        course_counts: dict[str, int] = {}
        now = datetime.now(timezone.utc)
        end_of_today = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        end_of_week = now + timedelta(days=7)
        due_today = 0
        due_this_week = 0
        for item in active_items:
            urgency_counts[item["urgency"]] += 1
            course_counts[item["course_name"]] = course_counts.get(item["course_name"], 0) + 1
            item_due = datetime.fromisoformat(item["due_at"])
            if item_due <= end_of_today:
                due_today += 1
            if item_due <= end_of_week:
                due_this_week += 1
        return {
            "total": len(active_items),
            "by_urgency": urgency_counts,
            "by_course": course_counts,
            "due_today": due_today,
            "due_this_week": due_this_week,
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
