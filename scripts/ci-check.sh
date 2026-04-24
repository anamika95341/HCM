#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

pushd "${ROOT_DIR}/backend" >/dev/null
npm ci
npm test -- --runInBand
popd >/dev/null

pushd "${ROOT_DIR}/Frontend" >/dev/null
npm ci
npm run build
popd >/dev/null

pushd "${ROOT_DIR}" >/dev/null
docker compose --env-file .env.example -f compose.yml config >/dev/null
docker compose --env-file .env.example -f compose.yml -f compose.dev.yml config >/dev/null
docker compose --env-file .env.example -f compose.yml -f compose.prod.yml config >/dev/null
docker build -f backend/Dockerfile --target dev backend >/dev/null
docker build -f backend/Dockerfile --target runner backend >/dev/null
docker build -f Frontend/Dockerfile --target prod Frontend >/dev/null
popd >/dev/null
