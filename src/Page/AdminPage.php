<?php

declare(strict_types=1);

namespace PostPortal\Page;

use mysqli;
use PostPortal\Container\ServiceContainer;

class AdminPage
{
    private ServiceContainer $container;
    private mysqli $db;
    private string $defaultLogo;

    public function __construct(ServiceContainer $container, mysqli $db, string $defaultLogo)
    {
        $this->container = $container;
        $this->db = $db;
        $this->defaultLogo = $defaultLogo;
    }

    /**
     * Build template data for the admin page.
     *
     * @return array<string, mixed>
     */
    public function build(): array
    {
        $settings = $this->container->getSettingsRepository()->getSettings() ?? [];

        // Format datetime fields to local timezone for display
        if (!empty($settings['last_cache_purge'])) {
            $settings['last_cache_purge'] = \formatDateTimeLocal($settings['last_cache_purge']);
        }

        $activeSubscriberCount = $this->container->getNewsletterRepository()->getActiveSubscriberCount();
        $totalSubscriberCount = $this->container->getNewsletterRepository()->getTotalSubscriberCount();

        $logoUrls = \getLogoUrls($this->db, $settings['logo_media_id'] ?? null, $this->defaultLogo);
        $faviconUrls = \getFaviconUrls($this->db, $settings['favicon_media_id'] ?? null);

        return [
            'settings' => $settings,
            'page_title' => 'Admin',
            'csrf_token' => \generateCsrfToken(),
            'current_user' => $_SESSION['username'] ?? 'admin',
            'active_subscriber_count' => $activeSubscriberCount,
            'total_subscriber_count' => $totalSubscriberCount,
            'default_ai_prompt' => DEFAULT_AI_SYSTEM_PROMPT,
            'logo_url' => $logoUrls['logo_url'],
            'logo_srcset_png' => $logoUrls['logo_srcset_png'],
            'logo_srcset_webp' => $logoUrls['logo_srcset_webp'],
            'favicon_ico' => $faviconUrls['favicon_ico'],
            'favicon_svg' => $faviconUrls['favicon_svg'],
            'favicon_16' => $faviconUrls['favicon_16'],
            'favicon_32' => $faviconUrls['favicon_32'],
            'favicon_192' => $faviconUrls['favicon_192'],
            'favicon_512' => $faviconUrls['favicon_512'],
        ];
    }
}
