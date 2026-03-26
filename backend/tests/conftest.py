"""Test fixtures: use an isolated in-memory database for every test session."""
import db as db_module


def pytest_configure(config):
    """Point the DB at an in-memory SQLite database before any imports touch it."""
    # Reset any existing connection so a fresh one is created with the new path
    if hasattr(db_module._local, "conn") and db_module._local.conn is not None:
        try:
            db_module._local.conn.close()
        except Exception:
            pass
        db_module._local.conn = None
    db_module.DB_PATH = ":memory:"
    db_module.init_db()


def pytest_runtest_setup(item):
    """Clean email_tasks table before each test to ensure isolation."""
    try:
        with db_module.cursor() as cur:
            cur.execute("DELETE FROM email_tasks")
    except Exception:
        pass
