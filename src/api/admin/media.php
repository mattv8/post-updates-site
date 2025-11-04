<?php
header('Content-Type: application/json');
require_once(__DIR__ . '/../../functions.php');
require_once(__DIR__ . '/../../lib/MediaProcessor.php');
ensureSession();

// Auth check
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

require(__DIR__ . '/../../config.local.php');
$db_conn = mysqli_connect($db_servername, $db_username, $db_password, $db_name);
if (!$db_conn) { http_response_code(500); echo json_encode(['success'=>false,'error'=>'DB connection failed']); exit; }

$method = $_SERVER['REQUEST_METHOD'];
function requireCsrf() { $t = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? ''); if (!validateCsrfToken($t)) { http_response_code(419); echo json_encode(['success'=>false,'error'=>'CSRF validation failed']); exit; } }

switch ($method) {
    case 'GET':
        // If specific ID requested, return single media item
        if (isset($_GET['id']) && $_GET['id']) {
            $id = (int)$_GET['id'];
            $media = getMedia($db_conn, $id);
            if ($media) {
                echo json_encode(['success'=>true,'data'=>$media]);
            } else {
                http_response_code(404);
                echo json_encode(['success'=>false,'error'=>'Media not found']);
            }
            break;
        }

        // Check for usage query
        if (isset($_GET['check_usage']) && $_GET['check_usage']) {
            $id = (int)$_GET['check_usage'];
            $affectedPosts = checkMediaUsage($db_conn, $id);
            echo json_encode(['success'=>true,'data'=>$affectedPosts]);
            break;
        }

        // Otherwise return paginated list
        $page = isset($_GET['page']) ? max(1,(int)$_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? min(100, max(1,(int)$_GET['limit'])) : 40;
        $search = $_GET['q'] ?? null;
        $offset = ($page-1)*$limit;
        $rows = getAllMedia($db_conn, $limit, $offset, $search);
        echo json_encode(['success'=>true,'data'=>$rows]);
        break;

    case 'POST':
        requireCsrf();
        if (!isset($_FILES['file'])) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'Missing file']); break; }
        $alt = $_POST['alt_text'] ?? '';
        $username = $_SESSION['username'];

        try {
            $processor = new MediaProcessor(__DIR__ . '/../../storage/uploads');
            $res = $processor->processUpload($_FILES['file'], $alt, $username);
            if (!$res['success']) {
                error_log("Media upload failed: " . ($res['error'] ?? 'Unknown error'));
                http_response_code(400);
                echo json_encode($res);
                break;
            }
            $save = saveMediaRecord($db_conn, $res['data']);
            if ($save['success']) {
                // Return the full media record so frontend can show preview
                $mediaRecord = getMedia($db_conn, $save['id']);
                echo json_encode(['success'=>true,'id'=>$save['id'],'data'=>$mediaRecord]);
            } else {
                error_log("Failed to save media record: " . ($save['error'] ?? 'Unknown error'));
                http_response_code(500);
                echo json_encode(['success'=>false,'error'=>$save['error']]);
            }
        } catch (Exception $e) {
            error_log("Media upload exception: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success'=>false,'error'=>'Server error: ' . $e->getMessage()]);
        }
        break;

    case 'PUT':
        requireCsrf();
        parse_str($_SERVER['QUERY_STRING'] ?? '', $query);
        $id = isset($query['id']) ? (int)$query['id'] : 0;
        if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'Missing id']); break; }
        $payload = json_decode(file_get_contents('php://input'), true) ?: [];
        if (isset($payload['alt_text'])) {
            $ok = updateMediaAltText($db_conn, $id, $payload['alt_text']);
            echo json_encode(['success'=>(bool)$ok]);
        } else {
            http_response_code(400); echo json_encode(['success'=>false,'error'=>'Nothing to update']);
        }
        break;

    case 'DELETE':
        requireCsrf();
        parse_str($_SERVER['QUERY_STRING'] ?? '', $query);
        $id = isset($query['id']) ? (int)$query['id'] : 0;
        if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'Missing id']); break; }
        $media = getMedia($db_conn, $id);
        if (!$media) { http_response_code(404); echo json_encode(['success'=>false,'error'=>'Not found']); break; }
        $processor = new MediaProcessor(__DIR__ . '/../../storage/uploads');
        $processor->deleteMedia($media['filename'], $media['variants_json']);
        $stmt = mysqli_prepare($db_conn, 'DELETE FROM media WHERE id = ?');
        mysqli_stmt_bind_param($stmt, 'i', $id);
        $ok = mysqli_stmt_execute($stmt);
        echo json_encode(['success'=>(bool)$ok]);
        break;

    default:
        http_response_code(405); echo json_encode(['success'=>false,'error'=>'Method not allowed']);
}

// Helper function to check which posts use this media
function checkMediaUsage($db_conn, $media_id) {
    $affectedPosts = [];

    // Check posts using this media as hero image
    $stmt = mysqli_prepare($db_conn, 'SELECT id, title FROM posts WHERE hero_media_id = ?');
    mysqli_stmt_bind_param($stmt, 'i', $media_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    while ($row = mysqli_fetch_assoc($result)) {
        $affectedPosts[] = [
            'id' => $row['id'],
            'title' => $row['title'] ?: '(untitled)',
            'usage' => 'hero image'
        ];
    }

    // Check posts using this media in gallery
    $stmt = mysqli_prepare($db_conn, 'SELECT id, title, gallery_media_ids FROM posts WHERE gallery_media_ids IS NOT NULL');
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    while ($row = mysqli_fetch_assoc($result)) {
        $galleryIds = json_decode($row['gallery_media_ids'], true);
        if (is_array($galleryIds) && in_array($media_id, $galleryIds)) {
            $affectedPosts[] = [
                'id' => $row['id'],
                'title' => $row['title'] ?: '(untitled)',
                'usage' => 'gallery'
            ];
        }
    }

    // Check site settings for hero image
    $stmt = mysqli_prepare($db_conn, 'SELECT hero_media_id FROM settings WHERE hero_media_id = ? LIMIT 1');
    mysqli_stmt_bind_param($stmt, 'i', $media_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    if (mysqli_fetch_assoc($result)) {
        $affectedPosts[] = [
            'id' => 0,
            'title' => 'Site Hero Settings',
            'usage' => 'site hero'
        ];
    }

    // Check site settings for logo
    $stmt = mysqli_prepare($db_conn, 'SELECT logo_media_id FROM settings WHERE logo_media_id = ? LIMIT 1');
    mysqli_stmt_bind_param($stmt, 'i', $media_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    if (mysqli_fetch_assoc($result)) {
        $affectedPosts[] = [
            'id' => 0,
            'title' => 'Site Logo',
            'usage' => 'branding logo'
        ];
    }

    // Check site settings for favicon
    $stmt = mysqli_prepare($db_conn, 'SELECT favicon_media_id FROM settings WHERE favicon_media_id = ? LIMIT 1');
    mysqli_stmt_bind_param($stmt, 'i', $media_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    if (mysqli_fetch_assoc($result)) {
        $affectedPosts[] = [
            'id' => 0,
            'title' => 'Site Favicon',
            'usage' => 'branding favicon'
        ];
    }

    return $affectedPosts;
}
