<?php
/**
 * SMTP Test API
 * Tests SMTP configuration and sends test emails
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
$db_conn = mysqli_connect($db_servername, $db_username, $db_password, $db_name);
if (!$db_conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'DB connection failed']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// CSRF validation
$token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
if (!validateCsrfToken($token)) {
    http_response_code(419);
    echo json_encode(['success' => false, 'error' => 'CSRF validation failed']);
    exit;
}

// Get payload
$payload = json_decode(file_get_contents('php://input'), true);

if (!$payload) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid request payload']);
    exit;
}

$action = $payload['action'] ?? 'test';

// Get SMTP configuration - either from payload or from database
$smtpConfig = [];

if (isset($payload['smtp_host'])) {
    // Use provided configuration
    $smtpConfig = [
        'host' => $payload['smtp_host'] ?? '',
        'port' => isset($payload['smtp_port']) ? (int)$payload['smtp_port'] : 587,
        'secure' => $payload['smtp_secure'] ?? 'tls',
        'auth' => isset($payload['smtp_auth']) ? (bool)$payload['smtp_auth'] : true,
        'username' => $payload['smtp_username'] ?? '',
        'password' => $payload['smtp_password'] ?? '',
        'from_email' => $payload['smtp_from_email'] ?? '',
        'from_name' => $payload['smtp_from_name'] ?? 'Post Portal',
    ];
} else {
    // Get from database settings only
    $settings = getSettings($db_conn);

    $smtpConfig = [
        'host' => $settings['smtp_host'] ?? '',
        'port' => isset($settings['smtp_port']) ? (int)$settings['smtp_port'] : 587,
        'secure' => $settings['smtp_secure'] ?? 'tls',
        'auth' => isset($settings['smtp_auth']) ? (bool)$settings['smtp_auth'] : true,
        'username' => $settings['smtp_username'] ?? '',
        'password' => $settings['smtp_password'] ?? '',
        'from_email' => $settings['smtp_from_email'] ?? '',
        'from_name' => $settings['smtp_from_name'] ?? 'Post Portal',
    ];
}

// Validate required fields
if (empty($smtpConfig['host'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'SMTP host is required']);
    exit;
}

if (empty($smtpConfig['from_email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'From email is required']);
    exit;
}

// For test action, require test_email
if ($action === 'test') {
    $testEmail = $payload['test_email'] ?? '';

    if (empty($testEmail)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Test email address is required']);
        exit;
    }

    if (!filter_var($testEmail, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid test email address']);
        exit;
    }
}

// Test the SMTP connection
try {
    require_once(__DIR__ . '/../../vendor/autoload.php');

    $mail = new PHPMailer\PHPMailer\PHPMailer(true);

    // Enable verbose debug output based on DEBUG env variable
    $debugLog = [];
    $debugMode = getenv('DEBUG') === 'true' || getenv('DEBUG') === '1';
    $mail->SMTPDebug = $debugMode ? 3 : 0; // Verbose debugging in dev mode only
    $mail->Debugoutput = function($str, $level) use (&$debugLog, $debugMode) {
        $debugLog[] = trim($str);
        if ($debugMode) {
            // Only write to app log file (not error_log to avoid duplication)
            $logFile = '/var/www/html/logs/smtp.log';
            @file_put_contents($logFile, date('Y-m-d H:i:s') . " - " . trim($str) . "\n", FILE_APPEND);
        }
    };

    // Server settings
    $mail->isSMTP();
    $mail->Host = $smtpConfig['host'];
    $mail->Port = $smtpConfig['port'];

    if ($smtpConfig['auth']) {
        $mail->SMTPAuth = true;
        $mail->Username = $smtpConfig['username'];
        $mail->Password = $smtpConfig['password'];
    } else {
        $mail->SMTPAuth = false;
    }

    if ($smtpConfig['secure']) {
        $mail->SMTPSecure = $smtpConfig['secure'];
    }

    // Additional options to help with debugging
    $mail->SMTPOptions = [
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true
        ]
    ];

    // Set sender
    $mail->setFrom($smtpConfig['from_email'], $smtpConfig['from_name']);

    if ($action === 'test') {
        // Send actual test email
        $mail->addAddress($testEmail);
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->Subject = 'SMTP Test Email from Post Portal';
        $mail->Body = '
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; margin-bottom: 20px; }
                    .header h1 { margin: 0; color: #0066cc; }
                    .content { background-color: #ffffff; padding: 20px; border: 1px solid #dee2e6; border-radius: 5px; }
                    .info { background-color: #e7f3ff; padding: 15px; border-left: 4px solid #0066cc; margin: 20px 0; }
                    .footer { text-align: center; color: #6c757d; font-size: 12px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✓ SMTP Test Successful</h1>
                    </div>
                    <div class="content">
                        <p>This is a test email from your Post Portal SMTP configuration.</p>

                        <div class="info">
                            <strong>Configuration Details:</strong><br>
                            SMTP Host: ' . htmlspecialchars($smtpConfig['host']) . '<br>
                            SMTP Port: ' . htmlspecialchars($smtpConfig['port']) . '<br>
                            Encryption: ' . htmlspecialchars($smtpConfig['secure'] ?: 'None') . '<br>
                            Authentication: ' . ($smtpConfig['auth'] ? 'Enabled' : 'Disabled') . '<br>
                            From Address: ' . htmlspecialchars($smtpConfig['from_email']) . '
                        </div>

                        <p>If you received this email, your SMTP configuration is working correctly!</p>
                    </div>
                    <div class="footer">
                        Sent: ' . date('Y-m-d H:i:s T') . '
                    </div>
                </div>
            </body>
            </html>
        ';
        $mail->AltBody = 'This is a test email from your Post Portal SMTP configuration. If you received this email, your SMTP configuration is working correctly!';

        $mail->send();

        echo json_encode([
            'success' => true,
            'message' => 'Test email sent successfully to ' . $testEmail,
            'config' => [
                'host' => $smtpConfig['host'],
                'port' => $smtpConfig['port'],
                'secure' => $smtpConfig['secure'],
                'auth' => $smtpConfig['auth'],
                'from_email' => $smtpConfig['from_email']
            ]
        ]);
    } else {
        // Just verify connection without sending email
        $mail->SMTPDebug = 2; // Enable debug for connection test

        // Try to connect
        if (!$mail->smtpConnect()) {
            throw new Exception('Could not connect to SMTP server');
        }

        $mail->smtpClose();

        echo json_encode([
            'success' => true,
            'message' => 'SMTP connection successful',
            'config' => [
                'host' => $smtpConfig['host'],
                'port' => $smtpConfig['port'],
                'secure' => $smtpConfig['secure'],
                'auth' => $smtpConfig['auth']
            ],
            'debug' => $debugLog
        ]);
    }

} catch (Exception $e) {
    error_log('SMTP test failed: ' . $e->getMessage());

    // Parse common SMTP errors and provide helpful messages
    $errorMsg = $e->getMessage();
    $helpfulMsg = $errorMsg;

    if (strpos($errorMsg, 'Could not authenticate') !== false) {
        $helpfulMsg = 'Authentication failed. Please check your username and password.';
    } elseif (strpos($errorMsg, 'Could not connect to SMTP host') !== false) {
        $helpfulMsg = 'Could not connect to SMTP server. Please check the host and port settings.';
    } elseif (strpos($errorMsg, 'SMTP Error: Could not connect') !== false) {
        $helpfulMsg = 'Connection failed. The server may be blocking connections or the host/port may be incorrect.';
    } elseif (strpos($errorMsg, 'stream_socket_enable_crypto') !== false || strpos($errorMsg, 'SSL') !== false || strpos($errorMsg, 'TLS') !== false) {
        $helpfulMsg = 'TLS/SSL encryption error. Try using a different encryption method (TLS, SSL, or none). If using port 587, try "tls". If using port 465, try "ssl".';
    }

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $helpfulMsg,
        'detailed_error' => $errorMsg,
        'debug' => $debugLog ?? []
    ]);
}

mysqli_close($db_conn);
