<?php

declare(strict_types=1);

use mysqli;
use PostPortal\Container\ServiceContainer;
use PostPortal\Http\ViewRenderer;

require_once __DIR__ . '/functions.php';

// Repositories
require_once __DIR__ . '/Repository/BaseRepository.php';
require_once __DIR__ . '/Repository/PostRepositoryInterface.php';
require_once __DIR__ . '/Repository/PostRepository.php';
require_once __DIR__ . '/Repository/MediaRepositoryInterface.php';
require_once __DIR__ . '/Repository/MediaRepository.php';
require_once __DIR__ . '/Repository/NewsletterRepositoryInterface.php';
require_once __DIR__ . '/Repository/NewsletterRepository.php';
require_once __DIR__ . '/Repository/SettingsRepositoryInterface.php';
require_once __DIR__ . '/Repository/SettingsRepository.php';

// Services
require_once __DIR__ . '/Service/PostService.php';
require_once __DIR__ . '/Service/MediaService.php';
require_once __DIR__ . '/Service/NewsletterService.php';

// Container and View
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
    $db = getDefaultDbConnection();
    $defaults = getAppDefaults();
    $authType = $defaults['auth_type'];
    $defaultPage = $defaults['default_page'];
    $defaultLogo = $defaults['default_logo'];
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
            'default_logo' => $defaultLogo,
            'default_page' => $defaultPage,
            'auth_type' => $authType,
        ],
    ];
}
