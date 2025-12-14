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
- Start/stop via workspace tasks: "Start/Stop/Rebuild Development Docker Stack".
- Dev services: App, PHPMyAdmin (port 82), Mailpit (port 83).
- Source code in `src/` is mounted for live reload.

## Config and secrets
- App config: `src/config.template.php` reads from `getenv()`.
- Never commit `.env` or `src/config.php`.
- Production uses same template with different env values.

## Database and migrations
- SQL files in `migrations/`; auto-run on container startup.
- Manual: `docker exec post-updates /docker-scripts/run-migrations.sh`.
- Keep migrations idempotent; use incremental, zero-padded prefixes.

## PHP coding standards
- **Strict typing**: All PHP files must have `declare(strict_types=1);` and full type hints on parameters/returns.
- **Prepared statements**: Always use parameterized queries via `BaseRepository::execute()`. Never concatenate user input into SQL.
- **OOP architecture**: New code should use classes. Services go in `Service/`, repositories in `Repository/`, with interfaces.
- **Dependency injection**: Use `ServiceContainer` for instantiating services; inject dependencies via constructor.
- **Exception handling**: Wrap code in try-catch. Never expose internal errors to users. Log errors, return generic messages.
- **HTTP status codes**: Use `ErrorResponse` helper methods (`unauthorized()`, `forbidden()`, `badRequest()`, `notFound()`, etc.) for proper HTTP codes.
- **No HTML in PHP**: Functions must not return HTML. All markup goes in Smarty templates.

## Smarty templating
- Pass data: `$smarty->assign('name', $value)`.
- Templates: `{$name}`, `{if}`, `{foreach}`.
- Business logic in PHP; presentation in templates only.

## JavaScript event handling
- Event delegation: Use global `document` listeners for modal buttons.
- Pattern: `e.target.closest` for button class, then `btn.closest` for modal ID.

## File structure
- `docker/` – Dockerfile(s), compose, nginx, scripts.
- `src/` – PHP app (Service/, Repository/, Container/, Http/, Page/, templates/, lib/).
- `migrations/` – SQL migrations.

## CI/CD
- GitHub Actions builds/signs/pushes image to Harbor registry.
