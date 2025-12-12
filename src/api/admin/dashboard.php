<?php

declare(strict_types=1);

use PostPortal\Http\ApiHandler;
use PostPortal\Http\ErrorResponse;

require_once __DIR__ . '/../bootstrap.php';

ApiHandler::handle(function (): void {
    ['container' => $container] = bootstrapApi(requireAuth: true, requireAdmin: true);

    $postRepo = $container->getPostRepository();
    $mediaRepo = $container->getMediaRepository();

    $summary = [
        'posts_total' => $postRepo->countAll(),
        'posts_published' => $postRepo->countAll('published'),
        'media_total' => $mediaRepo->countAll(),
        'recent_posts' => $postRepo->getRecent(5),
        'recent_media' => $mediaRepo->getRecent(8),
    ];

    ErrorResponse::success(['data' => $summary]);
});
