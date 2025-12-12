<?php

declare(strict_types=1);

namespace PostPortal\Repository;

/**
 * Interface for Settings repository operations
 */
interface SettingsRepositoryInterface
{
    /**
     * Get all settings
     *
     * @return array<string, mixed>|null Settings data or null if not found
     */
    public function getSettings(): ?array;

    /**
     * Update settings
     *
     * @param array<string, mixed> $data Settings data to update
     * @return bool True on success
     */
    public function update(array $data): bool;
}
