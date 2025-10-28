/**
 * Shared Settings Management Functions
 * Reusable functions for loading and saving settings across admin and home pages
 */
window.SettingsManager = (function() {
  'use strict';

  // Helper function for API calls
  async function api(url, options = {}) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content ||
                      document.getElementById('adminApp')?.dataset.csrf || '';
    const defaultHeaders = {
      'X-CSRF-Token': csrfToken
    };

    options.headers = { ...defaultHeaders, ...options.headers };

    const response = await fetch(url, options);
    return response.json();
  }

  // Load all settings from API
  async function loadSettings() {
    try {
      const data = await api('/api/admin/settings.php');
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error loading settings:', error);
      return null;
    }
  }

  // Load media options for dropdowns
  async function loadMediaOptions(selectElement) {
    try {
      const response = await fetch('/api/admin/media.php');
      const data = await response.json();

      if (data.success && data.data) {
        // Clear existing options except first
        while (selectElement.options.length > 1) {
          selectElement.remove(1);
        }

        data.data.forEach(item => {
          const option = document.createElement('option');
          option.value = item.id;
          option.textContent = item.original_filename + ' (' + item.width + 'x' + item.height + ')';
          selectElement.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading media:', error);
    }
  }

  // Load hero media preview
  async function loadHeroPreview(mediaId, previewContainer) {
    const previewImg = previewContainer.querySelector('img');

    if (mediaId) {
      try {
        const data = await api(`/api/admin/media.php?id=${mediaId}`);
        if (data.success && data.data) {
          const variants = JSON.parse(data.data.variants_json || '{}');
          const previewUrl = variants['400']?.jpg || '/storage/uploads/originals/' + data.data.filename;
          previewImg.src = previewUrl;
          previewImg.alt = data.data.alt_text || '';
          previewContainer.style.display = 'block';
        }
      } catch (error) {
        console.error('Error loading preview:', error);
      }
    } else {
      previewContainer.style.display = 'none';
    }
  }

  // Save settings
  async function saveSettings(payload) {
    try {
      const result = await api('/api/admin/settings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return result;
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error: error.message };
    }
  }

  // Public API
  return {
    loadSettings,
    loadMediaOptions,
    loadHeroPreview,
    saveSettings,
    api
  };
})();
