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

// Assign variables to Smarty
$smarty->assign('page_title', 'Admin');
$smarty->assign('csrf_token', $csrf);
$smarty->assign('current_user', $_SESSION['username'] ?? 'admin');

// Don't call $smarty->display() - let the framework's index.tpl handle rendering
