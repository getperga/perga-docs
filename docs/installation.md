---
sidebar_position: 2
title: Installation and Self-Hosting Guide
description: Self-host Perga with Docker Compose. Set up the web client, API, and PostgreSQL, configure HTTPS for public access, and learn to back up, restore, and update.
---

# Installation and self-hosting

Docker Compose runs Perga Web, API, PostgreSQL, and nginx together. Use this setup locally or configure it for your own server.

By default, Perga is available only on your machine. For public access, use an HTTPS reverse proxy and follow the [production checklist](#production-deployment).

## Requirements

- Docker Engine with the Compose plugin
- Access to GitHub Container Registry and Docker Hub
- For public access: a domain, HTTPS, a firewall, monitoring, and backups on another machine

## Services and data

The installer starts:

| Service | Purpose | Default local access |
| --- | --- | --- |
| `db` | PostgreSQL 16 database | Internal Docker network only |
| `api` | Perga API | `http://localhost:8000` |
| `web` | Perga browser client | `http://localhost:3000` |
| `nginx` | Combined reverse proxy | `http://localhost` |

PostgreSQL stores data in the Docker volume `postgres_data`, which survives container replacement. Keep separate backups in case the volume or host is lost.

Both this installer and the API's development Compose setup use PostgreSQL 16.

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

On the first run, the script downloads the setup files and uses OpenSSL to
create `.env` with a random signing key and database password. It then
downloads the application images, builds nginx, and starts Perga.

Existing files are kept. Running the installer again starts your current
setup without downloading new images. To upgrade, follow [Update Perga](#update-perga).

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
  -o nginx/nginx.conf https://docs.getperga.me/installation/nginx/nginx.conf \
  -o nginx/Dockerfile https://docs.getperga.me/installation/nginx/Dockerfile
```

### 2. Create the environment file

```bash
cp .env.example .env
chmod 600 .env
```

Edit `.env` before starting the services.

Important variables:

- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: database settings. Keep `POSTGRES_HOST=db` with the supplied Compose file.
- `SECRET_KEY`: API signing secret. Replace the example value with a long random value.
- `CORS_ORIGINS`: JSON array of browser origins allowed to call the API.
- `API_BASE_URL`: API URL used by the browser client.
- `IS_SIGNUP_DISABLED`: set to `true` to disable public signup.
- `SQLALCHEMY_POOL_SIZE`, `SQLALCHEMY_MAX_OVERFLOW`, `SQLALCHEMY_POOL_TIMEOUT`, `SQLALCHEMY_POOL_RECYCLE`: API database pool settings.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google sign-in credentials. Leave both empty if unused.

You can generate a random secret with:

```bash
openssl rand -hex 32
```

### 3. Start and verify the services

```bash
docker compose pull
docker compose build --pull nginx
docker compose up -d
docker compose ps
docker compose logs --tail=100 api web nginx db
```

The API container runs pending Alembic database migrations when it starts.

## Production deployment

For public access, add HTTPS, a firewall, backups, and monitoring to the default setup.

Before exposing Perga to the internet:

1. Point your domain to the server with a DNS record.
2. Set up an HTTPS reverse proxy, such as Caddy, Traefik, or nginx.
3. Forward traffic to Perga nginx. Keep PostgreSQL private.
4. Keep the direct API and Web ports on localhost, or remove their port mappings.
5. Set `API_BASE_URL`, for example `https://perga.example.com/api/v1`. Keep Web and API on the same site so session cookies work.
6. Set `CORS_ORIGINS` to the Web origin, for example `["https://perga.example.com"]`.
7. Replace example passwords and generate `SECRET_KEY` with `openssl rand -hex 32`. Restrict access to `.env` to the server operator.
8. Set `IS_SIGNUP_DISABLED=true` if public signup should be disabled.
9. Schedule backups to another machine and test restoring them.
10. Monitor service health, disk space, certificates, and backups.

Keep the API port local and use nginx to limit login and signup attempts.
Update API before nginx, and roll them back together.
See [API ingress protection](./perga-api#docker).

Web reports CSP issues without blocking resources. Check the browser console,
then set `CSP_MODE=enforce` and recreate Web.
See [Web CSP configuration](./perga-web#content-security-policy).

A common layout is:

```text
Internet -> HTTPS reverse proxy -> 127.0.0.1:8080 -> Perga nginx -> web/API
                                                   -> PostgreSQL on Docker network
```

Bind Perga's ports to localhost as shown below. Configure the HTTPS proxy to
forward the original host and client IP; trust only that proxy in Perga nginx.

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

Update the existing `services` entries or use a Compose override. Do not add a second `services` block.

For local use, open Web at `http://localhost:3000` and use
`http://localhost:8000/api/v1`. Use the same hostname in both URLs.
When upgrading an older installation, give API user `10001:10001` write access
to the attachments volume. Sign in again after upgrading to server-side sessions.

## Back up PostgreSQL

Back up PostgreSQL regularly and before each update. Keep copies on another machine.

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

The checks confirm that the backup is nonempty and readable. Also test restoring it.

Also back up `.env`, `docker-compose.yml`, and the nginx configuration. Encrypt
backups of `.env` and keep them private: it contains passwords and signing keys.

## Restore PostgreSQL

Restoring replaces the current database. Check the backup filename and save a copy of the current database first.

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

Replace the example filename with your backup. After restoring, sign in and
check your planner, notes, search, import, and export.

## Update Perga

The Compose file uses the `latest` application images. Updates may change the database, so create and check a backup first.

Compare your files with the latest [Compose template](/installation/docker-compose.yml),
[nginx configuration](pathname:///installation/nginx/nginx.conf), and
[nginx Dockerfile](pathname:///installation/nginx/Dockerfile). Merge the changes
into your local files, keeping your proxy settings. Save the new Dockerfile as
`nginx/Dockerfile`; the commands below rebuild nginx with its security fixes.

```bash
mkdir -p backups
perga_backup_file="backups/perga-before-update-$(date +%F-%H%M%S).dump"
docker compose exec -T db sh -c \
  'pg_dump --format=custom --no-owner --username="$POSTGRES_USER" "$POSTGRES_DB"' \
  > "$perga_backup_file"
test -s "$perga_backup_file"
docker compose exec -T db pg_restore --list < "$perga_backup_file" > /dev/null

docker compose pull
docker compose build --pull --no-cache nginx
docker compose up -d
docker compose ps
docker compose logs --tail=100 api web nginx db
```

After updating, check sign-in, daily and weekly plans, agendas, notes, search, import, and export.

To keep a known version for rollback, pin image digests or available version
tags and save the previous Compose file. Older application versions may not
work with an updated database; restore the matching backup when needed.

## Stop or remove the installation

Remove the containers but keep PostgreSQL data:

```bash
docker compose down
```

To also delete the PostgreSQL volume and its data:

```bash
docker compose down --volumes
```

Use `--volumes` only if you want to delete the data and have checked your backup.
