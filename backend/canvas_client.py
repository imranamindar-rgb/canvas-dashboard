from __future__ import annotations

import logging
from datetime import datetime, timezone

from canvasapi import Canvas

from models import Assignment

logger = logging.getLogger(__name__)


def fetch_all_assignments(api_url: str, api_token: str) -> tuple[list[Assignment], list[str]]:
    canvas = Canvas(api_url, api_token)
    errors: list[str] = []
    assignments: list[Assignment] = []

    try:
        courses = canvas.get_courses(enrollment_state="active")
    except Exception:
        logger.exception("Failed to fetch courses from Canvas")
        return [], ["Failed to fetch course list from Canvas"]

    for course in courses:
        try:
            course_name = getattr(course, "name", f"Course {course.id}")
            course_assignments: list[Assignment] = []
            for a in course.get_assignments(bucket="future", order_by="due_at"):
                if not a.due_at:
                    continue
                due = datetime.fromisoformat(a.due_at.replace("Z", "+00:00"))
                course_assignments.append(
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
                        submitted=getattr(a, "has_submitted_submissions", False),
                    )
                )
            assignments.extend(course_assignments)
        except Exception as e:
            errors.append(f"{getattr(course, 'name', f'Course {course.id}')}: Failed to fetch assignments: {e}")
            logger.warning("Failed to fetch assignments for %s: %s", getattr(course, "name", course.id), e)
            continue

    return sorted(assignments, key=lambda a: a.due_at), errors
