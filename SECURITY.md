# Security

## Reporting a vulnerability

Please report security issues privately to **[security contact email]**. Do not open a public issue. We aim to acknowledge reports within 3 working days.

## Security model

The platform holds staff personal data, guard locations, incident evidence and client billing, so it is built to be **secure by default** (the safe behaviour needs no configuration) and **secure by design** (unsafe states are not representable).

### Secure by default
- **Fails closed on bad configuration.** The API refuses to start with a weak or placeholder `JWT_SECRET`, or in production without `CORS_ORIGINS`. An unset `NODE_ENV` means production.
- **No default credentials.** The first admin comes from `ADMIN_EMAIL` / `ADMIN_PASSWORD` via the seed script, which never overwrites an existing admin.
- **Public registration is off** (`ENABLE_SETUP_REGISTRATION=false`).
- **Deny by default:** every API route group requires a session plus an explicit role allow-list. Uploaded files are never served statically.
- **Never trusts forwarded headers** unless `TRUST_PROXY` says a known proxy is in front, so client IPs cannot be spoofed.

### Authentication and sessions
- The session is an httpOnly, `SameSite=Lax` cookie (`Secure` in production). The token is never exposed to JavaScript or returned in a response body.
- Tokens are HS256 with the issuer and audience pinned. On **every request** the API re-checks the account in the database: deactivation, role or email change, password change and logout revoke all sessions immediately (`tokenVersion`).
- **Login:** a generic error and constant work for unknown emails (no account enumeration). Accounts lock for 15 minutes after 5 failed attempts. Login is also rate-limited per IP.
- **Passwords:** at least 10 characters (bcrypt's 72-byte limit enforced), bcrypt cost 12. Changing your own password requires the current one.

### Request handling
- **CSRF:** state-changing cookie requests must carry an allowed `Origin` or `Referer`.
- **CORS:** only configured origins are allowed. Localhost/LAN origins work in development only.
- **Validation:** zod schemas with length limits on every input. JSON bodies are limited to 100 KB, except 12 MB on the photo endpoints.
- **Errors:** generic messages only. Database and stack details never reach clients, and the requested path is not echoed back.
- **Headers:**
  - API: helmet with a `default-src 'none'` CSP, HSTS in production, `no-referrer`.
  - Web app: CSP, `X-Frame-Options: DENY`, and a Permissions-Policy allowing only geolocation and camera.

### Evidence and data
- **Uploads:**
  - Photos are verified by their bytes (PNG/JPEG/WEBP magic numbers) and stored under unguessable names.
  - The storage is private (local volume, or a private S3/R2 bucket).
  - Files are served only after checking the requester against the owning incident or report: admin, the reporting guard, or a client assigned to that site.
- **GPS spoofing:** check-in coordinates are never trusted blindly. Accuracy, IP and user agent are recorded, and anomalies are flagged for review.
- **Audit:** an append-only audit log covers admin changes, logins, password changes and check-ins. The API has no endpoint to modify or delete entries.
- **Logging:** pino redacts authorization headers, cookies, passwords, tokens and photo payloads.
- **Retention:** `npm run retention` removes precise location and device data after `GPS_RETENTION_DAYS`.

## Operational requirements (not enforceable in code)
- Serve only over HTTPS (Caddy profile or a TLS-terminating load balancer).
- Keep `JWT_SECRET`, database and storage credentials in a secret manager. Rotating `JWT_SECRET` signs everyone out.
- Use a dedicated database user, never root, for the application.
- Run backups nightly, copy them off the server, and rehearse a restore. See [docs/RUNBOOK.md](docs/RUNBOOK.md).
- Review Dependabot PRs weekly. CI fails on high-severity advisories in production dependencies.
- Register with the ODPC and publish the privacy notice (`/privacy`) once reviewed by counsel.
