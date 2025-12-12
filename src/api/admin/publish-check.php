<?php

declare(strict_types=1);

/**
 * Check if publishing a post will trigger email notifications
 * Returns: { isFirstPublish: boolean, subscriberCount: number }
 */
header('Content-Type: application/json');
require_once(__DIR__ . '/../../functions.php');
ensureSession();

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
$db_conn = getDbConnection($db_servername, $db_username, $db_password, $db_name);
if (!$db_conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'DB connection failed']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $postId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if (!$postId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing post ID']);
        exit;
    }

    // Get post to check if published_at is null
    $post = getPost($db_conn, $postId);

    if (!$post) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Post not found']);
        exit;
    }

    // Check if this would be a first-time publish
    $isFirstPublish = is_null($post['published_at']);

    // Get active subscriber count
    $subscriberCount = getActiveSubscriberCount($db_conn);

    echo json_encode([
        'success' => true,
        'isFirstPublish' => $isFirstPublish,
        'subscriberCount' => $subscriberCount
    ]);
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>
