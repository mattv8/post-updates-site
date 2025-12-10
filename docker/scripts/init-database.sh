#!/bin/bash
set -e

echo "==> Initializing database..."

# Set default values from environment variables
DB_NAME="${MYSQL_DATABASE:-postportal}"
DB_USER="${MYSQL_USER:-postportal}"
DB_PASSWORD="${MYSQL_PASSWORD:-postportal}"
DB_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-root}"
ADMIN_PASSWORD="${DEFAULT_ADMIN_PASSWORD:-changeme_admin}"

# Check if database is already initialized by checking if application user can connect
# The app user credentials are consistent across restarts (from .env), unlike root password which is randomly generated
echo "==> Checking if database '${DB_NAME}' already exists..."

if mysql -u "${DB_USER}" -p"${DB_PASSWORD}" -e "SHOW DATABASES LIKE '${DB_NAME}'" 2>/dev/null | grep -q "${DB_NAME}"; then
    echo "==> Database already initialized (database '${DB_NAME}' exists), skipping init"
    exit 0
fi

echo "==> Initializing fresh database..."

# Initialize database (using unix_socket auth as root for fresh install)
if ! mysql -u root << EOF
-- Set root password and switch from unix_socket to mysql_native_password
ALTER USER 'root'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('${DB_ROOT_PASSWORD}');

-- Remove anonymous users
DELETE FROM mysql.global_priv WHERE User='';

-- Disallow root login remotely
DELETE FROM mysql.global_priv WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');

-- Remove test database
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';

-- Create application database
CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create application user for both local and remote connections
CREATE USER '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASSWORD}';
CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'%';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;
EOF
then
    echo "ERROR: Failed to initialize database (MySQL connection failed)"
    echo "This may mean the database is already configured but the check failed"
    echo "Attempting to continue anyway..."
    exit 0
fi

# Generate password hash for admin user and update after migrations run
echo "==> Admin password will be set to: ${ADMIN_PASSWORD}"
echo "==> Generating password hash..."
ADMIN_PASSWORD_HASH=$(php -r "echo password_hash('${ADMIN_PASSWORD}', PASSWORD_DEFAULT);")

if [ -z "$ADMIN_PASSWORD_HASH" ]; then
    echo "ERROR: Failed to generate password hash for admin user"
    exit 1
fi

# Store the hash in a temp file for use after migrations
echo "$ADMIN_PASSWORD_HASH" > /tmp/admin_password_hash

echo "==> Database initialized successfully"
