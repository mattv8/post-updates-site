# PostPortal Refactor & Security Playbook

**Scope:** User code in `src/` (5,700+ LOC; excludes vendor/, migrations/)

This is the single source of truth for refactoring PostPortal. Use the master checklist to track work; follow the phase order unless directed otherwise. Do not stop until you have validated that all phases are complete.

---

## Quick Start (Work Order)
1) **Phase 1 – Security foundation:** Convert all SQL to prepared statements; add input validation and HTTP status codes; wrap DB calls with error handling.
2) **Phase 2 – Types & architecture:** Add `declare(strict_types=1);`, parameter/return types, namespaces, and DI scaffolding; move DB logic into repositories/services.
3) **Phase 3 – Standards & cleanup:** Separate logic from presentation, remove globals, wrap external calls (Imagick, file ops) in try/catch, standardize responses.
4) **Phase 4 – Testing & polish:** e2e tests with Playwright (100%+ target), static analysis (PHPStan lvl 8), security scans (SQLMap, OWASP ZAP).

**Quick wins (do immediately):**
- Add consistent HTTP status codes via a helper.
- Validate all incoming params ($_GET/$_POST/$_FILES).
- Add error logging around DB operations.
- Complete adding types to ALL php files within the scope with `declare(strict_types=1);` + basic type hints.

---

## Master Checklist

### Phase 1 – Critical Security
- [ ] Audit ALL (~100+) SQL query points; remove all string-concatenated queries.
- [ ] Convert to prepared statements: `src/functions.php` (10+), `src/api/admin/posts.php` (8+), `src/api/admin/dashboard.php` (10+), `src/api/admin/newsletter.php` (2+), `src/api/newsletter-subscribe.php` (4+), `src/lib/demo_seed.php` (15+).
- [ ] Remove every `mysqli_real_escape_string()` call.
- [ ] Add `safeQuery()`/BaseRepository helper to enforce prepared statements.
- [ ] Add input validation to every endpoint; reject missing/invalid params early.
- [ ] Standardize HTTP status codes (400/401/403/404/409/422/500).
- [ ] Wrap all DB calls in try/catch; log context; avoid leaking internals.

