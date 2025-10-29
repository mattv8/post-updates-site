<?php
require_once(__DIR__ . '/framework/conf/config.php');
require_once(__DIR__ . '/functions.php');
require_once(__DIR__ . '/lib/MediaProcessor.php');

require(__DIR__ . '/config.local.php');
$db_conn = mysqli_connect($db_servername, $db_username, $db_password, $db_name);

// Get settings and ensure hero_height is available
$settings = getSettings($db_conn);
if (!isset($settings['hero_height'])) {
    $settings['hero_height'] = 100; // default value if not set (percentage)
}
// Ensure footer settings have defaults
if (!isset($settings['show_footer'])) {
    $settings['show_footer'] = 1;
}
if (!isset($settings['footer_layout'])) {
    $settings['footer_layout'] = 'double';
}
if (!isset($settings['footer_media_id'])) {
    $settings['footer_media_id'] = null;
}
if (!isset($settings['footer_height'])) {
    $settings['footer_height'] = 30;
}
if (!isset($settings['footer_overlay_opacity'])) {
    $settings['footer_overlay_opacity'] = 0.50;
}
if (!isset($settings['footer_overlay_color'])) {
    $settings['footer_overlay_color'] = '#000000';
}
if (!isset($settings['footer_column1_html'])) {
    $settings['footer_column1_html'] = '';
}
if (!isset($settings['footer_column2_html'])) {
    $settings['footer_column2_html'] = '';
}
$posts = getPublishedPosts($db_conn, 10, 0);

// Precompute srcset for post hero images
foreach ($posts as &$p) {
    $p['hero_srcset_jpg'] = '';
    $p['hero_srcset_webp'] = '';
    if (!empty($p['hero_variants'])) {
        $p['hero_srcset_jpg'] = MediaProcessor::generateSrcset($p['hero_variants'], 'jpg');
        $p['hero_srcset_webp'] = MediaProcessor::generateSrcset($p['hero_variants'], 'webp');
    }
}
unset($p);

// Precompute site hero srcset if configured
$hero_jpg = '';
$hero_webp = '';
if (!empty($settings['hero_media_id'])) {
    $media = getMedia($db_conn, (int)$settings['hero_media_id']);
    if ($media && !empty($media['variants_json'])) {
        $hero_jpg = MediaProcessor::generateSrcset($media['variants_json'], 'jpg');
        $hero_webp = MediaProcessor::generateSrcset($media['variants_json'], 'webp');
    }
}

// Precompute footer background srcset if configured
$footer_jpg = '';
$footer_webp = '';
if (!empty($settings['footer_media_id'])) {
    $media = getMedia($db_conn, (int)$settings['footer_media_id']);
    if ($media && !empty($media['variants_json'])) {
        $footer_jpg = MediaProcessor::generateSrcset($media['variants_json'], 'jpg');
        $footer_webp = MediaProcessor::generateSrcset($media['variants_json'], 'webp');
    }
}

$smarty->assign('settings', $settings);
$smarty->assign('posts', $posts);
$smarty->assign('hero_jpg', $hero_jpg);
$smarty->assign('hero_webp', $hero_webp);
$smarty->assign('footer_jpg', $footer_jpg);
$smarty->assign('footer_webp', $footer_webp);
$smarty->assign('page_title', $settings['site_title'] ?? '');
$smarty->assign('is_authenticated', !empty($_SESSION['authenticated']));

// If user is authenticated, generate CSRF token for post creation
if (!empty($_SESSION['authenticated'])) {
    ensureSession();
    $smarty->assign('csrf_token', generateCsrfToken());
}

// Don't call $smarty->display() - let the framework's index.tpl handle rendering
