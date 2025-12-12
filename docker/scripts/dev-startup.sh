#!/bin/bash
# Development Startup Script
# Ensures clean state before starting Docker stack
# This script is idempotent - safe to run multiple times

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SRC_DIR="${PROJECT_ROOT}/src"
DOCKER_SCRIPTS_DIR="${SCRIPT_DIR}"

echo "==> Development startup script"
echo "    Project root: ${PROJECT_ROOT}"

# 0. Fix line endings (WSL/Windows compatibility)
echo "==> Fixing line endings for WSL compatibility..."
if command -v dos2unix &> /dev/null; then
    # Fix .env file
    if [ -f "${PROJECT_ROOT}/.env" ]; then
        dos2unix "${PROJECT_ROOT}/.env" 2>/dev/null || true
    fi
    # Fix all shell scripts in docker/scripts
    for script in "${DOCKER_SCRIPTS_DIR}"/*.sh; do
        if [ -f "$script" ]; then
            dos2unix "$script" 2>/dev/null || true
        fi
    done
else
    # Fallback: use sed if dos2unix not available
    if [ -f "${PROJECT_ROOT}/.env" ]; then
        sed -i 's/\r$//' "${PROJECT_ROOT}/.env" 2>/dev/null || true
    fi
    for script in "${DOCKER_SCRIPTS_DIR}"/*.sh; do
        if [ -f "$script" ]; then
            sed -i 's/\r$//' "$script" 2>/dev/null || true
        fi
    done
fi

# 1. Check for .env file
if [ ! -f "${PROJECT_ROOT}/.env" ]; then
    echo "Error: .env file not found. Copy .env.example to .env and configure it."
    exit 1
fi

# 2. Create .env symlink in docker directory if needed
if [ ! -L "${PROJECT_ROOT}/docker/.env" ]; then
    ln -sf "${PROJECT_ROOT}/.env" "${PROJECT_ROOT}/docker/.env"
    echo "==> Created .env symlink in docker directory"
fi

# 3. Ensure cache directories exist with proper permissions
echo "==> Ensuring cache directories exist..."
mkdir -p "${SRC_DIR}/cache" "${SRC_DIR}/templates_c"

# Fix ownership if directories are owned by www-data (from previous container runs)
if [ -d "${SRC_DIR}/cache" ] && [ "$(stat -c '%U' "${SRC_DIR}/cache")" = "www-data" ]; then
    echo "    Fixing cache directory ownership (was owned by www-data)..."
    sudo chown -R "$(whoami):$(id -gn)" "${SRC_DIR}/cache" 2>/dev/null || true
fi
if [ -d "${SRC_DIR}/templates_c" ] && [ "$(stat -c '%U' "${SRC_DIR}/templates_c")" = "www-data" ]; then
    echo "    Fixing templates_c directory ownership (was owned by www-data)..."
    sudo chown -R "$(whoami):$(id -gn)" "${SRC_DIR}/templates_c" 2>/dev/null || true
fi

# Set permissions so container www-data can write (world-writable for mounted volumes)
chmod 777 "${SRC_DIR}/cache" "${SRC_DIR}/templates_c"
echo "    Created and configured: ${SRC_DIR}/cache"
echo "    Created and configured: ${SRC_DIR}/templates_c"

# 5. Install composer dependencies if vendor is missing
if [ ! -d "${SRC_DIR}/vendor" ]; then
    echo "==> Installing composer dependencies..."
    if command -v composer &> /dev/null; then
        cd "${SRC_DIR}" && composer install --no-interaction
    else
        echo "    Composer not found locally, will install in container after startup"
    fi
fi

echo "==> Development environment ready"
