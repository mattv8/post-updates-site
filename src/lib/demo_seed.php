<?php
/**
 * Demo data seeder
 * - Enabled only when DEMO_MODE=true (or --force flag is passed)
 * - Resets content, media, and newsletter subscribers
 * - Seeds hero/about/newsletter/donation/footer sections and a few example posts
 */

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    fwrite(STDERR, "This script must be run from the CLI.\n");
    exit(1);
}

$force = in_array('--force', $argv, true);
$demoMode = filter_var(getenv('DEMO_MODE') ?: 'false', FILTER_VALIDATE_BOOLEAN);

if (!$demoMode && !$force) {
    fwrite(STDOUT, "DEMO_MODE is not enabled. Exiting without seeding.\n");
    exit(0);
}

$projectRoot = realpath(__DIR__ . '/..');
if (empty($_SERVER['DOCUMENT_ROOT'])) {
    $_SERVER['DOCUMENT_ROOT'] = $projectRoot;
}

require_once $projectRoot . '/functions.php';
require_once __DIR__ . '/MediaProcessor.php';

$mysqlHost = getenv('MYSQL_HOST') ?: 'localhost';
$mysqlDatabase = getenv('MYSQL_DATABASE') ?: 'postportal';
$mysqlUsername = getenv('MYSQL_USER') ?: 'postportal';
$mysqlPassword = getenv('MYSQL_PASSWORD') ?: 'postportal';

$db = mysqli_connect($mysqlHost, $mysqlUsername, $mysqlPassword, $mysqlDatabase);
if (!$db) {
    fwrite(STDERR, "Failed to connect to database: " . mysqli_connect_error() . "\n");
    exit(1);
}
mysqli_set_charset($db, 'utf8mb4');

$siteTitle = 'Post Portal Demo';

function clearUploadsDirectory(string $uploadsDir): void
{
    if (!is_dir($uploadsDir)) {
        return;
    }

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($uploadsDir, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );

    foreach ($iterator as $fileInfo) {
        $path = $fileInfo->getPathname();
        if ($fileInfo->isDir()) {
            @rmdir($path);
        } else {
            @unlink($path);
        }
    }
}

function downloadImage(string $url): string
{
    $context = stream_context_create([
        'http' => ['timeout' => 15],
        'https' => ['timeout' => 15],
    ]);

    $data = @file_get_contents($url, false, $context);
    if ($data === false) {
        throw new RuntimeException("Failed to download image: {$url}");
    }

    $tmpFile = tempnam(sys_get_temp_dir(), 'demo_img_');
    file_put_contents($tmpFile, $data);
    return $tmpFile;
}

function ensureSettingsRow(mysqli $db): void
{
    $res = mysqli_query($db, 'SELECT COUNT(*) AS c FROM settings WHERE id = 1');
    $row = $res ? mysqli_fetch_assoc($res) : ['c' => 0];
    if ((int)($row['c'] ?? 0) === 0) {
        mysqli_query($db, "INSERT INTO settings (id, site_title) VALUES (1, '')");
    }
}

function seedMedia(mysqli $db, array $images, string $uploadsDir): array
{
    $processor = new MediaProcessor($uploadsDir);
    $mediaIds = [];

    foreach ($images as $image) {
        $tmpFile = downloadImage($image['url']);
        $mime = mime_content_type($tmpFile) ?: 'image/jpeg';
        $fileArray = [
            'name' => $image['name'],
            'type' => $mime,
            'tmp_name' => $tmpFile,
            'error' => UPLOAD_ERR_OK,
            'size' => filesize($tmpFile),
        ];

        $upload = $processor->processUpload($fileArray, $image['alt'], $image['user'] ?? 'admin');
        @unlink($tmpFile);

        if (!$upload['success']) {
            throw new RuntimeException('Image processing failed: ' . ($upload['error'] ?? 'unknown error'));
        }

        $save = saveMediaRecord($db, $upload['data']);
        if (!$save['success']) {
            throw new RuntimeException('Failed to save media record: ' . ($save['error'] ?? 'unknown error'));
        }

        $mediaIds[$image['key']] = $save['id'];
    }

    return $mediaIds;
}

