#!/usr/bin/env bash

set -Eeuo pipefail

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.production.yml"

if [ ! -f "$ENV_FILE" ]; then
  cp .env.production.example "$ENV_FILE"
  echo "Created $ENV_FILE. Set JWT_SECRET, DATA_ENCRYPTION_KEY and CORS_ORIGIN before starting."
  exit 1
fi

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
echo "Health: http://127.0.0.1:${HTTP_PORT:-80}/health"
