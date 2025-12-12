<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use PostPortal\Service\MediaService;
use PostPortal\Repository\MediaRepositoryInterface;
use PostPortal\Repository\PostRepositoryInterface;
use PostPortal\Repository\SettingsRepositoryInterface;

final class MediaServiceTest extends TestCase
{
    public function testUsageMergesSettingsFlags(): void
    {
        $mediaRepo = $this->createMock(MediaRepositoryInterface::class);
        $postRepo = $this->createMock(PostRepositoryInterface::class);
        $settingsRepo = $this->createMock(SettingsRepositoryInterface::class);

        $postRepo->method('getMediaUsage')->willReturn([
            ['id' => 10, 'title' => 'Post A', 'usage' => 'hero'],
        ]);

        $settingsRepo->method('getMediaUsageFlags')->willReturn([
            'hero' => true,
            'logo' => false,
            'favicon' => true,
        ]);

        $service = new MediaService($mediaRepo, $postRepo, $settingsRepo);
        $usage = $service->getUsage(1);

        $this->assertCount(3, $usage);
        $this->assertSame('Post A', $usage[0]['title']);
        $this->assertSame('Site Hero Settings', $usage[1]['title']);
        $this->assertSame('branding favicon', $usage[2]['usage']);
    }
}
