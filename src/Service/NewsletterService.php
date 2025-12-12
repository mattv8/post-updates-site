<?php

declare(strict_types=1);

namespace PostPortal\Service;

use PostPortal\Repository\NewsletterRepositoryInterface;
use mysqli;

/**
 * Newsletter service for business logic around newsletter operations
 */
class NewsletterService
{
    private NewsletterRepositoryInterface $newsletterRepository;
    private mysqli $db;

    public function __construct(NewsletterRepositoryInterface $newsletterRepository, mysqli $db)
    {
        $this->newsletterRepository = $newsletterRepository;
        $this->db = $db;
    }

    /**
     * Subscribe an email to the newsletter
     *
     * @param string $email Email address
     * @param string|null $verificationToken Optional verification token
     * @return array{success: bool, id?: int, message?: string, error?: string}
     */
    public function subscribe(string $email, ?string $verificationToken = null): array
    {
        try {
            // Validate email format
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return ['success' => false, 'error' => 'Invalid email format'];
            }

            // Check if already subscribed
            $existing = $this->newsletterRepository->findByEmail($email);
            if ($existing) {
                if ($existing['is_active']) {
                    return [
                        'success' => true,
                        'message' => 'Already subscribed',
                        'already_subscribed' => true
                    ];
                }
                // Reactivate if previously unsubscribed
                // TODO: Implement reactivation logic
            }

            $id = $this->newsletterRepository->create($email, $verificationToken);
            
            return [
                'success' => true,
                'id' => $id,
                'message' => 'Successfully subscribed'
            ];
        } catch (\Throwable $e) {
            error_log('NewsletterService::subscribe error: ' . $e->getMessage());
            return ['success' => false, 'error' => 'Failed to subscribe'];
        }
    }

    /**
     * Unsubscribe an email from the newsletter
     *
     * @param string $email Email address
     * @return array{success: bool, message?: string, error?: string}
     */
    public function unsubscribe(string $email): array
    {
        try {
            $success = $this->newsletterRepository->unsubscribe($email);
            
            if ($success) {
                return ['success' => true, 'message' => 'Successfully unsubscribed'];
            }
            
            return ['success' => false, 'error' => 'Email not found'];
        } catch (\Throwable $e) {
            error_log('NewsletterService::unsubscribe error: ' . $e->getMessage());
            return ['success' => false, 'error' => 'Failed to unsubscribe'];
        }
    }

    /**
     * Verify a subscriber using verification token
     *
     * @param string $token Verification token
     * @return array{success: bool, message?: string, error?: string}
     */
    public function verifySubscriber(string $token): array
    {
        try {
            $success = $this->newsletterRepository->verify($token);
            
            if ($success) {
                return ['success' => true, 'message' => 'Email verified successfully'];
            }
            
            return ['success' => false, 'error' => 'Invalid or expired token'];
        } catch (\Throwable $e) {
            error_log('NewsletterService::verifySubscriber error: ' . $e->getMessage());
            return ['success' => false, 'error' => 'Failed to verify'];
        }
    }

    /**
     * Get active subscriber count
     *
     * @return int
     */
    public function getActiveSubscriberCount(): int
    {
        try {
            return $this->newsletterRepository->getActiveSubscriberCount();
        } catch (\Throwable $e) {
            error_log('NewsletterService::getActiveSubscriberCount error: ' . $e->getMessage());
            return 0;
        }
    }

    /**
     * Get total subscriber count
     *
     * @return int
     */
    public function getTotalSubscriberCount(): int
    {
        try {
            return $this->newsletterRepository->getTotalSubscriberCount();
        } catch (\Throwable $e) {
            error_log('NewsletterService::getTotalSubscriberCount error: ' . $e->getMessage());
            return 0;
        }
    }

    /**
     * Get all active subscriber emails
     *
     * @return array<int, string>
     */
    public function getActiveSubscriberEmails(): array
    {
        try {
            return $this->newsletterRepository->getActiveSubscriberEmails();
        } catch (\Throwable $e) {
            error_log('NewsletterService::getActiveSubscriberEmails error: ' . $e->getMessage());
            return [];
        }
    }
}
