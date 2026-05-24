---
sidebar_position: 3
---

# Perga Web

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Build](https://github.com/dbtiunov/perga-web/actions/workflows/ci.yml/badge.svg)

The web client for the Perga personal organizer system. It connects to the [Perga API](./perga-api) and provides a responsive, accessible interface for daily planning and monthly agendas.

## Overview

Perga Web is a standalone SPA built with React and Vite. It communicates with Perga API using a configurable base URL and implements authentication, planner views, and user settings fully in the browser.

## Screenshots

<p>
  <img src="/img/planner_screenshot.png" alt="Planner" width="300" />
  <span>&nbsp;&nbsp;&nbsp;</span>
  <img src="/img/planner_weekly_screenshot.png" alt="Planner Weekly" width="300" />
  <span>&nbsp;&nbsp;&nbsp;</span>
  <img src="/img/notes_screenshot.png" alt="Notes" width="300" />
</p>

## Demo

You can try out Perga without installation by visiting demo version at [https://demo.getperga.me/](https://demo.getperga.me/).

## Features

- Daily planner + weekly view
- Monthly and custom agendas
- Projects (organize agendas and notes)
- Notes (folders, import/export, and @notes references)
- User authentication and settings
- Responsive design with mobile support
- PWA support
- Dark theme

## Tech Stack

- React 19.0
- TypeScript (~5.7.2)
- Vite 6.3
- Tailwind CSS 4.1
- React Router 7.4
- Axios 1.8
- Prettier 3.3
- ESLint 9.21

## Requirements

- Node.js 18+ (Docker uses `node:20-alpine`)
- npm 8+ (project uses npm; a `package-lock.json` is included)

## Environment variables

Create a `.env` file from the example and adjust values as needed:
```bash
cp .env.example .env
```
Available variables:
- `API_BASE_URL` — Base URL of Perga API (example: `http://127.0.0.1:8000/api/v1`)
- `IS_SIGNUP_DISABLED` — When `true`, hides/disables the Signup option in the UI
- `GOOGLE_CLIENT_ID` — Google OAuth 2.0 Client ID; enables the "Sign in with Google" button when set. Must match the `GOOGLE_CLIENT_ID` configured in Perga API.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/dbtiunov/perga-web.git
   cd perga-web
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment:
   ```bash
   cp .env.example .env
   # then edit .env
   ```

## Development

Start the Vite development server (defaults to http://localhost:5173):
```bash
npm run dev
```

Code quality and formatting (ESLint & Prettier):
```bash
npm run lint         # check linting
npm run format       # write formatting
npm run format:check # check formatting only
```

## Build & Preview

Build production assets (TypeScript build + Vite build):
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

The build output is written to the `dist/` directory.

## Docker

The app can be built and served by nginx using Docker Compose.

```bash
# Build and start
docker-compose up -d

# Stop
docker-compose down
```

Defaults:
- Container serves on port 80 via nginx
- Host is mapped to http://localhost:3000 (compose maps `3000:80`)
- `API_BASE_URL` is passed as a build ARG and from `.env` (compose uses `env_file: .env`)

Health endpoint (inside container): `GET /health/` → `200 ok`

## Project Structure

```
perga-web/
├── src/                  # Source code
│   ├── api/              # API clients & types
│   ├── assets/           # Static assets
│   ├── common/           # Shared UI/components/utils
│   ├── contexts/         # React contexts
│   ├── sections/         # Main application sections
│   │   ├── auth/         # Authentication components
│   │   ├── planner/      # Planning functionality
│   │   ├── notes/        # Notes functionality
│   │   └── settings/     # User settings
│   ├── App.tsx           # Main application component
│   └── main.tsx          # Application entry point
├── public/               # Public assets
├── .env.example          # Example environment variables
├── docker-compose.yml    # Docker Compose configuration
├── Dockerfile            # Multi-stage build (Node 20) + nginx runner
├── nginx/nginx.conf      # nginx config for SPA
├── index.html            # HTML entry point
├── package.json          # Scripts and dependencies
├── tsconfig.json         # TypeScript project references
└── vite.config.ts        # Vite configuration and path aliases
```

## Testing

The project uses [Vitest](https://vitest.dev/) for unit and component testing.

Run all tests:
```bash
npm run test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Notes Section

The Notes section provides a comprehensive system for personal knowledge management:

- **Folders**: Organize notes into hierarchical folders.
- **Import/Export**: Support for Markdown, HTML, and PDF (export only).

## Path Aliases

- `@` → `src`
- `@api` → `src/api`
- `@assets` → `src/assets`
- `@common` → `src/common`
- `@contexts` → `src/contexts`
- `@sections` → `src/sections`
- `@auth` → `src/sections/auth`
- `@planner` → `src/sections/planner`
- `@notes` → `src/sections/notes`
- `@settings` → `src/sections/settings`

## CI

GitHub Actions workflow: `.github/workflows/ci.yml`

Badge: ![Build](https://github.com/dbtiunov/perga-web/actions/workflows/ci.yml/badge.svg)

## Troubleshooting

- CORS: ensure `API_BASE_URL` points to the correct API and that CORS is enabled by the API.
- Signup hidden: set `IS_SIGNUP_DISABLED=false` (or omit) to show the Signup link.
- Blank page in production: verify nginx serves `index.html` for SPA routes (configured via `try_files` in `nginx.conf`).

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/dbtiunov/perga-web/blob/main/LICENSE) file for details.
