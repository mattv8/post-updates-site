#!/bin/bash
set -euo pipefail

INTERVAL=${DEMO_RESET_INTERVAL_SECONDS:-43200}
SCRIPT_PATH=/var/www/html/lib/demo_seed.php

if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Demo seed script not found at $SCRIPT_PATH" >&2
    exit 1
fi

while true; do
    echo "[demo-reset] Running demo seed at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    php "$SCRIPT_PATH" --force || echo "[demo-reset] Seed failed; will retry at next interval" >&2
    hours=$(awk "BEGIN { printf \"%.1f\", ${INTERVAL}/3600 }")
    echo "[demo-reset] Sleeping for ${INTERVAL}s (~${hours}h) before next refresh"
    sleep "$INTERVAL"
done
