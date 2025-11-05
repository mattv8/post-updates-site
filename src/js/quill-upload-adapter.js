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
   * Converts Quill's flat list structure with indent classes to nested HTML lists
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

    // Convert Quill's flat list structure to nested HTML lists
    html = convertQuillListsToNestedHTML(html);

    // Allow empty content - users can erase the default value to have no content
    return html;
  };

  /**
   * Convert Quill's flat list structure with ql-indent-N classes to nested HTML lists
   * @param {string} html - HTML from Quill editor
   * @returns {string} HTML with properly nested lists
   */
  function convertQuillListsToNestedHTML(html) {
    if (!html) return '';

    // Create a temporary DOM element to parse the HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Find all lists
    const lists = temp.querySelectorAll('ul, ol');

    lists.forEach(list => {
      nestQuillList(list);
    });

    return temp.innerHTML;
  }

  /**
   * Convert flat Quill list to nested HTML structure
   * @param {Element} list - The list element to nest
   */
  function nestQuillList(list) {
    const items = Array.from(list.children);
    const stack = [{ list: list, indent: 0 }]; // Stack to track current nesting level

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Get indent level from class (ql-indent-1, ql-indent-2, etc.)
      let indent = 0;
      const indentClass = Array.from(item.classList).find(c => c.startsWith('ql-indent-'));
      if (indentClass) {
        indent = parseInt(indentClass.replace('ql-indent-', ''));
        // Remove the Quill indent class since we're converting to nested structure
        item.classList.remove(indentClass);
      }

      // Pop stack until we find the right parent level
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      const currentParent = stack[stack.length - 1];

      // If indent is greater than current parent's indent, we need to create nested list(s)
      if (indent > currentParent.indent) {
        // Get the last item at the current level to nest under
        const parentItem = currentParent.list.children[currentParent.list.children.length - 1];

        if (parentItem) {
          // May need to create multiple levels if jumping more than 1 indent
          let targetList = currentParent.list;
          let targetIndent = currentParent.indent;

          while (targetIndent < indent) {
            // Get the last item in target list
            const lastItem = targetList.children[targetList.children.length - 1];

            if (lastItem) {
              // Create nested list
              const nestedList = document.createElement(list.tagName.toLowerCase());
              lastItem.appendChild(nestedList);

              targetList = nestedList;
              targetIndent++;

              // Add to stack
              stack.push({ list: nestedList, indent: targetIndent });
            } else {
              break;
            }
          }

          // Add item to the deepest nested list
          targetList.appendChild(item);
        } else {
          // No parent item, add to current list
          currentParent.list.appendChild(item);
        }
      } else {
        // Same or lower indent - add to current parent list
        currentParent.list.appendChild(item);
      }
    }
  }

  /**
   * Set HTML content in Quill editor
   * Converts nested lists to Quill's flat list structure with indent classes
   * @param {Quill} quill - Quill editor instance
   * @param {string} html - HTML content to set
   */
  window.setQuillHTML = function(quill, html) {
    if (!quill || !quill.root) {
      console.warn('setQuillHTML: Invalid Quill instance');
      return;
    }

    // Convert nested lists to Quill's format before setting content
    const convertedHtml = convertNestedListsToQuillFormat(html || '');

    // Use clipboard module to properly set HTML without adding extra newlines
    const delta = quill.clipboard.convert(convertedHtml);
    quill.setContents(delta, 'silent');
  };

  /**
   * Convert nested HTML lists to Quill's flat list structure with indent classes
   * Quill doesn't use nested <ul>/<ol> tags, it uses flat lists with ql-indent-N classes
   * @param {string} html - HTML content with potentially nested lists
   * @returns {string} HTML with flat lists and indent classes
   */
  function convertNestedListsToQuillFormat(html) {
    if (!html) return '';

    // Create a temporary DOM element to parse the HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Find all list elements (ul and ol)
    const lists = temp.querySelectorAll('ul, ol');

    lists.forEach(list => {
      flattenNestedList(list);
    });

    return temp.innerHTML;
  }

  /**
   * Recursively flatten a nested list structure into Quill's flat format
   * @param {Element} list - The list element to flatten
   * @param {number} baseIndent - Base indentation level
   */
  function flattenNestedList(list, baseIndent = 0) {
    const listItems = Array.from(list.children);

    listItems.forEach(li => {
      // Set the indent level for this list item
      if (baseIndent > 0) {
        li.classList.add(`ql-indent-${baseIndent}`);
      }

      // Find nested lists within this list item (direct children only)
      const nestedLists = Array.from(li.querySelectorAll(':scope > ul, :scope > ol'));

      nestedLists.forEach(nestedList => {
        // Recursively flatten the nested list first to handle deeper nesting
        flattenNestedList(nestedList, baseIndent + 1);

        // Get all items from the nested list (now flattened)
        const nestedItems = Array.from(nestedList.children);

        // Move nested items to parent list level (after current item)
        let insertAfter = li;
        nestedItems.forEach(nestedLi => {
          li.parentNode.insertBefore(nestedLi, insertAfter.nextSibling);
          insertAfter = nestedLi; // Keep items in order
        });

        // Remove the now-empty nested list
        nestedList.remove();
      });
    });
  }

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
