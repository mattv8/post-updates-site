<?php

declare(strict_types=1);

use PostPortal\Http\ApiHandler;
use PostPortal\Http\ErrorResponse;

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../../lib/MediaProcessor.php';

ApiHandler::handle(function (): void {
    ['container' => $container, 'db' => $db] = bootstrapApi(requireAuth: true, requireAdmin: true);
    $mediaService = $container->getMediaService();

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            if (isset($_GET['id']) && $_GET['id']) {
                $id = (int) $_GET['id'];
                $media = $mediaService->getMedia($id);
                if (!$media) {
                    ErrorResponse::notFound('Media not found');
                }

                ErrorResponse::success(['data' => $media]);
            }

            if (isset($_GET['check_usage']) && $_GET['check_usage']) {
                $id = (int) $_GET['check_usage'];
                $usage = $mediaService->getUsage($id);
                ErrorResponse::success(['data' => $usage]);
            }

            $page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;
            $limit = isset($_GET['limit']) ? min(100, max(1, (int) $_GET['limit'])) : 40;
            $search = $_GET['q'] ?? null;
            $offset = ($page - 1) * $limit;

            $rows = $mediaService->getAllMedia($limit, $offset, $search);
            ErrorResponse::success([
                'data' => $rows,
                'meta' => [
                    'page' => $page,
                    'limit' => $limit,
                ],
            ]);
            break;
        case 'POST':
            requireCsrfToken();
            if (!isset($_FILES['file'])) {
                ErrorResponse::badRequest('Missing file');
            }

            $alt = $_POST['alt_text'] ?? '';
            $username = $_SESSION['username'];

            $cropData = null;
            if (!empty($_POST['crop'])) {
                $cropData = json_decode((string) $_POST['crop'], true);
            }

            $processor = new MediaProcessor(__DIR__ . '/../../storage/uploads');
            $result = $processor->processUpload($_FILES['file'], $alt, $username, $cropData);
            if (!$result['success']) {
                ErrorResponse::badRequest($result['error'] ?? 'Media upload failed');
            }

            $data = $result['data'] ?? [];
            if (!is_array($data)) {
                ErrorResponse::internalError('Invalid media data');
            }

            $create = $mediaService->createMedia($data);
            if (!$create['success'] || empty($create['id'])) {
                ErrorResponse::internalError($create['error'] ?? 'Failed to save media');
            }

            $mediaRecord = $mediaService->getMedia((int) $create['id']);
            ErrorResponse::success([
                'id' => $create['id'],
                'data' => $mediaRecord,
            ]);
            break;
        case 'PUT':
            requireCsrfToken();
            parse_str($_SERVER['QUERY_STRING'] ?? '', $query);
            $id = isset($query['id']) ? (int) $query['id'] : 0;
            if ($id <= 0) {
                ErrorResponse::badRequest('Missing id');
            }

            $payload = readJsonInput();
            if (!isset($payload['alt_text'])) {
                ErrorResponse::badRequest('Nothing to update');
            }

            $res = $mediaService->updateAltText($id, (string) $payload['alt_text']);
            if (!$res['success']) {
                ErrorResponse::badRequest($res['error'] ?? 'Failed to update alt text');
            }

            ErrorResponse::success(['success' => true]);
            break;
        case 'DELETE':
            requireCsrfToken();
            parse_str($_SERVER['QUERY_STRING'] ?? '', $query);
            $id = isset($query['id']) ? (int) $query['id'] : 0;
            if ($id <= 0) {
                ErrorResponse::badRequest('Missing id');
            }

            $media = $mediaService->getMedia($id);
            if (!$media) {
                ErrorResponse::notFound('Not found');
            }

            $processor = new MediaProcessor(__DIR__ . '/../../storage/uploads');
            $processor->deleteMedia($media['filename'], $media['variants_json'] ?? null);

            $deleted = $mediaService->deleteMedia($id);
            ErrorResponse::success(['success' => $deleted]);
            break;
        default:
            ErrorResponse::json(405, 'Method not allowed');
    }
});
