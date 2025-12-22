/**
 * Shared utility functions used across home.js and admin.js
 * This file should be loaded before other scripts that depend on these utilities.
 */

// ============================================================================
// DOM Query Shortcuts
// ============================================================================

/**
 * Query selector shorthand
 * @param {string} sel - CSS selector
 * @param {Element|Document} el - Parent element (defaults to document)
 * @returns {Element|null}
 */
window.qs = function(sel, el = document) {
  return el.querySelector(sel);
};

/**
 * Query selector all shorthand (returns array)
 * @param {string} sel - CSS selector
 * @param {Element|Document} el - Parent element (defaults to document)
 * @returns {Element[]}
 */
window.qsa = function(sel, el = document) {
  return Array.from(el.querySelectorAll(sel));
};

// ============================================================================
// HTML Utilities
// ============================================================================

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string}
 */
window.escapeHtml = function(str) {
  return (str || '').replace(/[&<>"]/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[s]));
};

/**
 * Ensure all anchor tags in a container open in new tabs with security attributes
 * @param {Element} container - Container element to process
 */
window.ensureAnchorsOpenNewTab = function(container) {
  if (!container) return;
  container.querySelectorAll('a[href]').forEach(a => {
    a.setAttribute('target', '_blank');
    const rel = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
    if (!rel.includes('noopener')) rel.push('noopener');
    if (!rel.includes('noreferrer')) rel.push('noreferrer');
    a.setAttribute('rel', rel.join(' '));
  });
};

// ============================================================================
// LocalStorage Helpers
// ============================================================================

const LS_HIDE_DRAFTS_KEY = 'pp_hide_draft_previews';

/**
 * Load a Set from localStorage
 * @param {string} key - LocalStorage key
 * @returns {Set<string>}
 */
window.loadSeenSet = function(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.map(String));
  } catch (e) {
    console.warn('Failed to load set from storage', key, e);
  }
  return new Set();
};

/**
 * Save a Set to localStorage
 * @param {string} key - LocalStorage key
 * @param {Set} set - Set to save
 */
window.saveSeenSet = function(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Failed to persist set to storage', key, e);
  }
};

/**
 * Check if draft posts should be hidden in timeline
 * @returns {boolean}
 */
window.shouldHideDrafts = function() {
  try {
    return localStorage.getItem(LS_HIDE_DRAFTS_KEY) === '1';
  } catch (e) {
    return false;
  }
};

/**
 * Set the draft visibility preference
 * @param {boolean} hide - Whether to hide drafts
 */
window.setHideDrafts = function(hide) {
  try {
    localStorage.setItem(LS_HIDE_DRAFTS_KEY, hide ? '1' : '0');
  } catch (e) {
    console.warn('Failed to save draft visibility preference:', e);
  }
};

/**
 * Get the localStorage key for draft visibility
 * @returns {string}
 */
window.getHideDraftsKey = function() {
  return LS_HIDE_DRAFTS_KEY;
};

// ============================================================================
// Payment Platform Detection
// ============================================================================

/**
 * Detect payment platform from a donation URL and return icon/color/name info
 * @param {string} link - Donation URL
 * @returns {{icon: string, color: string, name: string}}
 */
window.detectPaymentPlatform = function(link) {
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
};

/**
 * Extract username/identifier from a donation URL
 * @param {string} fullUrl - Full donation URL
 * @returns {string} - Extracted username or original URL
 */
window.extractDonationUsername = function(fullUrl) {
  if (!fullUrl) return '';

  if (fullUrl.includes('venmo.com/u/')) {
    return fullUrl.split('venmo.com/u/')[1].split(/[/?#]/)[0];
  }
  if (fullUrl.includes('venmo.com/code')) {
    return fullUrl.split('venmo.com/code?')[1]?.split('&')[0] || fullUrl;
  }
  if (fullUrl.includes('paypal.me/')) {
    return fullUrl.split('paypal.me/')[1].split(/[/?#]/)[0];
  }
  if (fullUrl.includes('ko-fi.com/')) {
    return fullUrl.split('ko-fi.com/')[1].split(/[/?#]/)[0];
  }
  if (fullUrl.includes('buymeacoffee.com/')) {
    return fullUrl.split('buymeacoffee.com/')[1].split(/[/?#]/)[0];
  }
  if (fullUrl.includes('cash.app/$')) {
    return fullUrl.split('cash.app/$')[1].split(/[/?#]/)[0];
  }
  if (fullUrl.includes('cash.me/$')) {
    return fullUrl.split('cash.me/$')[1].split(/[/?#]/)[0];
  }
  if (fullUrl.includes('patreon.com/')) {
    return fullUrl.split('patreon.com/')[1].split(/[/?#]/)[0];
  }
  if (fullUrl.includes('github.com/sponsors/')) {
    return fullUrl.split('github.com/sponsors/')[1].split(/[/?#]/)[0];
  }
  if (fullUrl.includes('gofundme.com/')) {
    return fullUrl.split('gofundme.com/')[1]?.split(/[/?#]/)[0] || 'campaign';
  }

  return fullUrl;
};

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Format a date string for timeline display
 * @param {string} publishedAt - Date string in 'YYYY-MM-DD HH:MM:SS' format
 * @returns {string} - HTML for timeline date display
 */
window.formatTimelineDate = function(publishedAt) {
  if (!publishedAt) return '';

  // Expecting format 'YYYY-MM-DD HH:MM:SS' in local/server time; fallback-safe parsing
  const parts = /^([0-9]{4})-([0-9]{2})-([0-9]{2})\s+([0-9]{2}):([0-9]{2}):([0-9]{2})$/.exec(publishedAt);
  let d;

  if (parts) {
    // Note: months are 0-based in JS Date
    d = new Date(
      Number(parts[1]),
      Number(parts[2]) - 1,
      Number(parts[3]),
      Number(parts[4]),
      Number(parts[5]),
      Number(parts[6])
    );
  } else {
    const t = Date.parse(publishedAt);
    if (!isNaN(t)) d = new Date(t);
  }

  if (!d) return '';

  const month = d.toLocaleString(undefined, { month: 'short' });
  const day = d.getDate();
  const year = d.getFullYear();

  return `
    <div class="timeline-month">${month}</div>
    <div class="timeline-day">${day}</div>
    <div class="timeline-year">${year}</div>
  `;
};

/**
 * Get current date formatted for timeline (used for drafts without published_at)
 * @returns {string} - HTML for timeline date display
 */
window.getCurrentTimelineDate = function() {
  const now = new Date();
  const month = now.toLocaleString(undefined, { month: 'short' });
  const day = now.getDate();
  const year = now.getFullYear();

  return `
    <div class="timeline-month">${month}</div>
    <div class="timeline-day">${day}</div>
    <div class="timeline-year">${year}</div>
  `;
};
