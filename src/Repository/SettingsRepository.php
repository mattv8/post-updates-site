<?php

declare(strict_types=1);

namespace PostPortal\Repository;

use mysqli;

/**
 * Settings repository implementation using prepared statements
 */
class SettingsRepository extends BaseRepository implements SettingsRepositoryInterface
{
    /**
     * Get all settings
     *
     * @return array<string, mixed>|null Settings data or null if not found
     */
    public function getSettings(): ?array
    {
        $sql = 'SELECT * FROM settings WHERE id = 1 LIMIT 1';
        return $this->fetchOne($sql);
    }

    /**
     * Update settings
     *
     * @param array<string, mixed> $data Settings data to update
     * @return bool True on success
     */
    public function update(array $data): bool
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

        $sql = 'UPDATE settings SET ' . implode(', ', $fields) . ' WHERE id = 1';
        $this->execute($sql, $params);

        // Treat no-op updates as success; execute will throw on errors.
        return true;
    }

    /**
     * Identify whether a media asset is referenced in global settings.
     *
     * @return array<string, bool>
     */
    public function getMediaUsageFlags(int $mediaId): array
    {
        $flags = [
            'hero' => false,
            'logo' => false,
            'favicon' => false,
        ];

        $sql = 'SELECT hero_media_id, logo_media_id, favicon_media_id FROM settings WHERE id = 1';
        $row = $this->fetchOne($sql);
        if ($row) {
            $flags['hero'] = (int) ($row['hero_media_id'] ?? 0) === $mediaId;
            $flags['logo'] = (int) ($row['logo_media_id'] ?? 0) === $mediaId;
            $flags['favicon'] = (int) ($row['favicon_media_id'] ?? 0) === $mediaId;
        }

        return $flags;
    }
}
