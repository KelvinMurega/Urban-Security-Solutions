# Deployment guide

The recommended production setup is **one Linux server running the Docker Compose stack**: MySQL, the API, the web app and Caddy for automatic HTTPS. It's cheap (about $12–24/month for a 2 GB VPS), simple, and keeps the browser on a single domain, which keeps the session cookie, CSP and CORS straightforward.

```
browser ──HTTPS──► Caddy ─┬─ /api, /uploads ──► backend (Express) ──► MySQL
                          └─ everything else ──► frontend (Next.js)
```

Only Caddy's ports 80 and 443 are exposed. The API and the database are reachable only on the private Docker network.

## 1. Prerequisites

- An Ubuntu 22.04 or 24.04 server (DigitalOcean, Hetzner, AWS Lightsail, …) with Docker Engine and the Compose plugin.
- A domain, e.g. `app.urbansecurity.co.ke`, with an **A record pointing to the server**.
- A firewall that allows only 22 (SSH, ideally restricted to your IP), 80 and 443.
- Recommended: a private **Cloudflare R2** or **S3** bucket for evidence photos, and a **Sentry** project for error tracking.

## 2. Configure

```bash
git clone https://github.com/KelvinMurega/Urban-Security-Solutions.git /srv/urban-security
cd /srv/urban-security
cp .env.production.example .env
chmod 600 .env
nano .env
```

Fill in **every** value. Generate each secret separately:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
# or: openssl rand -base64 48
```

| Setting | Value |
|---|---|
| `APP_ORIGIN` | `https://app.urbansecurity.co.ke` (exact, no trailing slash) |
| `APP_DOMAIN` | `app.urbansecurity.co.ke` |
| `JWT_SECRET`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` | separate random values |
| `TRUST_PROXY` | `1` (Caddy is the single trusted proxy) |
| `STORAGE_DRIVER` | `s3` (recommended) with the `S3_*` values, or `local` |
| `SENTRY_DSN` | from your Sentry project (optional) |

For **Cloudflare R2**: create a bucket (keep it private, with no public access), create an API token with *Object Read & Write* on that bucket only, then set:

```
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
```

## 3. Launch

```bash
docker compose --profile tls up -d --build
docker compose ps           # every service healthy; migrate "exited (0)"
```

The `migrate` service runs `prisma migrate deploy` before the API starts, on every deploy.

## 4. Create the first admin

There are no default credentials. Create the admin once:

```bash
docker compose run --rm \
  -e ADMIN_EMAIL=ops@urbansecurity.co.ke \
  -e ADMIN_PASSWORD='a long unique passphrase' \
  -e ADMIN_NAME='Operations Admin' \
  migrate npx ts-node prisma/seed.ts
history -c   # don't leave the password in shell history
```

## 5. Verify

- [ ] `https://<domain>/privacy` loads with a valid certificate, and `http://` redirects to `https://`.
- [ ] Signing in works, and DevTools shows the `token` cookie as `HttpOnly; Secure; SameSite=Lax`.
- [ ] `curl https://<domain>/health` returns `{"status":"OK"}`.
- [ ] A guard can check in on site, from a phone, with location permission granted.
- [ ] Entries appear under **Audit Log**.
- [ ] An uptime monitor (UptimeRobot, Better Stack) is watching `https://<domain>/health`.
- [ ] The nightly backup cron is installed (see [RUNBOOK.md](RUNBOOK.md)), and one restore has been rehearsed.

## 6. Updating

```bash
cd /srv/urban-security
git pull
docker compose --profile tls up -d --build   # rebuilds, migrates, restarts
docker image prune -f
```

Every change to `main` has passed CI, which runs typecheck, migrations on fresh MySQL, a schema drift check, tests, builds and a dependency audit.

---

## Alternative: managed platforms

The same images run on Render, Railway or Fly.io with a managed MySQL. Two rules decide whether sessions work:

1. **The browser must reach the API on the same site as the app.** Either:
   - **Proxy:** build the frontend with `NEXT_PUBLIC_API_URL=same-origin` and `API_PROXY_TARGET=<private API URL>`. Then set `TRUST_PROXY=0` on the API, because the Next.js proxy does not forward client IPs safely. Rate limits will then apply per platform proxy rather than per user.
   - **Subdomains:** host the app at `app.example.com` and the API at `api.example.com`. Build the frontend with `NEXT_PUBLIC_API_URL=https://api.example.com`, set `COOKIE_DOMAIN=.example.com` and `CORS_ORIGINS=https://app.example.com` on the API, and set `TRUST_PROXY` to the platform's documented hop count.
   - Do **not** use two unrelated platform domains (e.g. `*.vercel.app` plus `*.onrender.com`): the session cookie would never reach the app's route guard.
2. **Run `npx prisma migrate deploy` as the release command** before the new API version starts.

Set `JWT_SECRET` to the same value on both services; the frontend uses it only to verify the cookie in its route guard.
