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

# 1b. Check for FRAMEWORK_PATH and verify it exists
FRAMEWORK_PATH=$(grep "^FRAMEWORK_PATH=" "${PROJECT_ROOT}/.env" | cut -d'=' -f2 | tr -d ' ')

if [ -z "$FRAMEWORK_PATH" ] || [ "$FRAMEWORK_PATH" = "/path/to/smarty-portal-framework" ]; then
    echo ""
    echo "$(tput setaf 1)❌ ERROR: FRAMEWORK_PATH not configured$(tput sgr0)"
    echo ""
    echo "You must configure FRAMEWORK_PATH in your .env file."
    echo ""
    echo "Steps to fix:"
    echo "  1. Clone the framework:"
    echo "     git clone https://github.com/mattv8/smarty-portal-framework.git $(dirname ${PROJECT_ROOT})/smarty-portal-framework"
    echo ""
    echo "  2. Update FRAMEWORK_PATH in .env:"
    FRAMEWORK_EXPECTED="$(dirname ${PROJECT_ROOT})/smarty-portal-framework"
    echo "     FRAMEWORK_PATH=${FRAMEWORK_EXPECTED}"
    echo ""
    exit 1
fi

# 1c. Verify framework directory exists and has index.php
if [ ! -d "$FRAMEWORK_PATH" ]; then
    echo ""
    echo "$(tput setaf 1)❌ ERROR: Framework directory does not exist$(tput sgr0)"
    echo "    FRAMEWORK_PATH: $FRAMEWORK_PATH"
    echo ""
    echo "Clone the framework:"
    echo "  git clone https://github.com/mattv8/smarty-portal-framework.git $FRAMEWORK_PATH"
    echo ""
    exit 1
fi

if [ ! -f "$FRAMEWORK_PATH/index.php" ]; then
    echo ""
    echo "$(tput setaf 1)❌ ERROR: Framework index.php not found$(tput sgr0)"
    echo "    FRAMEWORK_PATH: $FRAMEWORK_PATH"
    echo "    Missing: $FRAMEWORK_PATH/index.php"
    echo ""
    echo "Verify the framework was cloned correctly."
    echo ""
    exit 1
fi

echo "✓ Framework found: $FRAMEWORK_PATH"

# 2. Create .env symlink in docker directory if needed
if [ ! -L "${PROJECT_ROOT}/docker/.env" ]; then
    ln -sf "${PROJECT_ROOT}/.env" "${PROJECT_ROOT}/docker/.env"
    echo "==> Created .env symlink in docker directory"
fi

# 3. Clean framework artifacts from src/ (mounted volume conflicts)
echo "==> Cleaning framework artifacts from src/..."

# Note: index.php and framework/ are mounted as read-only by docker-compose
# The mounts will overlay the local files, so we don't need to remove them here.
# They will be provided by the framework at runtime.

# Remove framework directory/symlink if exists locally (framework is mounted separately)
if [ -d "${SRC_DIR}/framework" ] || [ -L "${SRC_DIR}/framework" ]; then
    rm -rf "${SRC_DIR}/framework"
    echo "    Removed local framework directory/symlink (will be mounted by docker-compose)"
fi

# 4. Ensure cache directories exist with proper permissions
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
