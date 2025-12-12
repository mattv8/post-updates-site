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
