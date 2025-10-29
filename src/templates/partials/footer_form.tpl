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
  <select class="form-select" id="{$prefix}footer_media_id">
    <option value="">None</option>
  </select>
  <div class="footer-preview-container mt-3" style="display: none;">
    <div class="row g-3 align-items-start">
      <div class="col-md-7">
        <div class="footer-preview-wrapper position-relative" style="overflow: hidden; border-radius: 0.375rem;">
          <div class="footer-preview" style="display: block; height: 200px; position: relative; overflow: hidden;">
            <img src="" alt="Footer preview" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; display: block; z-index: 0;" />
            <div class="footer-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: #000000; opacity: 0.5; pointer-events: none; z-index: 1;"></div>
            <button type="button" class="btn btn-danger btn-sm btn-remove-footer-bg position-absolute top-0 end-0 m-2"
                    style="z-index: 10; opacity: 0; transition: opacity 0.2s;" title="Remove footer background">
              <i class="bi bi-trash"></i>
            </button>
          </div>
          <div class="text-muted small mt-1 text-center">Background Preview</div>
        </div>
      </div>
      <div class="col-md-5">
        <div class="mb-3">
          <label for="{$prefix}footer_overlay_opacity" class="form-label fw-semibold">
            Overlay Opacity: <span class="footer-overlay-opacity-value text-primary">0.50</span>
          </label>
          <input type="range" class="form-range" id="{$prefix}footer_overlay_opacity" min="0" max="1" step="0.05" value="0.5">
          <div class="d-flex justify-content-between mt-1">
            <small class="text-muted">0% (transparent)</small>
            <small class="text-muted">100% (solid)</small>
          </div>
        </div>

        <div class="mb-3">
          <label for="{$prefix}footer_overlay_color" class="form-label fw-semibold">
            Overlay Color
          </label>
          <div class="d-flex align-items-center gap-2">
            <input type="color" class="form-control form-control-color" id="{$prefix}footer_overlay_color" value="#000000" title="Choose overlay color">
            <input type="text" class="form-control form-control-sm" id="{$prefix}footer_overlay_color_hex" value="#000000" pattern="^#[0-9A-Fa-f]{6}$" style="width: 100px;">
          </div>
        </div>
      </div>
    </div>
  </div>
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
