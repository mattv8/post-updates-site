/**
 * Publish Confirmation Handler
 * Shows a confirmation modal before publishing a post for the first time
 * which triggers email notifications to subscribers
 */

(function() {
  'use strict';

  // Pending resolver state for inline confirm
  let pending = {
    resolve: null,
    modal: null,
    resolved: false,
    intent: 'email' // 'email' | 'skip'
  };

  /**
   * Check if publishing will trigger email notifications
   * @param {number} postId - The post ID to check
   * @returns {Promise<{isFirstPublish: boolean, subscriberCount: number}>}
   */
  async function checkPublishStatus(postId) {
    const response = await fetch(`/api/admin/publish-check.php?id=${postId}`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to check publish status');
    }

    return {
      isFirstPublish: result.isFirstPublish,
      subscriberCount: result.subscriberCount
    };
  }

  /**
   * Show confirmation modal for first-time publish
   * @param {number} subscriberCount - Number of active subscribers
   * @returns {Promise<boolean>} - True if user confirms, false if cancelled
   */
  function showPublishConfirmation(subscriberCount) {
    return new Promise((resolve) => {
      const modal = document.getElementById('publishConfirmModal');
      if (!modal) {
        console.error('[PUBLISH] Publish confirmation modal not found');
        resolve(true); // Proceed anyway if modal not found
        return;
      }

      // Ensure modal is a direct child of <body> to avoid stacking context issues
      // (Bootstrap's backdrop is appended to body; nested modals can appear behind it)
      if (modal.parentElement !== document.body) {
        document.body.appendChild(modal);
      }

      // Update subscriber count in modal
      const countEl = document.getElementById('publishConfirmSubscriberCount');
      if (countEl) {
        countEl.textContent = subscriberCount;
      }

      // Prepare pending resolver for inline onclick
      pending.resolve = (val) => {
        if (!pending.resolved) {
          pending.resolved = true;
          resolve(val);
        }
      };
      pending.modal = modal;
      pending.resolved = false;
      pending.intent = 'email';

      const bsModal = new bootstrap.Modal(modal);

      // If user dismisses without inline confirm, treat as cancel
      const onHidden = () => {
        try {
          // Dispatch a cancellation event so callers can re-enable UI controls
          try {
            const evt = new CustomEvent('publish-confirmation:cancelled', { detail: { reason: 'modal-hidden' } });
            document.dispatchEvent(evt);
          } catch (e) {
            // ignore if CustomEvent not supported
          }
          if (!pending.resolved && pending.resolve) {
            pending.resolved = true;
            pending.resolve(false);
          }
        } finally {
          // Cleanup pending state
          pending.resolve = null;
          pending.modal = null;
          pending.resolved = false;
          pending.intent = 'email';
        }
      };
      modal.addEventListener('hidden.bs.modal', onHidden, { once: true });

      // Show modal after wiring handlers
      bsModal.show();
    });
  }

  /**
   * Wrap a publish action with confirmation check
   * @param {number} postId - The post ID to publish
   * @param {Function} publishAction - The actual publish function to call if confirmed
   * @returns {Promise<boolean>} - True if publish proceeded, false if cancelled
   */
  async function confirmAndPublish(postId, publishAction, publishNoEmailAction) {
    try {
      // Check if this is a first-time publish
      const status = await checkPublishStatus(postId);

      // If not first publish, proceed without confirmation
      if (!status.isFirstPublish) {
        await publishAction();
        return true;
      }

      // Show confirmation modal for first-time publish
      const decision = await showPublishConfirmation(status.subscriberCount);

      if (decision === true) {
        await publishAction();
        return true;
      } else if (decision === 'skip') {
        if (typeof publishNoEmailAction === 'function') {
          await publishNoEmailAction();
          return true;
        }
        // Fallback: proceed with main action if no alternative provided
        await publishAction();
        return true;
      }

      return false; // User cancelled
    } catch (error) {
      console.error('[PUBLISH] Error in publish confirmation:', error);
      // On error, ask user if they want to proceed anyway
      if (confirm('Unable to verify publish status. Proceed anyway?')) {
        await publishAction();
        return true;
      }
      return false;
    }
  }

  // Export to window for use in other scripts
  window.publishConfirmation = {
    checkPublishStatus,
    showPublishConfirmation,
    confirmAndPublish,
    // Called by inline onclick in the modal template
    inlineConfirm: function() {
      const modal = pending.modal || document.getElementById('publishConfirmModal');
      const bsInstance = modal ? (bootstrap.Modal.getInstance(modal) || new bootstrap.Modal(modal)) : null;

      // Call resolve BEFORE setting resolved flag, so the wrapper check passes
      if (pending.resolve && !pending.resolved) {
        pending.resolve(true); // This calls the wrapper which sets pending.resolved = true
      }

      // Then hide the modal
      if (bsInstance) {
        bsInstance.hide();
      }

      // Cleanup lightweight state; resolved flag resets on next show
      pending.resolve = null;
      pending.modal = null;
  },
  inlineConfirmNoEmail: function() {
      const modal = pending.modal || document.getElementById('publishConfirmModal');
      const bsInstance = modal ? (bootstrap.Modal.getInstance(modal) || new bootstrap.Modal(modal)) : null;

      // Set intent and resolve
      pending.intent = 'skip';
      if (pending.resolve && !pending.resolved) {
        pending.resolve('skip');
      }

      if (bsInstance) {
        bsInstance.hide();
      }

      pending.resolve = null;
      pending.modal = null;
    }
  };

})();
