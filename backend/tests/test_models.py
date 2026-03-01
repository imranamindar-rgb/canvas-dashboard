from datetime import datetime, timezone, timedelta
from models import Assignment, classify_urgency


def test_classify_urgency_critical():
    due = datetime.now(timezone.utc) + timedelta(hours=12)
    assert classify_urgency(due) == "critical"


def test_classify_urgency_high():
    due = datetime.now(timezone.utc) + timedelta(days=2)
    assert classify_urgency(due) == "high"


def test_classify_urgency_medium():
    due = datetime.now(timezone.utc) + timedelta(days=5)
    assert classify_urgency(due) == "medium"


def test_classify_urgency_runway():
    due = datetime.now(timezone.utc) + timedelta(days=10)
    assert classify_urgency(due) == "runway"


def test_assignment_to_dict():
    due = datetime.now(timezone.utc) + timedelta(hours=6)
    a = Assignment(
        id=1,
        name="Problem Set 1",
        course_name="6.042",
        course_id=100,
        due_at=due,
        points_possible=10.0,
        html_url="https://canvas.mit.edu/courses/100/assignments/1",
        description="<p>Do the problems</p>",
        submission_types=["online_upload"],
        locked=False,
    )
    d = a.to_dict()
    assert d["id"] == 1
    assert d["urgency"] == "critical"
    assert d["course_name"] == "6.042"
    assert isinstance(d["due_at"], str)
