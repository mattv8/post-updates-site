<?php

declare(strict_types=1);

/**
 * Posts Draft API
 * Handles auto-save operations to draft fields
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
$db_conn = getDbConnection($db_servername, $db_username, $db_password, $db_name);
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
        // Auto-save draft content
        requireCsrf();
        parse_str($_SERVER['QUERY_STRING'] ?? '', $query);
        $id = isset($query['id']) ? (int)$query['id'] : 0;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing id']);
            break;
        }

        $payload = json_decode(file_get_contents('php://input'), true) ?: [];

        // Build dynamic update for draft fields
        $fields = [];
        $params = [];
        $types = '';

        // Map incoming fields to draft fields
        if (isset($payload['title'])) {
            $fields[] = 'title_draft = ?';
            $params[] = $payload['title'];
            $types .= 's';
        }

        if (isset($payload['body_html'])) {
            $fields[] = 'body_html_draft = ?';
            $params[] = sanitizeHtml($payload['body_html']);
            $types .= 's';
        }

        if (array_key_exists('hero_media_id', $payload)) {
            $fields[] = 'hero_media_id_draft = ?';
            $params[] = $payload['hero_media_id'];
            $types .= 'i';
        }

        if (isset($payload['hero_image_height'])) {
            $fields[] = 'hero_image_height_draft = ?';
            $params[] = (int)$payload['hero_image_height'];
            $types .= 'i';
        }

        if (isset($payload['hero_crop_overlay'])) {
            $fields[] = 'hero_crop_overlay_draft = ?';
            $params[] = (int)(bool)$payload['hero_crop_overlay'];
            $types .= 'i';
        }

        if (isset($payload['hero_title_overlay'])) {
            $fields[] = 'hero_title_overlay_draft = ?';
            $params[] = (int)(bool)$payload['hero_title_overlay'];
            $types .= 'i';
        }

        if (isset($payload['hero_overlay_opacity'])) {
            $fields[] = 'hero_overlay_opacity_draft = ?';
            $params[] = (float)$payload['hero_overlay_opacity'];
            $types .= 'd';
        }

        if (isset($payload['gallery_media_ids'])) {
            $fields[] = 'gallery_media_ids_draft = ?';
            $params[] = json_encode($payload['gallery_media_ids']);
            $types .= 's';
        }

        if (empty($fields)) {
            echo json_encode(['success' => true, 'message' => 'No fields to update']);
            break;
        }

        // Add updated_at and id
        $sql = 'UPDATE posts SET ' . implode(', ', $fields) . ', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL';
        $types .= 'i';
        $params[] = $id;

        $stmt = mysqli_prepare($db_conn, $sql);
        if (!$stmt) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to prepare statement']);
            break;
        }

        mysqli_stmt_bind_param($stmt, $types, ...$params);

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
