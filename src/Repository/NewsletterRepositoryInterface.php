<?php

declare(strict_types=1);

namespace PostPortal\Repository;

/**
 * Interface for Newsletter repository operations
 */
interface NewsletterRepositoryInterface
{
    /**
     * Get active subscriber count
     *
     * @return int Number of active subscribers
     */
    public function getActiveSubscriberCount(): int;

    /**
     * Get total subscriber count
     *
     * @return int Total number of subscribers
     */
    public function getTotalSubscriberCount(): int;

    /**
     * Get all active subscriber emails
     *
     * @return array<int, string> Array of email addresses
     */
    public function getActiveSubscriberEmails(): array;

    /**
     * Find subscriber by email
     *
     * @param string $email Email address
     * @return array<string, mixed>|null Subscriber data or null if not found
     */
    public function findByEmail(string $email): ?array;

    /**
     * Create a new subscriber
     *
     * @param string $email Email address
     * @param string|null $verificationToken Verification token
     * @return int Newly created subscriber ID
     */
    public function create(string $email, ?string $verificationToken = null, ?string $ipAddress = null): int;

    /**
     * Reactivate a previously archived subscriber.
     */
    public function reactivate(int $id, ?string $ipAddress = null): bool;

    /**
     * Verify a subscriber
     *
     * @param string $token Verification token
     * @return bool True on success
     */
    public function verify(string $token): bool;

    /**
     * Unsubscribe a subscriber
     *
     * @param string $email Email address
     * @return bool True on success
     */
    public function unsubscribe(string $email): bool;

    /**
     * Get subscribers with optional active filter.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getSubscribers(bool $activeOnly = true): array;

    /**
     * Update subscriber active state by id.
     */
    public function updateStatus(int $id, bool $isActive): bool;
}
