<?php

declare(strict_types=1);

/*
    Custom PHP Functions
*/
require_once(__DIR__ . '/vendor/autoload.php'); // Composer autoload
require_once(__DIR__ . '/lib/MediaProcessor.php');

use PostPortal\Lib\MediaProcessor;

// Default AI system prompt for title generation
define('DEFAULT_AI_SYSTEM_PROMPT', 'You are a helpful assistant that creates concise, engaging titles for update posts. The title should be short (3-8 words), and capture the essence of the update. Return ONLY the title text, nothing else.');

/**
 * Get database connection.
 *
 * @param string $host Database host
 * @param string $user Database user
 * @param string $password Database password
 * @param string $database Database name
 * @return \mysqli|null Database connection or null on failure
 */
function getDbConnection(string $host, string $user, string $password, string $database): ?\mysqli
{
    $conn = mysqli_connect($host, $user, $password, $database);
    if (!$conn) {
        error_log('Database connection failed: ' . mysqli_connect_error());
        return null;
    }
    return $conn;
}

/**
 * App defaults in one place (no superglobals).
 *
 * @return array{auth_type:string,default_page:string,default_logo:string,js_config:array<string,string>}
 */
function getAppDefaults(): array
{
    return [
        'auth_type' => getenv('AUTH_TYPE') ?: 'sql',
        'default_page' => 'home',
        'default_logo' => '/images/default-logo.svg',
        'js_config' => [
            'recaptcha_key' => getenv('RECAPTCHA_SITE_KEY') ?: '',
        ],
    ];
}

/**
 * Read database configuration from environment.
 *
 * @return array{host:string,user:string,password:string,database:string}
 */
function getDbConfig(): array
{
    return [
        'host' => getenv('MYSQL_HOST') ?: 'localhost',
        'database' => getenv('MYSQL_DATABASE') ?: 'postportal',
        'user' => getenv('MYSQL_USER') ?: 'postportal',
        'password' => getenv('MYSQL_PASSWORD') ?: 'postportal',
    ];
}

/**
 * Convenience wrapper to open the default database connection.
 */
function getDefaultDbConnection(): ?\mysqli
{
    $cfg = getDbConfig();
    return getDbConnection($cfg['host'], $cfg['user'], $cfg['password'], $cfg['database']);
}

/**
 * Format a datetime string from the database (assumed UTC) to the configured timezone.
 *
 * @param string|null $datetime The datetime string from the database (Y-m-d H:i:s format)
 * @param string $format The output format (default: 'M j, Y g:i A')
 * @return string|null Formatted datetime string or null if input is null/empty
 */
function formatDateTimeLocal(?string $datetime, string $format = 'M j, Y g:i A'): ?string
{
    if (empty($datetime)) {
        return null;
    }

    try {
        // Database stores in UTC
        $date = new DateTime($datetime, new DateTimeZone('UTC'));

        // Convert to configured timezone (default to UTC if not set)
        $tz = getenv('TZ') ?: 'UTC';
        $date->setTimezone(new DateTimeZone($tz));

        return $date->format($format);
    } catch (Exception $e) {
        error_log('formatDateTimeLocal error: ' . $e->getMessage());
        return $datetime; // Return original on error
    }
}

/**
 * Registers a function to be called when the script execution ends.
 *
 * This function allows you to register a custom shutdown function
 * that will be called when the script execution ends, whether by
 * normal termination or due to a fatal error.
 *
 * @param callable $callback The callback function to be executed on shutdown.
 *                           It can be any valid PHP callable (e.g., a function name,
 *                           an anonymous function, or an array containing an object
 *                           instance and a method name).
 * @param mixed    $parameter Optional. Additional parameters to be passed to the callback function.
 *                           These parameters will be passed to the callback function in the order
 *                           they are specified here.
 * @param mixed    $_         Optional. Additional parameters to be passed to the callback function.
 *                           These parameters will be passed to the callback function in the order
 *                           they are specified here.
 * @return bool Returns true on success, or false on failure.
 */
// Register a custom error handler to catch fatal errors
register_shutdown_function(function () {
    $error = error_get_last();
    if ($error !== null && $error['type'] === E_ERROR) {
        // Check if the error is related to memory exhaustion
        if (strpos($error['message'], 'Allowed memory size') !== false) {
            $memoryLimit = ini_get('memory_limit'); // Get the current PHP memory limit
            echo "An error occurred: Memory limit of $memoryLimit was exceeded."; // Handle the memory exhaustion error
        }
    }
});

// ==============================
// Post Portal Helper Functions
// ==============================

/**
 * Purge the nginx FastCGI cache.
 * Called automatically when content is published to ensure visitors see fresh content.
 *
 * @return bool True if purge succeeded or cache not available, false on error
 */
