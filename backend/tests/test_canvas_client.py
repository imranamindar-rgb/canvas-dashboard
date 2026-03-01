from unittest.mock import MagicMock, patch
from datetime import datetime, timezone, timedelta
from canvas_client import fetch_all_assignments


def _make_mock_assignment(id, name, due_at, course_name="Test Course", course_id=1):
    a = MagicMock()
    a.id = id
    a.name = name
    a.due_at = due_at.strftime("%Y-%m-%dT%H:%M:%SZ") if due_at else None
    a.points_possible = 10
    a.html_url = f"https://canvas.mit.edu/courses/{course_id}/assignments/{id}"
    a.description = "<p>Description</p>"
    a.submission_types = ["online_upload"]
    a.locked_for_user = False
    return a


def _make_mock_course(course_id, name, assignments):
    course = MagicMock()
    course.id = course_id
    course.name = name
    course.get_assignments.return_value = assignments
    return course


@patch("canvas_client.Canvas")
def test_fetch_excludes_undated_assignments(mock_canvas_cls):
    future = datetime.now(timezone.utc) + timedelta(days=3)
    mock_canvas = MagicMock()
    mock_canvas_cls.return_value = mock_canvas

    assignments = [
        _make_mock_assignment(1, "Dated", future),
        _make_mock_assignment(2, "Undated", None),
    ]
    course = _make_mock_course(1, "Test Course", assignments)
    mock_canvas.get_courses.return_value = [course]

    result = fetch_all_assignments("https://canvas.mit.edu", "fake_token")
    assert len(result) == 1
    assert result[0].name == "Dated"


@patch("canvas_client.Canvas")
def test_fetch_multiple_courses(mock_canvas_cls):
    future = datetime.now(timezone.utc) + timedelta(days=3)
    mock_canvas = MagicMock()
    mock_canvas_cls.return_value = mock_canvas

    c1 = _make_mock_course(1, "6.042", [_make_mock_assignment(1, "PS1", future, "6.042", 1)])
    c2 = _make_mock_course(2, "18.06", [_make_mock_assignment(2, "HW1", future, "18.06", 2)])
    mock_canvas.get_courses.return_value = [c1, c2]

    result = fetch_all_assignments("https://canvas.mit.edu", "fake_token")
    assert len(result) == 2
    course_names = {a.course_name for a in result}
    assert course_names == {"6.042", "18.06"}
