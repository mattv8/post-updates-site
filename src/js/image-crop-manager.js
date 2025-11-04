/**
 * Image Crop Manager
 * Reusable module for handling image uploads with Cropper.js integration
 * Used for post hero images, main hero banner, footer backgrounds, etc.
 */

(function(window) {
  'use strict';

  class ImageCropManager {
    constructor(options = {}) {
      // Required options
      this.fileInput = options.fileInput; // Input element for file selection
      this.cropContainer = options.cropContainer; // Container to show cropper
      this.cropImage = options.cropImage; // Image element for cropper
      this.previewContainer = options.previewContainer; // Preview container (optional)
      this.uploadCallback = options.uploadCallback; // Function to call when upload is complete

      // Optional options
      this.aspectRatio = options.aspectRatio || null; // null = free crop, number = fixed ratio
      this.uploadButton = options.uploadButton; // Upload button element
      this.cancelButton = options.cancelButton; // Cancel button element
      this.autoDetectButton = options.autoDetectButton; // Auto-detect bounds button
      this.onCropInit = options.onCropInit; // Callback when cropper is initialized
      this.onCropCancel = options.onCropCancel; // Callback when crop is cancelled
      this.validateFile = options.validateFile; // Custom file validation function
      this.maxFileSize = options.maxFileSize || 20 * 1024 * 1024; // 20MB default
      this.allowedTypes = options.allowedTypes || ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

      // State
      this.cropper = null;
      this.currentFile = null;

      this._init();
    }

    _init() {
      if (!this.fileInput) {
        console.error('ImageCropManager: fileInput is required');
        return;
      }

      // Bind event listeners
      this.fileInput.addEventListener('change', (e) => this._handleFileSelect(e));

      if (this.uploadButton) {
        this.uploadButton.addEventListener('click', () => this._handleUpload());
      }

      if (this.cancelButton) {
        this.cancelButton.addEventListener('click', () => this.cancelCrop());
      }

      if (this.autoDetectButton) {
        this.autoDetectButton.addEventListener('click', () => this._handleAutoDetect());
      }
    }

    _handleFileSelect(e) {
      const file = e.target.files[0];
      if (!file) {
        return;
      }

      // Validate file
      const validationError = this._validateFile(file);
      if (validationError) {
        console.error('ImageCropManager: Validation error:', validationError);
        alert(validationError);
        this.fileInput.value = '';
        return;
      }
      this.currentFile = file;
      this._initCropper(file);
    }

    _validateFile(file) {
      // Custom validation if provided
      if (this.validateFile) {
        const customError = this.validateFile(file);
        if (customError) return customError;
      }

      // File size validation
      if (file.size > this.maxFileSize) {
        const sizeMB = (this.maxFileSize / (1024 * 1024)).toFixed(0);
        return `File size must be less than ${sizeMB}MB`;
      }

      // File type validation
      if (!this.allowedTypes.includes(file.type)) {
        return 'Invalid file type. Please use JPG, PNG, WebP, or HEIC';
      }

      return null;
    }

    _initCropper(file) {
      const reader = new FileReader();

      reader.onload = (e) => {
        if (!this.cropImage || !this.cropContainer) {
          console.error('ImageCropManager: cropImage and cropContainer are required');
          return;
        }
        this.cropImage.src = e.target.result;
        this.cropContainer.style.display = 'block';

        // Destroy existing cropper if any
        if (this.cropper) {
          this.cropper.destroy();
        }

        // Initialize Cropper.js
        const cropperOptions = {
          viewMode: 1,
          dragMode: 'move',
          autoCropArea: 0.9,
          restore: false,
          guides: true,
          center: true,
          highlight: false,
          cropBoxMovable: true,
          cropBoxResizable: true,
          toggleDragModeOnDblclick: false,
        };

        // Add aspect ratio if specified
        if (this.aspectRatio !== null) {
          cropperOptions.aspectRatio = this.aspectRatio;
        }

        this.cropper = new Cropper(this.cropImage, cropperOptions);

        // Callback when cropper is initialized
        if (this.onCropInit) {
          this.onCropInit(this.cropper, file);
        }
      };
      reader.readAsDataURL(file);
    }

    _handleAutoDetect() {
      if (!this.cropper) return;

      // Reset to full image first
      this.cropper.reset();

      const imageData = this.cropper.getImageData();

      // For fixed aspect ratio, center the crop box
      if (this.aspectRatio !== null) {
        const imageWidth = imageData.naturalWidth;
        const imageHeight = imageData.naturalHeight;

        let cropWidth, cropHeight;

        if (imageWidth / imageHeight > this.aspectRatio) {
          // Image is wider than aspect ratio
          cropHeight = imageHeight;
          cropWidth = cropHeight * this.aspectRatio;
        } else {
          // Image is taller than aspect ratio
          cropWidth = imageWidth;
          cropHeight = cropWidth / this.aspectRatio;
        }

        const x = (imageWidth - cropWidth) / 2;
        const y = (imageHeight - cropHeight) / 2;

        this.cropper.setCropBoxData({
          left: x,
          top: y,
          width: cropWidth,
          height: cropHeight
        });
      } else {
        // Free crop - use full image with small padding
        const padding = 10;
        this.cropper.setCropBoxData({
          left: padding,
          top: padding,
          width: imageData.naturalWidth - (padding * 2),
          height: imageData.naturalHeight - (padding * 2)
        });
      }
    }

    async _handleUpload() {
      if (!this.cropper || !this.currentFile) return;

      if (this.uploadButton) {
        this.uploadButton.disabled = true;
        const originalText = this.uploadButton.innerHTML;
        this.uploadButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Uploading...';
      }

      try {
        // Get crop data
        const cropData = this.cropper.getData(true);

        const cropInfo = {
          x: Math.round(cropData.x),
          y: Math.round(cropData.y),
          width: Math.round(cropData.width),
          height: Math.round(cropData.height)
        };

        // Call the upload callback
        if (this.uploadCallback) {
          await this.uploadCallback(this.currentFile, cropInfo);
        }

        // Success - cancel the crop UI
        this.cancelCrop();

      } catch (error) {
        console.error('Upload error:', error);
        throw error;
      } finally {
        if (this.uploadButton) {
          this.uploadButton.disabled = false;
          this.uploadButton.innerHTML = '<i class="bi bi-upload"></i> Upload';
        }
      }
    }

    cancelCrop() {
      if (this.cropper) {
        this.cropper.destroy();
        this.cropper = null;
      }

      if (this.cropContainer) {
        this.cropContainer.style.display = 'none';
      }

      if (this.fileInput) {
        this.fileInput.value = '';
      }

      this.currentFile = null;

      // Callback when crop is cancelled
      if (this.onCropCancel) {
        this.onCropCancel();
      }
    }

    destroy() {
      this.cancelCrop();

      // Remove event listeners
      if (this.fileInput) {
        this.fileInput.removeEventListener('change', this._handleFileSelect);
      }
    }

    // Public method to show crop UI with a file (useful for re-cropping)
    showCropUI(file) {
      this.currentFile = file;
      this._initCropper(file);
    }

    // Public method to get crop data without uploading
    getCropData() {
      if (!this.cropper) return null;

      const cropData = this.cropper.getData(true);
      return {
        x: Math.round(cropData.x),
        y: Math.round(cropData.y),
        width: Math.round(cropData.width),
        height: Math.round(cropData.height)
      };
    }
  }

  // Export to global scope
  window.ImageCropManager = ImageCropManager;

})(window);
