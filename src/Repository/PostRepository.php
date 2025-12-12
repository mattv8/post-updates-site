<?php

declare(strict_types=1);

namespace PostPortal\Repository;

use mysqli;

/**
 * Post repository implementation using prepared statements
 */
class PostRepository extends BaseRepository implements PostRepositoryInterface
{
    /**
     * Get a post by ID
     *
     * @param int $id Post ID
     * @return array<string, mixed>|null Post data or null if not found
     */
    public function findById(int $id): ?array
    {
        $sql = 'SELECT * FROM posts WHERE id = ? LIMIT 1';
        return $this->fetchOne($sql, [$id]);
    }

    /**
     * Get all posts with pagination
     *
     * @param int $limit Number of posts to retrieve
     * @param int $offset Offset for pagination
     * @param string|null $status Filter by status (draft, published, or null for all)
     * @return array<int, array<string, mixed>> Array of posts
     */
    public function findAll(int $limit = 50, int $offset = 0, ?string $status = null): array
    {
        if ($status !== null) {
            $sql = 'SELECT * FROM posts WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
            return $this->fetchAll($sql, [$status, $limit, $offset]);
        }
        
        $sql = 'SELECT * FROM posts ORDER BY created_at DESC LIMIT ? OFFSET ?';
        return $this->fetchAll($sql, [$limit, $offset]);
    }

    /**
     * Create a new post
     *
     * @param array<string, mixed> $data Post data
     * @return int Newly created post ID
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
        
        $sql = 'INSERT INTO posts (' . implode(', ', $fields) . ') VALUES (' . implode(', ', $placeholders) . ')';
        $this->execute($sql, $params);
        
        return $this->lastInsertId();
    }

    /**
     * Update a post
     *
     * @param int $id Post ID
     * @param array<string, mixed> $data Post data to update
     * @return bool True on success
     */
    public function update(int $id, array $data): bool
    {
        if (empty($data)) {
            return true;
        }
        
        $fields = [];
        $params = [];
        
        foreach ($data as $key => $value) {
            $fields[] = "$key = ?";
            $params[] = $value;
        }
        
        $params[] = $id;
        
        $sql = 'UPDATE posts SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $this->execute($sql, $params);
        
        return $this->affectedRows() > 0;
    }

    /**
     * Delete a post
     *
     * @param int $id Post ID
     * @return bool True on success
     */
    public function delete(int $id): bool
    {
        $sql = 'DELETE FROM posts WHERE id = ?';
        $this->execute($sql, [$id]);
        
        return $this->affectedRows() > 0;
    }

    /**
     * Get post body HTML
     *
     * @param int $id Post ID
     * @return string|null Post body HTML or null
     */
    public function getBodyHtml(int $id): ?string
    {
        $sql = 'SELECT body_html FROM posts WHERE id = ? LIMIT 1';
        $result = $this->fetchColumn($sql, [$id]);
        
        return $result !== null ? (string)$result : null;
    }

    /**
     * Get post status and published_at
     *
     * @param int $id Post ID
     * @return array<string, mixed>|null Post status info or null
     */
    public function getStatusInfo(int $id): ?array
    {
        $sql = 'SELECT status, published_at FROM posts WHERE id = ? LIMIT 1';
        return $this->fetchOne($sql, [$id]);
    }

    /**
     * Update post excerpt
     *
     * @param int $id Post ID
     * @param string $excerpt New excerpt
     * @return bool True on success
     */
    public function updateExcerpt(int $id, string $excerpt): bool
    {
        $sql = 'UPDATE posts SET excerpt = ? WHERE id = ?';
        $this->execute($sql, [$excerpt, $id]);
        
        return $this->affectedRows() > 0;
    }
}
