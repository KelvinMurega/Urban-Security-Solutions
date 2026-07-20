# Urban Security Solutions

A guard management system for Urban Security Solutions Limited — an **Admin portal** for overseeing sites, personnel, and incidents, and a mobile-first **Guard portal** for shift check-in/out, incident reporting, and daily logs.

## Features

**Admin portal**
- Personnel management (create/update/deactivate guards, assign to sites)
- Site management, including GPS coordinates and a configurable geofence radius
- Shift scheduling and a live roster with check-in/check-out status
- Incident tracking (severity, status, resolution notes)
- Daily log review

**Guard portal** (mobile-first)
- Live dashboard with next assignment and weekly stats
- Shift schedule with **GPS-verified check-in/check-out** — rejects check-in/out outside a site's geofence when the site has coordinates set, and records the actual distance
- Guard handover linked to real guard accounts (not free-text names)
- Incident reporting and daily log submission
- Profile management with photo upload

**Platform**
- JWT authentication with an httpOnly session cookie, verified server-side by Next.js middleware (not just client-side checks)
- Role-based access control (`ADMIN` / `GUARD`)
- Rate limiting, centralized error handling, request logging

## Tech Stack

| | |
|---|---|
| **Backend** | Node.js, Express 5, TypeScript, Prisma ORM, MySQL |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS |
| **Auth** | JWT (`jsonwebtoken`), `bcryptjs`, httpOnly cookies |
| **Validation** | Zod |

## Project Structure

```
backend/
  prisma/           schema.prisma, migrations, seed script
  src/
    modules/        auth, users, sites, shifts, incidents, reports (controller + service + routes per module)
    middleware/      auth, rate limiting, centralized error handling
    shared/          cross-cutting utilities (e.g. geofencing distance calc)
    server.ts        Express app entry point
frontend/
  src/
    app/             Next.js App Router pages — admin routes at the root, guard routes under /guard
    components/       AdminLayout, GuardLayout, shared UI (PageHeader, StatusBadge, ToastProvider)
    lib/              API URL resolution, avatar URL helpers
    middleware.ts     server-side route/role enforcement
```

## Getting Started

### Prerequisites
- Node.js 18+
- A MySQL server

### 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env   # then fill in DATABASE_URL and a real JWT_SECRET
npx prisma migrate deploy
npm run seed            # creates the initial admin user
npm run dev              # starts on http://localhost:5000
```

Default seeded admin login: `admin@urbansecurity.com` / `admin123` — **change this password after first login.**

### 2. Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```bash
# Leave NEXT_PUBLIC_API_URL unset to auto-target the backend on the same host, port 5000.
# NEXT_PUBLIC_API_URL=http://192.168.1.50:5000

# Must match the backend's JWT_SECRET exactly — used by middleware.ts to verify
# the session cookie server-side. Server-only; never exposed to the browser.
JWT_SECRET="<same value as backend/.env>"
```

```bash
npm run dev   # starts on http://localhost:3000
```

## Environment Variables

**`backend/.env`** (see `backend/.env.example`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | Signing secret for auth tokens — use a long random value, rotate before production |
| `PORT` | Backend port (default `5000`) |
| `HOST` | Bind address (default `0.0.0.0`) |
| `NODE_ENV` | `development` / `production` — controls cookie `secure` flag and error verbosity |
| `CORS_ORIGINS` | Comma-separated allowed origins (LAN/localhost origins are always allowed) |
| `COOKIE_DOMAIN` | Optional — set when the frontend and backend run on different subdomains of the same site in production |

**`frontend/.env.local`**

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend URL; auto-detected from the request host if unset |
| `JWT_SECRET` | Must match the backend's secret — used by `middleware.ts` |

## Data Model

Defined in `backend/prisma/schema.prisma`:

- **User** — `ADMIN` or `GUARD`, optionally assigned to a `Site`
- **Site** — name, address, optional GPS coordinates + geofence radius (meters)
- **Shift** — scheduled window, check-in/out timestamps and GPS coordinates, guard handover links
- **Incident** — severity (`LOW`/`MEDIUM`/`HIGH`/`CRITICAL`), status, resolution notes
- **Report** — a guard's daily log entry, tied to a shift

## Security Notes

- Passwords are hashed with `bcryptjs`; there is no plaintext fallback.
- Sessions use an httpOnly cookie (verified by `frontend/src/middleware.ts`) plus a bearer token for API calls.
- Login is rate-limited (10 attempts / 15 min); the API overall is rate-limited (300 req / 15 min per IP).
- Before deploying to production: rotate `JWT_SECRET`, set `NODE_ENV=production`, and confirm `backend/.env` is not committed (it's gitignored).

## Scripts

| | Backend | Frontend |
|---|---|---|
| Dev server | `npm run dev` | `npm run dev` |
| Build | `npm run build` | `npm run build` |
| Start (prod) | `npm start` | `npm start` |
| Seed database | `npm run seed` | — |
| Lint | — | `npm run lint` |
