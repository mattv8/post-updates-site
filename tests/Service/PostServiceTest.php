<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use PostPortal\Service\PostService;
use PostPortal\Repository\PostRepositoryInterface;

final class PostServiceTest extends TestCase
{
    public function testIncrementMetricsWithInvalidIdFails(): void
    {
        $repo = $this->createMock(PostRepositoryInterface::class);

        $service = new PostService($repo);
        $result = $service->incrementMetrics(0, 1, 1, 1, 1);

        $this->assertFalse($result['success']);
        $this->assertSame('Invalid post id', $result['error']);
    }

    public function testIncrementMetricsDelegatesToRepository(): void
    {
        $repo = $this->createMock(PostRepositoryInterface::class);

        $repo->expects($this->once())
            ->method('incrementMetrics')
            ->with(5, 1, 0, 2, 1)
            ->willReturn(true);

        $service = new PostService($repo);
        $result = $service->incrementMetrics(5, 1, 0, 2, 1);

        $this->assertTrue($result['success']);
    }
}
