<?php

declare(strict_types=1);

use PostPortal\Http\ApiHandler;
use PostPortal\Http\ErrorResponse;

require_once __DIR__ . '/../bootstrap.php';

ApiHandler::handle(function (): void {
    ['container' => $container] = bootstrapApi(requireAuth: true, requireAdmin: true);
    $postService = $container->getPostService();

    if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
        ErrorResponse::json(405, 'Method not allowed');
    }

    requireCsrfToken();
    parse_str($_SERVER['QUERY_STRING'] ?? '', $query);
    $id = isset($query['id']) ? (int) $query['id'] : 0;
    if ($id <= 0) {
        ErrorResponse::badRequest('Missing id');
    }

    $payload = readJsonInput();
    $result = $postService->updateDraftFields($id, $payload);

    if (!$result['success']) {
        ErrorResponse::badRequest($result['error'] ?? 'Failed to update draft');
    }

    ErrorResponse::success(['message' => 'Draft saved']);
});
