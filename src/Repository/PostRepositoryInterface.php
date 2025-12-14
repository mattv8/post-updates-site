<?php

declare(strict_types=1);

namespace PostPortal\Repository;

/**
 * Interface for Post repository operations
 */
interface PostRepositoryInterface
{
    /**
     * Get a post by ID
     *
     * @param int $id Post ID
     * @return array<string, mixed>|null Post data or null if not found
     */
    public function findById(int $id): ?array;

    /**
     * Get all posts with pagination
     *
     * @param int $limit Number of posts to retrieve
     * @param int $offset Offset for pagination
     * @param string|null $status Filter by status (draft, published, or null for all)
     * @return array<int, array<string, mixed>> Array of posts
     */
    public function findAll(int $limit = 50, int $offset = 0, ?string $status = null): array;

    /**
     * Create a new post
     *
     * @param array<string, mixed> $data Post data
     * @return int Newly created post ID
     */
    public function create(array $data): int;

    /**
     * Update a post
     *
     * @param int $id Post ID
     * @param array<string, mixed> $data Post data to update
     * @return bool True on success
     */
    public function update(int $id, array $data): bool;

    /**
     * Delete a post
     *
     * @param int $id Post ID
     * @return bool True on success
     */
    public function delete(int $id): bool;

    /**
     * Get post body HTML
     *
     * @param int $id Post ID
     * @return string|null Post body HTML or null
     */
    public function getBodyHtml(int $id): ?string;

    /**
     * Get post status and published_at
     *
     * @param int $id Post ID
     * @return array<string, mixed>|null Post status info or null
     */
    public function getStatusInfo(int $id): ?array;

    /**
     * Update post excerpt
     *
     * @param int $id Post ID
     * @param string $excerpt New excerpt
     * @return bool True on success
     */
    public function updateExcerpt(int $id, string $excerpt): bool;

    /**
     * Update draft-only fields for a post.
     */
    public function updateDraftFields(int $id, array $data): bool;

    /**
     * Count posts optionally filtered by status.
     */
    public function countAll(?string $status = null): int;

    /**
     * Get recent posts for dashboards.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getRecent(int $limit = 5): array;

    /**
     * Count posts excluding soft-deleted ones.
     */
    public function countNonDeleted(): int;

    /**
     * Get posts with author info, paginated, excluding soft-deleted.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getWithAuthor(int $limit, int $offset): array;

    /**
     * Get single post with author info.
     */
    public function findWithAuthor(int $id): ?array;

    /**
     * Get published posts joined with hero media variants and author info.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getPublishedWithMedia(int $limit, int $offset): array;

    /**
     * Get posts with media for admin timeline (includes drafts).
     * Returns published posts plus draft posts, ordered by date.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getPostsWithMediaIncludingDrafts(int $limit, int $offset): array;

    /**
     * Increment view/impression metrics for a post.
     */
    public function incrementMetrics(int $postId, int $impressionInc, int $uniqueImpressionInc, int $viewInc, int $uniqueViewInc): bool;

    /**
     * Describe how a media item is referenced by posts.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getMediaUsage(int $mediaId): array;
}
