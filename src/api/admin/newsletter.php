<?php

declare(strict_types=1);

/**
 * Newsletter Admin API
 * Handles CRUD operations for newsletter subscribers (admin only)
 */
header('Content-Type: application/json');
require_once(__DIR__ . '/../../functions.php');
ensureSession();

// Auth check: require admin
if (empty($_SESSION['authenticated']) || empty($_SESSION['username'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

if (isset($_SESSION['isadmin']) && !$_SESSION['isadmin']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Forbidden']);
    exit;
}

// DB connect
require(__DIR__ . '/../../config.local.php');
$db_conn = mysqli_connect($db_servername, $db_username, $db_password, $db_name);
if (!$db_conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'DB connection failed']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

function requireCsrf() {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? '');
    if (!validateCsrfToken($token)) {
        http_response_code(419);
        echo json_encode(['success' => false, 'error' => 'CSRF validation failed']);
        exit;
    }
}

switch ($method) {
    case 'GET':
        // Get all newsletter subscribers
        $show_archived = isset($_GET['show_archived']) && $_GET['show_archived'] === 'true';

        $sql = "SELECT id, email, subscribed_at, ip_address, is_active, created_at, updated_at
                FROM newsletter_subscribers ";

        if ($show_archived) {
            // Show ONLY archived subscribers
            $sql .= "WHERE is_active = 0 ";
        } else {
            // Show ONLY active subscribers
            $sql .= "WHERE is_active = 1 ";
        }

        $sql .= "ORDER BY subscribed_at DESC";

        $stmt = mysqli_prepare($db_conn, $sql);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);

        if (!$result) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Query failed: ' . mysqli_error($db_conn)]);
            break;
        }

        $subscribers = [];
        while ($row = mysqli_fetch_assoc($result)) {
            $subscribers[] = $row;
        }

        echo json_encode([
            'success' => true,
            'data' => $subscribers,
            'count' => count($subscribers)
        ]);
        break;

    case 'DELETE':
        // Archive (soft delete) a subscriber
        requireCsrf();

        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid subscriber ID']);
            break;
        }

        $sql = "UPDATE newsletter_subscribers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        $stmt = mysqli_prepare($db_conn, $sql);
        mysqli_stmt_bind_param($stmt, 'i', $id);

        if (mysqli_stmt_execute($stmt)) {
            echo json_encode(['success' => true, 'message' => 'Subscriber archived successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to archive subscriber']);
        }
        break;

    case 'PUT':
        // Update subscriber (reactivate or toggle status)
        requireCsrf();

        $payload = json_decode(file_get_contents('php://input'), true);

        if (!$payload || !isset($payload['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Subscriber ID is required']);
            break;
        }

        $id = intval($payload['id']);
        $is_active = isset($payload['is_active']) ? intval($payload['is_active']) : 1;

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid subscriber ID']);
            break;
        }

        $sql = "UPDATE newsletter_subscribers SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        $stmt = mysqli_prepare($db_conn, $sql);
        mysqli_stmt_bind_param($stmt, 'ii', $is_active, $id);

        if (mysqli_stmt_execute($stmt)) {
            echo json_encode(['success' => true, 'message' => 'Subscriber updated successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to update subscriber']);
        }
        break;

    case 'POST':
        // Manually add a subscriber (admin function)
        requireCsrf();

        $payload = json_decode(file_get_contents('php://input'), true);

        if (!$payload || !isset($payload['email'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Email is required']);
            break;
        }

        $email = trim($payload['email']);

        // Validate email
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid email format']);
            break;
        }

        if (strlen($email) > 255) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Email address too long']);
            break;
        }

        $email = strtolower($email);

        // Check for existing email
        $check_sql = "SELECT id, is_active FROM newsletter_subscribers WHERE email = ?";
        $check_stmt = mysqli_prepare($db_conn, $check_sql);
        mysqli_stmt_bind_param($check_stmt, 's', $email);
        mysqli_stmt_execute($check_stmt);
        $result = mysqli_stmt_get_result($check_stmt);
        $existing = mysqli_fetch_assoc($result);

        if ($existing) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Email already exists',
                'is_active' => $existing['is_active']
            ]);
            break;
        }

        // Insert new subscriber
        $insert_sql = "INSERT INTO newsletter_subscribers (email, is_active, subscribed_at) VALUES (?, 1, CURRENT_TIMESTAMP)";
        $insert_stmt = mysqli_prepare($db_conn, $insert_sql);
        mysqli_stmt_bind_param($insert_stmt, 's', $email);

        if (mysqli_stmt_execute($insert_stmt)) {
            $new_id = mysqli_insert_id($db_conn);
            echo json_encode([
                'success' => true,
                'message' => 'Subscriber added successfully',
                'id' => $new_id
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to add subscriber']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}

mysqli_close($db_conn);
