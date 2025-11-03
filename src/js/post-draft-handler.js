/**
 * Shared Save Draft functionality for post editor
 * Used by both home.js and admin.js
 */

/**
 * Creates a Save Draft button handler
 * @param {Object} config - Configuration object
 * @param {HTMLElement} config.modal - The modal element
 * @param {HTMLElement} config.postEditorContainer - Container for post editor fields
 * @param {Object} config.postBodyEditor - Quill editor instance
 * @param {Function} config.getEditingId - Function that returns current editing post ID
 * @param {Function} config.getGalleryMediaIds - Function that returns gallery media IDs array
 * @param {Function} config.refreshPostsList - Function to refresh the posts list after saving
 * @param {Function} config.api - API helper function
 */
function setupSaveDraftHandler(config) {
  const {
    modal,
    postEditorContainer,
    postBodyEditor,
    getEditingId,
    getGalleryMediaIds,
    refreshPostsList,
    api
  } = config;

  // Use global event delegation since clicks don't bubble to modal container properly
  document.addEventListener('click', async function(e) {
    const saveDraftBtn = e.target.closest('.btn-save-draft');
    if (!saveDraftBtn) return; // Not a Save Draft button click

    // Only handle if this is in our modal
    const inOurModal = saveDraftBtn.closest('#postEditorModal');
    if (!inOurModal) return; // Not in our modal

    const saveBtn = saveDraftBtn;
    const originalText = saveBtn.textContent;

    try {
      const editingId = getEditingId();

      // Save Draft is for NEW posts only - creating a draft without publishing
      if (editingId) {
        // Already has an ID, shouldn't be using Save Draft
        alert('This post already exists. Use "Save and Publish" to update it.');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving draft...';

      // Check if there's a pending hero image file to upload
      const heroUploadInput = postEditorContainer.querySelector('.hero-upload-input');
      const heroFile = heroUploadInput?.files[0];
      let uploadedHeroId = postEditorContainer.querySelector('.post-hero-media').value || null;

      if (heroFile && !uploadedHeroId) {
        saveBtn.textContent = 'Uploading hero image...';

        // Validate file
        if (heroFile.size > 20 * 1024 * 1024) {
          alert('Hero image file size must be less than 20MB');
          saveBtn.disabled = false;
          saveBtn.textContent = originalText;
          return;
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
        if (!validTypes.includes(heroFile.type)) {
          alert('Invalid hero image type. Please use JPG, PNG, WebP, or HEIC');
          saveBtn.disabled = false;
          saveBtn.textContent = originalText;
          return;
        }

        // Upload hero image
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
        const formData = new FormData();
        formData.append('file', heroFile);
        formData.append('alt_text', '');

        const response = await fetch('/api/admin/media.php', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': csrfToken
          },
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          uploadedHeroId = data.id;
        } else {
          alert('Hero image upload failed: ' + (data.error || 'Unknown error'));
          saveBtn.disabled = false;
          saveBtn.textContent = originalText;
          return;
        }
      }

      // Check if there are pending gallery files to upload
      const galleryUploadInput = postEditorContainer.querySelector('.gallery-upload-input');
      const galleryFiles = Array.from(galleryUploadInput?.files || []);
      const galleryMediaIds = getGalleryMediaIds();

      if (galleryFiles.length > 0) {
        saveBtn.textContent = `Uploading ${galleryFiles.length} gallery image(s)...`;

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

        for (const file of galleryFiles) {
          // Validate each file
          if (file.size > 20 * 1024 * 1024) {
            alert(`${file.name} is too large (max 20MB)`);
            continue;
          }

          const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
          if (!validTypes.includes(file.type)) {
            alert(`${file.name} has invalid type`);
            continue;
          }

          const formData = new FormData();
          formData.append('file', file);
          formData.append('alt_text', '');

          const response = await fetch('/api/admin/media.php', {
            method: 'POST',
            headers: {
              'X-CSRF-Token': csrfToken
            },
            body: formData
          });

          const data = await response.json();

          if (data.success) {
            galleryMediaIds.push(data.id);
          } else {
            alert(`Failed to upload ${file.name}: ` + (data.error || 'Unknown error'));
          }
        }

        // Clear gallery input after upload
        if (galleryUploadInput) galleryUploadInput.value = '';
      }

      // Build payload for draft save
      const heroImageHeightValue = uploadedHeroId ? parseInt(postEditorContainer.querySelector('.post-hero-height').value) : null;
      const heroCropOverlayValue = uploadedHeroId ? (postEditorContainer.querySelector('.post-hero-crop-overlay').checked ? 1 : 0) : 0;
      const heroTitleOverlayValue = uploadedHeroId ? (postEditorContainer.querySelector('.post-hero-title-overlay').checked ? 1 : 0) : 1;
      const heroOverlayOpacityValue = uploadedHeroId ? parseFloat(postEditorContainer.querySelector('.post-hero-overlay-opacity').value) : 0.70;

      const payload = {
        title: postEditorContainer.querySelector('.post-title').value,
        body_html: postBodyEditor ? window.getQuillHTML(postBodyEditor) : postEditorContainer.querySelector('.post-body').value,
        status: 'draft', // Always draft when using Save Draft button
        hero_media_id: uploadedHeroId,
        hero_image_height: heroImageHeightValue,
        hero_crop_overlay: heroCropOverlayValue,
        hero_title_overlay: heroTitleOverlayValue,
        hero_overlay_opacity: heroOverlayOpacityValue,
        gallery_media_ids: galleryMediaIds
      };

      // Create new draft post (POST request)
      const draftSave = await api('/api/admin/posts.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });

      if (!draftSave.success) {
        alert('Error saving draft: ' + (draftSave.error || 'Unknown error'));
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
        return;
      }

      // Close modal and refresh list (no publish, no email)
      const bsModal = bootstrap.Modal.getInstance(modal);
      if (bsModal) bsModal.hide();

      if (refreshPostsList) {
        await refreshPostsList();
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('An error occurred while saving the draft');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }
  });
}

// Make available globally
window.setupSaveDraftHandler = setupSaveDraftHandler;
