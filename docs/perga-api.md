---
sidebar_position: 2
---

# Perga API

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.10-blue.svg)
![Build](https://github.com/dbtiunov/perga-api/actions/workflows/ci.yml/badge.svg)

Personal organizer backend that provides the core functionality for the Perga system.

## Overview

Perga API is a FastAPI-based backend that powers the Perga personal organizer. It exposes REST API consumed by the standalone web client [Perga Web](./perga-web).

## Features

- Daily planner
- Monthly and custom agendas
- Notes
- RESTful API with FastAPI
- User authentication with JWT tokens
- API Documentation with Swagger UI

## Demo and Documentation

- Demo: https://demo.getperga.me/
- Repo: https://github.com/dbtiunov/perga-api

## Tech Stack

- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) 0.135
- **Database:** [PostgreSQL](https://www.postgresql.org/) 15 with [SQLAlchemy](https://www.sqlalchemy.org/) 2.0
- **Migrations:** [Alembic](https://alembic.sqlalchemy.org/) 1.18
- **Validation:** [Pydantic](https://docs.pydantic.dev/) 2.12
- **Authentication:** JWT (JSON Web Tokens)
- **Containerization:** [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

## Requirements

- Python 3.10+
- PostgreSQL
- Docker (optional)

## Installation (local)

1) Clone and enter the repo
```bash
git clone https://github.com/dbtiunov/perga-api.git
cd perga-api
```

2) Create and activate a virtual environment
```bash
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
```

3) Install dependencies
```bash
pip install -r requirements.txt -r requirements-dev.txt
```

4) Configure environment
```bash
cp .env.example .env
# then edit .env
```
Important variables (from `.env.example`):
- `SECRET_KEY` — any secure random string
- `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `CORS_ORIGINS` — JSON array of allowed origins (e.g. ["http://localhost:5173"]) 
- `ROOT_URL_REDIRECT` — optional URL to redirect `/` to (used by nginx demo)

5) Run migrations
```bash
alembic upgrade head
```

6) Start the app
```bash
uvicorn app.main:app --reload
```
- Base URL: http://localhost:8000
- Swagger UI: http://localhost:8000/docs

## Docker

A Docker Compose setup is included. It runs:
- `db`: PostgreSQL 15
- `app`: the FastAPI app (exposed on host port 8000)
- `nginx`: reverse proxy that serves the app on host port 8080

Start/stop:
```bash
docker-compose up -d
# ...
docker-compose down
```

Default ports and health:
- App direct: http://localhost:8000 (health: `GET /health/`)
- Via nginx: http://localhost:8080 (health inside nginx: `GET /health/`)

## API Documentation

- Swagger UI: http://localhost:8080/docs (via nginx) or http://localhost:8000/docs (direct)

## API Endpoints (v1)

### Authentication
- `POST /api/v1/auth/signup/` — Register a new user
- `POST /api/v1/auth/access_token/` — Get access token (form data)
- `POST /api/v1/auth/access_token_json/` — Get access token (JSON)
- `POST /api/v1/auth/refresh_token/` — Refresh access token
- `GET /api/v1/auth/user/` — Get current user
- `PUT /api/v1/auth/user/` — Update current user
- `PUT /api/v1/auth/user/password/` — Change password

### Planner Days
- `GET /api/v1/planner/days/items/?days=YYYY-MM-DD&days=YYYY-MM-DD` — Get items for multiple days; returns a dictionary keyed by date string
- `POST /api/v1/planner/days/items/` — Create a new day item
- `PUT /api/v1/planner/days/items/{item_id}/` — Update a day item
- `DELETE /api/v1/planner/days/items/{item_id}/` — Delete a day item
- `POST /api/v1/planner/days/items/reorder/` — Reorder items for a day
- `POST /api/v1/planner/days/items/{item_id}/copy/` — Copy a day item to another day
- `POST /api/v1/planner/days/items/{item_id}/snooze/` — Snooze a day item to another day

### Agendas (monthly, custom, archived)
- `GET /api/v1/planner/agendas/?agenda_types=monthly&selected_day=YYYY-MM-DD&with_counts=false` — List agendas (filters optional)
- `POST /api/v1/planner/agendas/` — Create an agenda
- `PUT /api/v1/planner/agendas/{agenda_id}/` — Update an agenda (including archive/unarchive)
- `DELETE /api/v1/planner/agendas/{agenda_id}/` — Delete an agenda
- `POST /api/v1/planner/agendas/reorder/` — Reorder agendas
- `POST /api/v1/planner/agendas/{agenda_id}/action/` — Perform an action on agenda (e.g., resolve monthly)

Agenda items:
- `GET /api/v1/planner/agendas/items/?agenda_ids=1&agenda_ids=2` — Get items for multiple agendas; returns a dictionary keyed by agenda id
- `POST /api/v1/planner/agendas/items/` — Create an agenda item
- `PUT /api/v1/planner/agendas/items/{item_id}/` — Update an agenda item
- `DELETE /api/v1/planner/agendas/items/{item_id}/` — Delete an agenda item
- `POST /api/v1/planner/agendas/items/reorder/` — Reorder items within an agenda
- `POST /api/v1/planner/agendas/items/{item_id}/copy/` — Copy an item (optionally to another agenda)
- `POST /api/v1/planner/agendas/items/{item_id}/move/` — Move an item to another agenda

### Notes
- `POST /api/v1/notes/` — Create a new note
- `GET /api/v1/notes/{note_id}/` — Get a note by ID
- `PATCH /api/v1/notes/{note_id}/` — Update a note (partial)

#### Notes Folders
- `GET /api/v1/notes/folders/` — Get all folders for the current user
- `POST /api/v1/notes/folders/` — Create a new folder
- `PATCH /api/v1/notes/folders/{folder_id}/` — Update a folder
- `POST /api/v1/notes/folders/empty-trash/` — Permanently delete all notes and folders in the trash

#### Notes Import & Export
- `GET /api/v1/notes/export/` — Export notes (HTML, Markdown, or PDF)
- `POST /api/v1/notes/import/` — Import notes from files (ZIP, HTML, or Markdown)

## Development

### Project Structure
- `app/`
  - `api/` — API endpoints and routers
  - `core/` — config, DB
  - `models/` — SQLAlchemy models
  - `schemas/` — Pydantic models
  - `services/` — business logic
  - `tests/` — test suite

### Testing
```bash
python -m pytest
# or
python -m pytest app/tests/test_services/test_user_service.py
```

### Database Migrations
```bash
./scripts/create_migration.sh <migration_name>
# then
alembic upgrade head
```

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/dbtiunov/perga-api/blob/main/LICENSE) file for details.
