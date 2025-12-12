<?php

declare(strict_types=1);

namespace PostPortal\Repository;

use mysqli;

/**
 * Media repository implementation using prepared statements
 */
class MediaRepository extends BaseRepository implements MediaRepositoryInterface
{
    /**
     * Get a media item by ID
     *
     * @param int $id Media ID
     * @return array<string, mixed>|null Media data or null if not found
     */
    public function findById(int $id): ?array
    {
        $sql = 'SELECT * FROM media WHERE id = ? LIMIT 1';
        return $this->fetchOne($sql, [$id]);
    }

    /**
     * Get all media with pagination and optional search
     *
     * @param int $limit Number of items to retrieve
     * @param int $offset Offset for pagination
     * @param string|null $search Search query
     * @return array<int, array<string, mixed>> Array of media items
     */
    public function findAll(int $limit = 50, int $offset = 0, ?string $search = null): array
    {
        if ($search !== null) {
            $searchPattern = "%{$search}%";
            $sql = 'SELECT * FROM media WHERE original_filename LIKE ? OR alt_text LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
            return $this->fetchAll($sql, [$searchPattern, $searchPattern, $limit, $offset]);
        }
        
        $sql = 'SELECT * FROM media ORDER BY created_at DESC LIMIT ? OFFSET ?';
        return $this->fetchAll($sql, [$limit, $offset]);
    }

    /**
     * Create a new media item
     *
     * @param array<string, mixed> $data Media data
     * @return int Newly created media ID
     */
    public function create(array $data): int
    {
        $fields = [];
        $placeholders = [];
        $params = [];
        
        foreach ($data as $key => $value) {
            $fields[] = $key;
            $placeholders[] = '?';
            $params[] = $value;
        }
        
        $sql = 'INSERT INTO media (' . implode(', ', $fields) . ') VALUES (' . implode(', ', $placeholders) . ')';
        $this->execute($sql, $params);
        
        return $this->lastInsertId();
    }

    /**
     * Update media alt text
     *
     * @param int $id Media ID
     * @param string $altText New alt text
     * @return bool True on success
     */
    public function updateAltText(int $id, string $altText): bool
    {
        $sql = 'UPDATE media SET alt_text = ? WHERE id = ?';
        $this->execute($sql, [$altText, $id]);
        
        return $this->affectedRows() > 0;
    }

    /**
     * Delete a media item
     *
     * @param int $id Media ID
     * @return bool True on success
     */
    public function delete(int $id): bool
    {
        $sql = 'DELETE FROM media WHERE id = ?';
        $this->execute($sql, [$id]);
        
        return $this->affectedRows() > 0;
    }
}
