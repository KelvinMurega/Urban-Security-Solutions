# Operations runbook

The commands below assume the Docker Compose deployment in `/srv/urban-security` (see [DEPLOYMENT.md](DEPLOYMENT.md)).

## Daily health

| Check | How |
|---|---|
| Is it up? | Uptime monitor on `https://<domain>/health`. It returns 503 if the database is unreachable. |
| Errors | Sentry (if `SENTRY_DSN` is set), or `docker compose logs --since 1h backend \| grep '"level":50'` |
| Security events | `docker compose logs backend \| grep '"security":true'`. Watch for `auth.account_locked`, `csrf.blocked`, `access.denied` and `shift.location_flagged`. |
| Flagged check-ins | **Schedule** page: shifts with a **GPS review** badge. Hover the badge for the reason. |

Every response has an `X-Request-Id` header. When a user reports a problem, ask for the time (and the ID if possible), then run `docker compose logs backend | grep <id>`.

## Backups

**Install** (once):

```bash
chmod +x deploy/backup.sh deploy/restore.sh
crontab -e
# 30 2 * * * cd /srv/urban-security && ./deploy/backup.sh >> backups/backup.log 2>&1
```

`backup.sh` writes `backups/db-<time>.sql.gz` (a consistent `mysqldump`), the `uploads-<time>.tar.gz` evidence volume (when storage is `local`) and checksums. It keeps 14 days (`KEEP_DAYS`).

**Copy the backups off the server.** A backup on the same disk is lost with the server. For example, with [rclone](https://rclone.org) to a *separate* R2 or S3 bucket:

```bash
# 0 3 * * * rclone copy /srv/urban-security/backups r2-backups:uss-backups --max-age 48h
```

With `STORAGE_DRIVER=s3`, also enable bucket versioning (or R2 object lifecycle rules) so that deleted or overwritten evidence can be recovered.

**Rehearse a restore** before go-live and every quarter, on a staging server:

```bash
./deploy/restore.sh backups/db-<time>.sql.gz backups/uploads-<time>.tar.gz
```

The script asks you to type `restore`. It then stops the app, loads the dump, restores uploads, runs migrations and starts the app again.

## Deploy and roll back

Deploy:

```bash
git pull && docker compose --profile tls up -d --build
```

Roll back the code:

```bash
git log --oneline -5
git checkout <previous-good-commit>
docker compose --profile tls up -d --build
```

Migrations are forward-only. If a release added a migration, the previous code version must still work with the new schema. Additive migrations, which is all of them so far, are safe. If a migration damaged data, restore the last backup.

## Accounts and access

| Situation | Action |
|---|---|
| Guard leaves | **Personnel** → set the guard to Inactive. Their sessions end immediately and they can no longer sign in. |
| Lost or stolen phone | Set the guard to Inactive, or reset their password. Either revokes all of their sessions. |
| Locked out after 5 wrong passwords | Wait 15 minutes, or have an admin reset the password. A reset also clears the lock. |
| Admin forgot password, or is locked out | Run `docker compose run --rm -e RESET_EMAIL=ops@… -e NEW_PASSWORD='…' migrate npx ts-node scripts/reset-password.ts` on the server, then `history -c`. This clears the lockout, signs out all sessions and writes an audit entry. |
| New client | **Clients** → create the account with a temporary password, assign their sites, and share the password over a separate channel. |
| Suspected compromise | Rotate `JWT_SECRET` in `.env`, then run `docker compose up -d`. This signs everyone out. Then review the **Audit Log** and the security events. |

## Secret rotation

| Secret | Procedure |
|---|---|
| `JWT_SECRET` | Edit `.env`, then run `docker compose up -d backend frontend`. Everyone signs in again. |
| `MYSQL_PASSWORD` | Run `ALTER USER 'uss_app'@'%' IDENTIFIED BY '…';` as root, update `.env`, then run `docker compose up -d`. |
| S3/R2 keys | Create the new key, update `.env`, run `docker compose up -d backend`, then revoke the old key. |

## Data protection (Kenya DPA 2019)

- Run the retention job monthly. Check the dry run first, then apply:

  ```bash
  docker compose run --rm migrate npx ts-node scripts/retention.ts
  docker compose run --rm migrate npx ts-node scripts/retention.ts --apply
  ```

  The job removes precise check-in location and device data older than `GPS_RETENTION_DAYS` (default 365). Shift times and hours are kept.
- **Subject access request:** export the person's user record, shifts, incidents and reports from the database, plus their audit entries (`/api/audit-logs?actorId=<id>`).
- **Breach:** notify the ODPC within 72 hours of becoming aware of it (DPA s.43). Preserve the logs and the audit trail.