function purgeFastCgiCache(): bool
{
    $cacheDir = '/var/cache/nginx/fastcgi';

    // If cache directory doesn't exist, caching is not enabled
    if (!is_dir($cacheDir)) {
        return true;
    }

    // Try using the purge script if available
    if (is_executable('/docker-scripts/cache-purge.sh')) {
        $output = [];
        $returnCode = 0;
        exec('/docker-scripts/cache-purge.sh 2>&1', $output, $returnCode);
        if ($returnCode === 0) {
            error_log('FastCGI cache purged successfully');
            return true;
        }
        error_log('FastCGI cache purge script failed: ' . implode("\n", $output));
    }

    // Fallback: try direct deletion (requires www-data permissions)
    try {
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($cacheDir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($files as $file) {
            if ($file->isDir()) {
                @rmdir($file->getPathname());
            } else {
                @unlink($file->getPathname());
            }
        }
        error_log('FastCGI cache purged via direct deletion');
        return true;
    } catch (Throwable $e) {
        error_log('FastCGI cache purge failed: ' . $e->getMessage());
        return false;
    }
}

/**
 * Basic HTML sanitization with allowlist and attribute scrubbing
 * Allows empty HTML content - returns empty string for empty inputs
 * This ensures users can erase default content if desired
 *
 * @param string $html HTML content to sanitize (can be empty)
 * @return string Sanitized HTML (empty string if input is empty)
 */
function sanitizeHtml(string $html): string
{
    // Allow a safe subset of tags (including both <em> and <i> for italic formatting)
    $allowed_tags = '<p><br><strong><b><em><i><u><ol><ul><li><blockquote><code><pre><a><h1><h2><h3><h4><h5><h6><img><figure><figcaption><hr><span><div>';
    $clean = strip_tags($html, $allowed_tags);

    // Remove event handlers and javascript: URLs (quick pass)
    // Remove on* attributes
    $clean = preg_replace('/\son[a-z]+\s*=\s*"[^"]*"/i', '', $clean);
    $clean = preg_replace("/\son[a-z]+\s*='[^']*'/i", '', $clean);
    // Remove javascript: URLs in href/src
    $clean = preg_replace('/(href|src)\s*=\s*"javascript:[^"]*"/i', '$1="#"', $clean);
    $clean = preg_replace("/(href|src)\s*=\s*'javascript:[^']*'/i", '$1="#"', $clean);

    // Deep sanitize anchors and images using DOM to preserve allowed attributes safely
    if (trim($clean) === '') {
        return $clean;
    }

    $prevUseInternalErrors = libxml_use_internal_errors(true);
    $dom = new DOMDocument('1.0', 'UTF-8');
    // Properly load UTF-8 HTML without converting to HTML entities
    // Prepend UTF-8 XML declaration to ensure proper encoding handling
    $wrappedHtml = '<?xml encoding="UTF-8"><div>' . $clean . '</div>';
    $dom->loadHTML($wrappedHtml, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);

    // Allowed alignment classes from Quill
    $allowedClasses = ['ql-align-left', 'ql-align-center', 'ql-align-right', 'ql-align-justify'];

    // Process all elements to clean up class attributes
    $xpath = new DOMXPath($dom);
    $elementsWithClass = $xpath->query('//*[@class]');

    if ($elementsWithClass !== false) {
        /** @var \DOMElement $element */
        foreach ($elementsWithClass as $element) {
            $classes = explode(' ', $element->getAttribute('class'));
            $safeClasses = array_filter($classes, function($cls) use ($allowedClasses) {
                return in_array(trim($cls), $allowedClasses);
            });

            if (empty($safeClasses)) {
                $element->removeAttribute('class');
            } else {
                $element->setAttribute('class', implode(' ', $safeClasses));
            }
        }
    }

    // Allow only safe link protocols and enforce rel for target=_blank
    $allowedSchemes = ['http', 'https', 'mailto', 'tel', 'sms'];
    foreach ($dom->getElementsByTagName('a') as $a) {
        $href = $a->getAttribute('href');
        $hrefTrim = trim($href);

        $isRelative = (strpos($hrefTrim, '/') === 0) || (strpos($hrefTrim, '#') === 0) || ($hrefTrim === '');
        $ok = $isRelative;

        // If there is no scheme but it looks like a domain or email, normalize it
        if (!$isRelative && $hrefTrim && !preg_match('/^[a-z][a-z0-9+.-]*:/i', $hrefTrim)) {
            if (filter_var($hrefTrim, FILTER_VALIDATE_EMAIL)) {
                $hrefTrim = 'mailto:' . $hrefTrim;
            } elseif (preg_match('/^(www\.|[a-z0-9.-]+\.[a-z]{2,})(\/.*)?$/i', $hrefTrim)) {
                // Looks like a bare domain, default to https
                $hrefTrim = 'https://' . $hrefTrim;
            }
        }

        if (!$ok && $hrefTrim) {
            $parts = parse_url($hrefTrim);
            $scheme = isset($parts['scheme']) ? strtolower($parts['scheme']) : '';
            if (in_array($scheme, $allowedSchemes, true)) {
                $ok = true;
            }
        }

        if ($ok) {
            // Persist normalized href if changed
            if ($hrefTrim !== $href) {
                $a->setAttribute('href', $hrefTrim);
            }
        } else {
            // Fallback to harmless link
            $a->setAttribute('href', '#');
        }

        // If opening in a new tab, add safe rel attributes
        if (strtolower($a->getAttribute('target')) === '_blank') {
            $rel = strtolower($a->getAttribute('rel'));
            $rels = array_filter(array_unique(array_merge(
                $rel ? preg_split('/\s+/', $rel) : [],
                ['noopener', 'noreferrer']
            )));
            $a->setAttribute('rel', implode(' ', $rels));
        }

        // Strip any event handler attributes that might remain
        $attrsToRemove = [];
        foreach ($a->attributes as $attr) {
            if (preg_match('/^on/i', $attr->name)) {
                $attrsToRemove[] = $attr->name;
            }
        }
        foreach ($attrsToRemove as $attrName) {
            $a->removeAttribute($attrName);
        }
    }

    // For images: ensure no javascript: in src
    foreach ($dom->getElementsByTagName('img') as $img) {
        $src = $img->getAttribute('src');
        if (preg_match('/^\s*javascript:/i', $src)) {
            $img->setAttribute('src', '');
        }
        // Remove event handlers
        $attrsToRemove = [];
        foreach ($img->attributes as $attr) {
            if (preg_match('/^on/i', $attr->name)) {
                $attrsToRemove[] = $attr->name;
            }
        }
        foreach ($attrsToRemove as $attrName) {
            $img->removeAttribute($attrName);
        }
    }

    // Extract the content from the wrapper div
    $body = $dom->getElementsByTagName('div')->item(0);
    $clean = '';
    if ($body) {
        foreach ($body->childNodes as $child) {
            $clean .= $dom->saveHTML($child);
        }
    } else {
        // Fallback if wrapper not found
        $clean = $dom->saveHTML();
    }

    libxml_clear_errors();
    libxml_use_internal_errors($prevUseInternalErrors);
    return $clean;
}

/**
 * Generate a text excerpt from HTML
 */
function generateExcerpt(string $html, int $maxLength = 250): string
{
    $text = trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags($html), ENT_QUOTES, 'UTF-8')));
    if (mb_strlen($text, 'UTF-8') <= $maxLength) {
        return $text;
    }
    $cut = mb_substr($text, 0, $maxLength, 'UTF-8');
    // Avoid cutting a word in half
    $spacePos = mb_strrpos($cut, ' ');
    if ($spacePos !== false) {
        $cut = mb_substr($cut, 0, $spacePos);
    }
    return $cut . '…';
}

/**
 * CSRF helpers
 */
function ensureSession(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
}

function generateCsrfToken(): string
{
    ensureSession();
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function validateCsrfToken(string $token): bool
{
    ensureSession();
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], (string)$token);
}

/**
 * Posts - CRUD helpers
 */
