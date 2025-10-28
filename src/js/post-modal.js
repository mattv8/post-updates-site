/**
 * Post Modal Handler
 * Handles post creation from the modal on public pages when authenticated
 */
(function() {
  'use strict';

  const modal = document.getElementById('createPostModal');
  if (!modal) return;

  let editor = null;
  let galleryMediaIds = []; // Track gallery image IDs in order

  // Initialize Quill editor when modal is shown
  modal.addEventListener('shown.bs.modal', function() {
    const editorContainer = modal.querySelector('.post-body');
    if (editorContainer && !editor) {
      // Initialize Quill editor
      editor = window.initQuillEditor(editorContainer, {
        placeholder: 'Write your post content here...',
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'link'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'align': [] }],
          ['blockquote', 'image'],
          ['clean']
        ]
      });

      // Initialize AI title generator with editor instance
      if (typeof window.initAITitleGenerator === 'function') {
        window.initAITitleGenerator(modal, editor);
      }
    }
  });

  // Clean up editor when modal is hidden
  modal.addEventListener('hidden.bs.modal', function() {
    if (editor) {
      // Clear editor content
      window.clearQuillEditor(editor);
      // Don't destroy - reuse the instance
    }
    // Reset form
    modal.querySelector('.post-title').value = '';
    modal.querySelector('.post-status').value = 'published';
    modal.querySelector('.post-hero-media').value = '';
    modal.querySelector('.hero-upload-input').value = '';
    modal.querySelector('.gallery-upload-input').value = '';
    modal.querySelector('.hero-preview-container').style.display = 'none';
    modal.querySelector('.hero-preview img').src = '';
    modal.querySelector('.post-hero-height').value = 100;
    modal.querySelector('.hero-height-value').textContent = '100';
    const galleryPreview = modal.querySelector('#galleryPreview');
    galleryPreview.innerHTML = '';
    galleryPreview.classList.add('empty');
    galleryMediaIds = [];
  });

  // Hero image upload handlers
  const heroUploadInput = modal.querySelector('.hero-upload-input');
  const heroUploadBtn = modal.querySelector('.btn-upload-hero');
  const heroPreviewContainer = modal.querySelector('.hero-preview-container');
  const heroPreview = modal.querySelector('.hero-preview');
  const heroPreviewImg = heroPreview.querySelector('img');
  const heroSelect = modal.querySelector('.post-hero-media');
  const heroHeightControl = modal.querySelector('.hero-height-control');
  const heroHeightSlider = modal.querySelector('.post-hero-height');
  const heroHeightValue = modal.querySelector('.hero-height-value');

  // Enable upload button when file selected
  heroUploadInput?.addEventListener('change', function() {
    heroUploadBtn.disabled = !this.files.length;
  });

  // Handle hero image upload
  heroUploadBtn?.addEventListener('click', async function() {
    const file = heroUploadInput.files[0];
    if (!file) return;

    // Validate file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      alert('File size must be less than 20MB');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please use JPG, PNG, WebP, or HEIC');
      return;
    }

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('alt_text', '');

    try {
      heroUploadBtn.disabled = true;
      heroUploadBtn.textContent = 'Uploading...';

      const response = await fetch('/api/admin/media.php', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // Add to select dropdown
        const option = document.createElement('option');
        option.value = data.id;
        option.textContent = file.name;
        option.selected = true;
        heroSelect.appendChild(option);

        // Show preview
        const variants = JSON.parse(data.data?.variants_json || '{}');
        const previewUrl = variants['400']?.jpg || '/storage/uploads/originals/' + data.data?.filename;
        heroPreviewImg.src = previewUrl;
        heroPreviewContainer.style.display = 'block';

        // Set initial preview height based on slider value
        const heroPreviewDiv = modal.querySelector('.hero-preview');
        const currentHeight = parseInt(heroHeightSlider?.value || 100);
        if (heroPreviewDiv) {
          heroPreviewDiv.style.paddingBottom = currentHeight + '%';
        }

        // Clear file input
        heroUploadInput.value = '';
      } else {
        alert('Upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error uploading hero image:', error);
      alert('An error occurred during upload');
    } finally {
      heroUploadBtn.disabled = false;
      heroUploadBtn.textContent = 'Upload New';
    }
  });

  // Handle hero selection from dropdown
  heroSelect?.addEventListener('change', function() {
    if (this.value) {
      // Load media info to show preview
      fetch(`/api/admin/media.php?id=${this.value}`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.data) {
            const variants = JSON.parse(data.data.variants_json || '{}');
            const previewUrl = variants['400']?.jpg || '/storage/uploads/originals/' + data.data.filename;
            heroPreviewImg.src = previewUrl;
            heroPreviewImg.alt = data.data.alt_text || '';
            heroPreviewContainer.style.display = 'block';

            // Set initial preview height based on slider value
            const heroPreviewDiv = modal.querySelector('.hero-preview');
            const currentHeight = parseInt(heroHeightSlider?.value || 100);
            if (heroPreviewDiv) {
              heroPreviewDiv.style.paddingBottom = currentHeight + '%';
            }
          }
        });
    } else {
      heroPreviewContainer.style.display = 'none';
    }
  });

  // Handle hero height slider
  heroHeightSlider?.addEventListener('input', function() {
    const heightPercent = parseInt(this.value);
    heroHeightValue.textContent = heightPercent;

    // Update preview padding-bottom to match actual display
    const heroPreviewDiv = modal.querySelector('.hero-preview');
    if (heroPreviewDiv) {
      heroPreviewDiv.style.paddingBottom = heightPercent + '%';
    }
  });

  // Handle hero remove - add hover handlers for trash icon
  const removeBtn = modal.querySelector('.btn-remove-hero');
  const heroPreviewWrapper = modal.querySelector('.hero-preview-wrapper');

  if (heroPreviewWrapper && removeBtn) {
    heroPreviewWrapper.addEventListener('mouseenter', function() {
      removeBtn.style.opacity = '1';
    });

    heroPreviewWrapper.addEventListener('mouseleave', function() {
      removeBtn.style.opacity = '0';
    });
  }

  removeBtn?.addEventListener('click', function() {
    heroSelect.value = '';
    heroPreviewContainer.style.display = 'none';
    heroPreviewImg.src = '';
    heroHeightSlider.value = 100;
    heroHeightValue.textContent = '100';
    const heroPreviewDiv = modal.querySelector('.hero-preview');
    if (heroPreviewDiv) {
      heroPreviewDiv.style.paddingBottom = '100%'; // Reset to 100%
    }
  });

  // Gallery upload handlers
  const galleryUploadInput = modal.querySelector('.gallery-upload-input');
  const galleryUploadBtn = modal.querySelector('.btn-upload-gallery');
  const galleryPreview = modal.querySelector('#galleryPreview');

  // Enable upload button when files selected
  galleryUploadInput?.addEventListener('change', function() {
    galleryUploadBtn.disabled = !this.files.length;
  });

  // Handle gallery upload
  galleryUploadBtn?.addEventListener('click', async function() {
    const files = Array.from(galleryUploadInput.files);
    if (!files.length) return;

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

    try {
      galleryUploadBtn.disabled = true;
      galleryUploadBtn.textContent = `Uploading ${files.length} file(s)...`;

      for (const file of files) {
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
          // Add to gallery
          addGalleryItem(data.id, data.data);
        } else {
          alert(`Failed to upload ${file.name}: ` + (data.error || 'Unknown error'));
        }
      }

      // Clear file input
      galleryUploadInput.value = '';
    } catch (error) {
      console.error('Error uploading gallery images:', error);
      alert('An error occurred during upload');
    } finally {
      galleryUploadBtn.disabled = false;
      galleryUploadBtn.textContent = 'Add to Gallery';
    }
  });

  // Add gallery item to preview
  function addGalleryItem(mediaId, mediaData) {
    galleryMediaIds.push(mediaId);
    galleryPreview.classList.remove('empty');

    const variants = JSON.parse(mediaData?.variants_json || '{}');
    const thumbUrl = variants['400']?.jpg || '/storage/uploads/originals/' + mediaData?.filename;

    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.draggable = true;
    item.dataset.mediaId = mediaId;
    item.innerHTML = `
      <img src="${thumbUrl}" alt="${mediaData?.alt_text || ''}" />
      <button type="button" class="btn btn-danger btn-sm btn-remove-gallery-item">&times;</button>
    `;

    // Remove handler
    item.querySelector('.btn-remove-gallery-item').addEventListener('click', function() {
      const idx = galleryMediaIds.indexOf(parseInt(mediaId));
      if (idx > -1) galleryMediaIds.splice(idx, 1);
      item.remove();
      if (!galleryPreview.children.length) {
        galleryPreview.classList.add('empty');
      }
    });

    // Drag and drop handlers
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);

    galleryPreview.appendChild(item);
  }

  // Drag and drop reordering
  let draggedElement = null;

  function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
  }

  function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (draggedElement !== this) {
      // Swap positions
      const allItems = Array.from(galleryPreview.querySelectorAll('.gallery-item'));
      const draggedIdx = allItems.indexOf(draggedElement);
      const targetIdx = allItems.indexOf(this);

      if (draggedIdx < targetIdx) {
        this.parentNode.insertBefore(draggedElement, this.nextSibling);
      } else {
        this.parentNode.insertBefore(draggedElement, this);
      }

      // Update galleryMediaIds order
      const draggedId = parseInt(draggedElement.dataset.mediaId);
      const targetId = parseInt(this.dataset.mediaId);
      const draggedIdIdx = galleryMediaIds.indexOf(draggedId);
      const targetIdIdx = galleryMediaIds.indexOf(targetId);

      galleryMediaIds.splice(draggedIdIdx, 1);
      galleryMediaIds.splice(targetIdIdx, 0, draggedId);
    }
    return false;
  }

  function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedElement = null;
  }

  // Handle save button
  const saveBtn = modal.querySelector('.btn-save-post');
  if (saveBtn) {
    saveBtn.addEventListener('click', async function() {
      const title = modal.querySelector('.post-title').value.trim() || null;
      const status = modal.querySelector('.post-status').value;
      const heroMediaId = modal.querySelector('.post-hero-media').value || null;
      const heroImageHeight = heroMediaId ? parseInt(modal.querySelector('.post-hero-height').value) : null;
      const bodyHtml = editor ? window.getQuillHTML(editor) : '';

      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const response = await fetch('/api/admin/posts.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({
            title: title,
            body_html: bodyHtml,
            status: status,
            hero_media_id: heroMediaId,
            hero_image_height: heroImageHeight,
            hero_crop_overlay: modal.querySelector('.post-hero-crop-overlay')?.checked ? 1 : 0,
            gallery_media_ids: galleryMediaIds
          })
        });

        const data = await response.json();

        if (data.success) {
          // Close modal
          const bsModal = bootstrap.Modal.getInstance(modal);
          if (bsModal) bsModal.hide();
          // Refresh posts list without full page reload
          if (typeof window.refreshPostsList === 'function') {
            await window.refreshPostsList();
          } else {
            window.location.reload();
          }
        } else {
          alert('Error: ' + (data.error || 'Failed to create post'));
        }
      } catch (error) {
        console.error('Error creating post:', error);
        alert('An error occurred while creating the post');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Post';
      }
    });
  }

  // Handle cancel button
  const cancelBtn = modal.querySelector('.btn-cancel-post');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function() {
      const bsModal = bootstrap.Modal.getInstance(modal);
      bsModal.hide();
    });
  }

  // Load media options for hero dropdown
  async function loadMediaOptions() {
    try {
      const response = await fetch('/api/admin/media.php');
      const data = await response.json();

      if (data.success && data.data) {
        const select = modal.querySelector('.post-hero-media');
        data.data.forEach(item => {
          const option = document.createElement('option');
          option.value = item.id;
          option.textContent = item.original_filename + ' (' + item.width + 'x' + item.height + ')';
          select.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading media:', error);
    }
  }

  // Load media options when page loads
  loadMediaOptions();

})();
