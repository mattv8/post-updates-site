<?php

declare(strict_types=1);

namespace PostPortal\Repository;

/**
 * Interface for user repository operations
 */
interface UserRepositoryInterface
{
    /**
     * Get all users
     *
     * @return array<int, array<string, mixed>>
     */
    public function getAll(): array;

    /**
     * Get a user by username
     *
     * @param string $username
     * @return array<string, mixed>|null
     */
    public function getByUsername(string $username): ?array;

    /**
     * Create a new user
     *
     * @param array<string, mixed> $data User data
     * @return bool True on success
     */
    public function create(array $data): bool;

    /**
     * Update a user attribute
     *
     * @param string $username
     * @param string $field
     * @param mixed $value
     * @return bool True on success
     */
    public function updateAttribute(string $username, string $field, mixed $value): bool;

    /**
     * Update multiple user attributes at once
     *
     * @param string $username
     * @param array<string, mixed> $data
     * @return bool True on success
     */
    public function update(string $username, array $data): bool;

    /**
     * Delete a user
     *
     * @param string $username
     * @return bool True on success
     */
    public function delete(string $username): bool;

    /**
     * Check if a username already exists
     *
     * @param string $username
     * @return bool
     */
    public function exists(string $username): bool;
}
