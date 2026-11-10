#!/usr/bin/env bash
# Restore a backup produced by deploy/backup.sh.  DESTRUCTIVE: replaces the current database.
#
#   ./deploy/restore.sh backups/db-20261110T023000Z.sql.gz [backups/uploads-20261110T023000Z.tar.gz]
#
# Rehearse this on a staging server before you need it for real.
set -euo pipefail

DB_DUMP="${1:?usage: restore.sh <db-dump.sql.gz> [uploads.tar.gz]}"
UPLOADS="${2:-}"
PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
COMPOSE=(docker compose --project-directory "$PROJECT_DIR")

gzip -t "$DB_DUMP"
read -r -p "This will OVERWRITE the database with $DB_DUMP. Type 'restore' to continue: " answer
[ "$answer" = "restore" ] || { echo "aborted"; exit 1; }

"${COMPOSE[@]}" stop backend frontend
gunzip -c "$DB_DUMP" | "${COMPOSE[@]}" exec -T db sh -c 'exec mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'

if [ -n "$UPLOADS" ]; then
  "${COMPOSE[@]}" run --rm --no-deps -T --entrypoint sh backend -c 'rm -rf /app/uploads/* && tar -C /app -xzf -' < "$UPLOADS"
fi

# Bring the schema forward in case the dump predates newer migrations.
"${COMPOSE[@]}" run --rm migrate
"${COMPOSE[@]}" up -d backend frontend
echo "restore complete"
