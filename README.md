# Post Updates Platform

A minimal post-updates website. Built on PHP with Smarty templates, featuring responsive image galleries, and WYSIWYG content editing.

## Quick Start for Development

### Prerequisites

- Docker & Docker Compose
- Stripe account (for donation features)

### Development Setup

1. **Clone this repository:**
   ```bash
   git clone git@github.com:mattv8/post-updates-site.git post-updates-site
   ```

2. **Clone the Smarty Portal Framework:**
   ```bash
   cd ..
   git clone https://github.com/mattv8/smarty-portal-framework.git
   ```

   The [Smarty Portal Framework](https://github.com/mattv8/smarty-portal-framework) is a separate repository that provides routing, authentication, and base templates. It's not tracked in this repository but is required for the application to run.

3. **Configure environment:**
   ```bash
   cp .env.template .env
   # Edit .env if needed (default ports: nginx=81, phpmyadmin=82)
   ```

   Ensure `FRAMEWORK_PATH` in `.env` points to where you cloned the framework:
   ```properties
   FRAMEWORK_PATH=/home/yourusername/smarty-portal-framework
   ```

4. **Configure application settings:**
   ```bash
   cp src/config.template.php src/config.local.php
   ```

   Edit `src/config.local.php` with your configuration:
   ```php
   # Database credentials (match .env)
   $db_name = "devdb";
   $db_username = "admin";
   $db_password = "admin";

5. **Build and start Docker services:**
   ```bash
   sudo docker compose up --build
   ```

   This will:
   - Build containers with image optimization tools (cwebp, jpegoptim, pngquant)
   - Initialize MySQL database with framework and Care Bridge schemas
   - Create media storage directories with proper permissions
   - Mount the framework from your local clone (via `FRAMEWORK_PATH` in `.env`)
   - Start nginx, php-fpm, MySQL, and phpMyAdmin

6. **Install Composer dependencies:**
   ```bash
   sudo docker exec -it php-fpm bash
   cd /var/www/html
   composer install
   exit
   ```

7. **Access the application:**
   - Public site: http://localhost:81
   - Admin panel: http://localhost:81/?page=admin (login: admin/tacos)
   - PHPMyAdmin: http://localhost:82

## Database Management

### Schema Overview

The system uses three main tables:

- **`media`**: Uploaded images with responsive variants and metadata
- **`posts`**: Health update posts with hero images and gallery references
- **`settings`**: Single-row site configuration (hero, bio, donation settings)

Framework tables (`users`, `sites`, `audit`) are reused from the Smarty Portal Framework.

### Manual Database Operations

**Apply a new migration:**
```bash
sudo docker exec -i mysql bash -c 'mysql -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE' < database/03-your-migration.sql
```

**Reset database (WARNING: deletes all data):**
```bash
sudo docker compose down
sudo docker volume rm $(basename $(pwd))_db_data
sudo docker compose up --build
```

**Backup database:**
```bash
sudo docker exec mysql bash -c 'mysqldump -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE' > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Restore from backup:**
```bash
sudo docker exec -i mysql bash -c 'mysql -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE' < backup_file.sql
```

## Media Processing

### Upload Flow

1. Client validates file size (20MB) and format
2. Server performs strict MIME/extension validation
3. EXIF metadata stripped (orientation preserved)
4. Original saved to `storage/uploads/originals/`
5. Responsive variants generated at 1600px, 800px, 400px
6. WebP versions created for each variant
7. Variants saved to `storage/uploads/variants/{width}/`
8. Database updated with paths and metadata

### Maintenance

**Update Dependencies:**
```bash
sudo docker exec -it php-fpm bash -c "composer update"
```

## Manual Deployment

Key points for manual deployment:
1. Run migrations from local: Set `CONFIG_FILE=$WEBROOT/config.local.php` and run `./scripts/run-migrations.sh`
2. Clone framework: `git clone https://github.com/mattv8/smarty-portal-framework.git $WEBROOT/framework`
3. Copy framework's index.php: `cp $WEBROOT/framework/index.php $WEBROOT/index.php`
4. Sync application code: `rsync -avzr ./src/ $WEBROOT/ --exclude-from='./src/sync.exclusions' --delete`
5. Create `config.local.php` with production settings (if first deployment)
6. Install Composer dependencies: `composer install --no-dev`

**Important:** Database and script files are NOT synced to `public_html` to avoid `open_basedir` issues. Migration script reads config directly from server using `CONFIG_FILE` env var.

See `DEPLOYMENT.md` for complete details, security considerations, and troubleshooting.

## License

TBD
