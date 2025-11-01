#!/bin/bash
set -e

# Database Import Script
# Safely imports SQL dumps by properly handling existing data and connections

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[IMPORT]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show usage
show_usage() {
    echo "Usage: $0 <sql_dump_file>"
    echo "   Or: cat dump.sql | $0 -"
    echo "   Or: $0 --drop (drops and recreates database without importing)"
    echo ""
    echo "This script will:"
    echo "  1. Kill all active database connections"
    echo "  2. Drop and recreate the database"
    echo "  3. Import the SQL dump (unless --drop is used)"
    echo ""
    echo "Arguments:"
    echo "  sql_dump_file   Path to SQL dump file, or '-' to read from stdin"
    echo "  --drop          Only drop and recreate the database, skip import"
    echo ""
    echo "Environment variables required:"
    echo "  MYSQL_DATABASE  - Target database name"
    echo "  MYSQL_USER      - Database user"
    echo "  MYSQL_PASSWORD  - Database password"
    echo "  MYSQL_HOST      - Database host (default: localhost)"
}

# Check arguments
if [ $# -lt 1 ]; then
    error "No SQL dump file specified"
    show_usage
    exit 1
fi

# Handle help flag
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_usage
    exit 0
fi

# Handle drop-only mode
DROP_ONLY=false
if [ "$1" = "--drop" ]; then
    DROP_ONLY=true
    log "Drop-only mode enabled - database will be recreated without import"
fi

SQL_FILE=""
USE_STDIN=false

if [ "$DROP_ONLY" = false ]; then
    SQL_FILE="$1"

    if [ "$SQL_FILE" = "-" ]; then
        USE_STDIN=true
        SQL_FILE="/tmp/import_$(date +%s).sql"
        log "Reading SQL dump from stdin..."
        cat > "$SQL_FILE"
        log "SQL dump saved to temporary file: $SQL_FILE"
    elif [ ! -f "$SQL_FILE" ]; then
        error "SQL dump file not found: $SQL_FILE"
        exit 1
    fi
fi

# Get database credentials from environment
DB_HOST="${MYSQL_HOST:-localhost}"
DB_USER="${MYSQL_USER}"
DB_PASSWORD="${MYSQL_PASSWORD}"
DB_NAME="${MYSQL_DATABASE}"

# Try to get root password from various sources
DB_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD}"

# If not set, try to read from generated password file (if exists)
if [ -z "$DB_ROOT_PASSWORD" ] && [ -f /var/run/mysql_root_password ]; then
    DB_ROOT_PASSWORD=$(cat /var/run/mysql_root_password)
fi

# Validate required fields
if [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
    error "Required environment variables not set"
    echo "Please set: MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE"
    exit 1
fi

log "Database Import Configuration:"
log "  Host: $DB_HOST"
log "  Database: $DB_NAME"
log "  User: $DB_USER"
if [ "$DROP_ONLY" = false ]; then
    log "  SQL File: $SQL_FILE"
else
    log "  Mode: Drop and recreate only (no import)"
fi
echo ""

# MySQL connection commands
MYSQL_CMD="mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD"
MYSQL_ROOT_CMD="mysql -h $DB_HOST -u root -p$DB_ROOT_PASSWORD"

# Step 1: Kill all connections to the database
log "Step 1: Terminating active database connections..."

# Try to get process list and kill connections
if [ -n "$DB_ROOT_PASSWORD" ]; then
    # Use root to kill connections if available
    KILL_QUERY="SELECT CONCAT('KILL ', id, ';') FROM information_schema.PROCESSLIST WHERE db = '$DB_NAME' AND id != CONNECTION_ID();"
    KILL_COMMANDS=$($MYSQL_ROOT_CMD -sNe "$KILL_QUERY" 2>/dev/null || echo "")

    if [ -n "$KILL_COMMANDS" ]; then
        warn "Killing active connections:"
        echo "$KILL_COMMANDS" | $MYSQL_ROOT_CMD 2>/dev/null || true
    fi
else
    warn "Root password not available, cannot kill connections"
fi

# Step 2: Drop and recreate database
log "Step 2: Dropping and recreating database '$DB_NAME'..."

if [ -n "$DB_ROOT_PASSWORD" ]; then
    # Use root privileges for drop/create
    if ! $MYSQL_ROOT_CMD <<EOF
DROP DATABASE IF EXISTS \`${DB_NAME}\`;
CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'%';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF
    then
        error "Failed to drop/recreate database using root credentials"

        # Fallback: try with regular user
        warn "Attempting with regular user credentials..."
        if ! $MYSQL_CMD -e "DROP DATABASE IF EXISTS \`${DB_NAME}\`; CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1; then
            error "Failed to drop/recreate database"
            error "The database may be in use or you may lack permissions"
            exit 1
        fi
    fi
else
    # Use regular user if root not available
    if ! $MYSQL_CMD -e "DROP DATABASE IF EXISTS \`${DB_NAME}\`; CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1; then
        error "Failed to drop/recreate database"
        error "You may need root privileges or the database may be in use"
        exit 1
    fi
fi

log "Database recreated successfully"

# Exit early if drop-only mode
if [ "$DROP_ONLY" = true ]; then
    log ""
    log "============================================"
    log "Database drop/recreate completed!"
    log "============================================"
    log "Database: $DB_NAME"
    log "Character Set: utf8mb4"
    log ""
    exit 0
fi

# Step 3: Import SQL dump
log "Step 3: Importing SQL dump..."
log "This may take a while for large files..."

# Import with better error handling
if $MYSQL_CMD "$DB_NAME" < "$SQL_FILE" 2>&1 | tee /tmp/import.log; then
    log "Import completed successfully!"
else
    error "Import failed!"
    error "Check /tmp/import.log for details"

    # Show last few lines of error
    warn "Last errors from import:"
    tail -20 /tmp/import.log
    exit 1
fi

# Step 4: Verify import
log "Step 4: Verifying import..."

TABLE_COUNT=$($MYSQL_CMD -sNe "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME'" 2>/dev/null || echo "0")

log "Import verification:"
log "  Tables created: $TABLE_COUNT"

if [ "$TABLE_COUNT" -eq 0 ]; then
    warn "No tables found in database after import!"
    warn "The SQL dump may be empty or may have failed to import"
    exit 1
fi

# Show table list
log "Tables in database:"
$MYSQL_CMD -e "USE $DB_NAME; SHOW TABLES;" | head -20

log ""
log "============================================"
log "Database import completed successfully!"
log "============================================"
log "Database: $DB_NAME"
log "Tables: $TABLE_COUNT"
log ""

# Cleanup temporary file if we used stdin
if [ "$USE_STDIN" = true ]; then
    rm -f "$SQL_FILE"
    log "Temporary import file cleaned up"
fi
