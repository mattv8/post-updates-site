# Post Portal

A flexible post and update platform built on PHP with Smarty templates, featuring responsive image galleries, WYSIWYG content editing, and containerized deployment.

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

   # Database Configuration (MariaDB)
   MYSQL_DATABASE=postportal
   MYSQL_USER=postportal
   MYSQL_PASSWORD=changeme

   # Default admin user password (used on first database initialization)
   DEFAULT_ADMIN_PASSWORD=changeme_admin

   # OpenAI API Configuration
   # Get your API key from: https://platform.openai.com/api-keys
   OPENAI_API_KEY=

   # SMTP Email Configuration
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_SECURE=tls
   SMTP_AUTH=true
   SMTP_USERNAME=
   SMTP_PASSWORD=
   SMTP_FROM_EMAIL=noreply@example.com

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
         - "${PORT:-80}:80"
       env_file:
         - .env
       environment:
         MYSQL_HOST: localhost
       volumes:
         - db_data:/var/lib/mysql
         - ./logs:/var/www/log
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

### SMTP Email Configuration
- `SMTP_HOST` - SMTP server hostname (required)
- `SMTP_PORT` - SMTP port (default: `587`)
- `SMTP_SECURE` - Encryption type: `tls`, `ssl`, or empty (default: `tls`)
- `SMTP_AUTH` - Enable SMTP authentication (default: `true`)
- `SMTP_USERNAME` - SMTP username (required if auth enabled)
- `SMTP_PASSWORD` - SMTP password (required if auth enabled)
- `SMTP_FROM_EMAIL` - From email address (required)

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
   ```bash
   cd docker
   sudo docker compose -f docker-compose.dev.yml up --build
   ```

   Or use the VS Code task: `Tasks: Run Task` → `Start Development Docker Stack`

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

To manually run migrations in production:
```bash
docker exec -it post-portal bash
/docker-scripts/run-migrations.sh
```


## CI/CD

The project uses GitHub Actions to:
1. Build container on every branch push
2. Tag images with branch name (`:main`, `:stage`, `:feature-xyz`)
3. Sign images with Cosign
4. Push to Harbor registry at `hub.docker.visnovsky.us`
5. Generate and attach SBOM (Software Bill of Materials)

Main branch is tagged as `:latest`.

**Reset development database:**
```bash
cd docker
sudo docker compose -f docker-compose.dev.yml down -v
sudo docker compose -f docker-compose.dev.yml up --build
```

## License

TBD

## Contributing

Contributions welcome! Please submit pull requests to the appropriate branch.
