"""Tests for authentication, CSRF protection, and rate limiting."""
import json
from unittest.mock import patch

import pytest


def _make_app():
    """Import and reload app with standard test patches; return (app_module, test_client)."""
    import importlib
    with patch("scheduler.AssignmentStore.start_background_sync"):
        with patch("scheduler.AssignmentStore.sync"):
            import app as app_module
            importlib.reload(app_module)
            app_module.app.config["TESTING"] = True
            return app_module, app_module.app.test_client()


# ---------------------------------------------------------------------------
# Login endpoint
# ---------------------------------------------------------------------------

class TestAuthLogin:
    """POST /api/auth — password validation and token issuance."""

    def test_correct_password_returns_token(self):
        with patch.dict("os.environ", {"DASHBOARD_PASSWORD": "s3cret",
                                        "CANVAS_API_TOKEN": "fake"}):
            _, client = _make_app()
            resp = client.post("/api/auth",
                               data=json.dumps({"password": "s3cret"}),
                               content_type="application/json")
            assert resp.status_code == 200
            data = resp.get_json()
            assert "token" in data
            assert "csrf_token" in data
            assert "expires_at" in data
            # Tokens should not be the dev stubs
            assert data["token"] != "dev"
            assert data["csrf_token"] != "dev"

    def test_wrong_password_returns_401(self):
        with patch.dict("os.environ", {"DASHBOARD_PASSWORD": "s3cret",
                                        "CANVAS_API_TOKEN": "fake"}):
            _, client = _make_app()
            resp = client.post("/api/auth",
                               data=json.dumps({"password": "wrong"}),
                               content_type="application/json")
            assert resp.status_code == 401
            data = resp.get_json()
            assert data["error"] == "invalid_password"

    def test_no_password_env_returns_dev_tokens(self):
        env = {"CANVAS_API_TOKEN": "fake"}
        # Ensure DASHBOARD_PASSWORD is NOT present
        with patch.dict("os.environ", env, clear=False):
            import os
            os.environ.pop("DASHBOARD_PASSWORD", None)
            _, client = _make_app()
            resp = client.post("/api/auth",
                               data=json.dumps({"password": "anything"}),
                               content_type="application/json")
            assert resp.status_code == 200
            data = resp.get_json()
            assert data["token"] == "dev"
            assert data["csrf_token"] == "dev"


# ---------------------------------------------------------------------------
# Protected routes
# ---------------------------------------------------------------------------

class TestRequireAuth:
    """@require_auth decorator — bearer token enforcement."""

    def _login(self, client):
        """Helper: log in and return (token, csrf_token)."""
        resp = client.post("/api/auth",
                           data=json.dumps({"password": "s3cret"}),
                           content_type="application/json")
        data = resp.get_json()
        return data["token"], data["csrf_token"]

    def test_protected_route_without_token_returns_401(self):
        with patch.dict("os.environ", {"DASHBOARD_PASSWORD": "s3cret",
                                        "CANVAS_API_TOKEN": "fake"}):
            _, client = _make_app()
            resp = client.get("/api/assignments")
            assert resp.status_code == 401
            data = resp.get_json()
            assert data["error"] == "unauthorized"

    def test_protected_route_with_valid_token_returns_200(self):
        with patch.dict("os.environ", {"DASHBOARD_PASSWORD": "s3cret",
                                        "CANVAS_API_TOKEN": "fake"}):
            _, client = _make_app()
            token, _ = self._login(client)
            resp = client.get("/api/assignments",
                              headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 200

    def test_protected_route_with_invalid_token_returns_401(self):
        with patch.dict("os.environ", {"DASHBOARD_PASSWORD": "s3cret",
                                        "CANVAS_API_TOKEN": "fake"}):
            _, client = _make_app()
            resp = client.get("/api/assignments",
                              headers={"Authorization": "Bearer bad-token"})
            assert resp.status_code == 401


# ---------------------------------------------------------------------------
# CSRF validation
# ---------------------------------------------------------------------------

class TestCSRF:
    """X-CSRF-Token header required on POST/PUT/DELETE when auth is enabled."""

    def _login(self, client):
        resp = client.post("/api/auth",
                           data=json.dumps({"password": "s3cret"}),
                           content_type="application/json")
        data = resp.get_json()
        return data["token"], data["csrf_token"]

    def test_post_without_csrf_token_returns_403(self):
        with patch.dict("os.environ", {"DASHBOARD_PASSWORD": "s3cret",
                                        "CANVAS_API_TOKEN": "fake"}):
            app_module, client = _make_app()
            token, _csrf = self._login(client)
            # POST /api/refresh without X-CSRF-Token header
            resp = client.post("/api/refresh",
                               headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 403
            data = resp.get_json()
            assert data["error"] == "csrf_invalid"

    def test_post_with_valid_csrf_token_succeeds(self):
        with patch.dict("os.environ", {"DASHBOARD_PASSWORD": "s3cret",
                                        "CANVAS_API_TOKEN": "fake"}):
            app_module, client = _make_app()
            token, csrf = self._login(client)
            # POST /api/refresh with correct CSRF token
            resp = client.post("/api/refresh",
                               headers={
                                   "Authorization": f"Bearer {token}",
                                   "X-CSRF-Token": csrf,
                               })
            # Should not be 403 (may be 200 or 500 depending on sync mock)
            assert resp.status_code != 403

    def test_put_without_csrf_token_returns_403(self):
        with patch.dict("os.environ", {"DASHBOARD_PASSWORD": "s3cret",
                                        "CANVAS_API_TOKEN": "fake"}):
            _, client = _make_app()
            token, _csrf = self._login(client)
            resp = client.put("/api/assignments/1/effort",
                              data=json.dumps({"effort": "S"}),
                              content_type="application/json",
                              headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------

class TestRateLimit:
    """Login endpoint rate-limits at 5 per minute."""

    def test_sixth_login_is_rate_limited(self):
        with patch.dict("os.environ", {"DASHBOARD_PASSWORD": "s3cret",
                                        "CANVAS_API_TOKEN": "fake"}):
            app_module, _ = _make_app()
            # Reset the limiter storage for a clean test
            app_module.limiter.reset()
            with app_module.app.test_client() as client:
                for i in range(5):
                    resp = client.post("/api/auth",
                                       data=json.dumps({"password": "wrong"}),
                                       content_type="application/json")
                    # First 5 should go through (401 = wrong password, not rate-limited)
                    assert resp.status_code == 401, f"Request {i+1} unexpected status {resp.status_code}"

                # 6th request should be rate-limited (429)
                resp = client.post("/api/auth",
                                   data=json.dumps({"password": "wrong"}),
                                   content_type="application/json")
                assert resp.status_code == 429
