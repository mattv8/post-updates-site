<?php

declare(strict_types=1);

use PostPortal\Http\ApiHandler;
use PostPortal\Http\ErrorResponse;

require_once __DIR__ . '/../bootstrap.php';

ApiHandler::handle(function (): void {
    ['container' => $container] = bootstrapApi(requireAuth: true, requireAdmin: true);

    $postId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if ($postId <= 0) {
        ErrorResponse::badRequest('Missing post ID');
    }

    $postService = $container->getPostService();
    $newsletterService = $container->getNewsletterService();

    $post = $postService->getPost($postId);
    if ($post === null) {
        ErrorResponse::notFound('Post not found');
    }

    $isFirstPublish = is_null($post['published_at']);
    $subscriberCount = $newsletterService->getActiveSubscriberCount();

    ErrorResponse::success([
        'isFirstPublish' => $isFirstPublish,
        'subscriberCount' => $subscriberCount,
    ]);
});
