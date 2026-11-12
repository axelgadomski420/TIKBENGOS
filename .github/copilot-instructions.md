# Copilot Instructions for Elif

## Build, test, and lint commands

Run commands from the repository root unless noted.

| Area | Command | Purpose |
| --- | --- | --- |
| Frontend | `cd frontend && npm install` | Install dependencies |
| Frontend | `cd frontend && npm start` | Run Angular dev server (`http://localhost:4200`) |
| Frontend | `cd frontend && npm run build` | Production build |
| Frontend | `cd frontend && npm run build -- --configuration development` | Development build |
| Frontend | `cd frontend && npm run test` | Full frontend unit test suite (Karma) |
| Frontend (single test) | `cd frontend && npm run test -- --watch=false --browsers=false --include src/app/app.component.spec.ts` | Run one spec file |
| Backend | `cd backend && ./mvnw spring-boot:run` | Run Spring Boot API (`http://localhost:8087/elif`) |
| Backend | `cd backend && ./mvnw -DskipTests compile` | Compile backend quickly |
| Backend | `cd backend && ./mvnw test` | Full backend test suite |
| Backend (single test) | `cd backend && ./mvnw -Dtest=BackendApplicationTests test` | Run one JUnit test class |
| Database seed data | `bash backend/run_demo_seeds.sh` | Load demo seed SQL files |

There is currently no dedicated repository lint command in `frontend/package.json` or `backend/pom.xml`.

## High-level architecture

Elif is a monorepo with:

- **Angular frontend** (`frontend/`) split into lazy-loaded route areas:
  - `/app` → front-office module tree
  - `/admin` → back-office module tree (guarded by `AdminGuard`)
  - `/auth` → auth module
- **Spring Boot backend** (`backend/`) served under context path **`/elif`** on port `8087`.
- **MySQL persistence** through Spring Data JPA repositories.

Key integration contracts:

1. Frontend service URLs are centralized in `frontend/src/environments/environment*.ts` (REST + WebSocket endpoints). Reuse these values; avoid hardcoded localhost URLs in feature services.
2. Backend community realtime uses STOMP:
   - Endpoint: `/ws-community` (full URL includes `/elif`)
   - App destinations: `/app/...`
   - Broker topics: `/topic/...` and `/queue/...`
3. Community and notification APIs follow header-based identity, not framework auth principals.

## Key repository conventions

1. **Domain layering in backend**: packages are organized by domain and layer (`controllers`, `services`, `repositories`, `entities`, `dto`). New features should follow this split instead of creating cross-domain utility endpoints.
2. **Header contract for user context**:
   - `X-User-Id` is required for most write operations.
   - `X-Act-As-User-Id` is optional for admin impersonation flows where supported.
3. **Community realtime + notification topics**:
   - Presence and chat events publish on `/topic/community...`.
   - User notifications publish on `/topic/community.notifications.{userId}` and count on `/topic/community.notifications.{userId}.count`.
4. **Route-shell convention in frontend**:
   - Front-office pages are hosted under the front-office layout/module.
   - Back-office pages are hosted under the back-office layout/module and remain admin-guarded.
5. **Design-system override hierarchy**:
   - For UI work, check `design-system/elif/pages/<page>.md` first.
   - If page-specific rules do not exist, use `design-system/elif/MASTER.md`.
