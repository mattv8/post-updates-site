#!/bin/bash
set -e

echo "==> Starting Post Portal Container"

# ============================================================
# PHASE 1: Configuration and Directory Setup
# ============================================================

# Generate secure root password automatically (user doesn't need to know this)
if [ -z "${MYSQL_ROOT_PASSWORD}" ]; then
    export MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32)
    echo "==> Generated secure MySQL root password"
fi

# Store root password for use by other scripts (import, etc.)
echo "${MYSQL_ROOT_PASSWORD}" > /var/run/mysql_root_password
chmod 600 /var/run/mysql_root_password

# Configure PHP settings from environment variables with defaults
PHP_UPLOAD_MAX_FILESIZE="${PHP_UPLOAD_MAX_FILESIZE:-20M}"
PHP_POST_MAX_SIZE="${PHP_POST_MAX_SIZE:-25M}"
PHP_MEMORY_LIMIT="${PHP_MEMORY_LIMIT:-256M}"
PHP_MAX_EXECUTION_TIME="${PHP_MAX_EXECUTION_TIME:-60}"

echo "==> Configuring PHP settings..."
cat > /etc/php/8.1/fpm/conf.d/custom.ini <<EOF
upload_max_filesize = ${PHP_UPLOAD_MAX_FILESIZE}
post_max_size = ${PHP_POST_MAX_SIZE}
memory_limit = ${PHP_MEMORY_LIMIT}
max_execution_time = ${PHP_MAX_EXECUTION_TIME}
EOF

echo "==> PHP Configuration:"
echo "    upload_max_filesize = ${PHP_UPLOAD_MAX_FILESIZE}"
echo "    post_max_size = ${PHP_POST_MAX_SIZE}"
echo "    memory_limit = ${PHP_MEMORY_LIMIT}"
echo "    max_execution_time = ${PHP_MAX_EXECUTION_TIME}"

# Ensure logs directory exists and has correct permissions
echo "==> Setting up logs directory..."
mkdir -p /var/www/html/logs
chown -R www-data:www-data /var/www/html/logs
chmod -R 755 /var/www/html/logs

# Ensure PHP-FPM run directory exists (for Unix socket)
echo "==> Setting up PHP-FPM run directory..."
mkdir -p /run/php
chown www-data:www-data /run/php

# Ensure storage/uploads directory structure exists with correct permissions
echo "==> Setting up storage/uploads directory structure..."
mkdir -p /var/www/html/storage/uploads/originals
mkdir -p /var/www/html/storage/uploads/variants/400
mkdir -p /var/www/html/storage/uploads/variants/800
mkdir -p /var/www/html/storage/uploads/variants/1600
mkdir -p /var/www/html/storage/uploads/variants/thumbnail
chown -R www-data:www-data /var/www/html/storage
chmod -R 775 /var/www/html/storage

# Configure MariaDB to listen on all interfaces (for PHPMyAdmin and external connections)
echo "==> Configuring MariaDB networking..."
sed -i 's/^bind-address\s*=\s*127\.0\.0\.1/bind-address = 0.0.0.0/' /etc/mysql/mariadb.conf.d/50-server.cnf

# ============================================================
# PHASE 2: Database Initialization (if needed)
# ============================================================

# Ensure MariaDB runtime directory exists (mysqld_safe creates this, but we run mariadbd directly)
mkdir -p /run/mysqld
chown mysql:mysql /run/mysqld

# Initialize MariaDB data directory if fresh install
if [ ! -d "/var/lib/mysql/mysql" ]; then
    echo "==> Initializing MariaDB database..."
    mysql_install_db --user=mysql --datadir=/var/lib/mysql
fi

# Start MariaDB in background for initialization
# Use mariadbd directly (not mysqld_safe) for proper signal handling
echo "==> Starting MariaDB for initialization..."
/usr/sbin/mariadbd --user=mysql &
MARIADB_PID=$!

# Wait for MariaDB to be ready (max 30 seconds)
echo "==> Waiting for MariaDB to be ready..."
for i in {30..0}; do
    if mysqladmin ping --silent 2>/dev/null; then
        break
    fi
    if [ $((i % 5)) -eq 0 ]; then
        echo "    MariaDB starting... (${i}s remaining)"
    fi
    sleep 1
done

if [ "$i" = 0 ]; then
    echo "==> ERROR: MariaDB failed to start within 30 seconds"
    echo "    Check /var/log/mysql/error.log for details"
    exit 1
fi

echo "==> MariaDB is ready"

# ============================================================
# PHASE 3: Run Initialization Scripts
# ============================================================

# Run database initialization script (creates DB, users, etc.)
echo "==> Running database initialization..."
/docker-scripts/init-database.sh

# Run migrations
echo "==> Running database migrations..."
export CONFIG_FILE=/var/www/html/config.php
/docker-scripts/run-migrations.sh || echo "Warning: Some migrations may have failed"

