/**
 * Admin Crop Initialization
 * Initializes ImageCropManager instances for hero and footer images in admin
 */
(function() {
  'use strict';

  // Wait for DOM and ImageCropManager to be ready
  function init() {
    if (typeof window.ImageCropManager === 'undefined') {
      console.error('ImageCropManager not loaded');
      return;
    }

    const CSRF = document.getElementById('adminApp')?.dataset.csrf || '';

    // Initialize main hero banner crop manager
    initMainHeroCrop(CSRF);

    // Initialize footer background crop manager
    initFooterCrop(CSRF);

    // Post editor crop manager is initialized separately when editor is opened
  }

  /**
   * Initialize main hero banner crop manager
   */
  function initMainHeroCrop(CSRF) {
    const heroUploadInput = document.getElementById('hero_upload_input');
    const cropContainer = document.getElementById('hero_crop_container');
    const cropImage = document.getElementById('hero_crop_image');
    const uploadButton = document.getElementById('hero_crop_upload');
    const cancelButton = document.getElementById('hero_crop_cancel');
    const autoDetectButton = document.getElementById('hero_auto_detect');
    const rotateLeftButton = document.getElementById('hero_rotate_left');
    const rotateRightButton = document.getElementById('hero_rotate_right');
    const heroSelect = document.getElementById('hero_media_id');

    if (!heroUploadInput || !cropContainer || !cropImage) {
      return; // Elements not found, probably not on this page
    }

    const heroCropManager = new window.ImageCropManager({
      fileInput: heroUploadInput,
      cropContainer: cropContainer,
      cropImage: cropImage,
      uploadButton: uploadButton,
      cancelButton: cancelButton,
      autoDetectButton: autoDetectButton,
      rotateLeftButton: rotateLeftButton,
      rotateRightButton: rotateRightButton,
      uploadCallback: async (file, cropData) => {
        // Upload the image with crop data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('alt_text', 'Hero Banner');
        if (cropData) {
          formData.append('crop', JSON.stringify(cropData));
        }

        const response = await fetch('/api/admin/media.php', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': CSRF
          },
          body: formData
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Upload failed');
        }

  // Add to select dropdown
        const option = document.createElement('option');
        option.value = data.id;
        option.textContent = file.name;
        option.selected = true;
        heroSelect.appendChild(option);
  // Trigger change so page logic can update preview and auto-save
  heroSelect.dispatchEvent(new Event('change'));

        // Trigger change event to show preview
        heroSelect.dispatchEvent(new Event('change'));

        return data;
      }
    });

    // Add change handler for hero select dropdown to show preview
    const heroPreview = document.querySelector('.hero-banner-preview');
    const heroPreviewContainer = document.querySelector('.hero-banner-preview-container');
    const heroPreviewImg = heroPreview?.querySelector('img');
    const heroUploadControls = document.querySelector('.hero-banner-upload-controls');
    const heroRemoveBtn = document.querySelector('.btn-remove-hero-banner');

    if (heroSelect && heroPreview && heroPreviewImg && !heroSelect.dataset.changeHandlerAdded) {
      heroSelect.addEventListener('change', function() {
        if (this.value) {
          // Load media info to show preview
          fetch(`/api/admin/media.php?id=${this.value}`)
            .then(r => r.json())
            .then(data => {
              if (data.success && data.data) {
                const variants = JSON.parse(data.data.variants_json || '[]');
                const variant800 = variants.find(v => v.width === 800);
                let previewUrl;
                if (variant800 && variant800.path) {
                  // Extract web-accessible path from full filesystem path
                  const pathMatch = variant800.path.match(/\/storage\/uploads\/.+$/);
                  previewUrl = pathMatch ? pathMatch[0] : variant800.path;
                } else {
                  previewUrl = '/storage/uploads/originals/' + data.data.filename;
                }
                heroPreviewImg.src = previewUrl;
                heroPreviewImg.alt = data.data.alt_text || '';
                if (heroPreviewContainer) heroPreviewContainer.style.display = 'block';

                // Hide upload controls and show remove button
                if (heroUploadControls) heroUploadControls.style.display = 'none';
                if (heroRemoveBtn) heroRemoveBtn.style.opacity = '1';
              }
            })
            .catch(err => console.error('Error loading hero preview:', err));
        } else {
          if (heroPreviewContainer) heroPreviewContainer.style.display = 'none';
          // Show upload controls and hide remove button
          if (heroUploadControls) heroUploadControls.style.display = 'block';
          if (heroRemoveBtn) heroRemoveBtn.style.opacity = '0';
        }
      });
      heroSelect.dataset.changeHandlerAdded = 'true';
    }

    // Setup remove button handler
    if (heroRemoveBtn && !heroRemoveBtn.dataset.listenerAdded) {
      heroRemoveBtn.addEventListener('click', function() {
        if (heroSelect) heroSelect.value = '';
        if (heroPreviewContainer) heroPreviewContainer.style.display = 'none';
        if (heroPreviewImg) heroPreviewImg.src = '';

        // Show upload controls and hide remove button
        if (heroUploadControls) heroUploadControls.style.display = 'block';
        this.style.opacity = '0';
        // Trigger change so page logic can auto-save cleared hero
        heroSelect?.dispatchEvent(new Event('change'));
      });
      heroRemoveBtn.dataset.listenerAdded = 'true';
    }
  }

  /**
   * Initialize footer background crop manager
   */
  function initFooterCrop(CSRF) {
    const footerUploadInput = document.getElementById('footer_upload_input');
    const cropContainer = document.getElementById('footer_crop_container');
    const cropImage = document.getElementById('footer_crop_image');
    const uploadButton = document.getElementById('footer_crop_upload');
    const cancelButton = document.getElementById('footer_crop_cancel');
    const autoDetectButton = document.getElementById('footer_auto_detect');
    const rotateLeftButton = document.getElementById('footer_rotate_left');
    const rotateRightButton = document.getElementById('footer_rotate_right');
    const footerSelect = document.getElementById('footer_media_id');

    if (!footerUploadInput || !cropContainer || !cropImage) {
      return; // Elements not found, probably not on this page
    }

    const footerCropManager = new window.ImageCropManager({
      fileInput: footerUploadInput,
      cropContainer: cropContainer,
      cropImage: cropImage,
      uploadButton: uploadButton,
      cancelButton: cancelButton,
      autoDetectButton: autoDetectButton,
      rotateLeftButton: rotateLeftButton,
      rotateRightButton: rotateRightButton,
      uploadCallback: async (file, cropData) => {
        // Upload the image with crop data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('alt_text', 'Footer Background');
        if (cropData) {
          formData.append('crop', JSON.stringify(cropData));
        }

        const response = await fetch('/api/admin/media.php', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': CSRF
          },
          body: formData
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Upload failed');
        }

        // Add to select dropdown
        const option = document.createElement('option');
        option.value = data.id;
        option.textContent = file.name;
        option.selected = true;
        footerSelect.appendChild(option);

        // Trigger change event to show preview
        footerSelect.dispatchEvent(new Event('change'));

        return data;
      }
    });

    // Add change handler for footer select dropdown to show preview
    const footerPreview = document.querySelector('.footer-bg-preview');
    const footerPreviewContainer = document.querySelector('.footer-bg-preview-container');
    const footerPreviewImg = footerPreview?.querySelector('img');
    const footerUploadControls = document.querySelector('.footer-upload-controls');
    const footerRemoveBtn = document.querySelector('.btn-remove-footer-bg');

    if (footerSelect && footerPreview && footerPreviewImg && !footerSelect.dataset.changeHandlerAdded) {
      footerSelect.addEventListener('change', function() {
        if (this.value) {
          // Load media info to show preview
          fetch(`/api/admin/media.php?id=${this.value}`)
            .then(r => r.json())
            .then(data => {
              if (data.success && data.data) {
                const variants = JSON.parse(data.data.variants_json || '[]');
                const variant800 = variants.find(v => v.width === 800);
                let previewUrl;
                if (variant800 && variant800.path) {
                  // Extract web-accessible path from full filesystem path
                  const pathMatch = variant800.path.match(/\/storage\/uploads\/.+$/);
                  previewUrl = pathMatch ? pathMatch[0] : variant800.path;
                } else {
                  previewUrl = '/storage/uploads/originals/' + data.data.filename;
                }
                footerPreviewImg.src = previewUrl;
                footerPreviewImg.alt = data.data.alt_text || '';
                if (footerPreviewContainer) footerPreviewContainer.style.display = 'block';

                // Hide upload controls and show remove button
                if (footerUploadControls) footerUploadControls.style.display = 'none';
                if (footerRemoveBtn) footerRemoveBtn.style.opacity = '1';
              }
            })
            .catch(err => console.error('Error loading footer preview:', err));
        } else {
          if (footerPreviewContainer) footerPreviewContainer.style.display = 'none';
          // Show upload controls and hide remove button
          if (footerUploadControls) footerUploadControls.style.display = 'block';
          if (footerRemoveBtn) footerRemoveBtn.style.opacity = '0';
        }
      });
      footerSelect.dataset.changeHandlerAdded = 'true';
    }

    // Setup remove button handler
    if (footerRemoveBtn && !footerRemoveBtn.dataset.listenerAdded) {
      footerRemoveBtn.addEventListener('click', function() {
        if (footerSelect) footerSelect.value = '';
        if (footerPreviewContainer) footerPreviewContainer.style.display = 'none';
        if (footerPreviewImg) footerPreviewImg.src = '';

        // Show upload controls and hide remove button
        if (footerUploadControls) footerUploadControls.style.display = 'block';
        this.style.opacity = '0';
      });
      footerRemoveBtn.dataset.listenerAdded = 'true';
    }
  }

  /**
   * Initialize modal hero crop manager
   * Called when edit hero modal is shown
   */
  window.initModalHeroCrop = function(CSRF) {
    const heroUploadInput = document.getElementById('modal_hero_upload_input');
    const cropContainer = document.getElementById('modal_hero_crop_container');
    const cropImage = document.getElementById('modal_hero_crop_image');
    const uploadButton = document.getElementById('modal_hero_crop_upload');
    const cancelButton = document.getElementById('modal_hero_crop_cancel');
    const autoDetectButton = document.getElementById('modal_hero_auto_detect');
    const rotateLeftButton = document.getElementById('modal_hero_rotate_left');
    const rotateRightButton = document.getElementById('modal_hero_rotate_right');
    const heroSelect = document.getElementById('modal_hero_media_id');

    console.log('initModalHeroCrop - Elements found:', {
      heroUploadInput: !!heroUploadInput,
      cropContainer: !!cropContainer,
      cropImage: !!cropImage,
      uploadButton: !!uploadButton,
      cancelButton: !!cancelButton,
      autoDetectButton: !!autoDetectButton,
      heroSelect: !!heroSelect
    });

    if (!heroUploadInput || !cropContainer || !cropImage) {
      console.warn('Modal hero crop elements not found - required elements missing');
      return null;
    }

    console.log('Creating ImageCropManager for modal hero...');

    const heroCropManager = new window.ImageCropManager({
      fileInput: heroUploadInput,
      cropContainer: cropContainer,
      cropImage: cropImage,
      uploadButton: uploadButton,
      cancelButton: cancelButton,
      autoDetectButton: autoDetectButton,
      rotateLeftButton: rotateLeftButton,
      rotateRightButton: rotateRightButton,
      uploadCallback: async (file, cropData) => {
        // Upload the image with crop data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('alt_text', 'Hero Banner');
        if (cropData) {
          formData.append('crop', JSON.stringify(cropData));
        }

        const response = await fetch('/api/admin/media.php', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': CSRF
          },
          body: formData
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Upload failed');
        }

        // Add to select dropdown
        const option = document.createElement('option');
        option.value = data.id;
        option.textContent = file.name;
        option.selected = true;
        heroSelect.appendChild(option);

        // Trigger change event to show preview
        heroSelect.dispatchEvent(new Event('change'));

        return data;
      }
    });

    console.log('ImageCropManager created successfully for modal hero');

    // Add change handler for hero select dropdown to show preview
    const heroPreview = document.querySelector('.hero-banner-preview');
    const heroPreviewContainer = document.querySelector('.hero-banner-preview-container');
    const heroPreviewImg = heroPreview?.querySelector('img');
    const heroUploadControls = document.querySelector('.hero-banner-upload-controls');
    const heroRemoveBtn = document.querySelector('.btn-remove-hero-banner');

    if (heroSelect && heroPreview && heroPreviewImg && !heroSelect.dataset.modalChangeHandlerAdded) {
      heroSelect.addEventListener('change', function() {
        if (this.value) {
          // Load media info to show preview
          fetch(`/api/admin/media.php?id=${this.value}`)
            .then(r => r.json())
            .then(data => {
              if (data.success && data.data) {
                const variants = JSON.parse(data.data.variants_json || '[]');
                const variant800 = variants.find(v => v.width === 800);
                let previewUrl;
                if (variant800 && variant800.path) {
                  // Extract web-accessible path from full filesystem path
                  const pathMatch = variant800.path.match(/\/storage\/uploads\/.+$/);
                  previewUrl = pathMatch ? pathMatch[0] : variant800.path;
                } else {
                  previewUrl = '/storage/uploads/originals/' + data.data.filename;
                }
                heroPreviewImg.src = previewUrl;
                heroPreviewImg.alt = data.data.alt_text || '';
                if (heroPreviewContainer) heroPreviewContainer.style.display = 'block';

                // Hide upload controls and show remove button
                if (heroUploadControls) heroUploadControls.style.display = 'none';
                if (heroRemoveBtn) heroRemoveBtn.style.opacity = '1';

                // Update preview if function exists (from edit-sections.js)
                if (typeof window.updateHeroBannerPreview === 'function') {
                  setTimeout(() => window.updateHeroBannerPreview(), 100);
                }
              }
            })
            .catch(err => console.error('Error loading modal hero preview:', err));
        } else {
          if (heroPreviewContainer) heroPreviewContainer.style.display = 'none';
          // Show upload controls and hide remove button
          if (heroUploadControls) heroUploadControls.style.display = 'block';
          if (heroRemoveBtn) heroRemoveBtn.style.opacity = '0';
        }
      });
      heroSelect.dataset.modalChangeHandlerAdded = 'true';
    }

    // Setup remove button handler
    if (heroRemoveBtn && !heroRemoveBtn.dataset.modalListenerAdded) {
      heroRemoveBtn.addEventListener('click', function() {
        if (heroSelect) heroSelect.value = '';
        if (heroPreviewContainer) heroPreviewContainer.style.display = 'none';
        if (heroPreviewImg) heroPreviewImg.src = '';

        // Show upload controls and hide remove button
        if (heroUploadControls) heroUploadControls.style.display = 'block';
        this.style.opacity = '0';
      });
      heroRemoveBtn.dataset.modalListenerAdded = 'true';
    }

    return heroCropManager;
  };

  /**
   * Initialize post editor crop manager
   * Called when post editor is shown
   */
  window.initPostEditorCrop = function(postEditorContainer, CSRF) {
    const heroUploadInput = postEditorContainer.querySelector('.hero-upload-input');
    const cropContainer = postEditorContainer.querySelector('.hero-crop-container');
    const cropImage = postEditorContainer.querySelector('.hero-crop-image');
    const uploadButton = postEditorContainer.querySelector('.btn-hero-crop-upload');
    const cancelButton = postEditorContainer.querySelector('.btn-hero-crop-cancel');
    const autoDetectButton = postEditorContainer.querySelector('.btn-hero-auto-detect');
    const rotateLeftButton = postEditorContainer.querySelector('.btn-hero-rotate-left');
    const rotateRightButton = postEditorContainer.querySelector('.btn-hero-rotate-right');
    const heroSelect = postEditorContainer.querySelector('.post-hero-media');
    const heroPreviewContainer = postEditorContainer.querySelector('.hero-preview-container');
    const heroPreviewImg = postEditorContainer.querySelector('.hero-preview img');
    const heroHeightSlider = postEditorContainer.querySelector('.post-hero-height');
    const heroUploadControls = postEditorContainer.querySelector('.hero-upload-controls');
    const heroRemoveBtn = postEditorContainer.querySelector('.btn-remove-hero');

    if (!heroUploadInput || !cropContainer || !cropImage) {
      console.warn('Post editor crop elements not found');
      return null;
    }

    const heroCropManager = new window.ImageCropManager({
      fileInput: heroUploadInput,
      cropContainer: cropContainer,
      cropImage: cropImage,
      uploadButton: uploadButton,
      cancelButton: cancelButton,
      autoDetectButton: autoDetectButton,
      rotateLeftButton: rotateLeftButton,
      rotateRightButton: rotateRightButton,
      // Hide upload/select controls as soon as a file is chosen and crop UI opens
      onCropInit: () => {
        if (heroUploadControls) heroUploadControls.style.display = 'none';
        // While cropping, hide remove since an uploaded/selected media isn't finalized yet
        if (heroRemoveBtn) heroRemoveBtn.style.opacity = '0';
      },
      // If the user cancels cropping and no media is selected, restore controls
      onCropCancel: () => {
        if (!heroSelect?.value) {
          if (heroUploadControls) heroUploadControls.style.display = 'block';
          if (heroRemoveBtn) heroRemoveBtn.style.opacity = '0';
        }
      },
      uploadCallback: async (file, cropData) => {
        // Upload the image with crop data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('alt_text', '');
        if (cropData) {
          formData.append('crop', JSON.stringify(cropData));
        }

        const response = await fetch('/api/admin/media.php', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': CSRF
          },
          body: formData
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Upload failed');
        }

        // Add to select dropdown
        const option = document.createElement('option');
        option.value = data.id;
        option.textContent = file.name;
        option.selected = true;
        heroSelect.appendChild(option);

        // Show preview - variants is an array, find the 400w jpg variant
        const variants = JSON.parse(data.data?.variants_json || '[]');
        const variant400 = variants.find(v => v.width === 400 && v.format === 'jpg');
        let previewUrl;
        if (variant400?.path) {
          // Extract web-accessible path from full filesystem path
          const pathMatch = variant400.path.match(/\/storage\/uploads\/.+$/);
          previewUrl = pathMatch ? pathMatch[0] : variant400.path;
        } else {
          previewUrl = '/storage/uploads/originals/' + data.data?.filename;
        }

        heroPreviewImg.src = previewUrl;
        heroPreviewContainer.style.display = 'block';

        // Hide upload controls and show remove button
        if (heroUploadControls) heroUploadControls.style.display = 'none';
        if (heroRemoveBtn) heroRemoveBtn.style.opacity = '1';

        // Set initial preview height
        const currentHeight = parseInt(heroHeightSlider?.value || 100);
        const heroPreviewDiv = postEditorContainer.querySelector('.hero-preview');
        if (heroPreviewDiv) {
          heroPreviewDiv.style.paddingBottom = currentHeight + '%';
        }

        // Update preview if function exists
        if (typeof window.updatePostHeroPreview === 'function') {
          window.updatePostHeroPreview(postEditorContainer);
        }

        return data;
      }
    });

    // Add change handler for hero select dropdown to hide/show upload controls
    if (heroSelect && !heroSelect.dataset.postEditorChangeHandlerAdded) {
      heroSelect.addEventListener('change', function() {
        if (this.value) {
          // Media selected - hide upload controls and show remove button
          if (heroUploadControls) heroUploadControls.style.display = 'none';
          if (heroRemoveBtn) heroRemoveBtn.style.opacity = '1';
        } else {
          // No media selected - show upload controls and hide remove button
          if (heroUploadControls) heroUploadControls.style.display = 'block';
          if (heroRemoveBtn) heroRemoveBtn.style.opacity = '0';
        }
      });
      heroSelect.dataset.postEditorChangeHandlerAdded = 'true';
    }

    // Setup remove button handler
    if (heroRemoveBtn && !heroRemoveBtn.dataset.postEditorListenerAdded) {
      heroRemoveBtn.addEventListener('click', function() {
        if (heroSelect) heroSelect.value = '';
        if (heroPreviewContainer) heroPreviewContainer.style.display = 'none';
        if (heroPreviewImg) heroPreviewImg.src = '';

        // Show upload controls and hide remove button
        if (heroUploadControls) heroUploadControls.style.display = 'block';
        this.style.opacity = '0';
      });
      heroRemoveBtn.dataset.postEditorListenerAdded = 'true';
    }

    return heroCropManager;
  };

  /**
   * Initialize modal footer background crop manager
   * Called when edit footer modal is shown
   */
  window.initModalFooterCrop = function(CSRF) {
    const footerUploadInput = document.getElementById('modal_footer_upload_input');
    const cropContainer = document.getElementById('modal_footer_crop_container');
    const cropImage = document.getElementById('modal_footer_crop_image');
    const uploadButton = document.getElementById('modal_footer_crop_upload');
    const cancelButton = document.getElementById('modal_footer_crop_cancel');
    const autoDetectButton = document.getElementById('modal_footer_auto_detect');
    const rotateLeftButton = document.getElementById('modal_footer_rotate_left');
    const rotateRightButton = document.getElementById('modal_footer_rotate_right');
    const footerSelect = document.getElementById('modal_footer_media_id');

    // Preview/controls within the modal
    const footerUploadControls = document.querySelector('.footer-upload-controls');
    const footerRemoveBtn = document.querySelector('.btn-remove-footer-bg');

    if (!footerUploadInput || !cropContainer || !cropImage) {
      console.warn('Modal footer crop elements not found');
      return null;
    }

    const footerCropManager = new window.ImageCropManager({
      fileInput: footerUploadInput,
      cropContainer: cropContainer,
      cropImage: cropImage,
      uploadButton: uploadButton,
      cancelButton: cancelButton,
      autoDetectButton: autoDetectButton,
      rotateLeftButton: rotateLeftButton,
      rotateRightButton: rotateRightButton,
      uploadCallback: async (file, cropData) => {
        // Upload the image with crop data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('alt_text', 'Footer Background');
        if (cropData) {
          formData.append('crop', JSON.stringify(cropData));
        }

        const response = await fetch('/api/admin/media.php', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': CSRF
          },
          body: formData
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Upload failed');
        }

        // Add to select dropdown and trigger change
        if (footerSelect) {
          const option = document.createElement('option');
          option.value = data.id;
          option.textContent = file.name;
          option.selected = true;
          footerSelect.appendChild(option);
          footerSelect.dispatchEvent(new Event('change'));
        }

        // Hide upload controls and show remove button
        if (footerUploadControls) footerUploadControls.style.display = 'none';
        if (footerRemoveBtn) footerRemoveBtn.style.opacity = '1';

        return data;
      }
    });

    // Change handler (ensure UI toggles even if BackgroundPreviewManager handles preview)
    if (footerSelect && !footerSelect.dataset.modalFooterChange) {
      footerSelect.addEventListener('change', function() {
        if (this.value) {
          if (footerUploadControls) footerUploadControls.style.display = 'none';
          if (footerRemoveBtn) footerRemoveBtn.style.opacity = '1';
        } else {
          if (footerUploadControls) footerUploadControls.style.display = 'block';
          if (footerRemoveBtn) footerRemoveBtn.style.opacity = '0';
        }
      });
      footerSelect.dataset.modalFooterChange = 'true';
    }

    // Remove button handler
    if (footerRemoveBtn && !footerRemoveBtn.dataset.modalFooterListener) {
      footerRemoveBtn.addEventListener('click', function() {
        if (footerSelect) footerSelect.value = '';
        // Let BackgroundPreviewManager hide the preview via its change handler
        footerSelect?.dispatchEvent(new Event('change'));
        if (footerUploadControls) footerUploadControls.style.display = 'block';
        this.style.opacity = '0';
      });
      footerRemoveBtn.dataset.modalFooterListener = 'true';
    }

    return footerCropManager;
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
