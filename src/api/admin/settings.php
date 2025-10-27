<?php
header('Content-Type: application/json');
require_once(__DIR__ . '/../../functions.php');
ensureSession();

if (empty($_SESSION['authenticated']) || empty($_SESSION['username'])) { http_response_code(401); echo json_encode(['success'=>false,'error'=>'Unauthorized']); exit; }
if (isset($_SESSION['isadmin']) && !$_SESSION['isadmin']) { http_response_code(403); echo json_encode(['success'=>false,'error'=>'Forbidden']); exit; }

require(__DIR__ . '/../../config.local.php');
$db_conn = mysqli_connect($db_servername, $db_username, $db_password, $db_name);
if (!$db_conn) { http_response_code(500); echo json_encode(['success'=>false,'error'=>'DB connection failed']); exit; }

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $settings = getSettings($db_conn);
        echo json_encode(['success'=>true,'data'=>$settings]);
        break;

    case 'POST':
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? '');
        if (!validateCsrfToken($token)) { http_response_code(419); echo json_encode(['success'=>false,'error'=>'CSRF validation failed']); exit; }
        $payload = $_POST;
        if (empty($payload)) { $payload = json_decode(file_get_contents('php://input'), true) ?: []; }
        $res = updateSettings($db_conn, $payload);
        if ($res['success']) echo json_encode(['success'=>true]);
        else { http_response_code(400); echo json_encode(['success'=>false,'error'=>$res['error']]); }
        break;

    default:
        http_response_code(405); echo json_encode(['success'=>false,'error'=>'Method not allowed']);
}
