<?php

declare(strict_types=1);

namespace PostPortal\Http;

/**
 * Standardized error response helper for HTTP/JSON responses
 */
class ErrorResponse
{
    /**
     * Send a JSON error response with the specified HTTP status code
     *
     * @param int $code HTTP status code
     * @param string $message Error message
     * @param array<string, mixed> $extra Additional data to include in response
     * @return never
     */
    public static function json(int $code, string $message, array $extra = []): never
    {
        http_response_code($code);
        echo json_encode(array_merge(['success' => false, 'error' => $message], $extra));
        exit;
    }

    /**
     * Send a JSON success response with the specified HTTP status code
     *
     * @param array<string, mixed> $data Data to include in response
     * @param int $code HTTP status code (default 200)
     * @return never
     */
    public static function success(array $data = [], int $code = 200): never
    {
        http_response_code($code);
        echo json_encode(array_merge(['success' => true], $data));
        exit;
    }

    /**
     * Send a 400 Bad Request response
     *
     * @param string $message Error message
     * @param array<string, mixed> $extra Additional data
     * @return never
     */
    public static function badRequest(string $message, array $extra = []): never
    {
        self::json(400, $message, $extra);
    }

    /**
     * Send a 401 Unauthorized response
     *
     * @param string $message Error message
     * @param array<string, mixed> $extra Additional data
     * @return never
     */
    public static function unauthorized(string $message = 'Unauthorized', array $extra = []): never
    {
        self::json(401, $message, $extra);
    }

    /**
     * Send a 403 Forbidden response
     *
     * @param string $message Error message
     * @param array<string, mixed> $extra Additional data
     * @return never
     */
    public static function forbidden(string $message = 'Forbidden', array $extra = []): never
    {
        self::json(403, $message, $extra);
    }

    /**
     * Send a 404 Not Found response
     *
     * @param string $message Error message
     * @param array<string, mixed> $extra Additional data
     * @return never
     */
    public static function notFound(string $message = 'Not found', array $extra = []): never
    {
        self::json(404, $message, $extra);
    }

    /**
     * Send a 409 Conflict response
     *
     * @param string $message Error message
     * @param array<string, mixed> $extra Additional data
     * @return never
     */
    public static function conflict(string $message, array $extra = []): never
    {
        self::json(409, $message, $extra);
    }

    /**
     * Send a 422 Unprocessable Entity response
     *
     * @param string $message Error message
     * @param array<string, mixed> $extra Additional data
     * @return never
     */
    public static function unprocessableEntity(string $message, array $extra = []): never
    {
        self::json(422, $message, $extra);
    }

    /**
     * Send a 500 Internal Server Error response
     *
     * @param string $message Error message
     * @param array<string, mixed> $extra Additional data
     * @return never
     */
    public static function internalError(string $message = 'Internal server error', array $extra = []): never
    {
        self::json(500, $message, $extra);
    }
}
