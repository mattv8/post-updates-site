#!/bin/bash
set -e

echo "==> Starting Post Portal Container"

# Create symlinks for convenience commands
ln -sf /docker-scripts/import-database.sh /usr/local/bin/import
ln -sf /docker-scripts/run-migrations.sh /usr/local/bin/migrate

# Create a drop command wrapper
cat > /usr/local/bin/drop <<'EOF'
#!/bin/bash
/docker-scripts/import-database.sh --drop "$@"
EOF
chmod +x /usr/local/bin/drop

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

# Initialize MariaDB if needed
if [ ! -d "/var/lib/mysql/mysql" ]; then
    echo "==> Initializing MariaDB database..."
    mysql_install_db --user=mysql --datadir=/var/lib/mysql
fi

# Start MariaDB temporarily for initialization
echo "==> Starting MariaDB for initialization..."
mysqld_safe --datadir=/var/lib/mysql --skip-networking &
MYSQL_PID=$!

# Wait for MariaDB to be ready
echo "==> Waiting for MariaDB to be ready..."
for i in {30..0}; do
    if mysqladmin ping --silent; then
        break
    fi
    echo "MariaDB is unavailable - sleeping"
    sleep 1
done

if [ "$i" = 0 ]; then
    echo "==> ERROR: MariaDB failed to start"
    exit 1
fi

echo "==> MariaDB is ready"

# Run database initialization script
echo "==> Running database initialization..."
/docker-scripts/init-database.sh

# Run migrations
echo "==> Running database migrations..."
export CONFIG_FILE=/var/www/html/config.local.php
/docker-scripts/run-migrations.sh || echo "Warning: Some migrations may have failed"

# Update admin password if hash was generated during init
if [ -f /tmp/admin_password_hash ]; then
    echo "==> Updating admin password from initial setup..."
    ADMIN_HASH=$(cat /tmp/admin_password_hash)
    mysql -h localhost -u "${MYSQL_USER}" -p"${MYSQL_PASSWORD}" "${MYSQL_DATABASE}" -e "UPDATE users SET password = '${ADMIN_HASH}' WHERE username = 'admin';" || echo "Warning: Failed to update admin password"
    rm -f /tmp/admin_password_hash
    echo "==> Admin password updated successfully"
fi

# Stop temporary MariaDB
echo "==> Stopping temporary MariaDB..."
# Try graceful shutdown with timeout
timeout 5 mysqladmin -u root -p"${MYSQL_ROOT_PASSWORD}" shutdown 2>/dev/null || {
    echo "==> Graceful shutdown failed, forcing stop..."
    kill $MYSQL_PID 2>/dev/null || true
}
wait $MYSQL_PID 2>/dev/null || true

echo "==> Initialization complete, starting services via supervisord..."

# Execute the main command (supervisord)
exec "$@"
