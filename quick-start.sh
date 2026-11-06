#!/usr/bin/env bash

set -Eeuo pipefail

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.production.yml"

if [ ! -f "$ENV_FILE" ]; then
  cp .env.production.example "$ENV_FILE"
  echo "Created $ENV_FILE. Set DOMAIN, JWT_SECRET and CORS_ORIGIN before starting."
  exit 1
fi

# Validate the same required values as deploy.sh (fast fail, no partial start).
set -a
# shellcheck disable=SC1090
. "./$ENV_FILE"
set +a
domain="${DOMAIN:-}"
[[ -n "$domain" && "$domain" != *://* && "$domain" != "localhost" ]] \
  || { echo "Error: DOMAIN must be a real domain name, e.g. vault.example.com." >&2; exit 1; }
[[ "${CORS_ORIGIN:-}" == "https://$domain" ]] \
  || { echo "Error: CORS_ORIGIN must be https://$domain." >&2; exit 1; }
jwt_secret="${JWT_SECRET:-}"
[[ "$jwt_secret" != *"change-in-production"* && ${#jwt_secret} -ge 32 ]] \
  || { echo "Error: JWT_SECRET must be a unique value of at least 32 characters." >&2; exit 1; }

command -v docker >/dev/null 2>&1 || { echo "Docker is not installed." >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "Docker is not running." >&2; exit 1; }

export PUID="${PUID:-$(id -u)}"
export PGID="${PGID:-$(id -g)}"
mkdir -p backend/data

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build --remove-orphans

echo "Services are starting."
echo "Status: docker compose --env-file $ENV_FILE -f $COMPOSE_FILE ps"
echo "Logs:   docker compose --env-file $ENV_FILE -f $COMPOSE_FILE logs -f"
echo "Health: https://$domain/health (once DNS points at this server)"
