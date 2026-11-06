#!/usr/bin/env bash

set -Eeuo pipefail

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.production.yml"
DATA_FILE="backend/data/totp.db"
BACKUP_DIR="backups"
TEMP_FILE="backend/data/.totp-restore-$$.db"
backend_stopped=false

usage() {
  echo "Usage: ./restore.sh <backup.db.gz|backup.db>" >&2
  exit 1
}

[ $# -eq 1 ] || usage
SOURCE_FILE="$1"
[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE." >&2; exit 1; }
[ -s "$SOURCE_FILE" ] || { echo "Backup file not found or empty: $SOURCE_FILE" >&2; exit 1; }
export PUID="${PUID:-$(id -u)}"
export PGID="${PGID:-$(id -g)}"

echo "This will replace the current server database."
echo "Note (v1.5.0): secrets in this backup are end-to-end encrypted with each user's master password. Restoring the database does not restore a forgotten master password."
read -r -p "Type RESTORE to continue: " confirmation
[ "$confirmation" = "RESTORE" ] || { echo "Restore cancelled."; exit 1; }

mkdir -p "$(dirname "$DATA_FILE")" "$BACKUP_DIR"
cleanup() {
  rm -f "$TEMP_FILE"
  if [ "$backend_stopped" = true ]; then
    compose start backend >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

case "$SOURCE_FILE" in
  *.gz) gzip -dc "$SOURCE_FILE" > "$TEMP_FILE" ;;
  *) cp "$SOURCE_FILE" "$TEMP_FILE" ;;
esac

[ "$(LC_ALL=C head -c 15 "$TEMP_FILE")" = "SQLite format 3" ] \
  || { echo "Backup is not a valid SQLite database." >&2; exit 1; }

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

echo "Stopping backend..."
compose stop backend >/dev/null
backend_stopped=true

if [ -s "$DATA_FILE" ]; then
  rollback_file="$BACKUP_DIR/pre-restore-$(date +%Y%m%d_%H%M%S).db.gz"
  gzip -c "$DATA_FILE" > "$rollback_file"
  echo "Current database saved as $rollback_file"
fi

mv -f "$TEMP_FILE" "$DATA_FILE"
chmod 600 "$DATA_FILE" 2>/dev/null || true

echo "Starting backend and validating the restored database..."
compose start backend >/dev/null
backend_stopped=false
for attempt in $(seq 1 30); do
  if compose exec -T backend wget --quiet --tries=1 --spider http://localhost:3000/health >/dev/null 2>&1; then
    echo "Restore completed successfully."
    exit 0
  fi
  if [ "$attempt" -eq 30 ]; then
    compose logs --tail=100 backend
    echo "Restore finished, but the service is unhealthy. Check the backend logs and file permissions." >&2
    exit 1
  fi
  sleep 2
done
