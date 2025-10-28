{* Reusable post editor component *}
<div class="post-editor">
  {if isset($mode) && $mode == 'edit'}
  <div class="post-editor-loading text-center py-5">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
    <p class="mt-3 text-muted">Loading post...</p>
  </div>
  <div class="post-editor-content" style="display:none;">
  <div class="d-flex justify-content-between align-items-center mb-3">
    <div class="me-3">
      <label for="postStatusToggle" class="form-label mb-0">Published</label>
    </div>
    <div class="d-flex align-items-center gap-3">
      <div class="form-check form-switch m-0">
        <input class="form-check-input post-status-toggle" type="checkbox" id="postStatusToggle">
        <label class="form-check-label ms-1" for="postStatusToggle"><span class="status-label">Published</span></label>
      </div>
      <small id="post-status-save" class="text-muted"></small>
    </div>
  </div>
  {/if}
  <div class="mb-3">
    <label class="form-label">Title (optional)</label>
    <div class="input-group">
      <input type="text" class="form-control post-title" placeholder="Untitled post" />
      <button type="button" class="btn btn-outline-secondary btn-generate-title" title="Generate title with AI">
        <i class="bi bi-sparkles me-1"></i>Create Title with AI
      </button>
    </div>
    <small class="form-text text-muted">Leave blank or click "Create Title with AI" to generate from content</small>
  </div>

  <div class="mb-3">
    <label class="form-label d-flex justify-content-between align-items-center">
      <span>Content</span>
      <small class="editor-autosave-indicator" id="post-autosave-status">
        <span class="text-muted">Auto-save enabled</span>
      </small>
    </label>
    <div class="form-control post-body"></div>
  </div>

  {* Hero Image Section *}
  <div class="mb-3">
    <label class="form-label">Hero Image (optional)</label>
    <div class="hero-image-section">
      <div class="hero-preview-container mb-3" style="display:none;">
        <div class="row g-3 align-items-start">
          <div class="col-md-7">
            <div class="hero-preview-wrapper position-relative" style="overflow: hidden; border-radius: 0.375rem;">
              <div class="hero-preview" style="display: block; height: 0; padding-bottom: 100%; position: relative; overflow: hidden;">
                <img src="" alt="" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; display: block;" />
                <div class="hero-preview-title-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; padding: 2rem 1rem 1rem; background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.3) 80%, transparent 100%); display: none;">
                  <h5 class="text-white mb-0" style="font-size: 1.25rem;">Post Title Preview</h5>
                </div>
                <button type="button" class="btn btn-danger btn-sm btn-remove-hero position-absolute top-0 end-0 m-2"
                        style="z-index: 10; opacity: 0; transition: opacity 0.2s;" title="Remove hero image">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
              <div class="text-muted small mt-1 text-center">Preview (matches actual display)</div>
            </div>
          </div>
          <div class="col-md-5">
            {* Hero Image Height Control *}
            <div class="hero-height-control">
              <label for="heroImageHeight" class="form-label fw-semibold">
                Display Height: <span class="hero-height-value text-primary">100</span>%
              </label>
              <input type="range" class="form-range post-hero-height" id="heroImageHeight"
                     min="10" max="100" step="5" value="100">
              <div class="d-flex justify-content-between mt-1">
                <small class="text-muted">10%</small>
                <small class="text-muted">50%</small>
                <small class="text-muted">100%</small>
              </div>

              {* Crop Overlay Toggle *}
              <div class="form-check form-switch mt-3">
                <input class="form-check-input post-hero-crop-overlay" type="checkbox" id="heroCropOverlay">
                <label class="form-check-label" for="heroCropOverlay">
                  Apply cropping in post view
                </label>
              </div>
              <small class="form-text text-muted d-block mt-1">
                When enabled, the post detail view will use the same cropped aspect ratio. When disabled, the full image is shown.
              </small>

              {* Title Overlay Toggle *}
              <div class="form-check form-switch mt-3">
                <input class="form-check-input post-hero-title-overlay" type="checkbox" id="heroTitleOverlay" checked>
                <label class="form-check-label" for="heroTitleOverlay">
                  Display title over hero image
                </label>
              </div>
              <small class="form-text text-muted d-block mt-1">
                When enabled, the title appears overlaid on the hero image with a dark background. When disabled, the title appears below the hero image.
              </small>

              {* Overlay Opacity Slider *}
              <div class="mt-3 hero-overlay-opacity-control">
                <label class="form-label" for="heroOverlayOpacity">
                  Hero Image Brightness: <span class="overlay-opacity-value">0.70</span>
                </label>
                <input type="range" class="form-range post-hero-overlay-opacity" id="heroOverlayOpacity"
                       min="0" max="1" step="0.05" value="0.70">
                <small class="form-text text-muted d-block">
                  Lower values darken the image more when title overlay is enabled (0.0 = very dark, 1.0 = no darkening)
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="hero-upload-controls">
        <div class="input-group">
          <select class="form-select post-hero-media">
            <option value="">Choose from library...</option>
            {* Will be populated by JS with available media *}
          </select>
          <span class="mx-2">or</span>
          <input type="file" class="form-control hero-upload-input" accept="image/jpeg,image/png,image/webp,image/heic" />
          <button type="button" class="btn btn-outline-primary btn-upload-hero" style="display:none;">Upload</button>
        </div>
        <small class="form-text text-muted">Max 20MB. Formats: JPG, PNG, WebP, HEIC</small>
      </div>
    </div>
  </div>

  {* Gallery Section *}
  <div class="mb-3">
    <label class="form-label">Gallery Images (optional)</label>
    <div class="gallery-section">
      <div class="gallery-preview mb-2" id="galleryPreview">
        {* Gallery thumbnails will be inserted here via JS *}
      </div>
      <div class="gallery-upload-controls">
        <input type="file" class="form-control gallery-upload-input" accept="image/jpeg,image/png,image/webp,image/heic" multiple />
        <button type="button" class="btn btn-outline-secondary btn-upload-gallery mt-2" style="display:none;">Upload</button>
        <small class="form-text text-muted d-block mt-1">Max 20MB per file. Select multiple files. Drag to reorder.</small>
      </div>
    </div>
  </div>

  {if !isset($mode) || $mode != 'edit'}
    <div class="row g-3">
      <div class="col-md-6">
        <label class="form-label">Status</label>
        <select class="form-select post-status">
          <option value="draft">Draft</option>
          <option value="published" selected>Published</option>
        </select>
      </div>
    </div>
  {/if}

  <div class="mt-3 d-flex gap-2 justify-content-end">
    <button type="button" class="btn btn-outline-secondary btn-cancel-post">Cancel</button>
    <button type="button" class="btn btn-primary btn-save-post">Save Post</button>
  </div>
  {if isset($mode) && $mode == 'edit'}
  </div>
  {/if}
</div>

<style>
.gallery-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 50px;
  padding: 10px;
  border: 1px dashed #dee2e6;
  border-radius: 4px;
}

.gallery-preview.empty::before {
  content: "No gallery images yet. Upload images below.";
  color: #6c757d;
  font-size: 0.875rem;
}

.gallery-item {
  position: relative;
  width: 100px;
  height: 100px;
  cursor: move;
}

.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
  border: 2px solid #dee2e6;
}

.gallery-item .btn-remove-gallery-item {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 50%;
  font-size: 12px;
  line-height: 1;
}

.gallery-item.dragging {
  opacity: 0.5;
}

.hero-preview img {
  border: 2px solid #0d6efd;
}
</style>
