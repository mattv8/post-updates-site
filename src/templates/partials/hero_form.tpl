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
  <select class="form-select" id="{$prefix}hero_media_id">
    <option value="">None</option>
  </select>
  <div class="hero-banner-preview-container mt-3" style="display: none;">
    <div class="row g-3 align-items-start">
      <div class="col-md-7">
        <div class="hero-banner-preview-wrapper position-relative" style="overflow: hidden; border-radius: 0.375rem;">
          <div class="hero-banner-preview" style="display: block; height: 0; padding-bottom: 100%; position: relative; overflow: hidden;">
            <img src="" alt="Hero preview" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; display: block;" />
            <button type="button" class="btn btn-danger btn-sm btn-remove-hero-banner position-absolute top-0 end-0 m-2"
                    style="z-index: 10; opacity: 0; transition: opacity 0.2s;" title="Remove hero image">
              <i class="bi bi-trash"></i>
            </button>
          </div>
          <div class="text-muted small mt-1 text-center">Preview (matches actual display)</div>
        </div>
      </div>
      <div class="col-md-5">
        <div class="hero-banner-height-control">
          <label for="{$prefix}hero_height" class="form-label fw-semibold">
            Display Height: <span class="hero-banner-height-value text-primary">100</span>%
          </label>
          <input type="range" class="form-range" id="{$prefix}hero_height" min="10" max="100" step="5" value="100">
          <div class="d-flex justify-content-between mt-1">
            <small class="text-muted">10%</small>
            <small class="text-muted">50%</small>
            <small class="text-muted">100%</small>
          </div>
          <div class="alert alert-info mt-3 py-2 px-3 small mb-0">
            <i class="bi bi-info-circle me-1"></i>
            Controls the aspect ratio of the hero banner. Lower values create shorter, wider displays.
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
<div class="row g-3">
  <div class="col-sm-6">
    <label class="form-label">CTA Text</label>
    <input type="text" class="form-control" id="{$prefix}cta_text" />
  </div>
  <div class="col-sm-6">
    <label class="form-label">CTA URL</label>
    <input type="text" class="form-control" id="{$prefix}cta_url" />
  </div>
</div>
<div class="row g-3 mt-1">
  <div class="col-sm-6">
    <label class="form-label">Overlay Opacity</label>
    <input type="number" step="0.05" min="0" max="1" class="form-control" id="{$prefix}hero_overlay_opacity" />
  </div>
  <div class="col-sm-6">
    <label class="form-label">Overlay Color</label>
    <input type="text" class="form-control" id="{$prefix}hero_overlay_color" placeholder="#000000" />
  </div>
</div>
