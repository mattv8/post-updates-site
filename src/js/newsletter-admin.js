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

  const adminAppEl = document.getElementById('adminApp');
  const isDebugMode = adminAppEl && (adminAppEl.dataset.debug === '1' || adminAppEl.dataset.debug === 'true');

  const MAILPIT_DEFAULTS = {
    smtp_host: 'mailpit',
    smtp_port: 1025,
    smtp_secure: 'none',
    smtp_auth: 0,
    smtp_username: '',
    smtp_password: '',
    smtp_from_email: 'noreply@mailpit.local',
    smtp_from_name: 'Post Portal (Dev)'
  };

  let originalSmtpSnapshot = null;

  // Get CSRF token
  function getCsrfToken() {
    const adminApp = document.getElementById('adminApp');
    return adminApp ? adminApp.getAttribute('data-csrf') : '';
  }

  // Show toast notification
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

  // Get SMTP configuration from form
  function getSMTPConfigFromForm() {
    return {
      smtp_host: document.getElementById('smtp_host')?.value || undefined,
      smtp_port: document.getElementById('smtp_port')?.value ? parseInt(document.getElementById('smtp_port').value) : undefined,
      smtp_secure: document.getElementById('smtp_secure')?.value || undefined,
      smtp_auth: document.getElementById('smtp_auth')?.checked || false,
      smtp_username: document.getElementById('smtp_username')?.value || undefined,
      smtp_password: document.getElementById('smtp_password')?.value || undefined,
      smtp_from_email: document.getElementById('smtp_from_email')?.value || undefined,
      smtp_from_name: document.getElementById('smtp_from_name')?.value || undefined
    };
  }

  function captureCurrentSmtpConfig() {
    return {
      smtp_host: document.getElementById('smtp_host')?.value || '',
      smtp_port: document.getElementById('smtp_port')?.value ? parseInt(document.getElementById('smtp_port').value) : '',
      smtp_secure: document.getElementById('smtp_secure')?.value || 'none',
      smtp_auth: document.getElementById('smtp_auth')?.checked ? 1 : 0,
      smtp_username: document.getElementById('smtp_username')?.value || '',
      smtp_password: document.getElementById('smtp_password')?.value || '',
      smtp_from_email: document.getElementById('smtp_from_email')?.value || '',
      smtp_from_name: document.getElementById('smtp_from_name')?.value || ''
    };
  }

  function applySmtpConfigToForm(cfg) {
    const host = document.getElementById('smtp_host');
    const port = document.getElementById('smtp_port');
    const secure = document.getElementById('smtp_secure');
    const auth = document.getElementById('smtp_auth');
    const username = document.getElementById('smtp_username');
    const password = document.getElementById('smtp_password');
    const fromEmail = document.getElementById('smtp_from_email');
    const fromName = document.getElementById('smtp_from_name');

    if (host && typeof cfg.smtp_host !== 'undefined') host.value = cfg.smtp_host;
    if (port && typeof cfg.smtp_port !== 'undefined') port.value = cfg.smtp_port;
    if (secure && typeof cfg.smtp_secure !== 'undefined') secure.value = cfg.smtp_secure;
    if (auth && typeof cfg.smtp_auth !== 'undefined') auth.checked = !!cfg.smtp_auth;
    if (username && typeof cfg.smtp_username !== 'undefined') username.value = cfg.smtp_username;
    if (password && typeof cfg.smtp_password !== 'undefined') password.value = cfg.smtp_password;
    if (fromEmail && typeof cfg.smtp_from_email !== 'undefined') fromEmail.value = cfg.smtp_from_email;
    if (fromName && typeof cfg.smtp_from_name !== 'undefined') fromName.value = cfg.smtp_from_name;
  }

  function setSmtpFieldsDisabled(disabled) {
    ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_auth', 'smtp_username', 'smtp_password', 'smtp_from_email', 'smtp_from_name'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = disabled;
    });
  }

  function isMailpitConfigActive() {
    const host = document.getElementById('smtp_host')?.value || '';
    const port = document.getElementById('smtp_port')?.value ? parseInt(document.getElementById('smtp_port').value) : null;
    const secure = document.getElementById('smtp_secure')?.value || 'none';
    const auth = document.getElementById('smtp_auth')?.checked ? 1 : 0;

    return host === MAILPIT_DEFAULTS.smtp_host &&
      port === MAILPIT_DEFAULTS.smtp_port &&
      secure === MAILPIT_DEFAULTS.smtp_secure &&
      auth === MAILPIT_DEFAULTS.smtp_auth;
  }

  function buildSmtpPayload(cfg) {
    const payload = {};
    if (cfg.smtp_host) payload.smtp_host = cfg.smtp_host;
    if (typeof cfg.smtp_port !== 'undefined' && cfg.smtp_port !== '') payload.smtp_port = parseInt(cfg.smtp_port, 10);
    if (typeof cfg.smtp_secure !== 'undefined') payload.smtp_secure = cfg.smtp_secure;
    payload.smtp_auth = cfg.smtp_auth ? 1 : 0;
    if (cfg.smtp_username) payload.smtp_username = cfg.smtp_username;
    if (cfg.smtp_password) payload.smtp_password = cfg.smtp_password;
    if (cfg.smtp_from_email) payload.smtp_from_email = cfg.smtp_from_email;
    if (cfg.smtp_from_name) payload.smtp_from_name = cfg.smtp_from_name;
    return payload;
  }

  async function saveSmtpConfigPayload(payload) {
    const response = await fetch('/api/admin/settings.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken()
      },
      body: JSON.stringify(payload)
    });
    return response.json();
  }

  // Show SMTP test result message
  function showSMTPResult(type, message) {
    const resultDiv = document.getElementById('smtp_test_result');
    if (!resultDiv) return;

    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    const icon = type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill';

    resultDiv.className = 'alert ' + alertClass;
    resultDiv.innerHTML = '<i class="bi bi-' + icon + ' me-2"></i>' + message;
    resultDiv.classList.remove('d-none');

    // Auto-hide after 10 seconds
    setTimeout(() => {
      resultDiv.classList.add('d-none');
    }, 10000);
  }

  // Fetch helper with timeout and safe JSON parsing to avoid hanging or HTML error pages breaking the UI
  async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      const text = await response.text();

      let data = null;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        return {
          ok: false,
          status: response.status,
          error: `Server returned an unexpected response (${response.status}).`,
          raw: text
        };
      }

      return {
        ok: response.ok,
        status: response.status,
        data
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        return {
          ok: false,
          status: 'timeout',
          error: `Request timed out after ${timeoutMs / 1000} seconds`
        };
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
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
    const positionToggle = document.getElementById('newsletter_position_toggle');
    const scopeToggle = document.getElementById('newsletter_position_scope_toggle');
    const scopeWrapper = document.getElementById('newsletter_position_scope_wrapper');
    const notifyToggle = document.getElementById('notify_subscribers_on_post');
    const includeBodyToggle = document.getElementById('email_include_post_body');
    const rateLimitInput = document.getElementById('smtp_rate_limit');
    const ratePeriodInput = document.getElementById('smtp_rate_period');
    const batchDelayInput = document.getElementById('smtp_batch_delay');

    // SMTP configuration fields
    const smtpHostInput = document.getElementById('smtp_host');
    const smtpPortInput = document.getElementById('smtp_port');
    const smtpSecureInput = document.getElementById('smtp_secure');
    const smtpAuthInput = document.getElementById('smtp_auth');
    const smtpUsernameInput = document.getElementById('smtp_username');
    const smtpPasswordInput = document.getElementById('smtp_password');
    const smtpFromEmailInput = document.getElementById('smtp_from_email');
    const smtpFromNameInput = document.getElementById('smtp_from_name');

    if (!toggle && !positionToggle && !notifyToggle && !includeBodyToggle && !rateLimitInput && !smtpHostInput) return;

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
        if (positionToggle) {
          positionToggle.checked = result.data.newsletter_position === 'above_timeline';
          // Show/hide scope wrapper based on position toggle state
          if (scopeWrapper) {
            scopeWrapper.classList.toggle('d-none', !positionToggle.checked);
          }
        }
        if (scopeToggle) {
          scopeToggle.checked = result.data.newsletter_position_scope === 'all_devices';
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

        // Load SMTP configuration
        if (smtpHostInput && result.data.smtp_host) {
          smtpHostInput.value = result.data.smtp_host;
        }
        if (smtpPortInput && result.data.smtp_port) {
          smtpPortInput.value = result.data.smtp_port;
        }
        if (smtpSecureInput && result.data.smtp_secure !== undefined && result.data.smtp_secure !== null) {
          smtpSecureInput.value = result.data.smtp_secure;
        }
        if (smtpAuthInput) {
          smtpAuthInput.checked = result.data.smtp_auth == 1;
        }
        if (smtpUsernameInput && result.data.smtp_username) {
          smtpUsernameInput.value = result.data.smtp_username;
        }
        if (smtpPasswordInput) {
          // Never render stored password; show placeholder to indicate existing value
          smtpPasswordInput.value = '';
          smtpPasswordInput.placeholder = result.data.smtp_password_set ? '[unchanged]' : '';
        }
        if (smtpFromEmailInput && result.data.smtp_from_email) {
          smtpFromEmailInput.value = result.data.smtp_from_email;
        }
        if (smtpFromNameInput && result.data.smtp_from_name) {
          smtpFromNameInput.value = result.data.smtp_from_name;
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

    // Auto-enable SMTP auth when username or password is filled
    const smtpUsernameInput = document.getElementById('smtp_username');
    const smtpPasswordInput = document.getElementById('smtp_password');
    const smtpAuthCheckbox = document.getElementById('smtp_auth');

    function checkAutoEnableAuth() {
      if (!smtpAuthCheckbox) return;

      const hasUsername = smtpUsernameInput?.value.trim().length > 0;
      const hasPassword = smtpPasswordInput?.value.trim().length > 0;

      // Auto-enable auth if either field has content (unless manually disabled)
      if ((hasUsername || hasPassword) && !smtpAuthCheckbox.checked) {
        smtpAuthCheckbox.checked = true;
      }
    }

    if (smtpUsernameInput) {
      smtpUsernameInput.addEventListener('input', checkAutoEnableAuth);
    }
    if (smtpPasswordInput) {
      smtpPasswordInput.addEventListener('input', checkAutoEnableAuth);

      // Add validation warning for spaces in password
      smtpPasswordInput.addEventListener('blur', function() {
        const password = this.value;

        // Only check if there's a value
        if (password && /\s/.test(password)) {
          showNotification(
            'Warning: Your SMTP password contains spaces. This is unusual for most mail providers (e.g., Gmail app passwords should not have spaces). Please verify you copied it correctly.',
            'warning'
          );
        }
      });
    }

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
            // Purge cache so visitors see the mailing list visibility change
            if (window.purgeSiteCache) window.purgeSiteCache();
            showNotification('Setting saved successfully', 'success');
          } else {
            console.error('Error updating mailing list visibility:', result.error);
            // Revert toggle on error
            this.checked = !this.checked;
            showNotification('Error: ' + (result.error || 'Failed to update mailing list visibility'), 'error');
          }
        } catch (error) {
          console.error('Error updating mailing list visibility:', error);
          // Revert toggle on error
          this.checked = !this.checked;
          showNotification('Error updating mailing list visibility', 'error');
        }
      });
    }

    // Newsletter position toggle
    const newsletterPositionToggle = document.getElementById('newsletter_position_toggle');
    const newsletterScopeWrapper = document.getElementById('newsletter_position_scope_wrapper');
    if (newsletterPositionToggle) {
      newsletterPositionToggle.addEventListener('change', async function() {
        const payload = { newsletter_position: this.checked ? 'above_timeline' : 'sidebar' };

        // Show/hide scope wrapper based on position toggle state
        if (newsletterScopeWrapper) {
          newsletterScopeWrapper.classList.toggle('d-none', !this.checked);
        }

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
            // Purge cache so visitors see the newsletter position change
            if (window.purgeSiteCache) window.purgeSiteCache();
            showNotification('Newsletter position saved successfully', 'success');
          } else {
            console.error('Error updating newsletter position:', result.error);
            // Revert toggle on error
            this.checked = !this.checked;
            if (newsletterScopeWrapper) {
              newsletterScopeWrapper.classList.toggle('d-none', !this.checked);
            }
            showNotification('Error: ' + (result.error || 'Failed to update newsletter position'), 'error');
          }
        } catch (error) {
          console.error('Error updating newsletter position:', error);
          // Revert toggle on error
          this.checked = !this.checked;
          if (newsletterScopeWrapper) {
            newsletterScopeWrapper.classList.toggle('d-none', !this.checked);
          }
          showNotification('Error updating newsletter position', 'error');
        }
      });
    }

    // Newsletter position scope toggle (mobile only vs all devices)
    const newsletterScopeToggle = document.getElementById('newsletter_position_scope_toggle');
    if (newsletterScopeToggle) {
      newsletterScopeToggle.addEventListener('change', async function() {
        const payload = { newsletter_position_scope: this.checked ? 'all_devices' : 'mobile_only' };

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
            // Purge cache so visitors see the newsletter position change
            if (window.purgeSiteCache) window.purgeSiteCache();
            showNotification('Newsletter scope saved successfully', 'success');
          } else {
            console.error('Error updating newsletter scope:', result.error);
            // Revert toggle on error
            this.checked = !this.checked;
            showNotification('Error: ' + (result.error || 'Failed to update newsletter scope'), 'error');
          }
        } catch (error) {
          console.error('Error updating newsletter scope:', error);
          // Revert toggle on error
          this.checked = !this.checked;
          showNotification('Error updating newsletter scope', 'error');
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
            showNotification('Setting saved successfully', 'success');
          } else {
            console.error('Error updating email notification setting:', result.error);
            this.checked = !this.checked;
            showNotification('Error: ' + (result.error || 'Failed to update email notification setting'), 'error');
          }
        } catch (error) {
          console.error('Error updating email notification setting:', error);
          this.checked = !this.checked;
          showNotification('Error updating email notification setting', 'error');
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
            showNotification('Setting saved successfully', 'success');
          } else {
            console.error('Error updating email body inclusion setting:', result.error);
            this.checked = !this.checked;
            showNotification('Error: ' + (result.error || 'Failed to update email body inclusion setting'), 'error');
          }
        } catch (error) {
          console.error('Error updating email body inclusion setting:', error);
          this.checked = !this.checked;
          showNotification('Error updating email body inclusion setting', 'error');
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
            showNotification('Setting saved successfully', 'success');
            // Show success indicator
            if (rateLimitStatus) {
              rateLimitStatus.style.display = 'block';
              setTimeout(() => {
                rateLimitStatus.style.display = 'none';
              }, 2000);
            }
          } else {
            console.error('Error updating SMTP rate limit:', result.error);
            showNotification('Error: ' + (result.error || 'Failed to update SMTP rate limit'), 'error');
          }
        } catch (error) {
          console.error('Error updating SMTP rate limit:', error);
          showNotification('Error updating SMTP rate limit', 'error');
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
            showNotification('Setting saved successfully', 'success');
            // Show success indicator
            if (ratePeriodStatus) {
              ratePeriodStatus.style.display = 'block';
              setTimeout(() => {
                ratePeriodStatus.style.display = 'none';
              }, 2000);
            }
          } else {
            console.error('Error updating SMTP rate period:', result.error);
            showNotification('Error: ' + (result.error || 'Failed to update SMTP rate period'), 'error');
          }
        } catch (error) {
          console.error('Error updating SMTP rate period:', error);
          showNotification('Error updating SMTP rate period', 'error');
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
            showNotification('Setting saved successfully', 'success');
            // Show success indicator
            if (batchDelayStatus) {
              batchDelayStatus.style.display = 'block';
              setTimeout(() => {
                batchDelayStatus.style.display = 'none';
              }, 2000);
            }
          } else {
            console.error('Error updating SMTP batch delay:', result.error);
            showNotification('Error: ' + (result.error || 'Failed to update SMTP batch delay'), 'error');
          }
        } catch (error) {
          console.error('Error updating SMTP batch delay:', error);
          showNotification('Error updating SMTP batch delay', 'error');
        }
      });
    }

    const mailpitToggle = document.getElementById('smtp_mailpit_toggle');
    if (mailpitToggle && isDebugMode) {

      const applyMailpitState = (checked) => {
        if (checked) {
          // Use Mailpit defaults including default from email/name
          applySmtpConfigToForm(MAILPIT_DEFAULTS);
          setSmtpFieldsDisabled(true);
        } else {
          setSmtpFieldsDisabled(false);
          if (originalSmtpSnapshot) {
            applySmtpConfigToForm(originalSmtpSnapshot);
          }
        }
      };

      // Apply initial state if mailpit config is active OR toggle is already checked (from template)
      if (isMailpitConfigActive() || mailpitToggle.checked) {
        mailpitToggle.checked = true;
        applyMailpitState(true);
      }

      mailpitToggle.addEventListener('change', async function() {
        mailpitToggle.disabled = true;
        try {
          if (this.checked) {
            if (!originalSmtpSnapshot) {
              originalSmtpSnapshot = captureCurrentSmtpConfig();
            }

            // Use Mailpit defaults including default from email/name
            const payload = buildSmtpPayload(MAILPIT_DEFAULTS);

            applyMailpitState(true);

            const result = await saveSmtpConfigPayload(payload);
            if (!result.success) {
              throw new Error(result.error || 'Failed to override SMTP to Mailpit');
            }
            showNotification('SMTP now points to Mailpit (dev override).', 'info');
          } else {
            if (!originalSmtpSnapshot) {
              // Nothing to restore; just unlock fields
              applyMailpitState(false);
              return;
            }

            const payload = buildSmtpPayload(originalSmtpSnapshot);
            applyMailpitState(false);

            const result = await saveSmtpConfigPayload(payload);
            if (!result.success) {
              throw new Error(result.error || 'Failed to restore SMTP settings');
            }
            showNotification('SMTP restored to previous settings.', 'success');
          }
        } catch (error) {
          console.error('Mailpit toggle error:', error);
          showNotification(error.message || 'SMTP override failed', 'error');
          this.checked = !this.checked;
          applyMailpitState(this.checked);
        } finally {
          mailpitToggle.disabled = false;
        }
      });
    }

    // SMTP Configuration Save
    const smtpSaveBtn = document.getElementById('smtp_save_config');
    if (smtpSaveBtn) {
      smtpSaveBtn.addEventListener('click', async function() {
        const btn = this;
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

        const smtpConfig = {};

        // Only include fields that have values
        const hostValue = document.getElementById('smtp_host')?.value?.trim();
        if (hostValue) smtpConfig.smtp_host = hostValue;

        const portValue = document.getElementById('smtp_port')?.value;
        if (portValue) smtpConfig.smtp_port = parseInt(portValue);

        const secureValue = document.getElementById('smtp_secure')?.value;
        // Always include smtp_secure (valid values: 'none', 'tls', 'ssl')
        if (secureValue) {
          smtpConfig.smtp_secure = secureValue;
        }

        // Always include smtp_auth (it's a boolean)
        smtpConfig.smtp_auth = document.getElementById('smtp_auth')?.checked ? 1 : 0;

        const usernameValue = document.getElementById('smtp_username')?.value?.trim();
        if (usernameValue) smtpConfig.smtp_username = usernameValue;

        const passwordValue = document.getElementById('smtp_password')?.value;
        if (passwordValue && passwordValue.trim() !== '') {
          smtpConfig.smtp_password = passwordValue;
        }

        const fromEmailValue = document.getElementById('smtp_from_email')?.value?.trim();
        if (fromEmailValue) smtpConfig.smtp_from_email = fromEmailValue;

        const fromNameValue = document.getElementById('smtp_from_name')?.value?.trim();
        if (fromNameValue) smtpConfig.smtp_from_name = fromNameValue;

        // Check if we have at least one field to update
        if (Object.keys(smtpConfig).length === 0) {
          showSMTPResult('error', 'Please enter at least one SMTP setting to save.');
          btn.disabled = false;
          btn.innerHTML = originalText;
          return;
        }

        try {
          const response = await fetch('/api/admin/settings.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCsrfToken()
            },
            body: JSON.stringify(smtpConfig)
          });

          const result = await response.json();

          if (result.success) {
            showSMTPResult('success', 'SMTP configuration saved successfully!');

            // Reload settings to populate password field with placeholder for testing
            // This allows immediate SMTP testing after saving
            await loadMailingListVisibility();

            // Clear password field after save (security) but add placeholder
            const passwordField = document.getElementById('smtp_password');
            if (passwordField) {
              passwordField.value = '';
              passwordField.placeholder = '[unchanged]';
            }
          } else {
            showSMTPResult('error', 'Error saving SMTP configuration: ' + (result.error || 'Unknown error'));
          }
        } catch (error) {
          console.error('Error saving SMTP configuration:', error);
          showSMTPResult('error', 'Network error. Please try again.');
        } finally {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      });
    }

    // SMTP Test Connection
    const smtpTestConnBtn = document.getElementById('smtp_test_connection');
    if (smtpTestConnBtn) {
      smtpTestConnBtn.addEventListener('click', async function() {
        const btn = this;
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Testing...';

        const smtpConfig = getSMTPConfigFromForm();

        try {
          const apiResult = await fetchJsonWithTimeout('/api/admin/smtp-test.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCsrfToken()
            },
            body: JSON.stringify({
              action: 'connect',
              ...smtpConfig
            })
          }, 12000);

          if (apiResult.error && !apiResult.data) {
            showSMTPResult('error',
              '<strong>Connection Failed</strong><br>' +
              apiResult.error
            );
            return;
          }

          const result = apiResult.data;

          if (result?.success) {
            showSMTPResult('success',
              '<strong>Connection Successful!</strong><br>' +
              'Host: ' + result.config.host + ':' + result.config.port + '<br>' +
              'Encryption: ' + (result.config.secure || 'None') + '<br>' +
              'Auth: ' + (result.config.auth ? 'Enabled' : 'Disabled')
            );
          } else {
            const timedOut = apiResult.status === 'timeout';
            showSMTPResult('error',
              '<strong>Connection Failed</strong><br>' +
              (timedOut ? 'Request timed out after 12 seconds.' : (result?.error || 'Unknown error')) +
              (result?.detailed_error ? '<br><small>' + result.detailed_error + '</small>' : '') +
              (!timedOut && apiResult.status && apiResult.status !== 200 ? '<br><small>Status: ' + apiResult.status + '</small>' : '')
            );
          }
        } catch (error) {
          console.error('Error testing SMTP connection:', error);
          showSMTPResult('error', 'Network error. Please try again.');
        } finally {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      });
    }

    // SMTP Send Test Email
    const smtpSendTestBtn = document.getElementById('smtp_send_test');
    if (smtpSendTestBtn) {
      smtpSendTestBtn.addEventListener('click', async function() {
        const testEmail = prompt('Enter email address to send test email to:');

        if (!testEmail) return;

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(testEmail)) {
          showSMTPResult('error', 'Invalid email address');
          return;
        }

        const btn = this;
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';

        const smtpConfig = getSMTPConfigFromForm();

        try {
          const apiResult = await fetchJsonWithTimeout('/api/admin/smtp-test.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCsrfToken()
            },
            body: JSON.stringify({
              action: 'test',
              test_email: testEmail,
              ...smtpConfig
            })
          }, 12000);

          if (apiResult.error && !apiResult.data) {
            showSMTPResult('error',
              '<strong>Failed to Send Test Email</strong><br>' +
              apiResult.error
            );
            return;
          }

          const result = apiResult.data;

          if (result?.success) {
            showSMTPResult('success',
              '<strong>Test Email Sent!</strong><br>' +
              result.message + '<br>' +
              '<small>Check the inbox for ' + testEmail + '</small>'
            );
          } else {
            const timedOut = apiResult.status === 'timeout';
            showSMTPResult('error',
              '<strong>Failed to Send Test Email</strong><br>' +
              (timedOut ? 'Request timed out after 12 seconds.' : (result?.error || 'Unknown error')) +
              (result?.detailed_error ? '<br><small>' + result.detailed_error + '</small>' : '') +
              (!timedOut && apiResult.status && apiResult.status !== 200 ? '<br><small>Status: ' + apiResult.status + '</small>' : '')
            );
          }
        } catch (error) {
          console.error('Error sending test email:', error);
          showSMTPResult('error', 'Network error. Please try again.');
        } finally {
          btn.disabled = false;
          btn.innerHTML = originalText;
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
