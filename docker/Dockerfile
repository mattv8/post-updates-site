# Post Portal - Production Monolithic Container
# Contains Nginx, PHP-FPM, and MariaDB in a single container
FROM ubuntu:22.04

# Prevent interactive prompts during build
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Nginx web server
    nginx \
    # PHP 8.1 and extensions
    php8.1-fpm \
    php8.1-mysql \
    php8.1-gd \
    php8.1-mbstring \
    php8.1-xml \
    php8.1-curl \
    php8.1-zip \
    php8.1-bcmath \
    # MariaDB server
    mariadb-server \
    mariadb-client \
    # Image optimization tools
    webp \
    jpegoptim \
    pngquant \
    optipng \
    gifsicle \
    # Utilities
    supervisor \
    curl \
    wget \
    unzip \
    git \
    ca-certificates \
    dos2unix \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Configure PHP-FPM to pass environment variables
RUN echo "" >> /etc/php/8.1/fpm/pool.d/www.conf \
    && echo "; Pass environment variables to PHP" >> /etc/php/8.1/fpm/pool.d/www.conf \
    && echo "clear_env = no" >> /etc/php/8.1/fpm/pool.d/www.conf

# Configure PHP-FPM to not daemonize
RUN sed -i 's/;daemonize = yes/daemonize = no/g' /etc/php/8.1/fpm/php-fpm.conf

# Configure nginx
RUN echo "daemon off;" >> /etc/nginx/nginx.conf

# Create application directory structure
RUN mkdir -p /var/www/html \
    && mkdir -p /var/www/html/storage/uploads/originals \
    && mkdir -p /var/www/html/storage/uploads/variants/400 \
    && mkdir -p /var/www/html/storage/uploads/variants/800 \
    && mkdir -p /var/www/html/storage/uploads/variants/1600 \
    && mkdir -p /var/www/html/storage/uploads/variants/thumbnail \
    && mkdir -p /var/www/log \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html/storage

# Clone and bundle Smarty Portal Framework at build time
ARG FRAMEWORK_BRANCH=main
RUN cd /tmp \
    && git clone --depth 1 --branch ${FRAMEWORK_BRANCH} https://github.com/mattv8/smarty-portal-framework.git \
    && cp -r /tmp/smarty-portal-framework/framework /var/www/html/framework \
    && cp /tmp/smarty-portal-framework/index.php /var/www/html/index.php \
    && rm -rf /tmp/smarty-portal-framework \
    && chown -R www-data:www-data /var/www/html/framework \
    && chown www-data:www-data /var/www/html/index.php

# Copy nginx configuration
COPY docker/nginx/default.conf /etc/nginx/sites-available/default

# Copy application source code
COPY src/ /var/www/html/
RUN chown -R www-data:www-data /var/www/html

# Install Composer dependencies
WORKDIR /var/www/html
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Copy database migrations
COPY migrations/ /docker-migrations/

# Copy initialization and migration scripts
COPY docker/scripts/init-database.sh /docker-scripts/init-database.sh
COPY docker/scripts/run-migrations.sh /docker-scripts/run-migrations.sh
RUN dos2unix /docker-scripts/*.sh && chmod +x /docker-scripts/*.sh

# Configure supervisord
COPY docker/scripts/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose ports
EXPOSE 80 3306

# Set up entrypoint
COPY docker/scripts/entrypoint.sh /entrypoint.sh
RUN dos2unix /entrypoint.sh && chmod +x /entrypoint.sh

# Volume for database persistence
VOLUME ["/var/lib/mysql"]

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
