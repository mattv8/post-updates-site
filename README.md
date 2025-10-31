# Post Portal

A flexible post and update platform built on PHP with Smarty templates, featuring responsive image galleries, WYSIWYG content editing, and containerized deployment.

## Quick Start (Production)

### Prerequisites

- Docker and Docker Compose
- A `.env` file with your configuration

### Production Deployment

1. **Create your environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Configure your environment:**
   Edit `.env` and set your values:
   ```properties
   # Database credentials
   MYSQL_DATABASE=postportal
   MYSQL_USER=postportal
   MYSQL_PASSWORD=your_secure_password
   MYSQL_ROOT_PASSWORD=your_secure_root_password

   # OpenAI API (optional, for AI features)
   OPENAI_API_KEY=sk-your-api-key

   # SMTP Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=tls
   SMTP_AUTH=true
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   SMTP_FROM_EMAIL=noreply@yourdomain.com

   # reCAPTCHA (optional)
   RECAPTCHA_SITE_KEY=your-site-key
   RECAPTCHA_SECRET_KEY=your-secret-key
   ```

3. **Start the application:**
   ```bash
   docker compose up -d
   ```

4. **Access the application:**
   - Public site: http://localhost
   - Admin panel: http://localhost/?page=admin

   **Default credentials:** `admin` / (set via `DEFAULT_ADMIN_PASSWORD` in `.env`)

The container includes:
- ✅ Nginx web server
- ✅ PHP 8.1 with all required extensions
- ✅ MariaDB database
- ✅ Image optimization tools (WebP, JPG, PNG)
- ✅ Smarty Portal Framework (bundled)
- ✅ Auto-applied database migrations

### Data Persistence

The following data is persisted via Docker volumes:
- **Database:** All posts, media, settings stored in MariaDB
- **Uploads:** User-uploaded images (optional volume mount)
- **Logs:** Application and web server logs

To backup your data:
```bash
# Backup database
docker exec post-portal mysqldump -u postportal -p postportal > backup.sql

# Backup uploads
tar -czf uploads-backup.tar.gz ./storage/
```

## 🔧 Development Setup

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

### Development Features

The development setup includes:
- 🔄 **Live code reloading:** Source files mounted as volumes
- 📧 **Mailpit:** Local SMTP server for email testing
- 🗄️ **PHPMyAdmin:** Database management interface
- 🔍 **Debug logging:** PHP errors logged to `logs/php_errors.log`

### Making Changes

All source code is in the `src/` directory:
- `src/*.php` - Page controllers
- `src/templates/*.tpl` - Smarty templates
- `src/css/` - Stylesheets
- `src/js/` - JavaScript files
- `src/api/` - API endpoints
- `src/functions.php` - Shared business logic

Changes are immediately reflected (no rebuild required).

## 📦 Container Architecture

This project uses a monolithic container approach for simplicity:

```
┌─────────────────────────────────────────┐
│   Post Portal Container                  │
│                                          │
│  ┌────────────┐  ┌──────────────┐      │
│  │   Nginx    │  │   PHP-FPM    │      │
│  │   :80      │  │   :9000      │      │
│  └────────────┘  └──────────────┘      │
│                                          │
│  ┌──────────────────────────────────┐  │
│  │       MariaDB :3306              │  │
│  └──────────────────────────────────┘  │
│                                          │
│  Supervised by: supervisord              │
└─────────────────────────────────────────┘
```

**Production:** Pre-built image from `hub.docker.visnovsky.us`
**Development:** Same Dockerfile with source code mounted as volumes

## 🗄️ Database

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

## 🖼️ Media Processing

Upload flow:
1. Client validates file size (20MB) and format
2. Server validates MIME type and extension
3. EXIF metadata stripped (orientation preserved)
4. Original saved to `storage/uploads/originals/`
5. Responsive variants generated: 1600px, 800px, 400px, thumbnail
6. WebP versions created for each variant
7. Database updated with paths and metadata

## 🔐 Security Notes

**Production Checklist:**
- ✅ Set `DEFAULT_ADMIN_PASSWORD` to a strong password in `.env`
- ✅ Set `DEBUG=false` and `SMARTY_DEBUG=false` in production
- ✅ Use strong database passwords
- ✅ Configure proper SMTP credentials
- ✅ Set up reCAPTCHA for login protection
- ✅ Enable HTTPS via reverse proxy (Traefik, nginx, etc.)
- ✅ Regularly backup database and uploads
- ✅ Keep container image updated

## 🏗️ CI/CD

The project uses GitHub Actions to:
1. Build container on every branch push
2. Tag images with branch name (`:main`, `:stage`, `:feature-xyz`)
3. Sign images with Cosign
4. Push to Harbor registry at `hub.docker.visnovsky.us`
5. Generate and attach SBOM (Software Bill of Materials)

**Main branch** is tagged as `:latest` for production.

## 📝 Configuration

### Environment Variables

All sensitive configuration moved to environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `MYSQL_DATABASE` | Database name | `postportal` |
| `MYSQL_USER` | Database user | `postportal` |
| `MYSQL_PASSWORD` | Database password | `secure_password` |
| `MYSQL_ROOT_PASSWORD` | MySQL root password | `secure_root` |
| `DEFAULT_ADMIN_PASSWORD` | Initial admin password | `changeme_admin` |
| `DEBUG` | Enable debug mode | `false` |
| `SMARTY_DEBUG` | Enable Smarty debug | `false` |
| `OPENAI_API_KEY` | OpenAI API key (optional) | `sk-...` |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_SECURE` | Encryption type | `tls` or `ssl` |
| `SMTP_AUTH` | Enable SMTP auth | `true` or `false` |
| `SMTP_USERNAME` | SMTP username | `user@gmail.com` |
| `SMTP_PASSWORD` | SMTP password | `app_password` |
| `SMTP_FROM_EMAIL` | From email address | `noreply@domain.com` |
| `RECAPTCHA_SITE_KEY` | reCAPTCHA site key | `6Le...` |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA secret | `6Le...` |

### Application Settings

Default settings in `src/config.template.php`:
- Image quality: 85% (JPEG and WebP)
- Max upload size: 20MB
- Responsive breakpoints: 1600px, 800px, 400px
- Allowed formats: JPEG, PNG, HEIC, WebP

## 🛠️ Troubleshooting

**Container won't start:**
```bash
# Check logs
docker logs post-portal

# Verify environment variables
docker exec post-portal env | grep MYSQL
```

**Database connection issues:**
```bash
# Connect to container
docker exec -it post-portal bash

# Test MySQL connection
mysql -u postportal -p
```

**Reset development database:**
```bash
cd docker
sudo docker compose -f docker-compose.dev.yml down -v
sudo docker compose -f docker-compose.dev.yml up --build
```

## 📄 License

TBD

## 🤝 Contributing

Contributions welcome! Please submit pull requests to the appropriate branch.

---

**Built with** ❤️ **using PHP, Smarty, Docker, and lots of coffee**
