#!/usr/bin/env sh
set -eu

# Postgres logical backup + gzip + 7-day retention. Run on the host (cron) or manually.
# Set CAIRNLY_BACKUP_DIR to override output directory (default: repo ./backups).

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
COMPOSE_FILE="$ROOT_DIR/docker/docker-compose.yml"
BACKUP_DIR="${CAIRNLY_BACKUP_DIR:-$ROOT_DIR/backups}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing .env at $ENV_FILE" >&2
  exit 1
fi

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v podman >/dev/null 2>&1 && podman compose version >/dev/null 2>&1; then
  COMPOSE="podman compose"
else
  echo "Need Docker Compose or Podman Compose." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +"%Y-%m-%dT%H-%M-%SZ")"
OUT="$BACKUP_DIR/pg-$STAMP.sql.gz"

$COMPOSE --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --format=p' |
  gzip >"$OUT"

find "$BACKUP_DIR" -name 'pg-*.sql.gz' -mtime +7 -delete

echo "Wrote $OUT (removed backups older than 7 days in $BACKUP_DIR)"
