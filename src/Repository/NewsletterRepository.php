<?php

declare(strict_types=1);

namespace PostPortal\Repository;

use mysqli;

/**
 * Newsletter repository implementation using prepared statements
 */
class NewsletterRepository extends BaseRepository implements NewsletterRepositoryInterface
{
    /**
     * Get active subscriber count
     *
     * @return int Number of active subscribers
     */
    public function getActiveSubscriberCount(): int
    {
        $sql = 'SELECT COUNT(*) as count FROM newsletter_subscribers WHERE is_active = 1';
        $result = $this->fetchColumn($sql);
        
        return $result !== null ? (int)$result : 0;
    }

    /**
     * Get total subscriber count
     *
     * @return int Total number of subscribers
     */
    public function getTotalSubscriberCount(): int
    {
        $sql = 'SELECT COUNT(*) as count FROM newsletter_subscribers';
        $result = $this->fetchColumn($sql);
        
        return $result !== null ? (int)$result : 0;
    }

    /**
     * Get all active subscriber emails
     *
     * @return array<int, string> Array of email addresses
     */
    public function getActiveSubscriberEmails(): array
    {
        $sql = 'SELECT email FROM newsletter_subscribers WHERE is_active = 1';
        $rows = $this->fetchAll($sql);
        
        return array_column($rows, 'email');
    }

    /**
     * Find subscriber by email
     *
     * @param string $email Email address
     * @return array<string, mixed>|null Subscriber data or null if not found
     */
    public function findByEmail(string $email): ?array
    {
        $sql = 'SELECT * FROM newsletter_subscribers WHERE email = ? LIMIT 1';
        return $this->fetchOne($sql, [$email]);
    }

    /**
     * Create a new subscriber
     *
     * @param string $email Email address
     * @param string|null $verificationToken Verification token
     * @return int Newly created subscriber ID
     */
    public function create(string $email, ?string $verificationToken = null): int
    {
        $sql = 'INSERT INTO newsletter_subscribers (email, verification_token, is_active, created_at) VALUES (?, ?, ?, NOW())';
        $isActive = $verificationToken === null ? 1 : 0;
        $this->execute($sql, [$email, $verificationToken, $isActive]);
        
        return $this->lastInsertId();
    }

    /**
     * Verify a subscriber
     *
     * @param string $token Verification token
     * @return bool True on success
     */
    public function verify(string $token): bool
    {
        $sql = 'UPDATE newsletter_subscribers SET is_active = 1, verified_at = NOW() WHERE verification_token = ? AND is_active = 0';
        $this->execute($sql, [$token]);
        
        return $this->affectedRows() > 0;
    }

    /**
     * Unsubscribe a subscriber
     *
     * @param string $email Email address
     * @return bool True on success
     */
    public function unsubscribe(string $email): bool
    {
        $sql = 'UPDATE newsletter_subscribers SET is_active = 0, unsubscribed_at = NOW() WHERE email = ?';
        $this->execute($sql, [$email]);
        
        return $this->affectedRows() > 0;
    }
}
