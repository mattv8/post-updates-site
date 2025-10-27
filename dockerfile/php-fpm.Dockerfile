FROM php:8.1-fpm

# Install system dependencies and image optimization tools
RUN apt-get update && apt-get install -y \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libpng-dev \
    libwebp-dev \
    libzip-dev \
    zip \
    unzip \
    libonig-dev \
    libxml2-dev \
    libcurl4-openssl-dev \
    pkg-config \
    libssl-dev \
    webp \
    jpegoptim \
    pngquant \
    optipng \
    gifsicle

# Install PHP extensions with webp support
RUN docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install gd pdo pdo_mysql mbstring exif pcntl bcmath zip mysqli

# Enable PHP extensions
RUN docker-php-ext-enable gd pdo pdo_mysql mbstring exif pcntl bcmath zip mysqli

# Create media storage directories and set permissions
RUN mkdir -p /var/www/html/storage/uploads/originals \
    && mkdir -p /var/www/html/storage/uploads/variants/400 \
    && mkdir -p /var/www/html/storage/uploads/variants/800 \
    && mkdir -p /var/www/html/storage/uploads/variants/1600 \
    && mkdir -p /var/www/html/storage/uploads/variants/thumbnail \
    && chown -R www-data:www-data /var/www/html/storage \
    && chmod -R 775 /var/www/html/storage

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Clean up
RUN apt-get clean && rm -rf /var/lib/apt/lists/*
