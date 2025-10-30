/**
 * Newsletter Admin Management
 * Handles CRUD operations for newsletter subscribers in the admin panel
 */
(function() {
  'use strict';

  let subscribers = [];
  let currentDeleteId = null;
  let currentReactivateId = null;
  let showArchived = false;

  // Get CSRF token
  function getCsrfToken() {
    const adminApp = document.getElementById('adminApp');
    return adminApp ? adminApp.getAttribute('data-csrf') : '';
  }

  // Format date for display
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Load subscribers from API
  async function loadSubscribers() {
    const tbody = document.getElementById('subscribersList');

    if (!tbody) return;

    // Show loading state
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted py-4">
          <div class="spinner-border spinner-border-sm me-2" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          Loading subscribers...
        </td>
      </tr>
    `;

    try {
      const url = `/api/admin/newsletter.php${showArchived ? '?show_archived=true' : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-CSRF-Token': getCsrfToken()
        }
      });

      const result = await response.json();

      if (result.success) {
        subscribers = result.data;
        renderSubscribers();
      } else {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" class="text-center text-danger py-4">
              <i class="bi bi-exclamation-triangle me-2"></i>
              Error loading subscribers: ${result.error || 'Unknown error'}
            </td>
          </tr>
        `;
      }
    } catch (error) {
      console.error('Error loading subscribers:', error);
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-danger py-4">
            <i class="bi bi-exclamation-triangle me-2"></i>
            Network error. Please try again.
          </td>
        </tr>
      `;
    }
  }

  // Load mailing list visibility setting
  async function loadMailingListVisibility() {
    const toggle = document.getElementById('show_mailing_list');
    const notifyToggle = document.getElementById('notify_subscribers_on_post');
    const includeBodyToggle = document.getElementById('email_include_post_body');
    const rateLimitInput = document.getElementById('smtp_rate_limit');
    const ratePeriodInput = document.getElementById('smtp_rate_period');
    const batchDelayInput = document.getElementById('smtp_batch_delay');

    if (!toggle && !notifyToggle && !includeBodyToggle && !rateLimitInput) return;

    try {
      const response = await fetch('/api/admin/settings.php', {
        method: 'GET',
        headers: {
          'X-CSRF-Token': getCsrfToken()
        }
      });

      const result = await response.json();

      if (result.success && result.data) {
        if (toggle) {
          toggle.checked = result.data.show_mailing_list == 1;
        }
        if (notifyToggle) {
          notifyToggle.checked = result.data.notify_subscribers_on_post == 1;
        }
        if (includeBodyToggle) {
          includeBodyToggle.checked = result.data.email_include_post_body == 1;
        }
        if (rateLimitInput) {
          rateLimitInput.value = result.data.smtp_rate_limit || 20;
        }
        if (ratePeriodInput) {
          ratePeriodInput.value = result.data.smtp_rate_period || 60;
        }
        if (batchDelayInput) {
          batchDelayInput.value = result.data.smtp_batch_delay || 0.5;
        }
      }
    } catch (error) {
      console.error('Error loading mailing list settings:', error);
    }
  }

  // Render subscribers table
  function renderSubscribers() {
    const tbody = document.getElementById('subscribersList');
    const tableWrapper = tbody.closest('.table-responsive');

    if (!tbody) return;

    if (subscribers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-muted py-4">
            <i class="bi bi-info-circle me-2"></i>
            No subscribers yet. Users can sign up via the mailing list section on the home page.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = subscribers.map(sub => {
      const isActive = sub.is_active == 1;
      const statusBadge = isActive
        ? '<span class="badge bg-success">Active</span>'
        : '<span class="badge bg-secondary">Archived</span>';

      return `
        <tr ${!isActive ? 'class="table-secondary"' : ''}>
          <td>${sub.email}</td>
          <td>${formatDate(sub.subscribed_at)}</td>
          <td>${statusBadge}</td>
          <td>
            ${isActive ? `
              <button class="btn btn-sm btn-outline-danger" onclick="window.newsletterAdmin.deleteSubscriber(${sub.id}, '${sub.email}')">
                <i class="bi bi-trash"></i> Archive
              </button>
            ` : `
              <button class="btn btn-sm btn-outline-success" onclick="window.newsletterAdmin.reactivateSubscriber(${sub.id}, '${sub.email}')">
                <i class="bi bi-arrow-clockwise"></i> Reactivate
              </button>
            `}
          </td>
        </tr>
      `;
    }).join('');
  }

  // Delete (archive) subscriber
  function deleteSubscriber(id, email) {
    currentDeleteId = id;
    const emailSpan = document.getElementById('deleteSubscriberEmail');
    if (emailSpan) emailSpan.textContent = email;

    const modal = new bootstrap.Modal(document.getElementById('deleteSubscriberModal'));
    modal.show();
  }

  // Confirm delete subscriber
  async function confirmDelete() {
    if (!currentDeleteId) return;

    const btn = document.getElementById('confirmDeleteSubscriber');
    if (!btn) return;

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Archiving...';

    try {
      const response = await fetch(`/api/admin/newsletter.php?id=${currentDeleteId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': getCsrfToken()
        }
      });

      const result = await response.json();

      if (result.success) {
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteSubscriberModal'));
        if (modal) modal.hide();

        // Reload subscribers
        await loadSubscribers();
      } else {
        alert('Error archiving subscriber: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error archiving subscriber:', error);
      alert('Network error. Please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
      currentDeleteId = null;
    }
  }

  // Reactivate subscriber
  function reactivateSubscriber(id, email) {
    currentReactivateId = id;
    const emailSpan = document.getElementById('reactivateSubscriberEmail');
    if (emailSpan) emailSpan.textContent = email;

    const modal = new bootstrap.Modal(document.getElementById('reactivateSubscriberModal'));
    modal.show();
  }

  // Confirm reactivate subscriber
  async function confirmReactivate() {
    if (!currentReactivateId) return;

    const btn = document.getElementById('confirmReactivateSubscriber');
    if (!btn) return;

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Reactivating...';

    try {
      const response = await fetch('/api/admin/newsletter.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        body: JSON.stringify({
          id: currentReactivateId,
          is_active: 1
        })
      });

      const result = await response.json();

      if (result.success) {
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('reactivateSubscriberModal'));
        if (modal) modal.hide();

        // Reload subscribers
        await loadSubscribers();
      } else {
        alert('Error reactivating subscriber: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error reactivating subscriber:', error);
      alert('Network error. Please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
      currentReactivateId = null;
    }
  }

  // Add subscriber
  async function addSubscriber() {
    const emailInput = document.getElementById('newSubscriberEmail');
    const form = document.getElementById('addSubscriberForm');
    const btn = document.getElementById('confirmAddSubscriber');

    if (!emailInput || !form || !btn) return;

    // Validate form
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    const email = emailInput.value.trim();

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Adding...';

    try {
      const response = await fetch('/api/admin/newsletter.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        body: JSON.stringify({ email: email })
      });

      const result = await response.json();

      if (result.success) {
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addSubscriberModal'));
        if (modal) modal.hide();

        // Reset form
        form.reset();
        form.classList.remove('was-validated');

        // Reload subscribers
        await loadSubscribers();
      } else {
        alert('Error adding subscriber: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding subscriber:', error);
      alert('Network error. Please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    // Load show_mailing_list setting
    loadMailingListVisibility();

    // Load subscribers when newsletter tab is shown
    const newsletterTab = document.getElementById('tab-newsletter');
    const newsletterPane = document.getElementById('pane-newsletter');

    if (newsletterTab) {
      // Load subscribers when tab is clicked/shown
      newsletterTab.addEventListener('shown.bs.tab', function() {
        loadSubscribers();
        loadMailingListVisibility();
      });

      // Also check if newsletter pane is already visible/active on page load
      // This handles cases where the page loads with this tab pre-selected
      setTimeout(function() {
        if (newsletterPane && (newsletterPane.classList.contains('active') || newsletterPane.classList.contains('show'))) {
          loadSubscribers();
        }
      }, 100);
    }

    // Show mailing list visibility toggle
    const showMailingListToggle = document.getElementById('show_mailing_list');
    if (showMailingListToggle) {
      showMailingListToggle.addEventListener('change', async function() {
        const payload = { show_mailing_list: this.checked ? 1 : 0 };

        try {
          const response = await fetch('/api/admin/settings.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCsrfToken()
            },
            body: JSON.stringify(payload)
          });

          const result = await response.json();

          if (result.success) {
            console.log('Mailing list visibility updated:', this.checked);
          } else {
            console.error('Error updating mailing list visibility:', result.error);
            // Revert toggle on error
            this.checked = !this.checked;
            alert('Error: ' + (result.error || 'Failed to update mailing list visibility'));
          }
        } catch (error) {
          console.error('Error updating mailing list visibility:', error);
          // Revert toggle on error
          this.checked = !this.checked;
          alert('Error updating mailing list visibility');
        }
      });
    }

    // Email notification toggles
    const notifyToggle = document.getElementById('notify_subscribers_on_post');
    if (notifyToggle) {
      notifyToggle.addEventListener('change', async function() {
        const payload = { notify_subscribers_on_post: this.checked ? 1 : 0 };

        try {
          const response = await fetch('/api/admin/settings.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCsrfToken()
            },
            body: JSON.stringify(payload)
          });

          const result = await response.json();

          if (result.success) {
            console.log('Email notification setting updated:', this.checked);
          } else {
            console.error('Error updating email notification setting:', result.error);
            this.checked = !this.checked;
            alert('Error: ' + (result.error || 'Failed to update email notification setting'));
          }
        } catch (error) {
          console.error('Error updating email notification setting:', error);
          this.checked = !this.checked;
          alert('Error updating email notification setting');
        }
      });
    }

    const includeBodyToggle = document.getElementById('email_include_post_body');
    if (includeBodyToggle) {
      includeBodyToggle.addEventListener('change', async function() {
        const payload = { email_include_post_body: this.checked ? 1 : 0 };

        try {
          const response = await fetch('/api/admin/settings.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCsrfToken()
            },
            body: JSON.stringify(payload)
          });

          const result = await response.json();

          if (result.success) {
            console.log('Email body inclusion setting updated:', this.checked);
          } else {
            console.error('Error updating email body inclusion setting:', result.error);
            this.checked = !this.checked;
            alert('Error: ' + (result.error || 'Failed to update email body inclusion setting'));
          }
        } catch (error) {
          console.error('Error updating email body inclusion setting:', error);
          this.checked = !this.checked;
          alert('Error updating email body inclusion setting');
        }
      });
    }

    // SMTP Rate Limit input
    const rateLimitInput = document.getElementById('smtp_rate_limit');
    const rateLimitStatus = document.getElementById('smtp_rate_limit_status');
    if (rateLimitInput) {
      rateLimitInput.addEventListener('change', async function() {
        const value = parseInt(this.value);
        if (value < 0) {
          this.value = 0;
          return;
        }

        const payload = { smtp_rate_limit: value };

        try {
          const response = await fetch('/api/admin/settings.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCsrfToken()
            },
            body: JSON.stringify(payload)
          });

          const result = await response.json();

          if (result.success) {
            console.log('SMTP rate limit updated:', value);
            // Show success indicator
            if (rateLimitStatus) {
              rateLimitStatus.style.display = 'block';
              setTimeout(() => {
                rateLimitStatus.style.display = 'none';
              }, 2000);
            }
          } else {
            console.error('Error updating SMTP rate limit:', result.error);
            alert('Error: ' + (result.error || 'Failed to update SMTP rate limit'));
          }
        } catch (error) {
          console.error('Error updating SMTP rate limit:', error);
          alert('Error updating SMTP rate limit');
        }
      });
    }

    // SMTP Rate Period input
    const ratePeriodInput = document.getElementById('smtp_rate_period');
    const ratePeriodStatus = document.getElementById('smtp_rate_period_status');
    if (ratePeriodInput) {
      ratePeriodInput.addEventListener('change', async function() {
        const value = parseInt(this.value);
        if (value < 1) {
          this.value = 1;
          return;
        }

        const payload = { smtp_rate_period: value };

        try {
          const response = await fetch('/api/admin/settings.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCsrfToken()
            },
            body: JSON.stringify(payload)
          });

          const result = await response.json();

          if (result.success) {
            console.log('SMTP rate period updated:', value);
            // Show success indicator
            if (ratePeriodStatus) {
              ratePeriodStatus.style.display = 'block';
              setTimeout(() => {
                ratePeriodStatus.style.display = 'none';
              }, 2000);
            }
          } else {
            console.error('Error updating SMTP rate period:', result.error);
            alert('Error: ' + (result.error || 'Failed to update SMTP rate period'));
          }
        } catch (error) {
          console.error('Error updating SMTP rate period:', error);
          alert('Error updating SMTP rate period');
        }
      });
    }

    // SMTP Batch Delay input
    const batchDelayInput = document.getElementById('smtp_batch_delay');
    const batchDelayStatus = document.getElementById('smtp_batch_delay_status');
    if (batchDelayInput) {
      batchDelayInput.addEventListener('change', async function() {
        const value = parseFloat(this.value);
        if (value < 0) {
          this.value = 0;
          return;
        }

        const payload = { smtp_batch_delay: value };

        try {
          const response = await fetch('/api/admin/settings.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCsrfToken()
            },
            body: JSON.stringify(payload)
          });

          const result = await response.json();

          if (result.success) {
            console.log('SMTP batch delay updated:', value);
            // Show success indicator
            if (batchDelayStatus) {
              batchDelayStatus.style.display = 'block';
              setTimeout(() => {
                batchDelayStatus.style.display = 'none';
              }, 2000);
            }
          } else {
            console.error('Error updating SMTP batch delay:', result.error);
            alert('Error: ' + (result.error || 'Failed to update SMTP batch delay'));
          }
        } catch (error) {
          console.error('Error updating SMTP batch delay:', error);
          alert('Error updating SMTP batch delay');
        }
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById('btnRefreshSubscribers');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', loadSubscribers);
    }

    // Show archived toggle
    const archivedToggle = document.getElementById('showArchivedSubscribers');
    if (archivedToggle) {
      archivedToggle.addEventListener('change', function() {
        showArchived = this.checked;
        loadSubscribers();
      });
    }

    // Add subscriber button
    const addBtn = document.getElementById('btnAddSubscriber');
    if (addBtn) {
      addBtn.addEventListener('click', function() {
        const modal = new bootstrap.Modal(document.getElementById('addSubscriberModal'));
        modal.show();
      });
    }

    // Confirm add subscriber
    const confirmAddBtn = document.getElementById('confirmAddSubscriber');
    if (confirmAddBtn) {
      confirmAddBtn.addEventListener('click', addSubscriber);
    }

    // Confirm delete subscriber
    const confirmDeleteBtn = document.getElementById('confirmDeleteSubscriber');
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', confirmDelete);
    }

    // Confirm reactivate subscriber
    const confirmReactivateBtn = document.getElementById('confirmReactivateSubscriber');
    if (confirmReactivateBtn) {
      confirmReactivateBtn.addEventListener('click', confirmReactivate);
    }

    // Reset add subscriber form when modal is hidden
    const addModal = document.getElementById('addSubscriberModal');
    if (addModal) {
      addModal.addEventListener('hidden.bs.modal', function() {
        const form = document.getElementById('addSubscriberForm');
        if (form) {
          form.reset();
          form.classList.remove('was-validated');
        }
      });
    }
  });

  // Export functions to global scope
  window.newsletterAdmin = {
    deleteSubscriber,
    reactivateSubscriber,
    loadSubscribers
  };

})();
