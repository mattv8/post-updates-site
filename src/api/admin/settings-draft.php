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
