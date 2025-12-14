/**
 * Unpublish Confirmation Handler
 * Shows a confirmation modal before unpublishing a post
 * Centralized to avoid code duplication between admin.js and home.js
 */

(function() {
  'use strict';

  // Pending resolver state
  let pending = {
    resolve: null,
    modal: null,
    resolved: false
  };

  /**
   * Show confirmation modal for unpublishing
   * @returns {Promise<boolean>} - True if user confirms, false if cancelled
   */
  function showUnpublishConfirmation() {
    return new Promise((resolve) => {
      const modal = document.getElementById('unpublishConfirmModal');
      if (!modal) {
        console.error('[UNPUBLISH] Unpublish confirmation modal not found');
        // Fallback to native confirm
        resolve(confirm('Are you sure you want to unpublish this post? It will be reverted to draft status and hidden from visitors.'));
        return;
      }

      // Ensure modal is a direct child of <body> to avoid stacking context issues
      if (modal.parentElement !== document.body) {
        document.body.appendChild(modal);
      }

      // Prepare pending resolver
      pending.resolve = (val) => {
        if (!pending.resolved) {
          pending.resolved = true;
          resolve(val);
        }
      };
      pending.modal = modal;
      pending.resolved = false;

      const bsModal = new bootstrap.Modal(modal);

      // If user dismisses without confirming, treat as cancel
      const onHidden = () => {
        try {
          if (!pending.resolved && pending.resolve) {
            pending.resolved = true;
            pending.resolve(false);
          }
        } finally {
          // Cleanup pending state
          pending.resolve = null;
          pending.modal = null;
          pending.resolved = false;
        }
      };
      modal.addEventListener('hidden.bs.modal', onHidden, { once: true });

      // Show modal
      bsModal.show();
    });
  }

  /**
   * Perform the unpublish API call
   * @param {number} postId - The post ID to unpublish
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function doUnpublish(postId) {
    const response = await fetch('/api/admin/posts.php?id=' + postId, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
      },
      body: JSON.stringify({ status: 'draft', published_at: null })
    });

    const result = await response.json();
    return result;
  }

  /**
   * Confirm and unpublish a post
   * Shows confirmation modal, then performs unpublish if confirmed
   * @param {number} postId - The post ID to unpublish
   * @param {Object} options - Callbacks
   * @param {Function} options.onSuccess - Called on success
   * @param {Function} options.onError - Called on error with error message
   * @param {Function} options.onStart - Called when unpublish starts (for button state)
   * @param {Function} options.onComplete - Called when complete (for button state reset)
   * @returns {Promise<boolean>} - True if unpublish succeeded
   */
  async function confirmAndUnpublish(postId, options = {}) {
    // Show confirmation
    const confirmed = await showUnpublishConfirmation();
    if (!confirmed) {
      return false;
    }

    // Signal start
    if (options.onStart) options.onStart();

    try {
      const result = await doUnpublish(postId);

      if (result.success) {
        // Purge cache
        if (typeof window.purgeSiteCache === 'function') {
          window.purgeSiteCache();
        }
        if (options.onSuccess) options.onSuccess();
        return true;
      } else {
        const errorMsg = result.error || 'Unknown error';
        if (options.onError) options.onError(errorMsg);
        return false;
      }
    } catch (err) {
      console.error('[UNPUBLISH] Error:', err);
      if (options.onError) options.onError(err.message || 'An error occurred');
      return false;
    } finally {
      if (options.onComplete) options.onComplete();
    }
  }

  // Export to window
  window.unpublishConfirmation = {
    showUnpublishConfirmation,
    confirmAndUnpublish,
    // Called by inline onclick in the modal template
    inlineConfirm: function() {
      const modal = pending.modal || document.getElementById('unpublishConfirmModal');
      const bsInstance = modal ? (bootstrap.Modal.getInstance(modal) || new bootstrap.Modal(modal)) : null;

      if (pending.resolve && !pending.resolved) {
        pending.resolve(true);
      }

      if (bsInstance) {
        bsInstance.hide();
      }

      pending.resolve = null;
      pending.modal = null;
    }
  };

})();
