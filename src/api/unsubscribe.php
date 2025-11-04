<?php
/**
 * Newsletter Unsubscribe API
 * Handles unsubscribe requests from email links
 */
require_once(__DIR__ . '/../functions.php');
ensureSession();

// DB connect
require(__DIR__ . '/../config.local.php');
$db_conn = mysqli_connect($db_servername, $db_username, $db_password, $db_name);
if (!$db_conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

// Get site settings for consistent branding
$settings = getSettings($db_conn);

// Initialize Smarty
require_once(__DIR__ . '/../framework/vendor/smarty4/libs/Smarty.class.php');
$smarty = new Smarty();
$smarty->setTemplateDir(__DIR__ . '/../templates');
$smarty->setCompileDir(__DIR__ . '/../cache');
$smarty->setCacheDir(__DIR__ . '/../cache');

// Assign settings to all unsubscribe page views
$smarty->assign('settings', $settings);

$method = $_SERVER['REQUEST_METHOD'];

// Handle GET request - show confirmation page
if ($method === 'GET') {
    $token = $_GET['token'] ?? '';

    if (empty($token)) {
        http_response_code(400);
        $smarty->assign('status', 'error');
        $smarty->assign('error_title', 'Invalid Unsubscribe Link');
        $smarty->assign('error_message', 'The unsubscribe link you followed is invalid.');
        $smarty->assign('page_title', 'Invalid Link');
        $smarty->display('unsubscribe.tpl');
        exit;
    }

    // Validate token (no expiration check)
    $email = validateUnsubscribeToken($token);

    if ($email === false) {
        http_response_code(400);
        $smarty->assign('status', 'error');
        $smarty->assign('error_title', 'Invalid Unsubscribe Link');
        $smarty->assign('error_message', 'The unsubscribe link you followed is invalid.');
        $smarty->assign('page_title', 'Invalid Link');
        $smarty->display('unsubscribe.tpl');
        exit;
    }

    // Check if email exists in database
    $check_sql = "SELECT id, email, is_active FROM newsletter_subscribers WHERE email = ?";
    $check_stmt = mysqli_prepare($db_conn, $check_sql);
    mysqli_stmt_bind_param($check_stmt, 's', $email);
    mysqli_stmt_execute($check_stmt);
    $result = mysqli_stmt_get_result($check_stmt);
    $subscriber = mysqli_fetch_assoc($result);

    if (!$subscriber) {
        // Email not found
        $smarty->assign('status', 'info');
        $smarty->assign('info_title', 'Not Subscribed');
        $smarty->assign('info_message', 'You are not currently subscribed to our mailing list.');
        $smarty->assign('page_title', 'Not Subscribed');
        $smarty->display('unsubscribe.tpl');
        exit;
    }

    if ($subscriber['is_active'] == 0) {
        // Already unsubscribed
        $smarty->assign('status', 'info');
        $smarty->assign('info_title', 'Already Unsubscribed');
        $smarty->assign('info_message', 'You have already been unsubscribed from our mailing list.');
        $smarty->assign('page_title', 'Already Unsubscribed');
        $smarty->display('unsubscribe.tpl');
        exit;
    }

    // Generate CSRF token for the form
    $csrf_token = generateCsrfToken();

    // Show confirmation form
    $masked_email = substr($email, 0, 3) . '***@' . explode('@', $email)[1];

    $smarty->assign('status', 'confirm');
    $smarty->assign('masked_email', $masked_email);
    $smarty->assign('token', $token);
    $smarty->assign('csrf_token', $csrf_token);
    $smarty->assign('page_title', 'Confirm Unsubscribe');
    $smarty->display('unsubscribe.tpl');
    exit;
}

// Handle POST request - process unsubscribe
if ($method === 'POST') {
    header('Content-Type: application/json');

    // Get form data
    $token = $_POST['token'] ?? '';
    $csrf_token = $_POST['csrf_token'] ?? '';

    // Validate CSRF token
    if (!validateCsrfToken($csrf_token)) {
        http_response_code(419);
        echo json_encode(['success' => false, 'error' => 'CSRF validation failed']);
        exit;
    }

    // Validate unsubscribe token
    $email = validateUnsubscribeToken($token);

    if ($email === false) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid unsubscribe token']);
        exit;
    }

    // Deactivate the subscriber
    $update_sql = "UPDATE newsletter_subscribers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE email = ?";
    $update_stmt = mysqli_prepare($db_conn, $update_sql);
    mysqli_stmt_bind_param($update_stmt, 's', $email);

    if (mysqli_stmt_execute($update_stmt)) {
        $affected_rows = mysqli_stmt_affected_rows($update_stmt);

        if ($affected_rows > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'You have been successfully unsubscribed from our mailing list.'
            ]);
        } else {
            echo json_encode([
                'success' => true,
                'message' => 'You are not currently subscribed to our mailing list.'
            ]);
        }
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to unsubscribe. Please try again.']);
    }

    mysqli_close($db_conn);
    exit;
}

// Method not allowed
http_response_code(405);
header('Content-Type: application/json');
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
exit;
