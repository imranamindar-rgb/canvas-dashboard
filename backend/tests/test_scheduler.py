import threading
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta
from scheduler import AssignmentStore


def _make_store():
    """Create an AssignmentStore without calling __init__ (avoids needing API creds)."""
    store = AssignmentStore.__new__(AssignmentStore)
    store._assignments = {}
    store._last_sync = None
    store._error = None
    store._lock = threading.Lock()
    return store


def _make_assignment(id, name):
    from models import Assignment
    return Assignment(
        id=id,
        name=name,
        course_name="Test",
        course_id=1,
        due_at=datetime.now(timezone.utc) + timedelta(days=3),
        points_possible=10,
        html_url=f"https://canvas.mit.edu/courses/1/assignments/{id}",
        description="",
        submission_types=[],
        locked=False,
    )


def test_store_starts_empty():
    store = _make_store()
    assert store.get_all() == []
    assert store.last_sync is None


def test_store_update_replaces_assignments():
    store = _make_store()

    a1 = _make_assignment(1, "PS1")
    a2 = _make_assignment(2, "PS2")
    store.update([a1, a2])

    assert len(store.get_all()) == 2
    assert store.last_sync is not None


def test_store_filter_by_urgency():
    store = _make_store()

    from models import Assignment
    critical = Assignment(
        id=1, name="Due Soon", course_name="Test", course_id=1,
        due_at=datetime.now(timezone.utc) + timedelta(hours=6),
        points_possible=10, html_url="", description="",
        submission_types=[], locked=False,
    )
    runway = Assignment(
        id=2, name="Due Later", course_name="Test", course_id=1,
        due_at=datetime.now(timezone.utc) + timedelta(days=14),
        points_possible=10, html_url="", description="",
        submission_types=[], locked=False,
    )
    store.update([critical, runway])

    results = store.get_all(urgency="critical")
    assert len(results) == 1
    assert results[0]["name"] == "Due Soon"


def test_store_filter_by_course():
    store = _make_store()

    from models import Assignment
    a1 = Assignment(
        id=1, name="PS1", course_name="6.042", course_id=1,
        due_at=datetime.now(timezone.utc) + timedelta(days=3),
        points_possible=10, html_url="", description="",
        submission_types=[], locked=False,
    )
    a2 = Assignment(
        id=2, name="HW1", course_name="18.06", course_id=2,
        due_at=datetime.now(timezone.utc) + timedelta(days=3),
        points_possible=10, html_url="", description="",
        submission_types=[], locked=False,
    )
    store.update([a1, a2])

    results = store.get_all(course="6.042")
    assert len(results) == 1
    assert results[0]["course_name"] == "6.042"
