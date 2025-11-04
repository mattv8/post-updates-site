/**
 * Branding Management
 * Handles logo and favicon uploads with Cropper.js integration
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const CSRF = document.getElementById('adminApp')?.dataset.csrf || '';

    /**
     * Show toast notification
     */
    function showNotification(message, type = 'info') {
      // Create toast container if it doesn't exist
      let toastContainer = document.querySelector('.toast-container');
      if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
      }

      // Map type to Bootstrap alert class
      const typeMap = {
        'success': 'success',
        'warning': 'warning',
        'error': 'danger',
        'danger': 'danger',
        'info': 'info'
      };
      const bgClass = 'bg-' + (typeMap[type] || 'info');
      const textClass = (type === 'warning') ? 'text-dark' : 'text-white';

      // Create toast element
      const toastId = 'toast-' + Date.now();
      const toastHtml = `
        <div id="${toastId}" class="toast ${bgClass} ${textClass}" role="alert" aria-live="assertive" aria-atomic="true">
          <div class="toast-header ${bgClass} ${textClass}">
            <strong class="me-auto">${type === 'success' ? 'Success' : type === 'warning' ? 'Warning' : type === 'error' || type === 'danger' ? 'Error' : 'Info'}</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
          <div class="toast-body">
            ${message.replace(/\n/g, '<br>')}
          </div>
        </div>
      `;

      toastContainer.insertAdjacentHTML('beforeend', toastHtml);

      // Initialize and show the toast
      const toastElement = document.getElementById(toastId);
      const toast = new bootstrap.Toast(toastElement, {
        autohide: type === 'success', // Auto-hide success messages
        delay: 5000
      });
      toast.show();

      // Remove from DOM after hidden
      toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
      });
    }

    // Cropper instances
    let logoCropper = null;
    let faviconCropper = null;

    // File references
    let logoFile = null;
    let faviconFile = null;

    // Elements
    const logoFileInput = document.getElementById('logoFile');
    const faviconFileInput = document.getElementById('faviconFile');
    const logoCropContainer = document.getElementById('logoCropContainer');
    const faviconCropContainer = document.getElementById('faviconCropContainer');
    const logoCropImage = document.getElementById('logoCropImage');
    const faviconCropImage = document.getElementById('faviconCropImage');
    const logoPreview = document.getElementById('logoPreview');
    const faviconPreview = document.getElementById('faviconPreview');
    const logoActions = document.getElementById('logoActions');
    const faviconActions = document.getElementById('faviconActions');

    // Logo display toggle
    const showLogoToggle = document.getElementById('showLogoToggle');
    if (showLogoToggle) {
      showLogoToggle.addEventListener('change', async function() {
        try {
          const response = await fetch('/api/admin/settings.php', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': CSRF
            },
            body: JSON.stringify({
              show_logo: this.checked ? 1 : 0
            })
          });

          const result = await response.json();

          if (result.success) {
            showNotification('Logo display setting updated', 'success');
            // Reload the navbar brand without full page reload
            reloadNavbarBrand();
          } else {
            showNotification(result.message || 'Failed to update logo display setting', 'error');
            // Revert toggle on error
            this.checked = !this.checked;
          }
        } catch (error) {
          console.error('Error updating logo display:', error);
          showNotification('Failed to update logo display setting', 'error');
          // Revert toggle on error
          this.checked = !this.checked;
        }
      });
    }

    // Load current branding when Branding tab is clicked
    const brandingTab = document.getElementById('tab-branding');
    if (brandingTab) {
      brandingTab.addEventListener('click', loadBranding);
    }

    // Also load branding on initial page load to show current logo/favicon
    loadBranding();

    // Logo file selection
    if (logoFileInput) {
      logoFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
          alert('Please select an image file');
          return;
        }

        logoFile = file;
        initLogoCropper(file);
      });
    }

    // Favicon file selection
    if (faviconFileInput) {
      faviconFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
          alert('Please select an image file');
          return;
        }

        faviconFile = file;
        initFaviconCropper(file);
      });
    }

    // Logo buttons
    document.getElementById('logoAutoDetect')?.addEventListener('click', () => autoDetectLogo());
    document.getElementById('logoUploadBtn')?.addEventListener('click', () => uploadLogo());
    document.getElementById('logoCancelBtn')?.addEventListener('click', () => cancelLogoCrop());
    document.getElementById('logoRemoveBtn')?.addEventListener('click', () => showRemoveLogoModal());
    document.getElementById('confirmRemoveLogo')?.addEventListener('click', () => confirmRemoveLogo());

    // Favicon buttons
    document.getElementById('faviconAutoDetect')?.addEventListener('click', () => autoDetectFavicon());
    document.getElementById('faviconUploadBtn')?.addEventListener('click', () => uploadFavicon());
    document.getElementById('faviconCancelBtn')?.addEventListener('click', () => cancelFaviconCrop());
    document.getElementById('faviconRemoveBtn')?.addEventListener('click', () => showRemoveFaviconModal());
    document.getElementById('confirmRemoveFavicon')?.addEventListener('click', () => confirmRemoveFavicon());

    /**
     * Initialize logo cropper
     */
    function initLogoCropper(file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        logoCropImage.src = e.target.result;
        logoCropContainer.style.display = 'block';

        // Destroy existing cropper if any
        if (logoCropper) {
          logoCropper.destroy();
        }

        // Initialize Cropper.js
        logoCropper = new Cropper(logoCropImage, {
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
        });
      };
      reader.readAsDataURL(file);
    }

    /**
     * Initialize favicon cropper (1:1 aspect ratio)
     */
    function initFaviconCropper(file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        faviconCropImage.src = e.target.result;
        faviconCropContainer.style.display = 'block';

        // Destroy existing cropper if any
        if (faviconCropper) {
          faviconCropper.destroy();
        }

        // Initialize Cropper.js with 1:1 aspect ratio
        faviconCropper = new Cropper(faviconCropImage, {
          viewMode: 1,
          dragMode: 'move',
          aspectRatio: 1,
          autoCropArea: 0.9,
          restore: false,
          guides: true,
          center: true,
          highlight: false,
          cropBoxMovable: true,
          cropBoxResizable: true,
          toggleDragModeOnDblclick: false,
        });
      };
      reader.readAsDataURL(file);
    }

    /**
     * Auto-detect content bounds for logo
     */
    function autoDetectLogo() {
      if (!logoCropper) return;

      // Reset to full image first
      logoCropper.reset();

      // Get the canvas and try to detect bounds
      // This is a simplified approach - for better results,
      // we'd analyze the image data to find actual content bounds
      const imageData = logoCropper.getImageData();
      const containerData = logoCropper.getContainerData();

      // Set crop box to image bounds with small padding
      const padding = 10;
      logoCropper.setCropBoxData({
        left: padding,
        top: padding,
        width: imageData.naturalWidth - (padding * 2),
        height: imageData.naturalHeight - (padding * 2)
      });
    }

    /**
     * Auto-detect content bounds for favicon
     */
    function autoDetectFavicon() {
      if (!faviconCropper) return;

      // Reset and find the largest square that fits
      faviconCropper.reset();

      const imageData = faviconCropper.getImageData();
      const size = Math.min(imageData.naturalWidth, imageData.naturalHeight);
      const x = (imageData.naturalWidth - size) / 2;
      const y = (imageData.naturalHeight - size) / 2;

      faviconCropper.setCropBoxData({
        left: x,
        top: y,
        width: size,
        height: size
      });
    }

    /**
     * Upload logo with crop data
     */
    async function uploadLogo() {
      if (!logoCropper || !logoFile) return;

      const uploadBtn = document.getElementById('logoUploadBtn');
      const originalText = uploadBtn.textContent;
      uploadBtn.disabled = true;
      uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Uploading...';

      try {
        // Get crop data
        const cropData = logoCropper.getData(true);

        // Prepare form data
        const formData = new FormData();
        formData.append('file', logoFile);
        formData.append('type', 'logo');
        formData.append('crop', JSON.stringify({
          x: Math.round(cropData.x),
          y: Math.round(cropData.y),
          width: Math.round(cropData.width),
          height: Math.round(cropData.height)
        }));

        const response = await fetch('/api/admin/branding.php', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': CSRF
          },
          body: formData
        });

        const result = await response.json();

        if (result.success) {
          cancelLogoCrop();
          loadBranding();
          showNotification('Logo uploaded successfully', 'success');
          // Reload navbar brand without full page reload
          reloadNavbarBrand();
        } else {
          alert('Error uploading logo: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Logo upload error:', error);
        alert('Error uploading logo: ' + error.message);
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = originalText;
      }
    }

    /**
     * Upload favicon with crop data
     */
    async function uploadFavicon() {
      if (!faviconCropper || !faviconFile) return;

      const uploadBtn = document.getElementById('faviconUploadBtn');
      const originalText = uploadBtn.textContent;
      uploadBtn.disabled = true;
      uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Uploading...';

      try {
        // Get crop data
        const cropData = faviconCropper.getData(true);

        // Prepare form data
        const formData = new FormData();
        formData.append('file', faviconFile);
        formData.append('type', 'favicon');
        formData.append('crop', JSON.stringify({
          x: Math.round(cropData.x),
          y: Math.round(cropData.y),
          width: Math.round(cropData.width),
          height: Math.round(cropData.height)
        }));

        const response = await fetch('/api/admin/branding.php', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': CSRF
          },
          body: formData
        });

        const result = await response.json();

        if (result.success) {
          cancelFaviconCrop();
          loadBranding();
          // Reload to show changes in header (favicon requires full reload)
          setTimeout(() => window.location.reload(), 500);
        } else {
          alert('Error uploading favicon: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Favicon upload error:', error);
        alert('Error uploading favicon: ' + error.message);
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = originalText;
      }
    }

    /**
     * Cancel logo crop
     */
    function cancelLogoCrop() {
      if (logoCropper) {
        logoCropper.destroy();
        logoCropper = null;
      }
      logoCropContainer.style.display = 'none';
      logoFileInput.value = '';
      logoFile = null;
    }

    /**
     * Cancel favicon crop
     */
    function cancelFaviconCrop() {
      if (faviconCropper) {
        faviconCropper.destroy();
        faviconCropper = null;
      }
      faviconCropContainer.style.display = 'none';
      faviconFileInput.value = '';
      faviconFile = null;
    }

    /**
     * Show remove logo confirmation modal
     */
    function showRemoveLogoModal() {
      const modal = new bootstrap.Modal(document.getElementById('removeLogoModal'));
      modal.show();
    }

    /**
     * Confirm and remove logo
     */
    async function confirmRemoveLogo() {
      const modal = bootstrap.Modal.getInstance(document.getElementById('removeLogoModal'));
      if (modal) {
        modal.hide();
      }

      try {
        const response = await fetch('/api/admin/branding.php?type=logo', {
          method: 'DELETE',
          headers: {
            'X-CSRF-Token': CSRF,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'type=logo'
        });

        const result = await response.json();

        if (result.success) {
          loadBranding();
          showNotification('Logo removed successfully', 'success');
          // Reload navbar brand without full page reload
          reloadNavbarBrand();
        } else {
          alert('Error removing logo: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Logo removal error:', error);
        alert('Error removing logo: ' + error.message);
      }
    }

    /**
     * Show remove favicon confirmation modal
     */
    function showRemoveFaviconModal() {
      const modal = new bootstrap.Modal(document.getElementById('removeFaviconModal'));
      modal.show();
    }

    /**
     * Confirm and remove favicon
     */
    async function confirmRemoveFavicon() {
      const modal = bootstrap.Modal.getInstance(document.getElementById('removeFaviconModal'));
      if (modal) {
        modal.hide();
      }

      try {
        const response = await fetch('/api/admin/branding.php?type=favicon', {
          method: 'DELETE',
          headers: {
            'X-CSRF-Token': CSRF,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'type=favicon'
        });

        const result = await response.json();

        if (result.success) {
          loadBranding();
          // Reload to show changes in header
          setTimeout(() => window.location.reload(), 500);
        } else {
          alert('Error removing favicon: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Favicon removal error:', error);
        alert('Error removing favicon: ' + error.message);
      }
    }

    /**
     * Reload navbar brand without full page refresh
     */
    async function reloadNavbarBrand() {
      try {
        // Fetch the current page to get updated navbar HTML
        const response = await fetch(window.location.href, {
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Find all navbar-brand elements and update them
        const currentBrands = document.querySelectorAll('.navbar-brand');
        const newBrands = doc.querySelectorAll('.navbar-brand');

        currentBrands.forEach((currentBrand, index) => {
          if (newBrands[index]) {
            // Use jQuery for smooth fade effect
            $(currentBrand).fadeOut(200, function() {
              currentBrand.innerHTML = newBrands[index].innerHTML;
              $(currentBrand).fadeIn(200);
            });
          }
        });
      } catch (error) {
        console.error('Error reloading navbar brand:', error);
        // Fallback to full page reload on error
        setTimeout(() => window.location.reload(), 500);
      }
    }

    /**
     * Load current branding settings
     */
    async function loadBranding() {
      try {
        const response = await fetch('/api/admin/branding.php', {
          headers: {
            'X-CSRF-Token': CSRF
          }
        });

        const result = await response.json();

        if (result.success && result.data) {
          // Update logo preview
          if (result.data.logo) {
            const variants = JSON.parse(result.data.logo.variants_json || '{}');
            const logo200 = variants.find(v => v.width === 200 && v.format === 'png');

            if (logo200) {
              const logoUrl = '/' + logo200.path;
              logoPreview.innerHTML = `<img src="${logoUrl}" alt="Site Logo" class="img-fluid" style="max-height: 150px;" />`;
              logoActions.style.display = 'block';
            } else {
              logoPreview.innerHTML = '<div class="text-muted">No logo uploaded</div>';
              logoActions.style.display = 'none';
            }
          } else {
            logoPreview.innerHTML = '<div class="text-muted">No logo uploaded</div>';
            logoActions.style.display = 'none';
          }

          // Update favicon preview
          if (result.data.favicon) {
            const variants = JSON.parse(result.data.favicon.variants_json || '{}');
            const favicon48 = variants.find(v => v.size === 48 && v.format === 'png');

            if (favicon48) {
              const faviconUrl = '/' + favicon48.path;
              faviconPreview.innerHTML = `<img src="${faviconUrl}" alt="Site Favicon" class="img-fluid" style="width: 48px; height: 48px;" />`;
              faviconActions.style.display = 'block';
            } else {
              faviconPreview.innerHTML = '<div class="text-muted">No favicon uploaded</div>';
              faviconActions.style.display = 'none';
            }
          } else {
            faviconPreview.innerHTML = '<div class="text-muted">No favicon uploaded</div>';
            faviconActions.style.display = 'none';
          }
        }
      } catch (error) {
        console.error('Error loading branding:', error);
      }
    }
  }
})();
