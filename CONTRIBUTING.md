# Contributing to Post Portal

Contributions welcome! Please submit pull requests to the appropriate branch.

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

2. **Configure development environment:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your values (ports, database, SMTP, etc.).

3. **Start development stack:**

   **Option A: Using VS Code tasks:**
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
   - Select `Tasks: Run Task` → `Start Development Docker Stack`

   **Option B: Manual command line:**
   ```bash
   ./docker/scripts/dev-startup.sh
   cd docker
   sudo docker compose -f docker-compose.dev.yml up --build
   ```

4. **Access development services:**
   - Public site: http://localhost:81 (default `PORT` in dev)
   - Admin panel: http://localhost:81/?page=admin (auto-filled in debug mode)
   - PHPMyAdmin: http://localhost:82
   - Mailpit (email testing): http://localhost:83

### Making Changes

All source code is in the `src/` directory:
- `src/*.php` - Page controllers and bootstrap
- `src/templates/*.tpl` - Smarty templates
- `src/css/` - Stylesheets
- `src/js/` - JavaScript files
- `src/api/` - API endpoints
- `src/Service/` - Business logic services (with interfaces)
- `src/Repository/` - Database repositories (with interfaces)
- `src/Container/` - Dependency injection container
- `src/Http/` - HTTP helpers (ErrorResponse, ApiHandler)
- `src/Page/` - Page controller classes
- `src/lib/` - Utility classes (MediaProcessor, demo seeder)
- `src/functions.php` - Shared helper functions

Changes are immediately reflected (no rebuild required).

### Reset Development Database

```bash
# Quick reset (drops and recreates database, re-runs migrations)
sudo docker exec postportal-dev /docker-scripts/import-database.sh --drop

# Full reset (destroys volume, rebuilds container)
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
