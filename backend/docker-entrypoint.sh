#!/bin/sh
set -eu

if [ "${NODE_ENV:-}" = "development" ]; then
  if [ ! -d node_modules ] || ! cmp -s package-lock.json node_modules/.package-lock.json 2>/dev/null; then
    echo "Installing backend dependencies for development..."
    npm install
    cp package-lock.json node_modules/.package-lock.json
  fi
fi

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "Running database migrations..."
  node db/postgres/seeds/seed.js migrate
fi

exec "$@"
