<?php

declare(strict_types=1);

namespace PostPortal\Container;

use mysqli;
use PostPortal\Repository\PostRepository;
use PostPortal\Repository\MediaRepository;
use PostPortal\Repository\NewsletterRepository;
use PostPortal\Repository\SettingsRepository;
use PostPortal\Service\PostService;
use PostPortal\Service\MediaService;
use PostPortal\Service\NewsletterService;

/**
 * Simple service container for dependency injection
 * Provides centralized access to repositories and services
 */
class ServiceContainer
{
    private mysqli $db;
    private static ?ServiceContainer $instance = null;

    /** @var array<string, object> */
    private array $services = [];

    private function __construct(mysqli $db)
    {
        $this->db = $db;
    }

    /**
     * Get singleton instance of the container
     */
    public static function getInstance(mysqli $db): self
    {
        if (self::$instance === null) {
            self::$instance = new self($db);
        }
        return self::$instance;
    }

    /**
     * Reset the singleton instance (useful for testing)
     */
    public static function reset(): void
    {
        self::$instance = null;
    }

    /**
     * Get PostRepository instance
     */
    public function getPostRepository(): PostRepository
    {
        if (!isset($this->services['PostRepository'])) {
            $this->services['PostRepository'] = new PostRepository($this->db);
        }
        return $this->services['PostRepository'];
    }

    /**
     * Get MediaRepository instance
     */
    public function getMediaRepository(): MediaRepository
    {
        if (!isset($this->services['MediaRepository'])) {
            $this->services['MediaRepository'] = new MediaRepository($this->db);
        }
        return $this->services['MediaRepository'];
    }

    /**
     * Get NewsletterRepository instance
     */
    public function getNewsletterRepository(): NewsletterRepository
    {
        if (!isset($this->services['NewsletterRepository'])) {
            $this->services['NewsletterRepository'] = new NewsletterRepository($this->db);
        }
        return $this->services['NewsletterRepository'];
    }

    /**
     * Get SettingsRepository instance
     */
    public function getSettingsRepository(): SettingsRepository
    {
        if (!isset($this->services['SettingsRepository'])) {
            $this->services['SettingsRepository'] = new SettingsRepository($this->db);
        }
        return $this->services['SettingsRepository'];
    }

    /**
     * Get PostService instance
     */
    public function getPostService(): PostService
    {
        if (!isset($this->services['PostService'])) {
            $this->services['PostService'] = new PostService(
                $this->getPostRepository(),
                $this->db
            );
        }
        return $this->services['PostService'];
    }

    /**
     * Get MediaService instance
     */
    public function getMediaService(): MediaService
    {
        if (!isset($this->services['MediaService'])) {
            $this->services['MediaService'] = new MediaService(
                $this->getMediaRepository(),
                $this->getPostRepository(),
                $this->getSettingsRepository()
            );
        }
        return $this->services['MediaService'];
    }

    /**
     * Get NewsletterService instance
     */
    public function getNewsletterService(): NewsletterService
    {
        if (!isset($this->services['NewsletterService'])) {
            $this->services['NewsletterService'] = new NewsletterService(
                $this->getNewsletterRepository(),
                $this->db
            );
        }
        return $this->services['NewsletterService'];
    }

    /**
     * Get database connection
     */
    public function getDb(): mysqli
    {
        return $this->db;
    }
}
