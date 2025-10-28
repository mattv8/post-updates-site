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
    modal.querySelector('#modal_cta_text').value = settings.cta_text || '';
    modal.querySelector('#modal_cta_url').value = settings.cta_url || '';
    modal.querySelector('#modal_hero_overlay_opacity').value = settings.hero_overlay_opacity || 0.5;
    modal.querySelector('#modal_hero_overlay_color').value = settings.hero_overlay_color || '#000000';
    modal.querySelector('#modal_hero_height').value = settings.hero_height || 400;

    if (heroEditor) {
      window.setQuillHTML(heroEditor, settings.hero_html || '');
    }

    // Show hero preview if media selected
    if (settings.hero_media_id) {
      SettingsManager.loadHeroPreview(settings.hero_media_id, modal.querySelector('.hero-banner-preview'));
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
      const previewDiv = heroModal.querySelector('.hero-banner-preview');
      await SettingsManager.loadHeroPreview(this.value, previewDiv);
    });

    // Handle remove hero banner
    heroModal.querySelector('.btn-remove-hero-banner')?.addEventListener('click', function() {
      heroModal.querySelector('#modal_hero_media_id').value = '';
      heroModal.querySelector('.hero-banner-preview').style.display = 'none';
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
          cta_text: heroModal.querySelector('#modal_cta_text').value,
          cta_url: heroModal.querySelector('#modal_cta_url').value,
          hero_overlay_opacity: heroModal.querySelector('#modal_hero_overlay_opacity').value,
          hero_overlay_color: heroModal.querySelector('#modal_hero_overlay_color').value,
          hero_height: heroModal.querySelector('#modal_hero_height').value || 400,
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
