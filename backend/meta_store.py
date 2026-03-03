"""CRUD for assignment_meta table."""
from __future__ import annotations

from datetime import datetime, timezone

from db import cursor


def get_meta(assignment_id: str) -> dict:
    """Return {next_action, effort, checked, checked_at, planned_day} or defaults."""
    with cursor() as c:
        c.execute(
            "SELECT next_action, effort, checked, checked_at, planned_day FROM assignment_meta WHERE assignment_id = ?",
            (assignment_id,),
        )
        row = c.fetchone()
    if row is None:
        return {
            "next_action": None,
            "effort": None,
            "checked": False,
            "checked_at": None,
            "planned_day": None,
        }
    return {
        "next_action": row["next_action"],
        "effort": row["effort"],
        "checked": bool(row["checked"]),
        "checked_at": row["checked_at"],
        "planned_day": row["planned_day"],
    }


def set_next_action(assignment_id: str, next_action: str) -> None:
    """Upsert next_action for the given assignment."""
    now = datetime.now(timezone.utc).isoformat()
    with cursor() as c:
        c.execute(
            """
            INSERT INTO assignment_meta (assignment_id, next_action, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(assignment_id) DO UPDATE SET
                next_action = excluded.next_action,
                updated_at  = excluded.updated_at
            """,
            (assignment_id, next_action, now),
        )


def set_effort(assignment_id: str, effort: str) -> None:
    """effort must be one of S, M, L, XL."""
    now = datetime.now(timezone.utc).isoformat()
    with cursor() as c:
        c.execute(
            """
            INSERT INTO assignment_meta (assignment_id, effort, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(assignment_id) DO UPDATE SET
                effort     = excluded.effort,
                updated_at = excluded.updated_at
            """,
            (assignment_id, effort, now),
        )


def set_checked(assignment_id: str, checked: bool) -> None:
    """Upsert checked state; sets checked_at to now when checked=True, None otherwise."""
    now = datetime.now(timezone.utc).isoformat()
    checked_at = now if checked else None
    checked_int = 1 if checked else 0
    with cursor() as c:
        c.execute(
            """
            INSERT INTO assignment_meta (assignment_id, checked, checked_at, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(assignment_id) DO UPDATE SET
                checked    = excluded.checked,
                checked_at = excluded.checked_at,
                updated_at = excluded.updated_at
            """,
            (assignment_id, checked_int, checked_at, now),
        )


def set_planned_day(assignment_id: str, planned_day: str | None) -> None:
    """planned_day is an ISO date string 'YYYY-MM-DD' or None to unplan."""
    with cursor() as c:
        c.execute("""INSERT INTO assignment_meta (assignment_id, planned_day, updated_at)
                     VALUES (?, ?, datetime('now'))
                     ON CONFLICT(assignment_id) DO UPDATE SET
                       planned_day = excluded.planned_day,
                       updated_at = excluded.updated_at""",
                  (assignment_id, planned_day))


def get_planned_days(assignment_ids: list[str]) -> dict[str, str | None]:
    """Return {assignment_id: planned_day} for all given ids."""
    if not assignment_ids:
        return {}
    placeholders = ",".join("?" * len(assignment_ids))
    with cursor() as c:
        c.execute(f"SELECT assignment_id, planned_day FROM assignment_meta WHERE assignment_id IN ({placeholders})",
                  assignment_ids)
        return {row["assignment_id"]: row["planned_day"] for row in c.fetchall()}


def bulk_get_meta(assignment_ids: list[str]) -> dict[str, dict]:
    """Return {assignment_id: meta_dict} for all given IDs."""
    if not assignment_ids:
        return {}
    placeholders = ",".join("?" for _ in assignment_ids)
    with cursor() as c:
        c.execute(
            f"SELECT assignment_id, next_action, effort, checked, checked_at, planned_day "
            f"FROM assignment_meta WHERE assignment_id IN ({placeholders})",
            assignment_ids,
        )
        rows = c.fetchall()
    result: dict[str, dict] = {}
    for row in rows:
        result[row["assignment_id"]] = {
            "next_action": row["next_action"],
            "effort": row["effort"],
            "checked": bool(row["checked"]),
            "checked_at": row["checked_at"],
            "planned_day": row["planned_day"],
        }
    return result
