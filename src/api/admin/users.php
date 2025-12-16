<?php

declare(strict_types=1);

use PostPortal\Container\ServiceContainer;
use PostPortal\Http\ApiHandler;
use PostPortal\Http\ErrorResponse;
use PostPortal\Http\ViewRenderer;

require_once __DIR__ . '/../bootstrap.php';

/**
 * Send welcome email to newly created user with their credentials
 *
 * @param ServiceContainer $container
 * @param array<string, mixed> $userData
 * @param string $password Plain text password (before hashing)
 * @return array{success: bool, error?: string}
 */
function sendWelcomeEmail(ServiceContainer $container, array $userData, string $password): array
{
    try {
        $settingsRepository = $container->getSettingsRepository();
        $settings = $settingsRepository->getSettings() ?? [];

        // Check SMTP configuration
        $smtpHost = $settings['smtp_host'] ?? '';
        if (empty($smtpHost)) {
            return [
                'success' => false,
                'error' => 'SMTP is not configured. Please configure email settings first.',
            ];
        }

        $smtpPort = (int)($settings['smtp_port'] ?? 587);
        $smtpSecure = $settings['smtp_secure'] ?? 'none';
        $smtpAuth = (bool)($settings['smtp_auth'] ?? true);
        $smtpUsername = $settings['smtp_username'] ?? '';
        $smtpPassword = $settings['smtp_password'] ?? '';
        $smtpFromEmail = $settings['smtp_from_email'] ?? '';
        $smtpFromName = $settings['smtp_from_name'] ?? 'Post Portal';

        if (empty($smtpFromEmail)) {
            return [
                'success' => false,
                'error' => 'SMTP from email is not configured.',
            ];
        }

        // Decrypt SMTP password if needed
        if (!empty($smtpPassword)) {
            $smtpPassword = decryptSmtpPassword($smtpPassword);
        }

        if ($smtpSecure === 'none') {
            $smtpSecure = '';
        }

        $userEmail = $userData['email'] ?? '';
        $username = $userData['username'] ?? '';
        $firstName = $userData['first'] ?? '';
        $lastName = $userData['last'] ?? '';
        $displayName = trim($firstName . ' ' . $lastName) ?: $username;

        if (empty($userEmail)) {
            return [
                'success' => false,
                'error' => 'User email is required to send welcome email.',
            ];
        }

        // Get site info
        $siteTitle = $settings['site_title'] ?? 'Post Portal';
        $siteUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http')
            . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');

        // Build email body using Smarty template
        $emailView = ViewRenderer::fromSmarty(null, false)->getSmarty();
        $emailView->assign('site_title', $siteTitle);
        $emailView->assign('site_url', $siteUrl);
        $emailView->assign('display_name', $displayName);
        $emailView->assign('username', $username);
        $emailView->assign('password', $password);

        $emailBody = $emailView->fetch('email_welcome.tpl');
        $emailAltBody = $emailView->fetch('email_welcome_text.tpl');

        require_once __DIR__ . '/../../vendor/autoload.php';

        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);

        // Debug settings
        $debugMode = getenv('DEBUG') === 'true' || getenv('DEBUG') === '1';
        $mail->SMTPDebug = $debugMode ? 3 : 0;
        $mail->Debugoutput = function ($str, $level) use ($debugMode): void {
            if ($debugMode) {
                $logFile = '/var/www/html/logs/smtp.log';
                @file_put_contents($logFile, date('Y-m-d H:i:s') . ' - ' . trim($str) . "\n", FILE_APPEND);
            }
        };

        // Server settings
        $mail->isSMTP();
        $mail->Host = $smtpHost;
        $mail->Port = $smtpPort;
        $mail->Timeout = 10;

        if ($smtpAuth) {
            $mail->SMTPAuth = true;
            $mail->Username = $smtpUsername;
            $mail->Password = $smtpPassword;
        } else {
            $mail->SMTPAuth = false;
        }

        if ($smtpSecure) {
            $mail->SMTPSecure = $smtpSecure;
        }

        $mail->SMTPOptions = [
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true,
            ],
        ];

        // Sender and recipient
        $mail->setFrom($smtpFromEmail, $smtpFromName);
        $mail->addAddress($userEmail, $displayName);

        // Content
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->Subject = "Your account has been created - {$siteTitle}";
        $mail->Body = $emailBody;
        $mail->AltBody = $emailAltBody;

        $mail->send();

        return ['success' => true];
    } catch (\PHPMailer\PHPMailer\Exception $e) {
        error_log('Welcome email PHPMailer error: ' . $e->getMessage());
        return [
            'success' => false,
            'error' => 'Failed to send email: ' . $e->getMessage(),
        ];
    } catch (\Throwable $e) {
        error_log('Welcome email error: ' . $e->getMessage());
        return [
            'success' => false,
            'error' => 'Failed to send email: ' . $e->getMessage(),
        ];
    }
}

