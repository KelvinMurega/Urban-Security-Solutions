# Urban Security Solutions

A guard management system for Urban Security Solutions Limited: an **Admin portal** for overseeing sites, personnel, incidents and billing, a mobile-first **Guard portal** for GPS-verified shift check-in/out and incident reporting, and a **Client portal** where customers see activity and invoices for their own sites.

[![CI](https://github.com/KelvinMurega/Urban-Security-Solutions/actions/workflows/ci.yml/badge.svg)](https://github.com/KelvinMurega/Urban-Security-Solutions/actions/workflows/ci.yml)

- **Deploying?** Read [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
- **Operating it?** Read [docs/RUNBOOK.md](docs/RUNBOOK.md).
- **Security model and reporting:** [SECURITY.md](SECURITY.md).

## Features

**Admin portal**: personnel and client management, sites with GPS geofences, shift scheduling with a live roster, incident tracking and resolution, daily logs, invoicing, and a read-only **audit log** of every change.

**Guard portal** (mobile-first): **GPS-verified check-in/out** (rejected outside the site's geofence; suspicious readings such as mock-location accuracy are flagged for supervisor review), guard handovers, incident reports with photo evidence, daily logs, profile.

**Client portal**: attendance, hours, incidents, guard reports and invoices for the client's assigned sites only.

**Platform**: secure by design and by default. See [SECURITY.md](SECURITY.md).

## Tech stack

| | |
|---|---|
| **Backend** | Node.js 22, Express 5, TypeScript, Prisma, MySQL 8 |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| **Auth** | httpOnly session cookie (JWT, HS256, revocable), bcrypt |
| **Ops** | Docker, Caddy (automatic HTTPS), pino structured logs, optional Sentry, S3/R2 evidence storage |
| **Quality** | Vitest + Supertest against real MySQL, GitHub Actions CI, Dependabot |

## Project structure

```
backend/
  prisma/            schema, migrations, first-admin seed
  scripts/           retention.ts (data-protection retention job)
  src/
    config/          validated environment + allowed origins
    middleware/      auth (DB-backed sessions), CSRF, rate limits, errors
    modules/         auth, users, sites, shifts, incidents, reports, clients, client-portal, invoices, files, audit
    shared/          prisma, logger, storage (local/S3), uploads, audit, pagination, password policy
    app.ts           Express app (imported by tests)
    server.ts        process entry point
  tests/             unit + integration tests
frontend/
  src/app/           admin routes at /, guard routes under /guard, client routes under /client
  src/middleware.ts  server-side route/role enforcement
deploy/              Caddyfile, backup.sh, restore.sh
docker-compose.yml   production stack
```

## Local development

Prerequisites: Node.js 22+, MySQL 8, (optional) Docker.

### Backend

```bash
cd backend
npm install
cp .env.example .env          # fill in DATABASE_URL and a random JWT_SECRET (32+ chars); keep NODE_ENV=development
npx prisma migrate deploy
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a long passphrase' npm run seed   # first admin; there are no default credentials
npm run dev                   # http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
echo 'JWT_SECRET="<same value as backend/.env>"' > .env.local
npm run dev                   # http://localhost:3005 (also reachable from phones on your LAN)
```

Leave `NEXT_PUBLIC_API_URL` unset locally: the app then targets `<this host>:5000`.

### Tests

Integration tests need a throwaway MySQL database whose name contains `test` (they refuse to run against anything else):

```bash
docker run -d --name uss-test-mysql -e MYSQL_ROOT_PASSWORD=testroot -e MYSQL_DATABASE=uss_test -p 3307:3306 mysql:8.4
cd backend
DATABASE_URL=mysql://root:testroot@127.0.0.1:3307/uss_test npx prisma migrate deploy
TEST_DATABASE_URL=mysql://root:testroot@127.0.0.1:3307/uss_test npm test
```

### Client-facing website

`urban-security-solutions/` is a separate static site (its own repository). Its **Client login** link points at `/client/login` of this app (`CLIENT_PORTAL_URL`).

## Scripts

| | Backend | Frontend |
|---|---|---|
| Dev server | `npm run dev` | `npm run dev` |
| Type-check | `npm run typecheck` | `npx tsc --noEmit` |
| Tests | `npm test` | — |
| Lint | — | `npm run lint` |
| Build / start | `npm run build` / `npm start` | `npm run build` / `npm start` |
| Apply migrations | `npm run db:migrate` | — |
| Schema drift check | `npm run db:check-drift` | — |
| First admin | `npm run seed` | — |
| Data retention | `npm run retention` (dry run) / `-- --apply` | — |

## Data model

Defined in `backend/prisma/schema.prisma`:

- **User**: `ADMIN`, `GUARD` or `CLIENT`, with session version and lockout state
- **Site**: address, GPS coordinates, geofence radius
- **Shift**: schedule, check-in/out time, location, accuracy, device evidence, review flag, handovers
- **Incident** / **Report**: guard submissions with private photo evidence
- **ClientSite** / **Invoice**: client access and billing
- **AuditLog**: append-only who/what/when/where
