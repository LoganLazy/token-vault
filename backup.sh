#!/usr/bin/env bash

set -Eeuo pipefail

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.production.yml"
DATA_FILE="backend/data/totp.db"
BACKUP_DIR="backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/token-vault-$TIMESTAMP.db.gz"
backend_was_running=false

[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE." >&2; exit 1; }
export PUID="${PUID:-$(id -u)}"
export PGID="${PGID:-$(id -g)}"
mkdir -p "$BACKUP_DIR"

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

restart_backend() {
  if [ "$backend_was_running" = true ]; then
    compose start backend >/dev/null
  fi
}
trap restart_backend EXIT

if compose ps --status running --services | grep -qx backend; then
  backend_was_running=true
  echo "Stopping backend to create a consistent SQLite snapshot..."
  compose stop backend >/dev/null
fi

[ -s "$DATA_FILE" ] || { echo "Database file not found: $DATA_FILE" >&2; exit 1; }
gzip -c "$DATA_FILE" > "$BACKUP_FILE"

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$BACKUP_FILE" > "$BACKUP_FILE.sha256"
fi

echo "Backup created: $BACKUP_FILE"
echo "Keep DATA_ENCRYPTION_KEY in a separate secret store. The database cannot be restored without the same key."

# Keep successful database backups for 30 days. Checksum sidecars are removed with them.
find "$BACKUP_DIR" -type f \( -name 'token-vault-*.db.gz' -o -name 'token-vault-*.db.gz.sha256' \) -mtime +30 -delete
