<?php
/**
 * Demo data seeder
 * - Enabled only when DEMO_MODE=true (or --force flag is passed)
 * - Resets content, media, and newsletter subscribers
 * - Seeds hero/about/newsletter/donation/footer sections and a few example posts
 */

declare(strict_types=1);

use PostPortal\Lib\MediaProcessor;

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

/**
 * Landscape photo IDs from Unsplash.
 * Full IDs with timestamp prefix required for CDN access.
 */
define('PHOTO_IDS', [
    '1469854523086-cc02fe5d8800', // road trip desert highway
    '1472396961693-142e6e269027', // canyon overlook
    '1506905925346-21bda4d32df4', // arches national park
    '1527489377706-5bf97e608852', // monument valley
    '1559128010-7c1ad6e1b6a5', // bryce canyon hoodoos
    '1518098268026-4e89f1a2cd8e', // zion national park
    '1533587851505-d119e13fa0d7', // dead horse point
    '1504280390367-361c6d9f38f4', // canyonlands sunset
    '1542314831-068cd1dbfeeb', // mesa arch sunrise
    '1589802829985-817e51171b92', // antelope canyon
]);

function buildRandomUnsplashUrl(string $size = '1600x900'): string
{
    // Pick a random photo from a Utah collection
    $photoId = PHOTO_IDS[array_rand(PHOTO_IDS)];
    [$width, $height] = explode('x', $size);
    return "https://images.unsplash.com/photo-{$photoId}?w={$width}&h={$height}&fit=crop&q=80";
}

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
        // Only delete files, preserve directory structure and .gitkeep files
        if ($fileInfo->isFile() && $fileInfo->getFilename() !== '.gitkeep') {
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
    $heroId = $mediaIds['site_hero'] ?? null;
    $footerId = $mediaIds['site_footer'] ?? null;

    $heroHtml = '<h1>Post Portal Demo</h1>' .
        '<p>This environment refreshes twice a day.</p>' .
        '<p class="mb-0 small text-light">Edit anything to try the flow—content, media, newsletter, or donation blocks.</p>';

    $bioHtml = '<p>Post Portal is a lean, self-hosted update blog. It ships with WYSIWYG editing, responsive media, analytics, newsletter signup, and donation links.</p>' .
        '<p>Use this demo as a tour: play around with posts and hero images so you can see how layouts adapt.</p>';

    $donateHtml = '<h3>Support the project</h3><p>If this tool helps you share updates, feel free to send thanks or file issues.</p>';
    $donationInstructions = '<p>Demo mode: donation links are illustrative only.</p>';

    $mailingListHtml = '<p>Subscribe to see the double opt-in flow. Entries are cleared on each reset so you can retry safely.</p>';

    $footerCol1 = '<h4>What you are seeing</h4><p>Fresh Unsplash photos each cycle, seeded posts that highlight editing and analytics, and a minimal Bootstrap 5 UI.</p>';
    $footerCol2 = '<h4>Jump to</h4><ul class="mb-0"><li><a href="https://github.com/mattv8/post-portal" target="_blank">GitHub</a></li><li><a href="#updates">Latest posts</a></li></ul>';

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
        smtp_host = "mailpit",
        smtp_port = 1025,
        smtp_username = NULL,
        smtp_password = NULL,
        smtp_secure = "none",
        smtp_auth = 0,
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
            'title' => 'Take the tour (what is here)',
            'body' => '<p>This site refreshes twice a day with new photos so you always see fresh layouts. Everything you see is editable: hero overlay, CTA, donation block, and footer columns.</p><ul><li>Bootstrap 5 UI, no external framework</li><li>WYSIWYG editor with hero height, overlay, and gallery controls</li><li>Newsletter signup with double opt-in and unsubscribe endpoints</li><li>View and impression counts (hidden from visitors by default)</li></ul>',
            'hero' => 'post1_hero',
            'gallery' => ['gallery1', 'gallery2'],
            'published_at' => date('Y-m-d H:i:s', strtotime('-6 hours')),
        ],
        [
            'title' => 'Draft → review → publish',
            'body' => '<p>Create or edit in draft, preview changes, then publish when ready. Draft values (title, hero, overlay, gallery) stay separate until you hit publish.</p><p>After each reset you get a clean slate—perfect for testing editorial workflows without cleaning up afterward.</p>',
            'hero' => 'post2_hero',
            'gallery' => ['post1_hero', 'gallery1'],
            'published_at' => date('Y-m-d H:i:s', strtotime('-1 day')),
        ],
        [
            'title' => 'Media handling and alt text',
            'body' => '<p>Uploads are processed into responsive sizes and stored locally. Alt text is saved alongside each image so galleries stay accessible. Try swapping a hero image and adjusting overlay opacity to see readability changes.</p>',
            'hero' => 'post3_hero',
            'gallery' => ['post2_hero', 'gallery2'],
            'published_at' => date('Y-m-d H:i:s', strtotime('-2 days')),
        ],
        [
            'title' => 'Email, privacy, and analytics',
            'body' => '<p>Newsletter signups are rate-limited and double opt-in. Each post can trigger an email blast (disabled in this demo). View and impression counts are tracked with admin traffic ignored by default.</p><p>If you self-host, wire up SMTP in settings and toggle whether to include post bodies in emails.</p>',
            'hero' => 'post4_hero',
            'gallery' => ['post3_hero', 'post1_hero'],
            'published_at' => date('Y-m-d H:i:s', strtotime('-3 days')),
        ],
        [
            'title' => 'This is a draft post',
            'body' => '<p>Draft posts are only visible to logged-in admins. They appear greyed-out in the timeline with a "Draft" badge. You can edit them, set a publish date, and publish when ready.</p><p>Try clicking "Edit" to see the draft editing experience, or use the "Publish" button on this card to make it live.</p>',
            'hero' => 'post5_hero',
            'gallery' => ['post4_hero', 'gallery1'],
            'published_at' => date('Y-m-d H:i:s'), // Current date as default for drafts
            'status' => 'draft',
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
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )');

    foreach ($posts as $post) {
        $heroId = $mediaIds[$post['hero']] ?? null;
        $galleryIds = array_values(array_filter(array_map(function ($key) use ($mediaIds) {
            return $mediaIds[$key] ?? null;
        }, $post['gallery'])));

        $galleryJson = json_encode($galleryIds);
        $excerpt = summarizeExcerpt($post['body']);
        $publishedAt = $post['published_at'];
        $status = $post['status'] ?? 'published';

        $heroHeight = 30;
        $heroCrop = 1;
        $heroTitleOverlay = 1;
        $heroOverlayOpacity = 0.65;

        mysqli_stmt_bind_param(
            $stmt,
            'sssssiisssssiiidiiid',
            $post['title'],
            $post['body'],
            $post['body'],
            $post['title'],
            $excerpt,
            $heroId,
            $heroId,
            $galleryJson,
            $galleryJson,
            $status,
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
        // Site header and footer (unique, not reused in posts)
        [
            'key' => 'site_hero',
            'url' => buildRandomUnsplashUrl(),
            'name' => 'site-hero.jpg',
            'alt' => 'Scenic canyon and desert landscape',
            'user' => 'admin',
        ],
        [
            'key' => 'site_footer',
            'url' => buildRandomUnsplashUrl(),
            'name' => 'site-footer.jpg',
            'alt' => 'Wilderness and outdoor vista',
            'user' => 'admin',
        ],
        // Post heroes (each post gets a unique hero)
        [
            'key' => 'post1_hero',
            'url' => buildRandomUnsplashUrl(),
            'name' => 'post1-hero.jpg',
            'alt' => 'Road trip desert highway',
            'user' => 'admin',
        ],
        [
            'key' => 'post2_hero',
            'url' => buildRandomUnsplashUrl(),
            'name' => 'post2-hero.jpg',
            'alt' => 'Canyon overlook vista',
            'user' => 'admin',
        ],
        [
            'key' => 'post3_hero',
            'url' => buildRandomUnsplashUrl(),
            'name' => 'post3-hero.jpg',
            'alt' => 'Natural stone arches',
            'user' => 'admin',
        ],
        [
            'key' => 'post4_hero',
            'url' => buildRandomUnsplashUrl(),
            'name' => 'post4-hero.jpg',
            'alt' => 'Monument valley formations',
            'user' => 'admin',
        ],
        [
            'key' => 'post5_hero',
            'url' => buildRandomUnsplashUrl(),
            'name' => 'post5-hero.jpg',
            'alt' => 'Bryce canyon hoodoos',
            'user' => 'admin',
        ],
        // Gallery images (unique per gallery slot)
        [
            'key' => 'gallery1',
            'url' => buildRandomUnsplashUrl(),
            'name' => 'gallery1.jpg',
            'alt' => 'Zion national park',
            'user' => 'admin',
        ],
        [
            'key' => 'gallery2',
            'url' => buildRandomUnsplashUrl(),
            'name' => 'gallery2.jpg',
            'alt' => 'Dead horse point overlook',
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
