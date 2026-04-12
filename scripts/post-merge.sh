#!/bin/bash
set -e
npm install

# Run drizzle-kit push with stdin closed to avoid interactive prompts
# If it fails due to interactive prompt, that's OK - schema changes
# that require confirmation should be applied manually
npx drizzle-kit push < /dev/null 2>&1 || echo "drizzle-kit push requires manual intervention, skipping"

# Run SQL migration files that drizzle-kit push may have missed
# These are idempotent (use IF NOT EXISTS / ON CONFLICT DO NOTHING)
if [ -d "migrations" ]; then
  for f in migrations/*.sql; do
    if [ -f "$f" ]; then
      echo "Running migration: $f"
      psql "$DATABASE_URL" -f "$f" 2>&1 || echo "Migration $f failed (may already be applied), continuing"
    fi
  done
fi
