<?php

declare(strict_types=1);

use PostPortal\Http\ApiHandler;
use PostPortal\Http\ErrorResponse;
use PostPortal\Lib\MediaProcessor;

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../../lib/MediaProcessor.php';

/**
 * Ensure upload directories exist and are writable to avoid silent 500s when PHP cannot write files.
 */
function ensureUploadWritable(string $baseDir): void
{
    $paths = [
        $baseDir,
        $baseDir . '/originals',
        $baseDir . '/variants',
    ];

    foreach ($paths as $path) {
        if (!is_dir($path)) {
            if (!@mkdir($path, 0775, true)) {
                $err = error_get_last();
                ErrorResponse::internalError('Upload directory missing and could not be created: ' . $path . ' (' . ($err['message'] ?? 'unknown error') . ')');
            }
        }

        if (!is_writable($path)) {
            ErrorResponse::internalError('Upload directory is not writable: ' . $path . '. Please adjust permissions for the web server user.');
        }
    }
}

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
            try {
                requireCsrfToken();
                if (!isset($_FILES['file'])) {
                    ErrorResponse::badRequest('Missing file');
                }

                // Preflight permissions to surface clear errors when storage is not writable
                $uploadBase = realpath(__DIR__ . '/../../storage/uploads') ?: __DIR__ . '/../../storage/uploads';
                ensureUploadWritable($uploadBase);

                $alt = $_POST['alt_text'] ?? '';
                $username = $_SESSION['username'] ?? 'admin';

                $cropData = null;
                if (!empty($_POST['crop'])) {
                    $cropData = json_decode((string) $_POST['crop'], true);
                }

                $processor = new MediaProcessor(__DIR__ . '/../../storage/uploads');
                $result = $processor->processUpload($_FILES['file'], $alt, $username, $cropData);
                if (!$result['success']) {
                    $msg = $result['error'] ?? 'Media upload failed (no error detail)';
                    error_log('Media upload failed: ' . $msg);
                    ErrorResponse::badRequest($msg);
                }

                $data = $result['data'] ?? [];
                if (!is_array($data)) {
                    error_log('Media upload returned non-array data');
                    ErrorResponse::badRequest('Invalid media data');
                }

                $create = $mediaService->createMedia($data);
                if (!$create['success'] || empty($create['id'])) {
                    error_log('Media DB create failed: ' . ($create['error'] ?? 'unknown error'));
                    ErrorResponse::badRequest($create['error'] ?? 'Failed to save media');
                }

                $mediaRecord = $mediaService->getMedia((int) $create['id']);
                ErrorResponse::success([
                    'id' => $create['id'],
                    'data' => $mediaRecord,
                ]);
            } catch (\Throwable $e) {
                error_log('Media upload exception: ' . $e->getMessage());
                ErrorResponse::internalError('Media upload failed');
            }
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
                // Idempotent: already gone
                ErrorResponse::success();
            }

            // Delete files first; abort if that fails
            $processor = new MediaProcessor(__DIR__ . '/../../storage/uploads');
            $deleteResult = $processor->deleteMedia($media['filename'], $media['variants_json'] ?? null);
            if (empty($deleteResult['success'])) {
                error_log("Media file delete failed (id={$id}): " . ($deleteResult['error'] ?? 'unknown'));
                ErrorResponse::badRequest($deleteResult['error'] ?? 'Failed to delete files');
            }

            // Remove DB record
            $mediaService->deleteMedia($id);
            ErrorResponse::success();
            break;
        default:
            ErrorResponse::json(405, 'Method not allowed');
    }
});
