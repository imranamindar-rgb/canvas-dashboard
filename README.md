# Canvas Executive Dashboard

A personal dashboard for MIT EMBA students to track Canvas assignments, sync to Google Calendar, and extract tasks from email announcements.

## Quick Start (Docker)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Python 3 (for one-time Google OAuth setup only)
- A Canvas API token (generate at canvas.mit.edu → Account → Settings → New Access Token)
- Google OAuth credentials (`google_credentials.json` — ask your cohort admin)
- An Anthropic API key (for email task extraction — get from console.anthropic.com)

### Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd canvas-dashboard

# 2. Run setup (first run creates .env template)
./setup.sh

# 3. Edit backend/.env with your real tokens
#    CANVAS_API_TOKEN=<your Canvas token>
#    ANTHROPIC_API_KEY=<your Anthropic key>

# 4. Run setup again (authorizes Google, builds containers, starts app)
./setup.sh

# 5. Open http://localhost
```

### Everyday Use

```bash
docker compose up -d          # Start
docker compose down            # Stop
docker compose logs -f         # View logs
docker compose up --build -d   # Rebuild after code changes
```

### Troubleshooting

- **502 Bad Gateway** — The backend is still starting. Wait 15 seconds and refresh.
- **Google Calendar not authorized** — Delete `backend/token.json` and re-run `./setup.sh`.
- **Port 80 in use** — Edit `docker-compose.yml`, change `"80:80"` to `"8080:80"`, then update `CORS_ORIGIN=http://localhost:8080` in `backend/.env`.

## Local Development (without Docker)

```bash
# Backend
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your tokens
python app.py

# Frontend (separate terminal)
cd frontend && npm install && npm run dev

# Open http://localhost:5173
```
