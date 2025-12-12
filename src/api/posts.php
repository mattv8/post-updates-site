<?php

declare(strict_types=1);

require_once(__DIR__ . '/../functions.php');
require_once(__DIR__ . '/../lib/MediaProcessor.php');
require(__DIR__ . '/../config.local.php');

header('Content-Type: application/json');

// DB connection
$db_conn = getDbConnection($db_servername, $db_username, $db_password, $db_name);
if (!$db_conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'DB connection failed']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
    // Single post by id
    if (isset($_GET['id'])) {
        $id = (int)$_GET['id'];
        $post = getPost($db_conn, $id);
        if (!$post || $post['status'] !== 'published') {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Not found']);
            exit;
        }
        // Enrich media srcsets if present
        $post['hero_srcset_jpg'] = '';
        $post['hero_srcset_webp'] = '';
        if (!empty($post['hero_media_id'])) {
            $media = getMedia($db_conn, (int)$post['hero_media_id']);
            if ($media && !empty($media['variants_json'])) {
                $post['hero_srcset_jpg'] = MediaProcessor::generateSrcset($media['variants_json'], 'jpg');
                $post['hero_srcset_webp'] = MediaProcessor::generateSrcset($media['variants_json'], 'webp');
            }
        }

        // Enrich gallery images
        $post['gallery_images'] = [];
        if (!empty($post['gallery_media_ids'])) {
            $galleryIds = json_decode($post['gallery_media_ids'], true);
            if (is_array($galleryIds)) {
                foreach ($galleryIds as $galleryId) {
                    $galleryMedia = getMedia($db_conn, (int)$galleryId);
                    if ($galleryMedia) {
                        $post['gallery_images'][] = [
                            'id' => $galleryMedia['id'],
                            'alt_text' => $galleryMedia['alt_text'] ?? '',
                            'width' => $galleryMedia['width'],
                            'height' => $galleryMedia['height'],
                            'srcset_jpg' => MediaProcessor::generateSrcset($galleryMedia['variants_json'], 'jpg'),
                            'srcset_webp' => MediaProcessor::generateSrcset($galleryMedia['variants_json'], 'webp'),
                            'original_path' => $galleryMedia['storage_path']
                        ];
                    }
                }
            }
        }        echo json_encode(['success' => true, 'post' => $post]);
        exit;
    }

    // List posts (published)
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    $posts = getPublishedPosts($db_conn, $limit, $offset);

    // Enrich posts with hero srcsets if variants available
    if (is_array($posts)) {
        foreach ($posts as &$p) {
            $p['hero_srcset_jpg'] = '';
            $p['hero_srcset_webp'] = '';
            if (!empty($p['hero_variants'])) {
                $p['hero_srcset_jpg'] = MediaProcessor::generateSrcset($p['hero_variants'], 'jpg');
                $p['hero_srcset_webp'] = MediaProcessor::generateSrcset($p['hero_variants'], 'webp');
            }
        }
        unset($p);
    }

    echo json_encode(['success' => true, 'posts' => $posts]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
} catch (\Throwable $e) {
    error_log('API error in posts.php: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal server error']);
}
