#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "Running database migrations..."
  node db/postgres/seeds/seed.js migrate
fi

exec "$@"
