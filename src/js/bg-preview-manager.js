/**
 * Background Preview Manager
 * Reusable class for managing background image previews with overlay controls
 * Used for hero banners, footer backgrounds, and post hero images
 */
window.BackgroundPreviewManager = class BackgroundPreviewManager {
  /**
   * Constructor
   * @param {string} prefix - Element ID prefix (e.g., 'footer', 'hero', 'modal')
   */
  constructor(prefix) {
    this.prefix = prefix;
    this.elements = {};
    this.initialized = false;
  }

  /**
   * Initialize the preview manager and attach event listeners
   */
  init() {
    const prefix = this.prefix;
    const container = document.querySelector(`.${prefix}-preview-container`);

    if (!container) {
      console.warn(`BackgroundPreviewManager: Container not found for prefix "${prefix}"`);
      return false;
    }

    // Store element references
    this.elements = {
      container: container,
      preview: container.querySelector(`.${prefix}-preview`),
      img: container.querySelector(`.${prefix}-preview img`),
      overlay: container.querySelector(`.${prefix}-overlay`),
      textPreview: container.querySelector(`.${prefix}-text-preview`),
      textContent: container.querySelector(`.${prefix}-text-content`),
      layoutSingle: container.querySelector(`.${prefix}-layout-single`),
      layoutDouble: container.querySelector(`.${prefix}-layout-double`),
      textCol1: container.querySelector(`.${prefix}-text-col1`),
      textCol2: container.querySelector(`.${prefix}-text-col2`),
      removeBtn: container.querySelector('.btn-remove-bg, .btn-remove-footer-bg'),

      // Controls - using the IDs from bg_preview.tpl (no modal_ prefix in template)
      heightSlider: document.getElementById(`${prefix}_height`),
      heightValue: container.querySelector(`.${prefix}-height-value`),

      opacitySlider: document.getElementById(`${prefix}_overlay_opacity`),
      opacityValue: container.querySelector(`.${prefix}-overlay-opacity-value`),

      colorPicker: document.getElementById(`${prefix}_overlay_color`),
      colorHex: document.getElementById(`${prefix}_overlay_color_hex`),

      mediaSelect: document.getElementById(`modal_${prefix}_media_id`)
    };

    // Setup height control
    if (this.elements.heightSlider) {
      this.elements.heightSlider.addEventListener('input', (e) => {
        const height = parseInt(e.target.value);
        if (this.elements.heightValue) {
          this.elements.heightValue.textContent = height;
        }
        if (this.elements.preview) {
          this.elements.preview.style.paddingBottom = height + '%';
        }
      });
    }

    // Setup overlay opacity control
    if (this.elements.opacitySlider) {
      this.elements.opacitySlider.addEventListener('input', (e) => {
        const opacity = parseFloat(e.target.value);
        if (this.elements.opacityValue) {
          this.elements.opacityValue.textContent = opacity.toFixed(2);
        }
        if (this.elements.overlay) {
          this.elements.overlay.style.opacity = opacity;
        }
      });
    }

    // Setup color picker controls
    if (this.elements.colorPicker && this.elements.colorHex) {
      this.elements.colorPicker.addEventListener('input', (e) => {
        this.elements.colorHex.value = e.target.value;
        if (this.elements.overlay) {
          this.elements.overlay.style.backgroundColor = e.target.value;
        }
      });

      this.elements.colorHex.addEventListener('input', (e) => {
        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
          this.elements.colorPicker.value = e.target.value;
          if (this.elements.overlay) {
            this.elements.overlay.style.backgroundColor = e.target.value;
          }
        }
      });
    }

    // Setup media selection
    if (this.elements.mediaSelect) {
      this.elements.mediaSelect.addEventListener('change', async (e) => {
        const mediaId = e.target.value;
        if (mediaId) {
          await this.loadPreview(mediaId);
        } else {
          this.hide();
        }
      });
    }

    // Setup remove button
    if (this.elements.removeBtn) {
      this.elements.removeBtn.addEventListener('click', () => {
        if (this.elements.mediaSelect) {
          this.elements.mediaSelect.value = '';
        }
        this.hide();
      });
    }

    this.initialized = true;
    return true;
  }

  /**
   * Load and display a background image preview
   * @param {string|number} mediaId - Media ID to load
   */
  async loadPreview(mediaId) {
    if (!mediaId) {
      this.hide();
      return;
    }

    try {
      const data = await window.SettingsManager.api(`/api/admin/media.php?id=${mediaId}`);
      if (data.success && data.data) {
        const variants = JSON.parse(data.data.variants_json || '{}');
        const previewUrl = variants['800']?.jpg || '/storage/uploads/originals/' + data.data.filename;
        this.elements.img.src = previewUrl;
        this.elements.img.alt = data.data.alt_text || '';
        this.show();
      }
    } catch (error) {
      console.error('Error loading preview:', error);
    }
  }

  /**
   * Show the preview container
   */
  show() {
    if (this.elements.container) {
      this.elements.container.style.display = 'block';
    }
  }

  /**
   * Hide the preview container
   */
  hide() {
    if (this.elements.container) {
      this.elements.container.style.display = 'none';
    }
  }

  /**
   * Update the text preview content
   * @param {string} html - HTML content to display
   */
  updateTextContent(html) {
    if (this.elements.textContent) {
      this.elements.textContent.innerHTML = html || '';
    }
  }

  /**
   * Update column 1 content (for two-column layout)
   * @param {string} html - HTML content for column 1
   */
  updateColumn1(html) {
    if (this.elements.textCol1) {
      this.elements.textCol1.innerHTML = html || '';
    }
  }

  /**
   * Update column 2 content (for two-column layout)
   * @param {string} html - HTML content for column 2
   */
  updateColumn2(html) {
    if (this.elements.textCol2) {
      this.elements.textCol2.innerHTML = html || '';
    }
  }

  /**
   * Set the layout mode (single or double column)
   * @param {string} layout - 'single' or 'double'
   */
  setLayout(layout) {
    if (layout === 'single') {
      // Show single column layout
      if (this.elements.layoutSingle) {
        this.elements.layoutSingle.style.display = 'block';
      }
      if (this.elements.layoutDouble) {
        this.elements.layoutDouble.style.display = 'none';
      }
    } else if (layout === 'double') {
      // Show double column layout
      if (this.elements.layoutSingle) {
        this.elements.layoutSingle.style.display = 'none';
      }
      if (this.elements.layoutDouble) {
        this.elements.layoutDouble.style.display = 'block';
      }
    }
  }

  /**
   * Set the height/aspect ratio
   * @param {number} height - Height percentage (10-60)
   */
  setHeight(height) {
    if (this.elements.heightSlider) {
      this.elements.heightSlider.value = height;
    }
    if (this.elements.heightValue) {
      this.elements.heightValue.textContent = height;
    }
    if (this.elements.preview) {
      this.elements.preview.style.paddingBottom = height + '%';
    }
  }

  /**
   * Set the overlay opacity and color
   * @param {number} opacity - Opacity value 0.0-1.0
   * @param {string} color - Hex color code
   */
  setOverlay(opacity, color) {
    if (this.elements.opacitySlider) {
      this.elements.opacitySlider.value = opacity;
    }
    if (this.elements.opacityValue) {
      this.elements.opacityValue.textContent = parseFloat(opacity).toFixed(2);
    }
    if (this.elements.colorPicker) {
      this.elements.colorPicker.value = color;
    }
    if (this.elements.colorHex) {
      this.elements.colorHex.value = color;
    }
    if (this.elements.overlay) {
      this.elements.overlay.style.backgroundColor = color;
      this.elements.overlay.style.opacity = opacity;
    }
  }

  /**
   * Populate all fields from settings object
   * @param {Object} settings - Settings object with background configuration
   */
  populate(settings) {
    if (!settings) return;

    const prefix = this.prefix;

    // Set media selection
    const mediaIdField = `${prefix}_media_id`;
    if (this.elements.mediaSelect && settings[mediaIdField]) {
      this.elements.mediaSelect.value = settings[mediaIdField];
    }

    // Set height
    const heightField = `${prefix}_height`;
    if (settings[heightField] !== undefined) {
      this.setHeight(settings[heightField]);
    }

    // Set overlay
    const opacityField = `${prefix}_overlay_opacity`;
    const colorField = `${prefix}_overlay_color`;
    const opacity = settings[opacityField] !== undefined ? settings[opacityField] : 0.5;
    const color = settings[colorField] || '#000000';
    this.setOverlay(opacity, color);

    // Load preview if media is set
    if (settings[mediaIdField]) {
      this.loadPreview(settings[mediaIdField]);
    }
  }
};
