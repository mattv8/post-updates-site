<?php

declare(strict_types=1);

/**
 * Newsletter Subscription API
 * Handles email subscription submissions from the mailing list form
 */
use PostPortal\Http\ApiHandler;
use PostPortal\Http\ErrorResponse;

require_once __DIR__ . '/bootstrap.php';

ApiHandler::handle(function (): void {
    ['container' => $container] = bootstrapApi();
    $newsletterService = $container->getNewsletterService();

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        ErrorResponse::json(405, 'Method not allowed');
    }

    $payload = readJsonInput();
    if (!isset($payload['email'])) {
        ErrorResponse::badRequest('Email is required');
    }

    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
    $result = $newsletterService->subscribe((string) $payload['email'], $ipAddress);

    if (!$result['success']) {
        $message = $result['error'] ?? 'Failed to subscribe';
        ErrorResponse::badRequest($message);
    }

    ErrorResponse::success($result);
});
