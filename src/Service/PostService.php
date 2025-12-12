<?php

declare(strict_types=1);

namespace PostPortal\Service;

use PostPortal\Repository\PostRepositoryInterface;
use mysqli;

/**
 * Post service for business logic around post operations
 */
class PostService
{
    private PostRepositoryInterface $postRepository;
    private mysqli $db;

    public function __construct(PostRepositoryInterface $postRepository, mysqli $db)
    {
        $this->postRepository = $postRepository;
        $this->db = $db;
    }

    /**
     * Create a new post
     *
     * @param array<string, mixed> $data Post data
     * @return array{success: bool, id?: int, error?: string}
     */
    public function createPost(array $data): array
    {
        try {
            // Sanitize HTML content if provided
            if (isset($data['body_html'])) {
                $data['body_html'] = $this->sanitizeHtml($data['body_html']);
            }

            // Generate excerpt if not provided
            if (!isset($data['excerpt']) && isset($data['body_html'])) {
                $data['excerpt'] = $this->generateExcerpt($data['body_html'], 250);
            }

            // Auto-set published_at for published posts
            if (($data['status'] ?? 'draft') === 'published' && empty($data['published_at'])) {
                $data['published_at'] = date('Y-m-d H:i:s');
            }

            $id = $this->postRepository->create($data);

            return ['success' => true, 'id' => $id];
        } catch (\Throwable $e) {
            error_log('PostService::createPost error: ' . $e->getMessage());
            return ['success' => false, 'error' => 'Failed to create post'];
        }
    }

    /**
     * Update an existing post
     *
     * @param int $id Post ID
     * @param array<string, mixed> $data Post data to update
     * @return array{success: bool, error?: string}
     */
    public function updatePost(int $id, array $data): array
    {
        try {
            // Sanitize HTML content if provided
            if (isset($data['body_html'])) {
                $data['body_html'] = $this->sanitizeHtml($data['body_html']);
            }

            // Handle published_at for status changes
            if (isset($data['status']) && $data['status'] === 'published') {
                $currentPost = $this->postRepository->getStatusInfo($id);
                if ($currentPost && is_null($currentPost['published_at'])) {
                    $data['published_at'] = date('Y-m-d H:i:s');
                }
            }

            $success = $this->postRepository->update($id, $data);

            return ['success' => $success];
        } catch (\Throwable $e) {
            error_log('PostService::updatePost error: ' . $e->getMessage());
            return ['success' => false, 'error' => 'Failed to update post'];
        }
    }

