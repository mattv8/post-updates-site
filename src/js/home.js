(() => {
  function qs(sel, el=document) { return el.querySelector(sel); }
  function qsa(sel, el=document) { return Array.from(el.querySelectorAll(sel)); }

  async function fetchPost(id) {
    const res = await fetch(`/api/posts.php?id=${encodeURIComponent(id)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load post');
    return data.post;
  }

  function showOverlay(post) {
    const overlay = qs('#post-overlay');
    qs('#overlay-title').textContent = post.title || '';
    const body = qs('#overlay-body');

    // Add author information if available
    let authorHtml = '';
    if (post.author_first || post.author_last) {
      const authorName = [post.author_first, post.author_last].filter(Boolean).join(' ');
      authorHtml = `<p class="text-muted small mb-3"><em>By ${authorName}</em></p>`;
    }

  body.innerHTML = authorHtml + (post.body_html || '');
  // Ensure links in overlay open in a new tab and are safe
  ensureAnchorsOpenNewTab(body);

    const media = qs('#overlay-media');
    media.innerHTML = '';

    // Show delete button if authenticated and store post ID
    const deleteBtn = qs('#overlay-delete');
    if (deleteBtn) {
      deleteBtn.style.display = 'block';
      deleteBtn.setAttribute('data-post-id', post.id);
    }

    // Display gallery images if present
    if (post.gallery_images && post.gallery_images.length > 0) {
      const gallery = document.createElement('div');
      gallery.className = 'post-gallery';

      post.gallery_images.forEach((img, index) => {
        const item = document.createElement('div');
        item.className = 'post-gallery-item';
        item.setAttribute('data-index', index);

        const picture = document.createElement('picture');
        if (img.srcset_webp) {
          const srcWebp = document.createElement('source');
          srcWebp.type = 'image/webp';
          srcWebp.setAttribute('srcset', img.srcset_webp);
          srcWebp.setAttribute('sizes', '(min-width: 992px) 33vw, (min-width: 768px) 50vw, 100vw');
          picture.appendChild(srcWebp);
        }

        const imgEl = document.createElement('img');
        imgEl.className = 'gallery-image';
        if (img.srcset_jpg) {
          imgEl.setAttribute('srcset', img.srcset_jpg);
          imgEl.setAttribute('sizes', '(min-width: 992px) 33vw, (min-width: 768px) 50vw, 100vw');
        }
        imgEl.alt = img.alt_text || 'Gallery image';
        imgEl.loading = 'lazy';
        imgEl.setAttribute('data-full', img.original_path);
        picture.appendChild(imgEl);

        item.appendChild(picture);
        gallery.appendChild(item);

        // Add click handler for lightbox
        item.addEventListener('click', () => openLightbox(post.gallery_images, index));
      });

      media.appendChild(gallery);
    } else if (post.hero_srcset_webp || post.hero_srcset_jpg) {
      // Fallback to hero image if no gallery
      const picture = document.createElement('picture');
      if (post.hero_srcset_webp) {
        const srcWebp = document.createElement('source');
        srcWebp.type = 'image/webp';
        srcWebp.setAttribute('srcset', post.hero_srcset_webp);
        srcWebp.setAttribute('sizes', '100vw');
        picture.appendChild(srcWebp);
      }
      if (post.hero_srcset_jpg) {
        const img = document.createElement('img');
        img.className = 'img-fluid rounded';
        img.setAttribute('srcset', post.hero_srcset_jpg);
        img.setAttribute('sizes', '100vw');
        img.alt = post.title || 'Post image';
        picture.appendChild(img);
      }
      media.appendChild(picture);
    }

    overlay.classList.remove('d-none');
    document.body.classList.add('overflow-hidden');
  }

  function hideOverlay() {
    const overlay = qs('#post-overlay');
    overlay.classList.add('d-none');
    document.body.classList.remove('overflow-hidden');
  }

  // Lightbox functionality
  let lightboxImages = [];
  let currentLightboxIndex = 0;

  function openLightbox(images, index) {
    lightboxImages = images;
    currentLightboxIndex = index;

    const lightbox = getLightboxElement();
    updateLightboxImage();
    lightbox.classList.remove('d-none');
  }

  function closeLightbox() {
    const lightbox = qs('#image-lightbox');
    if (lightbox) {
      lightbox.classList.add('d-none');
    }
  }

  function nextLightboxImage() {
    currentLightboxIndex = (currentLightboxIndex + 1) % lightboxImages.length;
    updateLightboxImage();
  }

  function prevLightboxImage() {
    currentLightboxIndex = (currentLightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    updateLightboxImage();
  }

  function updateLightboxImage() {
    const img = lightboxImages[currentLightboxIndex];
    const lightboxImg = qs('#lightbox-image');
    const lightboxCounter = qs('#lightbox-counter');

    if (lightboxImg) {
      // Create picture element for WebP support
      const picture = document.createElement('picture');

      if (img.srcset_webp) {
        const srcWebp = document.createElement('source');
        srcWebp.type = 'image/webp';
        srcWebp.setAttribute('srcset', img.srcset_webp);
        picture.appendChild(srcWebp);
      }

      const imgEl = document.createElement('img');
      imgEl.id = 'lightbox-image';
      if (img.srcset_jpg) {
        imgEl.setAttribute('srcset', img.srcset_jpg);
      }
      imgEl.alt = img.alt_text || 'Gallery image';
      picture.appendChild(imgEl);

      lightboxImg.replaceWith(picture);
    }

    if (lightboxCounter) {
      lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${lightboxImages.length}`;
    }
  }

  function getLightboxElement() {
    let lightbox = qs('#image-lightbox');
    if (!lightbox) {
      // Create lightbox element
      lightbox = document.createElement('div');
      lightbox.id = 'image-lightbox';
      lightbox.className = 'lightbox d-none';
      lightbox.innerHTML = `
        <div class="lightbox-backdrop"></div>
        <div class="lightbox-content">
          <button class="lightbox-close" aria-label="Close">&times;</button>
          <button class="lightbox-prev" aria-label="Previous">&lsaquo;</button>
          <button class="lightbox-next" aria-label="Next">&rsaquo;</button>
          <div class="lightbox-counter"></div>
          <img id="lightbox-image" src="" alt="" />
        </div>
      `;
      document.body.appendChild(lightbox);

      // Bind lightbox events
      qs('.lightbox-close', lightbox).addEventListener('click', closeLightbox);
      qs('.lightbox-backdrop', lightbox).addEventListener('click', closeLightbox);
      qs('.lightbox-prev', lightbox).addEventListener('click', prevLightboxImage);
      qs('.lightbox-next', lightbox).addEventListener('click', nextLightboxImage);

      // Keyboard navigation
      document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('d-none')) {
          if (e.key === 'Escape') closeLightbox();
          if (e.key === 'ArrowLeft') prevLightboxImage();
          if (e.key === 'ArrowRight') nextLightboxImage();
        }
      });
    }
    return lightbox;
  }

  // Attach handlers to timeline cards within a container (idempotent via data-bound)
  function bindCardHandlers(container=document) {
    // Clickable post cards
    qsa('.post-card', container).forEach(card => {
      if (card.dataset.bound === '1') return;
      card.dataset.bound = '1';
      card.addEventListener('click', async (e) => {
        // Don't open overlay if clicking edit or delete button
        if (e.target.closest('.btn-edit-post-home') || e.target.closest('.btn-delete-post-home')) {
          return;
        }

        // Allow links inside the card to be clicked normally (open in new tab)
        const anchor = e.target.closest('a');
        if (anchor) {
          // Make sure it opens in a new tab securely
          anchor.setAttribute('target', '_blank');
          const rel = (anchor.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
          if (!rel.includes('noopener')) rel.push('noopener');
          if (!rel.includes('noreferrer')) rel.push('noreferrer');
          anchor.setAttribute('rel', rel.join(' '));
          return; // Do not open overlay
        }

        // Find the post ID from the parent timeline-item
        const timelineItem = card.closest('.timeline-item');
        if (!timelineItem) return;

        const id = timelineItem.getAttribute('data-post-id');
        if (!id) return;

        try {
          const post = await fetchPost(id);
          showOverlay(post);
        } catch (err) {
          console.error(err);
          alert('Sorry, we could not load that update right now.');
        }
      });
    });

    // Delete buttons on post cards
    qsa('.btn-delete-post-home', container).forEach(btn => {
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const postId = btn.getAttribute('data-post-id');
        if (postId) {
          // Show confirmation modal
          const deleteModal = new bootstrap.Modal(document.getElementById('deletePostModal'));
          const confirmBtn = qs('#confirmDeletePost');

          // Store post ID on confirm button
          confirmBtn.setAttribute('data-post-id', postId);

          deleteModal.show();
        }
      });
    });
  }

  async function refreshPostsList() {
    try {
      const response = await fetch(window.location.href, { cache: 'no-store' });
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const newList = doc.querySelector('#posts-list');
      const currentList = document.getElementById('posts-list');
      if (newList && currentList) {
        currentList.innerHTML = newList.innerHTML;
        bindCardHandlers(currentList);
        // Ensure anchors open in new tab
        ensureAnchorsOpenNewTab(currentList);
      } else {
        window.location.reload();
      }
    } catch (e) {
      console.error('Failed to refresh posts list:', e);
      window.location.reload();
    }
  }
  // Expose globally for other modules (e.g., post-modal.js)
  window.refreshPostsList = refreshPostsList;

  function bindEvents() {
    // Read more buttons
    qsa('.read-more').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-post-id');
        try {
          const post = await fetchPost(id);
          showOverlay(post);
        } catch (err) {
          console.error(err);
          alert('Sorry, we could not load that update right now.');
        }
      });
    });

    // Bind card handlers initially
    bindCardHandlers(document);

    // Delete buttons are covered in bindCardHandlers

    // Overlay close/backdrop
    const closeBtn = qs('#overlay-close');
    const backdrop = qs('#post-overlay .post-overlay-backdrop');
    if (closeBtn) closeBtn.addEventListener('click', hideOverlay);
    if (backdrop) backdrop.addEventListener('click', hideOverlay);

    // Delete button in overlay
    const deleteBtn = qs('#overlay-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        const postId = deleteBtn.getAttribute('data-post-id');
        if (postId) {
          // Show confirmation modal
          const deleteModal = new bootstrap.Modal(document.getElementById('deletePostModal'));
          const confirmBtn = qs('#confirmDeletePost');

          // Store post ID on confirm button
          confirmBtn.setAttribute('data-post-id', postId);

          deleteModal.show();

          // Hide overlay when showing delete modal
          hideOverlay();
        }
      });
    }

    // Confirm delete button
    const confirmDeleteBtn = qs('#confirmDeletePost');
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', async () => {
        const postId = confirmDeleteBtn.getAttribute('data-post-id');
        if (!postId) return;

        const CSRF = document.querySelector('meta[name="csrf-token"]')?.content || '';

        try {
          confirmDeleteBtn.disabled = true;
          confirmDeleteBtn.textContent = 'Deleting...';

          const response = await fetch(`/api/admin/posts.php?id=${postId}`, {
            method: 'DELETE',
            headers: {
              'X-CSRF-Token': CSRF
            }
          });

          const data = await response.json();

          if (data.success) {
            // Close modal
            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deletePostModal'));
            if (deleteModal) deleteModal.hide();

            // Reload page to remove deleted post
            window.location.reload();
          } else {
            alert('Error deleting post: ' + (data.error || 'Unknown error'));
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = 'Delete Post';
          }
        } catch (error) {
          console.error('Error deleting post:', error);
          alert('An error occurred while deleting the post');
          confirmDeleteBtn.disabled = false;
          confirmDeleteBtn.textContent = 'Delete Post';
        }
      });
    }

    // Global handler: make any links in previews open in a new tab and not trigger overlay
    document.addEventListener('click', (e) => {
      const a = e.target.closest('.post-preview-content a, #overlay-body a');
      if (a) {
        a.setAttribute('target', '_blank');
        const rel = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
        if (!rel.includes('noopener')) rel.push('noopener');
        if (!rel.includes('noreferrer')) rel.push('noreferrer');
        a.setAttribute('rel', rel.join(' '));
        // Prevent parent click handlers (like card click) from firing
        e.stopPropagation();
      }
    }, true); // capture phase to run before card click handler

    // Donate button
    const donateBtn = qs('#donate-btn');
    if (donateBtn) {
      donateBtn.addEventListener('click', async () => {
        const amount = Number(donateBtn.getAttribute('data-amount') || '25');
        try {
          const res = await fetch('/api/donate.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount })
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Failed to start checkout');
          window.location.href = data.url;
        } catch (err) {
          console.error(err);
          alert('Unable to start checkout right now. Please try again later.');
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', bindEvents);
})();

// Utility to force anchors within a container to open in new tab securely
function ensureAnchorsOpenNewTab(container) {
  if (!container) return;
  container.querySelectorAll('a[href]').forEach(a => {
    a.setAttribute('target', '_blank');
    const rel = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
    if (!rel.includes('noopener')) rel.push('noopener');
    if (!rel.includes('noreferrer')) rel.push('noreferrer');
    a.setAttribute('rel', rel.join(' '));
  });
}

// Post editor functionality (only for authenticated users)
// Wait for DOM to load before checking for modal
document.addEventListener('DOMContentLoaded', function() {
  const postEditorModal = document.getElementById('postEditorModal');

  if (postEditorModal) {
    (function() {
      const modal = postEditorModal;
      const postEditorContainer = modal.querySelector('.modal-body');
      const CSRF = document.querySelector('meta[name="csrf-token"]')?.content || '';
      let editingPostId = null;
      let postBodyEditor = null;
      let galleryMediaIds = [];

      // Helper API function
      const api = (url, opts={}) => {
        opts.headers = Object.assign({'X-CSRF-Token': CSRF}, opts.headers||{});
        return fetch(url, opts).then(r => r.json());
      };

      // Handle edit button clicks on post cards (use capture to run before card click)
      document.addEventListener('click', function(e) {
        const editBtn = e.target.closest('.btn-edit-post-home');
        if (editBtn) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          const postId = editBtn.getAttribute('data-post-id');
          if (postId) {
            editingPostId = parseInt(postId, 10);
            
            // Immediately show loading spinner and hide content
            const loadingEl = postEditorContainer.querySelector('.post-editor-loading');
            const contentEl = postEditorContainer.querySelector('.post-editor-content');
            if (loadingEl) loadingEl.style.display = 'block';
            if (contentEl) contentEl.style.display = 'none';
            
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
          }
          return false;
        }
      }, true); // Use capture phase

    // Initialize CKEditor when modal is first shown
    let editorInitialized = false;
    modal.addEventListener('shown.bs.modal', function() {
      // Initialize editor if not already done
      if (!editorInitialized && window.ClassicEditor) {
        const postBodyTextarea = postEditorContainer.querySelector('.post-body');
        ClassicEditor
          .create(postBodyTextarea, {
            toolbar: {
              items: [
                'heading', '|',
                'bold', 'italic', 'link', '|',
                'bulletedList', 'numberedList', '|',
                'imageUpload', 'blockQuote', '|',
                'undo', 'redo'
              ]
            },
            image: {
              toolbar: [
                'imageTextAlternative', 'imageStyle:inline', 'imageStyle:block', 'imageStyle:side'
              ]
            },
            extraPlugins: [window.MediaUploadAdapterPlugin],
            placeholder: 'Write your post content here...'
          })
          .then(editor => {
            postBodyEditor = editor;
            const editorElement = editor.ui.view.editable.element;
            if (editorElement) {
              editorElement.style.minHeight = '400px';
              editorElement.style.maxHeight = '1000px';
              editorElement.style.overflowY = 'auto';
              editorElement.style.resize = 'vertical';
            }
            editorInitialized = true;
            // Initialize AI title generator with editor instance
            if (typeof window.initAITitleGenerator === 'function') {
              window.initAITitleGenerator(postEditorContainer, postBodyEditor);
            }
            // Load post data now that editor is ready
            loadPostData();
            // Bind status toggle change (edit mode)
            const tgl = postEditorContainer.querySelector('.post-status-toggle');
            if (tgl && !tgl.dataset.bound) {
              tgl.dataset.bound = '1';
              tgl.addEventListener('change', async () => {
                const label = postEditorContainer.querySelector('.status-label');
                if (label) label.textContent = tgl.checked ? 'Published' : 'Draft';
                const saveEl = postEditorContainer.querySelector('#post-status-save');
                if (saveEl) saveEl.textContent = 'Saving…';
                tgl.disabled = true;
                try {
                  const j = await api('/api/admin/posts.php?id=' + editingPostId, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ status: tgl.checked ? 'published' : 'draft' })
                  });
                  if (j.success) {
                    if (saveEl) saveEl.textContent = 'Saved';
                    if (typeof window.refreshPostsList === 'function') window.refreshPostsList();
                  } else {
                    if (saveEl) saveEl.textContent = 'Save failed';
                    tgl.checked = !tgl.checked;
                    if (label) label.textContent = tgl.checked ? 'Published' : 'Draft';
                  }
                } catch (e) {
                  console.error('Status toggle save error:', e);
                  if (saveEl) saveEl.textContent = 'Save error';
                  tgl.checked = !tgl.checked;
                  if (label) label.textContent = tgl.checked ? 'Published' : 'Draft';
                } finally {
                  tgl.disabled = false;
                  setTimeout(()=>{ if (saveEl) saveEl.textContent=''; }, 2000);
                }
              });
            }
          })
          .catch(error => {
            console.error('Post body editor initialization error:', error);
          });
      } else if (editorInitialized) {
        // Editor already initialized, just load the data
        loadPostData();
        // Ensure toggle is bound
        const tgl = postEditorContainer.querySelector('.post-status-toggle');
        if (tgl && !tgl.dataset.bound) {
          tgl.dataset.bound = '1';
          tgl.addEventListener('change', async () => {
            const label = postEditorContainer.querySelector('.status-label');
            if (label) label.textContent = tgl.checked ? 'Published' : 'Draft';
            const saveEl = postEditorContainer.querySelector('#post-status-save');
            if (saveEl) saveEl.textContent = 'Saving…';
            tgl.disabled = true;
            try {
              const j = await api('/api/admin/posts.php?id=' + editingPostId, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ status: tgl.checked ? 'published' : 'draft' })
              });
              if (j.success) {
                if (saveEl) saveEl.textContent = 'Saved';
                if (typeof window.refreshPostsList === 'function') window.refreshPostsList();
              } else {
                if (saveEl) saveEl.textContent = 'Save failed';
                tgl.checked = !tgl.checked;
                if (label) label.textContent = tgl.checked ? 'Published' : 'Draft';
              }
            } catch (e) {
              console.error('Status toggle save error:', e);
              if (saveEl) saveEl.textContent = 'Save error';
              tgl.checked = !tgl.checked;
              if (label) label.textContent = tgl.checked ? 'Published' : 'Draft';
            } finally {
              tgl.disabled = false;
              setTimeout(()=>{ if (saveEl) saveEl.textContent=''; }, 2000);
            }
          });
        }
      }
    });

    // Load post data function
    function loadPostData() {
      if (!editingPostId) return;

      // Loading spinner is already shown when edit button was clicked
      // Just ensure it's visible in case this is called directly
      const loadingEl = postEditorContainer.querySelector('.post-editor-loading');
      const contentEl = postEditorContainer.querySelector('.post-editor-content');
      if (loadingEl && loadingEl.style.display !== 'block') {
        loadingEl.style.display = 'block';
        if (contentEl) contentEl.style.display = 'none';
      }

      // Clear gallery preview
      const galleryPreview = postEditorContainer.querySelector('#galleryPreview');
      if (galleryPreview) {
        galleryPreview.innerHTML = '';
        galleryPreview.classList.add('empty');
      }
      galleryMediaIds = [];

      fetch('/api/admin/posts.php?id=' + editingPostId)
        .then(r => r.json())
        .then(j => {
          if (j.success && j.data) {
            const post = j.data;

            postEditorContainer.querySelector('.post-title').value = post.title || '';
            const tgl = postEditorContainer.querySelector('.post-status-toggle');
            if (tgl) {
              tgl.checked = (post.status === 'published');
              const label = postEditorContainer.querySelector('.status-label');
              if (label) label.textContent = tgl.checked ? 'Published' : 'Draft';
            } else {
              postEditorContainer.querySelector('.post-status').value = post.status || 'draft';
            }

            if (postBodyEditor) {
              postBodyEditor.setData(post.body_html || '');
            } else {
              postEditorContainer.querySelector('.post-body').value = post.body_html || '';
            }

            // Set hero image
            if (post.hero_media_id) {
              const heroSelect = postEditorContainer.querySelector('.post-hero-media');
              if (heroSelect) {
                heroSelect.value = post.hero_media_id;
                heroSelect.dispatchEvent(new Event('change'));
              }
            }

            // Load gallery images
            if (post.gallery_media_ids) {
              try {
                const galleryIds = JSON.parse(post.gallery_media_ids);
                if (Array.isArray(galleryIds) && galleryIds.length > 0) {
                  galleryMediaIds = [...galleryIds];
                  for (const mediaId of galleryIds) {
                    fetch(`/api/admin/media.php?id=${mediaId}`)
                      .then(r => r.json())
                      .then(data => {
                        if (data.success && data.data) {
                          addGalleryItemPreview(mediaId, data.data);
                        }
                      });
                  }
                }
              } catch (e) {
                console.error('Error parsing gallery_media_ids:', e);
              }
            }
          }
          
          // Hide loading, show content
          if (loadingEl) loadingEl.style.display = 'none';
          if (contentEl) contentEl.style.display = 'block';
        })
        .catch(err => {
          console.error('Error loading post:', err);
          // Hide loading, show content even on error
          if (loadingEl) loadingEl.style.display = 'none';
          if (contentEl) contentEl.style.display = 'block';
        });
    }

    // Load media library for hero dropdown
    fetch('/api/admin/media.php')
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data) {
          const heroSelect = postEditorContainer.querySelector('.post-hero-media');
          j.data.forEach(m => {
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.original_filename + ' (' + m.width + 'x' + m.height + ')';
            heroSelect.appendChild(option);
          });
        }
      });

    // Hero image selection handler
    const heroSelect = postEditorContainer.querySelector('.post-hero-media');
    const heroPreview = postEditorContainer.querySelector('.hero-preview');
    const heroPreviewImg = heroPreview?.querySelector('img');

    if (heroSelect) {
      heroSelect.addEventListener('change', function() {
        if (this.value && heroPreviewImg) {
          fetch(`/api/admin/media.php?id=${this.value}`)
            .then(r => r.json())
            .then(data => {
              if (data.success && data.data) {
                const variants = JSON.parse(data.data.variants_json || '{}');
                const variant400 = variants['400'];
                const previewUrl = variant400?.jpg
                  ? '/storage/uploads/variants/400/' + variant400.jpg.split('/').pop()
                  : '/storage/uploads/originals/' + data.data.filename;
                heroPreviewImg.src = previewUrl;
                heroPreviewImg.alt = data.data.alt_text || '';
                heroPreview.style.display = 'block';
              }
            });
        } else if (heroPreview) {
          heroPreview.style.display = 'none';
        }
      });
    }

    // Hero remove button
    const heroRemoveBtn = postEditorContainer.querySelector('.btn-remove-hero');
    if (heroRemoveBtn) {
      heroRemoveBtn.addEventListener('click', function() {
        if (heroSelect) heroSelect.value = '';
        if (heroPreview) heroPreview.style.display = 'none';
        if (heroPreviewImg) heroPreviewImg.src = '';
      });
    }

    // Gallery preview functions
    function addGalleryItemPreview(mediaId, mediaData) {
      const galleryPreview = postEditorContainer.querySelector('#galleryPreview');
      if (!galleryPreview) return;

      galleryPreview.classList.remove('empty');

      const variants = JSON.parse(mediaData?.variants_json || '{}');
      const variant400 = variants['400'];
      const thumbUrl = variant400?.jpg
        ? '/storage/uploads/variants/400/' + variant400.jpg.split('/').pop()
        : '/storage/uploads/originals/' + mediaData?.filename;

      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.dataset.mediaId = mediaId;
      item.innerHTML = `
        <img src="${thumbUrl}" alt="${mediaData?.alt_text || ''}" />
        <button type="button" class="btn btn-danger btn-sm btn-remove-gallery-item">&times;</button>
      `;

      item.querySelector('.btn-remove-gallery-item').addEventListener('click', function() {
        const idx = galleryMediaIds.indexOf(parseInt(mediaId));
        if (idx > -1) galleryMediaIds.splice(idx, 1);
        item.remove();
        if (!galleryPreview.children.length) {
          galleryPreview.classList.add('empty');
        }
      });

      galleryPreview.appendChild(item);
    }

    // Save button handler
    postEditorContainer.querySelector('.btn-save-post').addEventListener('click', async function() {
      const saveBtn = this;
      const originalText = saveBtn.textContent;

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const statusElToggle = postEditorContainer.querySelector('.post-status-toggle');
        const statusVal = statusElToggle ? (statusElToggle.checked ? 'published' : 'draft') : postEditorContainer.querySelector('.post-status').value;

        const payload = {
          title: postEditorContainer.querySelector('.post-title').value,
          body_html: postBodyEditor ? postBodyEditor.getData() : postEditorContainer.querySelector('.post-body').value,
          status: statusVal,
          hero_media_id: postEditorContainer.querySelector('.post-hero-media').value || null,
          gallery_media_ids: galleryMediaIds
        };

        const j = await api('/api/admin/posts.php?id=' + editingPostId, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
        });

          if (j.success) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
            // Refresh posts list without full page reload
            if (typeof window.refreshPostsList === 'function') {
              await window.refreshPostsList();
            } else {
              window.location.reload();
            }
          } else {
          alert('Error: ' + (j.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error saving post:', error);
        alert('An error occurred while saving the post');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
      }
    });

    // Cancel button handler
    postEditorContainer.querySelector('.btn-cancel-post').addEventListener('click', function() {
      const bsModal = bootstrap.Modal.getInstance(modal);
      if (bsModal) bsModal.hide();
    });

    // Clean up on modal hide
    modal.addEventListener('hidden.bs.modal', function() {
      editingPostId = null;
      galleryMediaIds = [];
    });
  })(); // End of IIFE
  } // End of if (postEditorModal)
}); // End of DOMContentLoaded for post editor
