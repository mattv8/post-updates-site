<?php

declare(strict_types=1);

/**
 * Branding API
 * Handles logo and favicon uploads with cropping
 */
header('Content-Type: application/json');
require_once(__DIR__ . '/../../functions.php');
require_once(__DIR__ . '/../../lib/MediaProcessor.php');
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

// Helper function for CSRF
function requireCsrf() {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!validateCsrfToken($token)) {
        http_response_code(419);
        echo json_encode(['success' => false, 'error' => 'CSRF validation failed']);
        exit;
    }
}

switch ($method) {
    case 'GET':
        // Get current branding settings
        $settings = getSettings($db_conn);

        $branding = [
            'logo_media_id' => $settings['logo_media_id'] ?? null,
            'favicon_media_id' => $settings['favicon_media_id'] ?? null
        ];

        // Fetch media details if IDs exist
        if ($branding['logo_media_id']) {
            $branding['logo'] = getMedia($db_conn, $branding['logo_media_id']);
        }

        if ($branding['favicon_media_id']) {
            $branding['favicon'] = getMedia($db_conn, $branding['favicon_media_id']);
        }

        echo json_encode(['success' => true, 'data' => $branding]);
        break;

    case 'POST':
        requireCsrf();

        // Determine if this is logo or favicon upload
        $type = $_POST['type'] ?? null; // 'logo' or 'favicon'

        if (!in_array($type, ['logo', 'favicon'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid type. Must be "logo" or "favicon"']);
            exit;
        }

        if (!isset($_FILES['file'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing file']);
            exit;
        }

        // Parse crop data if provided
        $cropData = null;
        if (!empty($_POST['crop'])) {
            $cropData = json_decode($_POST['crop'], true);
        }

        $username = $_SESSION['username'];

        try {
            error_log("Branding upload started - Type: $type, Username: $username");
            $processor = new MediaProcessor(__DIR__ . '/../../storage/uploads');

            // Process based on type
            if ($type === 'logo') {
                error_log("Processing logo upload with crop data: " . json_encode($cropData));
                $result = $processor->processLogoUpload($_FILES['file'], $cropData, $username);
            } else {
                error_log("Processing favicon upload with crop data: " . json_encode($cropData));
                $result = $processor->processFaviconUpload($_FILES['file'], $cropData, $username);
            }

            error_log("Process result: " . json_encode($result));

            if (!$result['success']) {
                http_response_code(400);
                echo json_encode($result);
                exit;
            }

            // Insert into media table
            $mediaData = $result['data'];
            error_log("Inserting media data: " . json_encode($mediaData));

            $stmt = mysqli_prepare($db_conn,
                'INSERT INTO media (filename, original_filename, mime_type, size_bytes, width, height, alt_text, storage_path, variants_json, created_by_user_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );

            mysqli_stmt_bind_param($stmt, 'sssiiissss',
                $mediaData['filename'],
                $mediaData['original_filename'],
                $mediaData['mime_type'],
                $mediaData['size_bytes'],
                $mediaData['width'],
                $mediaData['height'],
                $mediaData['alt_text'],
                $mediaData['storage_path'],
                $mediaData['variants_json'],
                $mediaData['created_by_user_id']
            );

            if (!mysqli_stmt_execute($stmt)) {
                error_log("Failed to insert media: " . mysqli_error($db_conn));
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Failed to save media record']);
                exit;
            }

            $mediaId = mysqli_insert_id($db_conn);
            error_log("Media inserted with ID: $mediaId");

            // Update settings table with new media ID
            $field = $type === 'logo' ? 'logo_media_id' : 'favicon_media_id';
            $updateStmt = mysqli_prepare($db_conn, "UPDATE settings SET $field = ? WHERE id = 1");
            mysqli_stmt_bind_param($updateStmt, 'i', $mediaId);

            if (!mysqli_stmt_execute($updateStmt)) {
                error_log("Failed to update settings: " . mysqli_error($db_conn));
            } else {
                error_log("Settings updated successfully - $field = $mediaId");
            }

            echo json_encode([
                'success' => true,
                'id' => $mediaId,
                'data' => $mediaData
            ]);

        } catch (Exception $e) {
            error_log("Branding upload error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    case 'PUT':
        requireCsrf();

        // Update branding settings (change logo/favicon media IDs)
        $payload = json_decode(file_get_contents('php://input'), true);

        if (!$payload) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid JSON payload']);
            exit;
        }

        $updates = [];
        $types = '';
        $values = [];

        if (isset($payload['logo_media_id'])) {
            $updates[] = 'logo_media_id = ?';
            $types .= 'i';
            $values[] = $payload['logo_media_id'] ?: null;
        }

        if (isset($payload['favicon_media_id'])) {
            $updates[] = 'favicon_media_id = ?';
            $types .= 'i';
            $values[] = $payload['favicon_media_id'] ?: null;
        }

        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'No fields to update']);
            exit;
        }

        $sql = 'UPDATE settings SET ' . implode(', ', $updates) . ' WHERE id = 1';
        $stmt = mysqli_prepare($db_conn, $sql);

        mysqli_stmt_bind_param($stmt, $types, ...$values);

        if (mysqli_stmt_execute($stmt)) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to update settings']);
        }
        break;

    case 'DELETE':
        requireCsrf();

        // Remove logo or favicon (set to null)
        parse_str(file_get_contents('php://input'), $params);
        $type = $params['type'] ?? $_GET['type'] ?? null;

        if (!in_array($type, ['logo', 'favicon'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid type']);
            exit;
        }

        $field = $type === 'logo' ? 'logo_media_id' : 'favicon_media_id';
        $stmt = mysqli_prepare($db_conn, "UPDATE settings SET $field = NULL WHERE id = 1");

        if (mysqli_stmt_execute($stmt)) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to remove ' . $type]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
