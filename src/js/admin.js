(function(){
  const root = document.getElementById('adminApp');
  if (!root) return;
  const CSRF = root.getAttribute('data-csrf') || '';

  // CKEditor instances
  let heroEditor = null;
  let bioEditor = null;
  let donateEditor = null;
  let postBodyEditor = null;

  // Auto-save intervals
  let heroAutoSave = null;
  let bioAutoSave = null;
  let donateAutoSave = null;
  let postAutoSave = null;

  // Auto-save helper function
  function setupAutoSave(editor, fieldName, interval = 10000) {
    let lastSavedContent = '';
    let statusElementId = '';
    let initialized = false;

    // Map field names to status element IDs
    const statusMap = {
      'hero_html': 'hero-autosave-status',
      'site_bio_html': 'about-autosave-status',
      'donate_text_html': 'donation-autosave-status'
    };

    statusElementId = statusMap[fieldName];
    const statusElement = document.getElementById(statusElementId);

    // Set initial status
    if (statusElement) {
      statusElement.innerHTML = '<span class="text-muted">Auto-save enabled</span>';
      statusElement.className = 'editor-autosave-indicator';
    }

    return setInterval(() => {
      if (!editor) return;

      const currentContent = editor.getData();

      // Initialize lastSavedContent on first run
      if (!initialized) {
        lastSavedContent = currentContent;
        initialized = true;
        return;
      }

      // Only save if content has changed
      if (currentContent !== lastSavedContent) {
        lastSavedContent = currentContent;

        // Update status to "Saving..." with icon
        if (statusElement) {
          statusElement.innerHTML = '<span class="saving">💾 Saving...</span>';
          statusElement.className = 'editor-autosave-indicator';
        }

        const payload = {};
        payload[fieldName] = currentContent;

        // Silent save without alert
        api('/api/admin/settings.php', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
        }).then(j => {
          if (j.success) {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`Auto-saved ${fieldName} at ${timestamp}`);

            // Update status to show last saved time (no icon)
            if (statusElement) {
              statusElement.innerHTML = `<span class="saved">Last saved: ${timestamp}</span>`;
              statusElement.className = 'editor-autosave-indicator';
            }
          } else {
            console.error(`Auto-save failed for ${fieldName}:`, j.error);
            if (statusElement) {
              statusElement.innerHTML = '<span class="text-danger">⚠️ Save failed</span>';
              statusElement.className = 'editor-autosave-indicator';
            }
          }
        }).catch(err => {
          console.error(`Auto-save error for ${fieldName}:`, err);
          if (statusElement) {
            statusElement.innerHTML = '<span class="text-danger">⚠️ Save error</span>';
            statusElement.className = 'editor-autosave-indicator';
          }
        });
      }
    }, interval);
  }

  // Auto-save helper function for posts (requires post ID)
  function setupPostAutoSave(editor, postId, interval = 10000) {
    let lastSavedContent = '';
    let initialized = false;
    const statusElement = document.getElementById('post-autosave-status');

    // Set initial status
    if (statusElement) {
      statusElement.innerHTML = '<span class="text-muted">Auto-save enabled</span>';
      statusElement.className = 'editor-autosave-indicator';
    }

    return setInterval(() => {
      if (!editor || !postId) return;

      const currentContent = editor.getData();

      // Initialize lastSavedContent on first run
      if (!initialized) {
        lastSavedContent = currentContent;
        initialized = true;
        return;
      }

      // Only save if content has changed
      if (currentContent !== lastSavedContent) {
        lastSavedContent = currentContent;

        // Update status to "Saving..." with icon
        if (statusElement) {
          statusElement.innerHTML = '<span class="saving">💾 Saving...</span>';
          statusElement.className = 'editor-autosave-indicator';
        }

        const payload = {
          body_html: currentContent
        };

        // Silent save without alert
        api(`/api/admin/posts.php?id=${postId}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
        }).then(j => {
          if (j.success) {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`Auto-saved post ${postId} at ${timestamp}`);

            // Update status to show last saved time (no icon)
            if (statusElement) {
              statusElement.innerHTML = `<span class="saved">Last saved: ${timestamp}</span>`;
              statusElement.className = 'editor-autosave-indicator';
            }
          } else {
            console.error(`Auto-save failed for post ${postId}:`, j.error);
            if (statusElement) {
              statusElement.innerHTML = '<span class="text-danger">⚠️ Save failed</span>';
              statusElement.className = 'editor-autosave-indicator';
            }
          }
        }).catch(err => {
          console.error(`Auto-save error for post ${postId}:`, err);
          if (statusElement) {
            statusElement.innerHTML = '<span class="text-danger">⚠️ Save error</span>';
            statusElement.className = 'editor-autosave-indicator';
          }
        });
      }
    }, interval);
  }

  // Simple helper
  const api = (url, opts={}) => {
    opts.headers = Object.assign({'X-CSRF-Token': CSRF}, opts.headers||{});
    return fetch(url, opts).then(r => r.json());
  };

  // Dashboard
  function loadDashboard(){
    // Check if dashboard elements exist before loading
    const postsTotal = document.getElementById('postsTotal');
    if (!postsTotal) return; // Dashboard not present on this page

    fetch('/api/admin/dashboard.php').then(r=>r.json()).then(j=>{
      if(!j.success) return;
      postsTotal.innerText = j.data.posts_total;
      document.getElementById('postsPublished').innerText = j.data.posts_published;
      document.getElementById('mediaTotal').innerText = j.data.media_total;
      const ul = document.getElementById('recentPosts');
      if (ul) {
        ul.innerHTML='';
        j.data.recent_posts.forEach(p=>{
          const li = document.createElement('li'); li.className='list-group-item';
          li.textContent = `#${p.id} ${p.title||'(untitled)'} — ${p.published_at||p.created_at}`;
          ul.appendChild(li);
        });
      }
    }).catch(err => {
      console.error('Dashboard load error:', err);
    });
  }

  // Settings
  function loadSettings(){
    fetch('/api/admin/settings.php').then(r=>r.json()).then(j=>{
      if(!j.success||!j.data) return;
      document.getElementById('site_title').value = j.data.site_title||'';

      // Load visibility toggles
      document.getElementById('show_hero').checked = j.data.show_hero == 1;
      document.getElementById('show_about').checked = j.data.show_about == 1;
      document.getElementById('show_donation').checked = j.data.show_donation == 1;

      // Load hero media ID
      const heroMediaId = j.data.hero_media_id || '';
      const heroMediaSelect = document.getElementById('hero_media_id');
      if (heroMediaSelect) {
        heroMediaSelect.value = heroMediaId;
        // Trigger change to show preview
        if (heroMediaId) {
          heroMediaSelect.dispatchEvent(new Event('change'));
        }
      }

      // Load hero HTML into editor
      const heroHtml = j.data.hero_html||'';
      if (heroEditor) {
        heroEditor.setData(heroHtml);
      } else {
        document.getElementById('hero_html').value = heroHtml;
      }

      document.getElementById('cta_text').value = j.data.cta_text||'';
      document.getElementById('cta_url').value = j.data.cta_url||'';
      document.getElementById('hero_overlay_opacity').value = j.data.hero_overlay_opacity||0.5;
      document.getElementById('hero_overlay_color').value = j.data.hero_overlay_color||'#000000';

      // Load bio HTML into editor
      const bioHtml = j.data.site_bio_html||'';
      if (bioEditor) {
        bioEditor.setData(bioHtml);
      } else {
        document.getElementById('site_bio_html').value = bioHtml;
      }

      // Load donate HTML into editor
      const donateHtml = j.data.donate_text_html||'';
      if (donateEditor) {
        donateEditor.setData(donateHtml);
      } else {
        document.getElementById('donate_text_html').value = donateHtml;
      }

      try {
        const ds = j.data.donation_settings_json ? JSON.parse(j.data.donation_settings_json) : {};
        document.getElementById('donation_presets').value = (ds.preset_amounts||[]).join(',');
      } catch(e) {}

      // Load AI system prompt
      document.getElementById('ai_system_prompt').value = j.data.ai_system_prompt || '';
    });
  }

  // Save hero/settings
  document.getElementById('heroForm').addEventListener('submit', function(e){
    e.preventDefault();
    const payload = {
      show_hero: document.getElementById('show_hero').checked ? 1 : 0,
      hero_media_id: document.getElementById('hero_media_id').value || null,
      hero_html: heroEditor ? heroEditor.getData() : document.getElementById('hero_html').value,
      cta_text: document.getElementById('cta_text').value,
      cta_url: document.getElementById('cta_url').value,
      hero_overlay_opacity: document.getElementById('hero_overlay_opacity').value,
      hero_overlay_color: document.getElementById('hero_overlay_color').value,
    };
    api('/api/admin/settings.php', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(j=>{
      alert(j.success? 'Saved hero settings' : ('Error: '+j.error));
    });
  });

  document.getElementById('aboutForm').addEventListener('submit', function(e){
    e.preventDefault();
    const payload = {
      show_about: document.getElementById('show_about').checked ? 1 : 0,
      site_bio_html: bioEditor ? bioEditor.getData() : document.getElementById('site_bio_html').value,
    };
    api('/api/admin/settings.php', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(j=>{
      alert(j.success? 'Saved about section' : ('Error: '+j.error));
    });
  });

  document.getElementById('donationForm').addEventListener('submit', function(e){
    e.preventDefault();
    const payload = {
      show_donation: document.getElementById('show_donation').checked ? 1 : 0,
      donate_text_html: donateEditor ? donateEditor.getData() : document.getElementById('donate_text_html').value,
    };
    api('/api/admin/settings.php', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(j=>{
      alert(j.success? 'Saved donation section' : ('Error: '+j.error));
    });
  });

  document.getElementById('settingsForm').addEventListener('submit', function(e){
    e.preventDefault();
    const presets = document.getElementById('donation_presets').value.split(',').map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n));
    const payload = {
      site_title: document.getElementById('site_title').value,
      donation_settings_json: JSON.stringify({preset_amounts: presets}),
      ai_system_prompt: document.getElementById('ai_system_prompt').value
    };
    api('/api/admin/settings.php', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(j=>{
      alert(j.success? 'Saved settings' : ('Error: '+j.error));
    });
  });

  // Reset AI prompt to default
  const defaultAIPrompt = 'You are a helpful assistant that creates concise, engaging titles for health update posts. The title should be short (3-8 words), empathetic, and capture the essence of the update. Return ONLY the title text, nothing else.';
  document.getElementById('btnResetAIPrompt').addEventListener('click', function(e){
    e.preventDefault();
    if (confirm('Reset AI system prompt to default?')) {
      document.getElementById('ai_system_prompt').value = defaultAIPrompt;
    }
  });

  // Auto-save visibility toggles when changed
  const showHeroCheckbox = document.getElementById('show_hero');
  if (showHeroCheckbox) {
    showHeroCheckbox.addEventListener('change', function() {
      const payload = { show_hero: this.checked ? 1 : 0 };
      api('/api/admin/settings.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      }).then(j => {
        if (j.success) {
          console.log('Hero visibility updated:', this.checked);
        } else {
          console.error('Error updating hero visibility:', j.error);
          // Revert checkbox on error
          this.checked = !this.checked;
        }
      });
    });
  }

  const showAboutCheckbox = document.getElementById('show_about');
  if (showAboutCheckbox) {
    showAboutCheckbox.addEventListener('change', function() {
      const payload = { show_about: this.checked ? 1 : 0 };
      api('/api/admin/settings.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      }).then(j => {
        if (j.success) {
          console.log('About visibility updated:', this.checked);
        } else {
          console.error('Error updating about visibility:', j.error);
          // Revert checkbox on error
          this.checked = !this.checked;
        }
      });
    });
  }

  const showDonationCheckbox = document.getElementById('show_donation');
  if (showDonationCheckbox) {
    showDonationCheckbox.addEventListener('change', function() {
      const payload = { show_donation: this.checked ? 1 : 0 };
      api('/api/admin/settings.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      }).then(j => {
        if (j.success) {
          console.log('Donation visibility updated:', this.checked);
        } else {
          console.error('Error updating donation visibility:', j.error);
          // Revert checkbox on error
          this.checked = !this.checked;
        }
      });
    });
  }

  // Move modal to body first (fix z-index stacking issue)
  // Modal must be direct child of body, not nested in framework containers
  const postEditorModal = document.getElementById('postEditorModal');
  if (postEditorModal && postEditorModal.parentElement !== document.body) {
    document.body.appendChild(postEditorModal);
  }

  // Move media delete modal to body as well
  const mediaDeleteModal = document.getElementById('mediaDeleteModal');
  if (mediaDeleteModal && mediaDeleteModal.parentElement !== document.body) {
    document.body.appendChild(mediaDeleteModal);
  }

  // Posts - minimal list/create
  const postsList = document.getElementById('postsList');
  const postEditorContainer = postEditorModal.querySelector('.modal-body');
  const btnNewPost = document.getElementById('btnNewPost');
  let editingId = null;
  let galleryMediaIds = []; // Track gallery image IDs in order

  // Helper function to upload hero image
  async function uploadHeroImage(file) {
    if (!file) return null;

    // Validate file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('File size must be less than 20MB');
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please use JPG, PNG, WebP, or HEIC');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('alt_text', '');

    const response = await fetch('/api/admin/media.php', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': CSRF
      },
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      const heroSelect = postEditorContainer.querySelector('.post-hero-media');
      const heroPreview = postEditorContainer.querySelector('.hero-preview');
      const heroPreviewImg = heroPreview ? heroPreview.querySelector('img') : null;

      // Add to select dropdown
      const option = document.createElement('option');
      option.value = data.id;
      option.textContent = file.name;
      option.selected = true;
      heroSelect.appendChild(option);

      // Show preview
      if (heroPreviewImg && heroPreview) {
        const variants = JSON.parse(data.data?.variants_json || '{}');
        const variant400 = variants['400'];
        const previewUrl = variant400?.jpg
          ? '/storage/uploads/variants/400/' + variant400.jpg.split('/').pop()
          : '/storage/uploads/originals/' + data.data?.filename;
        heroPreviewImg.src = previewUrl;
        heroPreview.style.display = 'block';
      }

      return data.id;
    } else {
      throw new Error(data.error || 'Upload failed');
    }
  }

  // Helper function to upload gallery images
  async function uploadGalleryImages(files, addToGalleryFn) {
    const uploadedIds = [];

    for (const file of files) {
      // Validate each file
      if (file.size > 20 * 1024 * 1024) {
        console.warn(`${file.name} is too large (max 20MB), skipping`);
        continue;
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
      if (!validTypes.includes(file.type)) {
        console.warn(`${file.name} has invalid type, skipping`);
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('alt_text', '');

      const response = await fetch('/api/admin/media.php', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': CSRF
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        uploadedIds.push(data.id);
        galleryMediaIds.push(data.id);
        // If addToGalleryFn provided, call it to show preview
        if (addToGalleryFn) {
          addToGalleryFn(data.id, data.data);
        }
      } else {
        console.error(`Failed to upload ${file.name}:`, data.error);
      }
    }

    return uploadedIds;
  }

  function loadPosts(){
    fetch('/api/admin/posts.php').then(r=>r.json()).then(j=>{
      if(!j.success) return; postsList.innerHTML='';
      const table = document.createElement('table'); table.className='table table-striped';
      table.innerHTML = '<thead><tr><th>ID</th><th>Title</th><th>Published</th><th>Created</th><th>Actions</th></tr></thead>';
      const tbody = document.createElement('tbody');
      (j.data||[]).forEach(p=>{
        const tr = document.createElement('tr');
        const isPublished = p.status === 'published';
        const publishedDate = p.published_at ? new Date(p.published_at).toLocaleDateString() : '';

        // Create toggle switch HTML
        const toggleHtml = `
          <div class="form-check form-switch">
            <input class="form-check-input publish-toggle" type="checkbox"
              data-id="${p.id}" ${isPublished ? 'checked' : ''}>
            <label class="form-check-label small text-muted">
              ${isPublished ? publishedDate : 'Draft'}
            </label>
          </div>
        `;

        tr.innerHTML = `
          <td>${p.id}</td>
          <td>${p.title || '(untitled)'}</td>
          <td>${toggleHtml}</td>
          <td>${p.created_at}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary btn-edit-post" data-id="${p.id}" data-bs-toggle="modal" data-bs-target="#postEditorModal">Edit</button>
            <button class="btn btn-sm btn-outline-danger" data-del="${p.id}">Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody); postsList.appendChild(table);
    });
  }

  postsList.addEventListener('click', function(e){
    // Prevent toggle switches from triggering edit
    if (e.target.classList.contains('publish-toggle') || e.target.classList.contains('form-check-label')) {
      return;
    }

    const id = e.target.getAttribute('data-id');
    const del = e.target.getAttribute('data-del');

    if (id && e.target.classList.contains('btn-edit-post')) {
      // Edit button clicked - store the ID, data will load when modal opens
      editingId = parseInt(id,10);
    }

    if (del) {
      if (!confirm('Delete this post?')) return;
      api('/api/admin/posts.php?id='+del, {method:'DELETE'}).then(j=>{ loadPosts(); });
    }
  });

  // Handle publish toggle switches
  postsList.addEventListener('change', function(e){
    if (e.target.classList.contains('publish-toggle')) {
      const postId = e.target.getAttribute('data-id');
      const isPublished = e.target.checked;

      // Disable toggle while updating
      e.target.disabled = true;

      const payload = {
        status: isPublished ? 'published' : 'draft',
        published_at: isPublished ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null
      };

      api('/api/admin/posts.php?id=' + postId, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      }).then(j => {
        if (j.success) {
          // Reload the posts list to show updated date
          loadPosts();
        } else {
          alert('Error updating post status: ' + (j.error || 'Unknown error'));
          // Revert the toggle
          e.target.checked = !isPublished;
          e.target.disabled = false;
        }
      }).catch(err => {
        console.error('Error toggling publish status:', err);
        alert('An error occurred while updating the post');
        e.target.checked = !isPublished;
        e.target.disabled = false;
      });
    }
  });

  // When New Post button is clicked (modal opens via data-bs-toggle)
  btnNewPost.addEventListener('click', function(){
    editingId = null;
  });

  // Cancel button in post editor - use Bootstrap's dismiss
  postEditorContainer.querySelector('.btn-cancel-post').setAttribute('data-bs-dismiss', 'modal');

  // Save button in post editor
  postEditorContainer.querySelector('.btn-save-post').addEventListener('click', async function(){
    const saveBtn = this;
    const originalText = saveBtn.textContent;

    try {
      saveBtn.disabled = true;

      // Check if there are pending hero image uploads
      const heroUploadInput = postEditorContainer.querySelector('.hero-upload-input');
      const heroSelect = postEditorContainer.querySelector('.post-hero-media');
      if (heroUploadInput && heroUploadInput.files.length > 0) {
        saveBtn.textContent = 'Uploading hero image...';
        try {
          await uploadHeroImage(heroUploadInput.files[0]);
          // Clear the file input
          heroUploadInput.value = '';
          const heroUploadBtn = postEditorContainer.querySelector('.btn-upload-hero');
          if (heroUploadBtn) heroUploadBtn.style.display = 'none';
        } catch (error) {
          alert('Hero image upload failed: ' + error.message);
          saveBtn.disabled = false;
          saveBtn.textContent = originalText;
          return;
        }
      }

      // Check if there are pending gallery uploads
      const galleryUploadInput = postEditorContainer.querySelector('.gallery-upload-input');
      if (galleryUploadInput && galleryUploadInput.files.length > 0) {
        const fileCount = galleryUploadInput.files.length;
        saveBtn.textContent = `Uploading ${fileCount} gallery image${fileCount > 1 ? 's' : ''}...`;
        try {
          await uploadGalleryImages(Array.from(galleryUploadInput.files));
          // Clear the file input
          galleryUploadInput.value = '';
          const galleryUploadBtn = postEditorContainer.querySelector('.btn-upload-gallery');
          if (galleryUploadBtn) galleryUploadBtn.style.display = 'none';
        } catch (error) {
          alert('Gallery upload failed: ' + error.message);
          saveBtn.disabled = false;
          saveBtn.textContent = originalText;
          return;
        }
      }

      saveBtn.textContent = 'Saving post...';

      const payload = {
        title: postEditorContainer.querySelector('.post-title').value,
        body_html: postBodyEditor ? postBodyEditor.getData() : postEditorContainer.querySelector('.post-body').value,
        status: postEditorContainer.querySelector('.post-status').value,
        hero_media_id: heroSelect.value || null,
        gallery_media_ids: galleryMediaIds
      };

      if (editingId) {
        const j = await api('/api/admin/posts.php?id='+editingId, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
        if(j.success){
          loadPosts();
          const modalEl = bootstrap.Modal.getInstance(postEditorModal);
          if (modalEl) modalEl.hide();
        } else {
          alert('Error: ' + (j.error || 'Unknown error'));
        }
      } else {
        const j = await api('/api/admin/posts.php', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
        if(j.success){
          loadPosts();
          const modalEl = bootstrap.Modal.getInstance(postEditorModal);
          if (modalEl) modalEl.hide();
        } else {
          alert('Error: ' + (j.error || 'Unknown error'));
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

  // Media
  const uploadForm = document.getElementById('uploadForm');
  const mediaGrid = document.getElementById('mediaGrid');
  uploadForm.addEventListener('submit', function(e){
    e.preventDefault();
    const f = document.getElementById('mediaFile').files[0];
    if (!f) return alert('Choose a file');
    if (f.size > 20*1024*1024) return alert('Max 20MB');
    const fd = new FormData(); fd.append('file', f); fd.append('alt_text', document.getElementById('mediaAlt').value||'');
    fetch('/api/admin/media.php', {method:'POST', headers:{'X-CSRF-Token': CSRF}, body: fd}).then(r=>r.json()).then(j=>{
      if (j.success) { loadMedia(); uploadForm.reset(); } else alert(j.error||'Upload failed');
    });
  });

  function loadMedia(){
    fetch('/api/admin/media.php').then(r=>r.json()).then(j=>{
      mediaGrid.innerHTML = '';
      (j.data||[]).forEach(m=>{
        const col = document.createElement('div'); col.className='col';
        const card = document.createElement('div'); card.className='card position-relative media-card';
        const img = document.createElement('img'); img.className='card-img-top';
        try {
          const vars = JSON.parse(m.variants_json||'{}');
          const variant400 = vars['400'];
          if (variant400 && variant400.jpg) {
            img.src = '/storage/uploads/variants/400/' + variant400.jpg.split('/').pop();
          } else {
            img.src = '/storage/uploads/originals/' + m.filename;
          }
        } catch(e) {
          img.src = '/storage/uploads/originals/' + m.filename;
        }
        const body = document.createElement('div'); body.className='card-body'; body.innerHTML = `<small>${m.original_filename}</small>`;

        // Add trash icon button (hidden by default, shows on hover)
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-sm position-absolute top-0 end-0 m-2 media-delete-btn';
        deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
        deleteBtn.style.opacity = '0';
        deleteBtn.style.transition = 'opacity 0.2s';
        deleteBtn.dataset.mediaId = m.id;
        deleteBtn.dataset.mediaFilename = m.original_filename;
        deleteBtn.title = 'Delete image';

        // Show/hide delete button on hover
        card.addEventListener('mouseenter', function() {
          deleteBtn.style.opacity = '1';
        });
        card.addEventListener('mouseleave', function() {
          deleteBtn.style.opacity = '0';
        });

        // Handle delete click
        deleteBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          handleMediaDelete(m.id, m.original_filename);
        });

        card.appendChild(img);
        card.appendChild(deleteBtn);
        card.appendChild(body);
        col.appendChild(card);
        mediaGrid.appendChild(col);
      });

      // Also populate hero media dropdown in post editor
      populateHeroMediaDropdown(j.data || []);

      // Also populate hero banner media dropdown
      populateHeroBannerMediaDropdown(j.data || []);
    });
  }

  function populateHeroBannerMediaDropdown(mediaList) {
    const heroSelect = document.getElementById('hero_media_id');
    if (!heroSelect) return;

    // Clear existing options except the first one (None)
    while (heroSelect.options.length > 1) {
      heroSelect.remove(1);
    }

    // Add media options
    mediaList.forEach(m => {
      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = m.original_filename + ' (' + m.width + 'x' + m.height + ')';
      heroSelect.appendChild(option);
    });
  }

  function populateHeroMediaDropdown(mediaList) {
    const heroSelect = postEditorContainer.querySelector('.post-hero-media');
    if (!heroSelect) return;

    // Clear existing options except the first one
    while (heroSelect.options.length > 1) {
      heroSelect.remove(1);
    }

    // Add media options
    mediaList.forEach(m => {
      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = m.original_filename + ' (' + m.width + 'x' + m.height + ')';
      heroSelect.appendChild(option);
    });
  }

  // Handle media deletion with confirmation
  let pendingDeleteMediaId = null;

  async function handleMediaDelete(mediaId, filename) {
    try {
      // First, check which posts use this media
      const response = await fetch(`/api/admin/media.php?check_usage=${mediaId}`);
      const data = await response.json();

      if (!data.success) {
        console.error('Error checking media usage');
        return;
      }

      const affectedPosts = data.data || [];

      // Store the media ID for deletion
      pendingDeleteMediaId = mediaId;

      // Populate modal
      const filenameEl = document.getElementById('mediaDeleteFilename');
      const warningEl = document.getElementById('mediaDeleteWarning');
      const noUsageEl = document.getElementById('mediaDeleteNoUsage');
      const affectedListEl = document.getElementById('mediaDeleteAffectedList');

      filenameEl.textContent = `Delete "${filename}"?`;
      affectedListEl.innerHTML = '';

      if (affectedPosts.length > 0) {
        warningEl.classList.remove('d-none');
        noUsageEl.classList.add('d-none');

        affectedPosts.forEach(post => {
          const li = document.createElement('li');
          li.textContent = `${post.title} (${post.usage})`;
          affectedListEl.appendChild(li);
        });
      } else {
        warningEl.classList.add('d-none');
        noUsageEl.classList.remove('d-none');
      }

      // Show modal
      const modal = new bootstrap.Modal(document.getElementById('mediaDeleteModal'));
      modal.show();
    } catch (error) {
      console.error('Error checking media usage:', error);
    }
  }

  // Handle confirm delete button in modal
  document.getElementById('confirmMediaDelete').addEventListener('click', async function() {
    if (!pendingDeleteMediaId) return;

    try {
      const deleteResponse = await api(`/api/admin/media.php?id=${pendingDeleteMediaId}`, {
        method: 'DELETE'
      });

      if (deleteResponse.success) {
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('mediaDeleteModal'));
        if (modal) modal.hide();

        // Reload media gallery
        loadMedia();
      } else {
        console.error('Error deleting image:', deleteResponse.error);
      }
    } catch (error) {
      console.error('Error deleting media:', error);
    } finally {
      pendingDeleteMediaId = null;
    }
  });

  // Initialize
  loadDashboard();
  loadSettings();
  loadPosts();
  loadMedia();

  // Restore last active tab from sessionStorage or default to Posts
  const lastActiveTab = sessionStorage.getItem('adminActiveTab') || '#pane-posts';
  const tabButton = document.querySelector(`button[data-bs-target="${lastActiveTab}"]`);
  if (tabButton) {
    const tab = new bootstrap.Tab(tabButton);
    tab.show();
  }

  // Reveal the tab content now that the correct tab is active
  const tabContent = document.getElementById('adminTabContent');
  if (tabContent) {
    tabContent.style.visibility = 'visible';
  }

  // Save active tab to sessionStorage when changed
  const tabButtons = document.querySelectorAll('#adminTabs button[data-bs-toggle="tab"]');
  tabButtons.forEach(button => {
    button.addEventListener('shown.bs.tab', function(e) {
      const target = e.target.getAttribute('data-bs-target');
      sessionStorage.setItem('adminActiveTab', target);
    });
  });

  // Initialize CKEditor instances for hero and bio
  // Wait a bit for the DOM to be ready and tabs to be rendered
  setTimeout(() => {
    // Hero HTML editor
    const heroTextarea = document.getElementById('hero_html');
    if (heroTextarea) {
      ClassicEditor
        .create(heroTextarea, {
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
          autosave: {
            save(editor) {
              return Promise.resolve();
            }
          },
          initialData: '',
          placeholder: 'Enter hero banner text...'
        })
        .then(editor => {
          heroEditor = editor;

          // Set up auto-save every 10 seconds
          heroAutoSave = setupAutoSave(editor, 'hero_html', 10000);

          // Apply custom height styles to make it resizable
          const editorElement = editor.ui.view.editable.element;
          if (editorElement) {
            editorElement.style.minHeight = '200px';
            editorElement.style.maxHeight = '600px';
            editorElement.style.overflowY = 'auto';
            editorElement.style.resize = 'vertical';
          }

          // Reload settings to populate editor
          loadSettings();
        })
        .catch(error => {
          console.error('Hero editor initialization error:', error);
        });
    }

    // Site Bio editor
    const bioTextarea = document.getElementById('site_bio_html');
    if (bioTextarea) {
      ClassicEditor
        .create(bioTextarea, {
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
          autosave: {
            save(editor) {
              return Promise.resolve();
            }
          },
          initialData: '',
          placeholder: 'Enter about section content...'
        })
        .then(editor => {
          bioEditor = editor;

          // Set up auto-save every 10 seconds
          bioAutoSave = setupAutoSave(editor, 'site_bio_html', 10000);

          // Apply custom height styles to make it resizable
          const editorElement = editor.ui.view.editable.element;
          if (editorElement) {
            editorElement.style.minHeight = '300px';
            editorElement.style.maxHeight = '800px';
            editorElement.style.overflowY = 'auto';
            editorElement.style.resize = 'vertical';
          }

          // Reload settings to populate editor
          loadSettings();
        })
        .catch(error => {
          console.error('Bio editor initialization error:', error);
        });
    }

    // Donate editor
    const donateTextarea = document.getElementById('donate_text_html');
    if (donateTextarea) {
      ClassicEditor
        .create(donateTextarea, {
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
          autosave: {
            save(editor) {
              return Promise.resolve();
            }
          },
          initialData: '',
          placeholder: 'Enter donation section content...'
        })
        .then(editor => {
          donateEditor = editor;

          // Set up auto-save every 10 seconds
          donateAutoSave = setupAutoSave(editor, 'donate_text_html', 10000);

          // Apply custom height styles to make it resizable
          const editorElement = editor.ui.view.editable.element;
          if (editorElement) {
            editorElement.style.minHeight = '300px';
            editorElement.style.maxHeight = '800px';
            editorElement.style.overflowY = 'auto';
            editorElement.style.resize = 'vertical';
          }

          // Reload settings to populate editor
          loadSettings();
        })
        .catch(error => {
          console.error('Donate editor initialization error:', error);
        });
    }

    // Post body editor (initialize early to prevent modal height jumping)
    const postBodyTextarea = postEditorContainer.querySelector('.post-body');
    if (postBodyTextarea) {
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
          autosave: {
            save(editor) {
              return Promise.resolve();
            }
          },
          initialData: '',
          placeholder: 'Write your post content here...'
        })
        .then(editor => {
          postBodyEditor = editor;

          // Apply custom height styles to make it resizable
          const editorElement = editor.ui.view.editable.element;
          if (editorElement) {
            editorElement.style.minHeight = '400px';
            editorElement.style.maxHeight = '1000px';
            editorElement.style.overflowY = 'auto';
            editorElement.style.resize = 'vertical';
          }

          // Initialize AI title generator with editor instance
          if (typeof window.initAITitleGenerator === 'function') {
            window.initAITitleGenerator(postEditorContainer, postBodyEditor);
          }
        })
        .catch(error => {
          console.error('Post body editor initialization error:', error);
        });
    }

    // Setup modal event handlers
    postEditorModal.addEventListener('shown.bs.modal', function() {
      // Clear gallery preview first (for both new and edit)
      const galleryPreview = postEditorContainer.querySelector('#galleryPreview');
      if (galleryPreview) {
        galleryPreview.innerHTML = '';
        galleryPreview.classList.add('empty');
      }
      galleryMediaIds = [];

      // Load post data if editing
      if (editingId) {
        console.log('Loading post data for ID:', editingId);
        fetch('/api/admin/posts.php?id=' + editingId).then(r=>r.json()).then(j=>{
          console.log('Post data received:', j);
          if(j.success && j.data) {
            const post = j.data;

            console.log('Using post data:', post);

            postEditorContainer.querySelector('.post-title').value = post.title || '';
            postEditorContainer.querySelector('.post-status').value = post.status || 'draft';

            // Set post body in editor
            if (postBodyEditor) {
              postBodyEditor.setData(post.body_html || '');

              // Set up auto-save for this post (only when editing existing post)
              if (postAutoSave) {
                clearInterval(postAutoSave);
              }
              postAutoSave = setupPostAutoSave(postBodyEditor, editingId, 10000);
            } else {
              postEditorContainer.querySelector('.post-body').value = post.body_html || '';
            }

            // Set hero image if exists
            if (post.hero_media_id) {
              const heroSelect = postEditorContainer.querySelector('.post-hero-media');
              if (heroSelect) {
                heroSelect.value = post.hero_media_id;
                // Trigger change to show preview
                heroSelect.dispatchEvent(new Event('change'));
              }
            } else {
              // Clear hero if no image
              const heroSelect = postEditorContainer.querySelector('.post-hero-media');
              const heroPreview = postEditorContainer.querySelector('.hero-preview');
              if (heroSelect) heroSelect.value = '';
              if (heroPreview) heroPreview.style.display = 'none';
            }

            // Load gallery images if exists
            if (post.gallery_media_ids) {
              try {
                const galleryIds = JSON.parse(post.gallery_media_ids);
                if (Array.isArray(galleryIds) && galleryIds.length > 0) {
                  galleryMediaIds = [...galleryIds];
                  // Load each gallery image (use addGalleryItemPreview to avoid duplicates)
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
        });
      } else {
        // New post - clear the form
        console.log('New post - clearing form');
        postEditorContainer.querySelector('.post-title').value = '';
        postEditorContainer.querySelector('.post-status').value = 'draft';
        if (postBodyEditor) {
          postBodyEditor.setData('');
        } else {
          postEditorContainer.querySelector('.post-body').value = '';
        }
        postEditorContainer.querySelector('.post-hero-media').value = '';
        postEditorContainer.querySelector('.hero-preview').style.display = 'none';

        // Clear auto-save for new posts (they don't have an ID yet)
        if (postAutoSave) {
          clearInterval(postAutoSave);
          postAutoSave = null;
        }
        const statusElement = document.getElementById('post-autosave-status');
        if (statusElement) {
          statusElement.innerHTML = '<span class="text-muted">Save post to enable auto-save</span>';
          statusElement.className = 'editor-autosave-indicator';
        }
      }

      // Setup hero image selection handler
      const heroSelect = postEditorContainer.querySelector('.post-hero-media');
      const heroPreview = postEditorContainer.querySelector('.hero-preview');
      const heroPreviewImg = heroPreview ? heroPreview.querySelector('img') : null;

      if (heroSelect && !heroSelect.dataset.listenerAdded) {
        heroSelect.addEventListener('change', function() {
          if (this.value && heroPreviewImg) {
            // Load media info to show preview
            fetch(`/api/admin/media.php?id=${this.value}`)
              .then(r => r.json())
              .then(data => {
                if (data.success && data.data) {
                  const variants = JSON.parse(data.data.variants_json || '{}');
                  const variant400 = variants['400'];
                  let previewUrl;
                  if (variant400 && variant400.jpg) {
                    previewUrl = '/storage/uploads/variants/400/' + variant400.jpg.split('/').pop();
                  } else {
                    previewUrl = '/storage/uploads/originals/' + data.data.filename;
                  }
                  heroPreviewImg.src = previewUrl;
                  heroPreviewImg.alt = data.data.alt_text || '';
                  heroPreview.style.display = 'block';
                }
              });
          } else if (heroPreview) {
            heroPreview.style.display = 'none';
          }
        });
        heroSelect.dataset.listenerAdded = 'true';
      }

      // Setup hero remove button
      const heroRemoveBtn = postEditorContainer.querySelector('.btn-remove-hero');
      if (heroRemoveBtn && !heroRemoveBtn.dataset.listenerAdded) {
        heroRemoveBtn.addEventListener('click', function() {
          if (heroSelect) heroSelect.value = '';
          if (heroPreview) heroPreview.style.display = 'none';
          if (heroPreviewImg) heroPreviewImg.src = '';
        });
        heroRemoveBtn.dataset.listenerAdded = 'true';
      }
    });

    // Cleanup editor when modal is hidden
    postEditorModal.addEventListener('hidden.bs.modal', function() {
      // Clean up any leftover backdrops
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      // Reset body classes that Bootstrap might have added
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      // Reset gallery state
      galleryMediaIds = [];

      // Clear post auto-save interval
      if (postAutoSave) {
        clearInterval(postAutoSave);
        postAutoSave = null;
      }
    });

    // Hero image upload handlers
    const heroUploadInput = postEditorContainer.querySelector('.hero-upload-input');
    const heroUploadBtn = postEditorContainer.querySelector('.btn-upload-hero');

    // Show/hide upload button when file selected and update button text
    if (heroUploadInput && heroUploadBtn) {
      // Initially hide the button
      heroUploadBtn.style.display = 'none';

      heroUploadInput.addEventListener('change', function() {
        const hasFile = this.files.length > 0;
        if (hasFile) {
          heroUploadBtn.style.display = 'inline-block';
          heroUploadBtn.disabled = false;
          heroUploadBtn.textContent = 'Upload';
        } else {
          heroUploadBtn.style.display = 'none';
        }
      });
    }

    // Handle hero image upload
    if (heroUploadBtn) {
      heroUploadBtn.addEventListener('click', async function() {
        const file = heroUploadInput.files[0];
        if (!file) return;

        try {
          heroUploadBtn.disabled = true;
          heroUploadBtn.textContent = 'Uploading...';

          await uploadHeroImage(file);

          // Clear file input and hide button
          heroUploadInput.value = '';
          heroUploadBtn.style.display = 'none';
        } catch (error) {
          alert(error.message);
          // Re-enable button on error
          heroUploadBtn.disabled = false;
          heroUploadBtn.textContent = 'Upload';
        }
      });
    }

    // Gallery upload handlers
    const galleryUploadInput = postEditorContainer.querySelector('.gallery-upload-input');
    const galleryUploadBtn = postEditorContainer.querySelector('.btn-upload-gallery');
    const galleryPreview = postEditorContainer.querySelector('#galleryPreview');

    // Show/hide upload button when files selected and update button text
    if (galleryUploadInput && galleryUploadBtn) {
      // Initially hide the button
      galleryUploadBtn.style.display = 'none';

      galleryUploadInput.addEventListener('change', function() {
        const fileCount = this.files.length;
        if (fileCount === 0) {
          galleryUploadBtn.style.display = 'none';
        } else {
          galleryUploadBtn.style.display = 'block';
          galleryUploadBtn.disabled = false;
          if (fileCount === 1) {
            galleryUploadBtn.textContent = 'Upload 1 image';
          } else {
            galleryUploadBtn.textContent = `Upload ${fileCount} images`;
          }
        }
      });
    }

    // Handle gallery upload
    if (galleryUploadBtn) {
      galleryUploadBtn.addEventListener('click', async function() {
        const files = Array.from(galleryUploadInput.files);
        if (!files.length) return;

        try {
          galleryUploadBtn.disabled = true;
          galleryUploadBtn.textContent = `Uploading ${files.length} file(s)...`;

          await uploadGalleryImages(files, addGalleryItem);

          // Clear file input and hide button
          galleryUploadInput.value = '';
          galleryUploadBtn.style.display = 'none';
        } catch (error) {
          alert('Error uploading gallery images: ' + error.message);
          // Re-enable button on error
          galleryUploadBtn.disabled = false;
        }
      });
    }

    // Add gallery item to preview
    function addGalleryItem(mediaId, mediaData) {
      if (!galleryPreview) return;

      galleryMediaIds.push(mediaId);
      galleryPreview.classList.remove('empty');

      const variants = JSON.parse(mediaData?.variants_json || '{}');
      const variant400 = variants['400'];
      const thumbUrl = variant400?.jpg
        ? '/storage/uploads/variants/400/' + variant400.jpg.split('/').pop()
        : '/storage/uploads/originals/' + mediaData?.filename;

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

    // Add gallery item preview (for existing images - doesn't add to array)
    function addGalleryItemPreview(mediaId, mediaData) {
      if (!galleryPreview) return;

      galleryPreview.classList.remove('empty');

      const variants = JSON.parse(mediaData?.variants_json || '{}');
      const variant400 = variants['400'];
      const thumbUrl = variant400?.jpg
        ? '/storage/uploads/variants/400/' + variant400.jpg.split('/').pop()
        : '/storage/uploads/originals/' + mediaData?.filename;

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

    // Hero Banner image selection and preview
    const heroBannerSelect = document.getElementById('hero_media_id');
    const heroBannerPreview = document.querySelector('.hero-banner-preview');
    const heroBannerPreviewImg = heroBannerPreview ? heroBannerPreview.querySelector('img') : null;
    const heroBannerRemoveBtn = document.querySelector('.btn-remove-hero-banner');

    if (heroBannerSelect && heroBannerPreview) {
      heroBannerSelect.addEventListener('change', function() {
        if (this.value && heroBannerPreviewImg) {
          // Load media info to show preview
          fetch(`/api/admin/media.php?id=${this.value}`)
            .then(r => r.json())
            .then(data => {
              if (data.success && data.data) {
                const variants = JSON.parse(data.data.variants_json || '{}');
                const variant400 = variants['400'];
                let previewUrl;
                if (variant400 && variant400.jpg) {
                  previewUrl = '/storage/uploads/variants/400/' + variant400.jpg.split('/').pop();
                } else {
                  previewUrl = '/storage/uploads/originals/' + data.data.filename;
                }
                heroBannerPreviewImg.src = previewUrl;
                heroBannerPreviewImg.alt = data.data.alt_text || '';
                heroBannerPreview.style.display = 'block';
              }
            });
        } else if (heroBannerPreview) {
          heroBannerPreview.style.display = 'none';
        }
      });
    }

    if (heroBannerRemoveBtn) {
      heroBannerRemoveBtn.addEventListener('click', function() {
        if (heroBannerSelect) heroBannerSelect.value = '';
        if (heroBannerPreview) heroBannerPreview.style.display = 'none';
        if (heroBannerPreviewImg) heroBannerPreviewImg.src = '';
      });
    }
  }, 500);

  // Clean up auto-save intervals when page unloads
  window.addEventListener('beforeunload', function() {
    if (heroAutoSave) clearInterval(heroAutoSave);
    if (bioAutoSave) clearInterval(bioAutoSave);
    if (donateAutoSave) clearInterval(donateAutoSave);
  });
})();
