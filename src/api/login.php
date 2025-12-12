<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

header('Content-Type: application/json');
ensureSession();

function verifyRecaptchaToken(string $token, string $secret): bool
{
    if ($secret === '') {
        return true; // reCAPTCHA not configured
    }

    if ($token === '') {
        return false;
    }

    $ch = curl_init('https://www.google.com/recaptcha/api/siteverify');
    if ($ch === false) {
        return false;
    }

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'secret' => $secret,
            'response' => $token,
        ]),
        CURLOPT_TIMEOUT => 5,
    ]);

    $raw = curl_exec($ch);
    if ($raw === false) {
        curl_close($ch);
        return false;
    }

    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($status !== 200) {
        return false;
    }

    $decoded = json_decode($raw, true);
    return (bool)($decoded['success'] ?? false);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = readJsonInput();
$username = trim((string)($input['username'] ?? ''));
$password = (string)($input['password'] ?? '');
$recaptchaToken = (string)($input['recaptcha_token'] ?? '');

if ($username === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Username and password are required.']);
    exit;
}

// Load config and validate reCAPTCHA (if configured)
require __DIR__ . '/../config.php';

if (!verifyRecaptchaToken($recaptchaToken, $recaptcha_secret ?? '')) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'reCAPTCHA validation failed.']);
    exit;
}

// Load DB and services
$db = getDefaultDbConnection();
if (!$db) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$stmt = mysqli_prepare($db, 'SELECT username, password, first, last, isadmin, active FROM users WHERE username = ? LIMIT 1');
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to prepare query']);
    exit;
}

mysqli_stmt_bind_param($stmt, 's', $username);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);
$user = $result ? mysqli_fetch_assoc($result) : null;

if (!$user || (int)$user['active'] !== 1 || !password_verify($password, (string)$user['password'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Invalid username or password.']);
    exit;
}

// Set session flags
$_SESSION['authenticated'] = true;
$_SESSION['username'] = $user['username'];
$_SESSION['isadmin'] = (bool)($user['isadmin'] ?? false);
$_SESSION['displayname'] = trim(($user['first'] ?? '') . ' ' . ($user['last'] ?? '')) ?: $user['username'];

http_response_code(200);

echo json_encode([
    'success' => true,
    'username' => $user['username'],
    'isadmin' => $_SESSION['isadmin'],
]);
