/**
 * Auto-Save Utility for Quill Editors
 * Provides unified auto-save functionality for all Quill editor instances
 */
(function() {
  'use strict';

  /**
   * Setup auto-save for a Quill editor instance
   * @param {Object} editor - Quill editor instance
   * @param {Object} options - Configuration options
   * @param {string} options.saveUrl - API endpoint URL for saving
   * @param {Function} options.buildPayload - Function that builds the payload from content
   * @param {string} options.statusElementId - ID of the status indicator element
   * @param {string} options.fieldName - Name of the field being saved (for logging)
   * @param {string} [options.method='POST'] - HTTP method to use (POST or PUT)
   * @param {number} [options.interval=5000] - Auto-save interval in milliseconds
   * @param {number} [options.debounceDelay=1000] - Delay after cursor movement before saving
   * @param {number} [options.initDelay=500] - Delay before capturing baseline content
   * @returns {number} Interval ID that can be used with clearInterval
   */
  window.setupAutoSave = function(editor, options = {}) {
    const {
      saveUrl,
      buildPayload,
      statusElementId,
      fieldName = 'content',
      method = 'POST',
      interval = 5000,
      debounceDelay = 1000,
      initDelay = 500
    } = options;

    // Validation
    if (!editor) {
      console.error('setupAutoSave: editor is required');
      return null;
    }
    if (!saveUrl) {
      console.error('setupAutoSave: saveUrl is required');
      return null;
    }
    if (!buildPayload || typeof buildPayload !== 'function') {
      console.error('setupAutoSave: buildPayload function is required');
      return null;
    }

    let lastSavedContent = '';
    let initialized = false;
    let saveTimeout = null;

    // Helper to get status element (query fresh each time to handle dynamic content)
    const getStatusElement = () => statusElementId ? document.getElementById(statusElementId) : null;

    // Set initial status
    const statusElement = getStatusElement();
    if (statusElement) {
      statusElement.innerHTML = '<span class="text-muted">Auto-save enabled</span>';
      statusElement.className = 'editor-autosave-indicator';
    }

    // Get CSRF token
    const getCsrfToken = () => {
      const metaTag = document.querySelector('meta[name="csrf-token"]');
      if (metaTag) {
        return metaTag.content;
      }
      // Fallback to data attribute on adminApp (for admin.js compatibility)
      const adminApp = document.getElementById('adminApp');
      if (adminApp) {
        return adminApp.getAttribute('data-csrf') || '';
      }
      return '';
    };

    // Initialize the baseline content
    const initializeBaseline = () => {
      if (!initialized && editor) {
        lastSavedContent = window.getQuillHTML(editor);
        initialized = true;
      }
    };

    // Call initialization after a delay to ensure content is loaded
    setTimeout(initializeBaseline, initDelay);

    // Function to perform the actual save
    const performSave = () => {
      if (!editor) return;

      const currentContent = window.getQuillHTML(editor);

      // Make sure we're initialized
      if (!initialized) {
        initializeBaseline();
        return;
      }

      // Only save if content has changed
      if (currentContent !== lastSavedContent) {
        lastSavedContent = currentContent;

        // Update status to "Saving..."
        const statusElement = getStatusElement();

        if (statusElement) {
          statusElement.innerHTML = '<span class="saving">💾 Saving...</span>';
          statusElement.className = 'editor-autosave-indicator';
          // Force browser repaint
          void statusElement.offsetHeight;
        }

        // Build the payload using the provided function
        const payload = buildPayload(currentContent);

        // Get CSRF token
        const csrfToken = getCsrfToken();

        // Perform the save
        fetch(saveUrl, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify(payload)
        }).then(r => r.json()).then(j => {
          if (j.success) {
            const timestamp = new Date().toLocaleTimeString();

            // Update status to show last saved time
            const statusElement = getStatusElement();

            if (statusElement) {
              statusElement.innerHTML = `<span class="saved">Draft saved: ${timestamp}</span>`;
              statusElement.className = 'editor-autosave-indicator';
              // Force browser repaint
              void statusElement.offsetHeight;
            }
          } else {
            console.error(`Auto-save failed for "${fieldName}":`, j.error);
            const statusElement = getStatusElement();
            if (statusElement) {
              statusElement.innerHTML = '<span class="text-danger">⚠️ Save failed</span>';
              statusElement.className = 'editor-autosave-indicator';
            }
          }
        }).catch(err => {
          console.error(`Auto-save error for "${fieldName}":`, err);
          const statusElement = getStatusElement();
          if (statusElement) {
            statusElement.innerHTML = '<span class="text-danger">⚠️ Save error</span>';
            statusElement.className = 'editor-autosave-indicator';
          }
        });
      } else {
        // No changes detected, skip save
      }
    };

    // Setup selection change listener to save when user moves cursor
    editor.on('selection-change', function(range, oldRange, source) {
      if (range === null) return; // Editor lost focus
      if (!initialized) return; // Don't trigger until initialized

      // Debounce: only save if user pauses after cursor movement
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      saveTimeout = setTimeout(performSave, debounceDelay);
    });

    // Also save periodically
    return setInterval(performSave, interval);
  };

})();
