#!/bin/bash
# Development Startup Script
# Ensures clean state before starting Docker stack
# This script is idempotent - safe to run multiple times

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SRC_DIR="${PROJECT_ROOT}/src"

echo "==> Development startup script"
echo "    Project root: ${PROJECT_ROOT}"

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

# 3. Clean framework artifacts from src/ (mounted volume conflicts)
echo "==> Cleaning framework artifacts from src/..."
# Remove index.php if it's a directory (broken state) or symlink
if [ -d "${SRC_DIR}/index.php" ]; then
    rm -rf "${SRC_DIR}/index.php"
    echo "    Removed index.php directory"
elif [ -L "${SRC_DIR}/index.php" ]; then
    rm -f "${SRC_DIR}/index.php"
    echo "    Removed index.php symlink"
fi

# Remove framework directory/symlink if exists (framework is mounted separately)
if [ -d "${SRC_DIR}/framework" ] || [ -L "${SRC_DIR}/framework" ]; then
    rm -rf "${SRC_DIR}/framework"
    echo "    Removed framework directory/symlink"
fi

# 4. Ensure cache directories exist with proper permissions
echo "==> Ensuring cache directories exist..."
mkdir -p "${SRC_DIR}/cache" "${SRC_DIR}/templates_c"

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
