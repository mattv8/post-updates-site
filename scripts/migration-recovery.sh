#!/bin/bash

# Migration Recovery Helper
# This script helps recover from common migration issues
# Project-agnostic - works with any database schema

set -e

# Configuration
CONFIG_FILE="${CONFIG_FILE:-./config.local.php}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[RECOVERY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# Extract database credentials from config.local.php
get_db_config() {
    if [ ! -f "$CONFIG_FILE" ]; then
        error "Config file not found: $CONFIG_FILE"
        exit 1
    fi

    DB_HOST=$(grep -E '^\$db_servername\s*=' "$CONFIG_FILE" | sed -E 's/.*["\x27]([^"\x27]+)["\x27].*/\1/' | head -1)
    DB_USER=$(grep -E '^\$db_username\s*=' "$CONFIG_FILE" | sed -E 's/.*["\x27]([^"\x27]+)["\x27].*/\1/' | head -1)
    DB_PASSWORD=$(grep -E '^\$db_password\s*=' "$CONFIG_FILE" | sed -E 's/.*["\x27]([^"\x27]+)["\x27].*/\1/' | head -1)
    DB_NAME=$(grep -E '^\$db_name\s*=' "$CONFIG_FILE" | sed -E 's/.*["\x27]([^"\x27]+)["\x27].*/\1/' | head -1)

    if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
        error "Database configuration incomplete in $CONFIG_FILE"
        exit 1
    fi
}

# Load database configuration
get_db_config
MYSQL_CMD="mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME"

show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  show-schema [table]      Show schema for a specific table or all tables"
    echo "  show-migrations          Show applied migrations and their status"
    echo "  rollback-migration FILE  Mark a migration as not applied (allows re-run)"
    echo "  reset-migrations         Reset migration tracker (dangerous!)"
    echo "  show-tables              List all tables in database"
    echo "  backup-db [file]         Create a database backup"
    echo ""
    echo "Examples:"
    echo "  $0 show-schema posts"
    echo "  $0 rollback-migration 03-add-section-visibility-toggles.sql"
    echo "  $0 backup-db backup.sql"
    echo ""
}

show_schema() {
    local table="${1:-}"

    if [ -z "$table" ]; then
        info "All tables in database '$DB_NAME':"
        $MYSQL_CMD -e "SHOW TABLES" || error "Failed to show tables"
        echo ""
        info "Use '$0 show-schema <table_name>' to see specific table schema"
    else
        info "Schema for table '$table':"
        $MYSQL_CMD -e "DESCRIBE \`$table\`" || error "Table '$table' not found or failed to describe"
    fi
}

show_migrations() {
    info "Applied migrations:"
    echo ""

    if ! $MYSQL_CMD -e "SELECT * FROM migrations" >/dev/null 2>&1; then
        warn "Migration tracker table doesn't exist yet"
        info "Run migrations first to create the tracker table"
        return 1
    fi

    $MYSQL_CMD -e "
        SELECT
            filename,
            LEFT(checksum, 12) as checksum,
            applied_at,
            TIMESTAMPDIFF(DAY, applied_at, NOW()) as days_ago
        FROM migrations
        ORDER BY applied_at DESC
    " || error "Failed to query migrations"
}

rollback_migration() {
    local migration_file="${1:-}"

    if [ -z "$migration_file" ]; then
        error "Please specify a migration file to rollback"
        show_usage
        exit 1
    fi

    # Extract just the filename if a path was provided
    migration_file=$(basename "$migration_file")

    info "Checking if migration '$migration_file' exists in tracker..."

    local count=$($MYSQL_CMD -sNe "SELECT COUNT(*) FROM migrations WHERE filename = '$migration_file'" 2>/dev/null || echo "0")

    if [ "$count" -eq 0 ]; then
        warn "Migration '$migration_file' not found in tracker"
        info "Nothing to rollback"
        return 0
    fi

    warn "This will mark migration '$migration_file' as not applied"
    warn "The next migration run will attempt to re-apply it"
    warn "This does NOT undo database changes - only updates the tracker"
    echo ""

    read -p "Are you sure you want to rollback this migration? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Operation cancelled"
        exit 0
    fi

    log "Rolling back migration: $migration_file"
    $MYSQL_CMD -e "DELETE FROM migrations WHERE filename = '$migration_file'" || error "Failed to rollback migration"
    log "Migration '$migration_file' has been rolled back"
    info "It will be re-applied on the next migration run"
}

reset_migrations() {
    warn "This will reset the entire migration tracker!"
    warn "ALL migrations will be considered as not applied!"
    warn "The next migration run will attempt to re-apply ALL migrations!"
    warn "This may cause duplicate key errors if data already exists!"
    echo ""

    read -p "Are you ABSOLUTELY sure? Type 'yes' to confirm: " -r
    echo
    if [[ ! $REPLY == "yes" ]]; then
        info "Operation cancelled"
        exit 0
    fi

    log "Resetting migration tracker..."
    $MYSQL_CMD -e "DELETE FROM migrations" || error "Failed to reset migrations"
    log "Migration tracker has been reset"
    warn "All migrations will be re-applied on next run!"
}

show_tables() {
    info "Tables in database '$DB_NAME':"
    $MYSQL_CMD -e "
        SELECT
            TABLE_NAME as 'Table',
            TABLE_ROWS as 'Rows',
            ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) as 'Size (MB)',
            ENGINE
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = '$DB_NAME'
        ORDER BY TABLE_NAME
    " || error "Failed to show tables"
}

backup_db() {
    local backup_file="${1:-backup_$(date +%Y%m%d_%H%M%S).sql}"

    info "Creating database backup..."
    info "Database: $DB_NAME"
    info "Output file: $backup_file"

    if [ -f "$backup_file" ]; then
        warn "File '$backup_file' already exists"
        read -p "Overwrite? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            info "Operation cancelled"
            exit 0
        fi
    fi

    mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "$backup_file" || error "Backup failed"

    local file_size=$(du -h "$backup_file" | cut -f1)
    log "Backup completed successfully"
    info "File: $backup_file ($file_size)"
}

# Main execution
case "${1:-}" in
    show-schema)
        show_schema "${2:-}"
        ;;
    show-migrations)
        show_migrations
        ;;
    rollback-migration)
        rollback_migration "${2:-}"
        ;;
    reset-migrations)
        reset_migrations
        ;;
    show-tables)
        show_tables
        ;;
    backup-db)
        backup_db "${2:-}"
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
