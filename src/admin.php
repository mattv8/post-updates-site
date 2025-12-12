<?php

declare(strict_types=1);

require_once(__DIR__ . '/framework/conf/config.php');
require_once(__DIR__ . '/functions.php');
ensureSession();

// Enforce authentication
if (empty($_SESSION['authenticated']) || empty($_SESSION['username'])) {
    header('Location: /?page=login');
    exit;
}
if (isset($_SESSION['isadmin']) && !$_SESSION['isadmin']) {
    echo 'You do not have access to this page.';
    exit;
}

$csrf = generateCsrfToken();

// Get site settings to honor site title
$settings = getSettings($db_conn);

// Get subscriber counts for initial UI state
$active_subscriber_count = getActiveSubscriberCount($db_conn);
$total_subscriber_count = getTotalSubscriberCount($db_conn);

// Get logo and favicon URLs
$logoUrls = getLogoUrls($db_conn, $settings['logo_media_id'] ?? null);
$faviconUrls = getFaviconUrls($db_conn, $settings['favicon_media_id'] ?? null);

// Assign variables to Smarty
$smarty->assign('settings', $settings);
$smarty->assign('page_title', 'Admin');
$smarty->assign('csrf_token', $csrf);
$smarty->assign('current_user', $_SESSION['username'] ?? 'admin');
$smarty->assign('active_subscriber_count', $active_subscriber_count);
$smarty->assign('total_subscriber_count', $total_subscriber_count);
$smarty->assign('default_ai_prompt', DEFAULT_AI_SYSTEM_PROMPT);
$smarty->assign('logo_url', $logoUrls['logo_url']);
$smarty->assign('logo_srcset_png', $logoUrls['logo_srcset_png']);
$smarty->assign('logo_srcset_webp', $logoUrls['logo_srcset_webp']);
$smarty->assign('favicon_ico', $faviconUrls['favicon_ico']);
$smarty->assign('favicon_svg', $faviconUrls['favicon_svg']);
$smarty->assign('favicon_16', $faviconUrls['favicon_16']);
$smarty->assign('favicon_32', $faviconUrls['favicon_32']);
$smarty->assign('favicon_192', $faviconUrls['favicon_192']);
$smarty->assign('favicon_512', $faviconUrls['favicon_512']);

// Don't call $smarty->display() - let the framework's index.tpl handle rendering
