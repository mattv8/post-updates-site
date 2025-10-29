/**
 * Edit Section Modals Handler
 * Handles editing of Hero, About, and Donation sections from the home page
 * Uses settings data passed from backend via Smarty
 */
(function() {
  'use strict';

  // Check if user is authenticated
  if (!document.querySelector('meta[name="csrf-token"]')) {
    return; // Not authenticated, don't initialize
  }

  let heroEditor = null;
  let aboutEditor = null;
  let donationEditor = null;
  let donationInstructionsEditor = null;
  let footerCol1Editor = null;
  let footerCol2Editor = null;

  // Auto-save intervals
  let heroAutoSave = null;
  let aboutAutoSave = null;
  let donationAutoSave = null;
  let donationInstructionsAutoSave = null;
  let footerCol1AutoSave = null;
  let footerCol2AutoSave = null;

  // Helper function to setup auto-save for modal editors
  function setupModalAutoSave(editor, fieldName, statusElementId) {
    console.log('setupModalAutoSave called for:', fieldName);

    if (!window.setupAutoSave) {
      console.error('window.setupAutoSave is not defined!');
      return null;
    }

    return window.setupAutoSave(editor, {
      saveUrl: '/api/admin/settings.php',
      buildPayload: (content) => {
        const payload = {};
        payload[fieldName] = content;
        return payload;
      },
      statusElementId: statusElementId,
      fieldName: `${fieldName} (modal)`
    });
  }

  // Helper to populate form from settings
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

  function populateHeroForm(settings) {
    const modal = document.getElementById('editHeroModal');
    if (!modal || !settings) return;

    modal.querySelector('#modal_show_hero').checked = settings.show_hero == 1;
    modal.querySelector('#modal_hero_media_id').value = settings.hero_media_id || '';

    // Set overlay opacity slider and display value
    const opacitySlider = modal.querySelector('#modal_hero_overlay_opacity');
    const opacityValue = modal.querySelector('.hero-overlay-opacity-value');
    const opacityToSet = parseFloat(settings.hero_overlay_opacity) || 0.5;
    if (opacitySlider) {
      opacitySlider.value = opacityToSet;
      if (opacityValue) {
        opacityValue.textContent = opacityToSet.toFixed(2);
      }
    }

    // Set overlay color picker and hex input
    const colorPicker = modal.querySelector('#modal_hero_overlay_color');
    const colorHex = modal.querySelector('#modal_hero_overlay_color_hex');
    const colorToSet = settings.hero_overlay_color || '#000000';
    if (colorPicker) colorPicker.value = colorToSet;
    if (colorHex) colorHex.value = colorToSet;

    const heroHeightSlider = modal.querySelector('#modal_hero_height');
    const heroHeightValue = modal.querySelector('.hero-banner-height-value');
    const heroPreviewDiv = modal.querySelector('.hero-banner-preview');
    const heightToSet = settings.hero_height || 100;

    if (heroHeightSlider) {
      heroHeightSlider.value = heightToSet;
      if (heroHeightValue) {
        heroHeightValue.textContent = heightToSet;
      }
      if (heroPreviewDiv) {
        heroPreviewDiv.style.paddingBottom = heightToSet + '%';
      }
    }

    if (heroEditor) {
      window.setQuillHTML(heroEditor, settings.hero_html || '');
    }

    // Show hero preview if media selected
    if (settings.hero_media_id) {
      SettingsManager.loadHeroPreview(settings.hero_media_id, modal.querySelector('.hero-banner-preview-container'));
      // Update preview after a short delay to ensure elements are rendered
      setTimeout(() => updateHeroBannerPreview(), 100);
    }
  }

  // Function to update hero banner preview
  function updateHeroBannerPreview() {
    const modal = document.getElementById('editHeroModal');
    if (!modal) {
      console.log('updateHeroBannerPreview: modal not found');
      return;
    }

    const overlayDiv = modal.querySelector('.hero-banner-overlay');
    const textPreview = modal.querySelector('.hero-preview-content');
    const opacitySlider = modal.querySelector('#modal_hero_overlay_opacity');
    const colorPicker = modal.querySelector('#modal_hero_overlay_color');

    console.log('updateHeroBannerPreview called', {
      overlayDiv: !!overlayDiv,
      textPreview: !!textPreview,
      opacitySlider: !!opacitySlider,
      colorPicker: !!colorPicker
    });

    if (!overlayDiv) {
      console.log('updateHeroBannerPreview: overlayDiv not found');
      return;
    }

    // Update overlay color and opacity
    const opacity = parseFloat(opacitySlider?.value || 0.5);
    const color = colorPicker?.value || '#000000';

    console.log('Applying overlay styles:', { color, opacity });

    overlayDiv.style.backgroundColor = color;
    overlayDiv.style.opacity = opacity;

    // Update text preview from Quill editor
    if (heroEditor && textPreview) {
      const htmlContent = window.getQuillHTML(heroEditor);
      // Strip out HTML tags and get just the text, or use the HTML if you want formatting
      textPreview.innerHTML = htmlContent || 'Hero text will appear here...';
    }
  }

  function populateAboutForm(settings) {
    const modal = document.getElementById('editAboutModal');
    if (!modal || !settings) return;

    modal.querySelector('#modal_show_about').checked = settings.show_about == 1;

    if (aboutEditor) {
      window.setQuillHTML(aboutEditor, settings.site_bio_html || '');
    }
  }

  function populateDonationForm(settings) {
    const modal = document.getElementById('editDonationModal');
    if (!modal || !settings) return;

    modal.querySelector('#modal_show_donation').checked = settings.show_donation == 1;
    modal.querySelector('#modal_show_donate_button').checked = settings.show_donate_button == 1;

    // Set donation method radio buttons
    const donationMethod = settings.donation_method || 'link';
    const methodRadio = modal.querySelector(`#modal_donation_method_${donationMethod}`);
    if (methodRadio) {
      methodRadio.checked = true;
    }

    // Set donation link
    const donationLinkInput = modal.querySelector('#modal_donation_link');
    if (donationLinkInput) {
      donationLinkInput.value = settings.donation_link || '';
    }

    // Set donation QR media
    const qrMediaSelect = modal.querySelector('#modal_donation_qr_media_id');
    if (qrMediaSelect) {
      qrMediaSelect.value = settings.donation_qr_media_id || '';

      // Show QR preview if media is selected
      if (settings.donation_qr_media_id) {
        const qrPreviewContainer = modal.querySelector('.qr-preview-container');
        const qrPreviewImg = modal.querySelector('.qr-preview-img');
        if (qrPreviewImg && qrPreviewContainer) {
          qrPreviewImg.src = `/api/admin/media.php?id=${settings.donation_qr_media_id}`;
          qrPreviewContainer.style.display = 'block';
        }
      }
    }

    if (donationEditor) {
      window.setQuillHTML(donationEditor, settings.donate_text_html || '');
    }

    if (donationInstructionsEditor) {
      window.setQuillHTML(donationInstructionsEditor, settings.donation_instructions_html || '');
    }

    // Trigger visibility update based on donation method
    // Use a small delay to ensure listeners are attached
    setTimeout(() => {
      const event = new Event('change');
      if (methodRadio) {
        methodRadio.dispatchEvent(event);
      }
    }, 50);

    // Update preview after populating
    setTimeout(updateDonationPreview, 100);
  }

  function populateFooterForm(settings) {
    const modal = document.getElementById('editFooterModal');
    if (!modal || !settings) return;

    modal.querySelector('#modal_show_footer').checked = settings.show_footer == 1;

    // Set layout radio buttons
    const layoutSingle = modal.querySelector('#modal_footer_layout_single');
    const layoutDouble = modal.querySelector('#modal_footer_layout_double');
    if (settings.footer_layout === 'single') {
      layoutSingle.checked = true;
    } else {
      layoutDouble.checked = true;
    }

    // Update column 2 visibility based on layout
    updateFooterColumn2Visibility();

    // Populate editors
    if (footerCol1Editor) {
      window.setQuillHTML(footerCol1Editor, settings.footer_column1_html || '');
    }

    if (footerCol2Editor) {
      window.setQuillHTML(footerCol2Editor, settings.footer_column2_html || '');
    }

    // Use BackgroundPreviewManager to populate preview
    if (window.footerPreviewManager) {
      window.footerPreviewManager.populate(settings);
      // Update text preview with current footer content
      updateFooterTextPreview();
    }
  }

  // Update footer text preview with editor content
  function updateFooterTextPreview() {
    if (!window.footerPreviewManager || !footerCol1Editor) return;

    const modal = document.getElementById('editFooterModal');
    const layoutSingle = modal.querySelector('#modal_footer_layout_single');

    if (layoutSingle && layoutSingle.checked) {
      // Single column layout
      window.footerPreviewManager.setLayout('single');
      const col1HTML = window.getQuillHTML(footerCol1Editor);
      window.footerPreviewManager.updateTextContent(col1HTML);
    } else {
      // Two column layout
      window.footerPreviewManager.setLayout('double');
      const col1HTML = window.getQuillHTML(footerCol1Editor);
      const col2HTML = footerCol2Editor ? window.getQuillHTML(footerCol2Editor) : '';
      window.footerPreviewManager.updateColumn1(col1HTML);
      window.footerPreviewManager.updateColumn2(col2HTML);
    }
  }  // Function to update footer preview (overlay/color)
  function updateFooterPreview() {
    // This is now handled by BackgroundPreviewManager
    // Keeping function for compatibility, but it's a no-op
  }

  // Load footer background preview (legacy function for compatibility)
  async function loadFooterPreview(mediaId, previewContainer) {
    // This is now handled by BackgroundPreviewManager
    // Keeping function for compatibility
  }

  // Helper function to update donation modal preview
  function updateDonationPreview() {
    const modal = document.getElementById('editDonationModal');
    if (!modal) return;

    // Get current values
    let method = 'link';
    const methodRadios = modal.querySelectorAll('input[name="modal_donation_method"]');
    methodRadios.forEach(radio => {
      if (radio.checked) method = radio.value;
    });

    const link = modal.querySelector('#modal_donation_link')?.value || '';
    const qrSelect = modal.querySelector('#modal_donation_qr_media_id');
    const qrMediaId = qrSelect?.value || '';

    // Get instructions HTML
    const instructionsHTML = donationInstructionsEditor
      ? window.getQuillHTML(donationInstructionsEditor)
      : '<p>Thank you for your support!</p>';

    // Update preview instructions
    const previewInstructions = modal.querySelector('#modal_preview-instructions');
    if (previewInstructions) {
      previewInstructions.innerHTML = instructionsHTML;
    }

    // Update preview image/QR code - match actual modal structure
    const previewQr = modal.querySelector('#modal_preview-qr');
    const previewQrImg = previewQr?.querySelector('img');
    if (previewQr && previewQrImg) {
      const showQr = (method === 'qr' || method === 'both') && qrMediaId;
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
              previewQrImg.src = previewUrl;
              previewQrImg.alt = data.data.alt_text || 'Donation Image';
            }
          })
          .catch(err => console.error('Error loading image preview:', err));
        previewQr.style.display = 'block';
      } else {
        previewQr.style.display = 'none';
      }
    }

    // Update preview link - match actual modal structure
    const previewLink = modal.querySelector('#modal_preview-link');
    const previewLinkAnchor = previewLink?.querySelector('a');
    const previewLinkText = previewLink?.querySelector('.preview-link-text');
    const previewLinkIcon = previewLink?.querySelector('.preview-platform-icon');
    const previewLinkName = previewLink?.querySelector('.preview-platform-name');

    if (previewLink) {
      const showLink = (method === 'link' || method === 'both') && link;
      if (showLink) {
        if (previewLinkAnchor) previewLinkAnchor.href = link;

        // Update icon and name based on platform
        if (previewLinkIcon && previewLinkName) {
          const platform = detectPaymentPlatform(link);
          previewLinkIcon.className = `preview-platform-icon bi ${platform.icon} ${platform.color}`;
          previewLinkName.textContent = platform.name;
        }

        // Extract username from URL
        if (previewLinkText) {
          let username = link;
          if (link.includes('venmo.com/u/')) {
            username = link.split('venmo.com/u/')[1].split(/[/?#]/)[0];
          } else if (link.includes('venmo.com/code')) {
            username = link.split('venmo.com/code?')[1]?.split('&')[0] || link;
          } else if (link.includes('paypal.me/')) {
            username = link.split('paypal.me/')[1].split(/[/?#]/)[0];
          } else if (link.includes('ko-fi.com/')) {
            username = link.split('ko-fi.com/')[1].split(/[/?#]/)[0];
          } else if (link.includes('buymeacoffee.com/')) {
            username = link.split('buymeacoffee.com/')[1].split(/[/?#]/)[0];
          } else if (link.includes('cash.app/$')) {
            username = link.split('cash.app/$')[1].split(/[/?#]/)[0];
          } else if (link.includes('cash.me/$')) {
            username = link.split('cash.me/$')[1].split(/[/?#]/)[0];
          } else if (link.includes('patreon.com/')) {
            username = link.split('patreon.com/')[1].split(/[/?#]/)[0];
          } else if (link.includes('github.com/sponsors/')) {
            username = link.split('github.com/sponsors/')[1].split(/[/?#]/)[0];
          } else if (link.includes('gofundme.com/')) {
            username = link.split('gofundme.com/')[1]?.split(/[/?#]/)[0] || 'campaign';
          }
          previewLinkText.textContent = username;
        }

        previewLink.style.display = 'block';
      } else {
        previewLink.style.display = 'none';
      }
    }

    // Show/hide empty state - only show if no content is configured
    const previewEmpty = modal.querySelector('#modal_preview-empty');
    if (previewEmpty) {
      const hasQr = (method === 'qr' || method === 'both') && qrMediaId;
      const hasLink = (method === 'link' || method === 'both') && link;
      const hasContent = hasQr || hasLink;
      previewEmpty.style.display = hasContent ? 'none' : 'block';
    }
  }

  // Setup donation preview listeners
  function setupDonationPreviewListeners() {
    const modal = document.getElementById('editDonationModal');
    if (!modal) return;

    // Helper to toggle field visibility based on method
    function updateDonationMethodVisibility() {
      const methodRadios = modal.querySelectorAll('input[name="modal_donation_method"]');
      let selectedMethod = '';

      methodRadios.forEach(radio => {
        if (radio.checked) {
          selectedMethod = radio.value;
        }
      });

      // Get the containers
      const linkContainer = modal.querySelector('#modal_donation_link')?.closest('.mb-3');
      const qrContainer = modal.querySelector('#modal_donation_qr_media_id')?.closest('.mb-3');

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

    // Listen to donation method changes
    modal.querySelectorAll('input[name="modal_donation_method"]').forEach(radio => {
      radio.addEventListener('change', () => {
        updateDonationMethodVisibility();
        updateDonationPreview();
      });
    });

    // Listen to link changes
    const linkInput = modal.querySelector('#modal_donation_link');
    if (linkInput) {
      linkInput.addEventListener('input', updateDonationPreview);
    }

    // Listen to QR select changes
    const qrSelect = modal.querySelector('#modal_donation_qr_media_id');
    if (qrSelect) {
      qrSelect.addEventListener('change', updateDonationPreview);
    }

    // Initialize visibility based on current selection
    updateDonationMethodVisibility();
  }

  // Setup image/QR code upload functionality
  function setupDonationQrUpload() {
    const modal = document.getElementById('editDonationModal');
    if (!modal) return;

    const qrUploadInput = modal.querySelector('.qr-upload-input');
    const qrUploadBtn = modal.querySelector('.btn-upload-qr');
    const qrSelect = modal.querySelector('.modal_donation-qr-select');
    const qrPreviewContainer = modal.querySelector('.qr-preview-container');
    const qrPreviewImg = modal.querySelector('.qr-preview-img');
    const qrRemoveBtn = modal.querySelector('.btn-remove-qr');

    // Show upload button when file is selected
    if (qrUploadInput && qrUploadBtn) {
      qrUploadInput.addEventListener('change', function() {
        qrUploadBtn.style.display = this.files.length ? 'inline-block' : 'none';
      });
    }

    // Handle QR upload
    if (qrUploadBtn && qrUploadInput) {
      qrUploadBtn.addEventListener('click', async function() {
        const file = qrUploadInput.files[0];
        if (!file) return;

        // Validate file size (20MB)
        if (file.size > 20 * 1024 * 1024) {
          alert('File size must be less than 20MB');
          return;
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          alert('Invalid file type. Please use JPG, PNG, or WebP');
          return;
        }

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
        const formData = new FormData();
        formData.append('file', file);
        formData.append('alt_text', 'Donation Image');

        try {
          qrUploadBtn.disabled = true;
          const originalText = qrUploadBtn.textContent;
          qrUploadBtn.textContent = 'Uploading...';

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
            const qrMediaSelect = modal.querySelector('#modal_donation_qr_media_id');
            if (qrMediaSelect) {
              const option = document.createElement('option');
              option.value = data.id;
              option.textContent = file.name;
              option.selected = true;
              qrMediaSelect.appendChild(option);
            }

            // Show preview
            if (qrPreviewImg && qrPreviewContainer) {
              qrPreviewImg.src = `/api/admin/media.php?id=${data.id}`;
              qrPreviewContainer.style.display = 'block';
            }

            // Update donation modal preview
            updateDonationPreview();

            // Clear file input
            qrUploadInput.value = '';
            qrUploadBtn.style.display = 'none';
          } else {
            alert('Upload failed: ' + (data.error || 'Unknown error'));
          }

          qrUploadBtn.disabled = false;
          qrUploadBtn.textContent = originalText;
        } catch (error) {
          console.error('Error uploading image:', error);
          alert('An error occurred during upload');
          qrUploadBtn.disabled = false;
        }
      });
    }

    // Handle QR removal
    if (qrRemoveBtn) {
      qrRemoveBtn.addEventListener('click', function() {
        const qrMediaSelect = modal.querySelector('#modal_donation_qr_media_id');
        if (qrMediaSelect) {
          qrMediaSelect.value = '';
        }
        if (qrPreviewContainer) {
          qrPreviewContainer.style.display = 'none';
        }
        updateDonationPreview();
      });
    }

    // Show/hide QR preview based on selection
    if (qrSelect) {
      qrSelect.addEventListener('change', function() {
        if (this.value && qrPreviewContainer && qrPreviewImg) {
          qrPreviewImg.src = `/api/admin/media.php?id=${this.value}`;
          qrPreviewContainer.style.display = 'block';
        } else if (qrPreviewContainer) {
          qrPreviewContainer.style.display = 'none';
        }
      });
    }
  }

  // Helper function to show/hide column 2 based on layout selection
  function updateFooterColumn2Visibility() {
    const modal = document.getElementById('editFooterModal');
    if (!modal) return;

    const layoutSingle = modal.querySelector('#modal_footer_layout_single');
    const col2Container = modal.querySelector('#modal_footer_column2_container');

    if (col2Container) {
      col2Container.style.display = layoutSingle.checked ? 'none' : 'block';
    }
  }

  // Initialize Hero Modal
  const heroModal = document.getElementById('editHeroModal');
  if (heroModal) {

    // Load media options on page load
    const heroMediaSelect = heroModal.querySelector('#modal_hero_media_id');
    if (heroMediaSelect) {
      SettingsManager.loadMediaOptions(heroMediaSelect);
    }

    // Initialize Quill editor when modal is first shown
    heroModal.addEventListener('shown.bs.modal', async function() {
      const editorContainer = heroModal.querySelector('#modal_hero_html');

      // Initialize editor only once
      if (editorContainer && !heroEditor) {
        try {
          heroEditor = window.initQuillEditor(editorContainer, {
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

          // Setup auto-save
          heroAutoSave = setupModalAutoSave(heroEditor, 'hero_html', 'modal_hero-autosave-status');

          // Update preview when editor content changes
          heroEditor.on('text-change', function() {
            updateHeroBannerPreview();
          });
        } catch (error) {
          console.error('Hero editor initialization error:', error);
        }
      }

      // Populate form with data from window (set by Smarty)
      if (window.heroModalSettings) {
        populateHeroForm(window.heroModalSettings);
      } else {
        console.error('window.heroModalSettings not found!');
      }

      // Hide loading, show form, enable save button
      const loadingDiv = heroModal.querySelector('.modal-loading');
      const form = heroModal.querySelector('#modalHeroForm');
      const saveBtn = document.getElementById('saveHeroModal');

      if (loadingDiv) loadingDiv.style.display = 'none';
      if (form) form.style.display = 'block';
      if (saveBtn) saveBtn.disabled = false;
    });

    // Hero height slider handler
    const heroHeightSlider = heroModal.querySelector('#modal_hero_height');
    const heroHeightValue = heroModal.querySelector('.hero-banner-height-value');
    if (heroHeightSlider && heroHeightValue) {
      heroHeightSlider.addEventListener('input', function() {
        const heightPercent = parseInt(this.value);
        heroHeightValue.textContent = heightPercent;
        const heroPreviewDiv = heroModal.querySelector('.hero-banner-preview');
        if (heroPreviewDiv) {
          heroPreviewDiv.style.paddingBottom = heightPercent + '%';
        }
      });
    }

    // Overlay opacity slider handler
    const opacitySlider = heroModal.querySelector('#modal_hero_overlay_opacity');
    const opacityValue = heroModal.querySelector('.hero-overlay-opacity-value');
    if (opacitySlider && opacityValue) {
      opacitySlider.addEventListener('input', function() {
        const opacity = parseFloat(this.value);
        opacityValue.textContent = opacity.toFixed(2);
        updateHeroBannerPreview();
      });
    }

    // Color picker handlers - sync between color input and hex input
    const colorPicker = heroModal.querySelector('#modal_hero_overlay_color');
    const colorHex = heroModal.querySelector('#modal_hero_overlay_color_hex');
    if (colorPicker && colorHex) {
      colorPicker.addEventListener('input', function() {
        colorHex.value = this.value;
        updateHeroBannerPreview();
      });

      colorHex.addEventListener('input', function() {
        if (/^#[0-9A-Fa-f]{6}$/.test(this.value)) {
          colorPicker.value = this.value;
          updateHeroBannerPreview();
        }
      });
    }

    // Clean up when hidden
    heroModal.addEventListener('hidden.bs.modal', function() {
      if (heroAutoSave) {
        clearInterval(heroAutoSave);
        heroAutoSave = null;
      }

      // Reset loading state for next open
      const loadingDiv = heroModal.querySelector('.modal-loading');
      const form = heroModal.querySelector('#modalHeroForm');
      const saveBtn = document.getElementById('saveHeroModal');

      if (loadingDiv) loadingDiv.style.display = 'block';
      if (form) form.style.display = 'none';
      if (saveBtn) saveBtn.disabled = true;
    });

    // Handle hero media selection change
    heroModal.querySelector('#modal_hero_media_id')?.addEventListener('change', async function() {
      const previewContainer = heroModal.querySelector('.hero-banner-preview-container');
      await SettingsManager.loadHeroPreview(this.value, previewContainer);

      // Set initial preview height based on current slider value
      const heroPreviewDiv = heroModal.querySelector('.hero-banner-preview');
      const heroHeightSlider = heroModal.querySelector('#modal_hero_height');
      const currentHeight = parseInt(heroHeightSlider?.value || 100);
      if (heroPreviewDiv) {
        heroPreviewDiv.style.paddingBottom = currentHeight + '%';
      }

      // Update preview with overlay and text
      setTimeout(() => updateHeroBannerPreview(), 100);
    });

    // Handle remove hero banner
    heroModal.querySelector('.btn-remove-hero-banner')?.addEventListener('click', function() {
      heroModal.querySelector('#modal_hero_media_id').value = '';
      const previewContainer = heroModal.querySelector('.hero-banner-preview-container');
      if (previewContainer) previewContainer.style.display = 'none';

      // Reset height slider
      const heroHeightSlider = heroModal.querySelector('#modal_hero_height');
      const heroHeightValue = heroModal.querySelector('.hero-banner-height-value');
      if (heroHeightSlider) {
        heroHeightSlider.value = 100;
        if (heroHeightValue) heroHeightValue.textContent = '100';
      }
    });

    // Save hero settings
    document.getElementById('saveHeroModal')?.addEventListener('click', async function() {
      const btn = this;
      const statusElement = document.getElementById('modal_hero-autosave-status');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      if (statusElement) {
        statusElement.innerHTML = '<span class="saving">💾 Saving...</span>';
      }

      try {
        const payload = {
          show_hero: heroModal.querySelector('#modal_show_hero').checked ? 1 : 0,
          hero_media_id: heroModal.querySelector('#modal_hero_media_id').value || null,
          hero_html: heroEditor ? window.getQuillHTML(heroEditor) : heroModal.querySelector('#modal_hero_html').value,
          hero_overlay_opacity: parseFloat(heroModal.querySelector('#modal_hero_overlay_opacity').value),
          hero_overlay_color: heroModal.querySelector('#modal_hero_overlay_color').value,
          hero_height: heroModal.querySelector('#modal_hero_height').value || 100,
        };

        const result = await SettingsManager.saveSettings(payload);

        if (result.success) {
          const timestamp = new Date().toLocaleTimeString();
          if (statusElement) {
            statusElement.innerHTML = `<span class="saved text-success">✓ Saved at ${timestamp}</span>`;
          }

          // Close the modal
          const modalInstance = bootstrap.Modal.getInstance(heroModal);
          if (modalInstance) {
            modalInstance.hide();
          }

          // Refresh the page to show updated hero banner
          window.location.reload();
        } else {
          if (statusElement) {
            statusElement.innerHTML = '<span class="text-danger">⚠️ Save failed</span>';
          }
          alert('Error: ' + (result.error || 'Failed to save'));
        }
      } catch (error) {
        console.error('Error saving hero settings:', error);
        if (statusElement) {
          statusElement.innerHTML = '<span class="text-danger">⚠️ Save error</span>';
        }
        alert('An error occurred while saving');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
      }
    });
  }

  // Initialize About Modal
  const aboutModal = document.getElementById('editAboutModal');
  if (aboutModal) {
    aboutModal.addEventListener('shown.bs.modal', async function() {
      const editorContainer = aboutModal.querySelector('#modal_site_bio_html');

      // Initialize editor only once
      if (editorContainer && !aboutEditor) {
        try {
          aboutEditor = window.initQuillEditor(editorContainer, {
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

          // Setup auto-save
          aboutAutoSave = setupModalAutoSave(aboutEditor, 'site_bio_html', 'modal_about-autosave-status');
        } catch (error) {
          console.error('About editor initialization error:', error);
        }
      }

      // Populate form with data from window (set by Smarty)
      if (window.aboutModalSettings) {
        populateAboutForm(window.aboutModalSettings);
      }

      // Hide loading, show form, enable save button
      const loadingDiv = aboutModal.querySelector('.modal-loading');
      const form = aboutModal.querySelector('#aboutFormModal');
      const saveBtn = document.getElementById('saveAboutModal');

      if (loadingDiv) loadingDiv.style.display = 'none';
      if (form) form.style.display = 'block';
      if (saveBtn) saveBtn.disabled = false;
    });

    // Clean up when hidden
    aboutModal.addEventListener('hidden.bs.modal', function() {
      if (aboutAutoSave) {
        clearInterval(aboutAutoSave);
        aboutAutoSave = null;
      }

      // Reset loading state for next open
      const loadingDiv = aboutModal.querySelector('.modal-loading');
      const form = aboutModal.querySelector('#aboutFormModal');
      const saveBtn = document.getElementById('saveAboutModal');

      if (loadingDiv) loadingDiv.style.display = 'block';
      if (form) form.style.display = 'none';
      if (saveBtn) saveBtn.disabled = true;
    });

    // Save about settings
    document.getElementById('saveAboutModal')?.addEventListener('click', async function() {
      const btn = this;
      const statusElement = document.getElementById('modal_about-autosave-status');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      if (statusElement) {
        statusElement.innerHTML = '<span class="saving">💾 Saving...</span>';
      }

      try {
        const payload = {
          show_about: aboutModal.querySelector('#modal_show_about').checked ? 1 : 0,
          site_bio_html: aboutEditor ? window.getQuillHTML(aboutEditor) : aboutModal.querySelector('#modal_site_bio_html').value,
        };

        const result = await SettingsManager.saveSettings(payload);

        if (result.success) {
          const timestamp = new Date().toLocaleTimeString();
          if (statusElement) {
            statusElement.innerHTML = `<span class="saved text-success">✓ Saved at ${timestamp}</span>`;
          }

          // Close the modal
          const modalInstance = bootstrap.Modal.getInstance(aboutModal);
          if (modalInstance) {
            modalInstance.hide();
          }

          // Refresh the page to show updated about section
          window.location.reload();
        } else {
          if (statusElement) {
            statusElement.innerHTML = '<span class="text-danger">⚠️ Save failed</span>';
          }
          alert('Error: ' + (result.error || 'Failed to save'));
        }
      } catch (error) {
        console.error('Error saving about section:', error);
        if (statusElement) {
          statusElement.innerHTML = '<span class="text-danger">⚠️ Save error</span>';
        }
        alert('An error occurred while saving');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
      }
    });
  }

  // Initialize Donation Modal
  const donationModal = document.getElementById('editDonationModal');
  if (donationModal) {
    // Load media options on page load
    const donationQrMediaSelect = donationModal.querySelector('#modal_donation_qr_media_id');
    if (donationQrMediaSelect) {
      SettingsManager.loadMediaOptions(donationQrMediaSelect);
    }

    donationModal.addEventListener('shown.bs.modal', async function() {
      const editorContainer = donationModal.querySelector('#modal_donate_text_html');
      const instructionsContainer = donationModal.querySelector('#modal_donation_instructions_html');

      // Initialize donation content editor only once
      if (editorContainer && !donationEditor) {
        try {
          donationEditor = window.initQuillEditor(editorContainer, {
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

          // Setup auto-save
          donationAutoSave = setupModalAutoSave(donationEditor, 'donate_text_html', 'modal_donation-autosave-status');
        } catch (error) {
          console.error('Donation editor initialization error:', error);
        }
      }

      // Initialize donation instructions editor only once
      if (instructionsContainer && !donationInstructionsEditor) {
        try {
          console.log('Initializing donation instructions editor on element:', instructionsContainer);
          donationInstructionsEditor = window.initQuillEditor(instructionsContainer, {
            placeholder: 'Enter instructions for the donation modal...',
            toolbar: [
              [{ 'header': [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'link'],
              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
              [{ 'align': [] }],
              ['clean']
            ]
          });

          if (donationInstructionsEditor) {
            console.log('Donation instructions editor initialized successfully');
            // Setup auto-save
            donationInstructionsAutoSave = setupModalAutoSave(donationInstructionsEditor, 'donation_instructions_html', 'modal_donation-instructions-autosave-status');

            // Update preview when instructions change
            donationInstructionsEditor.on('text-change', () => {
              updateDonationPreview();
            });
          } else {
            console.error('Donation instructions editor initialization returned null/undefined');
          }
        } catch (error) {
          console.error('Donation instructions editor initialization error:', error);
        }
      } else {
        if (!instructionsContainer) {
          console.error('Donation instructions container not found with selector: #modal_donation_instructions_html');
        }
        if (donationInstructionsEditor) {
          console.log('Donation instructions editor already initialized');
        }
      }

      // Setup image/QR code upload handlers
      setupDonationQrUpload();

      // Setup preview update listeners
      setupDonationPreviewListeners();

      // Populate form with data from window (set by Smarty)
      if (window.donationModalSettings) {
        populateDonationForm(window.donationModalSettings);
      }

      // Hide loading, show form, enable save button
      const loadingDiv = donationModal.querySelector('.modal-loading');
      const form = donationModal.querySelector('#donationFormModal');
      const saveBtn = document.getElementById('saveDonationModal');

      if (loadingDiv) loadingDiv.style.display = 'none';
      if (form) form.style.display = 'block';
      if (saveBtn) saveBtn.disabled = false;
    });

    // Clean up when hidden
    donationModal.addEventListener('hidden.bs.modal', function() {
      if (donationAutoSave) {
        clearInterval(donationAutoSave);
        donationAutoSave = null;
      }

      if (donationInstructionsAutoSave) {
        clearInterval(donationInstructionsAutoSave);
        donationInstructionsAutoSave = null;
      }

      // Reset loading state for next open
      const loadingDiv = donationModal.querySelector('.modal-loading');
      const form = donationModal.querySelector('#donationFormModal');
      const saveBtn = document.getElementById('saveDonationModal');

      if (loadingDiv) loadingDiv.style.display = 'block';
      if (form) form.style.display = 'none';
      if (saveBtn) saveBtn.disabled = true;
    });

    // Immediate save for show donate button toggle
    const showDonateButtonToggle = donationModal.querySelector('#modal_show_donate_button');
    if (showDonateButtonToggle) {
      showDonateButtonToggle.addEventListener('change', async function() {
        const payload = { show_donate_button: this.checked ? 1 : 0 };
        try {
          const result = await SettingsManager.saveSettings(payload);
          if (result.success) {
            console.log('Donate button visibility updated:', this.checked);
          } else {
            console.error('Error updating donate button visibility:', result.error);
            // Revert toggle on error
            this.checked = !this.checked;
            alert('Error: ' + (result.error || 'Failed to update donate button visibility'));
          }
        } catch (error) {
          console.error('Error updating donate button visibility:', error);
          // Revert toggle on error
          this.checked = !this.checked;
          alert('Error updating donate button visibility');
        }
      });
    }

    // Save donation settings
    document.getElementById('saveDonationModal')?.addEventListener('click', async function() {
      const btn = this;
      const statusElement = document.getElementById('modal_donation-autosave-status');
      const instructionsStatusElement = document.getElementById('modal_donation-instructions-autosave-status');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      if (statusElement) {
        statusElement.innerHTML = '<span class="saving">💾 Saving...</span>';
      }
      if (instructionsStatusElement) {
        instructionsStatusElement.innerHTML = '<span class="saving">💾 Saving...</span>';
      }

      try {
        // Get donation method (link, qr, or both)
        let donationMethod = 'link';
        const methodRadios = donationModal.querySelectorAll('input[name="modal_donation_method"]');
        methodRadios.forEach(radio => {
          if (radio.checked) {
            donationMethod = radio.value;
          }
        });

        const payload = {
          show_donation: donationModal.querySelector('#modal_show_donation').checked ? 1 : 0,
          show_donate_button: donationModal.querySelector('#modal_show_donate_button').checked ? 1 : 0,
          donation_method: donationMethod,
          donation_link: donationModal.querySelector('#modal_donation_link').value || null,
          donation_qr_media_id: donationModal.querySelector('#modal_donation_qr_media_id').value || null,
          donation_instructions_html: donationInstructionsEditor ? window.getQuillHTML(donationInstructionsEditor) : donationModal.querySelector('#modal_donation_instructions_html').value,
          donate_text_html: donationEditor ? window.getQuillHTML(donationEditor) : donationModal.querySelector('#modal_donate_text_html').value,
        };

        const result = await SettingsManager.saveSettings(payload);

        if (result.success) {
          const timestamp = new Date().toLocaleTimeString();
          if (statusElement) {
            statusElement.innerHTML = `<span class="saved text-success">✓ Saved at ${timestamp}</span>`;
          }
          if (instructionsStatusElement) {
            instructionsStatusElement.innerHTML = `<span class="saved text-success">✓ Saved at ${timestamp}</span>`;
          }

          // Close the modal
          const modalInstance = bootstrap.Modal.getInstance(donationModal);
          if (modalInstance) {
            modalInstance.hide();
          }

          // Refresh the page to show updated donation section
          window.location.reload();
        } else {
          if (statusElement) {
            statusElement.innerHTML = '<span class="text-danger">⚠️ Save failed</span>';
          }
          alert('Error: ' + (result.error || 'Failed to save'));
        }
      } catch (error) {
        console.error('Error saving donation section:', error);
        if (statusElement) {
          statusElement.innerHTML = '<span class="text-danger">⚠️ Save error</span>';
        }
        alert('An error occurred while saving');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
      }
    });
  }

  // Initialize Footer Modal
  const footerModal = document.getElementById('editFooterModal');
  if (footerModal) {
    // Load media options on page load
    const footerMediaSelect = footerModal.querySelector('#modal_footer_media_id');
    if (footerMediaSelect) {
      SettingsManager.loadMediaOptions(footerMediaSelect);
    }

    // Layout radio button handlers
    footerModal.querySelector('#modal_footer_layout_single')?.addEventListener('change', () => {
      updateFooterColumn2Visibility();
      updateFooterTextPreview();
    });
    footerModal.querySelector('#modal_footer_layout_double')?.addEventListener('change', () => {
      updateFooterColumn2Visibility();
      updateFooterTextPreview();
    });

    // Note: Overlay opacity, color, media selection, and remove background
    // are now handled by BackgroundPreviewManager

    footerModal.addEventListener('shown.bs.modal', async function() {
      const editorContainer1 = footerModal.querySelector('#modal_footer_column1_html');
      const editorContainer2 = footerModal.querySelector('#modal_footer_column2_html');

      // Initialize BackgroundPreviewManager for footer
      if (!window.footerPreviewManager && window.BackgroundPreviewManager) {
        window.footerPreviewManager = new window.BackgroundPreviewManager('footer');
        window.footerPreviewManager.init();
      }

      // Initialize editors only once
      if (editorContainer1 && !footerCol1Editor) {
        try {
          footerCol1Editor = window.initQuillEditor(editorContainer1, {
            placeholder: 'Enter footer column 1 content...',
            toolbar: [
              [{ 'header': [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'link'],
              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
              [{ 'align': [] }],
              ['blockquote', 'image'],
              ['clean']
            ]
          });

          // Setup auto-save and text preview updates
          footerCol1AutoSave = setupModalAutoSave(footerCol1Editor, 'footer_column1_html', 'modal_footer-col1-autosave-status');

          // Update text preview when editor content changes
          footerCol1Editor.on('text-change', () => {
            updateFooterTextPreview();
          });
        } catch (error) {
          console.error('Footer column 1 editor initialization error:', error);
        }
      }

      if (editorContainer2 && !footerCol2Editor) {
        try {
          footerCol2Editor = window.initQuillEditor(editorContainer2, {
            placeholder: 'Enter footer column 2 content...',
            toolbar: [
              [{ 'header': [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'link'],
              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
              [{ 'align': [] }],
              ['blockquote', 'image'],
              ['clean']
            ]
          });

          // Setup auto-save and text preview updates
          footerCol2AutoSave = setupModalAutoSave(footerCol2Editor, 'footer_column2_html', 'modal_footer-col2-autosave-status');

          // Update text preview when editor content changes
          footerCol2Editor.on('text-change', () => {
            updateFooterTextPreview();
          });
        } catch (error) {
          console.error('Footer column 2 editor initialization error:', error);
        }
      }

      // Populate form with data from window (set by Smarty)
      if (window.footerModalSettings) {
        populateFooterForm(window.footerModalSettings);
      }

      // Hide loading, show form, enable save button
      const loadingDiv = footerModal.querySelector('.modal-loading');
      const form = footerModal.querySelector('#footerFormModal');
      const saveBtn = document.getElementById('saveFooterModal');

      if (loadingDiv) loadingDiv.style.display = 'none';
      if (form) form.style.display = 'block';
      if (saveBtn) saveBtn.disabled = false;
    });

    // Clean up when hidden
    footerModal.addEventListener('hidden.bs.modal', function() {
      if (footerCol1AutoSave) {
        clearInterval(footerCol1AutoSave);
        footerCol1AutoSave = null;
      }

      if (footerCol2AutoSave) {
        clearInterval(footerCol2AutoSave);
        footerCol2AutoSave = null;
      }

      // Reset loading state for next open
      const loadingDiv = footerModal.querySelector('.modal-loading');
      const form = footerModal.querySelector('#footerFormModal');
      const saveBtn = document.getElementById('saveFooterModal');

      if (loadingDiv) loadingDiv.style.display = 'block';
      if (form) form.style.display = 'none';
      if (saveBtn) saveBtn.disabled = true;
    });

    // Save footer settings
    document.getElementById('saveFooterModal')?.addEventListener('click', async function() {
      const btn = this;
      const statusElement1 = document.getElementById('modal_footer-col1-autosave-status');
      const statusElement2 = document.getElementById('modal_footer-col2-autosave-status');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      if (statusElement1) {
        statusElement1.innerHTML = '<span class="saving">💾 Saving...</span>';
      }
      if (statusElement2) {
        statusElement2.innerHTML = '<span class="saving">💾 Saving...</span>';
      }

      try {
        const layoutSingle = footerModal.querySelector('#modal_footer_layout_single');
        const payload = {
          show_footer: footerModal.querySelector('#modal_show_footer').checked ? 1 : 0,
          footer_layout: layoutSingle.checked ? 'single' : 'double',
          footer_media_id: footerModal.querySelector('#modal_footer_media_id').value || null,
          footer_height: parseInt(document.getElementById('footer_height')?.value) || 30,
          footer_overlay_opacity: parseFloat(document.getElementById('footer_overlay_opacity')?.value || 0.5),
          footer_overlay_color: document.getElementById('footer_overlay_color')?.value || '#000000',
          footer_column1_html: footerCol1Editor ? window.getQuillHTML(footerCol1Editor) : footerModal.querySelector('#modal_footer_column1_html').value,
          footer_column2_html: footerCol2Editor ? window.getQuillHTML(footerCol2Editor) : footerModal.querySelector('#modal_footer_column2_html').value,
        };

        const result = await SettingsManager.saveSettings(payload);

        if (result.success) {
          const timestamp = new Date().toLocaleTimeString();
          if (statusElement1) {
            statusElement1.innerHTML = `<span class="saved text-success">✓ Saved at ${timestamp}</span>`;
          }
          if (statusElement2) {
            statusElement2.innerHTML = `<span class="saved text-success">✓ Saved at ${timestamp}</span>`;
          }

          // Close the modal
          const modalInstance = bootstrap.Modal.getInstance(footerModal);
          if (modalInstance) {
            modalInstance.hide();
          }

          // Refresh the page to show updated footer
          window.location.reload();
        } else {
          if (statusElement1) {
            statusElement1.innerHTML = '<span class="text-danger">⚠️ Save failed</span>';
          }
          if (statusElement2) {
            statusElement2.innerHTML = '<span class="text-danger">⚠️ Save failed</span>';
          }
          alert('Error: ' + (result.error || 'Failed to save'));
        }
      } catch (error) {
        console.error('Error saving footer settings:', error);
        if (statusElement1) {
          statusElement1.innerHTML = '<span class="text-danger">⚠️ Save error</span>';
        }
        if (statusElement2) {
          statusElement2.innerHTML = '<span class="text-danger">⚠️ Save error</span>';
        }
        alert('An error occurred while saving');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
      }
    });
  }

})();
