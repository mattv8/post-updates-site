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
  <div class="hero-banner-preview mt-2" style="display: none;">
    <img src="" alt="Hero preview" class="img-thumbnail" style="max-height: 200px;" />
    <button type="button" class="btn btn-sm btn-outline-danger ms-2 btn-remove-hero-banner">Remove</button>
  </div>
</div>
<div class="mb-3">
  <div class="d-flex justify-content-between align-items-center mb-2">
    <label class="form-label mb-0">Hero Text</label>
    <small class="editor-autosave-indicator" id="{$prefix}hero-autosave-status"></small>
  </div>
  <textarea class="form-control" id="{$prefix}hero_html" rows="5"></textarea>
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
    <label class="form-label">Hero Section Height</label>
    <div class="input-group">
      <input type="number" min="100" max="1000" step="10" class="form-control" id="{$prefix}hero_height" placeholder="e.g. 400" />
      <span class="input-group-text">px</span>
    </div>
    <small class="text-muted">Set the height of the hero section (default: image height or 400px)</small>
  </div>
  <div class="col-sm-6">
    <label class="form-label">Overlay Color</label>
    <input type="text" class="form-control" id="{$prefix}hero_overlay_color" placeholder="#000000" />
  </div>
</div>
