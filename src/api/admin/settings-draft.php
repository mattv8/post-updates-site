<?php
/**
 * Settings Draft API
 * Handles auto-save operations to draft fields for settings
 * Draft content is saved here without affecting published content
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
    case 'PUT':
        // Auto-save draft content for settings
        requireCsrf();

        $payload = json_decode(file_get_contents('php://input'), true) ?: [];

        // Build dynamic update for draft fields
        $fields = [];
        $params = [];
        $types = '';

        // Map incoming fields to draft fields
        if (isset($payload['hero_html'])) {
            $fields[] = 'hero_html_draft = ?';
            $params[] = sanitizeHtml($payload['hero_html']);
            $types .= 's';
        }

        if (isset($payload['site_bio_html'])) {
            $fields[] = 'site_bio_html_draft = ?';
            $params[] = sanitizeHtml($payload['site_bio_html']);
            $types .= 's';
        }

        if (isset($payload['donate_text_html'])) {
            $fields[] = 'donate_text_html_draft = ?';
            $params[] = sanitizeHtml($payload['donate_text_html']);
            $types .= 's';
        }

        if (isset($payload['donation_instructions_html'])) {
            $fields[] = 'donation_instructions_html_draft = ?';
            $params[] = sanitizeHtml($payload['donation_instructions_html']);
            $types .= 's';
        }

        if (isset($payload['footer_column1_html'])) {
            $fields[] = 'footer_column1_html_draft = ?';
            $params[] = sanitizeHtml($payload['footer_column1_html']);
            $types .= 's';
        }

        if (isset($payload['footer_column2_html'])) {
            $fields[] = 'footer_column2_html_draft = ?';
            $params[] = sanitizeHtml($payload['footer_column2_html']);
            $types .= 's';
        }

        if (isset($payload['mailing_list_html'])) {
            $fields[] = 'mailing_list_html_draft = ?';
            $params[] = sanitizeHtml($payload['mailing_list_html']);
            $types .= 's';
        }

        if (empty($fields)) {
            echo json_encode(['success' => true, 'message' => 'No fields to update']);
            break;
        }

        // Add updated_at
        $sql = 'UPDATE settings SET ' . implode(', ', $fields) . ', updated_at = CURRENT_TIMESTAMP WHERE id = 1';

        $stmt = mysqli_prepare($db_conn, $sql);
        if (!$stmt) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to prepare statement']);
            break;
        }

        if (!empty($params)) {
            mysqli_stmt_bind_param($stmt, $types, ...$params);
        }

        if (mysqli_stmt_execute($stmt)) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => mysqli_error($db_conn)]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