    /**
     * Get a post by ID
     *
     * @param int $id Post ID
     * @return array<string, mixed>|null
     */
    public function getPost(int $id): ?array
    {
        try {
            return $this->postRepository->findById($id);
        } catch (\Throwable $e) {
            error_log('PostService::getPost error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Get published posts with pagination
     *
     * @param int $limit Number of posts
     * @param int $offset Offset for pagination
     * @return array<int, array<string, mixed>>
     */
    public function getPublishedPosts(int $limit = 10, int $offset = 0): array
    {
        try {
            return $this->postRepository->findAll($limit, $offset, 'published');
        } catch (\Throwable $e) {
            error_log('PostService::getPublishedPosts error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Delete a post (soft delete)
     *
     * @param int $id Post ID
     * @return bool
     */
    public function deletePost(int $id): bool
    {
        try {
            return $this->postRepository->delete($id);
        } catch (\Throwable $e) {
            error_log('PostService::deletePost error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get post with author details.
     */
    public function getPostWithAuthor(int $id): ?array
    {
        try {
            return $this->postRepository->findWithAuthor($id);
        } catch (\Throwable $e) {
            error_log('PostService::getPostWithAuthor error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Paginated posts with author info (non-deleted).
     *
     * @return array{data: array<int, array<string, mixed>>, total: int}
     */
    public function getPostsWithAuthor(int $limit, int $offset): array
    {
        try {
            return [
                'data' => $this->postRepository->getWithAuthor($limit, $offset),
                'total' => $this->postRepository->countNonDeleted(),
            ];
        } catch (\Throwable $e) {
            error_log('PostService::getPostsWithAuthor error: ' . $e->getMessage());
            return ['data' => [], 'total' => 0];
        }
    }

    /**
     * Update draft-only fields for a post.
     *
     * @param array<string, mixed> $payload
     * @return array{success: bool, error?: string}
     */
    public function updateDraftFields(int $id, array $payload): array
    {
        try {
            $allowed = [
                'title_draft',
                'body_html_draft',
                'hero_media_id_draft',
                'hero_image_height_draft',
                'hero_crop_overlay_draft',
                'hero_title_overlay_draft',
                'hero_overlay_opacity_draft',
                'gallery_media_ids_draft',
            ];

            $data = [];
            if (isset($payload['title'])) {
                $data['title_draft'] = (string) $payload['title'];
            }
            if (isset($payload['body_html'])) {
                $data['body_html_draft'] = $this->sanitizeHtml((string) $payload['body_html']);
            }
            if (array_key_exists('hero_media_id', $payload)) {
                $data['hero_media_id_draft'] = $payload['hero_media_id'] !== null ? (int) $payload['hero_media_id'] : null;
            }
            if (isset($payload['hero_image_height'])) {
                $data['hero_image_height_draft'] = (int) $payload['hero_image_height'];
            }
            if (isset($payload['hero_crop_overlay'])) {
                $data['hero_crop_overlay_draft'] = (int) (bool) $payload['hero_crop_overlay'];
            }
            if (isset($payload['hero_title_overlay'])) {
                $data['hero_title_overlay_draft'] = (int) (bool) $payload['hero_title_overlay'];
            }
            if (isset($payload['hero_overlay_opacity'])) {
                $data['hero_overlay_opacity_draft'] = (float) $payload['hero_overlay_opacity'];
            }
            if (isset($payload['gallery_media_ids'])) {
                $galleryIds = is_array($payload['gallery_media_ids']) ? $payload['gallery_media_ids'] : [];
                $data['gallery_media_ids_draft'] = json_encode($galleryIds);
            }

            $data = array_filter(
                $data,
                static fn($key) => in_array($key, $allowed, true),
                ARRAY_FILTER_USE_KEY
            );

            if (empty($data)) {
                return ['success' => true, 'message' => 'No fields to update'];
            }

            $updated = $this->postRepository->updateDraftFields($id, $data);
            return ['success' => $updated];
        } catch (\Throwable $e) {
            error_log('PostService::updateDraftFields error: ' . $e->getMessage());
            return ['success' => false, 'error' => 'Failed to update draft'];
        }
    }

    /**
     * Increment post metrics.
     */
    public function incrementMetrics(int $postId, int $impressionInc, int $uniqueImpressionInc, int $viewInc, int $uniqueViewInc): array
    {
        try {
            if ($postId <= 0) {
                return ['success' => false, 'error' => 'Invalid post id'];
            }

            $updated = $this->postRepository->incrementMetrics($postId, $impressionInc, $uniqueImpressionInc, $viewInc, $uniqueViewInc);
            if (!$updated) {
                return ['success' => false, 'error' => 'Post not found or not published'];
            }

            return ['success' => true];
        } catch (\Throwable $e) {
            error_log('PostService::incrementMetrics error: ' . $e->getMessage());
            return ['success' => false, 'error' => 'Failed to update metrics'];
        }
    }

    /**
     * Sanitize HTML content
     *
     * @param string $html Raw HTML
     * @return string Sanitized HTML
     */
    private function sanitizeHtml(string $html): string
    {
        // Use the global sanitizeHtml function for now
        // TODO: Move sanitization logic into this class
        return \sanitizeHtml($html);
    }

    /**
     * Generate an excerpt from HTML content
     *
     * @param string $html HTML content
     * @param int $maxLength Maximum length
     * @return string Generated excerpt
     */
    private function generateExcerpt(string $html, int $maxLength = 250): string
    {
        // Use the global generateExcerpt function for now
        // TODO: Move excerpt generation logic into this class
        return \generateExcerpt($html, $maxLength);
    }
}
