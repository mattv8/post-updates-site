{* Footer Form - Reusable partial for both admin page and modal *}
{* Parameters: idPrefix (optional, for unique IDs) *}
{assign var="prefix" value=$idPrefix|default:""}

<div class="mb-3 form-check form-switch">
  <input class="form-check-input" type="checkbox" id="{$prefix}show_footer" />
  <label class="form-check-label" for="{$prefix}show_footer">
    <strong>Show footer section</strong>
  </label>
</div>

<hr class="mb-3" />

<div class="mb-3">
  <label class="form-label">Footer Background Image</label>

  {* Crop UI Container *}
  <div id="{$prefix}footer_crop_container" class="mt-3" style="display: none;">
    <label class="form-label">Crop Footer Image</label>
    <div class="border rounded p-2 bg-light" style="max-height: 500px; overflow: auto;">
      <img id="{$prefix}footer_crop_image" src="" style="max-width: 100%; display: block;" />
    </div>
    <div class="mt-2">
      <button type="button" class="btn btn-sm btn-outline-secondary" id="{$prefix}footer_auto_detect">
        <i class="bi bi-magic"></i> Auto-Detect Bounds
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary" id="{$prefix}footer_rotate_left" title="Rotate Left">
        <i class="bi bi-arrow-counterclockwise"></i>
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary" id="{$prefix}footer_rotate_right" title="Rotate Right">
        <i class="bi bi-arrow-clockwise"></i>
      </button>
      <button type="button" class="btn btn-sm btn-primary" id="{$prefix}footer_crop_upload">
        <i class="bi bi-upload"></i> Upload & Apply
      </button>
      <button type="button" class="btn btn-sm btn-secondary" id="{$prefix}footer_crop_cancel">
        Cancel
      </button>
    </div>
  </div>

  {* Upload Controls - hidden when image is selected *}
  <div class="footer-upload-controls">
    <select class="form-select" id="{$prefix}footer_media_id">
      <option value="">Choose from library...</option>
    </select>

    <div class="mt-2">
      <label class="form-label small">Or upload new image:</label>
      <input type="file" class="form-control" id="{$prefix}footer_upload_input" accept="image/jpeg,image/png,image/webp,image/heic" />
      <small class="form-text text-muted">Max 20MB. Formats: JPG, PNG, WebP, HEIC. You can crop the image after selection.</small>
    </div>
  </div>

  {include
    file='templates/partials/bg_preview.tpl'
    idPrefix='footer'
    showHeightControl=true
    showOverlayControls=true
    showTextPreview=true
    previewText='<h3>Footer Text</h3><p>Content will appear here...</p>'
    minHeight=10
    maxHeight=60
    defaultHeight=30
    previewLabel='Footer Background Preview'
    removeButtonClass='btn-remove-footer-bg'
  }
</div>

<hr class="mb-3" />

<div class="mb-3">
  <label class="form-label"><strong>Footer Layout</strong></label>
  <div class="form-check">
    <input class="form-check-input" type="radio" name="{$prefix}footer_layout" id="{$prefix}footer_layout_single" value="single" />
    <label class="form-check-label" for="{$prefix}footer_layout_single">
      Single Column
    </label>
  </div>
  <div class="form-check">
    <input class="form-check-input" type="radio" name="{$prefix}footer_layout" id="{$prefix}footer_layout_double" value="double" />
    <label class="form-check-label" for="{$prefix}footer_layout_double">
      Two Columns
    </label>
  </div>
</div>

<hr class="mb-3" />

<div class="mb-3">
  <div class="d-flex justify-content-between align-items-center mb-2">
    <label class="form-label mb-0">Footer Column 1</label>
    <small class="editor-autosave-indicator" id="{$prefix}footer-col1-autosave-status"></small>
  </div>
  <small class="text-muted d-block mb-2">Content for the first column (or only column in single layout)</small>
  <div id="{$prefix}footer_column1_html" class="form-control"></div>
</div>

<div class="mb-3" id="{$prefix}footer_column2_container">
  <div class="d-flex justify-content-between align-items-center mb-2">
    <label class="form-label mb-0">Footer Column 2</label>
    <small class="editor-autosave-indicator" id="{$prefix}footer-col2-autosave-status"></small>
  </div>
  <small class="text-muted d-block mb-2">Content for the second column (only shown in two-column layout)</small>
  <div id="{$prefix}footer_column2_html" class="form-control"></div>
</div>
