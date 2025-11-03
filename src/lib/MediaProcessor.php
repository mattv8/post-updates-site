<?php
/**
 * Media Processing Library
 * Handles image uploads, optimization, and responsive variant generation
 */

require_once(__DIR__ . '/../vendor/autoload.php');

use Intervention\Image\ImageManager;

class MediaProcessor
{
    private $uploadsDir;
    private $originalsDir;
    private $variantsDir;
    private $maxFileSize = 20971520; // 20MB in bytes
    private $allowedFormats = ['image/jpeg', 'image/png', 'image/heic', 'image/webp'];
    private $allowedExtensions = ['jpg', 'jpeg', 'png', 'heic', 'webp'];
    private $variantWidths = [1600, 800, 400];
    private $manager;

    public function __construct($baseDir = null)
    {
        if ($baseDir === null) {
            $baseDir = __DIR__ . '/../storage/uploads';
        }

        $this->uploadsDir = rtrim($baseDir, '/');
        $this->originalsDir = $this->uploadsDir . '/originals';
        $this->variantsDir = $this->uploadsDir . '/variants';

        $this->manager = new ImageManager(['driver' => 'gd']);

        $this->ensureDirectories();
    }

    /**
     * Ensure all required directories exist
     */
    private function ensureDirectories()
    {
        $dirs = [
            $this->uploadsDir,
            $this->originalsDir,
            $this->variantsDir
        ];

        foreach ($this->variantWidths as $width) {
            $dirs[] = $this->variantsDir . '/' . $width;
        }

        foreach ($dirs as $dir) {
            if (!is_dir($dir)) {
                if (!@mkdir($dir, 0775, true)) {
                    $error = error_get_last();
                    error_log("Failed to create directory: {$dir}");
                    error_log("Error: " . ($error['message'] ?? 'Unknown error'));
                    error_log("Parent directory writable: " . (is_writable(dirname($dir)) ? 'yes' : 'no'));
                    error_log("Current user: " . get_current_user());
                    throw new Exception("Failed to create upload directory. Please ensure storage/uploads is writable by the web server.");
                }
            }

            // Verify directory is writable
            if (!is_writable($dir)) {
                error_log("Directory exists but is not writable: {$dir}");
                error_log("Directory permissions: " . substr(sprintf('%o', fileperms($dir)), -4));
                error_log("Directory owner: " . posix_getpwuid(fileowner($dir))['name'] ?? 'unknown');
                error_log("Current user: " . get_current_user());
                throw new Exception("Upload directory is not writable. Please check permissions on storage/uploads.");
            }
        }
    }

    /**
     * Process an uploaded file
     * @param array $file $_FILES array element
     * @param string $altText Optional alt text
     * @param string $username Username of uploader
     * @return array Result with success status and data/error
     */
    public function processUpload($file, $altText = '', $username = 'admin')
    {
        // Validate file upload
        $validation = $this->validateUpload($file);
        if (!$validation['success']) {
            return $validation;
        }

        try {
            // Generate unique filename
            $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $uniqueFilename = uniqid('img_' . time() . '_') . '.' . $extension;
            $originalPath = $this->originalsDir . '/' . $uniqueFilename;

            // Handle HEIC conversion
            if ($file['type'] === 'image/heic' || $extension === 'heic') {
                $converted = $this->convertHeicToJpeg($file['tmp_name']);
                if ($converted['success']) {
                    $uniqueFilename = str_replace('.heic', '.jpg', $uniqueFilename);
                    $originalPath = $this->originalsDir . '/' . $uniqueFilename;
                    file_put_contents($originalPath, $converted['data']);
                    $file['type'] = 'image/jpeg';
                } else {
                    return ['success' => false, 'error' => 'Failed to convert HEIC image'];
                }
            } else {
                // Move uploaded file to originals directory
                if (!move_uploaded_file($file['tmp_name'], $originalPath)) {
                    return ['success' => false, 'error' => 'Failed to save uploaded file'];
                }
            }

            // Strip EXIF data for privacy (keep orientation)
            $this->stripExifData($originalPath);

            // Get image dimensions
            $imageInfo = getimagesize($originalPath);
            $width = $imageInfo[0];
            $height = $imageInfo[1];

            // Generate responsive variants
            $variants = $this->generateVariants($originalPath, $uniqueFilename);

            // Prepare media record data
            $mediaData = [
                'filename' => $uniqueFilename,
                'original_filename' => $file['name'],
                'mime_type' => $file['type'],
                'size_bytes' => filesize($originalPath),
                'width' => $width,
                'height' => $height,
                'alt_text' => $altText,
                'storage_path' => str_replace(__DIR__ . '/../', '', $originalPath),
                'variants_json' => json_encode($variants),
                'created_by_user_id' => $username
            ];

            return [
                'success' => true,
                'data' => $mediaData
            ];

        } catch (Exception $e) {
            error_log("Media processing error: " . $e->getMessage());
            return ['success' => false, 'error' => 'Failed to process image: ' . $e->getMessage()];
        }
    }

