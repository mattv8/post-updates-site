<?php

declare(strict_types=1);

use PostPortal\Http\ApiHandler;
use PostPortal\Http\ErrorResponse;

require_once __DIR__ . '/../bootstrap.php';

ApiHandler::handle(function (): void {
    ['container' => $container] = bootstrapApi(requireAuth: true, requireAdmin: true);
    requireCsrfToken();

    $payload = readJsonInput();
    $updates = [];

    $boolFields = ['show_hero'];
    $intFields = ['hero_media_id', 'hero_height'];
    $floatFields = ['hero_overlay_opacity'];
    $stringFields = ['hero_overlay_color'];

    $htmlFields = [
        'hero_html' => 'hero_html_draft',
        'site_bio_html' => 'site_bio_html_draft',
        'donate_text_html' => 'donate_text_html_draft',
        'donation_instructions_html' => 'donation_instructions_html_draft',
        'footer_column1_html' => 'footer_column1_html_draft',
        'footer_column2_html' => 'footer_column2_html_draft',
        'mailing_list_html' => 'mailing_list_html_draft',
    ];

    foreach ($htmlFields as $payloadKey => $dbKey) {
        if (array_key_exists($payloadKey, $payload)) {
            $updates[$dbKey] = sanitizeHtml((string) $payload[$payloadKey]);
        }
    }

    foreach ($boolFields as $key) {
        if (array_key_exists($key, $payload)) {
            $updates[$key] = (int) (bool) $payload[$key];
        }
    }

    foreach ($intFields as $key) {
        if (array_key_exists($key, $payload)) {
            $value = $payload[$key];
            $updates[$key] = ($value === '' || $value === null) ? null : (int) $value;
        }
    }

    foreach ($floatFields as $key) {
        if (array_key_exists($key, $payload)) {
            $updates[$key] = (float) $payload[$key];
        }
    }

    foreach ($stringFields as $key) {
        if (array_key_exists($key, $payload)) {
            $updates[$key] = (string) $payload[$key];
        }
    }

    if (empty($updates)) {
        ErrorResponse::success(['message' => 'No fields to update']);
    }

    $updates['updated_at'] = date('Y-m-d H:i:s');

    $settingsRepository = $container->getSettingsRepository();
    $success = $settingsRepository->update($updates);

    if (!$success) {
        ErrorResponse::unprocessableEntity('Failed to save settings draft');
    }

    ErrorResponse::success();
});
