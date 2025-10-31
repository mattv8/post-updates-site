#!/bin/bash
set -e

echo "==> Starting Post Portal Container"

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
mysqladmin -u root -p"${MYSQL_ROOT_PASSWORD}" shutdown
wait $MYSQL_PID

echo "==> Initialization complete, starting services via supervisord..."

# Execute the main command (supervisord)
exec "$@"
