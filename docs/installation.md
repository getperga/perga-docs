---
sidebar_position: 2
title: Installation Guide
---

Run Perga locally with Docker in two ways:

- Quick install with `install.sh`
- Manual install with `docker compose`

## Quick install

1) Download install script
```bash
mkdir -p perga-install && cd perga-install && \
  curl -fsSL -o install.sh https://docs.getperga.me/installation/install.sh && \
  chmod +x install.sh
```

2) Run install script
```bash
./install.sh
```

Notes:
- You can customize .env and nginx.conf files, and then run install script again.

3) Verify and access
- Web UI: http://localhost:3000
- API docs: http://localhost:8000/docs

## Manual install

1) Download installation files
```bash
mkdir -p perga-install && cd perga-install && \
  mkdir -p nginx && \
  curl -fsSL \
    -o docker-compose.yml https://docs.getperga.me/installation/docker-compose.yml \
    -o .env.example https://docs.getperga.me/installation/.env.example \
    -o nginx/nginx.conf https://docs.getperga.me/installation/nginx/nginx.conf
```

2) Create and edit your env
```bash
cp .env.example .env
# open .env and set strong SECRET_KEY and DB creds
```
Env vars:
- `POSTGRES_*` — Postgres DB host, name and credentials
- `API_BASE_URL` — Web → API URL (default `http://127.0.0.1:8000/api/v1`)
- `CORS_ORIGINS`, `SECRET_KEY` — API security (use a strong random secret)
- `IS_SIGNUP_DISABLED` — set `true` to disable self‑signup
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth 2.0 credentials used by the API to verify "Sign in with Google" tokens. Leave empty to disable Google sign‑in.
- `GOOGLE_CLIENT_ID` (Web) — same Client ID exposed to the web client to render the "Sign in with Google" button.

3) Start services
```bash
docker compose pull
docker compose up -d

# check status
docker compose ps

# stop perga
docker-compose down

# view logs
docker-compose logs -f
```

4) Verify and access
- Web UI: http://localhost:3000
- API docs: http://localhost:8000/docs