# Seed demo content (if enabled)
if [ "${DEMO_MODE,,}" = "true" ]; then
    echo "==> DEMO_MODE enabled: seeding demo content"
    php /var/www/html/lib/demo_seed.php --force || echo "Warning: demo seed failed"
fi

# Update admin password if hash was generated during init (fresh database)
if [ -f /tmp/admin_password_hash ]; then
    echo "==> Updating admin password from initial setup..."
    ADMIN_HASH=$(cat /tmp/admin_password_hash)
    mysql -h localhost -u "${MYSQL_USER}" -p"${MYSQL_PASSWORD}" "${MYSQL_DATABASE}" \
        -e "UPDATE users SET password = '${ADMIN_HASH}' WHERE username = 'admin';" \
        || echo "Warning: Failed to update admin password"
    rm -f /tmp/admin_password_hash
    echo "==> Admin password updated successfully"
fi

# Sync admin password with DEFAULT_ADMIN_PASSWORD on every startup
if [ -n "${DEFAULT_ADMIN_PASSWORD}" ]; then
    echo "==> Checking admin password sync..."

    CURRENT_HASH=$(mysql -h localhost -u "${MYSQL_USER}" -p"${MYSQL_PASSWORD}" "${MYSQL_DATABASE}" \
        -N -e "SELECT password FROM users WHERE username = 'admin' LIMIT 1;" 2>/dev/null)

    HASH_MATCHES=$(php -r "echo password_verify('${DEFAULT_ADMIN_PASSWORD}', '${CURRENT_HASH}') ? 'yes' : 'no';" 2>/dev/null)

    if [ "$HASH_MATCHES" = "no" ]; then
        echo "==> Admin password out of sync, updating..."
        NEW_HASH=$(php -r "echo password_hash('${DEFAULT_ADMIN_PASSWORD}', PASSWORD_DEFAULT);")
        if [ -n "$NEW_HASH" ]; then
            mysql -h localhost -u "${MYSQL_USER}" -p"${MYSQL_PASSWORD}" "${MYSQL_DATABASE}" \
                -e "UPDATE users SET password = '${NEW_HASH}' WHERE username = 'admin';" 2>/dev/null \
                && echo "==> Admin password synced with DEFAULT_ADMIN_PASSWORD" \
                || echo "Warning: Failed to sync admin password"
        else
            echo "Warning: Failed to generate password hash"
        fi
    else
        echo "==> Admin password already in sync"
    fi
fi

# ============================================================
# PHASE 4: Transition to Supervisord
# ============================================================

# MariaDB is already running from init phase - we need to stop it cleanly
# so supervisord can manage it (supervisord expects to start processes itself)
echo "==> Preparing to transfer control to supervisord..."

# Flush tables to ensure data integrity before supervisord takeover
mysql -h localhost -u "${MYSQL_USER}" -p"${MYSQL_PASSWORD}" "${MYSQL_DATABASE}" \
    -e "FLUSH TABLES;" 2>/dev/null || true

# Request graceful shutdown
echo "==> Stopping MariaDB for supervisord takeover..."
if mysqladmin -h localhost -u "${MYSQL_USER}" -p"${MYSQL_PASSWORD}" shutdown 2>/dev/null; then
    # Wait for clean shutdown (max 30 seconds - this is a clean DB, should be fast)
    for i in {30..0}; do
        if ! pgrep -x mariadbd >/dev/null 2>&1 && ! pgrep -x mysqld >/dev/null 2>&1; then
            echo "==> MariaDB stopped cleanly"
            break
        fi
        sleep 1
    done

    if [ "$i" = 0 ]; then
        # Still running after 30s - send SIGTERM and wait briefly
        echo "==> MariaDB slow to stop, sending SIGTERM..."
        pkill -TERM mariadbd 2>/dev/null || true
        sleep 5

        if pgrep -x mariadbd >/dev/null 2>&1; then
            echo "==> WARNING: MariaDB still running, supervisord will handle it"
            # Don't fail - supervisord can handle an already-running process
            # or the autorestart will kick in
        fi
    fi
else
    # mysqladmin failed - try SIGTERM
    echo "==> mysqladmin shutdown unavailable, using SIGTERM..."
    pkill -TERM mariadbd 2>/dev/null || true
    sleep 5
fi

# Brief pause to ensure clean state
sleep 1

# ============================================================
# PHASE 5: Start Background Services and Hand Off
# ============================================================

# Start demo reset loop in background (12h by default)
if [ "${DEMO_MODE,,}" = "true" ]; then
    echo "==> DEMO_MODE: scheduling reset every ${DEMO_RESET_INTERVAL_SECONDS:-43200} seconds"
    chmod +x /docker-scripts/demo-reset.sh 2>/dev/null || true
    /docker-scripts/demo-reset.sh >/var/log/demo-reset.log 2>&1 &
fi

echo "==> Initialization complete, starting services via supervisord..."
echo ""

# Execute the main command (supervisord)
# Supervisord will manage MariaDB, PHP-FPM, and nginx from here
exec "$@"
