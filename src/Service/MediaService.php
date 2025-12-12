<?php

declare(strict_types=1);

namespace PostPortal\Service;

use PostPortal\Repository\MediaRepositoryInterface;
use PostPortal\Repository\PostRepositoryInterface;
use PostPortal\Repository\SettingsRepositoryInterface;

/**
 * Media service for business logic around media operations
 */
class MediaService
{
    private MediaRepositoryInterface $mediaRepository;
    private PostRepositoryInterface $postRepository;
    private SettingsRepositoryInterface $settingsRepository;

    public function __construct(MediaRepositoryInterface $mediaRepository, PostRepositoryInterface $postRepository, SettingsRepositoryInterface $settingsRepository)
    {
        $this->mediaRepository = $mediaRepository;
        $this->postRepository = $postRepository;
        $this->settingsRepository = $settingsRepository;
    }

    /**
     * Get a media item by ID
     *
     * @param int $id Media ID
     * @return array<string, mixed>|null
     */
    public function getMedia(int $id): ?array
    {
        try {
            return $this->mediaRepository->findById($id);
        } catch (\Throwable $e) {
            error_log('MediaService::getMedia error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Get all media with pagination and optional search
     *
     * @param int $limit Number of items
     * @param int $offset Offset for pagination
     * @param string|null $search Search query
     * @return array<int, array<string, mixed>>
     */
    public function getAllMedia(int $limit = 50, int $offset = 0, ?string $search = null): array
    {
        try {
            return $this->mediaRepository->findAll($limit, $offset, $search);
        } catch (\Throwable $e) {
            error_log('MediaService::getAllMedia error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Upload and create a new media item
     *
     * @param array<string, mixed> $data Media data
     * @return array{success: bool, id?: int, error?: string}
     */
    public function createMedia(array $data): array
    {
        try {
            $id = $this->mediaRepository->create($data);
            return ['success' => true, 'id' => $id];
        } catch (\Throwable $e) {
            error_log('MediaService::createMedia error: ' . $e->getMessage());
            return ['success' => false, 'error' => 'Failed to create media'];
        }
    }

    /**
     * Update media alt text
     *
     * @param int $id Media ID
     * @param string $altText New alt text
     * @return array{success: bool, error?: string}
     */
    public function updateAltText(int $id, string $altText): array
    {
        try {
            $success = $this->mediaRepository->updateAltText($id, $altText);
            return ['success' => $success];
        } catch (\Throwable $e) {
            error_log('MediaService::updateAltText error: ' . $e->getMessage());
            return ['success' => false, 'error' => 'Failed to update alt text'];
        }
    }

    /**
     * Delete a media item
     *
     * @param int $id Media ID
     * @return bool
     */
    public function deleteMedia(int $id): bool
    {
        try {
            return $this->mediaRepository->delete($id);
        } catch (\Throwable $e) {
            error_log('MediaService::deleteMedia error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Describe where a media item is referenced (posts/settings).
     *
     * @return array<int, array<string, mixed>>
     */
    public function getUsage(int $mediaId): array
    {
        try {
            $usage = $this->postRepository->getMediaUsage($mediaId);
            $flags = $this->settingsRepository->getMediaUsageFlags($mediaId);

            if ($flags['hero']) {
                $usage[] = [
                    'id' => 0,
                    'title' => 'Site Hero Settings',
                    'usage' => 'site hero',
                ];
            }

            if ($flags['logo']) {
                $usage[] = [
                    'id' => 0,
                    'title' => 'Site Logo',
                    'usage' => 'branding logo',
                ];
            }

            if ($flags['favicon']) {
                $usage[] = [
                    'id' => 0,
                    'title' => 'Site Favicon',
                    'usage' => 'branding favicon',
                ];
            }

            return $usage;
        } catch (\Throwable $e) {
            error_log('MediaService::getUsage error: ' . $e->getMessage());
            return [];
        }
    }
}
