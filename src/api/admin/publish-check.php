<?php

declare(strict_types=1);

use PostPortal\Http\ApiHandler;
use PostPortal\Http\ErrorResponse;

require_once __DIR__ . '/../bootstrap.php';

ApiHandler::handle(function (): void {
    ['container' => $container, 'db' => $db] = bootstrapApi(requireAuth: true, requireAdmin: true);

    $postId = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    $postService = $container->getPostService();
    $newsletterService = $container->getNewsletterService();

    // Get email configuration status (includes subscriber count)
    // Skip SMTP connection test for faster response - we just need the subscriber count
    // The actual connection will be tested when sending emails
    $emailConfig = checkEmailConfiguration($db, testConnection: false);

    $response = [
        'subscriberCount' => $emailConfig['subscriberCount'],
        'canSendEmail' => $emailConfig['canSend'],
    ];

    // Include error info if email can't be sent
    if (!$emailConfig['canSend']) {
        $response['emailError'] = $emailConfig['error'] ?? null;
        $response['actionRequired'] = $emailConfig['actionRequired'] ?? null;
        $response['actionLabel'] = $emailConfig['actionLabel'] ?? null;
    }

    // If post ID provided, also check if it's first publish
    if ($postId > 0) {
        $post = $postService->getPost($postId);
        if ($post !== null) {
            $response['isFirstPublish'] = is_null($post['published_at']);
        }
    }

    ErrorResponse::success($response);
});
