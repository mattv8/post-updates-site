/**
 * Quill Image Upload Handler
 * Handles image uploads to the media API for Quill editor
 */
(function() {
  'use strict';

  // Register ImageResize module once globally when script loads
  if (window.ImageResize && window.Quill && !Quill.imports['modules/imageResize']) {
    Quill.register('modules/imageResize', ImageResize.default);
  }

  /**
   * Initialize Quill with image upload and resize functionality
   * @param {HTMLElement} element - The textarea/div element to convert to Quill editor
   * @param {Object} options - Additional Quill options
   * @returns {Quill} Quill editor instance
   */
  window.initQuillEditor = function(element, options = {}) {
    // If element is a textarea, replace it with a div
    let editorElement = element;
    if (element.tagName === 'TEXTAREA') {
      const div = document.createElement('div');
      div.className = element.className;
      div.id = element.id;

      // Copy any initial content
      if (element.value) {
        div.innerHTML = element.value;
      }

      // Replace textarea with div
      element.parentNode.insertBefore(div, element);
      element.style.display = 'none'; // Hide textarea but keep it for fallback
      editorElement = div;
    }

    // Default toolbar configuration
    const defaultToolbar = [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'link'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }], // Text alignment (left, center, right, justify)
      ['blockquote', 'image'],
      ['clean']
    ];

    // Merge default options with provided options
    const quillOptions = {
      theme: 'snow',
      modules: {
        toolbar: options.toolbar || defaultToolbar,
        imageResize: {
          displaySize: true,
          modules: ['Resize', 'DisplaySize']
        }
      },
      placeholder: options.placeholder || 'Write something...',
      ...options
    };

    // Initialize Quill
    const quill = new Quill(editorElement, quillOptions);

    // Setup image upload handler
    const toolbar = quill.getModule('toolbar');
    if (toolbar) {
      toolbar.addHandler('image', function() {
        selectLocalImage(quill);
      });
    }

    return quill;
  };

  /**
   * Handle image selection from file input
   * @param {Quill} quill - Quill editor instance
   */
  function selectLocalImage(quill) {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/jpeg,image/png,image/webp,image/heic');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;

      // Validate file size (20MB)
      if (file.size > 20 * 1024 * 1024) {
        alert('File size must be less than 20MB');
        return;
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
      if (!validTypes.includes(file.type)) {
        alert('Invalid file type. Please use JPG, PNG, WebP, or HEIC');
        return;
      }

      // Upload the file
      await uploadImage(quill, file);
    };
  }

  /**
   * Upload image to server and insert into editor
   * @param {Quill} quill - Quill editor instance
   * @param {File} file - Image file to upload
   */
  async function uploadImage(quill, file) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('alt_text', '');

    // Show loading placeholder
    const range = quill.getSelection(true);
    quill.insertEmbed(range.index, 'image', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
    quill.setSelection(range.index + 1);

    try {
      const response = await fetch('/api/admin/media.php', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // Get the best variant for display (use 1200px width or original)
        const variants = JSON.parse(data.data?.variants_json || '{}');
        const imageUrl = variants['1200']?.jpg || '/storage/uploads/originals/' + data.data?.filename;

        // Replace placeholder with actual image
        quill.deleteText(range.index, 1);
        quill.insertEmbed(range.index, 'image', imageUrl);

        // Add alt text attribute if possible
        const img = quill.root.querySelector(`img[src="${imageUrl}"]`);
        if (img && data.data?.alt_text) {
          img.setAttribute('alt', data.data.alt_text);
        }

        // Move cursor after image
        quill.setSelection(range.index + 1);
      } else {
        // Remove placeholder on error
        quill.deleteText(range.index, 1);
        alert('Upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      // Remove placeholder on error
      quill.deleteText(range.index, 1);
      console.error('Error uploading image:', error);
      alert('An error occurred during upload');
    }
  }

  /**
   * Get HTML content from Quill editor
   * @param {Quill} quill - Quill editor instance
   * @returns {string} HTML content
   */
  /**
   * Get HTML content from Quill editor with trailing empty paragraphs removed
   * Allows for completely empty HTML content (returns empty string for empty editors)
   * @param {Quill} quill - Quill editor instance
   * @returns {string} HTML content (can be empty string if editor is empty)
   */
  window.getQuillHTML = function(quill) {
    if (!quill || !quill.root) {
      console.warn('getQuillHTML: Invalid Quill instance');
      return '';
    }
    let html = quill.root.innerHTML;

    // Remove trailing empty Quill paragraphs (<p><br></p> or <p> </p> or <p></p>)
    html = html.replace(/(<p>(<br>|\s|&nbsp;)*<\/p>\s*)+$/gi, '');

    // Trim whitespace
    html = html.trim();

    // Allow empty content - users can erase the default value to have no content
    return html;
  };

  /**
   * Set HTML content in Quill editor
   * @param {Quill} quill - Quill editor instance
   * @param {string} html - HTML content to set
   */
  window.setQuillHTML = function(quill, html) {
    if (!quill || !quill.root) {
      console.warn('setQuillHTML: Invalid Quill instance');
      return;
    }
    // Use clipboard module to properly set HTML without adding extra newlines
    const delta = quill.clipboard.convert(html || '');
    quill.setContents(delta, 'silent');
  };

  /**
   * Clear Quill editor content
   * @param {Quill} quill - Quill editor instance
   */
  window.clearQuillEditor = function(quill) {
    if (!quill) {
      console.warn('clearQuillEditor: Invalid Quill instance');
      return;
    }
    quill.setText('');
  };

})();
