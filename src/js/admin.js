(function(){
  const root = document.getElementById('adminApp');
  if (!root) return;
  const CSRF = root.getAttribute('data-csrf') || '';

  // Notification system - shows Bootstrap toast notifications
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

  // Quill editor instances
  let heroEditor = null;
  let bioEditor = null;
  let donateEditor = null;
  let donationInstructionsEditor = null;
  let postBodyEditor = null;

  // Helper to detect payment platform from link and return icon/name
  function detectPaymentPlatform(link) {
    if (!link) return { icon: 'bi-credit-card', color: 'text-secondary', name: 'Send payment:' };

    const lowerLink = link.toLowerCase();

    if (lowerLink.includes('venmo.com')) {
      return { icon: 'bi-currency-dollar', color: 'text-primary', name: 'Send via Venmo:' };
    } else if (lowerLink.includes('paypal.com') || lowerLink.includes('paypal.me')) {
      return { icon: 'bi-paypal', color: 'text-primary', name: 'Send via PayPal:' };
    } else if (lowerLink.includes('ko-fi.com')) {
      return { icon: 'bi-cup-hot-fill', color: 'text-danger', name: 'Send via Ko-fi:' };
    } else if (lowerLink.includes('buymeacoffee.com')) {
      return { icon: 'bi-cup-hot', color: 'text-warning', name: 'Buy Me a Coffee:' };
    } else if (lowerLink.includes('cash.app') || lowerLink.includes('cash.me')) {
      return { icon: 'bi-cash-stack', color: 'text-success', name: 'Send via Cash App:' };
    } else if (lowerLink.includes('zelle.com')) {
      return { icon: 'bi-bank', color: 'text-purple', name: 'Send via Zelle:' };
    } else if (lowerLink.includes('patreon.com')) {
      return { icon: 'bi-heart-fill', color: 'text-danger', name: 'Support on Patreon:' };
    } else if (lowerLink.includes('github.com/sponsors')) {
      return { icon: 'bi-github', color: 'text-dark', name: 'Sponsor on GitHub:' };
    } else if (lowerLink.includes('buy.stripe.com') || lowerLink.includes('donate.stripe.com')) {
      return { icon: 'bi-credit-card-2-front', color: 'text-primary', name: 'Donate via Stripe:' };
    } else if (lowerLink.includes('gofundme.com')) {
      return { icon: 'bi-heart', color: 'text-success', name: 'Support on GoFundMe:' };
    } else {
      return { icon: 'bi-credit-card', color: 'text-secondary', name: 'Send payment:' };
    }
  }

  // Helper to toggle donation form fields based on method
  function updateDonationMethodVisibility(prefix = '') {
    const methodRadios = document.querySelectorAll(`input[name="${prefix}donation_method"]`);
    let selectedMethod = '';

    methodRadios.forEach(radio => {
      if (radio.checked) {
        selectedMethod = radio.value;
      }
    });

    // Get the containers
    const linkContainer = document.querySelector(`#${prefix}donation_link`)?.closest('.mb-3');
    const qrContainer = document.querySelector(`#${prefix}donation_qr_media_id`)?.closest('.mb-3');

    if (!linkContainer || !qrContainer) return;

    // Show/hide based on selected method
    switch(selectedMethod) {
      case 'link':
        linkContainer.style.display = 'block';
        qrContainer.style.display = 'none';
        break;
      case 'qr':
        linkContainer.style.display = 'none';
        qrContainer.style.display = 'block';
        break;
      case 'both':
        linkContainer.style.display = 'block';
        qrContainer.style.display = 'block';
        break;
      default:
        linkContainer.style.display = 'none';
        qrContainer.style.display = 'none';
    }
  }

  // Update preview for admin donation form (non-prefixed IDs)
  function updateAdminDonationPreview() {
    // Containers
    const instructionsPreview = document.getElementById('preview-instructions');
    const qrPreview = document.getElementById('preview-qr');
    const qrImg = qrPreview ? qrPreview.querySelector('img') : null;
    const linkPreview = document.getElementById('preview-link');
    const emptyPreview = document.getElementById('preview-empty');

    if (!instructionsPreview || !qrPreview || !linkPreview || !emptyPreview) return;

    // Read current values
    let donationMethod = 'link';
    document.querySelectorAll('input[name="donation_method"]').forEach(r => { if (r.checked) donationMethod = r.value; });
    const donationLink = document.getElementById('donation_link')?.value || '';
    const qrMediaId = document.getElementById('donation_qr_media_id')?.value || '';

    // Update instructions HTML
    try {
      const html = donationInstructionsEditor ? window.getQuillHTML(donationInstructionsEditor) : (document.getElementById('donation_instructions_html')?.innerHTML || '');
      instructionsPreview.innerHTML = html && html.trim() ? html : '<p>Thank you for your support!</p>';
    } catch (e) {
      console.warn('Could not update donation instructions preview:', e);
    }

    // Determine what to show based on method - match actual modal logic
    const showQr = (donationMethod === 'qr' || donationMethod === 'both') && qrMediaId;
    const showLink = (donationMethod === 'link' || donationMethod === 'both') && donationLink;

    // Update QR preview - match actual modal structure
    if (qrImg) {
      if (showQr) {
        // Fetch media info to get proper image URL
        fetch(`/api/admin/media.php?id=${qrMediaId}`)
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
              qrImg.src = previewUrl;
              qrImg.alt = data.data.alt_text || 'Donation Image';
            }
          })
          .catch(err => console.error('Error loading image preview:', err));
      } else {
        qrImg.removeAttribute('src');
      }
    }
    qrPreview.style.display = showQr ? 'block' : 'none';

    // Update link preview - match actual modal structure
    const linkText = linkPreview.querySelector('.preview-link-text');
    const linkIcon = linkPreview.querySelector('.preview-platform-icon');
    const linkName = linkPreview.querySelector('.preview-platform-name');
    const linkHref = linkPreview.querySelector('a');

    if (showLink && linkText && linkIcon && linkName) {
      const platform = detectPaymentPlatform(donationLink);
      linkIcon.className = `preview-platform-icon bi ${platform.icon} ${platform.color}`;
      linkName.textContent = platform.name;

      // Extract username from URL
      let username = donationLink;
      if (donationLink.includes('venmo.com/u/')) {
        username = donationLink.split('venmo.com/u/')[1].split(/[/?#]/)[0];
      } else if (donationLink.includes('venmo.com/code')) {
        username = donationLink.split('venmo.com/code?')[1]?.split('&')[0] || donationLink;
      } else if (donationLink.includes('paypal.me/')) {
        username = donationLink.split('paypal.me/')[1].split(/[/?#]/)[0];
      } else if (donationLink.includes('ko-fi.com/')) {
        username = donationLink.split('ko-fi.com/')[1].split(/[/?#]/)[0];
      } else if (donationLink.includes('buymeacoffee.com/')) {
        username = donationLink.split('buymeacoffee.com/')[1].split(/[/?#]/)[0];
      } else if (donationLink.includes('cash.app/$')) {
        username = donationLink.split('cash.app/$')[1].split(/[/?#]/)[0];
      } else if (donationLink.includes('cash.me/$')) {
        username = donationLink.split('cash.me/$')[1].split(/[/?#]/)[0];
      } else if (donationLink.includes('patreon.com/')) {
        username = donationLink.split('patreon.com/')[1].split(/[/?#]/)[0];
      } else if (donationLink.includes('github.com/sponsors/')) {
        username = donationLink.split('github.com/sponsors/')[1].split(/[/?#]/)[0];
      } else if (donationLink.includes('gofundme.com/')) {
        username = donationLink.split('gofundme.com/')[1]?.split(/[/?#]/)[0] || 'campaign';
      }

      linkText.textContent = username;
    } else if (linkText) {
      linkText.textContent = 'username';
    }

    if (linkHref) {
      linkHref.href = donationLink || '#';
    }

    linkPreview.style.display = showLink ? 'block' : 'none';

    // Empty state - only show if no QR or link is configured
    const hasContent = showQr || showLink;
    emptyPreview.style.display = hasContent ? 'none' : 'block';
  }  // Auto-save intervals
  let heroAutoSave = null;
  let bioAutoSave = null;
  let donateAutoSave = null;
  let donationInstructionsAutoSave = null;
  let postAutoSave = null;

  // Helper function to setup auto-save for settings fields
  function setupSettingsAutoSave(editor, fieldName) {

    // Map field names to status element IDs
    const statusMap = {
      'hero_html': 'hero-autosave-status',
      'site_bio_html': 'about-autosave-status',
      'donate_text_html': 'donation-autosave-status',
      'donation_instructions_html': 'donation-instructions-autosave-status'
    };

    if (!window.setupAutoSave) {
      console.error('window.setupAutoSave is not defined!');
      return null;
    }

    return window.setupAutoSave(editor, {
      saveUrl: '/api/admin/settings-draft.php',
      method: 'PUT',
      buildPayload: (content) => {
        const payload = {};
        payload[fieldName] = content;
        return payload;
      },
      statusElementId: statusMap[fieldName],
      fieldName: `${fieldName} draft`
    });
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
      statusElementId: 'post-autosave-status',
      fieldName: `post ${postId} draft`
    });
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

      const siteTitleElement = document.getElementById('site_title');
      if (siteTitleElement) {
        siteTitleElement.value = j.data.site_title||'';
      }

      // Load visibility toggles
      const showHeroElement = document.getElementById('show_hero');
      const showAboutElement = document.getElementById('show_about');
      const showDonationElement = document.getElementById('show_donation');
      const showFooterElement = document.getElementById('show_footer');

      if (showHeroElement) showHeroElement.checked = j.data.show_hero == 1;
      if (showAboutElement) showAboutElement.checked = j.data.show_about == 1;
      if (showDonationElement) showDonationElement.checked = j.data.show_donation == 1;
      if (showFooterElement) showFooterElement.checked = j.data.show_footer == 1;

      // Load donate button toggle
      const showDonateButtonCheckbox = document.getElementById('show_donate_button');
      if (showDonateButtonCheckbox) {
        showDonateButtonCheckbox.checked = j.data.show_donate_button == 1;
      }

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

      // Load hero HTML into editor (use draft content)
      const heroHtml = j.data.hero_html_editing || '';
      if (heroEditor) {
        window.setQuillHTML(heroEditor, heroHtml);
      } else {
        const heroHtmlElement = document.getElementById('hero_html');
        if (heroHtmlElement) {
          heroHtmlElement.value = heroHtml;
        }
      }

      const ctaTextElement = document.getElementById('cta_text');
      const ctaUrlElement = document.getElementById('cta_url');
      const heroOpacityElement = document.getElementById('hero_overlay_opacity');
      const heroColorElement = document.getElementById('hero_overlay_color');
      const heroColorHexElement = document.getElementById('hero_overlay_color_hex');
      const heroHeightElement = document.getElementById('hero_height');

      if (ctaTextElement) ctaTextElement.value = j.data.cta_text||'';
      if (ctaUrlElement) ctaUrlElement.value = j.data.cta_url||'';

      // Load hero overlay opacity and update preview
      const heroOpacity = j.data.hero_overlay_opacity || 0.5;
      if (heroOpacityElement) {
        heroOpacityElement.value = heroOpacity;
        // Update opacity value display
        const opacityValueEl = document.querySelector('.hero-overlay-opacity-value');
        if (opacityValueEl) opacityValueEl.textContent = parseFloat(heroOpacity).toFixed(2);
        // Update overlay style
        const overlayEl = document.querySelector('.hero-banner-overlay');
        if (overlayEl) overlayEl.style.opacity = heroOpacity;
      }

      // Load hero overlay color and update preview
      const heroColor = j.data.hero_overlay_color || '#000000';
      if (heroColorElement) {
        heroColorElement.value = heroColor;
        if (heroColorHexElement) heroColorHexElement.value = heroColor;
        // Update overlay style
        const overlayEl = document.querySelector('.hero-banner-overlay');
        if (overlayEl) overlayEl.style.backgroundColor = heroColor;
      }

      // Load hero height and update preview
      const heroHeight = j.data.hero_height || 100;
      if (heroHeightElement) {
        heroHeightElement.value = heroHeight;
        // Update height value display
        const heightValueEl = document.querySelector('.hero-banner-height-value');
        if (heightValueEl) heightValueEl.textContent = heroHeight;
        // Update preview aspect ratio
        const previewEl = document.querySelector('.hero-banner-preview');
        if (previewEl) previewEl.style.paddingBottom = heroHeight + '%';
      }

      // Load bio HTML into editor (use draft content)
      const bioHtml = j.data.site_bio_html_editing || '';
      if (bioEditor) {
        window.setQuillHTML(bioEditor, bioHtml);
      } else {
        const bioHtmlElement = document.getElementById('site_bio_html');
        if (bioHtmlElement) {
          bioHtmlElement.value = bioHtml;
        }
      }

      // Load donate HTML into editor (use draft content)
      const donateHtml = j.data.donate_text_html_editing || '';
      if (donateEditor) {
        window.setQuillHTML(donateEditor, donateHtml);
      } else {
        const donateTextElement = document.getElementById('donate_text_html');
        if (donateTextElement) {
          donateTextElement.value = donateHtml;
        }
      }

      // Load donation instructions HTML into editor (use draft content)
      const donationInstructionsHtml = j.data.donation_instructions_html_editing || '';
      if (donationInstructionsEditor) {
        window.setQuillHTML(donationInstructionsEditor, donationInstructionsHtml);
      }

      // Load donation method radio buttons
      const donationMethod = j.data.donation_method || 'link';
      const methodRadio = document.getElementById(`donation_method_${donationMethod}`);
      if (methodRadio) {
        methodRadio.checked = true;
        updateDonationMethodVisibility('');
      }

      // Load donation link
      const donationLinkElement = document.getElementById('donation_link');
      if (donationLinkElement) {
        donationLinkElement.value = j.data.donation_link || '';
      }

      // Load QR media ID and update preview after media options are loaded
      const donationQrMediaElement = document.getElementById('donation_qr_media_id');
      if (donationQrMediaElement) {
        donationQrMediaElement.value = j.data.donation_qr_media_id || '';
        // Wait for media options to be loaded before updating preview
        if (window.donationMediaOptionsLoaded) {
          window.donationMediaOptionsLoaded.then(() => {
            if (typeof updateAdminDonationPreview === 'function') {
              updateAdminDonationPreview();
            }
          });
        }
      }

      // Legacy: Load donation presets if element exists (deprecated)
      try {
        const donationPresetsElement = document.getElementById('donation_presets');
        if (donationPresetsElement) {
          const ds = j.data.donation_settings_json ? JSON.parse(j.data.donation_settings_json) : {};
          donationPresetsElement.value = (ds.preset_amounts||[]).join(',');
        }
      } catch(e) {
        console.warn('Could not load donation presets:', e);
      }

      // Load public view count toggle
      const showViewCountsElement = document.getElementById('show_view_counts');
      if (showViewCountsElement) {
        showViewCountsElement.checked = j.data.show_view_counts == 1;
      }

      // Load public impression count toggle
      const showImpressionCountsElement = document.getElementById('show_impression_counts');
      if (showImpressionCountsElement) {
        showImpressionCountsElement.checked = j.data.show_impression_counts == 1;
      }

      // Load ignore admin tracking toggle
      const ignoreAdminTrackingElement = document.getElementById('ignore_admin_tracking');
      if (ignoreAdminTrackingElement) {
        ignoreAdminTrackingElement.checked = j.data.ignore_admin_tracking == 1;
      }

      // Load AI system prompt
      const aiPromptElement = document.getElementById('ai_system_prompt');
      if (aiPromptElement) {
        aiPromptElement.value = j.data.ai_system_prompt || '';
      }

      // Load SMTP settings
      const smtpHostElement = document.getElementById('smtp_host');
      const smtpPortElement = document.getElementById('smtp_port');
      const smtpSecureElement = document.getElementById('smtp_secure');
      const smtpAuthElement = document.getElementById('smtp_auth');
      const smtpUsernameElement = document.getElementById('smtp_username');
      const smtpPasswordElement = document.getElementById('smtp_password');
      const smtpFromEmailElement = document.getElementById('smtp_from_email');
      const smtpFromNameElement = document.getElementById('smtp_from_name');

      if (smtpHostElement) smtpHostElement.value = j.data.smtp_host || '';
      if (smtpPortElement) smtpPortElement.value = j.data.smtp_port || 587;
      if (smtpSecureElement) smtpSecureElement.value = j.data.smtp_secure || 'tls';
      if (smtpAuthElement) smtpAuthElement.checked = j.data.smtp_auth == 1;
      if (smtpUsernameElement) smtpUsernameElement.value = j.data.smtp_username || '';
      if (smtpPasswordElement) smtpPasswordElement.value = j.data.smtp_password || '';
      if (smtpFromEmailElement) smtpFromEmailElement.value = j.data.smtp_from_email || '';
      if (smtpFromNameElement) smtpFromNameElement.value = j.data.smtp_from_name || '';
    });
  }

  // Save hero/settings
  document.getElementById('heroForm').addEventListener('submit', async function(e){
    e.preventDefault();
    const payload = {
      show_hero: document.getElementById('show_hero').checked ? 1 : 0,
      hero_media_id: document.getElementById('hero_media_id').value || null,
      hero_html: heroEditor ? window.getQuillHTML(heroEditor) : document.getElementById('hero_html').value,
      cta_text: document.getElementById('cta_text').value,
      cta_url: document.getElementById('cta_url').value,
      hero_overlay_opacity: document.getElementById('hero_overlay_opacity').value,
      hero_overlay_color: document.getElementById('hero_overlay_color').value,
    };

    // Save to draft first
    const draftResult = await api('/api/admin/settings-draft.php', {
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });

    if (!draftResult.success) {
      alert('Error saving draft: ' + draftResult.error);
      return;
    }

    // Publish the draft
    const publishResult = await api('/api/admin/settings.php?action=publish', {method:'GET'});

    if (!publishResult.success) {
      alert('Error publishing: ' + publishResult.error);
      return;
    }

    // Save non-draft fields
    await api('/api/admin/settings.php', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        show_hero: payload.show_hero,
        hero_media_id: payload.hero_media_id,
        cta_text: payload.cta_text,
        cta_url: payload.cta_url,
        hero_overlay_opacity: payload.hero_overlay_opacity,
        hero_overlay_color: payload.hero_overlay_color
      })
    });
  });

  document.getElementById('aboutForm').addEventListener('submit', async function(e){
    e.preventDefault();
    const payload = {
      show_about: document.getElementById('show_about').checked ? 1 : 0,
      site_bio_html: bioEditor ? window.getQuillHTML(bioEditor) : document.getElementById('site_bio_html').value,
    };

    // Save to draft first
    const draftResult = await api('/api/admin/settings-draft.php', {
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });

    if (!draftResult.success) {
      alert('Error saving draft: ' + draftResult.error);
      return;
    }

    // Publish the draft
    const publishResult = await api('/api/admin/settings.php?action=publish', {method:'GET'});

    if (!publishResult.success) {
      alert('Error publishing: ' + publishResult.error);
      return;
    }

    // Save non-draft fields
    await api('/api/admin/settings.php', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        show_about: payload.show_about
      })
    });
  });

  document.getElementById('donationForm').addEventListener('submit', async function(e){
    e.preventDefault();

    // Get selected donation method
    let donationMethod = 'link';
    const methodRadios = document.querySelectorAll('input[name="donation_method"]');
    methodRadios.forEach(radio => {
      if (radio.checked) donationMethod = radio.value;
    });

    const payload = {
      show_donation: document.getElementById('show_donation').checked ? 1 : 0,
      show_donate_button: document.getElementById('show_donate_button')?.checked ? 1 : 0,
      donate_text_html: donateEditor ? window.getQuillHTML(donateEditor) : document.getElementById('donate_text_html').value,
      donation_instructions_html: donationInstructionsEditor ? window.getQuillHTML(donationInstructionsEditor) : (document.getElementById('donation_instructions_html')?.innerHTML || ''),
      donation_method: donationMethod,
      donation_link: document.getElementById('donation_link')?.value || '',
      donation_qr_media_id: document.getElementById('donation_qr_media_id')?.value || null
    };

    // Save to draft first
    const draftResult = await api('/api/admin/settings-draft.php', {
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });

    if (!draftResult.success) {
      alert('Error saving draft: ' + draftResult.error);
      return;
    }

    // Publish the draft
    const publishResult = await api('/api/admin/settings.php?action=publish', {method:'GET'});

    if (!publishResult.success) {
      alert('Error publishing: ' + publishResult.error);
      return;
    }

    // Save non-draft fields
    await api('/api/admin/settings.php', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        show_donation: payload.show_donation,
        show_donate_button: payload.show_donate_button,
        donation_method: payload.donation_method,
        donation_link: payload.donation_link,
        donation_qr_media_id: payload.donation_qr_media_id
      })
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

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    api('/api/admin/settings.php', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(j=>{
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
      if (!j.success) {
        alert('Error: ' + j.error);
      }
    });
  });

  // Reset AI prompt to default
  const resetAIPromptBtn = document.getElementById('btnResetAIPrompt');
  if (resetAIPromptBtn) {
    resetAIPromptBtn.addEventListener('click', function(e){
      e.preventDefault();
      const defaultAIPrompt = this.getAttribute('data-default-prompt') || '';
      if (confirm('Reset AI system prompt to default?')) {
        document.getElementById('ai_system_prompt').value = defaultAIPrompt;
      }
    });
  }

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
          showNotification('Setting saved successfully', 'success');
        } else {
          console.error('Error updating hero visibility:', j.error);
          // Revert checkbox on error
          this.checked = !this.checked;
          showNotification('Error: ' + (j.error || 'Failed to update hero visibility'), 'error');
        }
      }).catch(error => {
        console.error('Error updating hero visibility:', error);
        this.checked = !this.checked;
        showNotification('Error updating hero visibility', 'error');
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
          showNotification('Setting saved successfully', 'success');
        } else {
          console.error('Error updating about visibility:', j.error);
          // Revert checkbox on error
          this.checked = !this.checked;
          showNotification('Error: ' + (j.error || 'Failed to update about visibility'), 'error');
        }
      }).catch(error => {
        console.error('Error updating about visibility:', error);
        this.checked = !this.checked;
        showNotification('Error updating about visibility', 'error');
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
          showNotification('Setting saved successfully', 'success');
        } else {
          console.error('Error updating donation visibility:', j.error);
          // Revert checkbox on error
          this.checked = !this.checked;
          showNotification('Error: ' + (j.error || 'Failed to update donation visibility'), 'error');
        }
      }).catch(error => {
        console.error('Error updating donation visibility:', error);
        this.checked = !this.checked;
        showNotification('Error updating donation visibility', 'error');
      });
    });
  }

  const showDonateButtonCheckbox = document.getElementById('show_donate_button');
  if (showDonateButtonCheckbox) {
    showDonateButtonCheckbox.addEventListener('change', function() {
      const payload = { show_donate_button: this.checked ? 1 : 0 };
      api('/api/admin/settings.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      }).then(j => {
        if (j.success) {
          showNotification('Setting saved successfully', 'success');
        } else {
          console.error('Error updating donate button visibility:', j.error);
          // Revert checkbox on error
          this.checked = !this.checked;
          showNotification('Error: ' + (j.error || 'Failed to update donate button visibility'), 'error');
        }
      }).catch(error => {
        console.error('Error updating donate button visibility:', error);
        this.checked = !this.checked;
        showNotification('Error updating donate button visibility', 'error');
      });
    });
  }

  const showViewCountsCheckbox = document.getElementById('show_view_counts');
  if (showViewCountsCheckbox) {
    showViewCountsCheckbox.addEventListener('change', function() {
      const payload = { show_view_counts: this.checked ? 1 : 0 };
      api('/api/admin/settings.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      }).then(j => {
        if (j.success) {
          showNotification('Setting saved successfully', 'success');
        } else {
          console.error('Error updating view count visibility:', j.error);
          this.checked = !this.checked;
          showNotification('Error: ' + (j.error || 'Failed to update view count visibility'), 'error');
        }
      }).catch(error => {
        console.error('Error updating view count visibility:', error);
        this.checked = !this.checked;
        showNotification('Error updating view count visibility', 'error');
      });
    });
  }

  const showImpressionCountsCheckbox = document.getElementById('show_impression_counts');
  if (showImpressionCountsCheckbox) {
    showImpressionCountsCheckbox.addEventListener('change', function() {
      const payload = { show_impression_counts: this.checked ? 1 : 0 };
      api('/api/admin/settings.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      }).then(j => {
        if (j.success) {
          showNotification('Setting saved successfully', 'success');
        } else {
          console.error('Error updating impression count visibility:', j.error);
          this.checked = !this.checked;
          showNotification('Error: ' + (j.error || 'Failed to update impression count visibility'), 'error');
        }
      }).catch(error => {
        console.error('Error updating impression count visibility:', error);
        this.checked = !this.checked;
        showNotification('Error updating impression count visibility', 'error');
      });
    });
  }

  const ignoreAdminTrackingCheckbox = document.getElementById('ignore_admin_tracking');
  if (ignoreAdminTrackingCheckbox) {
    ignoreAdminTrackingCheckbox.addEventListener('change', function() {
      const payload = { ignore_admin_tracking: this.checked ? 1 : 0 };
      api('/api/admin/settings.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      }).then(j => {
        if (j.success) {
          showNotification('Setting saved successfully', 'success');
        } else {
          console.error('Error updating admin tracking setting:', j.error);
          this.checked = !this.checked;
          showNotification('Error: ' + (j.error || 'Failed to update admin tracking setting'), 'error');
        }
      }).catch(error => {
        console.error('Error updating admin tracking setting:', error);
        this.checked = !this.checked;
        showNotification('Error updating admin tracking setting', 'error');
      });
    });
  }

  const showFooterCheckbox = document.getElementById('show_footer');
  if (showFooterCheckbox) {
    showFooterCheckbox.addEventListener('change', function() {
      const payload = { show_footer: this.checked ? 1 : 0 };
      api('/api/admin/settings.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      }).then(j => {
        if (j.success) {
          showNotification('Setting saved successfully', 'success');
        } else {
          console.error('Error updating footer visibility:', j.error);
          this.checked = !this.checked;
          showNotification('Error: ' + (j.error || 'Failed to update footer visibility'), 'error');
        }
      }).catch(error => {
        console.error('Error updating footer visibility:', error);
        this.checked = !this.checked;
        showNotification('Error updating footer visibility', 'error');
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

  // Move post delete modal to body as well
  const deletePostModal = document.getElementById('deletePostModal');
  if (deletePostModal && deletePostModal.parentElement !== document.body) {
    document.body.appendChild(deletePostModal);
  }

  // Move newsletter modals to body as well
  const addSubscriberModal = document.getElementById('addSubscriberModal');
  if (addSubscriberModal && addSubscriberModal.parentElement !== document.body) {
    document.body.appendChild(addSubscriberModal);
  }

  const deleteSubscriberModal = document.getElementById('deleteSubscriberModal');
  if (deleteSubscriberModal && deleteSubscriberModal.parentElement !== document.body) {
    document.body.appendChild(deleteSubscriberModal);
  }

  const reactivateSubscriberModal = document.getElementById('reactivateSubscriberModal');
  if (reactivateSubscriberModal && reactivateSubscriberModal.parentElement !== document.body) {
    document.body.appendChild(reactivateSubscriberModal);
  }

  // Posts - minimal list/create
  const postsList = document.getElementById('postsList');
  const postEditorContainer = postEditorModal.querySelector('.modal-body');
  const btnNewPost = document.getElementById('btnNewPost');
  let editingId = null;
  let galleryMediaIds = []; // Track gallery image IDs in order

  // Re-enable Save & Publish if confirmation is cancelled
  if (!postEditorContainer.dataset.publishCancelBound) {
    document.addEventListener('publish-confirmation:cancelled', () => {
      const btn = postEditorContainer.querySelector('.btn-save-post');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Save and Publish';
      }
      // Trigger a refresh of the post editor to show the saved draft
      if (editingId) {
        const refreshEvent = new CustomEvent('post-editor:refresh-needed');
        document.dispatchEvent(refreshEvent);
        // Also refresh the posts list table to show the new draft
        loadPosts();
      }
    });
    postEditorContainer.dataset.publishCancelBound = '1';
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
      if(!j.success) return;
      postsList.innerHTML='';

      // Create responsive table wrapper
      const tableWrapper = document.createElement('div');
      tableWrapper.className = 'table-responsive';

      const table = document.createElement('table');
      table.className='table table-striped';
      table.innerHTML = '<thead><tr><th>ID</th><th>Title</th><th>Author</th><th>Published</th><th>Created</th><th>Actions</th></tr></thead>';
      const tbody = document.createElement('tbody');
      (j.data||[]).forEach(p=>{
        const tr = document.createElement('tr');
        const isPublished = p.status === 'published';
        const publishedDate = p.published_at ? new Date(p.published_at).toLocaleDateString() : '';

        // Build author name
        const authorName = [p.author_first, p.author_last].filter(Boolean).join(' ') || p.author_username || 'Unknown';

        // For draft posts, show draft content; for published posts, show published content
        const displayTitle = isPublished ?
          (p.title || '(untitled)') :
          (p.title_draft || p.title || '(untitled)');

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
          <td>${displayTitle}</td>
          <td class="text-muted small">${authorName}</td>
          <td>${toggleHtml}</td>
          <td class="text-nowrap">${p.created_at}</td>
          <td class="text-nowrap">
            <button class="btn btn-sm btn-outline-primary btn-edit-post" data-id="${p.id}" data-bs-toggle="modal" data-bs-target="#postEditorModal">Edit</button>
            ${isPublished ? `<button class="btn btn-sm btn-outline-info btn-resend-email" data-id="${p.id}" title="Resend email notification to subscribers"><i class="bi bi-envelope"></i> Resend</button>` : ''}
            <button class="btn btn-sm btn-outline-danger" data-del="${p.id}">Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      tableWrapper.appendChild(table);
      postsList.appendChild(tableWrapper);
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

    if (id && (e.target.classList.contains('btn-resend-email') || e.target.closest('.btn-resend-email'))) {
      // Resend email button clicked
      const postId = parseInt(id, 10);
      const button = e.target.classList.contains('btn-resend-email') ? e.target : e.target.closest('.btn-resend-email');

      // Confirm before sending
      if (confirm('Are you sure you want to resend email notifications for this post to all active subscribers?')) {
        button.disabled = true;
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Sending...';

        api('/api/admin/posts.php?action=resend-email&id=' + postId, {
          method: 'GET'
        }).then(j => {
          if (j.success) {
            if (j.email && j.email.sent && j.email.count > 0) {
              showNotification(`Email notifications resent to ${j.email.count} subscriber(s).`, 'success');
            } else if (j.email && j.email.sent === false) {
              showNotification(`Failed to send emails: ${j.email.error || 'Unknown error'}`, 'warning');
            } else {
              showNotification('Email sending completed.', 'success');
            }
          } else {
            showNotification(`Error: ${j.error || 'Failed to resend emails'}`, 'error');
          }
        }).catch(err => {
          console.error('Error resending emails:', err);
          showNotification('Error resending emails: ' + err.message, 'error');
        }).finally(() => {
          button.disabled = false;
          button.innerHTML = originalText;
        });
      }
      return;
    }

    if (del) {
      // Show delete confirmation modal instead of confirm()
      const deleteModal = new bootstrap.Modal(document.getElementById('deletePostModal'));
      const confirmBtn = document.getElementById('confirmDeletePostAdmin');
      confirmBtn.setAttribute('data-post-id', del);
      deleteModal.show();
    }
  });

  // Handle publish toggle switches
  postsList.addEventListener('change', function(e){
    if (e.target.classList.contains('publish-toggle')) {
      const postId = e.target.getAttribute('data-id');
      const isPublished = e.target.checked;

      // Disable toggle while processing
      e.target.disabled = true;

      // If toggling to published, check if confirmation needed
      if (isPublished) {
        // Use confirmation wrapper
        window.publishConfirmation.confirmAndPublish(postId, async () => {
          // Use the publish endpoint which handles email notifications
          const j = await api('/api/admin/posts.php?action=publish&id=' + postId, {
            method: 'GET'
          });



          if (j.success) {
            // Check email notification status
            if (j.email) {
              if (j.email.sent && j.email.count > 0) {
                // Success - show confirmation
                const successMsg = `Post published successfully! Email notifications sent to ${j.email.count} subscriber(s).`;
                showNotification(successMsg, 'success');
              } else if (j.email.sent === false && !j.email.skipped) {
                // Email failed - show warning
                const warningMsg = `Post published successfully, but email notifications failed to send.\n\nError: ${j.email.error || 'Unknown error'}\n\nPlease check your SMTP settings.`;
                showNotification(warningMsg, 'warning');
              } else if (j.email.skipped) {
                // Not first publish, no emails sent
                showNotification('Post published successfully.', 'success');
              }
            } else {
              // No email info returned
              showNotification('Post published successfully.', 'success');
            }

            // Reload the posts list to show updated date
            loadPosts();
          } else {
            throw new Error(j.error || 'Unknown error');
          }
        }).then(proceeded => {
          if (!proceeded) {
            // User cancelled - revert toggle
            e.target.checked = false;
            e.target.disabled = false;
          }
        }).catch(err => {
          console.error('Error toggling publish status:', err);
          alert('Error updating post status: ' + err.message);
          e.target.checked = false;
          e.target.disabled = false;
        });
      } else {
        // Toggling to draft - no confirmation needed
        const payload = {
          status: 'draft',
          published_at: null
        };

        api('/api/admin/posts.php?id=' + postId, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
        }).then(j => {
          if (j.success) {
            loadPosts();
          } else {
            alert('Error updating post status: ' + (j.error || 'Unknown error'));
            e.target.checked = true;
            e.target.disabled = false;
          }
        }).catch(err => {
          console.error('Error toggling publish status:', err);
          alert('An error occurred while updating the post');
          e.target.checked = true;
          e.target.disabled = false;
        });
      }
    }
  });

  // Confirm delete post button in modal
  const confirmDeletePostAdmin = document.getElementById('confirmDeletePostAdmin');
  if (confirmDeletePostAdmin) {
    confirmDeletePostAdmin.addEventListener('click', function() {
      const postId = this.getAttribute('data-post-id');
      if (!postId) return;

      const originalText = this.textContent;
      this.disabled = true;
      this.textContent = 'Deleting...';

      api('/api/admin/posts.php?id=' + postId, {method: 'DELETE'})
        .then(j => {
          if (j.success) {
            // Close modal
            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deletePostModal'));
            if (deleteModal) deleteModal.hide();
            // Reload posts list
            loadPosts();
          } else {
            alert('Error deleting post: ' + (j.error || 'Unknown error'));
          }
        })
        .catch(err => {
          console.error('Error deleting post:', err);
          alert('An error occurred while deleting the post');
        })
        .finally(() => {
          this.disabled = false;
          this.textContent = originalText;
        });
    });
  }

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

      // Note: Hero image uploads are now handled by ImageCropManager
      // Images are uploaded immediately after cropping, not on save
      // The hero_media_id will already be set in the dropdown

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

      const heroSelect = postEditorContainer.querySelector('.post-hero-media');
      const heroMediaId = heroSelect ? heroSelect.value : null;

      const payload = {
        title: postEditorContainer.querySelector('.post-title').value,
        body_html: postBodyEditor ? window.getQuillHTML(postBodyEditor) : postEditorContainer.querySelector('.post-body').value,
        // status will be set below depending on new vs edit branch
        hero_media_id: heroMediaId || null,
        hero_image_height: heroMediaId ? parseInt(postEditorContainer.querySelector('.post-hero-height').value) : null,
        hero_title_overlay: heroMediaId ? (postEditorContainer.querySelector('.post-hero-title-overlay')?.checked ? 1 : 0) : 1,
        hero_overlay_opacity: heroMediaId ? parseFloat(postEditorContainer.querySelector('.post-hero-overlay-opacity')?.value || 0.70) : 0.70,
        gallery_media_ids: galleryMediaIds
      };

      if (editingId) {
        // For existing posts: save to draft fields first, then check for confirmation, then publish
        saveBtn.textContent = 'Publishing changes...';

        // Save current form values to draft fields
        const draftSave = await api('/api/admin/posts-draft.php?id='+editingId, {
          method:'PUT',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify(payload)
        });

        if (!draftSave.success) {
          alert('Error saving draft: ' + (draftSave.error || 'Unknown error'));
          saveBtn.disabled = false;
          saveBtn.textContent = originalText;
          return;
        }

        // Use confirmation wrapper for publish
        const proceeded = await window.publishConfirmation.confirmAndPublish(
          editingId,
          async () => {
            const publishResult = await api('/api/admin/posts.php?action=publish&id='+editingId, { method:'GET' });
            if (!publishResult.success) {
              throw new Error(publishResult.error || 'Unknown error');
            }
            if (publishResult.email) {
              if (publishResult.email.sent && publishResult.email.count > 0) {
                showNotification(`Post published successfully! Email notifications sent to ${publishResult.email.count} subscriber(s).`, 'success');
              } else if (publishResult.email.sent === false && !publishResult.email.skipped) {
                showNotification(`Post published successfully, but email notifications failed to send.\n\nError: ${publishResult.email.error || 'Unknown error'}\n\nPlease check your SMTP settings.`, 'warning');
              } else {
                showNotification('Post published successfully.', 'success');
              }
            } else {
              showNotification('Post published successfully.', 'success');
            }
          },
          async () => {
            // Publish without sending emails
            const publishResult = await api('/api/admin/posts.php?action=publish&id='+editingId + '&skip_email=1', { method:'GET' });
            if (!publishResult.success) {
              throw new Error(publishResult.error || 'Unknown error');
            }
            showNotification('Post published successfully (emails skipped).', 'success');
          }
        );

        if (proceeded) {
          loadPosts();
          const modalEl = bootstrap.Modal.getInstance(postEditorModal);
          if (modalEl) modalEl.hide();
        } else {
          // User cancelled
          saveBtn.disabled = false;
          saveBtn.textContent = originalText;
        }
      } else {
        // New post: ALWAYS require confirmation prior to first publish.
        // Step 1: create as draft to obtain ID
        saveBtn.textContent = 'Creating draft...';
        const createDraft = await api('/api/admin/posts.php', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ ...payload, status: 'draft' })
        });
        if (!createDraft.success || !createDraft.id) {
          alert('Error creating draft: ' + (createDraft.error || 'Unknown error'));
          saveBtn.disabled = false;
          saveBtn.textContent = originalText;
          return;
        }

        const newId = createDraft.id;
        editingId = newId; // transition to edit mode

        // Set up auto-save now that we have an ID
        if (postBodyEditor) {
          if (postAutoSave) clearInterval(postAutoSave);
          postAutoSave = setupPostAutoSave(postBodyEditor, editingId);
        }

        // Hide Save Draft button now that we're editing
        const saveDraftBtn = postEditorContainer.querySelector('.btn-save-draft');
        if (saveDraftBtn) saveDraftBtn.style.display = 'none';

        // Step 2: ask for confirmation, then publish
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
            const publishResult = await api('/api/admin/posts.php?action=publish&id=' + newId + '&skip_email=1', { method: 'GET' });
            if (!publishResult.success) {
              throw new Error(publishResult.error || 'Unknown error');
            }
            showNotification('Post published (emails skipped).', 'success');
          }
        );

        if (proceeded) {
          loadPosts();
          const modalEl = bootstrap.Modal.getInstance(postEditorModal);
          if (modalEl) modalEl.hide();
        } else {
          // User cancelled: keep draft open, refresh data, and re-enable button
          saveBtn.disabled = false;
          saveBtn.textContent = originalText;
          // Refresh posts list to show the new draft
          loadPosts();
          // Note: post editor refresh happens via the global cancellation event handler
          showNotification('Draft saved (not published).', 'info');
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
      modal: postEditorModal,
      postEditorContainer: postEditorContainer,
      getPostBodyEditor: () => postBodyEditor,
      getEditingId: () => editingId,
      getGalleryMediaIds: () => galleryMediaIds,
      refreshPostsList: loadPosts,
      api: api
    });
  }

  // Media
  const uploadForm = document.getElementById('uploadForm');
  const mediaGrid = document.getElementById('mediaGrid');

  // Media crop manager for admin media tab
  (function initAdminMediaCropper(){
    if (typeof window.ImageCropManager === 'undefined') return;

    const fileInput = document.getElementById('mediaFile');
    const altInput = document.getElementById('mediaAlt');
    const cropContainer = document.getElementById('mediaCropContainer');
    const cropImage = document.getElementById('mediaCropImage');
    const autoDetectBtn = document.getElementById('mediaAutoDetect');
    const uploadBtn = document.getElementById('mediaUploadBtn');
    const cancelBtn = document.getElementById('mediaCancelBtn');
    const submitBtn = document.getElementById('mediaSubmitBtn');

    if (!fileInput || !cropContainer || !cropImage || !uploadBtn || !cancelBtn) return;

    const mediaCropManager = new window.ImageCropManager({
      fileInput: fileInput,
      cropContainer: cropContainer,
      cropImage: cropImage,
      uploadButton: uploadBtn,
      cancelButton: cancelBtn,
      autoDetectButton: autoDetectBtn,
      onCropInit: () => {
        if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('disabled'); }
      },
      onCropCancel: () => {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('disabled'); }
      },
      uploadCallback: async (file, cropData) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('alt_text', altInput?.value || '');
        if (cropData) fd.append('crop', JSON.stringify(cropData));

        const resp = await fetch('/api/admin/media.php', {
          method: 'POST',
          headers: { 'X-CSRF-Token': CSRF },
          body: fd
        });
        const j = await resp.json();
        if (!j.success) throw new Error(j.error || 'Upload failed');

        // Reset form and reload media grid
        if (uploadForm) uploadForm.reset();
        if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('disabled'); }
        loadMedia();
        return j;
      }
    });

    // Prevent default submit if crop UI is active; allow fallback direct upload otherwise
    if (uploadForm) {
      uploadForm.addEventListener('submit', function(e){
        e.preventDefault();
        const f = fileInput.files[0];
        if (!f) return alert('Choose a file');

        // If crop UI is visible, let the dedicated Upload & Apply button handle the upload
        if (cropContainer && cropContainer.style.display !== 'none') {
          return; // No-op; user should click Upload & Apply
        }

        // Fallback: direct upload without cropping
        if (f.size > 20*1024*1024) return alert('Max 20MB');
        const fd = new FormData();
        fd.append('file', f);
        fd.append('alt_text', altInput?.value || '');
        fetch('/api/admin/media.php', {method:'POST', headers:{'X-CSRF-Token': CSRF}, body: fd})
          .then(r=>r.json()).then(j=>{
            if (j.success) { loadMedia(); uploadForm.reset(); }
            else alert(j.error||'Upload failed');
          });
      });
    }
  })();

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

    // Deduplicate by filename - keep only the largest version of each unique filename
    const uniqueMedia = {};
    mediaList.forEach(m => {
      const filename = m.original_filename;
      if (!uniqueMedia[filename] || (m.width * m.height) > (uniqueMedia[filename].width * uniqueMedia[filename].height)) {
        uniqueMedia[filename] = m;
      }
    });

    // Add media options (sorted by ID descending - newest first)
    Object.values(uniqueMedia)
      .sort((a, b) => b.id - a.id)
      .forEach(m => {
        const option = document.createElement('option');
        option.value = m.id;
        option.textContent = m.original_filename;
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

    // Add ALL media options (sorted by ID descending - newest first)
    // Important: Do not deduplicate by filename, as posts may reference older
    // images that share a filename and would otherwise be missing from the list.
    mediaList
      .slice()
      .sort((a, b) => b.id - a.id)
      .forEach(m => {
        const option = document.createElement('option');
        option.value = String(m.id);
        option.textContent = m.original_filename;
        heroSelect.appendChild(option);
      });
  }

  // Handle media deletion with confirmation
  let pendingDeleteMediaId = null;

  async function handleMediaDelete(mediaId, filename) {
    try {
      // First, check which posts use this media
      const response = await fetch(`/api/admin/media.php?check_usage=${mediaId}`);

        // After loading values, refresh the preview
        updateAdminDonationPreview();
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

  // Initialize Quill editor instances for hero and bio
  // Wait a bit for the DOM to be ready and tabs to be rendered
  setTimeout(() => {
    // Hero HTML editor
    const heroTextarea = document.getElementById('hero_html');
    if (heroTextarea) {
      heroEditor = window.initQuillEditor(heroTextarea, {
        placeholder: 'Enter hero banner text...',
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'link'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'align': [] }],
          ['blockquote', 'image'],
          ['clean']
        ]
      });

      // Set up auto-save
      heroAutoSave = setupSettingsAutoSave(heroEditor, 'hero_html');

      // Reload settings to populate editor
      loadSettings();
    }

    // Site Bio editor
    const bioTextarea = document.getElementById('site_bio_html');
    if (bioTextarea) {
      bioEditor = window.initQuillEditor(bioTextarea, {
        placeholder: 'Enter about section content...',
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'link'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'align': [] }],
          ['blockquote', 'image'],
          ['clean']
        ]
      });

      // Set up auto-save
      bioAutoSave = setupSettingsAutoSave(bioEditor, 'site_bio_html');

      // Reload settings to populate editor
      loadSettings();
    }

    // Donate editor
    const donateTextarea = document.getElementById('donate_text_html');
    if (donateTextarea) {
      donateEditor = window.initQuillEditor(donateTextarea, {
        placeholder: 'Enter donation section content...',
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'link'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'align': [] }],
          ['blockquote', 'image'],
          ['clean']
        ]
      });

      // Set up auto-save
      donateAutoSave = setupSettingsAutoSave(donateEditor, 'donate_text_html');

      // Reload settings to populate editor
      loadSettings();
    }

    // Donation Instructions editor (admin page)
    const donationInstructionsContainer = document.getElementById('donation_instructions_html');
    if (donationInstructionsContainer) {
      donationInstructionsEditor = window.initQuillEditor(donationInstructionsContainer, {
        placeholder: 'Add any instructions for donors (e.g., preferred apps, notes, etc.)...',
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'link'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'align': [] }],
          ['blockquote', 'image'],
          ['clean']
        ]
      });

      // Set up auto-save
      donationInstructionsAutoSave = setupSettingsAutoSave(donationInstructionsEditor, 'donation_instructions_html');

      // Live preview update on instructions change
      donationInstructionsEditor.on('text-change', () => {
        updateAdminDonationPreview();
      });

      // Reload settings to populate editor
      loadSettings();
    }

    // Load media options for image/QR code selector on admin page
    const qrMediaSelect = document.getElementById('donation_qr_media_id');
    let mediaOptionsLoaded = Promise.resolve(); // Default resolved promise

    if (qrMediaSelect && typeof SettingsManager !== 'undefined') {
      mediaOptionsLoaded = SettingsManager.loadMediaOptions(qrMediaSelect);
      // Update preview when selection changes
      qrMediaSelect.addEventListener('change', () => {
        updateAdminDonationPreview();
      });
    }

    // Make mediaOptionsLoaded available to loadSettings
    window.donationMediaOptionsLoaded = mediaOptionsLoaded;

    // Setup donation method radio listeners for admin page
    const methodRadios = document.querySelectorAll('input[name="donation_method"]');
    methodRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        updateDonationMethodVisibility('');
        updateAdminDonationPreview();
      });
    });

    // Initialize visibility based on current selection
    updateDonationMethodVisibility('');

    // Link input live preview
    const donationLinkInput = document.getElementById('donation_link');
    if (donationLinkInput) {
      donationLinkInput.addEventListener('input', () => {
        updateAdminDonationPreview();
      });
    }

    // Post body editor (initialize early to prevent modal height jumping)
    const postBodyTextarea = postEditorContainer.querySelector('.post-body');
    if (postBodyTextarea) {
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

      // Initialize AI title generator with editor instance
      if (typeof window.initAITitleGenerator === 'function') {
        window.initAITitleGenerator(postEditorContainer, postBodyEditor);
      }
    }

    // Setup modal event handlers
    // Ensure editingId is set from the trigger element before the modal actually shows
    postEditorModal.addEventListener('show.bs.modal', function(e) {
      const trigger = e.relatedTarget;
      if (trigger) {
        // Edit existing post button carries data-id
        const idAttr = trigger.getAttribute('data-id');
        if (idAttr) {
          editingId = parseInt(idAttr, 10) || null;
        } else if (trigger.id === 'btnNewPost') {
          editingId = null;
        }
      }
    });

    postEditorModal.addEventListener('shown.bs.modal', function() {
      // Clear gallery preview first (for both new and edit)
      const galleryPreview = postEditorContainer.querySelector('#galleryPreview');
      if (galleryPreview) {
        galleryPreview.innerHTML = '';
        galleryPreview.classList.add('empty');
      }
      galleryMediaIds = [];

      // Reset auto-save indicator immediately for new posts
      // This prevents stale "Draft saved" messages from previous edits
      if (!editingId) {
        const statusElement = document.getElementById('post-autosave-status');
        if (statusElement) {
          statusElement.innerHTML = '<span class="text-muted">Save post to enable auto-save</span>';
          statusElement.className = 'editor-autosave-indicator';
        }
      }

      // Initialize post editor crop manager if not already initialized
      if (typeof window.initPostEditorCrop === 'function' && !postEditorContainer._cropManager) {
        postEditorContainer._cropManager = window.initPostEditorCrop(postEditorContainer, CSRF);
      }

      // Show or hide Save Draft button based on edit vs new
      // Show for NEW posts (no editingId), hide for editing existing posts
      const saveDraftBtn = postEditorContainer.querySelector('.btn-save-draft');
      if (saveDraftBtn) {
        saveDraftBtn.style.display = editingId ? 'none' : 'inline-block';
      }

      // Status control is always hidden; Save Draft / Save and Publish determine intent

      // Setup hero image selection handler BEFORE loading post data
      const heroSelect = postEditorContainer.querySelector('.post-hero-media');
      const heroPreviewContainer = postEditorContainer.querySelector('.hero-preview-container');
      const heroPreview = postEditorContainer.querySelector('.hero-preview');
      const heroPreviewImg = heroPreview ? heroPreview.querySelector('img') : null;

      // Persist hero-related draft fields for existing posts
      const saveHeroDraft = async () => {
        if (!editingId) return; // Only auto-save for existing posts
        const heroHeightSlider = postEditorContainer.querySelector('.post-hero-height');
        const heroTitleOverlayToggle = postEditorContainer.querySelector('.post-hero-title-overlay');
        const heroOverlayOpacitySlider = postEditorContainer.querySelector('.post-hero-overlay-opacity');
        const payload = {
          hero_media_id: heroSelect?.value || null,
          hero_image_height: heroSelect?.value ? parseInt(heroHeightSlider?.value || 100) : null,
          hero_crop_overlay: heroSelect?.value ? (postEditorContainer.querySelector('.post-hero-crop-overlay')?.checked ? 1 : 0) : 0,
          hero_title_overlay: heroSelect?.value ? (heroTitleOverlayToggle?.checked ? 1 : 0) : 1,
          hero_overlay_opacity: heroSelect?.value ? parseFloat(heroOverlayOpacitySlider?.value || 0.70) : 0.70
        };
        try {
          await api('/api/admin/posts-draft.php?id=' + editingId, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
          });
        } catch (e) {
          console.warn('Auto-save hero draft failed:', e);
        }
      };

      if (heroSelect && !heroSelect.dataset.listenerAdded) {
        heroSelect.addEventListener('change', function() {
          const heroUploadControls = postEditorContainer.querySelector('.hero-upload-controls');
          const heroRemoveBtn = postEditorContainer.querySelector('.btn-remove-hero');

          if (this.value && heroPreviewImg) {
            // Load media info to show preview
            fetch(`/api/admin/media.php?id=${this.value}`)
              .then(r => r.json())
              .then(data => {
                if (data.success && data.data) {
                  const variants = JSON.parse(data.data.variants_json || '[]');
                  const variant400 = variants.find(v => v.width === 400);
                  let previewUrl;
                  if (variant400 && variant400.path) {
                    // Extract web-accessible path from full filesystem path
                    // Path format: /var/www/html/storage/uploads/... -> /storage/uploads/...
                    const pathMatch = variant400.path.match(/\/storage\/uploads\/.+$/);
                    previewUrl = pathMatch ? pathMatch[0] : variant400.path;
                  } else {
                    previewUrl = '/storage/uploads/originals/' + data.data.filename;
                  }

                  heroPreviewImg.src = previewUrl;
                  heroPreviewImg.alt = data.data.alt_text || '';
                  if (heroPreviewContainer) heroPreviewContainer.style.display = 'block';

                  // Hide upload controls and show remove button
                  if (heroUploadControls) heroUploadControls.style.display = 'none';
                  if (heroRemoveBtn) heroRemoveBtn.style.opacity = '1';

                  // Auto-save hero selection
                  saveHeroDraft();
                }
              })
              .catch(err => console.error('Error loading hero preview:', err));
          } else if (heroPreviewContainer) {
            heroPreviewContainer.style.display = 'none';
            // Auto-save cleared hero
            saveHeroDraft();
          }
        });
        heroSelect.dataset.listenerAdded = 'true';
      }

      // Setup hero remove button
      const heroRemoveBtn = postEditorContainer.querySelector('.btn-remove-hero');
      if (heroRemoveBtn && !heroRemoveBtn.dataset.listenerAdded) {
        heroRemoveBtn.addEventListener('click', function() {
          const heroUploadControls = postEditorContainer.querySelector('.hero-upload-controls');

          if (heroSelect) heroSelect.value = '';
          if (heroPreviewContainer) heroPreviewContainer.style.display = 'none';
          if (heroPreviewImg) heroPreviewImg.src = '';

          // Show upload controls and hide remove button
          if (heroUploadControls) heroUploadControls.style.display = 'block';
          this.style.opacity = '0';

          // Notify change so preview/save logic runs
          heroSelect?.dispatchEvent(new Event('change'));
        });
        heroRemoveBtn.dataset.listenerAdded = 'true';
      }

      // Setup hero height slider
      const heroHeightSlider = postEditorContainer.querySelector('.post-hero-height');
      const heroHeightValue = postEditorContainer.querySelector('.hero-height-value');
      if (heroHeightSlider && heroHeightValue && !heroHeightSlider.dataset.listenerAdded) {
        heroHeightSlider.addEventListener('input', function() {
          const heightPercent = parseInt(this.value);
          heroHeightValue.textContent = heightPercent;

          // Update preview padding-bottom to match actual display
          const heroPreviewDiv = postEditorContainer.querySelector('.hero-preview');
          if (heroPreviewDiv) {
            heroPreviewDiv.style.paddingBottom = heightPercent + '%';
          }
          // Auto-save hero height
          saveHeroDraft();
        });
        heroHeightSlider.dataset.listenerAdded = 'true';
      }

      // Setup title overlay preview update function
      const heroPreviewTitleOverlay = postEditorContainer.querySelector('.hero-preview-title-overlay');
      const heroTitleOverlayToggle = postEditorContainer.querySelector('.post-hero-title-overlay');
      const postTitleInput = postEditorContainer.querySelector('.post-title');
      const heroOverlayOpacitySlider = postEditorContainer.querySelector('.post-hero-overlay-opacity');
      const overlayOpacityValue = postEditorContainer.querySelector('.overlay-opacity-value');
      const heroOverlayOpacityControl = postEditorContainer.querySelector('.hero-overlay-opacity-control');

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

      // Setup event listeners for title overlay controls
      if (heroTitleOverlayToggle && !heroTitleOverlayToggle.dataset.listenerAdded) {
        heroTitleOverlayToggle.addEventListener('change', function(){
          updateHeroPreview();
          saveHeroDraft();
        });
        heroTitleOverlayToggle.dataset.listenerAdded = 'true';
      }

      if (heroOverlayOpacitySlider && !heroOverlayOpacitySlider.dataset.listenerAdded) {
        heroOverlayOpacitySlider.addEventListener('input', function() {
          const opacity = parseFloat(this.value);
          if (overlayOpacityValue) {
            overlayOpacityValue.textContent = opacity.toFixed(2);
          }
          updateHeroPreview();
          saveHeroDraft();
        });
        heroOverlayOpacitySlider.dataset.listenerAdded = 'true';
      }

      if (postTitleInput && !postTitleInput.dataset.titleListenerAdded) {
        postTitleInput.addEventListener('input', updateHeroPreview);
        postTitleInput.dataset.titleListenerAdded = 'true';
      }

  // Function to load post data into editor
  const loadPostIntoEditor = () => {
    // Load post data if editing (editingId set in show.bs.modal)
    if (editingId) {
        fetch('/api/admin/posts.php?id=' + editingId).then(r=>r.json()).then(j=>{
          if(j.success && j.data) {
            const post = j.data;


            // Use draft content for editing (falls back to published if no draft)
            postEditorContainer.querySelector('.post-title').value = post.title_editing || '';

            // Set post body in editor (use draft content)
            if (postBodyEditor) {
              window.setQuillHTML(postBodyEditor, post.body_html_editing || '');

              // Set up auto-save for this post (saves to draft)
              if (postAutoSave) {
                if (typeof postAutoSave.cleanup === 'function') {
                  postAutoSave.cleanup();
                } else {
                  clearInterval(postAutoSave);
                }
                postAutoSave = null;
              }
              postAutoSave = setupPostAutoSave(postBodyEditor, editingId);
            } else {
              postEditorContainer.querySelector('.post-body').value = post.body_html_editing || '';
            }

            // Set hero image if exists (use draft)
            const heroMediaId = post.hero_media_id_editing;
            if (heroMediaId) {
              const heroSelect = postEditorContainer.querySelector('.post-hero-media');
              if (heroSelect) {
                heroSelect.value = heroMediaId;
                // Trigger change to show preview
                heroSelect.dispatchEvent(new Event('change'));
              }
            } else {
              // Clear hero if no image
              const heroSelect = postEditorContainer.querySelector('.post-hero-media');
              const heroPreviewContainer = postEditorContainer.querySelector('.hero-preview-container');
              if (heroSelect) heroSelect.value = '';
              if (heroPreviewContainer) heroPreviewContainer.style.display = 'none';
            }

            // Set hero height if exists (use draft)
            const heroImageHeight = parseInt(post.hero_image_height_editing) || 100;
            const heroHeightSlider = postEditorContainer.querySelector('.post-hero-height');
            const heroHeightValue = postEditorContainer.querySelector('.hero-height-value');
            if (heroHeightSlider) {
              heroHeightSlider.value = heroImageHeight;
              if (heroHeightValue) heroHeightValue.textContent = heroImageHeight;

              // Update preview padding-bottom to match loaded height
              const heroPreviewDiv = postEditorContainer.querySelector('.hero-preview');
              if (heroPreviewDiv) {
                heroPreviewDiv.style.paddingBottom = heroImageHeight + '%';
              }
            }

            // Set hero title overlay if exists (use draft)
            const heroTitleOverlay = post.hero_title_overlay_editing !== undefined && post.hero_title_overlay_editing !== null
              ? parseInt(post.hero_title_overlay_editing)
              : 1;
            const heroTitleOverlayToggle = postEditorContainer.querySelector('.post-hero-title-overlay');
            if (heroTitleOverlayToggle) {
              heroTitleOverlayToggle.checked = heroTitleOverlay == 1;
            }

            // Set hero overlay opacity if exists (use draft)
            const heroOverlayOpacity = parseFloat(post.hero_overlay_opacity_editing) || 0.70;
            const heroOverlayOpacitySlider = postEditorContainer.querySelector('.post-hero-overlay-opacity');
            const overlayOpacityValue = postEditorContainer.querySelector('.overlay-opacity-value');
            if (heroOverlayOpacitySlider) {
              heroOverlayOpacitySlider.value = heroOverlayOpacity;
              if (overlayOpacityValue) overlayOpacityValue.textContent = heroOverlayOpacity.toFixed(2);
            }

            // Update hero preview with loaded values (wait for image to load first)
            setTimeout(() => {
              const heroPreviewTitleOverlay = postEditorContainer.querySelector('.hero-preview-title-overlay');
              const heroPreviewImg = heroPreview ? heroPreview.querySelector('img') : null;
              const heroOverlayOpacityControl = postEditorContainer.querySelector('.hero-overlay-opacity-control');

              if (heroPreviewImg && heroPreviewTitleOverlay) {
                const showTitleOverlay = heroTitleOverlayToggle?.checked ?? true;
                const titleText = postEditorContainer.querySelector('.post-title')?.value || 'Post Title Preview';

                // Show/hide opacity control based on title overlay toggle
                if (heroOverlayOpacityControl) {
                  heroOverlayOpacityControl.style.display = showTitleOverlay ? 'block' : 'none';
                }

                // Update image brightness
                if (showTitleOverlay) {
                  heroPreviewImg.style.filter = `brightness(${heroOverlayOpacity})`;
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
              }
            }, 100);

            // Load gallery images if exists (prefer draft editing version)
            const galleryData = post.gallery_media_ids_editing || post.gallery_media_ids;
            if (galleryData) {
              try {
                const galleryIds = JSON.parse(galleryData);
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

            // Hide Save Draft button for existing posts
            const saveDraftBtn = postEditorContainer.querySelector('.btn-save-draft');
            if (saveDraftBtn) {
              saveDraftBtn.style.display = 'none';
            }
          }
        });
      } else {
        // New post - clear the form
        postEditorContainer.querySelector('.post-title').value = '';

        // For new posts, show Save Draft button (ensure visible)
        const saveDraftBtn = postEditorContainer.querySelector('.btn-save-draft');
        if (saveDraftBtn) {
          saveDraftBtn.style.display = '';
        }
        if (postBodyEditor) {
          window.clearQuillEditor(postBodyEditor);
        } else {
          postEditorContainer.querySelector('.post-body').value = '';
        }
        postEditorContainer.querySelector('.post-hero-media').value = '';
        const clearHeroPreviewContainer = postEditorContainer.querySelector('.hero-preview-container');
        if (clearHeroPreviewContainer) clearHeroPreviewContainer.style.display = 'none';

        // Reset hero height slider to default
        const clearHeroHeightSlider = postEditorContainer.querySelector('.post-hero-height');
        const clearHeroHeightValue = postEditorContainer.querySelector('.hero-height-value');
        if (clearHeroHeightSlider) clearHeroHeightSlider.value = 100;
        if (clearHeroHeightValue) clearHeroHeightValue.textContent = '100';

        // Reset title overlay controls to defaults
        const clearHeroTitleOverlay = postEditorContainer.querySelector('.post-hero-title-overlay');
        if (clearHeroTitleOverlay) clearHeroTitleOverlay.checked = true;

        const clearHeroOverlayOpacity = postEditorContainer.querySelector('.post-hero-overlay-opacity');
        const clearOverlayOpacityValue = postEditorContainer.querySelector('.overlay-opacity-value');
        if (clearHeroOverlayOpacity) clearHeroOverlayOpacity.value = 0.70;
        if (clearOverlayOpacityValue) clearOverlayOpacityValue.textContent = '0.70';

        // Show upload controls and hide remove button for new posts
        const clearHeroUploadControls = postEditorContainer.querySelector('.hero-upload-controls');
        const clearHeroRemoveBtn = postEditorContainer.querySelector('.btn-remove-hero');
        if (clearHeroUploadControls) clearHeroUploadControls.style.display = 'block';
        if (clearHeroRemoveBtn) clearHeroRemoveBtn.style.opacity = '0';

        // Clear auto-save for new posts (they don't have an ID yet)
        if (postAutoSave) {
          if (typeof postAutoSave.cleanup === 'function') {
            postAutoSave.cleanup();
          } else {
            clearInterval(postAutoSave);
          }
          postAutoSave = null;
        }
        const statusElement = document.getElementById('post-autosave-status');
        if (statusElement) {
          statusElement.innerHTML = '<span class="text-muted">Save post to enable auto-save</span>';
          statusElement.className = 'editor-autosave-indicator';
        }
      }
    };

    // Call initial load
    loadPostIntoEditor();

    // Listen for refresh requests from cancellation handler
    const refreshListener = () => {
      // Check editingId at runtime (not captured in closure)
      if (editingId) {
        loadPostIntoEditor();
      }
    };
    document.addEventListener('post-editor:refresh-needed', refreshListener);

    // Clean up listener when modal closes
    postEditorModal.addEventListener('hidden.bs.modal', function cleanup() {
      document.removeEventListener('post-editor:refresh-needed', refreshListener);
      postEditorModal.removeEventListener('hidden.bs.modal', cleanup);
    }, { once: true });

    });

    // Cleanup editor when modal is hidden
    postEditorModal.addEventListener('hidden.bs.modal', function() {
      // Clean up any leftover backdrops
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      // Reset body classes that Bootstrap might have added
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      // Reset editing state
      editingId = null;
      galleryMediaIds = [];

      // Clear post auto-save interval
      if (postAutoSave) {
        if (typeof postAutoSave.cleanup === 'function') {
          postAutoSave.cleanup();
        } else {
          // Fallback for old interval ID format
          clearInterval(postAutoSave);
        }
        postAutoSave = null;
      }

      // Reset autosave indicator for next new post
      const statusElement = document.getElementById('post-autosave-status');
      if (statusElement) {
        statusElement.innerHTML = '<span class="text-muted">Save post to enable auto-save</span>';
        statusElement.className = 'editor-autosave-indicator';
      }
    });

    // Hero image upload handlers - now handled by ImageCropManager
    // The crop manager is initialized in the modal shown event handler
    // Old manual upload handlers removed to avoid conflicts

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