function createPost(\mysqli $db_conn, array $data): array
{
    try {
        $title = $data['title'] ?? null;
        $body_html = sanitizeHtml($data['body_html'] ?? '');
        $excerpt = $data['excerpt'] ?? generateExcerpt($body_html, 250);
        $hero_media_id = !empty($data['hero_media_id']) ? (int)$data['hero_media_id'] : null;
        $hero_image_height = !empty($data['hero_image_height']) ? (int)$data['hero_image_height'] : 100;
        $hero_crop_overlay = isset($data['hero_crop_overlay']) ? (int)(bool)$data['hero_crop_overlay'] : 0;
        $hero_title_overlay = isset($data['hero_title_overlay']) ? (int)(bool)$data['hero_title_overlay'] : 1;
        $hero_overlay_opacity = isset($data['hero_overlay_opacity']) ? (float)$data['hero_overlay_opacity'] : 0.70;
        $gallery_media_ids = !empty($data['gallery_media_ids']) ? json_encode($data['gallery_media_ids']) : null;
        $status = in_array(($data['status'] ?? 'draft'), ['draft','published']) ? $data['status'] : 'draft';
        $published_at = !empty($data['published_at']) ? $data['published_at'] : null;
        $created_by = $data['created_by_user_id'] ?? ($_SESSION['username'] ?? 'admin');

        // Auto-set published_at when status is 'published' and no published_at is provided
        if ($status === 'published' && is_null($published_at)) {
            $published_at = date('Y-m-d H:i:s');
        }

        $stmt = mysqli_prepare($db_conn, "INSERT INTO posts (title, body_html, excerpt, hero_media_id, hero_image_height, hero_crop_overlay, hero_title_overlay, hero_overlay_opacity, gallery_media_ids, status, published_at, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        if (!$stmt) {
            throw new \Exception('Failed to prepare statement: ' . mysqli_error($db_conn));
        }
        mysqli_stmt_bind_param($stmt, 'sssiiiidssss', $title, $body_html, $excerpt, $hero_media_id, $hero_image_height, $hero_crop_overlay, $hero_title_overlay, $hero_overlay_opacity, $gallery_media_ids, $status, $published_at, $created_by);
        if (!mysqli_stmt_execute($stmt)) {
            throw new \Exception('Failed to execute statement: ' . mysqli_error($db_conn));
        }
        return ['success' => true, 'id' => mysqli_insert_id($db_conn)];
    } catch (\Throwable $e) {
        error_log('createPost error: ' . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

function updatePost(\mysqli $db_conn, int $id, array $data): array
{
    try {
        $id = (int)$id;
        $title = $data['title'] ?? null;
        $body_html = isset($data['body_html']) ? sanitizeHtml($data['body_html']) : null;
        $excerpt = $data['excerpt'] ?? null;
        $hero_media_id = array_key_exists('hero_media_id', $data) ? (is_null($data['hero_media_id']) ? null : (int)$data['hero_media_id']) : null;
        $hero_image_height = array_key_exists('hero_image_height', $data) ? (is_null($data['hero_image_height']) ? null : (int)$data['hero_image_height']) : null;
        $hero_crop_overlay = array_key_exists('hero_crop_overlay', $data) ? (int)(bool)$data['hero_crop_overlay'] : null;
        $hero_title_overlay = array_key_exists('hero_title_overlay', $data) ? (int)(bool)$data['hero_title_overlay'] : null;
        $hero_overlay_opacity = array_key_exists('hero_overlay_opacity', $data) ? (float)$data['hero_overlay_opacity'] : null;
        $gallery_media_ids = array_key_exists('gallery_media_ids', $data) ? json_encode($data['gallery_media_ids']) : null;
        $status = isset($data['status']) && in_array($data['status'], ['draft','published']) ? $data['status'] : null;
        $published_at = $data['published_at'] ?? null;

        // Auto-set published_at when status changes to 'published'
        // Check current status and published_at from database
        // Only auto-set if no published_at is provided by the user
        if ($status === 'published' && is_null($published_at)) {
            $stmt_check = mysqli_prepare($db_conn, "SELECT status, published_at FROM posts WHERE id = ?");
            if (!$stmt_check) {
                throw new \Exception('Failed to prepare check statement: ' . mysqli_error($db_conn));
            }
            mysqli_stmt_bind_param($stmt_check, 'i', $id);
            mysqli_stmt_execute($stmt_check);
            $current = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt_check));
            if ($current && is_null($current['published_at'])) {
                $published_at = date('Y-m-d H:i:s');
            }
        }

        // Build dynamic update
        $fields = [];
        $params = [];
        $types = '';

        if (!is_null($title)) { $fields[] = 'title = ?'; $params[] = $title; $types .= 's'; }
        if (!is_null($body_html)) { $fields[] = 'body_html = ?'; $params[] = $body_html; $types .= 's'; }
        if (!is_null($excerpt)) { $fields[] = 'excerpt = ?'; $params[] = $excerpt; $types .= 's'; }
        if (!is_null($hero_media_id) || array_key_exists('hero_media_id', $data)) { $fields[] = 'hero_media_id = ?'; $params[] = $hero_media_id; $types .= 'i'; }
        if (!is_null($hero_image_height) || array_key_exists('hero_image_height', $data)) { $fields[] = 'hero_image_height = ?'; $params[] = $hero_image_height; $types .= 'i'; }
        if (!is_null($hero_crop_overlay) || array_key_exists('hero_crop_overlay', $data)) { $fields[] = 'hero_crop_overlay = ?'; $params[] = $hero_crop_overlay; $types .= 'i'; }
        if (!is_null($hero_title_overlay) || array_key_exists('hero_title_overlay', $data)) { $fields[] = 'hero_title_overlay = ?'; $params[] = $hero_title_overlay; $types .= 'i'; }
        if (!is_null($hero_overlay_opacity) || array_key_exists('hero_overlay_opacity', $data)) { $fields[] = 'hero_overlay_opacity = ?'; $params[] = $hero_overlay_opacity; $types .= 'd'; }
        if (!is_null($gallery_media_ids) || array_key_exists('gallery_media_ids', $data)) { $fields[] = 'gallery_media_ids = ?'; $params[] = $gallery_media_ids; $types .= 's'; }
        if (!is_null($status)) { $fields[] = 'status = ?'; $params[] = $status; $types .= 's'; }
        if (!is_null($published_at)) { $fields[] = 'published_at = ?'; $params[] = $published_at; $types .= 's'; }

        if (empty($fields)) {
            return ['success' => false, 'error' => 'No fields to update'];
        }

        $sql = 'UPDATE posts SET ' . implode(', ', $fields) . ', updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        $types .= 'i';
        $params[] = $id;

        $stmt = mysqli_prepare($db_conn, $sql);
        if (!$stmt) {
            throw new \Exception('Failed to prepare statement: ' . mysqli_error($db_conn));
        }
        mysqli_stmt_bind_param($stmt, $types, ...$params);
        if (!mysqli_stmt_execute($stmt)) {
            throw new \Exception('Failed to execute statement: ' . mysqli_error($db_conn));
        }
        return ['success' => true];
    } catch (\Throwable $e) {
        error_log('updatePost error: ' . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

function deletePost(\mysqli $db_conn, int $id): bool
{
    try {
        $id = (int)$id;
        // Soft delete - set deleted_at timestamp instead of actually deleting
        $stmt = mysqli_prepare($db_conn, 'UPDATE posts SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL');
        if (!$stmt) {
            throw new \Exception('Failed to prepare statement: ' . mysqli_error($db_conn));
        }
        mysqli_stmt_bind_param($stmt, 'i', $id);
        return mysqli_stmt_execute($stmt);
    } catch (\Throwable $e) {
        error_log('deletePost error: ' . $e->getMessage());
        return false;
    }
}

function publishDraft(\mysqli $db_conn, int $id): array
{
    try {
        // Copy all draft fields to published fields for posts
        // First, check which draft fields have been explicitly set (are not NULL)
        // For nullable fields like hero_media_id, we need to check if the draft differs from published
        $id = (int)$id;

        // Get current draft state to determine what to update
        $stmt_check = mysqli_prepare($db_conn, "SELECT
            title_draft, body_html_draft, hero_media_id_draft, hero_image_height_draft,
            hero_crop_overlay_draft, hero_title_overlay_draft, hero_overlay_opacity_draft,
            gallery_media_ids_draft,
            title, body_html, hero_media_id, hero_image_height,
            hero_crop_overlay, hero_title_overlay, hero_overlay_opacity, gallery_media_ids
            FROM posts WHERE id = ? AND deleted_at IS NULL");
        if (!$stmt_check) {
            throw new \Exception('Failed to prepare check statement: ' . mysqli_error($db_conn));
        }
        mysqli_stmt_bind_param($stmt_check, 'i', $id);
        mysqli_stmt_execute($stmt_check);
        $post = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt_check));

        if (!$post) {
            return ['success' => false, 'error' => 'Post not found'];
        }

        // Build dynamic update based on which draft fields exist
        $updates = [];
        $params = [];
        $types = '';

        // For each field, if draft is set (not null), use it; otherwise keep current
        // Special handling: hero_media_id_draft can be explicitly set to NULL to remove the image
        // We detect this by checking if ANY draft field has been set, meaning the user has edited the post
        $draftWasEdited = $post['title_draft'] !== null ||
                          $post['body_html_draft'] !== null ||
                          $post['hero_image_height_draft'] !== null ||
                          $post['hero_crop_overlay_draft'] !== null;

        if ($post['title_draft'] !== null) {
            $updates[] = 'title = ?';
            $params[] = $post['title_draft'];
            $types .= 's';
        }

        if ($post['body_html_draft'] !== null) {
            $updates[] = 'body_html = ?';
            $params[] = $post['body_html_draft'];
            $types .= 's';
        }

        // hero_media_id: if draft was edited, copy draft value (even if NULL = remove image)
        if ($draftWasEdited) {
            $updates[] = 'hero_media_id = ?';
            $params[] = $post['hero_media_id_draft']; // Can be NULL
            $types .= 'i';
        }

        if ($post['hero_image_height_draft'] !== null) {
            $updates[] = 'hero_image_height = ?';
            $params[] = $post['hero_image_height_draft'];
            $types .= 'i';
        }

        if ($post['hero_crop_overlay_draft'] !== null) {
            $updates[] = 'hero_crop_overlay = ?';
            $params[] = $post['hero_crop_overlay_draft'];
            $types .= 'i';
        }

        if ($post['hero_title_overlay_draft'] !== null) {
            $updates[] = 'hero_title_overlay = ?';
            $params[] = $post['hero_title_overlay_draft'];
            $types .= 'i';
        }

        if ($post['hero_overlay_opacity_draft'] !== null) {
            $updates[] = 'hero_overlay_opacity = ?';
            $params[] = $post['hero_overlay_opacity_draft'];
            $types .= 'd';
        }

        if ($post['gallery_media_ids_draft'] !== null) {
            $updates[] = 'gallery_media_ids = ?';
            $params[] = $post['gallery_media_ids_draft'];
            $types .= 's';
        }

        // Always update status and timestamps
        $updates[] = "status = 'published'";
        $updates[] = 'published_at = COALESCE(published_at, CURRENT_TIMESTAMP)';
        $updates[] = 'updated_at = CURRENT_TIMESTAMP';

        $sql = 'UPDATE posts SET ' . implode(', ', $updates) . ' WHERE id = ? AND deleted_at IS NULL';
        $types .= 'i';
        $params[] = $id;

        $stmt = mysqli_prepare($db_conn, $sql);
        if (!$stmt) {
            throw new \Exception('Failed to prepare statement: ' . mysqli_error($db_conn));
        }
        mysqli_stmt_bind_param($stmt, $types, ...$params);
        if (!mysqli_stmt_execute($stmt)) {
            throw new \Exception('Failed to execute statement: ' . mysqli_error($db_conn));
        }

        // Refresh excerpt based on the now-published body_html to avoid stale excerpts
        // This ensures email notifications and list views use up-to-date summaries
        $stmt_body = mysqli_prepare($db_conn, "SELECT body_html FROM posts WHERE id = ? LIMIT 1");
        if ($stmt_body) {
            mysqli_stmt_bind_param($stmt_body, 'i', $id);
            mysqli_stmt_execute($stmt_body);
            $res = mysqli_stmt_get_result($stmt_body);
            if ($res) {
                $row = mysqli_fetch_assoc($res);
                if ($row && isset($row['body_html'])) {
                    $newExcerpt = generateExcerpt($row['body_html'], 250);
                    $stmt2 = mysqli_prepare($db_conn, 'UPDATE posts SET excerpt = ? WHERE id = ?');
                    if ($stmt2) {
                        mysqli_stmt_bind_param($stmt2, 'si', $newExcerpt, $id);
                        // If this update fails, don't fail the publish action; log and continue
                        if (!mysqli_stmt_execute($stmt2)) {
                            error_log('Failed to refresh excerpt on publish for post ' . $id . ': ' . mysqli_error($db_conn));
                        }
                    }
                }
            }
        }

        // Clear draft fields after successful publish
        $clearDraftSql = "UPDATE posts SET
            title_draft = NULL,
            body_html_draft = NULL,
            hero_media_id_draft = NULL,
            hero_image_height_draft = NULL,
            hero_crop_overlay_draft = NULL,
            hero_title_overlay_draft = NULL,
            hero_overlay_opacity_draft = NULL,
            gallery_media_ids_draft = NULL
            WHERE id = ?";
        $stmt_clear = mysqli_prepare($db_conn, $clearDraftSql);
        if ($stmt_clear) {
            mysqli_stmt_bind_param($stmt_clear, 'i', $id);
            mysqli_stmt_execute($stmt_clear);
        }

        // Purge FastCGI cache so visitors see the new content immediately
        purgeFastCgiCache();

        return ['success' => true];
    } catch (\Throwable $e) {
        error_log('publishDraft error: ' . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

/**
 * Publish draft settings to production
 * Uses COALESCE to preserve empty string values from draft
 * Empty strings are NOT NULL, so they will be honored if explicitly set
 * This allows users to erase content from about/donate sections if desired
 *
 * @param mysqli $db_conn Database connection
 * @return array Result with success status
 */
function publishSettingsDraft(\mysqli $db_conn): array
{
    try {
        // Copy all draft fields to published fields for settings
        $sql = "UPDATE settings SET
            hero_html = COALESCE(hero_html_draft, hero_html),
            site_bio_html = COALESCE(site_bio_html_draft, site_bio_html),
            donate_text_html = COALESCE(donate_text_html_draft, donate_text_html),
            donation_instructions_html = COALESCE(donation_instructions_html_draft, donation_instructions_html),
            footer_column1_html = COALESCE(footer_column1_html_draft, footer_column1_html),
            footer_column2_html = COALESCE(footer_column2_html_draft, footer_column2_html),
            mailing_list_html = COALESCE(mailing_list_html_draft, mailing_list_html),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1";

        $stmt = mysqli_prepare($db_conn, $sql);
        if (!$stmt) {
            throw new \Exception('Failed to prepare statement: ' . mysqli_error($db_conn));
        }

        if (!mysqli_stmt_execute($stmt)) {
            throw new \Exception('Failed to execute statement: ' . mysqli_error($db_conn));
        }

        // Purge FastCGI cache so visitors see updated content immediately
        purgeFastCgiCache();

        return ['success' => true];
    } catch (\Throwable $e) {
        error_log('publishSettingsDraft error: ' . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

/**
 * Decode HTML entities in post data for proper UTF-8 display
 * This ensures that content stored with HTML entities is properly decoded
 * before being displayed to prevent character encoding issues
 *
 * @param array|null $post Post data array
 * @return array|null Post data with decoded HTML entities
 */
function decodePostHtmlEntities(?array $post): ?array {
    if (!$post) {
        return null;
    }

    // Fields that may contain HTML entities that need decoding
    $fieldsToDecodec = ['title', 'body_html', 'excerpt'];

    foreach ($fieldsToDecodec as $field) {
        if (isset($post[$field]) && $post[$field] !== null) {
            $post[$field] = html_entity_decode($post[$field], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }
    }

    return $post;
}

function getPost(\mysqli $db_conn, int $id): ?array
{
    $id = (int)$id;
    $sql = "SELECT p.*,
                   u.first AS author_first, u.last AS author_last, u.username AS author_username
            FROM posts p
            LEFT JOIN users u ON p.created_by_user_id = u.username
            WHERE p.id = ? AND p.deleted_at IS NULL LIMIT 1";
    $stmt = mysqli_prepare($db_conn, $sql);
    mysqli_stmt_bind_param($stmt, 'i', $id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $post = $result ? mysqli_fetch_assoc($result) : null;
    return decodePostHtmlEntities($post);
}

function getPublishedPosts(\mysqli $db_conn, int $limit = 10, int $offset = 0): array
{
    $limit = (int)$limit; $offset = (int)$offset;
    $sql = "SELECT p.*, m.variants_json AS hero_variants,
                   u.first AS author_first, u.last AS author_last, u.username AS author_username
            FROM posts p
            LEFT JOIN media m ON p.hero_media_id = m.id
            LEFT JOIN users u ON p.created_by_user_id = u.username
            WHERE p.status = 'published' AND p.deleted_at IS NULL
            ORDER BY COALESCE(p.published_at, p.created_at) DESC
            LIMIT ? OFFSET ?";
    $stmt = mysqli_prepare($db_conn, $sql);
    mysqli_stmt_bind_param($stmt, 'ii', $limit, $offset);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $rows = [];
    if ($res) {
        while ($r = mysqli_fetch_assoc($res)) {
            $rows[] = decodePostHtmlEntities($r);
        }
    }
    return $rows;
}

/**
 * Media helpers
 */
function saveMediaRecord(\mysqli $db_conn, array $data): array
{
    $stmt = mysqli_prepare($db_conn, "INSERT INTO media (filename, original_filename, mime_type, size_bytes, width, height, alt_text, storage_path, variants_json, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    mysqli_stmt_bind_param(
        $stmt,
        'sssiiissss',
        $data['filename'],
        $data['original_filename'],
        $data['mime_type'],
        $data['size_bytes'],
        $data['width'],
        $data['height'],
        $data['alt_text'],
        $data['storage_path'],
        $data['variants_json'],
        $data['created_by_user_id']
    );
    if (!mysqli_stmt_execute($stmt)) {
        return ['success' => false, 'error' => mysqli_error($db_conn)];
    }

    return ['success' => true, 'id' => mysqli_insert_id($db_conn)];
}

function getMedia(\mysqli $db_conn, int $id): ?array
{
    $id = (int)$id;
    $stmt = mysqli_prepare($db_conn, "SELECT * FROM media WHERE id = ? LIMIT 1");
    mysqli_stmt_bind_param($stmt, 'i', $id);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    return $res ? mysqli_fetch_assoc($res) : null;
}

function getAllMedia(\mysqli $db_conn, int $limit = 50, int $offset = 0, ?string $search = null): array
{
    $limit = (int)$limit; $offset = (int)$offset;

    if ($search) {
        $searchPattern = "%{$search}%";
        $sql = "SELECT * FROM media WHERE original_filename LIKE ? OR alt_text LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?";
        $stmt = mysqli_prepare($db_conn, $sql);
        mysqli_stmt_bind_param($stmt, 'ssii', $searchPattern, $searchPattern, $limit, $offset);
        mysqli_stmt_execute($stmt);
        $res = mysqli_stmt_get_result($stmt);
    } else {
        $sql = "SELECT * FROM media ORDER BY created_at DESC LIMIT ? OFFSET ?";
        $stmt = mysqli_prepare($db_conn, $sql);
        mysqli_stmt_bind_param($stmt, 'ii', $limit, $offset);
        mysqli_stmt_execute($stmt);
        $res = mysqli_stmt_get_result($stmt);
    }

    $rows = [];
    if ($res) { while ($r = mysqli_fetch_assoc($res)) { $rows[] = $r; } }
    return $rows;
}

/**
 * Settings helpers
 */
function getSettings(\mysqli $db_conn): ?array
{
    $sql = 'SELECT * FROM settings WHERE id = ?';
    $stmt = mysqli_prepare($db_conn, $sql);

    if (!$stmt) {
        error_log('getSettings: failed to prepare statement: ' . mysqli_error($db_conn));
        return null;
    }

    $settingsId = 1;
    mysqli_stmt_bind_param($stmt, 'i', $settingsId);

    if (!mysqli_stmt_execute($stmt)) {
        error_log('getSettings: failed to execute statement: ' . mysqli_error($db_conn));
        return null;
    }

    $res = mysqli_stmt_get_result($stmt);
    $settings = $res ? mysqli_fetch_assoc($res) : null;

    // Decrypt SMTP password if it exists
    if ($settings && !empty($settings['smtp_password'])) {
        $settings['smtp_password'] = decryptSmtpPassword($settings['smtp_password']);
    }

    // Normalize donation_link to include protocol if missing
    if ($settings && !empty($settings['donation_link'])) {
        $link = $settings['donation_link'];
        if (!preg_match('#^https?://#i', $link)) {
            $settings['donation_link'] = 'https://' . $link;
        }
    }

    return $settings;
}

/**
 * Get logo URL (with retina support via srcset)
 * Returns array with logo_url and logo_srcset_png
 */
function getLogoUrls(\mysqli $db_conn, string|int|null $logo_media_id = null, ?string $defaultLogo = null): array
{
    $default_logo = $defaultLogo ?? '/images/default-logo.svg';

    if (!$logo_media_id) {
        // Return default logo from config
        return [
            'logo_url' => $default_logo,
            'logo_srcset_png' => '',
            'logo_srcset_webp' => ''
        ];
    }

    $media = getMedia($db_conn, (int)$logo_media_id);
    if (!$media || empty($media['variants_json'])) {
        // Return default logo from config
        return [
            'logo_url' => $default_logo,
            'logo_srcset_png' => '',
            'logo_srcset_webp' => ''
        ];
    }

    require_once(__DIR__ . '/lib/MediaProcessor.php');
    $variants = json_decode($media['variants_json'], true);

    // Find the 200w PNG variant for default
    $logo200 = null;
    foreach ($variants as $v) {
        if ($v['width'] == 200 && $v['format'] == 'png') {
            $logo200 = $v;
            break;
        }
    }

    $logo_url = $logo200 ? ('/' . $logo200['path']) : $default_logo;
    $logo_srcset_png = MediaProcessor::generateSrcset($variants, 'png');
    $logo_srcset_webp = MediaProcessor::generateSrcset($variants, 'webp');

    return [
        'logo_url' => $logo_url,
        'logo_srcset_png' => $logo_srcset_png,
        'logo_srcset_webp' => $logo_srcset_webp
    ];
}

/**
 * Get favicon URLs for various sizes
 * Returns array with favicon URLs for different sizes
 */
function getFaviconUrls(\mysqli $db_conn, string|int|null $favicon_media_id = null): array
{
    if (!$favicon_media_id) {
        // Return default favicon
        return [
            'favicon_ico' => '/images/favicon.svg',
            'favicon_svg' => '/images/favicon.svg',
            'favicon_32' => '/images/favicon.svg',
            'favicon_16' => '/images/favicon.svg',
            'favicon_192' => '/images/favicon.svg',
            'favicon_512' => '/images/favicon.svg'
        ];
    }

    $media = getMedia($db_conn, (int)$favicon_media_id);
    if (!$media || empty($media['variants_json'])) {
        return [
            'favicon_ico' => '/images/favicon.svg',
            'favicon_svg' => '/images/favicon.svg',
            'favicon_32' => '/images/favicon.svg',
            'favicon_16' => '/images/favicon.svg',
            'favicon_192' => '/images/favicon.svg',
            'favicon_512' => '/images/favicon.svg'
        ];
    }

    $variants = json_decode($media['variants_json'], true);

    // Initialize with defaults
    $result = [
        'favicon_ico' => null,
        'favicon_svg' => null,
        'favicon_16' => null,
        'favicon_32' => null,
        'favicon_192' => null,
        'favicon_512' => null
    ];

    // Find .ico file
    foreach ($variants as $v) {
        if (isset($v['format']) && $v['format'] == 'ico') {
            $result['favicon_ico'] = '/' . $v['path'];
            break;
        }
    }

    // Find PNG sizes
    $sizes = [16, 32, 192, 512];
    foreach ($sizes as $size) {
        foreach ($variants as $v) {
            if (isset($v['format']) && $v['format'] == 'png' && isset($v['size']) && $v['size'] == $size) {
                $result['favicon_' . $size] = '/' . $v['path'];
                break;
            }
        }
    }

    // Use 32x32 PNG as .ico fallback if .ico wasn't generated
    if (!$result['favicon_ico'] && $result['favicon_32']) {
        $result['favicon_ico'] = $result['favicon_32'];
    }

    return $result;
}

/**
 * Encrypt SMTP password using AES-256-CBC
 *
 * @param string $password Plain text password to encrypt
 * @return string Encrypted password (base64 encoded with IV) or empty string
 */
function encryptSmtpPassword(string $password): string
{
    if ($password === '') {
        return '';
    }

    // Use a key derived from the database credentials (consistent across requests)
    $mysqlPassword = getenv('MYSQL_PASSWORD');
    $mysqlDatabase = getenv('MYSQL_DATABASE');

    if ($mysqlPassword === false || $mysqlDatabase === false) {
        error_log('encryptSmtpPassword: Missing MYSQL_PASSWORD or MYSQL_DATABASE env vars');
        return '';
    }

    $key = hash('sha256', $mysqlPassword . $mysqlDatabase, true);
    $ivLength = openssl_cipher_iv_length('aes-256-cbc');

    if ($ivLength === false) {
        error_log('encryptSmtpPassword: Failed to get IV length');
        return '';
    }

    $iv = openssl_random_pseudo_bytes($ivLength);
    $encrypted = openssl_encrypt($password, 'aes-256-cbc', $key, 0, $iv);

    if ($encrypted === false) {
        error_log('encryptSmtpPassword: Encryption failed');
        return '';
    }

    // Store IV with encrypted data (base64 encoded)
    return base64_encode($iv . $encrypted);
}

/**
 * Decrypt SMTP password
 *
 * @param string $encryptedPassword Base64 encoded encrypted password with IV
 * @return string Decrypted password or empty string on failure
 */
function decryptSmtpPassword(string $encryptedPassword): string
{
    if ($encryptedPassword === '') {
        return '';
    }

    try {
        // Use the same key as encryption
        $mysqlPassword = getenv('MYSQL_PASSWORD');
        $mysqlDatabase = getenv('MYSQL_DATABASE');

        if ($mysqlPassword === false || $mysqlDatabase === false) {
            error_log('decryptSmtpPassword: Missing MYSQL_PASSWORD or MYSQL_DATABASE env vars');
            return '';
        }

        $key = hash('sha256', $mysqlPassword . $mysqlDatabase, true);
        $data = base64_decode($encryptedPassword, true);

        if ($data === false) {
            error_log("decryptSmtpPassword: Failed to base64 decode - invalid encrypted data");
            return '';
        }

        // Extract IV and encrypted data
        $ivLength = openssl_cipher_iv_length('aes-256-cbc');

        if ($ivLength === false) {
            error_log('decryptSmtpPassword: Failed to get IV length');
            return '';
        }

        $iv = substr($data, 0, $ivLength);
        $encrypted = substr($data, $ivLength);

        if (strlen($iv) !== $ivLength) {
            error_log("decryptSmtpPassword: Invalid IV length - corrupted encrypted data");
            return '';
        }

        $decrypted = openssl_decrypt($encrypted, 'aes-256-cbc', $key, 0, $iv);

        if ($decrypted === false) {
            error_log("decryptSmtpPassword: Decryption failed - possible key mismatch or corrupted data");
            return '';
        }

        return $decrypted;
    } catch (Exception $e) {
        error_log("decryptSmtpPassword: Exception - " . $e->getMessage());
        return '';
    }
}

function updateSettings(\mysqli $db_conn, array $data): array
{
    // In demo mode, prevent changing the donation link
    $demoMode = filter_var(getenv('DEMO_MODE') ?: 'false', FILTER_VALIDATE_BOOLEAN);
    if ($demoMode && array_key_exists('donation_link', $data)) {
        unset($data['donation_link']);
    }

    $fields = ['site_title','hero_html','hero_media_id','site_bio_html','donation_settings_json','timezone','cta_text','cta_url','donate_text_html','donation_method','donation_link','donation_qr_media_id','donation_instructions_html','hero_overlay_opacity','hero_overlay_color','show_hero','show_about','show_donation','show_mailing_list','newsletter_position','newsletter_position_scope','show_view_counts','show_impression_counts','ignore_admin_tracking','notify_subscribers_on_post','email_include_post_body','show_donate_button','ai_system_prompt','hero_height','show_footer','footer_layout','footer_media_id','footer_height','footer_overlay_opacity','footer_overlay_color','footer_column1_html','footer_column2_html','mailing_list_html','smtp_rate_limit','smtp_rate_period','smtp_batch_delay','smtp_host','smtp_port','smtp_secure','smtp_auth','smtp_username','smtp_password','smtp_from_email','smtp_from_name','show_logo'];
    $sets = [];
    $params = [];
    $types = '';

    foreach ($fields as $key) {
        if (array_key_exists($key, $data)) {
            $sets[] = "$key = ?";
            // Encrypt SMTP password before saving
            if ($key === 'smtp_password') {
                $params[] = encryptSmtpPassword($data[$key]);
            }
            // Sanitize HTML fields
            elseif ($key === 'hero_html' || $key === 'site_bio_html' || $key === 'donate_text_html' || $key === 'donation_instructions_html' || $key === 'footer_column1_html' || $key === 'footer_column2_html' || $key === 'mailing_list_html') {
                $params[] = sanitizeHtml($data[$key]);
            } else {
                $params[] = $data[$key];
            }
            // Set parameter types
            if ($key === 'hero_media_id' || $key === 'show_hero' || $key === 'show_about' || $key === 'show_donation' || $key === 'show_mailing_list' || $key === 'show_view_counts' || $key === 'show_impression_counts' || $key === 'ignore_admin_tracking' || $key === 'notify_subscribers_on_post' || $key === 'email_include_post_body' || $key === 'show_donate_button' || $key === 'donation_qr_media_id' || $key === 'hero_height' || $key === 'show_footer' || $key === 'footer_media_id' || $key === 'footer_height' || $key === 'smtp_rate_limit' || $key === 'smtp_rate_period' || $key === 'smtp_port' || $key === 'smtp_auth' || $key === 'show_logo') { $types .= 'i'; }
            elseif ($key === 'hero_overlay_opacity' || $key === 'footer_overlay_opacity' || $key === 'smtp_batch_delay') { $types .= 'd'; }
            else { $types .= 's'; }
        }
    }

    if (empty($sets)) { return ['success' => false, 'error' => 'No fields to update']; }

    $sql = 'UPDATE settings SET ' . implode(', ', $sets) . ', updated_at = CURRENT_TIMESTAMP WHERE id = 1';
    $stmt = mysqli_prepare($db_conn, $sql);
    if (!$stmt) {
        return ['success' => false, 'error' => mysqli_error($db_conn)];
    }

    mysqli_stmt_bind_param($stmt, $types, ...$params);

    if (!mysqli_stmt_execute($stmt)) {
        return ['success' => false, 'error' => mysqli_error($db_conn)];
    }

    return ['success' => true];
}

/**
 * Newsletter helpers
 */
function getActiveSubscriberCount(\mysqli $db_conn): int
{
    $sql = 'SELECT COUNT(*) as count FROM newsletter_subscribers WHERE is_active = ?';
    $stmt = mysqli_prepare($db_conn, $sql);

    if (!$stmt) {
        error_log('getActiveSubscriberCount: failed to prepare statement: ' . mysqli_error($db_conn));
        return 0;
    }

    $isActive = 1;
    mysqli_stmt_bind_param($stmt, 'i', $isActive);

    if (!mysqli_stmt_execute($stmt)) {
        error_log('getActiveSubscriberCount: failed to execute statement: ' . mysqli_error($db_conn));
        return 0;
    }

    $result = mysqli_stmt_get_result($stmt);
    if ($result) {
        $row = mysqli_fetch_assoc($result);
        return isset($row['count']) ? (int)$row['count'] : 0;
    }

    return 0;
}

function getTotalSubscriberCount(\mysqli $db_conn): int
{
    $sql = 'SELECT COUNT(*) as count FROM newsletter_subscribers';
    $stmt = mysqli_prepare($db_conn, $sql);

    if (!$stmt) {
        error_log('getTotalSubscriberCount: failed to prepare statement: ' . mysqli_error($db_conn));
        return 0;
    }

    if (!mysqli_stmt_execute($stmt)) {
        error_log('getTotalSubscriberCount: failed to execute statement: ' . mysqli_error($db_conn));
        return 0;
    }

    $result = mysqli_stmt_get_result($stmt);
    if ($result) {
        $row = mysqli_fetch_assoc($result);
        return isset($row['count']) ? (int)$row['count'] : 0;
    }

    return 0;
}

/**
 * Generate a secure unsubscribe token for an email address
 * Uses HMAC to prevent tampering
 *
 * @param string $email The email address to generate a token for
 * @return string URL-safe base64 encoded token
 */
function generateUnsubscribeToken(string $email): string
{
    $secret = getenv('UNSUBSCRIBE_SECRET');
    if ($secret === false || $secret === '') {
        $cfg = getDbConfig();
        $secret = $cfg['password'];
    }

    // Create payload with email (no timestamp/expiration)
    $payload = json_encode(['email' => $email]);

    // Generate HMAC signature
    $signature = hash_hmac('sha256', $payload, $secret);

    // Combine payload and signature
    $token = base64_encode($payload . '|' . $signature);

    // Make URL-safe
    return strtr($token, '+/', '-_');
}

/**
 * Validate and decode an unsubscribe token
 *
 * @param string $token The token to validate
 * @return string|false Email address if valid, false otherwise
 */
function validateUnsubscribeToken(string $token): string|false
{
    try {
        // Make URL-safe base64 back to normal
        $token = strtr($token, '-_', '+/');

        // Decode
        $decoded = base64_decode($token, true);
        if ($decoded === false) {
            return false;
        }

        // Split payload and signature
        $parts = explode('|', $decoded);
        if (count($parts) !== 2) {
            return false;
        }

        list($payload, $signature) = $parts;

        // Verify signature
        $secret = getenv('UNSUBSCRIBE_SECRET');
        if ($secret === false || $secret === '') {
            $cfg = getDbConfig();
            $secret = $cfg['password'];
        }
        $expectedSignature = hash_hmac('sha256', $payload, $secret);

        if (!hash_equals($expectedSignature, $signature)) {
            return false;
        }

        // Decode payload
        $data = json_decode($payload, true);
        if (!$data || !isset($data['email'])) {
            return false;
        }

        return $data['email'];

    } catch (Exception $e) {
        error_log('Unsubscribe token validation error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Send email notification to all active subscribers about a new post
 *
 * @param mysqli $db_conn Database connection
 * @param int $postId ID of the newly published post
 * @return array Result with success status and details
 */
function sendNewPostNotification(\mysqli $db_conn, int $postId): array
{
    // Get settings - notifications enabled and SMTP configuration
    $settings = getSettings($db_conn);
    if (!$settings || !$settings['notify_subscribers_on_post']) {
        return ['success' => false, 'error' => 'Notifications disabled in settings'];
    }

    // Load SMTP settings from database only
    $smtp_host = $settings['smtp_host'] ?? null;
    $smtp_port = isset($settings['smtp_port']) ? (int)$settings['smtp_port'] : 587;
    $smtp_secure = $settings['smtp_secure'] ?? 'none';
    // Convert 'none' to empty string for PHPMailer
    if ($smtp_secure === 'none') {
        $smtp_secure = '';
    }
    $smtp_auth = isset($settings['smtp_auth']) ? (bool)$settings['smtp_auth'] : true;
    $smtp_username = $settings['smtp_username'] ?? '';
    $smtp_password = $settings['smtp_password'] ?? '';
    $smtp_from_email = $settings['smtp_from_email'] ?? null;
    $smtp_from_name = $settings['smtp_from_name'] ?? 'Post Portal';

    // Debug: Log SMTP configuration (without exposing password)
    error_log("SMTP Config - Host: {$smtp_host}, Port: {$smtp_port}, Secure: {$smtp_secure}, Auth: " . ($smtp_auth ? 'true' : 'false') . ", Username: {$smtp_username}, Password Length: " . strlen($smtp_password));

    // Validate required SMTP settings
    if (!$smtp_host || !$smtp_from_email) {
        return ['success' => false, 'error' => 'SMTP configuration incomplete. Please configure SMTP settings in Admin > Newsletter > Email Settings.'];
    }

    // Get post details
    $post = getPost($db_conn, $postId);
    if (!$post) {
        return ['success' => false, 'error' => 'Post not found'];
    }

    // Get all active subscribers
    $sql = 'SELECT email FROM newsletter_subscribers WHERE is_active = ?';
    $stmt = mysqli_prepare($db_conn, $sql);

    if (!$stmt) {
        return ['success' => false, 'error' => 'Failed to prepare subscriber fetch'];
    }

    $isActive = 1;
    mysqli_stmt_bind_param($stmt, 'i', $isActive);

    if (!mysqli_stmt_execute($stmt)) {
        return ['success' => false, 'error' => 'Failed to fetch subscribers'];
    }

    $result = mysqli_stmt_get_result($stmt);
    $subscribers = [];

    if ($result) {
        while ($row = mysqli_fetch_assoc($result)) {
            if (!empty($row['email'])) {
                $subscribers[] = $row['email'];
            }
        }
    }

    // Early return if no subscribers - avoid initializing SMTP connection
    if (empty($subscribers)) {
        error_log('No active subscribers found - skipping email notification');
        return ['success' => true, 'sent' => 0, 'message' => 'No active subscribers'];
    }

    // Build email content - post data already decoded by getPost()
    $siteTitle = $settings['site_title'] ?: 'Post Portal';
    $postTitle = $post['title'] ?: 'New Post';
    $subject = $postTitle;

    // Get author name
    $authorName = '';
    if (!empty($post['author_first']) || !empty($post['author_last'])) {
        $authorName = trim(($post['author_first'] ?? '') . ' ' . ($post['author_last'] ?? ''));
    }
    if (empty($authorName)) {
        $authorName = 'Someone';
    }

    // Get the base URL for the site (for linking to post)
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $baseUrl = "{$protocol}://{$host}";

    // Link directly to post detail overlay: /?page=home&post_id=X
    $postUrl = "{$baseUrl}/?page=home&post_id={$postId}";

    // Build HTML email body using Smarty templates without relying on globals
    $emailView = new \Smarty\Smarty();
    $emailView->setTemplateDir(__DIR__ . '/templates');
    $emailView->setCompileDir(__DIR__ . '/cache');
    $emailView->setCacheDir(__DIR__ . '/cache');
    // Disable auto-escaping since we're handling HTML content
    $emailView->escape_html = false;

    $includePostBody = (bool)$settings['email_include_post_body'];

    // Prepare common template variables (non-personalized)
    $emailView->assign('site_title', $siteTitle);
    $emailView->assign('post_url', $postUrl);
    $emailView->assign('base_url', $baseUrl);

    // Prepare template variables based on email type
    if ($includePostBody) {
        // Get body HTML - already decoded by getPost()
        $bodyHtml = $post['body_html'];

        // Convert relative URLs to absolute URLs
        $bodyHtml = preg_replace('/(src|href)=["\']\//', '$1="' . $baseUrl . '/', $bodyHtml);

        // Get hero image data if available
        $heroImageUrl = '';
        if (!empty($post['hero_media_id'])) {
            $heroMedia = getMedia($db_conn, (int)$post['hero_media_id']);
            if ($heroMedia && !empty($heroMedia['variants_json'])) {
                // Use 800w variant for email (optimal for email clients)
                $variants = json_decode($heroMedia['variants_json'], true);

                if (is_array($variants)) {
                    foreach ($variants as $v) {
                        if (isset($v['width']) && $v['width'] === 800 && isset($v['format']) && $v['format'] === 'jpg' && !empty($v['path'])) {
                            $heroImageUrl = $baseUrl . '/' . ltrim($v['path'], '/');
                            break;
                        }
                    }
                }
            }
        }

        // Assign variables for full email template
        $emailView->assign('post_title', $postTitle);
        $emailView->assign('hero_image_url', $heroImageUrl);
        $emailView->assign('hero_image_height', $post['hero_image_height'] ?? 100);
        $emailView->assign('hero_title_overlay', $post['hero_title_overlay'] ?? 1);
        $emailView->assign('hero_overlay_opacity', $post['hero_overlay_opacity'] ?? 0.70);
        $emailView->assign('body_html', $bodyHtml);
    } else {
        // Always derive excerpt from the latest body_html to avoid stale saved excerpts
        $excerpt = generateExcerpt($post['body_html'], 150);

        // Assign variables for excerpt email template
        $emailView->assign('author_name', $authorName);
        $emailView->assign('excerpt', $excerpt);
    }

    // Send emails individually to each subscriber with personalized unsubscribe link
    $sentCount = 0;
    $errors = [];

    try {
        require_once(__DIR__ . '/vendor/autoload.php');

        // Create PHPMailer instance once and reuse
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);

        // Enable debug output for error logging (in production, errors are logged not displayed)
        $debugMode = getenv('DEBUG') === 'true' || getenv('DEBUG') === '1';
        $mail->SMTPDebug = $debugMode ? 3 : 0; // Verbose debugging in dev mode only
        $mail->Debugoutput = function($str, $level) use ($debugMode) {
            if ($debugMode) {
                // Only write to app log file (not error_log to avoid duplication)
                $logFile = '/var/www/html/logs/smtp.log';
                @file_put_contents($logFile, date('Y-m-d H:i:s') . " - " . trim($str) . "\n", FILE_APPEND);
            }
        };

        // Server settings
        $mail->isSMTP();
        $mail->Host = $smtp_host;
        $mail->Port = $smtp_port;

        // Set connection timeout to prevent gateway timeouts on unreachable servers
        $mail->Timeout = 10; // Connection timeout in seconds
        $mail->SMTPKeepAlive = true; // Keep connection alive for multiple sends

        if ($smtp_auth) {
            $mail->SMTPAuth = true;
            $mail->Username = $smtp_username;
            $mail->Password = $smtp_password;
        } else {
            $mail->SMTPAuth = false;
        }

        if ($smtp_secure) {
            $mail->SMTPSecure = $smtp_secure;
        }

        // Additional SMTP options for better compatibility
        $mail->SMTPOptions = [
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            ]
        ];

        // Test connection before attempting to send emails
        try {
            if (!$mail->smtpConnect()) {
                $errorMsg = 'Failed to connect to SMTP server ' . $smtp_host . ':' . $smtp_port . '. Please verify the server is reachable and settings are correct.';
                error_log('SMTP connection failed: ' . $errorMsg);
                return [
                    'success' => false,
                    'error' => 'Cannot connect to SMTP server. Please check your email settings.'
                ];
            }
        } catch (Exception $e) {
            $errorMsg = 'SMTP connection exception: ' . $e->getMessage();
            error_log($errorMsg);
            return [
                'success' => false,
                'error' => 'Cannot connect to SMTP server: ' . $e->getMessage()
            ];
        }

        // Sender - use configured from name and email
        $mail->setFrom($smtp_from_email, $smtp_from_name);

        // Content settings
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->Encoding = 'base64';
        $mail->Subject = $subject;

        // Rate limiting variables - use database settings if available, otherwise config defaults
        $smtp_rate_limit = isset($settings['smtp_rate_limit']) ? (int)$settings['smtp_rate_limit'] : (isset($smtp_rate_limit) ? $smtp_rate_limit : 20);
        $smtp_rate_period = isset($settings['smtp_rate_period']) ? (int)$settings['smtp_rate_period'] : (isset($smtp_rate_period) ? $smtp_rate_period : 60);
        $smtp_batch_delay = isset($settings['smtp_batch_delay']) ? (float)$settings['smtp_batch_delay'] : (isset($smtp_batch_delay) ? $smtp_batch_delay : 0.5);

        $rateLimitEnabled = $smtp_rate_limit > 0;
        $batchDelay = $smtp_batch_delay;
        $emailsSentInCurrentPeriod = 0;
        $periodStartTime = microtime(true);

        // Send to each subscriber individually with personalized unsubscribe link
        foreach ($subscribers as $email) {
            try {
                // Check rate limit - if we've hit the limit for this period, wait
                if ($rateLimitEnabled && $emailsSentInCurrentPeriod >= $smtp_rate_limit) {
                    $elapsedTime = microtime(true) - $periodStartTime;
                    $remainingTime = $smtp_rate_period - $elapsedTime;

                    if ($remainingTime > 0) {
                        error_log("Rate limit reached ({$smtp_rate_limit} emails per {$smtp_rate_period}s). Pausing for {$remainingTime}s...");
                        sleep((int) ceil($remainingTime));
                    }

                    // Reset counter and timer for new period
                    $emailsSentInCurrentPeriod = 0;
                    $periodStartTime = microtime(true);
                }

                // Generate personalized unsubscribe token for this email
                $unsubscribeToken = generateUnsubscribeToken($email);
                $unsubscribeUrl = "{$baseUrl}/api/unsubscribe.php?token={$unsubscribeToken}";

                // Assign the personalized unsubscribe URL to template
                $emailView->assign('unsubscribe_url', $unsubscribeUrl);

                // Render the email body with personalized unsubscribe link
                if ($includePostBody) {
                    $emailBody = $emailView->fetch('email_notification_full.tpl');
                } else {
                    $emailBody = $emailView->fetch('email_notification_excerpt.tpl');
                }

                // Clear previous recipients
                $mail->clearAddresses();

                // Add this subscriber
                $mail->addAddress($email);

                // Set body
                $mail->Body = $emailBody;
                $mail->AltBody = strip_tags($emailBody); // Plain text fallback

                // Send the email
                $mail->send();
                $sentCount++;
                $emailsSentInCurrentPeriod++;

                // Add delay between emails if configured
                if ($batchDelay > 0 && $sentCount < count($subscribers)) {
                    usleep((int)($batchDelay * 1000000)); // Convert to microseconds
                }

            } catch (Exception $e) {
                error_log("Failed to send notification to {$email}: " . $e->getMessage());
                $errors[] = $email;
            }
        }

        if ($sentCount > 0) {
            $failedCount = count($errors);
            return [
                'success' => true,
                'sent' => $sentCount,
                'failed' => $failedCount,
                'message' => "Notifications sent to {$sentCount} subscriber(s)" . ($failedCount > 0 ? " ({$failedCount} failed)" : '')
            ];
        } else {
            return [
                'success' => false,
                'error' => 'Failed to send emails to any subscribers'
            ];
        }

    } catch (Exception $e) {
        error_log('Failed to send post notification: ' . $e->getMessage());
        return [
            'success' => false,
            'error' => 'Failed to send email: ' . $e->getMessage()
        ];
    }
}

?>
