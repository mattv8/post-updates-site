<?php
header('Content-Type: application/json');
require_once(__DIR__ . '/../../functions.php');
ensureSession();

if (empty($_SESSION['authenticated']) || empty($_SESSION['username'])) { http_response_code(401); echo json_encode(['success'=>false,'error'=>'Unauthorized']); exit; }
if (isset($_SESSION['isadmin']) && !$_SESSION['isadmin']) { http_response_code(403); echo json_encode(['success'=>false,'error'=>'Forbidden']); exit; }

require(__DIR__ . '/../../config.local.php');
$db_conn = getDbConnection($db_servername, $db_username, $db_password, $db_name);
if (!$db_conn) { http_response_code(500); echo json_encode(['success'=>false,'error'=>'DB connection failed']); exit; }

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Check if publish action requested
        if (isset($_GET['action']) && $_GET['action'] === 'publish') {
            $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
            if (!validateCsrfToken($token)) {
                http_response_code(419);
                echo json_encode(['success'=>false,'error'=>'CSRF validation failed']);
                exit;
            }
            $res = publishSettingsDraft($db_conn);
            if ($res['success']) {
                echo json_encode(['success'=>true]);
            } else {
                http_response_code(400);
                echo json_encode(['success'=>false,'error'=>$res['error']]);
            }
            break;
        }

        // Regular GET - return settings with draft content for editing
        $settings = getSettings($db_conn);

        // Add editing fields that prioritize draft content
        if ($settings) {
            $settings['hero_html_editing'] = $settings['hero_html_draft'] ?? $settings['hero_html'];
            $settings['site_bio_html_editing'] = $settings['site_bio_html_draft'] ?? $settings['site_bio_html'];
            $settings['donate_text_html_editing'] = $settings['donate_text_html_draft'] ?? $settings['donate_text_html'];
            $settings['donation_instructions_html_editing'] = $settings['donation_instructions_html_draft'] ?? $settings['donation_instructions_html'];
            $settings['footer_column1_html_editing'] = $settings['footer_column1_html_draft'] ?? $settings['footer_column1_html'];
            $settings['footer_column2_html_editing'] = $settings['footer_column2_html_draft'] ?? $settings['footer_column2_html'];
            $settings['mailing_list_html_editing'] = $settings['mailing_list_html_draft'] ?? $settings['mailing_list_html'];
        }

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
