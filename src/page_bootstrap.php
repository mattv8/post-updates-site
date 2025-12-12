<?php

declare(strict_types=1);

use mysqli;
use PostPortal\Container\ServiceContainer;
use PostPortal\Http\ViewRenderer;

require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/Container/ServiceContainer.php';
require_once __DIR__ . '/Http/ViewRenderer.php';

/**
 * Bootstrap shared page context: session, auth, DB, DI, and view renderer.
 *
 * @return array{container: ServiceContainer, db: mysqli, view: ViewRenderer, config: array<string, mixed>}
 */
function bootstrapPageContext(bool $requireAuth = false, bool $requireAdmin = false): array
{
    ensureSession();

    if ($requireAuth && (empty($_SESSION['authenticated']) || empty($_SESSION['username']))) {
        header('Location: /?page=login');
        exit;
    }

    if ($requireAdmin && isset($_SESSION['isadmin']) && !$_SESSION['isadmin']) {
        echo 'You do not have access to this page.';
        exit;
    }

    require __DIR__ . '/config.php';
    $db = getDbConnection($db_servername, $db_username, $db_password, $db_name);
    if (!$db) {
        http_response_code(500);
        echo 'Database connection failed';
        exit;
    }

    $container = ServiceContainer::getInstance($db);
    $view = ViewRenderer::fromSmarty($smarty ?? null, (bool) ($smarty_debug ?? false));

    return [
        'container' => $container,
        'db' => $db,
        'view' => $view,
        'config' => [
            'default_admin_password' => $default_admin_password ?? '',
            'default_logo' => $logo ?? '/images/default-logo.svg',
            'default_page' => $default_page ?? 'home',
            'public_pages' => $public_pages ?? [],
            'auth_type' => $auth_type ?? 'none',
        ],
    ];
}
