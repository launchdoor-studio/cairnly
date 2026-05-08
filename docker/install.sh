#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
COMPOSE_FILE="$ROOT_DIR/docker/docker-compose.yml"

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v podman >/dev/null 2>&1 && podman compose version >/dev/null 2>&1; then
  COMPOSE="podman compose"
else
  echo "Cairnly needs Docker Compose or Podman Compose." >&2
  exit 1
fi

if [ "${1:-}" = "upgrade" ]; then
  if [ ! -f "$ENV_FILE" ]; then
    echo "Missing .env — run ./docker/install.sh once first." >&2
    exit 1
  fi
  $COMPOSE --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build
  echo
  echo "Upgrade complete."
  exit 0
fi

secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 24
  else
    date | shasum | awk '{print $1}'
  fi
}

if [ ! -f "$ENV_FILE" ]; then
  POSTGRES_PASSWORD="$(secret)"
  cat > "$ENV_FILE" <<EOF
CAIRNLY_DOMAIN=localhost
CAIRNLY_TELEMETRY_ENABLED=false

POSTGRES_DB=cairnly
POSTGRES_USER=cairnly
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DATABASE_URL=postgres://cairnly:$POSTGRES_PASSWORD@postgres:5432/cairnly

NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
EOF
  echo "Created .env with generated database credentials."
fi

$COMPOSE --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

echo
echo "Cairnly is starting."
echo "URL: http://localhost"
echo "Health: http://localhost/healthz"
echo
echo "Admin CLI (from repo root, with DATABASE_URL or host networking to Postgres):"
echo "  pnpm run crm -- migrate"
echo "  pnpm run crm -- backup"
echo "  pnpm run crm -- health"
echo
echo "Daily Postgres backup (host cron, 7-day retention) — example:"
echo "  0 3 * * * CAIRNLY_BACKUP_DIR=$ROOT_DIR/backups $ROOT_DIR/docker/backup-cairnly.sh"
