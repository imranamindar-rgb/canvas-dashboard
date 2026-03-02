#!/usr/bin/env bash
set -euo pipefail

# Install Node.js dependencies and build frontend
cd frontend
npm ci
npm run build
cd ..

# Install Python dependencies
cd backend
pip install -r requirements.txt gunicorn
