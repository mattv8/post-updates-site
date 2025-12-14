<?php

declare(strict_types=1);

namespace PostPortal\Service;

/**
 * Interface for post service operations
 */
interface PostServiceInterface
{
    /**
     * Create a new post
     *
     * @param array<string, mixed> $data Post data
     * @return array{success: bool, id?: int, error?: string}
     */
    public function createPost(array $data): array;

    /**
     * Update an existing post
     *
     * @param int $id Post ID
     * @param array<string, mixed> $data Post data to update
     * @return array{success: bool, error?: string}
     */
    public function updatePost(int $id, array $data): array;

    /**
     * Get a post by ID
     *
     * @param int $id Post ID
     * @return array<string, mixed>|null
     */
    public function getPost(int $id): ?array;

    /**
     * Get published posts with pagination
     *
     * @param int $limit Number of posts
     * @param int $offset Offset for pagination
     * @return array<int, array<string, mixed>>
     */
    public function getPublishedPosts(int $limit = 10, int $offset = 0): array;

    /**
     * Delete a post (soft delete)
     *
     * @param int $id Post ID
     * @return bool
     */
    public function deletePost(int $id): bool;

    /**
     * Get post with author details
     *
     * @param int $id Post ID
     * @return array<string, mixed>|null
     */
    public function getPostWithAuthor(int $id): ?array;

    /**
     * Get posts with author info, paginated
     *
     * @param int $limit Number of posts
     * @param int $offset Offset for pagination
     * @return array{data: array<int, array<string, mixed>>, total: int}
     */
    public function getPostsWithAuthor(int $limit, int $offset): array;

    /**
     * Update draft-only fields for a post
     *
     * @param int $id Post ID
     * @param array<string, mixed> $payload Draft field data
     * @return array{success: bool, error?: string}
     */
    public function updateDraftFields(int $id, array $payload): array;

    /**
     * Get posts for admin timeline (includes both published and drafts)
     *
     * @param int $limit Number of posts
     * @param int $offset Offset for pagination
     * @return array<int, array<string, mixed>>
     */
    public function getPostsIncludingDrafts(int $limit = 10, int $offset = 0): array;

    /**
     * Increment post metrics
     *
     * @param int $postId Post ID
     * @param int $impressionInc Impression increment
     * @param int $uniqueImpressionInc Unique impression increment
     * @param int $viewInc View increment
     * @param int $uniqueViewInc Unique view increment
     * @return array{success: bool, error?: string}
     */
    public function incrementMetrics(int $postId, int $impressionInc, int $uniqueImpressionInc, int $viewInc, int $uniqueViewInc): array;
}
