<?php

declare(strict_types=1);

namespace PostPortal\Service;

use PostPortal\Repository\UserRepositoryInterface;

/**
 * Service for user management operations
 */
class UserService implements UserServiceInterface
{
    private UserRepositoryInterface $userRepository;

    public function __construct(UserRepositoryInterface $userRepository)
    {
        $this->userRepository = $userRepository;
    }

    /**
     * @inheritDoc
     */
    public function getAllUsers(): array
    {
        try {
            $users = $this->userRepository->getAll();

            // Sanitize output - don't return passwords
            $sanitizedUsers = array_map(function ($user) {
                unset($user['password']);
                return $user;
            }, $users);

            return [
                'success' => true,
                'data' => $sanitizedUsers,
            ];
        } catch (\Throwable $e) {
            error_log('UserService::getAllUsers error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to retrieve users',
            ];
        }
    }

    /**
     * @inheritDoc
     */
    public function getUser(string $username): array
    {
        try {
            $user = $this->userRepository->getByUsername($username);

            if ($user === null) {
                return [
                    'success' => false,
                    'error' => 'User not found',
                ];
            }

            unset($user['password']);

            return [
                'success' => true,
                'data' => $user,
            ];
        } catch (\Throwable $e) {
            error_log('UserService::getUser error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to retrieve user',
            ];
        }
    }

    /**
     * @inheritDoc
     */
    public function createUser(array $data): array
    {
        try {
            // Validate required fields
            $username = trim((string)($data['username'] ?? ''));
            $password = (string)($data['password'] ?? '');

            if ($username === '') {
                return [
                    'success' => false,
                    'error' => 'Username is required',
                ];
            }

            if ($password === '') {
                return [
                    'success' => false,
                    'error' => 'Password is required',
                ];
            }

            // Check username length
            if (strlen($username) > 32) {
                return [
                    'success' => false,
                    'error' => 'Username must be 32 characters or less',
                ];
            }

            // Check if username already exists
            if ($this->userRepository->exists($username)) {
                return [
                    'success' => false,
                    'error' => 'Username already exists',
                ];
            }

            // Validate email if provided
            $email = trim((string)($data['email'] ?? ''));
            if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return [
                    'success' => false,
                    'error' => 'Invalid email address',
                ];
            }

            $result = $this->userRepository->create($data);

            if ($result) {
                return [
                    'success' => true,
                    'message' => 'User created successfully',
                ];
            }

            return [
                'success' => false,
                'error' => 'Failed to create user',
            ];
        } catch (\Throwable $e) {
            error_log('UserService::createUser error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to create user',
            ];
        }
    }

    /**
     * @inheritDoc
     */
    public function updateUserAttribute(string $username, string $field, mixed $value): array
    {
        try {
            // Demo mode protection: prevent editing admin credentials or status
            $isDemoMode = filter_var(getenv('DEMO_MODE') ?: 'false', FILTER_VALIDATE_BOOLEAN);
            if ($isDemoMode && $username === 'admin' && in_array($field, ['username', 'password', 'isadmin', 'active'], true)) {
                return [
                    'success' => false,
                    'error' => 'Admin account cannot be modified in demo mode',
                ];
            }

            // Check if user exists
            if (!$this->userRepository->exists($username)) {
                return [
                    'success' => false,
                    'error' => 'User not found',
                ];
            }

            // Validate email if updating email field
            if ($field === 'email' && is_string($value) && $value !== '') {
                if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    return [
                        'success' => false,
                        'error' => 'Invalid email address',
                    ];
                }
            }

            // Don't allow empty password updates
            if ($field === 'password') {
                $passwordValue = is_string($value) ? $value : '';
                if ($passwordValue === '') {
                    return [
                        'success' => false,
                        'error' => 'Password cannot be empty',
                    ];
                }
            }

            $result = $this->userRepository->updateAttribute($username, $field, $value);

            if ($result) {
                return [
                    'success' => true,
                    'message' => 'User updated successfully',
                ];
            }

            return [
                'success' => false,
                'error' => 'Failed to update user',
            ];
        } catch (\Throwable $e) {
            error_log('UserService::updateUserAttribute error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to update user',
            ];
        }
    }

    /**
     * @inheritDoc
     */
    public function updateUser(string $username, array $data): array
    {
        try {
            // Demo mode protection: prevent editing admin password
            $isDemoMode = filter_var(getenv('DEMO_MODE') ?: 'false', FILTER_VALIDATE_BOOLEAN);
            if ($isDemoMode && $username === 'admin' && isset($data['password'])) {
                return [
                    'success' => false,
                    'error' => 'Admin account password cannot be modified in demo mode',
                ];
            }

            // Check if user exists
            if (!$this->userRepository->exists($username)) {
                return [
                    'success' => false,
                    'error' => 'User not found',
                ];
            }

            // Validate email if provided
            if (isset($data['email']) && $data['email'] !== '') {
                if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                    return [
                        'success' => false,
                        'error' => 'Invalid email address',
                    ];
                }
            }

            $result = $this->userRepository->update($username, $data);

            if ($result) {
                return [
                    'success' => true,
                    'message' => 'User updated successfully',
                ];
            }

            return [
                'success' => false,
                'error' => 'Failed to update user',
            ];
        } catch (\Throwable $e) {
            error_log('UserService::updateUser error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to update user',
            ];
        }
    }

    /**
     * @inheritDoc
     */
    public function deleteUser(string $username, string $currentUser): array
    {
        try {
            // Demo mode protection: prevent deleting admin account
            $isDemoMode = filter_var(getenv('DEMO_MODE') ?: 'false', FILTER_VALIDATE_BOOLEAN);
            if ($isDemoMode && $username === 'admin') {
                return [
                    'success' => false,
                    'error' => 'Admin account cannot be deleted in demo mode',
                ];
            }

            // Prevent self-deletion
            if ($username === $currentUser) {
                return [
                    'success' => false,
                    'error' => 'You cannot delete your own account',
                ];
            }

            // Check if user exists
            if (!$this->userRepository->exists($username)) {
                return [
                    'success' => false,
                    'error' => 'User not found',
                ];
            }

            $result = $this->userRepository->delete($username);

            if ($result) {
                return [
                    'success' => true,
                    'message' => 'User deleted successfully',
                ];
            }

            return [
                'success' => false,
                'error' => 'Failed to delete user',
            ];
        } catch (\Throwable $e) {
            error_log('UserService::deleteUser error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to delete user',
            ];
        }
    }
}
