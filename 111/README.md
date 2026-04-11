# Xiuhongqi Digital Platform

## Project Overview

This project was originally built as a static HTML site and is now being migrated to a modern Vue + Node.js architecture.

Current stack:

- Frontend: Vue 3 + Vite + Pinia + Element Plus
- Backend: Node.js + Express
- Database: MySQL 8
- Auth: JWT
- Uploads: local filesystem under `public/uploads`

## Current Status

The project has moved past the migration stage and is now in the final integration stage before cloud deployment.

Completed so far:

- Main frontend pages migrated from HTML to Vue
- Existing backend APIs connected to the new frontend
- Database structure aligned with the current business tables
- Admin review capability migrated and enabled
- Core write actions now trust backend JWT identity instead of frontend-submitted user ids
- Frontend production build is passing

Still to finish:

- Full function-by-function regression testing
- More complete admin management screens
- Cloud deployment assets and runtime configuration
- Upload strategy decision for production storage
- Final cleanup of redundant legacy code after feature freeze

## Directory Structure

```text
.
|-- config/            # server config and database connection
|-- data/              # SQL schema and local data helpers
|-- docs/              # deployment and handover documents
|-- frontend-vue/      # Vue frontend app
|-- public/            # static assets and uploaded files
|-- server/            # Express routes and middleware
|-- docker-compose.yml # local database helper
```

## Environment Setup

### Backend

1. Copy the backend template:

```bash
cp .env.example .env
```

2. Fill in your real database and security values in `.env`.

Important variables:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `PORT`
- `NODE_ENV`
- `CORS_ORIGIN`
- `SESSION_SECRET`
- `JWT_SECRET`

### Frontend

The frontend already contains:

- [frontend-vue/.env.example](C:/Users/20892/Desktop/hongqi/111/frontend-vue/.env.example)
- [frontend-vue/.env.development](C:/Users/20892/Desktop/hongqi/111/frontend-vue/.env.development)
- [frontend-vue/.env.production](C:/Users/20892/Desktop/hongqi/111/frontend-vue/.env.production)

Main variable:

- `VITE_API_BASE_URL`

For integrated deployment behind the same domain, keep it as `/api`.

## Local Development

### Backend

```bash
npm install
npm run dev
```

Backend default entry:

- [server/index.js](C:/Users/20892/Desktop/hongqi/111/server/index.js)

Health check:

- `GET /health`

### Frontend

```bash
cd frontend-vue
npm install
npm run dev
```

### Production Build

Frontend build:

```bash
npm run build
```

Root shortcut:

```bash
npm run build
```

## Demo Content

After the schema and base seed are ready, you can load a full set of showcase data with:

```bash
npm run seed:demo
```

What this script does:

- Fills red culture, public welfare, skill teaching, interaction, contact, and contest modules with reusable demo content
- Reuses existing active admin/user accounts when available
- Automatically creates fallback demo accounts when the database is still empty enough that content seeding would fail
- Runs in an idempotent way so it can be executed again to refresh the same demo records

Fallback demo accounts created by the script when needed:

- Admin: `demo_admin` / `Demo#2026`
- User: `demo_user` / `Demo#2026`

The script also seeds forum replies, forum comments, interaction messages, event registrations, and contact message samples so the public pages and admin-side operations views do not look empty during review.

## Deployment Notes

Detailed production deployment steps are documented in:

- [docs/deployment.md](C:/Users/20892/Desktop/111/docs/deployment.md)
- [docs/project-inventory.md](C:/Users/20892/Desktop/111/docs/project-inventory.md)
- [docs/next-session-handover.md](C:/Users/20892/Desktop/111/docs/next-session-handover.md)

Recommended deployment path:

1. Build the Vue frontend into `frontend-vue/dist`
2. Start the Node server in production mode
3. Let Express serve both `/api` and the built frontend
4. Mount `public/uploads` to persistent storage
5. Put Nginx or another reverse proxy in front of the Node service
6. Configure HTTPS and the production domain

Recommended production checklist:

- Set `NODE_ENV=production`
- Set `CORS_ORIGIN` to the real frontend domain
- Use strong `JWT_SECRET` and `SESSION_SECRET`
- Use a production MySQL instance
- Persist the `public/uploads` directory
- Back up database and uploaded assets

## Upload Strategy

The current project stores uploaded files locally:

- `public/uploads`

This is acceptable for local development and small single-server deployment, but cloud deployment should preferably move to object storage later.

Recommended later upgrade:

1. Keep local uploads during feature completion
2. Abstract upload URLs behind a service layer
3. Migrate to object storage before large-scale production usage

## Notes For Handover

If a new developer or a new AI session takes over, the current priority should be:

1. Complete functional regression testing
2. Finish environment and deployment configuration
3. Check remaining admin-side migration gaps
4. Only then start legacy code cleanup
