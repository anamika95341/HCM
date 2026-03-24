#!/usr/bin/env bash
set -euo pipefail

DEPLOY_ROOT="${1:-$(pwd)}"

cd "${DEPLOY_ROOT}"

test -f backend/.env || { echo "Missing ${DEPLOY_ROOT}/backend/.env"; exit 1; }

docker compose --env-file backend/.env -f compose.yml up -d --build --remove-orphans
docker compose --env-file backend/.env -f compose.yml exec -T backend npm run migrate
docker compose --env-file backend/.env -f compose.yml ps
