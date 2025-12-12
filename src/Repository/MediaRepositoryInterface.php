<?php

declare(strict_types=1);

namespace PostPortal\Repository;

/**
 * Interface for Media repository operations
 */
interface MediaRepositoryInterface
{
    /**
     * Get a media item by ID
     *
     * @param int $id Media ID
     * @return array<string, mixed>|null Media data or null if not found
     */
    public function findById(int $id): ?array;

    /**
     * Get all media with pagination and optional search
     *
     * @param int $limit Number of items to retrieve
     * @param int $offset Offset for pagination
     * @param string|null $search Search query
     * @return array<int, array<string, mixed>> Array of media items
     */
    public function findAll(int $limit = 50, int $offset = 0, ?string $search = null): array;

    /**
     * Create a new media item
     *
     * @param array<string, mixed> $data Media data
     * @return int Newly created media ID
     */
    public function create(array $data): int;

    /**
     * Update media alt text
     *
     * @param int $id Media ID
     * @param string $altText New alt text
     * @return bool True on success
     */
    public function updateAltText(int $id, string $altText): bool;

    /**
     * Delete a media item
     *
     * @param int $id Media ID
     * @return bool True on success
     */
    public function delete(int $id): bool;

    /**
     * Count all media records.
     */
    public function countAll(): int;

    /**
     * Get recent media for dashboards.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getRecent(int $limit = 8): array;
}
