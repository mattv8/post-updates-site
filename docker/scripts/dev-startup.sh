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

# Remove index.php if it's a directory (broken state), symlink, or file
if [ -e "${SRC_DIR}/index.php" ] || [ -L "${SRC_DIR}/index.php" ] || [ -d "${SRC_DIR}/index.php" ]; then
    rm -rf "${SRC_DIR}/index.php"
    echo "    Removed index.php (${SRC_DIR}/index.php)"
fi

# Remove framework directory/symlink if exists (framework is mounted separately)
if [ -d "${SRC_DIR}/framework" ] || [ -L "${SRC_DIR}/framework" ]; then
    rm -rf "${SRC_DIR}/framework"
    echo "    Removed framework directory/symlink"
fi

# 4. Ensure cache directories exist with proper permissions
echo "==> Ensuring cache directories exist..."
mkdir -p "${SRC_DIR}/cache" "${SRC_DIR}/templates_c"
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
