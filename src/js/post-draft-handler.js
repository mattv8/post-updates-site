/**
 * Shared Save Draft functionality for post editor
 * Used by both home.js and admin.js
 */

// Cookie name for "don't show again" preference
const SAVE_DRAFT_HIDE_CONFIRM_COOKIE = 'hideSaveDraftConfirm';

/**
 * Check if the save draft confirmation should be shown
 * @returns {boolean} True if confirmation should be shown
 */
function shouldShowSaveDraftConfirm() {
  return !document.cookie.split('; ').some(c => c.startsWith(SAVE_DRAFT_HIDE_CONFIRM_COOKIE + '=1'));
}

/**
 * Set cookie to hide save draft confirmation
 */
function hideSaveDraftConfirmForever() {
  // Set cookie for 1 year
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${SAVE_DRAFT_HIDE_CONFIRM_COOKIE}=1; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Creates a Save Draft button handler
 * @param {Object} config - Configuration object
 * @param {HTMLElement} config.modal - The modal element
 * @param {HTMLElement} config.postEditorContainer - Container for post editor fields
 * @param {Function} config.getPostBodyEditor - Function that returns the Quill editor instance
 * @param {Function} config.getEditingId - Function that returns current editing post ID
 * @param {Function} config.setEditingId - Function to set the editing post ID (optional)
 * @param {Function} config.getGalleryMediaIds - Function that returns gallery media IDs array
 * @param {Function} config.refreshPostsList - Function to refresh the posts list after saving
 * @param {Function} config.api - API helper function
 */
function setupSaveDraftHandler(config) {
  const {
    modal,
    postEditorContainer,
    getPostBodyEditor,
    getEditingId,
    setEditingId,
    getGalleryMediaIds,
    refreshPostsList,
    api
  } = config;

  // The actual save draft logic - extracted for reuse
  async function performSaveDraft(saveBtn) {
    const originalText = saveBtn.innerHTML;

    try {
      const editingId = getEditingId();

      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving...';

      // Note: Hero image uploads are now handled by ImageCropManager
      // Images are uploaded immediately after cropping, not on save
      // Get the selected hero media ID from the dropdown
      const uploadedHeroId = postEditorContainer.querySelector('.post-hero-media').value || null;

      // Check if there are pending gallery files to upload
      const galleryUploadInput = postEditorContainer.querySelector('.gallery-upload-input');
      const galleryFiles = Array.from(galleryUploadInput?.files || []);
      const galleryMediaIds = getGalleryMediaIds();

      if (galleryFiles.length > 0) {
        saveBtn.innerHTML = `<i class="bi bi-hourglass-split"></i> Uploading ${galleryFiles.length} gallery image(s)...`;

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

      // Get post date value
      const postDateInput = postEditorContainer.querySelector('.post-published-date');
      const publishedAtValue = postDateInput && postDateInput.value
        ? postDateInput.value.replace('T', ' ') + ':00'
        : null;

      // Get the current Quill editor instance
      const postBodyEditor = getPostBodyEditor ? getPostBodyEditor() : null;

      const payload = {
        title: postEditorContainer.querySelector('.post-title').value,
        body_html: postBodyEditor ? window.getQuillHTML(postBodyEditor) : postEditorContainer.querySelector('.post-body').value,
        hero_media_id: uploadedHeroId,
        hero_image_height: heroImageHeightValue,
        hero_crop_overlay: heroCropOverlayValue,
        hero_title_overlay: heroTitleOverlayValue,
        hero_overlay_opacity: heroOverlayOpacityValue,
        gallery_media_ids: galleryMediaIds,
        published_at: publishedAtValue
      };

      if (editingId) {
        // Existing post: save to draft fields without publishing
        saveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving changes...';

        const draftSave = await api('/api/admin/posts-draft.php?id=' + editingId, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
        });

        if (!draftSave.success) {
          alert('Error saving: ' + (draftSave.error || 'Unknown error'));
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalText;
          return;
        }

        // Purge cache so draft preview updates immediately
        if (typeof window.purgeSiteCache === 'function') {
          window.purgeSiteCache();
        }

        // Show success notification
        if (typeof window.showNotification === 'function') {
          window.showNotification('Changes saved (not published).', 'info');
        }
      } else {
        // New post: create as draft
        saveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Creating draft...';
        payload.status = 'draft';

        const draftSave = await api('/api/admin/posts.php', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
        });

        if (!draftSave.success) {
          alert('Error saving draft: ' + (draftSave.error || 'Unknown error'));
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalText;
          return;
        }

        // Set the editing ID so subsequent saves go to the existing post
        if (setEditingId && draftSave.id) {
          setEditingId(draftSave.id);
        }

        // Show success notification
        if (typeof window.showNotification === 'function') {
          window.showNotification('Draft created.', 'info');
        }
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
      saveBtn.innerHTML = originalText;
    }
  }

  // Store reference to pending save button for confirmation modal
  let pendingSaveBtn = null;

  // Handle confirmation modal confirm button
  document.addEventListener('click', function(e) {
    const confirmBtn = e.target.closest('.btn-confirm-save-draft');
    if (!confirmBtn) return;

    // Check if "don't show again" is checked
    const dontShowCheckbox = document.getElementById('saveDraftDontShowAgain');
    if (dontShowCheckbox && dontShowCheckbox.checked) {
      hideSaveDraftConfirmForever();
    }

    // Hide the confirmation modal
    const confirmModal = document.getElementById('saveDraftConfirmModal');
    if (confirmModal) {
      const bsConfirmModal = bootstrap.Modal.getInstance(confirmModal);
      if (bsConfirmModal) bsConfirmModal.hide();
    }

    // Proceed with save
    if (pendingSaveBtn) {
      performSaveDraft(pendingSaveBtn);
      pendingSaveBtn = null;
    }
  });

  // Reset checkbox when modal is hidden
  const confirmModalEl = document.getElementById('saveDraftConfirmModal');
  if (confirmModalEl) {
    confirmModalEl.addEventListener('hidden.bs.modal', function() {
      const dontShowCheckbox = document.getElementById('saveDraftDontShowAgain');
      if (dontShowCheckbox) dontShowCheckbox.checked = false;
      pendingSaveBtn = null;
    });
  }

  // Use global event delegation for save draft button clicks
  document.addEventListener('click', async function(e) {
    const saveDraftBtn = e.target.closest('.btn-save-draft');
    if (!saveDraftBtn) return; // Not a Save Draft button click

    // Only handle if this is in our modal
    const inOurModal = saveDraftBtn.closest('#postEditorModal');
    if (!inOurModal) return; // Not in our modal

    // Check if we should show confirmation
    if (shouldShowSaveDraftConfirm()) {
      // Show confirmation modal
      const confirmModal = document.getElementById('saveDraftConfirmModal');
      if (confirmModal) {
        pendingSaveBtn = saveDraftBtn;
        const bsConfirmModal = new bootstrap.Modal(confirmModal);
        bsConfirmModal.show();
        return;
      }
    }

    // No confirmation needed, proceed directly
    await performSaveDraft(saveDraftBtn);
  });
}

// Make available globally
window.setupSaveDraftHandler = setupSaveDraftHandler;
