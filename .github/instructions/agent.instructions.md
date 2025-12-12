---
applyTo: '**'
---
## Stack and containers
- PHP + MariaDB; Bootstrap 5 UI.
- Standalone app (no external framework).
- Single container (nginx + PHP-FPM + MariaDB via supervisord).
- Production image: `hub.docker.visnovsky.us/library/post-portal` (app bundled).
- Development: same Dockerfile, app source mounted from `src/`.

## Dev workflow
- Start/stop via workspace tasks:
	- "Start Development Docker Stack"
	- "Stop Development Docker Stack"
	- "Rebuild Development Docker Stack"
- Dev services: App, PHPMyAdmin (port 82), Mailpit (port 83).
- Source code in `src/` is mounted for live reload.

## Config and secrets
- App config: `src/config.template.php` reads from `getenv()`.
- Never commit `.env` or `src/config.php`.
- Common env vars: `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, SMTP settings, OpenAI API, reCAPTCHA.
- Production uses same template with different env values.

## Database and migrations
- SQL migration files live in `migrations/`; auto-run on container startup.
- Manual run (dev): `docker exec post-updates /docker-scripts/run-migrations.sh`.
- Keep migrations idempotent; add new files with incremental, zero-padded prefixes.

## Smarty templating
- Pass data in PHP: `$smarty->assign('name', $value)`.
- Templates: `{$name}`, `{if}`, `{foreach}`.
- Business logic in PHP; presentation in templates only.

## JavaScript event handling
- Event delegation: Use global `document` listeners for modal buttons; clicks don't always bubble through Bootstrap modals.
- Pattern: Check e.target.closest for button class, then verify btn.closest for modal ID to scope handlers to specific modals.

## Framework management
- No external framework; all app-specific code lives in `src/`.

## File structure
- `docker/` – Dockerfile(s), compose, nginx config, scripts.
- `src/` – PHP app, templates, CSS, JS.
- `migrations/` – SQL migrations.
- Root `docker-compose.yml` – production deployment.

## CI/CD
- GitHub Actions builds/signs/pushes image to Harbor registry.
- Production uses bundled framework; no external mounts.

## Quick checks
- App up: container running; open site.
- Tools: PHPMyAdmin http://localhost:82, Mailpit http://localhost:83.
- Migrations: check container logs or run the migrations script.
- Permissions: mounted volumes writable by container.

## References
- None
