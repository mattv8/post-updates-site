<?php
header('Content-Type: application/json');
require_once(__DIR__ . '/../../functions.php');
ensureSession();

if (empty($_SESSION['authenticated']) || empty($_SESSION['username'])) { http_response_code(401); echo json_encode(['success'=>false,'error'=>'Unauthorized']); exit; }
if (isset($_SESSION['isadmin']) && !$_SESSION['isadmin']) { http_response_code(403); echo json_encode(['success'=>false,'error'=>'Forbidden']); exit; }

require(__DIR__ . '/../../config.local.php');
$db_conn = mysqli_connect($db_servername, $db_username, $db_password, $db_name);
if (!$db_conn) { http_response_code(500); echo json_encode(['success'=>false,'error'=>'DB connection failed']); exit; }

$summary = [
    'posts_total' => 0,
    'posts_published' => 0,
    'media_total' => 0,
    'recent_posts' => [],
    'recent_media' => []
];

$res = mysqli_query($db_conn, 'SELECT COUNT(*) c FROM posts');
$summary['posts_total'] = $res ? (int)mysqli_fetch_assoc($res)['c'] : 0;
$res = mysqli_query($db_conn, "SELECT COUNT(*) c FROM posts WHERE status='published'");
$summary['posts_published'] = $res ? (int)mysqli_fetch_assoc($res)['c'] : 0;
$res = mysqli_query($db_conn, 'SELECT COUNT(*) c FROM media');
$summary['media_total'] = $res ? (int)mysqli_fetch_assoc($res)['c'] : 0;

$res = mysqli_query($db_conn, "SELECT id, title, published_at, created_at FROM posts ORDER BY created_at DESC LIMIT 5");
if ($res) { while ($r = mysqli_fetch_assoc($res)) { $summary['recent_posts'][] = $r; } }
$res = mysqli_query($db_conn, "SELECT id, original_filename, created_at FROM media ORDER BY created_at DESC LIMIT 8");
if ($res) { while ($r = mysqli_fetch_assoc($res)) { $summary['recent_media'][] = $r; } }

echo json_encode(['success'=>true,'data'=>$summary]);
