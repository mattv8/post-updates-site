<?php

declare(strict_types=1);

namespace PostPortal\Repository;

/**
 * Repository for user database operations
 */
class UserRepository extends BaseRepository implements UserRepositoryInterface
{
    /**
     * Allowed fields for user updates (security whitelist)
     */
    private const ALLOWED_FIELDS = [
        'username',
        'password',
        'first',
        'last',
        'email',
        'isadmin',
        'active',
        'siteMemberships',
    ];

    /**
     * @inheritDoc
     */
    public function getAll(): array
    {
        $sql = 'SELECT username, first, last, email, isadmin, active, siteMemberships
                FROM users
                ORDER BY username ASC';
        return $this->fetchAll($sql);
    }

    /**
     * @inheritDoc
     */
    public function getByUsername(string $username): ?array
    {
        $sql = 'SELECT username, first, last, email, isadmin, active, siteMemberships
                FROM users
                WHERE username = ?';
        return $this->fetchOne($sql, [$username]);
    }

    /**
     * @inheritDoc
     */
    public function create(array $data): bool
    {
        // Filter to only allowed fields
        $filteredData = array_intersect_key($data, array_flip(self::ALLOWED_FIELDS));

        if (empty($filteredData['username'])) {
            return false;
        }

        // Hash password if provided
        if (!empty($filteredData['password'])) {
            $filteredData['password'] = password_hash($filteredData['password'], PASSWORD_DEFAULT);
        }

        // Set defaults
        $filteredData['isadmin'] = (int)($filteredData['isadmin'] ?? 0);
        $filteredData['active'] = (int)($filteredData['active'] ?? 1);
        $filteredData['siteMemberships'] = $filteredData['siteMemberships'] ?? '[]';

        $columns = implode(', ', array_keys($filteredData));
        $placeholders = implode(', ', array_fill(0, count($filteredData), '?'));

        $sql = "INSERT INTO users ($columns) VALUES ($placeholders)";
        $result = $this->execute($sql, array_values($filteredData));

        return $result === true;
    }

    /**
     * @inheritDoc
     */
    public function updateAttribute(string $username, string $field, mixed $value): bool
    {
        if (!in_array($field, self::ALLOWED_FIELDS, true)) {
            return false;
        }

        // Hash password if updating password
        if ($field === 'password' && is_string($value) && $value !== '') {
            $value = password_hash($value, PASSWORD_DEFAULT);
        }

        // Convert booleans to int for database
        if ($field === 'isadmin' || $field === 'active') {
            $value = (int)$value;
        }

        $sql = "UPDATE users SET $field = ? WHERE username = ?";
        $result = $this->execute($sql, [$value, $username]);

        // Return true if query executed successfully (even if no rows changed)
        return $result === true;
    }

    /**
     * @inheritDoc
     */
    public function update(string $username, array $data): bool
    {
        // Filter to only allowed fields
        $filteredData = array_intersect_key($data, array_flip(self::ALLOWED_FIELDS));

        if (empty($filteredData)) {
            return false;
        }

        // Hash password if provided and not empty
        if (isset($filteredData['password'])) {
            if ($filteredData['password'] === '') {
                unset($filteredData['password']); // Don't update password if empty
            } else {
                $filteredData['password'] = password_hash($filteredData['password'], PASSWORD_DEFAULT);
            }
        }

        // Convert booleans to int for database
        if (isset($filteredData['isadmin'])) {
            $filteredData['isadmin'] = (int)$filteredData['isadmin'];
        }
        if (isset($filteredData['active'])) {
            $filteredData['active'] = (int)$filteredData['active'];
        }

        if (empty($filteredData)) {
            return true; // Nothing to update
        }

        $setClauses = [];
        $params = [];
        foreach ($filteredData as $field => $value) {
            $setClauses[] = "$field = ?";
            $params[] = $value;
        }
        $params[] = $username;

        $sql = 'UPDATE users SET ' . implode(', ', $setClauses) . ' WHERE username = ?';
        $result = $this->execute($sql, $params);

        // Return true if query executed successfully (even if no rows changed)
        return $result === true;
    }

    /**
     * @inheritDoc
     */
    public function delete(string $username): bool
    {
        $sql = 'DELETE FROM users WHERE username = ?';
        $result = $this->execute($sql, [$username]);

        return $result === true && $this->affectedRows() > 0;
    }

    /**
     * @inheritDoc
     */
    public function exists(string $username): bool
    {
        $sql = 'SELECT 1 FROM users WHERE username = ? LIMIT 1';
        return $this->fetchOne($sql, [$username]) !== null;
    }
}
