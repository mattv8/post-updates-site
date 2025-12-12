<?php

declare(strict_types=1);

use PostPortal\Http\ApiHandler;
use PostPortal\Http\ErrorResponse;

require_once __DIR__ . '/../bootstrap.php';

ApiHandler::handle(function (): void {
    ['container' => $container, 'db' => $db] = bootstrapApi(requireAuth: true, requireAdmin: true);

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            if (isset($_GET['action']) && $_GET['action'] === 'publish') {
                requireCsrfToken();
                $res = publishSettingsDraft($db);
                if ($res['success']) {
                    ErrorResponse::success();
                }

                ErrorResponse::unprocessableEntity($res['error'] ?? 'Failed to publish settings');
            }

            $settings = $container->getSettingsRepository()->getSettings();

            if ($settings) {
                $settings['hero_html_editing'] = $settings['hero_html_draft'] ?? $settings['hero_html'];
                $settings['site_bio_html_editing'] = $settings['site_bio_html_draft'] ?? $settings['site_bio_html'];
                $settings['donate_text_html_editing'] = $settings['donate_text_html_draft'] ?? $settings['donate_text_html'];
                $settings['donation_instructions_html_editing'] = $settings['donation_instructions_html_draft'] ?? $settings['donation_instructions_html'];
                $settings['footer_column1_html_editing'] = $settings['footer_column1_html_draft'] ?? $settings['footer_column1_html'];
                $settings['footer_column2_html_editing'] = $settings['footer_column2_html_draft'] ?? $settings['footer_column2_html'];
                $settings['mailing_list_html_editing'] = $settings['mailing_list_html_draft'] ?? $settings['mailing_list_html'];
            }

            ErrorResponse::success(['data' => $settings ?? []]);
            break;
        case 'POST':
        case 'PUT':
            requireCsrfToken();
            $payload = $_POST;
            if (empty($payload)) {
                $payload = readJsonInput();
            }

            $res = updateSettings($db, $payload);
            if ($res['success']) {
                ErrorResponse::success();
            }

            ErrorResponse::unprocessableEntity($res['error'] ?? 'Failed to update settings');
            break;
        default:
            ErrorResponse::json(405, 'Method not allowed');
    }
});
