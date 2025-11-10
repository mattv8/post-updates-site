(() => {
  function qs(sel, el=document) { return el.querySelector(sel); }
  function qsa(sel, el=document) { return Array.from(el.querySelectorAll(sel)); }

  // Render helpers for lazy-loaded posts
  function formatTimelineDate(publishedAt) {
    if (!publishedAt) return '';
    // Expecting format 'YYYY-MM-DD HH:MM:SS' in local/server time; fallback-safe parsing
    const parts = /^([0-9]{4})-([0-9]{2})-([0-9]{2})\s+([0-9]{2}):([0-9]{2}):([0-9]{2})$/.exec(publishedAt);
    let d;
    if (parts) {
      // Note: months are 0-based in JS Date
      d = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]), Number(parts[4]), Number(parts[5]), Number(parts[6]));
    } else {
      const t = Date.parse(publishedAt);
      if (!isNaN(t)) d = new Date(t);
    }
    if (!d) return '';
    const month = d.toLocaleString(undefined, { month: 'short' });
    const day = d.getDate();
    const year = d.getFullYear();
    return `
      <div class="timeline-month">${month}</div>
      <div class="timeline-day">${day}</div>
      <div class="timeline-year">${year}</div>
    `;
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
  }

  function renderPostCard(post, isAuth) {
    const hasHero = !!(post.hero_srcset_jpg || post.hero_srcset_webp);
    const showTitleOverlay = (post.hero_title_overlay == 1) || (post.hero_title_overlay === undefined);
    const opacity = post.hero_overlay_opacity != null ? post.hero_overlay_opacity : 0.70;
    const title = escapeHtml(post.title || '');

    const author = [post.author_first, post.author_last].filter(Boolean).join(' ').trim();
    const authorHtml = author ? `<p class="text-muted small mb-2"><em>By ${escapeHtml(author)}</em></p>` : '';

    const heroPicture = hasHero ? `
      <div class="hero-image-container" style="max-height: 600px; overflow: hidden; position: relative;">
        <picture style="display: block; height: 0; padding-bottom: ${(post.hero_image_height ?? 100)}%; position: relative; overflow: hidden;">
          ${post.hero_srcset_webp ? `<source type="image/webp" srcset="${post.hero_srcset_webp}" sizes="(max-width: 768px) 100vw, 50vw" />` : ''}
          ${post.hero_srcset_jpg ? `<img class="card-img-top" srcset="${post.hero_srcset_jpg}" sizes="(max-width: 768px) 100vw, 50vw" alt="${title}"
               style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; ${showTitleOverlay ? `filter: brightness(${opacity});` : ''}" />` : ''}
        </picture>
        ${showTitleOverlay ? `<div class="hero-title-overlay"><h5 class="card-title text-white mb-0">${title}</h5></div>` : ''}
      </div>
    ` : '';

    const titleInBody = (!showTitleOverlay || !hasHero) ? `<h5 class="card-title">${title}</h5>` : '';

    const adminBtns = isAuth ? `
      <div class="btn-group" role="group">
        <button class="btn btn-sm btn-outline-secondary btn-edit-post-home" data-post-id="${post.id}" title="Edit post">
          <i class="bi bi-pencil"></i> Edit
        </button>
        <button class="btn btn-sm btn-outline-danger btn-delete-post-home" data-post-id="${post.id}" title="Delete post">
          <i class="bi bi-trash"></i> Delete
        </button>
      </div>
    ` : '';

    return `
      <div class="timeline-item" id="post-${post.id}" data-post-id="${post.id}">
        <div class="timeline-date">
          <div class="timeline-date-content">
            ${post.published_at ? formatTimelineDate(post.published_at) : ''}
          </div>
        </div>
        <div class="timeline-content">
          <div class="card post-card">
            ${heroPicture}
            <div class="card-body">
              ${titleInBody}
              ${authorHtml}
              <div class="card-text post-preview-content">${post.body_html || ''}</div>
              <div class="d-flex justify-content-between align-items-center">
                <small class="text-muted fst-italic">
                  <span class="d-none d-md-inline">Click to read more</span>
                  <span class="d-md-none">Tap to read more</span>
                </small>
                ${adminBtns}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async function fetchPost(id) {
    const res = await fetch(`/api/posts.php?id=${encodeURIComponent(id)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load post');
    return data.post;
  }

  function showOverlay(post) {
    const overlay = qs('#post-overlay');
    const overlayTitle = qs('#overlay-title');
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

    // Show delete and edit buttons if authenticated and store post ID
    const deleteBtn = qs('#overlay-delete');
    if (deleteBtn) {
      deleteBtn.style.display = 'block';
      deleteBtn.setAttribute('data-post-id', post.id);
    }

    const editBtn = qs('#overlay-edit');
    if (editBtn) {
      editBtn.style.display = 'block';
      editBtn.setAttribute('data-post-id', post.id);
    }

    // Display hero image at the top (edge-to-edge)
    const hasHeroImage = post.hero_srcset_webp || post.hero_srcset_jpg;
    const showTitleOverlay = post.hero_title_overlay == 1 || post.hero_title_overlay === undefined;

    if (hasHeroImage) {
      // Ensure overlay container is relative and clipped
      media.style.position = 'relative';
      media.style.overflow = 'hidden';

      const picture = document.createElement('picture');
      picture.style.display = 'block';
      picture.style.margin = '0';
      picture.style.padding = '0';

      let heroImg = null; // Store reference for later logging

      // If cropping is enabled, use padding-bottom technique
      // hero_crop_overlay determines if we should apply the height restriction
      if (post.hero_crop_overlay == 1 && post.hero_image_height) {
        picture.style.height = '0';
        picture.style.paddingBottom = post.hero_image_height + '%';
        picture.style.position = 'relative';
      } else {
        console.log('Using full image height (no crop)');
      }

      if (post.hero_srcset_webp) {
        const srcWebp = document.createElement('source');
        srcWebp.type = 'image/webp';
        srcWebp.setAttribute('srcset', post.hero_srcset_webp);
        srcWebp.setAttribute('sizes', '100vw');
        picture.appendChild(srcWebp);
      }
      if (post.hero_srcset_jpg) {
        const img = document.createElement('img');
        heroImg = img; // Store reference
        img.setAttribute('srcset', post.hero_srcset_jpg);
        img.setAttribute('sizes', '100vw');
        img.alt = post.title || 'Post image';

        if (post.hero_crop_overlay == 1 && post.hero_image_height) {
          // Fill the padded box and center the image (cropped height mode)
          img.style.position = 'absolute';
          img.style.top = '0';
          img.style.left = '0';
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          img.style.objectPosition = 'center center';
        } else {
          // Natural image height (full image), centered
          img.style.display = 'block';
          img.style.width = '100%';
          img.style.height = 'auto';
          img.style.margin = '0';
          img.style.padding = '0';
        }

        // Apply brightness filter if title overlay is enabled
        if (showTitleOverlay) {
          const opacity = post.hero_overlay_opacity || 0.70;
          img.style.filter = `brightness(${opacity})`;
        }

        // Add load event listener to verify image loads
        img.addEventListener('load', () => {
          console.log('Hero image loaded successfully!', img.naturalWidth, 'x', img.naturalHeight);
        });
        img.addEventListener('error', (e) => {
          console.error('Hero image failed to load!', e);
        });

        picture.appendChild(img);
      }

      media.appendChild(picture);

      // If the container collapsed to 0 height (sometimes happens with overflow/scrolling),
      // force it to match the picture's rendered height so the image becomes visible.
      // Use getBoundingClientRect to get layout height.
      setTimeout(() => {
        try {
          const picRect = picture.getBoundingClientRect();
          if (picRect.height && media.offsetHeight === 0) {
            media.style.height = picRect.height + 'px';
            // Ensure overflow is visible while modal is open so users can scroll if needed
            media.style.overflow = 'visible';
            console.log('Forced media container height to', media.style.height);
          }
        } catch (e) {
          console.error('Error forcing media height:', e);
        }
      }, 50);

      // Title overlay is a sibling inside media so it never sits behind card-body
      if (showTitleOverlay) {
        const titleOverlay = document.createElement('div');
        titleOverlay.className = 'overlay-hero-title';
        const titleElement = document.createElement('h2');
        titleElement.className = 'text-white mb-0';
        titleElement.textContent = post.title || '';
        titleOverlay.appendChild(titleElement);
        media.appendChild(titleOverlay);

        // Hide the title in card-body when it's in the overlay
        overlayTitle.style.display = 'none';
      } else {
        overlayTitle.textContent = post.title || '';
        overlayTitle.style.display = 'block';
      }
    } else {
      // No hero image, show title in card-body
      overlayTitle.textContent = post.title || '';
      overlayTitle.style.display = 'block';
    }

    // Display gallery images in body content if present
    if (post.gallery_images && post.gallery_images.length > 0) {
      const gallery = document.createElement('div');
      gallery.className = 'post-gallery mt-4 mb-3';

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

      body.appendChild(gallery);
    }

    overlay.classList.remove('d-none');
    document.body.classList.add('overflow-hidden');

    // Scroll modal content to top to ensure hero image is visible
    const overlayContent = overlay.querySelector('.post-overlay-content');
    if (overlayContent) {
      overlayContent.scrollTop = 0;
    }
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

    // Edit button in overlay - handler is set up in post editor scope below

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

    // Donate button - custom modal (no Bootstrap)
    const donateBtn = qs('#donate-btn');
    if (donateBtn) {
      donateBtn.addEventListener('click', () => {
        const donationModal = document.getElementById('donationModal');
        if (donationModal) {
          donationModal.style.display = 'flex';

          // Initialize platform detection and copy functionality
          initDonationModal();
        }
      });
    }

    // Setup donation modal close handlers
    const donationModal = document.getElementById('donationModal');
    if (donationModal) {
      const closeBtn = donationModal.querySelector('.donation-modal-close');

      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          donationModal.style.display = 'none';
        });
      }

      // Close on overlay click
      donationModal.addEventListener('click', (e) => {
        if (e.target === donationModal) {
          donationModal.style.display = 'none';
        }
      });

      // Close on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && donationModal.style.display === 'flex') {
          donationModal.style.display = 'none';
        }
      });
    }

    // Auto-open post overlay if post_id is in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('post_id');
    if (postId) {
      // Wait a bit for the page to fully render, then open the overlay
      setTimeout(async () => {
        try {
          const post = await fetchPost(postId);
          showOverlay(post);

          // Clean the URL without reloading the page
          const cleanUrl = window.location.pathname + window.location.search.replace(/[?&]post_id=\d+/, '').replace(/^\?&/, '?').replace(/^&/, '?').replace(/\?$/, '');
          window.history.replaceState({}, '', cleanUrl || window.location.pathname);
        } catch (err) {
          console.error('Failed to open post from URL:', err);

          // Show error modal
          const errorModal = document.getElementById('postNotFoundModal');
          if (errorModal && typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(errorModal);
            modal.show();
          }

          // Clean the URL even on error
          const cleanUrl = window.location.pathname + window.location.search.replace(/[?&]post_id=\d+/, '').replace(/^\?&/, '?').replace(/^&/, '?').replace(/\?$/, '');
          window.history.replaceState({}, '', cleanUrl || window.location.pathname);
        }
      }, 100);
    }

    // Hide Load More if initial count is less than the page size
    const lmBtn = qs('.btn-load-more-posts');
    const lmContainer = document.getElementById('posts-load-more');
    if (lmBtn && lmContainer) {
      const initOffset = parseInt(lmBtn.getAttribute('data-offset') || '0', 10);
      const pageLimit = parseInt(lmBtn.getAttribute('data-limit') || '5', 10);
      if (initOffset < pageLimit) {
        lmContainer.classList.add('d-none');
      }
    }

    // Load More Posts (event delegation)
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-load-more-posts');
      if (!btn) return;
      const container = btn.closest('#posts-load-more');
      if (!container) return;
      e.preventDefault();

      const limit = parseInt(btn.getAttribute('data-limit') || '5', 10);
      const offset = parseInt(btn.getAttribute('data-offset') || '0', 10);
      const list = document.getElementById('posts-list');
      const loading = document.getElementById('posts-loading-indicator');
      const isAuth = !!document.querySelector('meta[name="csrf-token"]');

      try {
        btn.disabled = true;
        if (loading) loading.classList.remove('d-none');

        const res = await fetch(`/api/posts.php?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`, { cache: 'no-store' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to load posts');

        const posts = Array.isArray(data.posts) ? data.posts : [];
        if (posts.length === 0) {
          // Nothing more to load; hide the whole container
          container.classList.add('d-none');
          return;
        }

        // Build HTML and append
        const frag = document.createElement('div');
        frag.innerHTML = posts.map(p => renderPostCard(p, isAuth)).join('');
        // Append children to keep only timeline-item nodes
        while (frag.firstChild) {
          list.appendChild(frag.firstChild);
        }

        // Re-bind handlers for newly added cards and fix anchors
        bindCardHandlers(list);
        ensureAnchorsOpenNewTab(list);

        // Update offset
        const newOffset = offset + posts.length;
        btn.setAttribute('data-offset', String(newOffset));

        // If fewer than requested returned, hide the load more
        if (posts.length < limit) {
          container.classList.add('d-none');
        } else {
          btn.disabled = false;
        }
      } catch (err) {
        console.error('Load more error:', err);
        btn.disabled = false;
      } finally {
        if (loading) loading.classList.add('d-none');
      }
    });
  }

  // Initialize donation modal platform detection and copy functionality
  function initDonationModal() {
    const linkText = document.getElementById('donation-link-text');
    const icon = document.querySelector('.donation-platform-icon');
    const name = document.querySelector('.donation-platform-name');

    if (!linkText) return;

    const fullUrl = linkText.getAttribute('data-full-url') || linkText.textContent;

    // Extract username from URL
    let username = fullUrl;
    let platform = 'generic';

    if (fullUrl.includes('venmo.com/u/')) {
      username = fullUrl.split('venmo.com/u/')[1].split(/[/?#]/)[0];
      platform = 'venmo';
      if (icon) icon.className = 'donation-platform-icon bi bi-currency-dollar text-primary';
      if (name) name.textContent = 'Send via Venmo:';
    } else if (fullUrl.includes('venmo.com/code')) {
      // Venmo QR code link format
      username = fullUrl.split('venmo.com/code?')[1]?.split('&')[0] || fullUrl;
      platform = 'venmo';
      if (icon) icon.className = 'donation-platform-icon bi bi-currency-dollar text-primary';
      if (name) name.textContent = 'Send via Venmo:';
    } else if (fullUrl.includes('paypal.me/')) {
      username = fullUrl.split('paypal.me/')[1].split(/[/?#]/)[0];
      platform = 'paypal';
      if (icon) icon.className = 'donation-platform-icon bi bi-paypal text-primary';
      if (name) name.textContent = 'Send via PayPal:';
    } else if (fullUrl.includes('paypal.com')) {
      // Generic PayPal link
      username = fullUrl;
      platform = 'paypal';
      if (icon) icon.className = 'donation-platform-icon bi bi-paypal text-primary';
      if (name) name.textContent = 'Send via PayPal:';
    } else if (fullUrl.includes('ko-fi.com/')) {
      username = fullUrl.split('ko-fi.com/')[1].split(/[/?#]/)[0];
      platform = 'kofi';
      if (icon) icon.className = 'donation-platform-icon bi bi-cup-hot-fill text-danger';
      if (name) name.textContent = 'Send via Ko-fi:';
    } else if (fullUrl.includes('buymeacoffee.com/')) {
      username = fullUrl.split('buymeacoffee.com/')[1].split(/[/?#]/)[0];
      platform = 'buymeacoffee';
      if (icon) icon.className = 'donation-platform-icon bi bi-cup-hot text-warning';
      if (name) name.textContent = 'Buy Me a Coffee:';
    } else if (fullUrl.includes('cash.app/$')) {
      username = fullUrl.split('cash.app/$')[1].split(/[/?#]/)[0];
      platform = 'cashapp';
      if (icon) icon.className = 'donation-platform-icon bi bi-cash-stack text-success';
      if (name) name.textContent = 'Send via Cash App:';
    } else if (fullUrl.includes('cash.me/$')) {
      username = fullUrl.split('cash.me/$')[1].split(/[/?#]/)[0];
      platform = 'cashapp';
      if (icon) icon.className = 'donation-platform-icon bi bi-cash-stack text-success';
      if (name) name.textContent = 'Send via Cash App:';
    } else if (fullUrl.includes('zelle.com')) {
      username = fullUrl;
      platform = 'zelle';
      if (icon) icon.className = 'donation-platform-icon bi bi-bank text-purple';
      if (name) name.textContent = 'Send via Zelle:';
    } else if (fullUrl.includes('patreon.com/')) {
      username = fullUrl.split('patreon.com/')[1].split(/[/?#]/)[0];
      platform = 'patreon';
      if (icon) icon.className = 'donation-platform-icon bi bi-heart-fill text-danger';
      if (name) name.textContent = 'Support on Patreon:';
    } else if (fullUrl.includes('github.com/sponsors/')) {
      username = fullUrl.split('github.com/sponsors/')[1].split(/[/?#]/)[0];
      platform = 'github';
      if (icon) icon.className = 'donation-platform-icon bi bi-github text-dark';
      if (name) name.textContent = 'Sponsor on GitHub:';
    } else if (fullUrl.includes('buy.stripe.com/') || fullUrl.includes('donate.stripe.com/')) {
      username = fullUrl;
      platform = 'stripe';
      if (icon) icon.className = 'donation-platform-icon bi bi-credit-card-2-front text-primary';
      if (name) name.textContent = 'Donate via Stripe:';
    } else if (fullUrl.includes('gofundme.com/')) {
      username = fullUrl.split('gofundme.com/')[1]?.split(/[/?#]/)[0] || 'campaign';
      platform = 'gofundme';
      if (icon) icon.className = 'donation-platform-icon bi bi-heart text-success';
      if (name) name.textContent = 'Support on GoFundMe:';
    } else {
      if (icon) icon.className = 'donation-platform-icon bi bi-credit-card text-secondary';
      if (name) name.textContent = 'Send payment:';
    }

    // Display only the username
    linkText.textContent = username;

    // Make the code element clickable to copy
    linkText.style.cursor = 'pointer';
    linkText.addEventListener('click', () => {
      navigator.clipboard.writeText(username).then(() => {
        const originalText = linkText.textContent;
        const originalBg = linkText.style.backgroundColor;
        linkText.textContent = 'Copied!';
        linkText.style.backgroundColor = '#d1e7dd';
        setTimeout(() => {
          linkText.textContent = originalText;
          linkText.style.backgroundColor = originalBg;
        }, 1500);
      });
    });
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
      let postAutoSave = null;

      // Re-enable Save & Publish if confirmation modal is cancelled
      if (!postEditorContainer.dataset.publishCancelBound) {
        document.addEventListener('publish-confirmation:cancelled', () => {
          const btn = postEditorContainer.querySelector('.btn-save-post');
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Save and Publish';
          }
          // Refresh the post editor to show the saved draft
          if (editingPostId) {
            loadPostData();
          }
        });
        postEditorContainer.dataset.publishCancelBound = '1';
      }

      // Helper function to setup auto-save for posts (saves to draft)
      function setupPostAutoSave(editor, postId) {

        if (!window.setupAutoSave) {
          console.error('window.setupAutoSave is not defined!');
          return null;
        }

        return window.setupAutoSave(editor, {
          saveUrl: `/api/admin/posts-draft.php?id=${postId}`,
          method: 'PUT',
          buildPayload: (content) => ({ body_html: content }),
          statusElementId: 'post-autosave-status-home-edit',
          fieldName: `post ${postId} draft`
        });
      }

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

      // Handle edit button in overlay
      const overlayEditBtn = document.querySelector('#overlay-edit');
      if (overlayEditBtn) {
        overlayEditBtn.addEventListener('click', function() {
          const postId = overlayEditBtn.getAttribute('data-post-id');
          if (postId) {
            // Hide the overlay first
            const overlay = document.querySelector('#post-overlay');
            if (overlay) {
              overlay.classList.add('d-none');
              document.body.classList.remove('overflow-hidden');
            }

            // Set up edit mode
            editingPostId = parseInt(postId, 10);

            // Immediately show loading spinner and hide content
            const loadingEl = postEditorContainer.querySelector('.post-editor-loading');
            const contentEl = postEditorContainer.querySelector('.post-editor-content');
            if (loadingEl) loadingEl.style.display = 'block';
            if (contentEl) contentEl.style.display = 'none';

            // Open the edit modal
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
          }
        });
      }

    // Handle Create Post button click
    const createPostBtn = document.getElementById('btnCreatePost');
    if (createPostBtn) {
      createPostBtn.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent default Bootstrap modal opening
        e.stopPropagation();
        editingPostId = null; // Clear editing ID for new post

        // Reset autosave indicator for new unsaved post
        const statusEl = postEditorContainer.querySelector('#post-autosave-status-home-edit');
        if (statusEl) {
          statusEl.innerHTML = '<span class="text-muted">Save post to enable auto-save</span>';
          statusEl.className = 'editor-autosave-indicator';
        }

        // Clear any lingering auto-save interval defensively
        if (postAutoSave) {
          if (typeof postAutoSave.cleanup === 'function') {
            postAutoSave.cleanup();
          } else {
            clearInterval(postAutoSave);
          }
          postAutoSave = null;
        }

        // Manually open the modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
      });
    }

    // Initialize Quill editor when modal is first shown
    let editorInitialized = false;
    modal.addEventListener('shown.bs.modal', function() {
      // Initialize crop manager for hero image if not already done
      if (typeof window.initPostEditorCrop === 'function' && !modal._postCropManager) {
        modal._postCropManager = window.initPostEditorCrop(postEditorContainer, CSRF);
      }

      // Reset auto-save indicator immediately for new posts
      // This prevents stale "Draft saved" messages from previous edits
      if (!editingPostId) {
        const statusElement = postEditorContainer.querySelector('#post-autosave-status-home-edit');
        if (statusElement) {
          statusElement.innerHTML = '<span class="text-muted">Save post to enable auto-save</span>';
          statusElement.className = 'editor-autosave-indicator';
        }
      }

      // Show/hide Save Draft button based on whether we're editing or creating
      // Show for NEW posts (no editingPostId), hide for editing existing posts
      const saveDraftBtn = postEditorContainer.querySelector('.btn-save-draft');
      if (saveDraftBtn) {
        saveDraftBtn.style.display = editingPostId ? 'none' : 'inline-block';
      }

      // Initialize editor if not already done
      if (!editorInitialized && window.initQuillEditor) {
        // IMPORTANT: Make sure the post-editor-content is visible before initializing Quill
        // Quill needs to measure the container, and this fails if it's hidden
        const loadingEl = postEditorContainer.querySelector('.post-editor-loading');
        const contentEl = postEditorContainer.querySelector('.post-editor-content');
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'block';

        const postBodyTextarea = postEditorContainer.querySelector('.post-body');
        postBodyEditor = window.initQuillEditor(postBodyTextarea, {
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

        editorInitialized = true;
        // Initialize AI title generator with editor instance
        if (typeof window.initAITitleGenerator === 'function') {
          window.initAITitleGenerator(postEditorContainer, postBodyEditor);
        }
        // Load post data if editing, otherwise clear form for new post
        if (editingPostId) {
          loadPostData();
        } else {
          clearPostForm();
        }
      } else if (editorInitialized) {
        // Editor already initialized, load data if editing or clear for new post
        if (editingPostId) {
          loadPostData();
        } else {
          clearPostForm();
        }
      }
    });

    // Clear post form for new post
    function clearPostForm() {
      // Hide loading, show content
      const loadingEl = postEditorContainer.querySelector('.post-editor-loading');
      const contentEl = postEditorContainer.querySelector('.post-editor-content');
      if (loadingEl) loadingEl.style.display = 'none';
      if (contentEl) contentEl.style.display = 'block';

      // Clear form fields
      postEditorContainer.querySelector('.post-title').value = '';

      // Clear editor
      if (postBodyEditor) {
        window.clearQuillEditor(postBodyEditor);
      } else {
        postEditorContainer.querySelector('.post-body').value = '';
      }

      // Clear hero image
      const heroSelect = postEditorContainer.querySelector('.post-hero-media');
      const heroPreviewContainer = postEditorContainer.querySelector('.hero-preview-container');
      if (heroSelect) heroSelect.value = '';
      if (heroPreviewContainer) heroPreviewContainer.style.display = 'none';

      // Reset hero settings
      const heroHeightSlider = postEditorContainer.querySelector('.post-hero-height');
      const heroHeightValue = postEditorContainer.querySelector('.hero-height-value');
      if (heroHeightSlider) {
        heroHeightSlider.value = 100;
        const heroPreviewDiv = postEditorContainer.querySelector('.hero-preview');
        if (heroPreviewDiv) heroPreviewDiv.style.paddingBottom = '100%';
      }
      if (heroHeightValue) heroHeightValue.textContent = '100';

      // Clear gallery
      const galleryPreview = postEditorContainer.querySelector('#galleryPreview');
      if (galleryPreview) {
        galleryPreview.innerHTML = '';
        galleryPreview.classList.add('empty');
      }
      galleryMediaIds = [];

      // Clear auto-save
      if (postAutoSave) {
        if (typeof postAutoSave.cleanup === 'function') {
          postAutoSave.cleanup();
        } else {
          clearInterval(postAutoSave);
        }
        postAutoSave = null;
      }
    }

    // Load post data function
    function loadPostData() {
      if (!editingPostId) return;

      // Show loading spinner while fetching data
      const loadingEl = postEditorContainer.querySelector('.post-editor-loading');
      const contentEl = postEditorContainer.querySelector('.post-editor-content');
      if (loadingEl) loadingEl.style.display = 'block';
      if (contentEl) contentEl.style.display = 'none';

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

            // Use draft content for editing (falls back to published if no draft)
            postEditorContainer.querySelector('.post-title').value = post.title_editing || '';

            if (postBodyEditor) {
              // Load draft content into editor
              window.setQuillHTML(postBodyEditor, post.body_html_editing || '');

              // Set up auto-save for this post (saves to draft)
              // Only enable autosave if we have a valid post ID
              if (postAutoSave) {
                if (typeof postAutoSave.cleanup === 'function') {
                  postAutoSave.cleanup();
                } else {
                  clearInterval(postAutoSave);
                }
                postAutoSave = null;
              }
              if (editingPostId) {
                postAutoSave = setupPostAutoSave(postBodyEditor, editingPostId);
              }
            } else {
              postEditorContainer.querySelector('.post-body').value = post.body_html_editing || '';
            }

            // Set hero image (use draft)
            const heroMediaId = post.hero_media_id_editing;
            if (heroMediaId) {
              const heroSelect = postEditorContainer.querySelector('.post-hero-media');
              const heroHeightControl = postEditorContainer.querySelector('.hero-height-control');
              if (heroSelect) {
                heroSelect.value = heroMediaId;
                heroSelect.dispatchEvent(new Event('change'));
              }
              // Set hero height and show control (use draft)
              const heroHeightSlider = postEditorContainer.querySelector('.post-hero-height');
              const heroHeightValue = postEditorContainer.querySelector('.hero-height-value');
              const heroCropToggle = postEditorContainer.querySelector('.post-hero-crop-overlay');
              const heroPreviewDiv = postEditorContainer.querySelector('.hero-preview');
              const heightToSet = post.hero_image_height_editing || 100;
              if (heroHeightSlider) {
                heroHeightSlider.value = heightToSet;
                if (heroHeightValue) {
                  heroHeightValue.textContent = heightToSet;
                }
                // Set preview padding-bottom to match actual display
                if (heroPreviewDiv) {
                  heroPreviewDiv.style.paddingBottom = heightToSet + '%';
                }
              }
              // Set crop overlay toggle (use draft)
              if (heroCropToggle) {
                heroCropToggle.checked = (post.hero_crop_overlay_editing == 1);
              }
              // Set title overlay toggle (use draft)
              const heroTitleToggle = postEditorContainer.querySelector('.post-hero-title-overlay');
              if (heroTitleToggle) {
                const draftValue = post.hero_title_overlay_editing;
                heroTitleToggle.checked = draftValue == 1 || draftValue === null || draftValue === undefined;
              }
              // Set overlay opacity slider (use draft)
              const heroOverlayOpacity = postEditorContainer.querySelector('.post-hero-overlay-opacity');
              const overlayOpacityValue = postEditorContainer.querySelector('.overlay-opacity-value');
              if (heroOverlayOpacity) {
                const opacityToSet = parseFloat(post.hero_overlay_opacity_editing) || 0.70;
                heroOverlayOpacity.value = opacityToSet;
                if (overlayOpacityValue) {
                  overlayOpacityValue.textContent = opacityToSet.toFixed(2);
                }
              }
              // Show height control when there's a hero image
              if (heroHeightControl) {
                heroHeightControl.style.display = 'block';
              }

              // Update preview after loading all settings
              setTimeout(() => {
                if (typeof updateHeroPreview === 'function') {
                  updateHeroPreview();
                }
              }, 100);
            }

            // Load gallery images (prefer draft editing version to avoid stale published gallery)
            const galleryData = post.gallery_media_ids_editing || post.gallery_media_ids;
            if (galleryData) {
              try {
                const galleryIds = JSON.parse(galleryData);
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
                console.error('Error parsing gallery media IDs:', e);
              }
            }

            // Hide Save Draft button for existing posts (draft button is only for brand new posts)
            const saveDraftBtn = postEditorContainer.querySelector('.btn-save-draft');
            if (saveDraftBtn) {
              saveDraftBtn.style.display = 'none';
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
    const heroPreviewContainer = postEditorContainer.querySelector('.hero-preview-container');
    const heroPreview = postEditorContainer.querySelector('.hero-preview');
    const heroPreviewImg = heroPreview?.querySelector('img');
    const heroHeightControl = postEditorContainer.querySelector('.hero-height-control');
    const heroHeightSlider = postEditorContainer.querySelector('.post-hero-height');
    const heroHeightValue = postEditorContainer.querySelector('.hero-height-value');
    const heroOverlayOpacitySlider = postEditorContainer.querySelector('.post-hero-overlay-opacity');
    const overlayOpacityValue = postEditorContainer.querySelector('.overlay-opacity-value');
    const heroPreviewTitleOverlay = postEditorContainer.querySelector('.hero-preview-title-overlay');
    const heroTitleOverlayToggle = postEditorContainer.querySelector('.post-hero-title-overlay');
    const postTitleInput = postEditorContainer.querySelector('.post-title');
    const heroOverlayOpacityControl = postEditorContainer.querySelector('.hero-overlay-opacity-control');

    // Save just the hero-related fields to draft for existing posts
    const saveHeroDraft = async () => {
      if (!editingPostId) return; // Only auto-save for existing posts
      const payload = {
        hero_media_id: heroSelect?.value || null,
        hero_image_height: heroSelect?.value ? parseInt(heroHeightSlider?.value || 100) : null,
        hero_crop_overlay: heroSelect?.value ? (postEditorContainer.querySelector('.post-hero-crop-overlay')?.checked ? 1 : 0) : 0,
        hero_title_overlay: heroSelect?.value ? (heroTitleOverlayToggle?.checked ? 1 : 0) : 1,
        hero_overlay_opacity: heroSelect?.value ? parseFloat(heroOverlayOpacitySlider?.value || 0.70) : 0.70
      };
      try {
        await api('/api/admin/posts-draft.php?id=' + editingPostId, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
        });
      } catch (e) {
        console.warn('Auto-save hero draft failed:', e);
      }
    };

    // Function to update preview based on settings
    const updateHeroPreview = () => {
      if (!heroPreviewImg || !heroPreviewTitleOverlay) return;

      const showTitleOverlay = heroTitleOverlayToggle?.checked ?? true;
      const opacity = parseFloat(heroOverlayOpacitySlider?.value || 0.70);
      const titleText = postTitleInput?.value || 'Post Title Preview';

      // Show/hide opacity control based on title overlay toggle
      if (heroOverlayOpacityControl) {
        heroOverlayOpacityControl.style.display = showTitleOverlay ? 'block' : 'none';
      }

      // Update image brightness
      if (showTitleOverlay) {
        heroPreviewImg.style.filter = `brightness(${opacity})`;
      } else {
        heroPreviewImg.style.filter = 'none';
      }

      // Update title overlay visibility and text
      if (showTitleOverlay) {
        heroPreviewTitleOverlay.style.display = 'block';
        const titleElement = heroPreviewTitleOverlay.querySelector('h5');
        if (titleElement) {
          titleElement.textContent = titleText || 'Post Title Preview';
        }
      } else {
        heroPreviewTitleOverlay.style.display = 'none';
      }
    };

    // Expose for cross-file calls (used by crop init upload flow)
    // Accepts optional container arg but uses current closure variables
    window.updatePostHeroPreview = function() {
      updateHeroPreview();
    };

    if (heroSelect) {
      heroSelect.addEventListener('change', function() {
        if (this.value && heroPreviewImg) {
          fetch(`/api/admin/media.php?id=${this.value}`)
            .then(r => r.json())
            .then(data => {
              if (data.success && data.data) {
                let previewUrl = '';
                try {
                  const variants = JSON.parse(data.data.variants_json || '[]');
                  if (Array.isArray(variants)) {
                    // Prefer 400w jpg, fall back to any 400w, then 800w
                    let v = variants.find(v => v.width === 400 && v.format === 'jpg')
                         || variants.find(v => v.width === 400)
                         || variants.find(v => v.width === 800);
                    if (v && v.path) {
                      const m = v.path.match(/\/storage\/uploads\/.+$/);
                      previewUrl = m ? m[0] : v.path;
                    }
                  } else {
                    // Legacy object shape: { "400": { jpg: "..." } }
                    const variant400 = variants['400'];
                    if (variant400?.jpg) {
                      previewUrl = '/storage/uploads/variants/400/' + variant400.jpg.split('/').pop();
                    }
                  }
                } catch (e) {
                  // Ignore parse issues; will fallback below
                }

                if (!previewUrl) {
                  previewUrl = '/storage/uploads/originals/' + data.data.filename;
                }

                heroPreviewImg.src = previewUrl;
                heroPreviewImg.alt = data.data.alt_text || '';
                if (heroPreviewContainer) heroPreviewContainer.style.display = 'block';

                // Set initial preview padding-bottom based on current slider value
                const heroPreviewDiv = postEditorContainer.querySelector('.hero-preview');
                const currentHeight = parseInt(heroHeightSlider?.value || 100);
                if (heroPreviewDiv) {
                  heroPreviewDiv.style.paddingBottom = currentHeight + '%';
                }

                // Update preview with current settings
                updateHeroPreview();

                // Auto-save hero selection to draft for existing posts
                saveHeroDraft();
              }
            });
        } else {
          if (heroPreviewContainer) heroPreviewContainer.style.display = 'none';
          // Save cleared hero selection
          saveHeroDraft();
        }
      });
    }

    // Hero height slider handler - update preview dynamically
    if (heroHeightSlider && heroHeightValue) {
      const heroPreviewDiv = postEditorContainer.querySelector('.hero-preview');
      heroHeightSlider.addEventListener('input', function() {
        const heightPercent = parseInt(this.value);
        heroHeightValue.textContent = heightPercent;
        // Update padding-bottom to match actual display
        if (heroPreviewDiv) {
          heroPreviewDiv.style.paddingBottom = heightPercent + '%';
        }
        // Auto-save
        saveHeroDraft();
      });
    }

    // Opacity slider and overlay toggle handlers
    if (heroOverlayOpacitySlider && overlayOpacityValue) {
      heroOverlayOpacitySlider.addEventListener('input', function() {
        const opacity = parseFloat(this.value);
        overlayOpacityValue.textContent = opacity.toFixed(2);
        updateHeroPreview();
        saveHeroDraft();
      });
    }

    // Title overlay toggle handler
    if (heroTitleOverlayToggle) {
      heroTitleOverlayToggle.addEventListener('change', function() {
        updateHeroPreview();
        saveHeroDraft();
      });
    }

    // Update preview when title changes
    if (postTitleInput) {
      postTitleInput.addEventListener('input', updateHeroPreview);
    }

    // Show trash icon on hover
    const heroPreviewWrapper = postEditorContainer.querySelector('.hero-preview-wrapper');
    if (heroPreviewWrapper) {
      heroPreviewWrapper.addEventListener('mouseenter', function() {
        const removeBtn = this.querySelector('.btn-remove-hero');
        if (removeBtn) removeBtn.style.opacity = '1';
      });
      heroPreviewWrapper.addEventListener('mouseleave', function() {
        const removeBtn = this.querySelector('.btn-remove-hero');
        if (removeBtn) removeBtn.style.opacity = '0';
      });
    }

    // Hero remove button
    const heroRemoveBtn = postEditorContainer.querySelector('.btn-remove-hero');
    if (heroRemoveBtn) {
      heroRemoveBtn.addEventListener('click', function() {
        if (heroSelect) heroSelect.value = '';
        if (heroPreviewContainer) heroPreviewContainer.style.display = 'none';
        if (heroPreviewImg) heroPreviewImg.src = '';
        if (heroHeightSlider) {
          heroHeightSlider.value = 100;
          // Reset preview padding-bottom
          const heroPreviewDiv = postEditorContainer.querySelector('.hero-preview');
          if (heroPreviewDiv) heroPreviewDiv.style.paddingBottom = '100%';
        }
        if (heroHeightValue) heroHeightValue.textContent = '100';
      });
    }

    // Hero upload handlers
    const heroUploadInput = postEditorContainer.querySelector('.hero-upload-input');
    const heroUploadBtn = postEditorContainer.querySelector('.btn-upload-hero');

    // Show upload button when file is selected
    if (heroUploadInput) {
      heroUploadInput.addEventListener('change', function() {
        if (heroUploadBtn) {
          heroUploadBtn.style.display = this.files.length ? 'inline-block' : 'none';
        }
      });
    }

    // Handle hero upload
    if (heroUploadBtn) {
      heroUploadBtn.addEventListener('click', async function() {
        const file = heroUploadInput?.files[0];
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
          const originalText = heroUploadBtn.textContent;
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
            const variant400 = variants['400'];
            const previewUrl = variant400?.jpg
              ? '/storage/uploads/variants/400/' + variant400.jpg.split('/').pop()
              : '/storage/uploads/originals/' + data.data?.filename;
            if (heroPreviewImg) {
              heroPreviewImg.src = previewUrl;
            }
            if (heroPreviewContainer) heroPreviewContainer.style.display = 'block';

            // Set initial preview padding-bottom based on current slider value
            const heroPreviewDiv = postEditorContainer.querySelector('.hero-preview');
            const currentHeight = parseInt(heroHeightSlider?.value || 100);
            if (heroPreviewDiv) {
              heroPreviewDiv.style.paddingBottom = currentHeight + '%';
            }

            // Clear file input
            heroUploadInput.value = '';
            heroUploadBtn.style.display = 'none';
          } else {
            alert('Upload failed: ' + (data.error || 'Unknown error'));
          }

          heroUploadBtn.disabled = false;
          heroUploadBtn.textContent = originalText;
        } catch (error) {
          console.error('Error uploading hero image:', error);
          alert('An error occurred during upload');
          heroUploadBtn.disabled = false;
        }
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

    // Gallery upload handlers
    const galleryUploadInput = postEditorContainer.querySelector('.gallery-upload-input');
    const galleryUploadBtn = postEditorContainer.querySelector('.btn-upload-gallery');

    // Show upload button when files are selected
    if (galleryUploadInput) {
      galleryUploadInput.addEventListener('change', function() {
        if (galleryUploadBtn) {
          galleryUploadBtn.style.display = this.files.length ? 'inline-block' : 'none';
        }
      });
    }

    // Handle gallery upload
    if (galleryUploadBtn) {
      galleryUploadBtn.addEventListener('click', async function() {
        const files = Array.from(galleryUploadInput?.files || []);
        if (!files.length) return;

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

        try {
          galleryUploadBtn.disabled = true;
          const originalText = galleryUploadBtn.textContent;
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
              galleryMediaIds.push(data.id);
              addGalleryItemPreview(data.id, data.data);
            } else {
              alert(`Failed to upload ${file.name}: ` + (data.error || 'Unknown error'));
            }
          }

          // Clear file input
          galleryUploadInput.value = '';
          galleryUploadBtn.style.display = 'none';
          galleryUploadBtn.disabled = false;
          galleryUploadBtn.textContent = originalText;
        } catch (error) {
          console.error('Error uploading gallery images:', error);
          alert('An error occurred during upload');
          galleryUploadBtn.disabled = false;
        }
      });
    }

  // Save button handler (Save and Publish)
    postEditorContainer.querySelector('.btn-save-post').addEventListener('click', async function() {
      const saveBtn = this;
      const originalText = saveBtn.textContent;

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        // Check if there's a pending hero image file to upload
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
        const galleryFiles = Array.from(galleryUploadInput?.files || []);
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

        // Shared field extraction
        const heroImageHeightValue = uploadedHeroId ? parseInt(postEditorContainer.querySelector('.post-hero-height').value) : null;
        const heroCropOverlayValue = uploadedHeroId ? (postEditorContainer.querySelector('.post-hero-crop-overlay').checked ? 1 : 0) : 0;
        const heroTitleOverlayValue = uploadedHeroId ? (postEditorContainer.querySelector('.post-hero-title-overlay').checked ? 1 : 0) : 1;
        const heroOverlayOpacityValue = uploadedHeroId ? parseFloat(postEditorContainer.querySelector('.post-hero-overlay-opacity').value) : 0.70;

        const payload = {
          title: postEditorContainer.querySelector('.post-title').value,
          body_html: postBodyEditor ? window.getQuillHTML(postBodyEditor) : postEditorContainer.querySelector('.post-body').value,
          // status set below depending on new vs edit
          hero_media_id: uploadedHeroId,
          hero_image_height: heroImageHeightValue,
          hero_crop_overlay: heroCropOverlayValue,
          hero_title_overlay: heroTitleOverlayValue,
          hero_overlay_opacity: heroOverlayOpacityValue,
          gallery_media_ids: galleryMediaIds
        };

        if (editingPostId) {
          // Editing existing post: save draft then publish via confirmation
          saveBtn.textContent = 'Publishing changes...';
          const draftSave = await api('/api/admin/posts-draft.php?id=' + editingPostId, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
          });
          if (!draftSave.success) {
            alert('Error saving draft: ' + (draftSave.error || 'Unknown error'));
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
            return;
          }
          const proceeded = await window.publishConfirmation.confirmAndPublish(editingPostId, async () => {
            const publishResult = await api('/api/admin/posts.php?action=publish&id=' + editingPostId, { method: 'GET' });
            if (!publishResult.success) {
              throw new Error(publishResult.error || 'Unknown error');
            }
          });
          if (proceeded) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
            if (typeof window.refreshPostsList === 'function') {
              await window.refreshPostsList();
            } else {
              window.location.reload();
            }
          } else {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
          }
        } else {
          // New post: ALWAYS confirm before publishing.
          // 1) Create as draft to obtain an ID
          saveBtn.textContent = 'Creating draft...';
          const createDraftRes = await api('/api/admin/posts.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ ...payload, status: 'draft' })
          });
          if (!createDraftRes.success || !createDraftRes.id) {
            alert('Error creating draft: ' + (createDraftRes.error || 'Unknown error'));
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
            return;
          }
          const newId = createDraftRes.id;

          // Set up edit state now that we have an ID (enable autosave, etc.)
          editingPostId = newId;
          if (postBodyEditor) {
            if (postAutoSave) {
              if (typeof postAutoSave.cleanup === 'function') {
                postAutoSave.cleanup();
              } else {
                clearInterval(postAutoSave);
              }
            }
            postAutoSave = setupPostAutoSave(postBodyEditor, editingPostId);
          }
          const saveDraftBtn = postEditorContainer.querySelector('.btn-save-draft');
          if (saveDraftBtn) saveDraftBtn.style.display = 'none';

          // 2) Ask for confirmation and publish on proceed
          saveBtn.textContent = 'Confirming publish...';
          const proceeded = await window.publishConfirmation.confirmAndPublish(
            newId,
            async () => {
              const publishResult = await api('/api/admin/posts.php?action=publish&id=' + newId, { method: 'GET' });
              if (!publishResult.success) {
                throw new Error(publishResult.error || 'Unknown error');
              }
            },
            async () => {
              // Publish without sending emails: use skip_email flag on publish endpoint
              const publishResult = await api('/api/admin/posts.php?action=publish&id=' + newId + '&skip_email=1', { method: 'GET' });
              if (!publishResult.success) {
                throw new Error(publishResult.error || 'Unknown error');
              }
            }
          );

          if (proceeded) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
            if (typeof window.refreshPostsList === 'function') {
              await window.refreshPostsList();
            } else {
              window.location.reload();
            }
          } else {
            // User cancelled: keep as draft and remain in editor
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
            // Emit cancel event for any other listeners
            document.dispatchEvent(new CustomEvent('publish-confirmation:button-restored', { detail: { postId: newId } }));
          }
        }
      } catch (error) {
        console.error('Error saving post:', error);
        alert('An error occurred while saving the post');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
      }
    });

    // Save Draft button handler (save draft and close without publishing/email)
    // Use shared handler from post-draft-handler.js
    if (typeof window.setupSaveDraftHandler === 'function') {
      window.setupSaveDraftHandler({
        modal: modal,
        postEditorContainer: postEditorContainer,
        getPostBodyEditor: () => postBodyEditor,
        getEditingId: () => editingPostId,
        getGalleryMediaIds: () => galleryMediaIds,
        refreshPostsList: window.refreshPostsList,
        api: api
      });
    }

    // Cancel button handler
    postEditorContainer.querySelector('.btn-cancel-post').addEventListener('click', function() {
      const bsModal = bootstrap.Modal.getInstance(modal);
      if (bsModal) bsModal.hide();
    });

    // Clean up on modal hide
    modal.addEventListener('hidden.bs.modal', function() {
      editingPostId = null;
      galleryMediaIds = [];

      // Clear post auto-save interval
      if (postAutoSave) {
        if (typeof postAutoSave.cleanup === 'function') {
          postAutoSave.cleanup();
        } else {
          clearInterval(postAutoSave);
        }
        postAutoSave = null;
      }

      // Reset autosave indicator for the next new post open
      const statusEl = postEditorContainer.querySelector('#post-autosave-status-home-edit');
      if (statusEl) {
        statusEl.innerHTML = '<span class="text-muted">Save post to enable auto-save</span>';
        statusEl.className = 'editor-autosave-indicator';
      }
    });
  })(); // End of IIFE
  } // End of if (postEditorModal)
}); // End of DOMContentLoaded for post editor