    /**
     * Validate uploaded file
     */
    private function validateUpload($file)
    {
        // Check for upload errors
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return ['success' => false, 'error' => 'File upload error: ' . $this->getUploadError($file['error'])];
        }

        // Check file size
        if ($file['size'] > $this->maxFileSize) {
            return ['success' => false, 'error' => 'File size exceeds 20MB limit'];
        }

        // Validate MIME type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mimeType, $this->allowedFormats) && !in_array($file['type'], $this->allowedFormats)) {
            return ['success' => false, 'error' => 'Invalid file format. Only JPG, PNG, HEIC, and WebP are allowed'];
        }

        // Validate extension
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, $this->allowedExtensions)) {
            return ['success' => false, 'error' => 'Invalid file extension'];
        }

        // Check if file is actually an image
        if (!getimagesize($file['tmp_name']) && $extension !== 'heic') {
            return ['success' => false, 'error' => 'File is not a valid image'];
        }

        return ['success' => true];
    }

    /**
     * Generate responsive variants of an image
     */
    private function generateVariants($originalPath, $filename)
    {
        $variants = [];
        $baseFilename = pathinfo($filename, PATHINFO_FILENAME);

        foreach ($this->variantWidths as $width) {
            try {
                // Load original image
                $img = $this->manager->make($originalPath);

                // Only resize if image is wider than target width
                if ($img->width() > $width) {
                    $img->resize($width, null, function ($constraint) {
                        $constraint->aspectRatio();
                        $constraint->upsize();
                    });
                }

                // Save JPEG/PNG variant
                $variantFilename = $baseFilename . '_' . $width . 'w.jpg';
                $variantPath = $this->variantsDir . '/' . $width . '/' . $variantFilename;
                $img->save($variantPath, 85);

                $variants[] = [
                    'width' => $width,
                    'path' => str_replace(__DIR__ . '/../', '', $variantPath),
                    'format' => 'jpg'
                ];

                // Generate WebP variant using CLI tool (if available)
                $webpFilename = $baseFilename . '_' . $width . 'w.webp';
                $webpPath = $this->variantsDir . '/' . $width . '/' . $webpFilename;

                if ($this->convertToWebP($variantPath, $webpPath)) {
                    $variants[] = [
                        'width' => $width,
                        'path' => str_replace(__DIR__ . '/../', '', $webpPath),
                        'format' => 'webp'
                    ];
                }

                // Optimize JPEG
                $this->optimizeJpeg($variantPath);

            } catch (Exception $e) {
                error_log("Variant generation error for width {$width}: " . $e->getMessage());
            }
        }

        return $variants;
    }

    /**
     * Convert image to WebP format using CLI tool
     */
    private function convertToWebP($source, $destination)
    {
        // Check if cwebp is available
        exec('which cwebp 2>&1', $output, $returnCode);
        if ($returnCode !== 0) {
            return false;
        }

        $command = sprintf(
            'cwebp -q 85 %s -o %s 2>&1',
            escapeshellarg($source),
            escapeshellarg($destination)
        );

        exec($command, $output, $returnCode);

        return $returnCode === 0 && file_exists($destination);
    }

    /**
     * Optimize JPEG file using jpegoptim
     */
    private function optimizeJpeg($filepath)
    {
        exec('which jpegoptim 2>&1', $output, $returnCode);
        if ($returnCode !== 0) {
            return false;
        }

        $command = sprintf(
            'jpegoptim --strip-all --max=85 %s 2>&1',
            escapeshellarg($filepath)
        );

        exec($command, $output, $returnCode);
        return $returnCode === 0;
    }

    /**
     * Strip EXIF data from image (keep orientation)
     */
    private function stripExifData($filepath)
    {
        try {
            $img = $this->manager->make($filepath);

            // Auto-orient based on EXIF before stripping
            $img->orientate();

            // Save without EXIF
            $img->save($filepath);

            return true;
        } catch (Exception $e) {
            error_log("EXIF stripping error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Convert HEIC to JPEG
     * Note: Requires imagick extension with HEIC support
     */
    private function convertHeicToJpeg($heicPath)
    {
        if (!extension_loaded('imagick')) {
            return ['success' => false, 'error' => 'Imagick extension not available'];
        }

        try {
            $imagick = new Imagick($heicPath);
            $imagick->setImageFormat('jpeg');
            $imagick->setImageCompressionQuality(90);
            $jpegData = $imagick->getImageBlob();
            $imagick->clear();
            $imagick->destroy();

            return ['success' => true, 'data' => $jpegData];
        } catch (Exception $e) {
            error_log("HEIC conversion error: " . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Regenerate variants for an existing original image
     */
    public function regenerateVariants($originalPath, $filename)
    {
        $fullPath = $this->originalsDir . '/' . $filename;

        if (!file_exists($fullPath)) {
            return ['success' => false, 'error' => 'Original file not found'];
        }

        try {
            $variants = $this->generateVariants($fullPath, $filename);
            return [
                'success' => true,
                'variants' => $variants
            ];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Delete media file and all variants
     */
    public function deleteMedia($filename, $variantsJson)
    {
        try {
            // Delete original
            $originalPath = $this->originalsDir . '/' . $filename;
            if (file_exists($originalPath)) {
                unlink($originalPath);
            }

            // Delete variants
            $variants = json_decode($variantsJson, true);
            if (is_array($variants)) {
                foreach ($variants as $variant) {
                    $variantPath = __DIR__ . '/../' . $variant['path'];
                    if (file_exists($variantPath)) {
                        unlink($variantPath);
                    }
                }
            }

            return ['success' => true];
        } catch (Exception $e) {
            error_log("Media deletion error: " . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Get upload error message
     */
    private function getUploadError($code)
    {
        $errors = [
            UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize',
            UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE',
            UPLOAD_ERR_PARTIAL => 'File only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
            UPLOAD_ERR_EXTENSION => 'File upload stopped by extension'
        ];

        return $errors[$code] ?? 'Unknown upload error';
    }

    /**
     * Generate srcset attribute for responsive images
     */
    public static function generateSrcset($variants, $format = 'jpg')
    {
        if (empty($variants)) {
            return '';
        }

        $variantsArray = is_string($variants) ? json_decode($variants, true) : $variants;
        $srcsetParts = [];

        foreach ($variantsArray as $variant) {
            if ($variant['format'] === $format) {
                // Clean up the path to ensure it's web-accessible
                $path = $variant['path'];

                // Remove any absolute server paths
                $path = preg_replace('#^.*/?(storage/uploads/.*)$#', '$1', $path);

                // Ensure single leading slash
                $path = '/' . ltrim($path, '/');

                $srcsetParts[] = $path . ' ' . $variant['width'] . 'w';
            }
        }

        return implode(', ', $srcsetParts);
    }
}
