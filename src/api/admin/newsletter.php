<?php

declare(strict_types=1);

use PostPortal\Http\ApiHandler;
use PostPortal\Http\ErrorResponse;

require_once __DIR__ . '/../bootstrap.php';

ApiHandler::handle(function (): void {
    ['container' => $container] = bootstrapApi(requireAuth: true, requireAdmin: true);
    $newsletterService = $container->getNewsletterService();

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            $showArchived = isset($_GET['show_archived']) && $_GET['show_archived'] === 'true';
            $subscribers = $newsletterService->getSubscribers(!$showArchived ? true : false);
            ErrorResponse::success([
                'data' => $subscribers,
                'count' => count($subscribers),
            ]);
            break;
        case 'DELETE':
            requireCsrfToken();
            $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
            if ($id <= 0) {
                ErrorResponse::badRequest('Invalid subscriber ID');
            }

            $result = $newsletterService->archiveSubscriber($id);
            if ($result['success']) {
                ErrorResponse::success(['message' => $result['message'] ?? 'Subscriber archived successfully']);
            }

            ErrorResponse::internalError($result['error'] ?? 'Failed to archive subscriber');
            break;
        case 'PUT':
            requireCsrfToken();
            $payload = readJsonInput();
            $id = isset($payload['id']) ? (int) $payload['id'] : 0;
            $isActive = isset($payload['is_active']) ? (bool) $payload['is_active'] : true;

            if ($id <= 0) {
                ErrorResponse::badRequest('Subscriber ID is required');
            }

            $result = $newsletterService->updateSubscriberStatus($id, $isActive);
            if ($result['success']) {
                ErrorResponse::success(['message' => $result['message'] ?? 'Subscriber updated successfully']);
            }

            ErrorResponse::internalError($result['error'] ?? 'Failed to update subscriber');
            break;
        case 'POST':
            requireCsrfToken();
            $payload = readJsonInput();
            $email = isset($payload['email']) ? trim((string) $payload['email']) : '';

            if ($email === '') {
                ErrorResponse::badRequest('Email is required');
            }

            $result = $newsletterService->addSubscriber($email);
            if ($result['success']) {
                ErrorResponse::success([
                    'message' => $result['message'] ?? 'Subscriber added successfully',
                    'id' => $result['id'] ?? null,
                ]);
            }

            ErrorResponse::unprocessableEntity($result['error'] ?? 'Failed to add subscriber');
            break;
        default:
            ErrorResponse::json(405, 'Method not allowed');
    }
});
