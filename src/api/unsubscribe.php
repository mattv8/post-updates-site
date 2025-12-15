<?php

declare(strict_types=1);

/**
 * Newsletter Unsubscribe API
 * Handles unsubscribe requests from email links
 */

use PostPortal\Container\ServiceContainer;
use PostPortal\Http\ErrorResponse;
use PostPortal\Http\ViewRenderer;

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../Http/ViewRenderer.php';

/**
 * Initialize unsubscribe page context.
 * Similar to bootstrapApi but returns Smarty for template rendering.
 *
 * @return array{container: ServiceContainer, db: mysqli, smarty: \Smarty\Smarty}
 */
function bootstrapUnsubscribe(): array
{
    ensureSession();

    require __DIR__ . '/../config.php';
    $db = getDefaultDbConnection();
    if (!$db) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database connection failed']);
        exit;
    }

    $container = ServiceContainer::getInstance($db);

    // Use ViewRenderer for consistent Smarty initialization
    $view = ViewRenderer::fromSmarty(null, false);
    $smarty = $view->getSmarty();

    // Get site settings for consistent branding
    $settings = $container->getSettingsRepository()->getSettings();
    $smarty->assign('settings', $settings);

    return [
        'container' => $container,
        'db' => $db,
        'smarty' => $smarty,
    ];
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    ['container' => $container, 'smarty' => $smarty] = bootstrapUnsubscribe();
    $newsletterRepo = $container->getNewsletterRepository();

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

        // Check if email exists in database using repository
        $subscriber = $newsletterRepo->findByEmail($email);

        if (!$subscriber) {
            // Email not found
            $smarty->assign('status', 'info');
            $smarty->assign('info_title', 'Not Subscribed');
            $smarty->assign('info_message', 'You are not currently subscribed to our mailing list.');
            $smarty->assign('page_title', 'Not Subscribed');
            $smarty->display('unsubscribe.tpl');
            exit;
        }

        if ((int)$subscriber['is_active'] === 0) {
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
            ErrorResponse::json(419, 'CSRF validation failed');
        }

        // Validate unsubscribe token
        $email = validateUnsubscribeToken($token);

        if ($email === false) {
            ErrorResponse::badRequest('Invalid unsubscribe token');
        }

        // Deactivate the subscriber using repository
        $success = $newsletterRepo->unsubscribe($email);

        if ($success) {
            ErrorResponse::success([
                'message' => 'You have been successfully unsubscribed from our mailing list.',
            ]);
        } else {
            ErrorResponse::success([
                'message' => 'You are not currently subscribed to our mailing list.',
            ]);
        }
    }

    // Method not allowed
    ErrorResponse::json(405, 'Method not allowed');
} catch (\Throwable $e) {
    error_log('API error in unsubscribe.php: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Internal server error']);
    exit;
}
