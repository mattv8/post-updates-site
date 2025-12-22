/**
 * Email Confirmation Handler
 * Shows a confirmation modal before sending email notifications to subscribers
 */

(function() {
  'use strict';

  // Pending resolver state for inline confirm
  let pending = {
    resolve: null,
    modal: null,
    resolved: false,
    action: null // 'email', 'publish-only', or null for cancel
  };

  /**
   * Get subscriber count for email notification
   * @param {number} postId - The post ID (optional, used for checking if it's first publish)
   * @returns {Promise<{subscriberCount: number}>}
   */
  async function getSubscriberCount(postId = 0) {
    // For resend email, we may not have a post ID, but we still want subscriber count
    // If postId is provided, use it; otherwise use a placeholder that won't fail
    const id = postId || 1; // Use 1 as fallback to avoid "Missing post ID" error

    const response = await fetch(`/api/admin/publish-check.php?id=${id}`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to get subscriber count');
    }

    return {
      subscriberCount: result.subscriberCount
    };
  }

  /**
   * Show confirmation modal for sending email
   * @param {number} subscriberCount - Number of active subscribers
   * @returns {Promise<'email'|'publish-only'|null>} - Which action user chose
   */
  function showEmailConfirmation(subscriberCount) {
    return new Promise((resolve) => {
      const modal = document.getElementById('publishConfirmModal');
      if (!modal) {
        console.error('[EMAIL] Email confirmation modal not found');
        resolve('email'); // Proceed with email if modal not found
        return;
      }

      // Ensure modal is a direct child of <body> to avoid stacking context issues
      if (modal.parentElement !== document.body) {
        document.body.appendChild(modal);
      }

      // Update subscriber count in modal
      const countEl = document.getElementById('publishConfirmSubscriberCount');
      if (countEl) {
        countEl.textContent = subscriberCount;
      }

      // Prepare pending resolver for inline onclick
      pending.resolve = (action) => {
        if (!pending.resolved) {
          pending.resolved = true;
          pending.action = action;
          resolve(action);
        }
      };
      pending.modal = modal;
      pending.resolved = false;
      pending.action = null;

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
            pending.resolve(null);
          }
        } finally {
          // Cleanup pending state
          pending.resolve = null;
          pending.modal = null;
          pending.resolved = false;
          pending.action = null;
        }
      };
      modal.addEventListener('hidden.bs.modal', onHidden, { once: true });

      // Show modal after wiring handlers
      bsModal.show();
    });
  }

  /**
   * Show email confirmation and execute action if confirmed
   * @param {Function} emailAction - The action to execute if user chooses "Publish & Email"
   * @param {number} postId - The post ID (optional)
   * @returns {Promise<{action: 'email'|'publish-only'|null}>} - Which action user chose
   */
  async function confirmAndSendEmail(emailAction, postId = 0) {
    try {
      // Get subscriber count
      const { subscriberCount } = await getSubscriberCount(postId);

      // Show confirmation modal
      const result = await showEmailConfirmation(subscriberCount);

      if (result === 'email') {
        // User chose to send email
        await emailAction();
        return { action: 'email', proceeded: true };
      } else if (result === 'publish-only') {
        // User chose to publish without email
        return { action: 'publish-only', proceeded: true };
      }

      return { action: null, proceeded: false }; // User cancelled
    } catch (error) {
      console.error('[EMAIL] Error in email confirmation:', error);
      // On error, ask user if they want to proceed anyway
      if (confirm('Unable to verify subscriber count. Proceed anyway?')) {
        await emailAction();
        return { action: 'email', proceeded: true };
      }
      return { action: null, proceeded: false };
    }
  }

  // Export to window for use in other scripts
  window.publishConfirmation = {
    getSubscriberCount,
    showEmailConfirmation,
    confirmAndSendEmail,
    // Called by inline onclick in the modal template for "Publish & Send Emails"
    inlineConfirm: function() {
      const modal = pending.modal || document.getElementById('publishConfirmModal');
      const bsInstance = modal ? (bootstrap.Modal.getInstance(modal) || new bootstrap.Modal(modal)) : null;

      // Call resolve BEFORE setting resolved flag, so the wrapper check passes
      if (pending.resolve && !pending.resolved) {
        pending.resolve('email');
      }

      // Then hide the modal
      if (bsInstance) {
        bsInstance.hide();
      }

      // Cleanup lightweight state
      pending.resolve = null;
      pending.modal = null;
    },
    // Called by inline onclick in the modal template for "Publish Only"
    inlinePublishOnly: function() {
      const modal = pending.modal || document.getElementById('publishConfirmModal');
      const bsInstance = modal ? (bootstrap.Modal.getInstance(modal) || new bootstrap.Modal(modal)) : null;

      // Call resolve with 'publish-only' action
      if (pending.resolve && !pending.resolved) {
        pending.resolve('publish-only');
      }

      // Then hide the modal
      if (bsInstance) {
        bsInstance.hide();
      }

      // Cleanup lightweight state
      pending.resolve = null;
      pending.modal = null;
    }
  };

})();
