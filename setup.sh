#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

echo "=== Canvas Executive Dashboard Setup ==="
echo

# Check prerequisites
if ! command -v docker &>/dev/null; then
    echo "Error: Docker is not installed. Please install Docker Desktop."
    echo "  https://www.docker.com/products/docker-desktop/"
    exit 1
fi

if ! docker compose version &>/dev/null; then
    echo "Error: 'docker compose' not available. Please install Docker Compose V2."
    exit 1
fi

# Step 1: Environment file
if [ ! -f "$BACKEND_DIR/.env" ]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    echo "Created backend/.env from template."
    echo
    echo ">>> Please edit backend/.env and fill in your API tokens, then re-run this script."
    echo "    You need:"
    echo "    - CANVAS_API_TOKEN  (from canvas.mit.edu → Account → Settings → New Access Token)"
    echo "    - ANTHROPIC_API_KEY (from console.anthropic.com)"
    exit 0
fi

# Verify tokens are not placeholders
if grep -q "your_canvas_api_token_here\|your_anthropic_api_key_here" "$BACKEND_DIR/.env"; then
    echo ">>> backend/.env still has placeholder values. Please fill in your real API tokens."
    exit 1
fi

# Ensure Docker-specific env vars are present
if ! grep -q "CORS_ORIGIN" "$BACKEND_DIR/.env"; then
    echo "CORS_ORIGIN=http://localhost" >> "$BACKEND_DIR/.env"
fi
if ! grep -q "GUNICORN_RUNNING" "$BACKEND_DIR/.env"; then
    echo "GUNICORN_RUNNING=1" >> "$BACKEND_DIR/.env"
fi

# Step 2: Google credentials check
if [ ! -f "$BACKEND_DIR/google_credentials.json" ]; then
    echo "Error: backend/google_credentials.json not found."
    echo
    echo "To get this file:"
    echo "  1. Go to https://console.cloud.google.com/apis/credentials"
    echo "  2. Create OAuth 2.0 Client ID (Desktop App)"
    echo "  3. Download the JSON and save as backend/google_credentials.json"
    exit 1
fi

# Step 3: Google OAuth authorization (runs locally, needs browser)
if [ ! -f "$BACKEND_DIR/token.json" ]; then
    echo
    echo "=== Google OAuth Authorization ==="
    echo "This will open your browser for Google sign-in."
    echo

    # Create temporary venv for auth
    TMPVENV=$(mktemp -d)
    python3 -m venv "$TMPVENV"
    # shellcheck disable=SC1091
    source "$TMPVENV/bin/activate"
    pip install -q google-auth-oauthlib google-api-python-client

    python3 -c "
from google_auth_oauthlib.flow import InstalledAppFlow
SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/gmail.readonly',
]
flow = InstalledAppFlow.from_client_secrets_file('$BACKEND_DIR/google_credentials.json', SCOPES)
creds = flow.run_local_server(port=8090, prompt='consent')
with open('$BACKEND_DIR/token.json', 'w') as f:
    f.write(creds.to_json())
print('Google OAuth authorization successful!')
"

    deactivate
    rm -rf "$TMPVENV"
else
    echo "Google OAuth token already exists (backend/token.json)."
fi

# Step 4: Build and start
echo
echo "=== Building and starting Docker containers ==="
cd "$SCRIPT_DIR"
docker compose up --build -d

echo
echo "=== Setup complete ==="
echo "Dashboard is running at: http://localhost"
echo
echo "Useful commands:"
echo "  docker compose logs -f         # View logs"
echo "  docker compose down            # Stop containers"
echo "  docker compose up --build -d   # Rebuild after code changes"
