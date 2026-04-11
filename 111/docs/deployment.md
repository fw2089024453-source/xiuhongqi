# Deployment Guide

## Included Assets

This repository now includes the following production deployment files:

- `Dockerfile`: multi-stage build for frontend + backend integrated runtime
- `docker-compose.prod.yml`: single-host production stack with MySQL, app, and Nginx
- `deploy/nginx/default.conf`: reverse proxy config
- `scripts/docker-entrypoint.sh`: initializes persistent `public/uploads` volume with bundled seed assets

## Recommended Topology

- `nginx` listens on port `80` and forwards all traffic to the Node app
- Node runs the API and serves `frontend-vue/dist` in production mode
- MySQL runs in a separate container
- `public/uploads` is mounted to a host directory so uploads survive image rebuilds and container replacement

## Environment Preparation

1. Copy the template:

```bash
cp .env.example .env
```

2. Edit `.env` and set at least:

- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `MYSQL_ROOT_PASSWORD`
- `NODE_ENV=production`
- `CORS_ORIGIN=https://your-domain.example.com`
- `JWT_SECRET`
- `SESSION_SECRET`

3. Prepare persistent directories:

```bash
mkdir -p storage/uploads storage/mysql
```

## First Deployment

Run:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Check service status:

```bash
docker compose -f docker-compose.prod.yml ps
```

Check app health:

```bash
curl http://127.0.0.1:${NGINX_PORT:-80}/health
```

## Upload Persistence Strategy

The production compose file mounts:

- `${UPLOADS_DIR}` -> `/app/public/uploads`

This means:

- user uploads are not stored inside the image layer
- uploads remain after container recreation
- backups only need the database and the upload directory

To avoid losing built-in demo assets on first mount, the container entrypoint copies packaged files from `/app/public/uploads-seed` into the mounted uploads directory only when they are missing.

## Database Initialization

On the first MySQL boot with an empty data directory, these scripts are executed automatically:

- `data/01-schema.deploy.sql`
- `data/02-seed.deploy.sql`

Important:

- these init scripts only run when `${MYSQL_DATA_DIR}` is empty
- if you need to reinitialize from scratch, stop the stack and remove the MySQL data directory first

## Common Operations

Rebuild and restart:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

View logs:

```bash
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f nginx
docker compose -f docker-compose.prod.yml logs -f mysql
```

Stop services:

```bash
docker compose -f docker-compose.prod.yml stop
```

Stop services and remove containers but keep data:

```bash
docker compose -f docker-compose.prod.yml down
```

Stop services and remove containers plus anonymous networks:

```bash
docker compose -f docker-compose.prod.yml down --remove-orphans
```

## Release Checklist

- `npm run build` passes locally before building the image
- `.env` uses production secrets instead of template values
- `CORS_ORIGIN` is the real public domain
- `UPLOADS_DIR` points to a backed-up host path
- MySQL data directory is on persistent storage
- Nginx is placed behind HTTPS termination, or TLS is handled at the server edge

## Rollback Idea

For a simple single-host deployment, the safest rollback pattern is:

1. keep the previous image tag available locally or in your registry
2. restore the previous container image
3. do not delete `storage/uploads`
4. restore MySQL from backup only when schema/data changes require it
