<?php

declare(strict_types=1);

use PostPortal\Http\ApiHandler;
use PostPortal\Http\ErrorResponse;

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../lib/MediaProcessor.php';

ApiHandler::handle(function (): void {
    ['container' => $container] = bootstrapApi();
    $postService = $container->getPostService();
    $mediaService = $container->getMediaService();

    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        ErrorResponse::json(405, 'Method not allowed');
    }

    if (isset($_GET['id'])) {
        $id = (int) $_GET['id'];
        $post = $postService->getPost($id);
        if (!$post || ($post['status'] ?? '') !== 'published') {
            ErrorResponse::notFound('Not found');
        }

        $post['hero_srcset_jpg'] = '';
        $post['hero_srcset_webp'] = '';
        if (!empty($post['hero_media_id'])) {
            $media = $mediaService->getMedia((int) $post['hero_media_id']);
            if ($media && !empty($media['variants_json'])) {
                $post['hero_srcset_jpg'] = MediaProcessor::generateSrcset($media['variants_json'], 'jpg');
                $post['hero_srcset_webp'] = MediaProcessor::generateSrcset($media['variants_json'], 'webp');
            }
        }

        $post['gallery_images'] = [];
        if (!empty($post['gallery_media_ids'])) {
            $galleryIds = json_decode((string) $post['gallery_media_ids'], true);
            if (is_array($galleryIds)) {
                foreach ($galleryIds as $galleryId) {
                    $galleryMedia = $mediaService->getMedia((int) $galleryId);
                    if ($galleryMedia) {
                        $post['gallery_images'][] = [
                            'id' => $galleryMedia['id'],
                            'alt_text' => $galleryMedia['alt_text'] ?? '',
                            'width' => $galleryMedia['width'],
                            'height' => $galleryMedia['height'],
                            'srcset_jpg' => MediaProcessor::generateSrcset($galleryMedia['variants_json'], 'jpg'),
                            'srcset_webp' => MediaProcessor::generateSrcset($galleryMedia['variants_json'], 'webp'),
                            'original_path' => $galleryMedia['storage_path'],
                        ];
                    }
                }
            }
        }

        ErrorResponse::success(['post' => $post]);
    }

    $limit = isset($_GET['limit']) ? max(1, (int) $_GET['limit']) : 10;
    $offset = isset($_GET['offset']) ? max(0, (int) $_GET['offset']) : 0;
    $posts = $postService->getPublishedPosts($limit, $offset);

    foreach ($posts as &$p) {
        $p['hero_srcset_jpg'] = '';
        $p['hero_srcset_webp'] = '';
        if (!empty($p['hero_variants'])) {
            $p['hero_srcset_jpg'] = MediaProcessor::generateSrcset($p['hero_variants'], 'jpg');
            $p['hero_srcset_webp'] = MediaProcessor::generateSrcset($p['hero_variants'], 'webp');
        }
    }
    unset($p);

    ErrorResponse::success(['posts' => $posts]);
});
