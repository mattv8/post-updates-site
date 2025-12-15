<?php

declare(strict_types=1);

use PostPortal\Http\ApiHandler;
use PostPortal\Http\ErrorResponse;

require_once __DIR__ . '/bootstrap.php';

/**
 * Verify reCAPTCHA token with Google's API
 */
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

ApiHandler::handle(function (): void {
    // Login doesn't require auth, but we need the DB connection
    ['db' => $db] = bootstrapApi();

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        ErrorResponse::json(405, 'Method not allowed');
    }

    $input = readJsonInput();
    $username = trim((string)($input['username'] ?? ''));
    $password = (string)($input['password'] ?? '');
    $recaptchaToken = (string)($input['recaptcha_token'] ?? '');

    if ($username === '' || $password === '') {
        ErrorResponse::badRequest('Username and password are required.');
    }

    // Validate reCAPTCHA (if configured)
    $recaptchaSecret = getenv('RECAPTCHA_SECRET_KEY') ?: '';
    if (!verifyRecaptchaToken($recaptchaToken, $recaptchaSecret)) {
        ErrorResponse::badRequest('reCAPTCHA validation failed.');
    }

    // Query user from database
    $stmt = mysqli_prepare($db, 'SELECT username, password, first, last, isadmin, active FROM users WHERE username = ? LIMIT 1');
    if (!$stmt) {
        ErrorResponse::internalError('Failed to prepare query');
    }

    mysqli_stmt_bind_param($stmt, 's', $username);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $user = $result ? mysqli_fetch_assoc($result) : null;

    if (!$user || (int)$user['active'] !== 1 || !password_verify($password, (string)$user['password'])) {
        ErrorResponse::unauthorized('Invalid username or password.');
    }

    // Set session flags
    $_SESSION['authenticated'] = true;
    $_SESSION['username'] = $user['username'];
    $_SESSION['isadmin'] = (bool)($user['isadmin'] ?? false);
    $_SESSION['displayname'] = trim(($user['first'] ?? '') . ' ' . ($user['last'] ?? '')) ?: $user['username'];

    ErrorResponse::success([
        'username' => $user['username'],
        'isadmin' => $_SESSION['isadmin'],
    ]);
});
