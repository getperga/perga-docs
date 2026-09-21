---
sidebar_position: 2
title: Installation and Self-Hosting Guide
description: Install Perga with Docker Compose, prepare a public deployment, back up PostgreSQL, restore data, and update the services.
---

# Installation and self-hosting

Perga's combined installation runs the web client, API, PostgreSQL, and nginx with Docker Compose. The provided configuration is suitable for local use and as a starting point for a self-hosted deployment.

The default setup uses plain HTTP. Before exposing it to the internet, complete the [production checklist](#production-deployment) and place it behind a TLS-terminating reverse proxy.

## Requirements

- Docker Engine with the Compose plugin
- A machine that can pull images from GitHub Container Registry and Docker Hub
- For a public deployment: a domain, TLS, firewall rules, monitoring, and off-machine backups

## Services and data

The combined installer starts:

| Service | Purpose | Default local access |
| --- | --- | --- |
| `db` | PostgreSQL 16 database | Internal Docker network only |
| `api` | Perga API | `http://localhost:8000` |
| `web` | Perga browser client | `http://localhost:3000` |
| `nginx` | Combined reverse proxy | `http://localhost` |

PostgreSQL data is stored in the named Docker volume `postgres_data`. Recreating a container does not normally remove this volume. The volume is not a backup: deleting it, losing the host, or corrupting the database can still destroy the data.

The combined installer and the standalone development Compose file in the
`perga-api` repository use PostgreSQL 16.

## Quick local installation

### 1. Download the installer

```bash
mkdir -p perga-install
cd perga-install
curl -fsSL -o install.sh https://docs.getperga.me/installation/install.sh
chmod +x install.sh
```

Review scripts downloaded from the internet before running them.

### 2. Run the installer

```bash
./install.sh
```

On the first run, the script downloads the Compose file, nginx configuration, and environment template. It creates `.env`, pulls the container images, and starts the services.

The script does not overwrite existing `docker-compose.yml`, `.env.example`,
`.env`, or `nginx/nginx.conf` files. Running it again starts the existing local
configuration without pulling new container images. Follow the
[update procedure](#update-perga) when you intend to update Perga.

### 3. Verify the installation

```bash
docker compose ps
docker compose logs --tail=100 api web nginx db
```

Open:

- Perga through nginx: http://localhost
- Web client directly: http://localhost:3000
- API documentation directly: http://localhost:8000/docs

## Manual local installation

### 1. Download the installation files

```bash
mkdir -p perga-install/nginx
cd perga-install
curl -fsSL \
  -o docker-compose.yml https://docs.getperga.me/installation/docker-compose.yml \
  -o .env.example https://docs.getperga.me/installation/.env.example \
  -o nginx/nginx.conf https://docs.getperga.me/installation/nginx/nginx.conf
```

### 2. Create the environment file

```bash
cp .env.example .env
chmod 600 .env
```

Edit `.env` before starting the services.

Important variables:

- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: PostgreSQL connection and credentials. Keep `POSTGRES_HOST=db` for the provided Compose network.
- `SECRET_KEY`: API signing secret. Replace the example value with a long random value.
- `CORS_ORIGINS`: JSON array of browser origins allowed to call the API.
- `API_BASE_URL`: API URL used by the browser client.
- `IS_SIGNUP_DISABLED`: set to `true` when public self-registration should be disabled.
- `SQLALCHEMY_POOL_SIZE`, `SQLALCHEMY_MAX_OVERFLOW`, `SQLALCHEMY_POOL_TIMEOUT`, `SQLALCHEMY_POOL_RECYCLE`: API database pool settings.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: optional Google OAuth credentials. Leave both empty when Google sign-in is not configured.

You can generate a random secret with:

```bash
openssl rand -hex 32
```

### 3. Start and verify the services

```bash
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 api web nginx db
```

The API container runs pending Alembic database migrations when it starts.

## Production deployment

The downloaded configuration does not provide a complete production deployment. It exposes plain HTTP and does not automate certificates, firewall configuration, backups, monitoring, or tested rollbacks.

Before exposing Perga to the internet:

1. Create a DNS record for the hostname you will use.
2. Terminate HTTPS with a maintained reverse proxy such as Caddy, Traefik, or an existing host-level nginx installation.
3. Forward HTTPS traffic to the Perga nginx service and do not expose PostgreSQL publicly.
4. Restrict the direct API and web-client ports to localhost or remove their host port mappings.
5. Set `API_BASE_URL` to the public HTTPS API URL, for example `https://perga.example.com/api/v1`.
6. Set `CORS_ORIGINS` to the exact public origin, for example `["https://perga.example.com"]`.
7. Replace the example database password and `SECRET_KEY`; keep `.env` readable only by the deployment operator.
8. Decide whether public signup should be available. Set `IS_SIGNUP_DISABLED=true` when it should not.
9. Configure automated off-machine backups and test a restore before relying on the deployment.
10. Monitor service health, disk usage, certificate renewal, and backup completion.

A common layout is:

```text
Internet -> HTTPS reverse proxy -> 127.0.0.1:8080 -> Perga nginx -> web/API
                                                   -> PostgreSQL on Docker network
```

For this layout, bind the Perga nginx HTTP port to localhost, for example `127.0.0.1:8080:80`, and configure the external reverse proxy to forward the original host and client forwarding headers. Bind the direct API and web ports to localhost if you keep them for diagnostics:

```yaml
services:
  api:
    ports:
      - "127.0.0.1:8000:8000"
  web:
    ports:
      - "127.0.0.1:3000:80"
  nginx:
    ports:
      - "127.0.0.1:8080:80"
```

Do not copy this fragment into the Compose file as a second `services` block. Apply the port changes to the existing service definitions or maintain them in a reviewed production override.

## Back up PostgreSQL

Create a logical PostgreSQL backup before every update and on a regular schedule. Store copies outside the Docker host.

From the installation directory:

```bash
mkdir -p backups
perga_backup_file="backups/perga-$(date +%F-%H%M%S).dump"
docker compose exec -T db sh -c \
  'pg_dump --format=custom --no-owner --username="$POSTGRES_USER" "$POSTGRES_DB"' \
  > "$perga_backup_file"
test -s "$perga_backup_file"
docker compose exec -T db pg_restore --list < "$perga_backup_file" > /dev/null
echo "$perga_backup_file"
```

The final two checks confirm that the file is not empty and that `pg_restore` can read its archive structure. They do not replace a full restore test.

Also keep protected copies of the deployment's `.env`, `docker-compose.yml`, and nginx configuration. The `.env` file contains secrets and must not be stored in a public repository or an unencrypted public location.

## Restore PostgreSQL

Restoring replaces the current Perga database with the contents of the selected backup. Verify the filename and keep a separate copy of the current database before continuing.

Stop services that connect to the database:

```bash
docker compose stop api web nginx
```

Recreate the application database:

```bash
docker compose exec -T db sh -c \
  'dropdb --if-exists --username="$POSTGRES_USER" "$POSTGRES_DB" && \
   createdb --username="$POSTGRES_USER" "$POSTGRES_DB"'
```

Restore a selected archive and start the services:

```bash
perga_restore_file="backups/perga-2026-09-21-120000.dump"
test -s "$perga_restore_file"
docker compose exec -T db sh -c \
  'pg_restore --no-owner --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' \
  < "$perga_restore_file"
docker compose up -d
docker compose ps
docker compose logs --tail=100 api web nginx db
```

Replace the example restore filename with the archive you intend to restore. After restoring, sign in and verify planner items, agendas, notes, search, and note imports and exports relevant to your use.

## Update Perga

The provided Compose file follows `latest` application images. Updates may include database migrations, so create and verify a backup first.

```bash
mkdir -p backups
perga_backup_file="backups/perga-before-update-$(date +%F-%H%M%S).dump"
docker compose exec -T db sh -c \
  'pg_dump --format=custom --no-owner --username="$POSTGRES_USER" "$POSTGRES_DB"' \
  > "$perga_backup_file"
test -s "$perga_backup_file"
docker compose exec -T db pg_restore --list < "$perga_backup_file" > /dev/null

docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 api web nginx db
```

After updating, verify sign-in, daily and weekly planner views, agendas, notes, search, import, and export.

Because `latest` is a moving tag, it does not provide a reproducible rollback target. Operators who require controlled releases should pin reviewed image digests or version tags when available and retain the previous Compose configuration. A database migration may prevent an application-only downgrade; restore the matching pre-update database backup when a release requires a database rollback.

## Stop or remove the installation

Stop and remove the containers while retaining PostgreSQL data:

```bash
docker compose down
```

The following command also deletes the PostgreSQL volume and all Perga data stored in it:

```bash
docker compose down --volumes
```

Do not use `--volumes` unless you intend to remove the data and have verified any backup you need.
