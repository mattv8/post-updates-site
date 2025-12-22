<?php

declare(strict_types=1);

namespace PostPortal\Lib;

/**
 * Asset Helper for cache-busting and bundle management.
 *
 * Provides versioned asset URLs to ensure browsers fetch updated assets
 * after deployments. Also supports production bundles.
 */
class AssetHelper
{
    private string $basePath;
    private bool $useBundle;
    private string $bundleVersion;

    /**
     * Bundle definitions: maps bundle name to array of source files.
     * Order matters - dependencies must come first.
     */
    private const BUNDLES = [
        // Core utilities loaded on all pages
        'core.bundle.js' => [
            'shared-utils.js',
            'validation-utils.js',
            'notifications.js',
        ],
        // Editor/post functionality
        'editor.bundle.js' => [
            'quill-upload-adapter.js',
            'auto-save.js',
            'ai-title-generator.js',
            'post-draft-handler.js',
            'publish-confirmation.js',
            'unpublish-confirmation.js',
        ],
        // Image cropping
        'cropping.bundle.js' => [
            'image-crop-manager.js',
            'admin-crop-init.js',
            'bg-preview-manager.js',
        ],
        // Home page specific
        'home.bundle.js' => [
            'newsletter-signup.js',
            'edit-sections.js',
            'edit-hero-modal.js',
            'home.js',
        ],
        // Admin page specific
        'admin.bundle.js' => [
            'settings-manager.js',
            'branding.js',
            'newsletter-admin.js',
            'user-management.js',
            'admin.js',
        ],
        // Auth/login
        'auth.bundle.js' => [
            'auth.js',
        ],
        // Post modal (used on index for unauthenticated users)
        'post-modal.bundle.js' => [
            'post-modal.js',
        ],
    ];

    public function __construct(?string $basePath = null)
    {
        $this->basePath = $basePath ?? dirname(__DIR__);

        // Check if bundles exist (production mode)
        $this->useBundle = file_exists($this->basePath . '/js/bundles/core.bundle.js');

        // Bundle version: use file modification time of manifest or fallback to app version
        $manifestPath = $this->basePath . '/js/bundles/manifest.json';
        if (file_exists($manifestPath)) {
            $manifest = json_decode(file_get_contents($manifestPath), true);
            $this->bundleVersion = $manifest['version'] ?? (string) filemtime($manifestPath);
        } else {
            $this->bundleVersion = (string) time();
        }
    }

    /**
     * Get versioned URL for a JavaScript file.
     * In production with bundles, returns the bundle URL.
     * In development, returns the original file with cache-busting version.
     *
     * @param string $file Filename (e.g., 'admin.js')
     * @return string Versioned URL
     */
    public function js(string $file): string
    {
        $file = ltrim($file, '/');
        if (strpos($file, 'js/') === 0) {
            $file = substr($file, 3);
        }

        $filePath = $this->basePath . '/js/' . $file;

        if (file_exists($filePath)) {
            $version = filemtime($filePath);
            return "/js/{$file}?v={$version}";
        }

        // File doesn't exist, return as-is (might be CDN or error)
        return "/js/{$file}";
    }

    /**
     * Get versioned URL for a CSS file.
     *
     * @param string $file Filename (e.g., 'custom.css')
     * @return string Versioned URL
     */
    public function css(string $file): string
    {
        $file = ltrim($file, '/');
        if (strpos($file, 'css/') === 0) {
            $file = substr($file, 4);
        }

        $filePath = $this->basePath . '/css/' . $file;

        if (file_exists($filePath)) {
            $version = filemtime($filePath);
            return "/css/{$file}?v={$version}";
        }

        return "/css/{$file}";
    }

    /**
     * Get versioned bundle URL for production, or array of individual files for development.
     *
     * @param string $bundleName Bundle name (e.g., 'core.bundle.js')
     * @return array{bundle: bool, url?: string, files?: string[]}
     */
    public function bundle(string $bundleName): array
    {
        if ($this->useBundle) {
            $bundlePath = $this->basePath . '/js/bundles/' . $bundleName;
            if (file_exists($bundlePath)) {
                $version = filemtime($bundlePath);
                return [
                    'bundle' => true,
                    'url' => "/js/bundles/{$bundleName}?v={$version}",
                ];
            }
        }

        // Development mode: return individual files
        if (isset(self::BUNDLES[$bundleName])) {
            $files = [];
            foreach (self::BUNDLES[$bundleName] as $file) {
                $files[] = $this->js($file);
            }
            return [
                'bundle' => false,
                'files' => $files,
            ];
        }

        // Unknown bundle
        return ['bundle' => false, 'files' => []];
    }

    /**
     * Check if running in bundle/production mode.
     */
    public function isBundleMode(): bool
    {
        return $this->useBundle;
    }

    /**
     * Get the bundle version string (from manifest).
     */
    public function getBundleVersion(): string
    {
        return $this->bundleVersion;
    }

    /**
     * Get all bundle definitions.
     */
    public static function getBundleDefinitions(): array
    {
        return self::BUNDLES;
    }
}
