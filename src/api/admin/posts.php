<?php
header('Content-Type: application/json');
require_once(__DIR__ . '/../../functions.php');
ensureSession();

// Auth check: require admin
if (empty($_SESSION['authenticated']) || empty($_SESSION['username'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// Optional: enforce admin flag if available
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
    case 'GET':
        // Check if resend email action requested
        if (isset($_GET['action']) && $_GET['action'] === 'resend-email' && isset($_GET['id'])) {
            requireCsrf();
            $id = (int)$_GET['id'];

            // Verify the post exists and is published
            $currentPost = getPost($db_conn, $id);
            if (!$currentPost) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Post not found']);
                break;
            }

            if ($currentPost['status'] !== 'published') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Post must be published to send notifications']);
                break;
            }

            // Send email notification
            $emailResult = sendNewPostNotification($db_conn, $id);
            $response = ['success' => true];

            if ($emailResult['success']) {
                error_log("Post notification resent: " . ($emailResult['message'] ?? 'Success'));
                $response['email'] = [
                    'sent' => true,
                    'count' => $emailResult['sent'] ?? 0,
                    'message' => $emailResult['message'] ?? 'Notifications sent'
                ];
            } else {
                error_log("Post notification resend failed: " . ($emailResult['error'] ?? 'Unknown error'));
                $response['email'] = [
                    'sent' => false,
                    'error' => $emailResult['error'] ?? 'Unknown error'
                ];
            }

            echo json_encode($response);
            break;
        }

        // Check if publish action requested (must check BEFORE single post retrieval)
        if (isset($_GET['action']) && $_GET['action'] === 'publish' && isset($_GET['id'])) {
            requireCsrf();
            $id = (int)$_GET['id'];
            // Allow opting out of email notifications for first publish
            $skipEmail = false;
            if (isset($_GET['skip_email'])) {
                $val = strtolower((string)$_GET['skip_email']);
                $skipEmail = in_array($val, ['1', 'true', 'yes'], true);
            }

            // Check if this is a first-time publish by looking at the current state
            $currentPost = getPost($db_conn, $id);
            $isFirstPublish = ($currentPost && is_null($currentPost['published_at']));

            // Publish the draft (copies draft fields to published fields)
            $res = publishDraft($db_conn, $id);

            if ($res['success']) {
                $response = ['success' => true];

                // Send email notification if this is the first time publishing and not explicitly skipped
                if ($isFirstPublish && !$skipEmail) {
                    $emailResult = sendNewPostNotification($db_conn, $id);
                    // Log email result but don't fail the publish operation
                    if ($emailResult['success']) {
                        error_log("Post notification sent: " . ($emailResult['message'] ?? 'Success'));
                        $response['email'] = [
                            'sent' => true,
                            'count' => $emailResult['sent'] ?? 0,
                            'message' => $emailResult['message'] ?? 'Notifications sent'
                        ];
                    } else {
                        error_log("Post notification failed: " . ($emailResult['error'] ?? 'Unknown error'));
                        $response['email'] = [
                            'sent' => false,
                            'error' => $emailResult['error'] ?? 'Unknown error'
                        ];
                    }
                } else {
                    // Not first publish or user opted to skip, so no emails sent
                    $response['email'] = [
                        'sent' => false,
                        'skipped' => true,
                        'reason' => $isFirstPublish ? 'User opted out' : 'Not first-time publish'
                    ];
                }

                echo json_encode($response);
            } else {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => $res['error']]);
            }
            break;
        }

        // If specific ID requested, return single post with draft content for editing
        if (isset($_GET['id']) && $_GET['id']) {
            $id = (int)$_GET['id'];
            $stmt = mysqli_prepare($db_conn, "SELECT p.*,
                                                      u.first AS author_first, u.last AS author_last, u.username AS author_username
                                               FROM posts p
                                               LEFT JOIN users u ON p.created_by_user_id = u.username
                                               WHERE p.id = ? AND p.deleted_at IS NULL LIMIT 1");
            mysqli_stmt_bind_param($stmt, 'i', $id);
            mysqli_stmt_execute($stmt);
            $result = mysqli_stmt_get_result($stmt);
            $post = mysqli_fetch_assoc($result);

            if ($post) {
                // For editing, prioritize draft content over published content
                $post['title_editing'] = $post['title_draft'] ?? $post['title'];
                $post['body_html_editing'] = $post['body_html_draft'] ?? $post['body_html'];
                $post['hero_media_id_editing'] = $post['hero_media_id_draft'] ?? $post['hero_media_id'];
                $post['hero_image_height_editing'] = $post['hero_image_height_draft'] ?? $post['hero_image_height'];
                $post['hero_crop_overlay_editing'] = $post['hero_crop_overlay_draft'] ?? $post['hero_crop_overlay'];
                $post['hero_title_overlay_editing'] = $post['hero_title_overlay_draft'] ?? $post['hero_title_overlay'];
                $post['hero_overlay_opacity_editing'] = $post['hero_overlay_opacity_draft'] ?? $post['hero_overlay_opacity'];
                $post['gallery_media_ids_editing'] = $post['gallery_media_ids_draft'] ?? $post['gallery_media_ids'];

                echo json_encode(['success' => true, 'data' => $post]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Post not found']);
            }
            break;
        }

        // Otherwise return paginated list
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? min(100, max(1, (int)$_GET['limit'])) : 20;
        $offset = ($page - 1) * $limit;

        $stmt = mysqli_prepare($db_conn, 'SELECT COUNT(*) as c FROM posts WHERE deleted_at IS NULL');
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);
        $total = $result ? (int)mysqli_fetch_assoc($result)['c'] : 0;

        $rows = [];
        $sql = "SELECT p.*,
                      u.first AS author_first, u.last AS author_last, u.username AS author_username
               FROM posts p
               LEFT JOIN users u ON p.created_by_user_id = u.username
               WHERE p.deleted_at IS NULL
               ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
        $stmt2 = mysqli_prepare($db_conn, $sql);
        mysqli_stmt_bind_param($stmt2, 'ii', $limit, $offset);
        mysqli_stmt_execute($stmt2);
        $res = mysqli_stmt_get_result($stmt2);
        if ($res) { while ($r = mysqli_fetch_assoc($res)) { $rows[] = $r; } }
        echo json_encode(['success' => true, 'data' => $rows, 'meta' => ['total' => $total, 'page' => $page, 'limit' => $limit]]);
        break;

    case 'POST':
        requireCsrf();
        $payload = $_POST;
        // Allow JSON payloads
        if (empty($payload)) {
            $payload = json_decode(file_get_contents('php://input'), true) ?: [];
        }
        $payload['created_by_user_id'] = $_SESSION['username'];
        $res = createPost($db_conn, $payload);
        if ($res['success']) {
            $postId = $res['id'];

            // Check if this new post is being published immediately
            if (isset($payload['status']) && $payload['status'] === 'published') {
                // Allow opting out of email notifications via query or payload
                parse_str($_SERVER['QUERY_STRING'] ?? '', $query);
                $skipEmail = false;
                if (isset($query['skip_email'])) {
                    $val = strtolower((string)$query['skip_email']);
                    $skipEmail = in_array($val, ['1', 'true', 'yes'], true);
                } elseif (isset($payload['skip_email'])) {
                    $val = strtolower((string)$payload['skip_email']);
                    $skipEmail = in_array($val, ['1', 'true', 'yes'], true);
                }

                if (!$skipEmail) {
                    // Send email notification for new published post
                    $emailResult = sendNewPostNotification($db_conn, $postId);
                    // Log email result but don't fail the create operation
                    if ($emailResult['success']) {
                        error_log("Post notification sent: " . $emailResult['message']);
                    } else {
                        error_log("Post notification failed: " . ($emailResult['error'] ?? 'Unknown error'));
                    }
                } else {
                    error_log("Post created and published without sending emails (user opted out)");
                }
            }

            echo json_encode(['success' => true, 'id' => $postId]);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => $res['error']]);
        }
        break;

    case 'PUT':
        requireCsrf();
        parse_str($_SERVER['QUERY_STRING'] ?? '', $query);
        $id = isset($query['id']) ? (int)$query['id'] : 0;
        if (!$id) { http_response_code(400); echo json_encode(['success' => false, 'error' => 'Missing id']); break; }

        // Check if this is a first-time publish (status changing to 'published' and no published_at exists)
        $payload = json_decode(file_get_contents('php://input'), true) ?: [];
        $sendNotification = false;
        // Allow opting out of email notifications via query or payload
        $skipEmail = false;
        if (isset($query['skip_email'])) {
            $val = strtolower((string)$query['skip_email']);
            $skipEmail = in_array($val, ['1', 'true', 'yes'], true);
        } elseif (isset($payload['skip_email'])) {
            $val = strtolower((string)$payload['skip_email']);
            $skipEmail = in_array($val, ['1', 'true', 'yes'], true);
        }

        if (isset($payload['status']) && $payload['status'] === 'published') {
            // Get current post state
            $currentPost = getPost($db_conn, $id);
            if ($currentPost && is_null($currentPost['published_at'])) {
                $sendNotification = true; // First time publishing
            }
        }

        $res = updatePost($db_conn, $id, $payload);

        if ($res['success']) {
            // Send email notification if this is first-time publish
            if ($sendNotification && !$skipEmail) {
                $emailResult = sendNewPostNotification($db_conn, $id);
                // Log email result but don't fail the update
                if ($emailResult['success']) {
                    error_log("Post notification sent: " . $emailResult['message']);
                } else {
                    error_log("Post notification failed: " . ($emailResult['error'] ?? 'Unknown error'));
                }
            } elseif ($sendNotification && $skipEmail) {
                error_log("Post published without sending emails (user opted out)");
            }
            echo json_encode(['success' => true]);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => $res['error']]);
        }
        break;

    case 'DELETE':
        requireCsrf();
        parse_str($_SERVER['QUERY_STRING'] ?? '', $query);
        $id = isset($query['id']) ? (int)$query['id'] : 0;
        if (!$id) { http_response_code(400); echo json_encode(['success' => false, 'error' => 'Missing id']); break; }
        $ok = deletePost($db_conn, $id);
        echo json_encode(['success' => (bool)$ok]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
