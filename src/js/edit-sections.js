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

  // Auto-save intervals
  let heroAutoSave = null;
  let aboutAutoSave = null;
  let donationAutoSave = null;

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

})();
