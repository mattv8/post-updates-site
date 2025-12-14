#!/bin/bash
# Cache Purge Script
# Clears the nginx FastCGI cache
# Can be called from admin panel or manually

set -e

CACHE_DIR="/var/cache/nginx/fastcgi"

echo "==> Purging FastCGI cache..."

if [ -d "$CACHE_DIR" ]; then
    # Clear all cached files
    rm -rf "${CACHE_DIR:?}"/*
    echo "==> Cache purged successfully"
else
    echo "==> Cache directory does not exist, creating it..."
    mkdir -p "$CACHE_DIR"
    chown -R www-data:www-data "$CACHE_DIR"
    chmod -R 755 "$CACHE_DIR"
    echo "==> Cache directory created"
fi

# Return success
exit 0
