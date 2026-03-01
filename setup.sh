#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Canvas Executive Dashboard Setup ==="
echo

# Backend
echo "Setting up backend..."
cd "$SCRIPT_DIR/backend"
python3 -m venv .venv
source .venv/bin/activate
pip install -q -r requirements.txt
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created backend/.env from template"
fi
deactivate

# Frontend
echo "Setting up frontend..."
cd "$SCRIPT_DIR/frontend"
npm install --silent

echo
echo "=== Setup complete ==="
echo
echo "Next steps:"
echo "  1. Edit backend/.env and set CANVAS_API_TOKEN"
echo "  2. Start backend:  cd backend && source .venv/bin/activate && python app.py"
echo "  3. Start frontend: cd frontend && npm run dev"
echo "  4. Open http://localhost:5173"
