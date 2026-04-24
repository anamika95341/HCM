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
docker compose --env-file .env -f compose.yml -f compose.prod.yml up -d --build --remove-orphans
docker compose --env-file .env -f compose.yml -f compose.prod.yml ps
