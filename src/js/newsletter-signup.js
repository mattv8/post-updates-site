/**
 * Newsletter Signup Handler
 * Manages email subscription form submission, validation, and cookie management
 */
(function() {
  'use strict';

  const COOKIE_NAME = 'newsletter_subscribed';
  const COOKIE_EXPIRY_DAYS = 365; // 1 year

  // Cookie utility functions
  function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/;SameSite=Lax";
  }

  function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  function deleteCookie(name) {
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax";
  }

  // Email validation regex (client-side validation)
  // More permissive regex that allows modern TLDs and international domains
  function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  // Show subscribed state
  function showSubscribedState() {
    const formDiv = document.getElementById('newsletter-signup-form');
    const subscribedDiv = document.getElementById('newsletter-subscribed');

    if (formDiv) formDiv.classList.add('d-none');
    if (subscribedDiv) subscribedDiv.classList.remove('d-none');
  }

  // Show form state
  function showFormState() {
    const formDiv = document.getElementById('newsletter-signup-form');
    const subscribedDiv = document.getElementById('newsletter-subscribed');

    if (formDiv) formDiv.classList.remove('d-none');
    if (subscribedDiv) subscribedDiv.classList.add('d-none');
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    // Check if cookie exists
    const isSubscribed = getCookie(COOKIE_NAME);

    // Setup "Sign up another" button - needs to work even when already subscribed
    const signupAnotherBtn = document.getElementById('newsletter-signup-another');
    if (signupAnotherBtn) {
      signupAnotherBtn.addEventListener('click', function() {
        // Clear the cookie
        deleteCookie(COOKIE_NAME);

        // Show the form again
        showFormState();

        // Focus on email input
        const emailInput = document.getElementById('newsletter-email');
        if (emailInput) {
          emailInput.focus();
        }
      });
    }

    if (isSubscribed === 'true') {
      showSubscribedState();
      return; // Don't setup form listeners if already subscribed
    }

    // Setup form submission
    const form = document.getElementById('newsletterSignupForm');
    if (!form) return;

    const emailInput = document.getElementById('newsletter-email');
    const submitBtn = document.getElementById('newsletter-submit-btn');
    const errorDiv = document.getElementById('newsletter-error');

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      e.stopPropagation();

      // Reset validation state
      form.classList.remove('was-validated');
      if (errorDiv) errorDiv.textContent = 'Please enter a valid email address.';

      // Get email value
      const email = emailInput.value.trim();

      // Validate email
      if (!email || !isValidEmail(email)) {
        form.classList.add('was-validated');
        emailInput.focus();
        return;
      }

      // Disable button during submission
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Subscribing...';

      try {
        // Submit to API
        const response = await fetch('/api/newsletter-subscribe.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: email })
        });

        const result = await response.json();

        if (result.success) {
          // Set cookie to remember subscription
          setCookie(COOKIE_NAME, 'true', COOKIE_EXPIRY_DAYS);

          // Show success state
          showSubscribedState();

          // Clear form
          form.reset();
          form.classList.remove('was-validated');
        } else {
          // Show error
          if (errorDiv) {
            errorDiv.textContent = result.error || 'An error occurred. Please try again.';
          }
          form.classList.add('was-validated');
          emailInput.setCustomValidity('invalid');
          emailInput.focus();
        }
      } catch (error) {
        console.error('Newsletter signup error:', error);
        if (errorDiv) {
          errorDiv.textContent = 'Network error. Please check your connection and try again.';
        }
        form.classList.add('was-validated');
        emailInput.setCustomValidity('invalid');
      } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });

    // Clear custom validity on input
    emailInput.addEventListener('input', function() {
      this.setCustomValidity('');
    });
  });

})();
