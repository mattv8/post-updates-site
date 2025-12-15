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

    // Check for uploaded file
    if (!isset($_FILES['backup']) || $_FILES['backup']['error'] !== UPLOAD_ERR_OK) {
        $errorCode = $_FILES['backup']['error'] ?? UPLOAD_ERR_NO_FILE;
        $errorMessages = [
            UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize',
            UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE',
            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
            UPLOAD_ERR_EXTENSION => 'A PHP extension stopped the upload',
        ];
        ErrorResponse::badRequest($errorMessages[$errorCode] ?? 'Unknown upload error');
    }

    $uploadedFile = $_FILES['backup']['tmp_name'];
    $filename = $_FILES['backup']['name'] ?? 'backup.tar.gz';

    // Validate file type
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $uploadedFile);
    finfo_close($finfo);

    $validMimeTypes = ['application/gzip', 'application/x-gzip', 'application/x-tar', 'application/octet-stream'];
    if (!in_array($mimeType, $validMimeTypes, true) && !str_ends_with($filename, '.tar.gz') && !str_ends_with($filename, '.tgz')) {
        ErrorResponse::badRequest('Invalid file type. Please upload a .tar.gz backup file.');
    }

    $uploadsDir = realpath(__DIR__ . '/../../storage/uploads');

    if (!$uploadsDir || !is_dir($uploadsDir)) {
        ErrorResponse::internalError('Uploads directory not found');
    }

    // Create temp directory for extraction
    $tempDir = sys_get_temp_dir() . '/postportal_restore_' . uniqid();
    if (!mkdir($tempDir, 0755, true)) {
        ErrorResponse::internalError('Failed to create temporary directory');
    }

    try {
        // Step 1: Extract the archive
        $tarCmd = sprintf(
            'tar -xzf %s -C %s 2>&1',
            escapeshellarg($uploadedFile),
            escapeshellarg($tempDir)
        );
        $output = [];
        $returnCode = 0;
        exec($tarCmd, $output, $returnCode);

        if ($returnCode !== 0) {
            throw new RuntimeException('Failed to extract archive: ' . implode("\n", $output));
        }

        // Step 2: Validate backup structure
        $dumpFile = $tempDir . '/database.sql';
        $uploadsBackupDir = $tempDir . '/uploads';
        $metadataFile = $tempDir . '/backup-meta.json';

        if (!file_exists($dumpFile)) {
            throw new RuntimeException('Invalid backup: database.sql not found');
        }

        // Load and validate metadata if present
        $metadata = null;
        if (file_exists($metadataFile)) {
            $metadata = json_decode(file_get_contents($metadataFile), true);
        }

        // Step 3: Restore database using the 'import' wrapper command
        // Use full path to ensure we use the wrapper script
        $importCmd = sprintf('/usr/local/bin/import %s 2>&1', escapeshellarg($dumpFile));
        exec($importCmd, $output, $returnCode);

        if ($returnCode !== 0) {
            throw new RuntimeException('Database restore failed: ' . implode("\n", $output));
        }

        // Step 4: Restore uploads
        if (is_dir($uploadsBackupDir)) {
            // Clear existing uploads (except .gitkeep files)
            $clearCmd = sprintf(
                'find %s -type f ! -name ".gitkeep" -delete 2>&1',
                escapeshellarg($uploadsDir)
            );
            exec($clearCmd, $output, $returnCode);

            // Copy restored uploads
            $rsyncCmd = sprintf(
                'rsync -a %s/ %s/ 2>&1',
                escapeshellarg($uploadsBackupDir),
                escapeshellarg($uploadsDir)
            );
            exec($rsyncCmd, $output, $returnCode);

            if ($returnCode !== 0) {
                // Fallback to cp
                $cpCmd = sprintf(
                    'cp -r %s/* %s/ 2>&1',
                    escapeshellarg($uploadsBackupDir),
                    escapeshellarg($uploadsDir)
                );
                exec($cpCmd, $output, $returnCode);
            }

            // Fix permissions
            exec('chmod -R 755 ' . escapeshellarg($uploadsDir));
        }

        // Step 5: Cleanup
        exec('rm -rf ' . escapeshellarg($tempDir));

        // Purge cache after restore using wrapper command
        exec('cache-purge 2>&1', $output, $returnCode);

        $response = [
            'message' => 'Backup restored successfully',
            'restored_at' => date('c'),
        ];

        if ($metadata) {
            $response['backup_created_at'] = $metadata['created_at'] ?? null;
            $response['backup_version'] = $metadata['version'] ?? null;
        }

        ErrorResponse::success($response);
    } catch (Throwable $e) {
        // Cleanup on error
        exec('rm -rf ' . escapeshellarg($tempDir));

        error_log('Restore failed: ' . $e->getMessage());
        ErrorResponse::internalError('Restore failed: ' . $e->getMessage());
    }
});
