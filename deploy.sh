#!/usr/bin/env bash

set -Eeuo pipefail

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.production.yml"

fail() {
  echo "Error: $*" >&2
  exit 1
}

[ -f "$ENV_FILE" ] || fail "Missing $ENV_FILE. Copy .env.production.example and configure it first."

set -a
# shellcheck disable=SC1090
. "./$ENV_FILE"
set +a

export PUID="${PUID:-$(id -u)}"
export PGID="${PGID:-$(id -g)}"
mkdir -p backend/data

# --- Validation (v1.5.0) ---
domain="${DOMAIN:-}"
[[ -n "$domain" && "$domain" != *://* && "$domain" != "localhost" && "$domain" != *"/"* ]] \
  || fail "DOMAIN must be a real domain name, e.g. vault.example.com (DNS must point at this server)."
[[ "${CORS_ORIGIN:-}" == "https://$domain" ]] \
  || fail "CORS_ORIGIN must be https://$domain."
jwt_secret="${JWT_SECRET:-}"
[[ "$jwt_secret" != *"change-in-production"* && ${#jwt_secret} -ge 32 ]] \
  || fail "JWT_SECRET must be a unique value of at least 32 characters."
if [[ "${REGISTRATION_ENABLED:-false}" != "true" && -z "${REGISTRATION_INVITE_CODE:-}" ]]; then
  echo "Warning: registration is closed and no REGISTRATION_INVITE_CODE is set — nobody will be able to register." >&2
fi

command -v docker >/dev/null 2>&1 || fail "Docker is not installed."
docker info >/dev/null 2>&1 || fail "Docker is not running."

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

echo "Validating production configuration..."
compose config --quiet

echo "Building images..."
compose build

echo "Starting services..."
compose up -d --remove-orphans

# Health is checked inside the containers: only Caddy is exposed (80/443),
# and a request to 127.0.0.1 would not match the Caddy site for $DOMAIN.
echo "Waiting for backend and frontend health checks..."
for attempt in $(seq 1 60); do
  if compose exec -T backend wget --quiet --tries=1 --spider http://localhost:3000/health 2>/dev/null \
    && compose exec -T frontend wget --quiet --tries=1 --spider http://localhost/ 2>/dev/null; then
    echo "Token Vault is healthy."
    compose ps
    echo "Open https://$domain/health (expect OK) once DNS points at this server."
    echo "First user: register with your invite code, then set a master password in Settings before syncing."
    exit 0
  fi
  if [ "$attempt" -eq 60 ]; then
    compose logs --tail=100 backend frontend caddy
    fail "Health check did not pass within 120 seconds."
  fi
  sleep 2
done
