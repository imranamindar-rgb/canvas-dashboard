from datetime import datetime, timezone, timedelta
from models import Assignment, EmailTask, classify_urgency


def test_classify_urgency_overdue():
    due = datetime.now(timezone.utc) - timedelta(hours=2)
    assert classify_urgency(due) == "overdue"


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


def test_assignment_submitted_default_false():
    due = datetime.now(timezone.utc) + timedelta(hours=6)
    a = Assignment(
        id=1, name="PS1", course_name="6.042", course_id=100,
        due_at=due, points_possible=10.0,
        html_url="https://canvas.mit.edu/courses/100/assignments/1",
        description="", submission_types=["online_upload"], locked=False,
    )
    assert a.submitted is False
    assert a.to_dict()["submitted"] is False


def test_assignment_submitted_true():
    due = datetime.now(timezone.utc) + timedelta(hours=6)
    a = Assignment(
        id=1, name="PS1", course_name="6.042", course_id=100,
        due_at=due, points_possible=10.0,
        html_url="https://canvas.mit.edu/courses/100/assignments/1",
        description="", submission_types=["online_upload"], locked=False,
        submitted=True,
    )
    assert a.submitted is True
    assert a.to_dict()["submitted"] is True


def test_email_task_to_dict():
    task = EmailTask(
        id="email-abc123-0",
        name="Complete weekend survey",
        due_at=datetime(2026, 2, 25, 17, 0, tzinfo=timezone.utc),
        email_subject="EMBA '27 | ANNOUNCEMENTS | February 24, 2026",
        email_date=datetime(2026, 2, 24, 22, 0, tzinfo=timezone.utc),
        description="Please take a few minutes to complete the weekend survey",
        html_url="https://mail.google.com/mail/u/0/#inbox/abc123",
    )
    d = task.to_dict()
    assert d["id"] == "email-abc123-0"
    assert d["source"] == "email"
    assert d["course_name"] == "EMBA Announcements"
    assert d["submitted"] is False

def test_assignment_has_source_canvas():
    due = datetime.now(timezone.utc) + timedelta(hours=6)
    a = Assignment(
        id=1, name="PS1", course_name="6.042", course_id=100,
        due_at=due, points_possible=10.0,
        html_url="https://canvas.mit.edu/courses/100/assignments/1",
        description="", submission_types=["online_upload"], locked=False,
    )
    assert a.to_dict()["source"] == "canvas"


def test_classify_urgency_exactly_zero_delta():
    """Assignment due right now should be critical, not overdue."""
    due = datetime.now(timezone.utc)
    # delta is 0 or very slightly negative due to execution time
    result = classify_urgency(due)
    # Could be either overdue (tiny negative) or critical (exactly 0)
    assert result in ("overdue", "critical")


def test_classify_urgency_one_second_overdue():
    """Assignment 1 second past due should be overdue."""
    due = datetime.now(timezone.utc) - timedelta(seconds=1)
    assert classify_urgency(due) == "overdue"
