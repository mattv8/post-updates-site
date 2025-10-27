{* Reusable post editor component *}
<div class="post-editor">
  <div class="mb-3">
    <label class="form-label">Title (optional)</label>
    <input type="text" class="form-control post-title" placeholder="Untitled post" />
  </div>

  <div class="mb-3">
    <label class="form-label d-flex justify-content-between align-items-center">
      <span>Content</span>
      <small class="editor-autosave-indicator" id="post-autosave-status">
        <span class="text-muted">Auto-save enabled</span>
      </small>
    </label>
    <textarea class="form-control post-body" rows="10"></textarea>
  </div>

  {* Hero Image Section *}
  <div class="mb-3">
    <label class="form-label">Hero Image (optional)</label>
    <div class="hero-image-section">
      <div class="hero-preview mb-2" style="display:none;">
        <img src="" alt="" class="img-thumbnail" style="max-height: 200px;" />
        <button type="button" class="btn btn-sm btn-danger mt-1 btn-remove-hero">Remove</button>
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

  <div class="row g-3">
    <div class="col-md-6">
      <label class="form-label">Status</label>
      <select class="form-select post-status">
        <option value="draft">Draft</option>
        <option value="published">Published</option>
      </select>
    </div>
  </div>

  <div class="mt-3 d-flex gap-2 justify-content-end">
    <button type="button" class="btn btn-outline-secondary btn-cancel-post">Cancel</button>
    <button type="button" class="btn btn-primary btn-save-post">Save Post</button>
  </div>
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
