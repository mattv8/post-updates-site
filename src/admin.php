<?php
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

// Get subscriber counts for initial UI state
$active_subscriber_count = getActiveSubscriberCount($db_conn);
$total_subscriber_count = getTotalSubscriberCount($db_conn);

// Assign variables to Smarty
$smarty->assign('page_title', 'Admin');
$smarty->assign('csrf_token', $csrf);
$smarty->assign('current_user', $_SESSION['username'] ?? 'admin');
$smarty->assign('active_subscriber_count', $active_subscriber_count);
$smarty->assign('total_subscriber_count', $total_subscriber_count);
$smarty->assign('default_ai_prompt', DEFAULT_AI_SYSTEM_PROMPT);

// Don't call $smarty->display() - let the framework's index.tpl handle rendering