function getPostAnalytics(mysqli $db): array
{
    $analytics = [];
    $result = mysqli_query($db, 'SELECT title, view_count, unique_view_count, impression_count, unique_impression_count FROM posts');
    if ($result) {
        while ($row = mysqli_fetch_assoc($result)) {
            $analytics[$row['title']] = [
                'view_count' => (int)$row['view_count'],
                'unique_view_count' => (int)$row['unique_view_count'],
                'impression_count' => (int)$row['impression_count'],
                'unique_impression_count' => (int)$row['unique_impression_count'],
            ];
        }
    }
    return $analytics;
}

function restorePostAnalytics(mysqli $db, array $analytics): void
{
    if (empty($analytics)) {
        return;
    }
    $stmt = mysqli_prepare($db, 'UPDATE posts SET view_count = ?, unique_view_count = ?, impression_count = ?, unique_impression_count = ? WHERE title = ?');
    foreach ($analytics as $title => $counts) {
        mysqli_stmt_bind_param(
            $stmt,
            'iiiis',
            $counts['view_count'],
            $counts['unique_view_count'],
            $counts['impression_count'],
            $counts['unique_impression_count'],
            $title
        );
        mysqli_stmt_execute($stmt);
    }
}

function resetTables(mysqli $db): void
{
    mysqli_query($db, 'SET FOREIGN_KEY_CHECKS=0');

    $tables = ['posts', 'media', 'newsletter_subscribers'];
    foreach ($tables as $table) {
        mysqli_query($db, "TRUNCATE TABLE `{$table}`");
    }

    // Detach media references in settings before re-seeding
    mysqli_query($db, 'UPDATE settings SET hero_media_id = NULL, footer_media_id = NULL, donation_qr_media_id = NULL, logo_media_id = NULL, favicon_media_id = NULL');

    mysqli_query($db, 'SET FOREIGN_KEY_CHECKS=1');
}

function chooseAuthor(mysqli $db): string
{
    $admin = mysqli_query($db, "SELECT username FROM users WHERE username = 'admin' LIMIT 1");
    if ($admin && mysqli_num_rows($admin) === 1) {
        $row = mysqli_fetch_assoc($admin);
        return $row['username'];
    }

    $any = mysqli_query($db, 'SELECT username FROM users ORDER BY username LIMIT 1');
    if ($any && mysqli_num_rows($any) === 1) {
        $row = mysqli_fetch_assoc($any);
        return $row['username'];
    }

    return 'admin';
}

