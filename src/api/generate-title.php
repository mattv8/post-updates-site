<?php

declare(strict_types=1);

/**
 * Generate Title API Endpoint
 * Uses OpenAI to generate a post title from the content body
 */

session_start();
header('Content-Type: application/json');

require_once($_SERVER['DOCUMENT_ROOT'] . '/config.local.php');
require_once($_SERVER['DOCUMENT_ROOT'] . '/functions.php');
require_once($_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php');

use OpenAI;

// Check authentication
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Get POST data
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['content']) || empty(trim($input['content']))) {
    http_response_code(400);
    echo json_encode(['error' => 'Content is required']);
    exit;
}

$content = trim($input['content']);

// Check if OpenAI API key is configured
if (empty($openai_api_key)) {
    http_response_code(500);
    echo json_encode(['error' => 'OpenAI API key not configured']);
    exit;
}

try {
    // Create OpenAI client
    $client = OpenAI::client($openai_api_key);

    // Strip HTML tags from content for better context
    $plainContent = strip_tags($content);

    // Truncate content if too long (to avoid token limits)
    $maxContentLength = 2000;
    if (strlen($plainContent) > $maxContentLength) {
        $plainContent = substr($plainContent, 0, $maxContentLength) . '...';
    }

    // Get custom AI system prompt from settings, or use default
    $db_conn = mysqli_connect($db_servername, $db_username, $db_password, $db_name);
    $systemPrompt = DEFAULT_AI_SYSTEM_PROMPT;

    if ($db_conn) {
        $result = mysqli_query($db_conn, 'SELECT ai_system_prompt FROM settings WHERE id = 1');
        if ($result) {
            $row = mysqli_fetch_assoc($result);
            if (!empty($row['ai_system_prompt'])) {
                $systemPrompt = $row['ai_system_prompt'];
            }
        }
        mysqli_close($db_conn);
    }

    // Generate title using OpenAI
    $response = $client->chat()->create([
        'model' => 'gpt-4o-mini',
        'messages' => [
            [
                'role' => 'system',
                'content' => $systemPrompt
            ],
            [
                'role' => 'user',
                'content' => "Create a title for this post:\n\n" . $plainContent
            ]
        ],
        'max_tokens' => 100,
        'temperature' => 0.7,
    ]);

    $generatedTitle = trim($response->choices[0]->message->content);

    // Remove any quotes that might be added
    $generatedTitle = trim($generatedTitle, '"\'');

    echo json_encode([
        'success' => true,
        'title' => $generatedTitle
    ]);

} catch (Exception $e) {
    error_log("OpenAI API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to generate title: ' . $e->getMessage()]);
}
