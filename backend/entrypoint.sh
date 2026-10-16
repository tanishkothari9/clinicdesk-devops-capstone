#!/bin/sh
# Apply migrations (retrying while Postgres starts up), then serve the API.
set -eu

attempt=1
until alembic upgrade head; do
  if [ "$attempt" -ge "${MIGRATION_MAX_ATTEMPTS:-30}" ]; then
    echo "Database still unreachable after $attempt attempts, giving up" >&2
    exit 1
  fi
  echo "Migration attempt $attempt failed, retrying in 2s..." >&2
  attempt=$((attempt + 1))
  sleep 2
done

exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'