function seedSettings(mysqli $db, array $mediaIds, string $siteTitle): void
{
    $heroId = $mediaIds['hero'] ?? null;
    $footerId = $mediaIds['footer'] ?? null;

    $heroHtml = '<h1>Post Portal Demo</h1>' .
        '<p>Resets every 12 hours to keep things tidy. Feel free to edit; we will refresh periodically.</p>' .
        '<p class="mb-0 small text-light">Built for a friend who needed one place to share health updates. Self-hosted so you stay in control.</p>';

    $bioHtml = '<p>Post Portal is a lightweight, self-hosted update blog. Originally built for a friend going through a health issue who needed a single place to update people without social media.</p>' .
        '<p>No fluff: Docker deploy, WYSIWYG posts with hero + gallery, newsletter signup, donation links, and simple analytics.</p>';

    $donateHtml = '<h3>Support</h3><p>If this project helps you, consider tossing a few bucks toward hosting or coffee.</p>';
    $donationInstructions = '<p>Demo mode: this link is just an example.</p>';

    $mailingListHtml = '<p>Subscribe to see how the flow works. In demo mode, signups are cleared when the site resets.</p>';

    $footerCol1 = '<h4>About</h4><p>Self-hosted updates with no platform lock-in. MIT licensed.</p>';
    $footerCol2 = '<h4>Links</h4><ul class="mb-0"><li><a href="https://github.com/mattv8/post-portal" target="_blank">GitHub</a></li><li><a href="#updates">Latest posts</a></li></ul>';

    $stmt = mysqli_prepare($db, 'UPDATE settings SET
        site_title = ?,
        hero_html = ?,
        hero_media_id = ?,
        hero_overlay_opacity = 0.55,
        hero_overlay_color = "#000000",
        hero_height = 30,
        site_bio_html = ?,
        cta_text = "Read updates",
        cta_url = "#updates",
        donate_text_html = ?,
        donation_method = "link",
        donation_link = "https://ko-fi.com/mattv8",
        donation_qr_media_id = NULL,
        donation_instructions_html = ?,
        show_hero = 1,
        show_about = 1,
        show_donation = 1,
        show_donate_button = 1,
        show_mailing_list = 1,
        mailing_list_html = ?,
        notify_subscribers_on_post = 0,
        email_include_post_body = 0,
        timezone = "America/New_York",
        footer_media_id = ?,
        footer_height = 15,
        footer_overlay_opacity = 0.50,
        footer_overlay_color = "#000000",
        show_footer = 1,
        footer_layout = "double",
        footer_column1_html = ?,
        footer_column2_html = ?,
        show_view_counts = 1,
        show_impression_counts = 1,
        ignore_admin_tracking = 1,
        ai_system_prompt = COALESCE(ai_system_prompt, ?),
        hero_html_draft = NULL,
        site_bio_html_draft = NULL,
        donate_text_html_draft = NULL,
        mailing_list_html_draft = NULL,
        donation_instructions_html_draft = NULL,
        footer_column1_html_draft = NULL,
        footer_column2_html_draft = NULL,
        smtp_host = NULL,
        smtp_port = NULL,
        smtp_username = NULL,
        smtp_password = NULL,
        smtp_secure = "none",
        smtp_from_email = NULL,
        smtp_from_name = NULL,
        smtp_rate_limit = 20,
        smtp_rate_period = 60,
        smtp_batch_delay = 0.50
      WHERE id = 1');

    $defaultPrompt = DEFAULT_AI_SYSTEM_PROMPT;

    mysqli_stmt_bind_param(
        $stmt,
        'ssissssisss',
        $siteTitle,
        $heroHtml,
        $heroId,
        $bioHtml,
        $donateHtml,
        $donationInstructions,
        $mailingListHtml,
        $footerId,
        $footerCol1,
        $footerCol2,
        $defaultPrompt
    );

    if (!mysqli_stmt_execute($stmt)) {
        throw new RuntimeException('Failed to seed settings: ' . mysqli_error($db));
    }
}

function summarizeExcerpt(string $html, int $limit = 200): string
{
    $text = trim(strip_tags($html));
    if (mb_strlen($text) <= $limit) {
        return $text;
    }
    return mb_substr($text, 0, $limit - 3) . '...';
}

function seedPosts(mysqli $db, array $mediaIds, string $author): void
{
    $posts = [
        [
            'title' => 'Set up the demo in minutes',
            'body' => '<p>This demo refreshes every 12 hours so you can poke around without worrying about breaking anything.</p><ul><li>Docker-first deploy</li><li>WYSIWYG editor with hero + gallery</li><li>Newsletter + donation section</li><li>Built for a friend who needed one private update hub</li></ul><p>Edit anything; it will reset on the next cycle.</p>',
            'hero' => 'hero',
            'gallery' => ['hero', 'workspace'],
            'published_at' => date('Y-m-d H:i:s', strtotime('-1 day')),
        ],
        [
            'title' => 'Why I built this (short version)',
            'body' => '<p>A friend was going through a health issue and needed a single place to keep friends and family updated. Social media felt wrong. WordPress felt heavy. Ghost/Substack were more platform than tool.</p><p>So this is a small, self-hosted portal: fast to deploy, easy to edit, and simple to fork.</p>',
            'hero' => 'workspace',
            'gallery' => ['workspace', 'coffee'],
            'published_at' => date('Y-m-d H:i:s', strtotime('-2 days')),
        ],
        [
            'title' => 'What ships out of the box',
            'body' => '<p>Posts with hero images and galleries, mailing list signup, donation links, and a footer you can tweak. Responsive variants are generated automatically for media. View counts are tracked (but hidden in this demo).</p><p>MIT licensed. If you want something changed, fork it or open an issue.</p>',
            'hero' => 'footer',
            'gallery' => ['coffee', 'hero'],
            'published_at' => date('Y-m-d H:i:s', strtotime('-3 days')),
        ],
    ];

    $stmt = mysqli_prepare($db, 'INSERT INTO posts (
        title,
        body_html,
        body_html_draft,
        title_draft,
        excerpt,
        hero_media_id,
        hero_media_id_draft,
        gallery_media_ids,
        gallery_media_ids_draft,
        status,
        published_at,
        created_by_user_id,
        hero_image_height,
        hero_crop_overlay,
        hero_title_overlay,
        hero_overlay_opacity,
        hero_image_height_draft,
        hero_crop_overlay_draft,
        hero_title_overlay_draft,
        hero_overlay_opacity_draft
    ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, "published", ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )');

    foreach ($posts as $post) {
        $heroId = $mediaIds[$post['hero']] ?? null;
        $galleryIds = array_values(array_filter(array_map(function ($key) use ($mediaIds) {
            return $mediaIds[$key] ?? null;
        }, $post['gallery'])));

        $galleryJson = json_encode($galleryIds);
        $excerpt = summarizeExcerpt($post['body']);
        $publishedAt = $post['published_at'];

        $heroHeight = 30;
        $heroCrop = 1;
        $heroTitleOverlay = 1;
        $heroOverlayOpacity = 0.65;

        mysqli_stmt_bind_param(
            $stmt,
            'sssssiissssiiidiiid',
            $post['title'],
            $post['body'],
            $post['body'],
            $post['title'],
            $excerpt,
            $heroId,
            $heroId,
            $galleryJson,
            $galleryJson,
            $publishedAt,
            $author,
            $heroHeight,
            $heroCrop,
            $heroTitleOverlay,
            $heroOverlayOpacity,
            $heroHeight,
            $heroCrop,
            $heroTitleOverlay,
            $heroOverlayOpacity
        );

        if (!mysqli_stmt_execute($stmt)) {
            throw new RuntimeException('Failed to insert post: ' . mysqli_error($db));
        }
    }
}

try {
    $uploadsDir = $projectRoot . '/storage/uploads';

    // Preserve post analytics before reset
    $savedAnalytics = getPostAnalytics($db);

    resetTables($db);
    ensureSettingsRow($db);
    clearUploadsDirectory($uploadsDir);

    $mediaIds = seedMedia($db, [
        [
            'key' => 'hero',
            'url' => 'https://images.unsplash.com/photo-1522199710521-72d69614c702?auto=format&fit=crop&w=1600&q=80',
            'name' => 'laptop-desk.jpg',
            'alt' => 'Laptop on a clean desk',
            'user' => 'admin',
        ],
        [
            'key' => 'workspace',
            'url' => 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=1600&q=80',
            'name' => 'workspace.jpg',
            'alt' => 'Notebook and keyboard on a desk',
            'user' => 'admin',
        ],
        [
            'key' => 'coffee',
            'url' => 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80',
            'name' => 'coffee.jpg',
            'alt' => 'Coffee mug near a laptop',
            'user' => 'admin',
        ],
        [
            'key' => 'footer',
            'url' => 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80',
            'name' => 'cityscape.jpg',
            'alt' => 'City skyline at dusk',
            'user' => 'admin',
        ],
    ], $uploadsDir);

    seedSettings($db, $mediaIds, $siteTitle);

    $author = chooseAuthor($db);
    seedPosts($db, $mediaIds, $author);

    // Restore analytics from before the reset
    restorePostAnalytics($db, $savedAnalytics);

    fwrite(STDOUT, "Demo content seeded successfully.\n");
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "[demo_seed] " . $e->getMessage() . "\n");
    exit(1);
}
