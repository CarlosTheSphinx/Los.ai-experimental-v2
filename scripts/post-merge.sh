#!/bin/bash
set -e
npm install

# Run drizzle-kit push with stdin closed to avoid interactive prompts
# If it fails due to interactive prompt, that's OK - schema changes
# that require confirmation should be applied manually
npx drizzle-kit push < /dev/null 2>&1 || echo "drizzle-kit push requires manual intervention, skipping"
