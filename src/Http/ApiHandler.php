<?php

declare(strict_types=1);

namespace PostPortal\Http;

/**
 * API request handler with error catching
 */
class ApiHandler
{
    /**
     * Handle an API request with automatic error handling
     *
     * @param callable $fn Function to execute
     * @return void
     */
    public static function handle(callable $fn): void
    {
        try {
            $fn();
        } catch (\Throwable $e) {
            error_log('API error: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());
            ErrorResponse::internalError('Internal server error');
        }
    }
}
