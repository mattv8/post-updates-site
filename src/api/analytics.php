<?php

declare(strict_types=1);

require_once(__DIR__ . '/../functions.php');
require(__DIR__ . '/../config.local.php');

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$db_conn = getDbConnection($db_servername, $db_username, $db_password, $db_name);
if (!$db_conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'DB connection failed']);
    exit;
}

$payload = json_decode(file_get_contents('php://input'), true) ?: [];
$postId = isset($payload['post_id']) ? (int)$payload['post_id'] : 0;

try {
    $impressionInc = !empty($payload['impression']) ? 1 : 0;
$uniqueImpressionInc = !empty($payload['unique_impression']) ? 1 : 0;
$viewInc = !empty($payload['view']) ? 1 : 0;
$uniqueViewInc = !empty($payload['unique_view']) ? 1 : 0;

if ($postId <= 0 || ($impressionInc + $uniqueImpressionInc + $viewInc + $uniqueViewInc) === 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid payload']);
    exit;
}

// Update counters atomically. Unique counters are client-evaluated; server trusts payload.
$stmt = mysqli_prepare(
    $db_conn,
    'UPDATE posts SET impression_count = impression_count + ?, unique_impression_count = unique_impression_count + ?, view_count = view_count + ?, unique_view_count = unique_view_count + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = "published" AND deleted_at IS NULL'
);

if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to prepare statement']);
    exit;
}

mysqli_stmt_bind_param($stmt, 'iiiii', $impressionInc, $uniqueImpressionInc, $viewInc, $uniqueViewInc, $postId);

if (!mysqli_stmt_execute($stmt)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => mysqli_error($db_conn)]);
    exit;
}

if (mysqli_stmt_affected_rows($stmt) === 0) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Post not found or not published']);
    exit;
}

} catch (\Throwable $e) {
    error_log('API error in analytics.php: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal server error']);
    exit;
}

echo json_encode(['success' => true]);
