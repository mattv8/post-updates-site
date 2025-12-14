<?php

declare(strict_types=1);

use PostPortal\Http\ApiHandler;
use PostPortal\Http\ErrorResponse;

require_once __DIR__ . '/../bootstrap.php';

ApiHandler::handle(function (): void {
    // Require admin authentication
    $context = bootstrapApi(requireAuth: true, requireAdmin: true);
    requireCsrfToken();

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        ErrorResponse::json(405, 'Method not allowed');
    }

    // Execute the cache purge script
    $output = [];
    $returnCode = 0;
    exec('/docker-scripts/cache-purge.sh 2>&1', $output, $returnCode);

    if ($returnCode !== 0) {
        error_log('Cache purge failed: ' . implode("\n", $output));
        ErrorResponse::internalError('Failed to purge cache');
    }

    // Record the cache purge timestamp in the database
    $settingsRepo = $context['container']->getSettingsRepository();
    $settingsRepo->update(['last_cache_purge' => date('Y-m-d H:i:s')]);

    ErrorResponse::success([
        'message' => 'Cache purged successfully',
        'details' => implode("\n", $output),
        'purged_at' => date('c') // ISO 8601 format for JavaScript
    ]);
});
