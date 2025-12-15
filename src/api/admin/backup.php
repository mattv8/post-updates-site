<?php

declare(strict_types=1);

use PostPortal\Http\ApiHandler;
use PostPortal\Http\ErrorResponse;

require_once __DIR__ . '/../bootstrap.php';

ApiHandler::handle(function (): void {
    // Require admin authentication
    bootstrapApi(requireAuth: true, requireAdmin: true);
    requireCsrfToken();

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        ErrorResponse::json(405, 'Method not allowed');
    }

    $uploadsDir = realpath(__DIR__ . '/../../storage/uploads');

    if (!$uploadsDir || !is_dir($uploadsDir)) {
        ErrorResponse::internalError('Uploads directory not found');
    }

    // Create temp directory for backup
    $tempDir = sys_get_temp_dir() . '/postportal_backup_' . uniqid();
    if (!mkdir($tempDir, 0755, true)) {
        ErrorResponse::internalError('Failed to create temporary directory');
    }

    try {
        // Step 1: Dump database using the 'export' wrapper command
        // Use full path to avoid shell built-in 'export' command
        $dumpFile = $tempDir . '/database.sql';
        $exportCmd = sprintf('/usr/local/bin/export > %s 2>&1', escapeshellarg($dumpFile));

        $output = [];
        $returnCode = 0;
        exec($exportCmd, $output, $returnCode);

        if ($returnCode !== 0 || !file_exists($dumpFile)) {
            throw new RuntimeException('Database dump failed: ' . implode("\n", $output));
        }

        // Step 2: Copy uploads directory
        $uploadsBackupDir = $tempDir . '/uploads';
        if (!mkdir($uploadsBackupDir, 0755, true)) {
            throw new RuntimeException('Failed to create uploads backup directory');
        }

        // Use rsync for efficient copy with preserved structure
        $rsyncCmd = sprintf(
            'rsync -a %s/ %s/ 2>&1',
            escapeshellarg($uploadsDir),
            escapeshellarg($uploadsBackupDir)
        );
        exec($rsyncCmd, $output, $returnCode);

        if ($returnCode !== 0) {
            // Fallback to cp if rsync fails
            $cpCmd = sprintf(
                'cp -r %s/* %s/ 2>&1',
                escapeshellarg($uploadsDir),
                escapeshellarg($uploadsBackupDir)
            );
            exec($cpCmd, $output, $returnCode);
            // Don't fail if uploads dir is empty
        }

        // Step 3: Add metadata
        $metadata = [
            'created_at' => gmdate('Y-m-d\TH:i:s\Z'),
            'version' => '1.0',
            'php_version' => PHP_VERSION,
        ];
        file_put_contents($tempDir . '/backup-meta.json', json_encode($metadata, JSON_PRETTY_PRINT));

        // Step 4: Create tar.gz archive
        $timestamp = date('Y-m-d_His');
        $archiveName = "postportal_backup_{$timestamp}.tar.gz";
        $archivePath = sys_get_temp_dir() . '/' . $archiveName;

        $tarCmd = sprintf(
            'cd %s && tar -czf %s . 2>&1',
            escapeshellarg($tempDir),
            escapeshellarg($archivePath)
        );
        exec($tarCmd, $output, $returnCode);

        if ($returnCode !== 0 || !file_exists($archivePath)) {
            throw new RuntimeException('Failed to create archive: ' . implode("\n", $output));
        }

        // Cleanup temp directory
        exec('rm -rf ' . escapeshellarg($tempDir));

        // Step 5: Stream the archive to the user
        $fileSize = filesize($archivePath);

        // Clear any buffered output
        while (ob_get_level()) {
            ob_end_clean();
        }

        // Send headers for file download
        header('Content-Type: application/gzip');
        header('Content-Disposition: attachment; filename="' . $archiveName . '"');
        header('Content-Length: ' . $fileSize);
        header('Cache-Control: no-cache, must-revalidate');
        header('Pragma: no-cache');
        header('X-Content-Type-Options: nosniff');

        // Stream the file
        $handle = fopen($archivePath, 'rb');
        if ($handle === false) {
            throw new RuntimeException('Failed to open archive for streaming');
        }

        while (!feof($handle)) {
            echo fread($handle, 8192);
            flush();
        }
        fclose($handle);

        // Cleanup archive
        @unlink($archivePath);
        exit;
    } catch (Throwable $e) {
        // Cleanup on error
        exec('rm -rf ' . escapeshellarg($tempDir));
        if (isset($archivePath) && file_exists($archivePath)) {
            @unlink($archivePath);
        }

        error_log('Backup failed: ' . $e->getMessage());
        ErrorResponse::internalError('Backup failed: ' . $e->getMessage());
    }
});
