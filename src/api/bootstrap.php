<?php

declare(strict_types=1);

use mysqli;
use PostPortal\Container\ServiceContainer;
use PostPortal\Http\ErrorResponse;

require_once __DIR__ . '/../functions.php';
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
    $db = getDbConnection($db_servername, $db_username, $db_password, $db_name);
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
