<?php

declare(strict_types=1);

use PostPortal\Container\ServiceContainer;
use PostPortal\Http\ErrorResponse;

require_once __DIR__ . '/../functions.php';

// Repositories
require_once __DIR__ . '/../Repository/BaseRepository.php';
require_once __DIR__ . '/../Repository/PostRepositoryInterface.php';
require_once __DIR__ . '/../Repository/PostRepository.php';
require_once __DIR__ . '/../Repository/MediaRepositoryInterface.php';
require_once __DIR__ . '/../Repository/MediaRepository.php';
require_once __DIR__ . '/../Repository/NewsletterRepositoryInterface.php';
require_once __DIR__ . '/../Repository/NewsletterRepository.php';
require_once __DIR__ . '/../Repository/SettingsRepositoryInterface.php';
require_once __DIR__ . '/../Repository/SettingsRepository.php';

// Service Interfaces
require_once __DIR__ . '/../Service/PostServiceInterface.php';
require_once __DIR__ . '/../Service/MediaServiceInterface.php';
require_once __DIR__ . '/../Service/NewsletterServiceInterface.php';

// Services
require_once __DIR__ . '/../Service/PostService.php';
require_once __DIR__ . '/../Service/MediaService.php';
require_once __DIR__ . '/../Service/NewsletterService.php';

// Container and HTTP helpers
require_once __DIR__ . '/../Container/ServiceContainer.php';
require_once __DIR__ . '/../Http/ErrorResponse.php';
require_once __DIR__ . '/../Http/ApiHandler.php';

/**
 * Initialize API execution context with shared behaviors (headers, session, auth, DB, services).
 *
 * @return array{container: ServiceContainer, db: mysqli}
 */
function bootstrapApi(bool $requireAuth = false, bool $requireAdmin = false): array
{
    header('Content-Type: application/json');
    ensureSession();

    if ($requireAuth && (empty($_SESSION['authenticated']) || empty($_SESSION['username']))) {
        ErrorResponse::unauthorized('Unauthorized');
    }

    if ($requireAdmin && isset($_SESSION['isadmin']) && !$_SESSION['isadmin']) {
        ErrorResponse::forbidden('Forbidden');
    }

    require __DIR__ . '/../config.php';
    $db = getDefaultDbConnection();
    if (!$db) {
        ErrorResponse::internalError('DB connection failed');
    }

    return [
        'container' => ServiceContainer::getInstance($db),
        'db' => $db,
    ];
}

/**
 * Enforce CSRF validation for state-changing requests.
 */
function requireCsrfToken(): void
{
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? '');
    if (!validateCsrfToken($token)) {
        ErrorResponse::json(419, 'CSRF validation failed');
    }
}

/**
 * Decode JSON payload safely.
 *
 * @return array<string, mixed>
 */
function readJsonInput(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false) {
        ErrorResponse::badRequest('Failed to read request body');
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return [];
    }

    return $decoded;
}
