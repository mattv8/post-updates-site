# Post Portal

A flexible post and update platform built on PHP with Smarty templates, featuring responsive image galleries, WYSIWYG content editing, and containerized deployment.

**[View Live Demo](https://postportal.dev.visnovsky.us)**

## Quick Start

### Prerequisites

- Docker and Docker Compose
- A `.env` file with your configuration

### Setup

1. **Create environment file:**

   Create a file named `.env` with the following content:

   <details>
   <summary>Click to expand .env template</summary>

   ```bash
   # Web Server Configuration
   PORT=80

   # Debug mode (set to 'true' for development, 'false' for production)
   DEBUG=false
   SMARTY_DEBUG=false

   # Optional: override reset cadence (seconds). Default is 43200 (12 hours) when DEMO_MODE=true
   DEMO_MODE=true
   DEMO_RESET_INTERVAL_SECONDS=43200

   # Database Configuration (MariaDB)
   MYSQL_DATABASE=postportal
   MYSQL_USER=postportal
   MYSQL_PASSWORD=changeme

   # Default admin user password (used on first database initialization)
   DEFAULT_ADMIN_PASSWORD=changeme_admin

   # OpenAI API Configuration
   # Get your API key from: https://platform.openai.com/api-keys
   OPENAI_API_KEY=

   # reCAPTCHA Configuration (Optional)
   # Create your keys here: https://www.google.com/recaptcha/admin/create
   RECAPTCHA_SITE_KEY=
   RECAPTCHA_SECRET_KEY=

   # PHP Configuration (Optional)
   # Customize PHP runtime settings (uses sensible defaults if not set)
   PHP_UPLOAD_MAX_FILESIZE=20M
   PHP_POST_MAX_SIZE=25M
   PHP_MEMORY_LIMIT=256M
   PHP_MAX_EXECUTION_TIME=60

   # ----------------------------------------------------------------------------
   # Development Only Settings (not used in production)
   # ----------------------------------------------------------------------------
   # Path to Smarty Portal Framework (for development only)
   # Clone from: https://github.com/mattv8/smarty-portal-framework.git
   FRAMEWORK_PATH=/path/to/smarty-portal-framework

   # Development service ports
   PHPMA_PORT=82
   MAILPIT_PORT=83
   MYSQL_PORT=3306
   ```

   </details>

2. **Edit `.env`** and configure your specific values (see [Environment Variables](#environment-variables) section)

3. **Create docker-compose.yml:**

   Create a file named `docker-compose.yml` with the following content:

   <details>
   <summary>Click to expand docker-compose.yml</summary>

   ```yaml
   services:
     postportal:
       image: hub.docker.visnovsky.us/library/post-portal:latest
       container_name: post-portal
       restart: unless-stopped
       ports:
         - "${PORT}:80"
       env_file:
         - .env
       environment:
         MYSQL_HOST: localhost
       volumes:
         - db_data:/var/lib/mysql
         - ./logs:/var/www/html/logs
         - ./storage:/var/www/html/storage
       networks:
         - postportal-network

   networks:
     postportal-network:
       driver: bridge

   volumes:
     db_data:
   ```

   **Note:** All configuration variables are loaded from the `.env` file via `env_file`. The `environment` section only needs to override `MYSQL_HOST` to `localhost` since the database runs in the same container.

   </details>

4. **Start the application:**
   ```bash
   docker compose up -d
   ```

5. **Access the application:**
   - Public site: http://localhost
   - Admin panel: http://localhost/?page=admin

   Default credentials: `admin` / (set via `DEFAULT_ADMIN_PASSWORD` in `.env`)

### Data Persistence

Docker volumes persist:
- **Database:** MariaDB data (`db_data` volume)
- **Uploads:** User-uploaded images (`./storage` mount)
- **Logs:** Application logs (`./logs` mount)

Backup commands:
```bash
# Backup database
docker exec post-portal mysqldump -u postportal -p postportal > backup.sql

# Backup uploads
tar -czf uploads-backup.tar.gz ./storage/
```

## Environment Variables

### Database Configuration
- `MYSQL_DATABASE` - Database name (default: `postportal`)
- `MYSQL_USER` - Database user (default: `postportal`)
- `MYSQL_PASSWORD` - Database password (required)

Note: MySQL root password is auto-generated for security.

### Admin Configuration
- `DEFAULT_ADMIN_PASSWORD` - Initial admin user password (required for first setup)

### Debug Settings
- `DEBUG` - Enable debug mode (default: `false`)
- `SMARTY_DEBUG` - Enable Smarty template debugging (default: `false`)

### OpenAI API
- `OPENAI_API_KEY` - OpenAI API key for AI features (optional)

### reCAPTCHA (Optional)
- `RECAPTCHA_SITE_KEY` - reCAPTCHA site key
- `RECAPTCHA_SECRET_KEY` - reCAPTCHA secret key

### PHP Configuration (Optional)
- `PHP_UPLOAD_MAX_FILESIZE` - Max upload file size (default: `20M`)
- `PHP_POST_MAX_SIZE` - Max POST size (default: `25M`)
- `PHP_MEMORY_LIMIT` - PHP memory limit (default: `256M`)
- `PHP_MAX_EXECUTION_TIME` - Max execution time in seconds (default: `60`)

### Web Server
- `PORT` - Host port to expose (default: `80`)

## Development Setup

### Prerequisites

- Docker and Docker Compose
- Git

### Development Environment

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mattv8/post-portal.git
   cd post-portal
   ```

2. **Clone the Smarty Portal Framework:**
   ```bash
   cd ..
   git clone https://github.com/mattv8/smarty-portal-framework.git
   ```

   The [Smarty Portal Framework](https://github.com/mattv8/smarty-portal-framework) provides routing, authentication, and base templates.

3. **Configure development environment:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set `FRAMEWORK_PATH`:
   ```properties
   FRAMEWORK_PATH=/path/to/smarty-portal-framework

   # Development defaults
   PORT=81
   MYSQL_DATABASE=devdb
   MYSQL_USER=admin
   MYSQL_PASSWORD=admin
   SMTP_HOST=mailpit
   SMTP_PORT=1025
   SMTP_AUTH=false
   ```

4. **Start development stack:**

   **Option A: Using VS Code tasks:**
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
   - Select `Tasks: Run Task` → `Start Development Docker Stack`

   **Option B: Manual command line (without VS Code):**
   ```bash
   # From the project root directory, run the startup script
   ./docker/scripts/dev-startup.sh

   # Then start the Docker stack
   cd docker
   sudo docker compose -f docker-compose.dev.yml up --build
   ```

5. **Access development services:**
   - Public site: http://localhost:81
   - Admin panel: http://localhost:81/?page=admin (auto-filled in debug mode)
   - PHPMyAdmin: http://localhost:82
   - Mailpit (email testing): http://localhost:83

### Making Changes

All source code is in the `src/` directory:
- `src/*.php` - Page controllers
- `src/templates/*.tpl` - Smarty templates
- `src/css/` - Stylesheets
- `src/js/` - JavaScript files
- `src/api/` - API endpoints
- `src/functions.php` - Shared business logic

Changes are immediately reflected (no rebuild required).

## Database

### Schema

- **`media`** - Uploaded images with responsive variants and metadata
- **`posts`** - User posts with hero images and gallery references
- **`settings`** - Site configuration (hero, bio, donation settings)
- **`users`**, **`sites`**, **`audit`** - Framework tables (reused from Smarty Portal Framework)

### Migrations

Migrations are automatically applied on container startup from the `migrations/` folder.

To manually run migrations:
```bash
docker exec post-portal migrate

```

### Importing a SQL Dump

Import database dumps using the built-in `import` command:

```bash
cat /path/to/dump.sql | sudo docker exec -i post-portal import -
```

The import command automatically handles connection cleanup, database recreation with utf8mb4, and verification.

### Migrating Media Files

Media files (uploaded images and their responsive variants) are stored in the `storage/uploads/` directory, which is mounted from the host filesystem. To migrate media from another installation, simply copy the files to your local `storage/uploads/` directory and ensure they have the correct permissions (owned by `www-data` with `775` permissions). Files copied to the host path are immediately available in the container since the directory is mounted as a volume.

The media directory structure includes `originals/` for uploaded files and `variants/` with subdirectories for different responsive sizes (400px, 800px, 1600px, and thumbnails).

**Reset development database:**
```bash
# Quick reset (keeps container running)
sudo docker exec postportal-dev drop

# Full reset (rebuilds container)
cd docker
sudo docker compose -f docker-compose.dev.yml down -v
sudo docker compose -f docker-compose.dev.yml up --build
```

### Demo Mode

**Environment variables:**
- `DEMO_MODE` - Set to `true` to enable (default: `false`)
- `DEMO_RESET_INTERVAL_SECONDS` - Reset interval in seconds (default: `43200` / 12 hours)

**Manually run the seed script:**
```bash
# In development container
sudo docker exec postportal-dev php /var/www/html/lib/demo_seed.php --force

# In production container
docker exec post-portal php /var/www/html/lib/demo_seed.php --force
```

The `--force` flag bypasses the `DEMO_MODE` check, allowing you to seed content without enabling the automatic reset loop.

## CI/CD

The project uses GitHub Actions to:
1. Build container on every branch push
2. Tag images with branch name (`:main`, `:stage`, `:feature-xyz`)
3. Sign images with Cosign
4. Push to Harbor registry at `hub.docker.visnovsky.us`
5. Generate and attach SBOM (Software Bill of Materials)

Main branch is tagged as `:latest`.

## License

TBD

## Contributing

Contributions welcome! Please submit pull requests to the appropriate branch.
