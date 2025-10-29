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
  let footerCol1Editor = null;
  let footerCol2Editor = null;

  // Auto-save intervals
  let heroAutoSave = null;
  let aboutAutoSave = null;
  let donationAutoSave = null;
  let footerCol1AutoSave = null;
  let footerCol2AutoSave = null;

  // Helper function to setup auto-save
  function setupAutoSave(editor, fieldName, statusElementId, interval = 10000) {
    let lastSavedContent = '';
    let initialized = false;
    const statusElement = document.getElementById(statusElementId);

    if (statusElement) {
      statusElement.innerHTML = '<span class="text-muted">Auto-save enabled</span>';
      statusElement.className = 'editor-autosave-indicator';
    }

    return setInterval(() => {
      if (!editor) return;

      const currentContent = window.getQuillHTML(editor);

      if (!initialized) {
        lastSavedContent = currentContent;
        initialized = true;
        return;
      }

      if (currentContent !== lastSavedContent) {
        lastSavedContent = currentContent;

        if (statusElement) {
          statusElement.innerHTML = '<span class="saving">💾 Saving...</span>';
        }

        const payload = {};
        payload[fieldName] = currentContent;

        fetch('/api/admin/settings.php', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
        }).then(r => r.json()).then(j => {
          if (j.success) {
            const timestamp = new Date().toLocaleTimeString();
            if (statusElement) {
              statusElement.innerHTML = `<span class="saved">Last saved: ${timestamp}</span>`;
            }
          } else {
            console.error(`Auto-save failed for ${fieldName}:`, j.error);
            if (statusElement) {
              statusElement.innerHTML = '<span class="text-danger">⚠️ Save failed</span>';
            }
          }
        }).catch(err => {
          console.error(`Auto-save error for ${fieldName}:`, err);
          if (statusElement) {
            statusElement.innerHTML = '<span class="text-danger">⚠️ Save error</span>';
          }
        });
      }
    }, interval);
  }

  // Helper to populate form from settings
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

    if (donationEditor) {
      window.setQuillHTML(donationEditor, settings.donate_text_html || '');
    }
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
          heroAutoSave = setupAutoSave(heroEditor, 'hero_html', 'modal_hero-autosave-status', 10000);

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
          aboutAutoSave = setupAutoSave(aboutEditor, 'site_bio_html', 'modal_about-autosave-status', 10000);
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
    donationModal.addEventListener('shown.bs.modal', async function() {
      const editorContainer = donationModal.querySelector('#modal_donate_text_html');

      // Initialize editor only once
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
          donationAutoSave = setupAutoSave(donationEditor, 'donate_text_html', 'modal_donation-autosave-status', 10000);
        } catch (error) {
          console.error('Donation editor initialization error:', error);
        }
      }

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

      // Reset loading state for next open
      const loadingDiv = donationModal.querySelector('.modal-loading');
      const form = donationModal.querySelector('#donationFormModal');
      const saveBtn = document.getElementById('saveDonationModal');

      if (loadingDiv) loadingDiv.style.display = 'block';
      if (form) form.style.display = 'none';
      if (saveBtn) saveBtn.disabled = true;
    });

    // Save donation settings
    document.getElementById('saveDonationModal')?.addEventListener('click', async function() {
      const btn = this;
      const statusElement = document.getElementById('modal_donation-autosave-status');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      if (statusElement) {
        statusElement.innerHTML = '<span class="saving">💾 Saving...</span>';
      }

      try {
        const payload = {
          show_donation: donationModal.querySelector('#modal_show_donation').checked ? 1 : 0,
          donate_text_html: donationEditor ? window.getQuillHTML(donationEditor) : donationModal.querySelector('#modal_donate_text_html').value,
        };

        const result = await SettingsManager.saveSettings(payload);

        if (result.success) {
          const timestamp = new Date().toLocaleTimeString();
          if (statusElement) {
            statusElement.innerHTML = `<span class="saved text-success">✓ Saved at ${timestamp}</span>`;
          }
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
          footerCol1AutoSave = setupAutoSave(footerCol1Editor, 'footer_column1_html', 'modal_footer-col1-autosave-status', 10000);

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
          footerCol2AutoSave = setupAutoSave(footerCol2Editor, 'footer_column2_html', 'modal_footer-col2-autosave-status', 10000);

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
