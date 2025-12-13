<?php

declare(strict_types=1);

/**
 * Branding API
 * Handles logo and favicon uploads with cropping
 */
use PostPortal\Http\ApiHandler;
use PostPortal\Http\ErrorResponse;
use PostPortal\Lib\MediaProcessor;

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../../lib/MediaProcessor.php';

ApiHandler::handle(function (): void {
    ['container' => $container] = bootstrapApi(requireAuth: true, requireAdmin: true);
    $settingsRepository = $container->getSettingsRepository();
    $mediaService = $container->getMediaService();

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            $settings = $settingsRepository->getSettings();
            if ($settings === null) {
                ErrorResponse::internalError('Settings not found');
            }

            $branding = [
                'logo_media_id' => $settings['logo_media_id'] ?? null,
                'favicon_media_id' => $settings['favicon_media_id'] ?? null,
            ];

            if (!empty($branding['logo_media_id'])) {
                $branding['logo'] = $mediaService->getMedia((int) $branding['logo_media_id']);
            }

            if (!empty($branding['favicon_media_id'])) {
                $branding['favicon'] = $mediaService->getMedia((int) $branding['favicon_media_id']);
            }

            ErrorResponse::success(['data' => $branding]);
            break;
        case 'POST':
            requireCsrfToken();

            $type = $_POST['type'] ?? null;
            if (!in_array($type, ['logo', 'favicon'], true)) {
                ErrorResponse::badRequest('Invalid type. Must be "logo" or "favicon"');
            }

            if (!isset($_FILES['file'])) {
                ErrorResponse::badRequest('Missing file');
            }

            $cropData = null;
            if (!empty($_POST['crop'])) {
                $cropData = json_decode((string) $_POST['crop'], true);
            }

            $username = $_SESSION['username'];
            $processor = new MediaProcessor(__DIR__ . '/../../storage/uploads');

            $result = $type === 'logo'
                ? $processor->processLogoUpload($_FILES['file'], $cropData, $username)
                : $processor->processFaviconUpload($_FILES['file'], $cropData, $username);

            if (!$result['success']) {
                ErrorResponse::badRequest($result['error'] ?? 'Upload failed');
            }

            $mediaData = $result['data'] ?? [];
            if (!is_array($mediaData)) {
                ErrorResponse::internalError('Invalid media payload');
            }

            $created = $mediaService->createMedia($mediaData);
            if (!$created['success'] || empty($created['id'])) {
                ErrorResponse::internalError($created['error'] ?? 'Failed to save media record');
            }

            $field = $type === 'logo' ? 'logo_media_id' : 'favicon_media_id';
            $settingsRepository->update([$field => (int) $created['id']]);

            ErrorResponse::success([
                'success' => true,
                'id' => $created['id'],
                'data' => $mediaData,
            ]);
            break;
        case 'PUT':
            requireCsrfToken();
            $payload = readJsonInput();

            $updates = [];
            if (array_key_exists('logo_media_id', $payload)) {
                $updates['logo_media_id'] = $payload['logo_media_id'] ?: null;
            }
            if (array_key_exists('favicon_media_id', $payload)) {
                $updates['favicon_media_id'] = $payload['favicon_media_id'] ?: null;
            }

            if (empty($updates)) {
                ErrorResponse::badRequest('No fields to update');
            }

            $settingsRepository->update($updates);
            ErrorResponse::success(['success' => true]);
            break;
        case 'DELETE':
            requireCsrfToken();

            parse_str(file_get_contents('php://input'), $params);
            $type = $params['type'] ?? $_GET['type'] ?? null;
            if (!in_array($type, ['logo', 'favicon'], true)) {
                ErrorResponse::badRequest('Invalid type');
            }

            $field = $type === 'logo' ? 'logo_media_id' : 'favicon_media_id';
            $settingsRepository->update([$field => null]);
            ErrorResponse::success(['success' => true]);
            break;
        default:
            ErrorResponse::json(405, 'Method not allowed');
    }
});
