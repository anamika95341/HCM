#!/usr/bin/env bash
set -euo pipefail

DEPLOY_ROOT="${1:-$(pwd)}"
cd "${DEPLOY_ROOT}"

if [[ ! -f .env ]]; then
  echo "Missing ${DEPLOY_ROOT}/.env"
  echo "Create it from .env.example on the EC2 host and fill production values before deploying."
  exit 1
fi

if grep -v '^\s*#' .env | grep -q 'PASTE_'; then
  echo "Refusing to deploy: ${DEPLOY_ROOT}/.env still contains PASTE_ placeholders."
  exit 1
fi

docker compose --env-file .env -f compose.yml -f compose.prod.yml config >/dev/null

echo "[deploy] Building and starting all containers..."
docker compose --env-file .env -f compose.yml -f compose.prod.yml up -d --build --remove-orphans

echo "[deploy] Waiting for nginx to become healthy (up to 120s)..."
TIMEOUT=120
ELAPSED=0
until docker inspect hcm-nginx-1 --format '{{.State.Status}}' 2>/dev/null | grep -q '^running$'; do
  if [[ $ELAPSED -ge $TIMEOUT ]]; then
    echo "[deploy] ERROR: nginx container did not reach running state within ${TIMEOUT}s."
    echo "[deploy] === Container status ==="
    docker compose --env-file .env -f compose.yml -f compose.prod.yml ps
    echo "[deploy] === nginx logs ==="
    docker logs hcm-nginx-1 2>&1 || true
    echo "[deploy] === backend logs (last 30 lines) ==="
    docker logs hcm-backend-1 2>&1 | tail -30 || true
    echo "[deploy] === frontend logs (last 20 lines) ==="
    docker logs hcm-frontend-1 2>&1 | tail -20 || true
    exit 1
  fi
  sleep 5
  ELAPSED=$((ELAPSED + 5))
  echo "[deploy] ...waiting (${ELAPSED}s elapsed)"
done

echo "[deploy] nginx is running. Verifying HTTP health endpoint..."
HTTP_PORT=$(grep '^HTTP_PORT=' .env | cut -d= -f2 | tr -d '[:space:]')
HTTP_PORT="${HTTP_PORT:-80}"

HEALTH_RETRIES=0
until curl -sf "http://127.0.0.1:${HTTP_PORT}/health" >/dev/null 2>&1; do
  if [[ $HEALTH_RETRIES -ge 6 ]]; then
    echo "[deploy] ERROR: /health endpoint not responding on port ${HTTP_PORT} after 30s."
    docker logs hcm-nginx-1 2>&1 | tail -20 || true
    exit 1
  fi
  sleep 5
  HEALTH_RETRIES=$((HEALTH_RETRIES + 1))
  echo "[deploy] ...waiting for /health (attempt ${HEALTH_RETRIES}/6)"
done

echo "[deploy] ✅ Deployment successful — site is live on port ${HTTP_PORT}."
docker compose --env-file .env -f compose.yml -f compose.prod.yml ps
