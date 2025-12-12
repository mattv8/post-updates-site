/**
 * AI Title Generator
 * Handles AI-powered title generation from post content
 */
(function() {
  'use strict';

  // Lightweight toast helper for AI title errors (e.g., missing API key)
  function showToast(message, type = 'danger') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container position-fixed top-0 end-0 p-3';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }

    const id = 'toast-' + Date.now();
    const bgClass = 'bg-' + (type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'danger');
    const textClass = type === 'warning' ? 'text-dark' : 'text-white';

    container.insertAdjacentHTML('beforeend', `
      <div id="${id}" class="toast ${bgClass} ${textClass}" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="toast-header ${bgClass} ${textClass}">
          <strong class="me-auto">${type === 'warning' ? 'Warning' : type === 'success' ? 'Success' : 'Error'}</strong>
          <button type="button" class="btn-close ${textClass === 'text-white' ? 'btn-close-white' : ''}" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">${message}</div>
      </div>
    `);

    const toastEl = document.getElementById(id);
    const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 5000 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
  }

  /**
   * Initialize AI title generation for a specific post editor container
   * @param {Element} container - The post editor container element
   * @param {Object} editorInstance - The editor instance (Quill or CKEditor)
   */
  window.initAITitleGenerator = function(container, editorInstance = null) {
    const generateBtn = container.querySelector('.btn-generate-title');
    const titleInput = container.querySelector('.post-title');

    if (!generateBtn || !titleInput) return;

    generateBtn.addEventListener('click', async function() {
      // Get content from editor or textarea
      let content = '';
      if (editorInstance) {
        // Check if it's Quill editor
        if (typeof window.getQuillHTML === 'function' && editorInstance.root) {
          content = window.getQuillHTML(editorInstance);
        }
        // Check if it's CKEditor (legacy support)
        else if (typeof editorInstance.getData === 'function') {
          content = editorInstance.getData();
        }
      } else {
        const textarea = container.querySelector('.post-body');
        content = textarea ? textarea.value : '';
      }

      // Validate that content exists
      if (!content || content.trim() === '') {
        alert('Please add some content to your post first before generating a title.');
        return;
      }

      // Strip HTML and check if there's actual text
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';

      if (plainText.trim().length < 10) {
        alert('Please add more content to your post (at least 10 characters) before generating a title.');
        return;
      }

      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

      try {
        // Disable button and show loading state
        generateBtn.disabled = true;
        const originalHTML = generateBtn.innerHTML;
        generateBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Generating...';

        const response = await fetch('/api/generate-title.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({
            content: content
          })
        });

        const data = await response.json();

        if (data.success && data.title) {
          // Set the generated title
          titleInput.value = data.title;

          // Optional: Show a subtle success indicator
          titleInput.classList.add('border-success');
          setTimeout(() => {
            titleInput.classList.remove('border-success');
          }, 2000);
        } else {
          const errorMsg = data.error || 'Failed to generate title';
          showToast(errorMsg, 'danger');

          // Only log unexpected errors; missing key is already conveyed to the user
          if (!errorMsg.includes('OpenAI API key not configured')) {
            console.error('Title generation error:', data);
          }
        }

        // Restore button
        generateBtn.innerHTML = originalHTML;
      } catch (error) {
        console.error('Error generating title:', error);
        showToast('An error occurred while generating the title. Please try again.', 'danger');
        generateBtn.innerHTML = '<i class="bi bi-sparkles me-1"></i>Create Title with AI';
      } finally {
        generateBtn.disabled = false;
      }
    });
  };

  // Auto-initialize for any post editor on the page when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    // This will be called explicitly from individual page scripts
    // that have access to their specific editor instances
  });

})();
