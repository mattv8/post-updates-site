<?php

declare(strict_types=1);

use PostPortal\Container\ServiceContainer;
use PostPortal\Http\ViewRenderer;
use PostPortal\Page\AdminPage;
use PostPortal\Page\HomePage;

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/Container/ServiceContainer.php';
require_once __DIR__ . '/Http/ViewRenderer.php';
require_once __DIR__ . '/page_bootstrap.php';
require_once __DIR__ . '/Page/HomePage.php';
require_once __DIR__ . '/Page/AdminPage.php';
require_once __DIR__ . '/config.php';

ensureSession();

// Determine requested page and defaults.
$page = $_GET['page'] ?? ($default_page ?? 'home');
$isAuthenticated = !empty($_SESSION['authenticated']);
$isAdmin = !empty($_SESSION['isadmin']);

// Build common services.
$db = getDbConnection($db_servername, $db_username, $db_password, $db_name);
if (!$db) {
	http_response_code(500);
	echo 'Database connection failed';
	exit;
}

$container = ServiceContainer::getInstance($db);
$view = ViewRenderer::fromSmarty($smarty ?? null, (bool) ($smarty_debug ?? false));

$baseData = [
	'page' => $page,
	'public_pages' => $public_pages ?? [],
	'auth_type' => $auth_type ?? 'none',
	'authenticated' => $isAuthenticated,
	'isadmin' => $isAdmin,
	'currentUser' => $_SESSION['username'] ?? null,
	'displayname' => $_SESSION['displayname'] ?? ($_SESSION['username'] ?? ''),
	'default_page' => $default_page ?? 'home',
	'default_admin_password' => $default_admin_password ?? '',
	'js_config' => $js_config ?? [],
	'debug' => $debug ?? false,
	'page_bg_color_class' => $page_bg_color_class ?? '',
];

// Generate CSRF token when authenticated so templates can pick it up.
if ($isAuthenticated) {
	$baseData['csrf_token'] = generateCsrfToken();
}

// Decide which page builder to use.
$pageData = [];
switch ($page) {
	case 'admin':
		if (!$isAuthenticated || !$isAdmin) {
			header('Location: /?page=login');
			exit;
		}

		$adminPage = new AdminPage($container, $db, $logo ?? '/images/default-logo.svg');
		$pageData = $adminPage->build();
		break;

	case 'login':
		// Keep login lean; settings ensure consistent branding on the login screen.
		$settings = getSettings($db);
		$logoUrls = getLogoUrls($db, $settings['logo_media_id'] ?? null, $logo ?? '/images/default-logo.svg');
		$faviconUrls = getFaviconUrls($db, $settings['favicon_media_id'] ?? null);
		$pageData = [
			'settings' => $settings,
			'logo_url' => $logoUrls['logo_url'],
			'logo_srcset_png' => $logoUrls['logo_srcset_png'],
			'logo_srcset_webp' => $logoUrls['logo_srcset_webp'],
			'favicon_ico' => $faviconUrls['favicon_ico'],
			'favicon_svg' => $faviconUrls['favicon_svg'],
			'favicon_16' => $faviconUrls['favicon_16'],
			'favicon_32' => $faviconUrls['favicon_32'],
			'favicon_192' => $faviconUrls['favicon_192'],
			'favicon_512' => $faviconUrls['favicon_512'],
			'msg_login' => 'Login',
			'msg_username' => 'Username',
			'msg_password' => 'Password',
			'msg_submit' => 'Submit',
			'msg_logout' => 'Logout',
		];
		break;

	default:
		$homePage = new HomePage($container, $db, $logo ?? '/images/default-logo.svg');
		$pageData = $homePage->build();
		break;
}

// Render the page using the unified template.
$view->assign(array_merge($baseData, $pageData));
$view->getSmarty()->display('index.tpl');
