from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta


def classify_urgency(due_at: datetime) -> str:
    now = datetime.now(timezone.utc)
    delta = due_at - now
    if delta <= timedelta(hours=24):
        return "critical"
    elif delta <= timedelta(days=3):
        return "high"
    elif delta <= timedelta(days=7):
        return "medium"
    else:
        return "runway"


@dataclass
class Assignment:
    id: int
    name: str
    course_name: str
    course_id: int
    due_at: datetime
    points_possible: float | None
    html_url: str
    description: str
    submission_types: list[str] = field(default_factory=list)
    locked: bool = False
    submitted: bool = False

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "course_name": self.course_name,
            "course_id": self.course_id,
            "due_at": self.due_at.isoformat(),
            "points_possible": self.points_possible,
            "urgency": classify_urgency(self.due_at),
            "html_url": self.html_url,
            "description": self.description,
            "submission_types": self.submission_types,
            "locked": self.locked,
            "submitted": self.submitted,
            "source": "canvas",
        }


@dataclass
class EmailTask:
    id: str
    name: str
    due_at: datetime
    email_subject: str
    email_date: datetime
    description: str
    html_url: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "course_name": "EMBA Announcements",
            "course_id": 0,
            "due_at": self.due_at.isoformat(),
            "points_possible": None,
            "urgency": classify_urgency(self.due_at),
            "html_url": self.html_url,
            "description": self.description,
            "submission_types": [],
            "locked": False,
            "submitted": False,
            "source": "email",
            "email_subject": self.email_subject,
            "email_date": self.email_date.isoformat(),
        }
