from __future__ import annotations

import logging
from datetime import datetime, timezone

from canvasapi import Canvas

from models import Assignment

logger = logging.getLogger(__name__)


def fetch_all_assignments(api_url: str, api_token: str) -> list[Assignment]:
    canvas = Canvas(api_url, api_token)
    assignments: list[Assignment] = []

    try:
        courses = canvas.get_courses(enrollment_state="active")
    except Exception:
        logger.exception("Failed to fetch courses from Canvas")
        return []

    for course in courses:
        try:
            course_name = getattr(course, "name", f"Course {course.id}")
            for a in course.get_assignments(bucket="future", order_by="due_at"):
                if not a.due_at:
                    continue
                due = datetime.fromisoformat(a.due_at.replace("Z", "+00:00"))
                assignments.append(
                    Assignment(
                        id=a.id,
                        name=a.name,
                        course_name=course_name,
                        course_id=course.id,
                        due_at=due,
                        points_possible=getattr(a, "points_possible", None),
                        html_url=getattr(a, "html_url", ""),
                        description=getattr(a, "description", "") or "",
                        submission_types=getattr(a, "submission_types", []),
                        locked=getattr(a, "locked_for_user", False),
                    )
                )
        except Exception:
            logger.exception("Failed to fetch assignments for course %s", course.id)

    assignments.sort(key=lambda a: a.due_at)
    return assignments
