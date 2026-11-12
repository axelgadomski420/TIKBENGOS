# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build, test, and run commands

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

## High-level architecture

Elif is a monorepo with:

- **Angular frontend** (`frontend/`) split into lazy-loaded route areas:
  - `/app` → front-office module tree
  - `/admin` → back-office module tree (guarded by `AdminGuard`)
  - `/auth` → auth module
- **Spring Boot backend** (`backend/`) served under context path **`/elif`** on port `8087`
- **MySQL persistence** through Spring Data JPA repositories

### Business domains

The project is organized by business domain rather than technical layer:

- **Community**: communities, posts, comments, votes, realtime chat, mentions, moderation, notifications
- **Marketplace**: product catalog, cart, Stripe checkout, orders, invoices, reclamations
- **Pet Profiles**: pet records and admin pet management
- **Pet Transit**: destinations, travel plans, OCR document analysis, checklist flows, feedback, exports
- **Adoption**: shelters, appointments, animals, contracts, PDFs, approval emails
- **Events**: listings, registration, waitlist, reminders, virtual sessions, certificates
- **Services**: service discovery and management
- **Users/Auth**: login, registration, roles, back-office user administration

### Key integration contracts

1. **Frontend service URLs**: Centralized in `frontend/src/environments/environment*.ts` (REST + WebSocket endpoints). Reuse these values; avoid hardcoded localhost URLs in feature services.

2. **Backend community realtime**: Uses STOMP over WebSocket
   - Endpoint: `/elif/ws-community`
   - App destinations: `/app/...`
   - Broker topics: `/topic/...` and `/queue/...`

3. **User context headers**: Most write operations require:
   - `X-User-Id` (required)
   - `X-Act-As-User-Id` (optional, for admin impersonation where supported)

4. **Community AI Agent**: Separate FastAPI microservice at `http://localhost:8095`
   - Frontend calls via `communityAgentApiUrl` in environment files
   - Agent calls Elif backend with `X-User-Id` and `X-Act-As-User-Id` headers
   - Backend must be running before agent service

## Repository conventions

### Backend structure

Packages are organized by domain and layer (`controllers`, `services`, `repositories`, `entities`, `dto`). New features should follow this split instead of creating cross-domain utility endpoints.

Example structure:
```
backend/src/main/java/com/elif/
├── controllers/
│   ├── community/
│   ├── marketplace/
│   └── ...
├── services/
│   ├── community/
│   ├── marketplace/
│   └── ...
├── repositories/
├── entities/
├── dto/
├── config/
└── exceptions/
```

### Frontend structure

Main app areas under `frontend/src/app`:
- `auth` - authentication flows
- `front-office` - public-facing features (dashboard, community, marketplace, etc.)
- `back-office` - admin workspace (guarded by `AdminGuard`)
- `shared` - shared components and services

### Realtime patterns

Community realtime + notification topics:
- Presence and chat events publish on `/topic/community...`
- User notifications publish on `/topic/community.notifications.{userId}`
- Notification counts on `/topic/community.notifications.{userId}.count`

### Design system hierarchy

For UI work, check `design-system/elif/pages/<page>.md` first. If page-specific rules do not exist, use `design-system/elif/MASTER.md`.

## Environment configuration

Backend reads env values from these locations (in order):
- `.env`
- `backend/.env`
- `../backend/.env`
- `../.env`

Key environment variables:
- `STRIPE_SECRET_KEY` - Stripe checkout
- `SPRING_MAIL_*` - SMTP configuration
- `APP_MAIL_FROM` - sender override
- `APP_FRONTEND_BASE_URL` - link generation in emails
- `OPENAI_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY` - AI integrations
- `GIPHY_API_KEY` - community GIF search
- `APP_NOTIFICATIONS_COMMUNITY_NEW_POST_ENABLED` - enables broad new-post notifications

## Database

Default configuration:
- host: `localhost`
- port: `3306`
- database: `Elif`
- user: `root`
- password: empty

The backend uses `spring.jpa.hibernate.ddl-auto=update` for schema management.

## Demo accounts

From `backend/user_demo_seed.sql`:
- `admin1@elif.com / password`
- `admin2@elif.com / password`
- `vet1@elif.com / password`
- `provider1@elif.com / password`
- `user1@elif.com / password` (and user2-user11)
- `shelter.approved@elif.com / password`
- `shelter.pending@elif.com / password`

## Important operational details

- Backend is a single Spring Boot app serving all domains
- Notifications are persisted and broadcast in realtime through the shared notification service
- Runtime uploads are stored under `backend/uploads` and should be treated as environment-specific state
- The repo contains generated/runtime folders like `backend/target` and `backend/uploads`
- No root Docker Compose setup in this repo

## Companion service: Community AI Agent

Separate repo at `AtfastrSlushyMaker/elif-community-ai-agent-nl` powers natural-language community search. The agent:
- Receives natural-language queries from Elif frontend
- Fetches evidence from Elif community APIs
- Uses Groq LLM for plan-and-execute agent loop
- Executes actions against Elif backend endpoints
- Synthesizes grounded answers with referenced posts

Agent service expects:
- `BACKEND_BASE_URL=http://localhost:8087/elif`
- `BACKEND_COMMUNITY_PREFIX=/api/community`