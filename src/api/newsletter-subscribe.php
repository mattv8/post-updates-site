<?php

declare(strict_types=1);

/**
 * Newsletter Subscription API
 * Handles email subscription submissions from the mailing list form
 */
header('Content-Type: application/json');
require_once(__DIR__ . '/../functions.php');

// DB connect
require(__DIR__ . '/../config.local.php');
$db_conn = mysqli_connect($db_servername, $db_username, $db_password, $db_name);
if (!$db_conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Get JSON payload
$payload = json_decode(file_get_contents('php://input'), true);

if (!$payload || !isset($payload['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Email is required']);
    exit;
}

$email = trim($payload['email']);

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid email format']);
    exit;
}

// Additional email validation - length check
if (strlen($email) > 255) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Email address too long']);
    exit;
}

// Sanitize email
$email = strtolower($email);

// Get IP address for logging
$ip_address = $_SERVER['REMOTE_ADDR'] ?? null;

// Check if email already exists (including archived subscriptions)
$check_sql = "SELECT id, is_active FROM newsletter_subscribers WHERE email = ?";
$check_stmt = mysqli_prepare($db_conn, $check_sql);
mysqli_stmt_bind_param($check_stmt, 's', $email);
mysqli_stmt_execute($check_stmt);
$result = mysqli_stmt_get_result($check_stmt);
$existing = mysqli_fetch_assoc($result);

if ($existing) {
    if ($existing['is_active'] == 1) {
        // Already subscribed and active
        echo json_encode([
            'success' => true,
            'message' => 'You are already subscribed',
            'already_subscribed' => true
        ]);
        exit;
    } else {
        // Previously archived, reactivate
        $update_sql = "UPDATE newsletter_subscribers SET is_active = 1, subscribed_at = CURRENT_TIMESTAMP, ip_address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        $update_stmt = mysqli_prepare($db_conn, $update_sql);
        mysqli_stmt_bind_param($update_stmt, 'si', $ip_address, $existing['id']);

        if (mysqli_stmt_execute($update_stmt)) {
            echo json_encode([
                'success' => true,
                'message' => 'Successfully resubscribed to the mailing list',
                'resubscribed' => true
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to resubscribe']);
        }
        exit;
    }
}

// Insert new subscription
$insert_sql = "INSERT INTO newsletter_subscribers (email, ip_address, is_active, subscribed_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP)";
$insert_stmt = mysqli_prepare($db_conn, $insert_sql);
mysqli_stmt_bind_param($insert_stmt, 'ss', $email, $ip_address);

if (mysqli_stmt_execute($insert_stmt)) {
    echo json_encode([
        'success' => true,
        'message' => 'Successfully subscribed to the mailing list'
    ]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to subscribe: ' . mysqli_error($db_conn)]);
}

mysqli_close($db_conn);
