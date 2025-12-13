<?php

declare(strict_types=1);

namespace PostPortal\Service;

/**
 * Interface for media service operations
 */
interface MediaServiceInterface
{
    /**
     * Get a media item by ID
     *
     * @param int $id Media ID
     * @return array<string, mixed>|null
     */
    public function getMedia(int $id): ?array;

    /**
     * Get all media with pagination and optional search
     *
     * @param int $limit Number of items
     * @param int $offset Offset for pagination
     * @param string|null $search Search query
     * @return array<int, array<string, mixed>>
     */
    public function getAllMedia(int $limit = 50, int $offset = 0, ?string $search = null): array;

    /**
     * Upload and create a new media item
     *
     * @param array<string, mixed> $data Media data
     * @return array{success: bool, id?: int, error?: string}
     */
    public function createMedia(array $data): array;

    /**
     * Update media alt text
     *
     * @param int $id Media ID
     * @param string $altText New alt text
     * @return array{success: bool, error?: string}
     */
    public function updateAltText(int $id, string $altText): array;

    /**
     * Delete a media item
     *
     * @param int $id Media ID
     * @return bool
     */
    public function deleteMedia(int $id): bool;

    /**
     * Describe where a media item is referenced (posts/settings)
     *
     * @param int $mediaId Media ID
     * @return array<int, array<string, mixed>>
     */
    public function getUsage(int $mediaId): array;
}