ApiHandler::handle(function (): void {
    ['container' => $container] = bootstrapApi(requireAuth: true, requireAdmin: true);
    $userService = $container->getUserService();

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            // Get all users or single user
            if (isset($_GET['username'])) {
                $username = trim((string)$_GET['username']);
                $result = $userService->getUser($username);
                if ($result['success']) {
                    ErrorResponse::success(['data' => $result['data']]);
                }
                ErrorResponse::notFound($result['error'] ?? 'User not found');
            }

            $result = $userService->getAllUsers();
            if ($result['success']) {
                ErrorResponse::success([
                    'data' => $result['data'],
                    'count' => count($result['data']),
                ]);
            }
            ErrorResponse::internalError($result['error'] ?? 'Failed to get users');
            // phpcs:ignore -- switch exhaustiveness handled by never-returning ErrorResponse

        case 'POST':
            requireCsrfToken();
            $payload = readJsonInput();

            $sendEmail = isset($payload['send_email']) && $payload['send_email'] === true;
            $password = $payload['password'] ?? ''; // Store before creating (will be hashed)

            $result = $userService->createUser($payload);
            if ($result['success']) {
                $response = ['message' => $result['message'] ?? 'User created successfully'];

                // Send welcome email if requested
                if ($sendEmail) {
                    $emailResult = sendWelcomeEmail($container, $payload, $password);
                    $response['email_sent'] = $emailResult['success'];
                    if (!$emailResult['success']) {
                        $response['email_error'] = $emailResult['error'];
                    }
                }

                ErrorResponse::success($response);
            }
            ErrorResponse::unprocessableEntity($result['error'] ?? 'Failed to create user');

        case 'PUT':
            requireCsrfToken();
            $payload = readJsonInput();

            $username = trim((string)($payload['username'] ?? ''));
            if ($username === '') {
                ErrorResponse::badRequest('Username is required');
            }

            // Check if this is a single field update or full update
            if (isset($payload['field']) && isset($payload['value'])) {
                // Single field update
                $field = trim((string)$payload['field']);
                $value = $payload['value'];

                $result = $userService->updateUserAttribute($username, $field, $value);
            } else {
                // Full update - remove username from data
                unset($payload['username']);
                $result = $userService->updateUser($username, $payload);
            }

            if ($result['success']) {
                ErrorResponse::success(['message' => $result['message'] ?? 'User updated successfully']);
            }
            ErrorResponse::unprocessableEntity($result['error'] ?? 'Failed to update user');

        case 'DELETE':
            requireCsrfToken();
            $username = isset($_GET['username']) ? trim((string)$_GET['username']) : '';

            if ($username === '') {
                ErrorResponse::badRequest('Username is required');
            }

            $currentUser = $_SESSION['username'] ?? '';
            $result = $userService->deleteUser($username, $currentUser);

            if ($result['success']) {
                ErrorResponse::success(['message' => $result['message'] ?? 'User deleted successfully']);
            }
            ErrorResponse::unprocessableEntity($result['error'] ?? 'Failed to delete user');

        default:
            ErrorResponse::json(405, 'Method not allowed');
    }
});