### Phase 2 – Architecture & Type Safety
- [ ] Add `declare(strict_types=1);` to all `src/` PHP files.
- [ ] Add parameter/return types to all functions (start with `functions.php`, then api/*.php, admin.php).
- [ ] Introduce PSR-4 structure with `src/` as the PSR-4 root (namespace prefix `PostPortal\`).
- [ ] Create interfaces (e.g., `PostRepositoryInterface`, `MediaProcessorInterface`, `LoggerInterface`).
- [ ] Create repositories (Post, User, Media, Newsletter) and services (PostService, MediaService, NotificationService).
- [ ] Add a lightweight DI container or constructor injection wiring.
- [ ] Update API endpoints to use services instead of global functions.

### Phase 3 – Standards & Cleanup
- [ ] Eliminate logic/presentation mixing; move HTML to Smarty templates; keep APIs JSON-only.
- [ ] Remove globals (`$debug`, `$logo`, `$smarty`); replace with Config/Request objects injected where needed.
- [ ] Wrap external libraries (Imagick, file I/O) in try/catch with contextual logging.
- [ ] Ensure all error paths set an appropriate HTTP code and JSON payload.
- [ ] Normalize response helpers (e.g., `apiError()`, `ErrorResponse`).

### Phase 4 – Testing & Polish
- [ ] Unit tests for all repositories/services (use seed data, avoid mocks unless absolutely necessary DB).
- [ ] e2e and integration tests for API endpoints (test DB).
- [ ] Security tests: SQLMap, OWASP ZAP.
- [ ] Static analysis: PHPStan level 8.
- [ ] Target 99%+ coverage; add CI tasks for lint/analyze/test.

---

## Critical Issues (Do First)

### SQL Injection (CRITICAL)
- 18+ concatenated queries; 6+ `mysqli_real_escape_string()` uses; prepared statements rare.
- Primary hotspots: `src/functions.php`, `src/api/admin/posts.php`, `src/lib/demo_seed.php`, `src/api/admin/newsletter.php`.
- Fix pattern:
```php
$stmt = mysqli_prepare($db, 'SELECT * FROM posts WHERE id = ?');
mysqli_stmt_bind_param($stmt, 'i', $id);
mysqli_stmt_execute($stmt);
$row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
```

### Missing Error Handling (CRITICAL)
- 62% of code lacks try/catch; DB and external errors leak or fail silently.
- Add try/catch around DB, Imagick, and file I/O; log context; return JSON with proper codes.

---

## High-Severity Issues
- **Missing type hints:** 78% of functions untyped; add `declare(strict_types=1);` and full signatures.
- **No namespaces / DI:** All in global namespace; add PSR-4, interfaces, constructor injection.
- **Mixed logic + presentation:** 12 functions emit HTML; return data and render via Smarty instead.
- **Globals:** `$debug`, `$logo`, `$smarty` create hidden dependencies; replace with injected config/services.
- **HTTP codes inconsistent:** Some errors return 200; enforce standard codes with helpers.

---

## Architecture Plan
- **PSR-4 root:** `src/` with namespace prefix `PostPortal\` (e.g., `PostPortal\Post\PostRepository`).
- **Repositories:** One per aggregate (Post, User, Media, Newsletter); all DB queries live here; use prepared statements exclusively.
- **Services:** Orchestrate business logic; depend on repositories + collaborators (notifications, media).
- **Helpers:** `ErrorResponse` (HTTP/JSON), `BaseRepository` (prepared statements + binding), Config/Request abstractions to remove globals.
- **API endpoints:** Thin controllers; validate input, call services, return JSON with codes.

---

## Patterns & Templates

**Error responder**
```php
declare(strict_types=1);

namespace PostPortal\Http;

class ErrorResponse {
    public static function json(int $code, string $message, array $extra = []): void {
        http_response_code($code);
        echo json_encode(array_merge(['success' => false, 'error' => $message], $extra));
        exit;
    }
}
```

**Base repository (prepared statements + error logging)**
```php
declare(strict_types=1);

namespace PostPortal\Repository;

abstract class BaseRepository {
    public function __construct(protected \mysqli $db) {}

    protected function execute(string $sql, array $params = []): \mysqli_result|bool {
        try {
            if (!$params) {
                $result = $this->db->query($sql);
                if (!$result) {
                    throw new \RuntimeException('Query failed: ' . $this->db->error);
                }
                return $result;
            }

            $stmt = $this->db->prepare($sql);
            if (!$stmt) {
                throw new \RuntimeException('Prepare failed: ' . $this->db->error);
            }

            $types = '';
            foreach ($params as $param) {
                $types .= match (true) {
                    is_int($param) => 'i',
                    is_float($param) => 'd',
                    is_string($param) => 's',
                    default => 's',
                };
            }

            $stmt->bind_param($types, ...$params);
            if (!$stmt->execute()) {
                throw new \RuntimeException('Execute failed: ' . $stmt->error);
            }

            return $stmt->get_result();
        } catch (\Throwable $e) {
            error_log('DB error: ' . $e->getMessage());
            throw $e;
        }
    }
}
```

**Controller wrapper**
```php
function handleApi(callable $fn): void {
    try {
        $fn();
    } catch (\Throwable $e) {
        error_log('API error: ' . $e->getMessage());
        \PostPortal\Http\ErrorResponse::json(500, 'Internal server error');
    }
}
```

---

## Verification Checklist (per phase)
- **Security:** No raw SQL concatenation; all DB errors logged; all inputs validated; HTTP codes correct.
- **Architecture:** All files `declare(strict_types=1);`; namespaced; interfaces exist; dependencies injected.
- **Standards:** No HTML returned from logic; external calls wrapped; zero globals.
- **Testing:** 80%+ coverage; PHPStan lvl 8 clean; SQLMap and ZAP clean.

---

## Metrics, Hotspots, and Effort
- **Metrics (current → target):** Types 22%→100%; Prepared statements 5%→100%; Error handling 38%→100%; Namespaces 0%→100%; Tests 0%→80%+.
- **Hot files:** `src/functions.php` (1837 LOC), `src/api/admin/posts.php`, `src/lib/demo_seed.php`, `src/api/admin/newsletter.php`, `src/api/newsletter-subscribe.php`, `src/api/admin/media.php`, `src/admin.php`, `src/home.php`.
- **Effort (est.):** 188–250 hours total (5–7 weeks); Phase 1 ~55h, Phase 2 ~120h, Phase 3 ~35h, Phase 4 ~40h.
- **Priority order:** SQL injection → Error handling → Type hints → DI/Namespaces → Logic/presentation split → Globals → Tests.

---

## Testing & Tooling
- **Unit tests:** PHPUnit 10+, mock DB for repositories/services.
- **Integration:** API flows with test DB (post CRUD, media upload, newsletter).
- **Security:** SQLMap for injection, OWASP ZAP for web vulns.
- **Static analysis:** PHPStan lvl 8, Psalm optional; PHPCS for standards.
- **Suggested installs:** `phpstan/phpstan`, `vimeo/psalm`, `squizlabs/php_codesniffer`, `phpunit/phpunit`, `enlightn/security-checker`.
- **CI tasks:** lint → analyze → test → security scan.

---

## Working Notes for Agents
- Do not edit framework files; keep changes under `src/`.
- Keep migrations idempotent and incremental.
- Prefer prepared statements everywhere; no new globals.
- For front-end output, push HTML to Smarty templates; APIs must return JSON.
- When in doubt: secure input, validate types, log with context, return the right HTTP code.
