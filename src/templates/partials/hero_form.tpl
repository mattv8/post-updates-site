{* Hero Form - Reusable partial for both admin page and modal *}
{* Parameters: idPrefix (optional, for unique IDs) *}
{assign var="prefix" value=$idPrefix|default:""}
<div class="mb-3 form-check form-switch">
  <input class="form-check-input" type="checkbox" id="{$prefix}show_hero" />
  <label class="form-check-label" for="{$prefix}show_hero">
    <strong>Show Hero Banner on home page</strong>
  </label>
</div>
<hr class="mb-3" />
<div class="mb-3">
  <label class="form-label">Hero Background Image</label>

  {* Crop UI Container *}
  <div id="{$prefix}hero_crop_container" class="mt-3" style="display: none;">
    <label class="form-label">Crop Hero Image</label>
    <div class="border rounded p-2 bg-light" style="max-height: 500px; overflow: auto;">
      <img id="{$prefix}hero_crop_image" src="" style="max-width: 100%; display: block;" />
    </div>
    <div class="mt-2">
      <button type="button" class="btn btn-sm btn-outline-secondary" id="{$prefix}hero_auto_detect">
        <i class="bi bi-magic"></i> Auto-Detect Bounds
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary" id="{$prefix}hero_rotate_left" title="Rotate Left">
        <i class="bi bi-arrow-counterclockwise"></i>
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary" id="{$prefix}hero_rotate_right" title="Rotate Right">
        <i class="bi bi-arrow-clockwise"></i>
      </button>
      <button type="button" class="btn btn-sm btn-primary" id="{$prefix}hero_crop_upload">
        <i class="bi bi-upload"></i> Upload & Apply
      </button>
      <button type="button" class="btn btn-sm btn-secondary" id="{$prefix}hero_crop_cancel">
        Cancel
      </button>
    </div>
  </div>

  {* Upload Controls - hidden when image is selected *}
  <div class="hero-banner-upload-controls">
    <select class="form-select" id="{$prefix}hero_media_id">
      <option value="">Choose from library...</option>
    </select>

    <div class="mt-2">
      <label class="form-label small">Or upload new image:</label>
      <input type="file" class="form-control" id="{$prefix}hero_upload_input" accept="image/jpeg,image/png,image/webp,image/heic" />
      <small class="form-text text-muted">Max 20MB. Formats: JPG, PNG, WebP, HEIC. You can crop the image after selection.</small>
    </div>
  </div>

  <div class="hero-banner-preview-container mt-3" style="display: none;">
    <div class="row g-3 align-items-start">
      <div class="col-md-7">
        <div class="hero-banner-preview-wrapper position-relative" style="overflow: hidden; border-radius: 0.375rem;">
          <div class="hero-banner-preview" style="display: block; height: 0; padding-bottom: 100%; position: relative; overflow: hidden;">
            <img src="" alt="Hero preview" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; display: block; z-index: 0;" />
            <div class="hero-banner-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: #000000; opacity: 0.5; pointer-events: none; z-index: 1;"></div>
            <div class="hero-banner-text-preview hero-content" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.5); transform-origin: center; width: 200%; max-width: 2000px; color: white; z-index: 2; padding: 1rem 10rem 1rem 10rem;">
              <div class="hero-preview-content">Hero text will appear here...</div>
            </div>
            <button type="button" class="btn btn-danger btn-sm btn-remove-hero-banner position-absolute top-0 end-0 m-2"
                    style="z-index: 10; opacity: 0; transition: opacity 0.2s;" title="Remove hero image">
              <i class="bi bi-trash"></i>
            </button>
          </div>
          <div class="text-muted small mt-1 text-center">Preview (matches actual display)</div>
        </div>
      </div>
      <div class="col-md-5">
        <div class="hero-banner-height-control mb-3">
          <label for="{$prefix}hero_height" class="form-label fw-semibold">
            Display Height: <span class="hero-banner-height-value text-primary">100</span>%
          </label>
          <input type="range" class="form-range" id="{$prefix}hero_height" min="10" max="100" step="5" value="100">
          <div class="d-flex justify-content-between mt-1">
            <small class="text-muted">10%</small>
            <small class="text-muted">50%</small>
            <small class="text-muted">100%</small>
          </div>
        </div>

        <div class="mb-3">
          <label for="{$prefix}hero_overlay_opacity" class="form-label fw-semibold">
            Overlay Opacity: <span class="hero-overlay-opacity-value text-primary">0.50</span>
          </label>
          <input type="range" class="form-range" id="{$prefix}hero_overlay_opacity" min="0" max="1" step="0.05" value="0.5">
          <div class="d-flex justify-content-between mt-1">
            <small class="text-muted">0% (transparent)</small>
            <small class="text-muted">100% (solid)</small>
          </div>
        </div>

        <div class="mb-3">
          <label for="{$prefix}hero_overlay_color" class="form-label fw-semibold">
            Overlay Color
          </label>
          <div class="d-flex align-items-center gap-2">
            <input type="color" class="form-control form-control-color" id="{$prefix}hero_overlay_color" value="#000000" title="Choose overlay color">
            <input type="text" class="form-control form-control-sm" id="{$prefix}hero_overlay_color_hex" value="#000000" maxlength="7" style="width: 100px;">
          </div>
        </div>

      </div>
    </div>
  </div>
</div>
<div class="mb-3">
  <div class="d-flex justify-content-between align-items-center mb-2">
    <label class="form-label mb-0">Hero Text</label>
    <small class="editor-autosave-indicator" id="{$prefix}hero-autosave-status"></small>
  </div>
  <div class="form-control" id="{$prefix}hero_html"></div>
</div>
