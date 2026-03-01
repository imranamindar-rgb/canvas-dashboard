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


def _make_assignment(id, name, course_name="Test", course_id=1, hours=72):
    from models import Assignment
    return Assignment(
        id=id,
        name=name,
        course_name=course_name,
        course_id=course_id,
        due_at=datetime.now(timezone.utc) + timedelta(hours=hours),
        points_possible=10,
        html_url=f"https://canvas.mit.edu/courses/{course_id}/assignments/{id}",
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


def test_stats_include_due_today_and_due_this_week():
    store = _make_store()
    today = _make_assignment(1, "Today", "Test", 1, hours=6)
    this_week = _make_assignment(2, "This Week", "Test", 1, hours=96)
    far_out = _make_assignment(3, "Far Out", "Test", 1, hours=336)
    store.update([today, this_week, far_out])
    stats = store.get_stats()
    assert stats["due_today"] == 1
    assert stats["due_this_week"] == 2
    assert "due_today" in stats
    assert "due_this_week" in stats


def test_stats_exclude_submitted():
    store = _make_store()
    from models import Assignment
    pending = Assignment(
        id=1, name="Pending", course_name="Test", course_id=1,
        due_at=datetime.now(timezone.utc) + timedelta(days=3),
        points_possible=10, html_url="", description="",
        submission_types=[], locked=False, submitted=False,
    )
    done = Assignment(
        id=2, name="Done", course_name="Test", course_id=1,
        due_at=datetime.now(timezone.utc) + timedelta(days=3),
        points_possible=10, html_url="", description="",
        submission_types=[], locked=False, submitted=True,
    )
    store.update([pending, done])
    stats = store.get_stats()
    assert stats["total"] == 1


def test_store_filter_by_view_today():
    store = _make_store()
    from models import Assignment
    today = Assignment(
        id=1, name="Today", course_name="Test", course_id=1,
        due_at=datetime.now(timezone.utc) + timedelta(hours=6),
        points_possible=10, html_url="", description="",
        submission_types=[], locked=False,
    )
    far = Assignment(
        id=2, name="Far", course_name="Test", course_id=1,
        due_at=datetime.now(timezone.utc) + timedelta(days=10),
        points_possible=10, html_url="", description="",
        submission_types=[], locked=False,
    )
    store.update([today, far])
    results = store.get_all(view="today")
    assert len(results) == 1
    assert results[0]["name"] == "Today"


def test_store_filter_by_view_week():
    store = _make_store()
    from models import Assignment
    today = Assignment(
        id=1, name="Today", course_name="Test", course_id=1,
        due_at=datetime.now(timezone.utc) + timedelta(hours=6),
        points_possible=10, html_url="", description="",
        submission_types=[], locked=False,
    )
    this_week = Assignment(
        id=2, name="This Week", course_name="Test", course_id=1,
        due_at=datetime.now(timezone.utc) + timedelta(days=4),
        points_possible=10, html_url="", description="",
        submission_types=[], locked=False,
    )
    far = Assignment(
        id=3, name="Far", course_name="Test", course_id=1,
        due_at=datetime.now(timezone.utc) + timedelta(days=14),
        points_possible=10, html_url="", description="",
        submission_types=[], locked=False,
    )
    store.update([today, this_week, far])
    results = store.get_all(view="week")
    assert len(results) == 2
