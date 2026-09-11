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

jwt_secret="${JWT_SECRET:-}"
[[ "$jwt_secret" != *"change-in-production"* && ${#jwt_secret} -ge 32 ]] \
  || fail "JWT_SECRET must be a unique value of at least 32 characters."
[[ "${DATA_ENCRYPTION_KEY:-}" =~ ^[[:xdigit:]]{64}$ ]] \
  || fail "DATA_ENCRYPTION_KEY must contain exactly 64 hexadecimal characters."
[[ "${CORS_ORIGIN:-}" == https://* ]] \
  || fail "CORS_ORIGIN must use HTTPS in production."

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

health_url="http://127.0.0.1:${HTTP_PORT:-80}/health"
echo "Waiting for $health_url ..."
for attempt in $(seq 1 60); do
  if curl --fail --silent --show-error "$health_url" >/dev/null 2>&1; then
    echo "Token Vault is healthy."
    compose ps
    echo "Open the HTTPS URL configured by your reverse proxy."
    exit 0
  fi
  if [ "$attempt" -eq 60 ]; then
    compose logs --tail=100 backend frontend
    fail "Health check did not pass within 120 seconds."
  fi
  sleep 2
done
