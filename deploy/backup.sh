#!/usr/bin/env bash
# Nightly backup for the docker-compose deployment: database dump + evidence uploads.
#
#   ./deploy/backup.sh                 # writes to ./backups (override with BACKUP_DIR)
#   crontab: 30 2 * * * cd /srv/urban-security && ./deploy/backup.sh >> backups/backup.log 2>&1
#
# Copy the backup directory OFF the server (e.g. rclone to object storage) — a backup on the
# same disk does not survive losing the server. Test a restore with deploy/restore.sh.
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
COMPOSE=(docker compose --project-directory "$PROJECT_DIR")

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
umask 077

echo "[$STAMP] dumping database"
"${COMPOSE[@]}" exec -T db sh -c \
  'exec mysqldump --single-transaction --routines --triggers --no-tablespaces -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
  | gzip -9 > "$BACKUP_DIR/db-$STAMP.sql.gz"

echo "[$STAMP] archiving uploads volume"
if ! "${COMPOSE[@]}" run --rm --no-deps -T --entrypoint tar backend -C /app -czf - uploads \
  > "$BACKUP_DIR/uploads-$STAMP.tar.gz"; then
  rm -f "$BACKUP_DIR/uploads-$STAMP.tar.gz"   # never keep a truncated archive
  echo "WARNING: uploads archive failed (expected only with STORAGE_DRIVER=s3)" >&2
fi

# Integrity check: a truncated dump is worse than none.
gzip -t "$BACKUP_DIR/db-$STAMP.sql.gz"
sha256sum "$BACKUP_DIR"/*-"$STAMP".* > "$BACKUP_DIR/SHA256SUMS-$STAMP"

find "$BACKUP_DIR" -type f \( -name 'db-*.sql.gz' -o -name 'uploads-*.tar.gz' -o -name 'SHA256SUMS-*' \) -mtime +"$KEEP_DAYS" -delete
echo "[$STAMP] done: $(ls -1 "$BACKUP_DIR" | grep -c "$STAMP") files"
