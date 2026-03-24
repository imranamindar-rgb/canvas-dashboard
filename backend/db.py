"""SQLite database for persistent per-assignment metadata."""
import os
import sqlite3
import threading
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(__file__), "dashboard.db")

_local = threading.local()


def get_conn() -> sqlite3.Connection:
    """Return a thread-local SQLite connection."""
    if not hasattr(_local, "conn") or _local.conn is None:
        _local.conn = sqlite3.connect(
            DB_PATH,
            check_same_thread=False,
            isolation_level=None,  # autocommit mode; we manage transactions manually
        )
        _local.conn.row_factory = sqlite3.Row
    return _local.conn


@contextmanager
def cursor():
    """Context manager: yields cursor, commits on success, rollbacks on error."""
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("BEGIN")
        yield cur
        cur.execute("COMMIT")
    except Exception:
        cur.execute("ROLLBACK")
        raise
    finally:
        cur.close()


def init_db():
    """Create tables if they don't exist."""
    with cursor() as c:
        c.execute("""
            CREATE TABLE IF NOT EXISTS assignment_meta (
                assignment_id TEXT PRIMARY KEY,
                next_action   TEXT,
                effort        TEXT CHECK(effort IN ('S','M','L','XL')),
                checked       INTEGER NOT NULL DEFAULT 0,
                checked_at    TEXT,
                updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        try:
            c.execute("ALTER TABLE assignment_meta ADD COLUMN planned_day TEXT")
        except Exception:
            pass  # Column already exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS auth_sessions (
                token TEXT PRIMARY KEY,
                csrf_token TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                expires_at TEXT NOT NULL
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS email_tasks (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                due_at TEXT NOT NULL,
                email_subject TEXT,
                email_date TEXT,
                description TEXT,
                html_url TEXT,
                source_message_id TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
