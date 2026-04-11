# Project Inventory

## Project Position

- Project name: `xiuhongqi-digital-platform`
- Goal: a Vue + Node + MySQL integrated platform for red culture display, contests, public welfare, skill teaching, interaction, and contact workflows
- Current phase: feature-complete core flow, now in closure stage
- Current closure priority: deployment first, unified UI second

## Tech Stack

- Frontend: Vue 3 + Vite + Pinia + Element Plus
- Backend: Node.js + Express
- Database: MySQL 8
- Auth: JWT
- Uploads: local filesystem under `public/uploads`
- Deployment mode: in production, Node serves both `/api` and `frontend-vue/dist`

## Verified Core Flows

These have already been verified as working and should be treated as the stable baseline:

- register / login / user center
- contact message submission
- interaction message wall
- forum topics / replies / comments
- interaction event registration
- video contest submission / admin review / public display / vote / comment
- embroidery contest submission / admin review / public display / vote / comment
- skill teaching submission / admin review / public display
- red culture / public welfare / skill teaching admin CRUD
- frontend + backend integrated production hosting mode
- `npm run test:smoke` passed
- `npm run test:page-smoke` passed

## Main Runtime Entry Points

### Backend

- Entry: `server/index.js`
- API router aggregation: `server/routes/api.js`
- Auth middleware: `server/middleware/auth.js`

### Public API Route Files

- `server/routes/userRoutes.js`
- `server/routes/contactRoutes.js`
- `server/routes/interactionRoutes.js`
- `server/routes/videoContestRoutes.js`
- `server/routes/embContestRoutes.js`
- `server/routes/redFlagCultureRoutes.js`
- `server/routes/publicWelfareRoutes.js`
- `server/routes/skillTeachingRoutes.js`

### Admin API Route Files

- `server/routes/adminRoutes.js`
- admin content CRUD also lives inside the module route files above

## Frontend Main Views

### Public Pages

- home: `frontend-vue/src/views/home/HomeView.vue`
- contact: `frontend-vue/src/views/contact/ContactView.vue`
- interaction: `frontend-vue/src/views/interaction/InteractionView.vue`
- video contest: `frontend-vue/src/views/video-contest/VideoContestView.vue`
- embroidery contest: `frontend-vue/src/views/emb-contest/EmbContestView.vue`
- red culture: `frontend-vue/src/views/red-culture/RedCultureView.vue`
- public welfare: `frontend-vue/src/views/public-welfare/PublicWelfareView.vue`
- skill teaching: `frontend-vue/src/views/skill-teaching/SkillTeachingView.vue`
- login: `frontend-vue/src/views/auth/LoginView.vue`
- user center: `frontend-vue/src/views/user/UserCenterView.vue`

### Admin Pages

- dashboard: `frontend-vue/src/views/admin/AdminDashboardView.vue`
- review center: `frontend-vue/src/views/admin/AdminReviewView.vue`
- interaction operations: `frontend-vue/src/views/admin/AdminInteractionView.vue`
- operations desk: `frontend-vue/src/views/admin/AdminOperationsView.vue`
- users: `frontend-vue/src/views/admin/AdminUsersView.vue`
- red culture admin: `frontend-vue/src/views/admin/AdminRedCultureView.vue`
- public welfare admin: `frontend-vue/src/views/admin/AdminPublicWelfareView.vue`
- skill teaching admin: `frontend-vue/src/views/admin/AdminSkillTeachingView.vue`

## Data / Seed Assets

- deploy schema: `data/01-schema.deploy.sql`
- deploy seed: `data/02-seed.deploy.sql`
- demo content seed script: `scripts/seed-demo-content.mjs`
- bundled demo assets: `public/uploads/demo-*`

Useful commands:

- install backend deps: `npm install`
- start backend dev: `npm run dev`
- build frontend from root: `npm run build`
- seed showcase data: `npm run seed:demo`
- smoke test: `npm run test:smoke`
- page smoke test: `npm run test:page-smoke`

## Deployment Assets

- production Docker image: `Dockerfile`
- production compose stack: `docker-compose.prod.yml`
- nginx reverse proxy: `deploy/nginx/default.conf`
- uploads volume bootstrap: `scripts/docker-entrypoint.sh`
- deployment guide: `docs/deployment.md`

## Cleanup Already Done

The following unused legacy files were removed because they were not referenced by the active route-based backend:

- old mock controllers under `server/controllers/`
- `server/middleware/exampleMiddleware.js`
- empty `PROJECT_STRUCTURE.md`
- legacy `init_db.sql`

## Current Recommended Next Work

Priority order should remain:

1. deployment closure
2. deployment verification on target environment
3. only after that, unified UI polish

## Things To Avoid By Default

- do not add new pages unless explicitly requested
- do not re-open feature expansion before deployment closure is done
- do not reintroduce the deleted mock controller layer
- do not replace the integrated production hosting approach unless there is a strong deployment reason
