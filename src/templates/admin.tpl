<div class="container py-4" id="adminApp" data-csrf="{$csrf_token}">
  <h1 class="mb-4">Site Admin</h1>

  <ul class="nav nav-tabs" id="adminTabs" role="tablist">
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="tab-posts" data-bs-toggle="tab" data-bs-target="#pane-posts" type="button" role="tab">Posts</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="tab-hero" data-bs-toggle="tab" data-bs-target="#pane-hero" type="button" role="tab">Hero Banner</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="tab-about" data-bs-toggle="tab" data-bs-target="#pane-about" type="button" role="tab">About</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="tab-donation" data-bs-toggle="tab" data-bs-target="#pane-donation" type="button" role="tab">Donation</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="tab-media" data-bs-toggle="tab" data-bs-target="#pane-media" type="button" role="tab">Media</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="tab-settings" data-bs-toggle="tab" data-bs-target="#pane-settings" type="button" role="tab">Settings</button>
    </li>
  </ul>

  <div class="tab-content border border-top-0 p-3 bg-white" id="adminTabContent" style="visibility: hidden;">
    <div class="tab-pane fade" id="pane-posts" role="tabpanel">
      <div class="d-flex justify-content-between align-items-center mt-3">
        <h5 class="mb-0">Posts</h5>
        <button class="btn btn-sm btn-success" id="btnNewPost" data-bs-toggle="modal" data-bs-target="#postEditorModal">New Post</button>
      </div>
      <div id="postsList" class="mt-3"></div>
    </div>

    <div class="tab-pane fade" id="pane-hero" role="tabpanel">
      <form id="heroForm" class="mt-3">
        {include file='templates/partials/hero_form.tpl'}
        <button type="submit" class="btn btn-primary mt-3">Save</button>
      </form>
    </div>

    <div class="tab-pane fade" id="pane-about" role="tabpanel">
      <form id="aboutForm" class="mt-3">
        {include file='templates/partials/about_form.tpl'}
        <button type="submit" class="btn btn-primary">Save About</button>
      </form>
    </div>

    <div class="tab-pane fade" id="pane-donation" role="tabpanel">
      <form id="donationForm" class="mt-3">
        {include file='templates/partials/donation_form.tpl'}
        <button type="submit" class="btn btn-primary">Save Donation</button>
      </form>
    </div>

    <div class="tab-pane fade" id="pane-media" role="tabpanel">
      <form id="uploadForm" class="mt-3">
        <div class="row g-2">
          <div class="col-12 col-md-5">
            <input type="file" class="form-control" id="mediaFile" accept="image/*" />
          </div>
          <div class="col-12 col-md-4">
            <input type="text" class="form-control" id="mediaAlt" placeholder="Alt text" />
          </div>
          <div class="col-12 col-md-3">
            <button class="btn btn-primary w-100" type="submit">Upload</button>
          </div>
        </div>
      </form>
      <div id="mediaGrid" class="row row-cols-2 row-cols-md-4 g-2 mt-2"></div>
    </div>

    <div class="tab-pane fade" id="pane-settings" role="tabpanel">
      <form id="settingsForm" class="mt-3">
        <div class="mb-3">
          <label class="form-label">Site Title</label>
          <input type="text" id="site_title" class="form-control" />
        </div>
        <div class="mb-3">
          <label class="form-label">Donation Presets (comma-separated)</label>
          <input type="text" id="donation_presets" class="form-control" placeholder="10,25,50,100" />
        </div>
        <div class="mb-3">
          <label class="form-label d-flex justify-content-between align-items-center">
            <span>AI Title Generation System Prompt</span>
            <button type="button" class="btn btn-sm btn-outline-secondary" id="btnResetAIPrompt">Reset to Default</button>
          </label>
          <textarea id="ai_system_prompt" class="form-control" rows="4" placeholder="Enter custom AI system prompt for title generation..."></textarea>
          <small class="form-text text-muted">
            This prompt guides the AI when generating post titles. It should instruct the AI on tone, length, and style.
          </small>
        </div>
        <button type="submit" class="btn btn-primary">Save Settings</button>
      </form>
    </div>
  </div>
</div>

{* Post Editor Modal - Will be moved to body by JS *}
<div class="modal fade" id="postEditorModal" tabindex="-1" aria-labelledby="postEditorModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-xl">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="postEditorModalLabel">Edit Post</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        {include file='templates/partials/post_editor.tpl'}
      </div>
    </div>
  </div>
</div>

{* Media Delete Confirmation Modal *}
<div class="modal fade" id="mediaDeleteModal" tabindex="-1" aria-labelledby="mediaDeleteModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="mediaDeleteModalLabel">Confirm Delete</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p id="mediaDeleteFilename" class="fw-bold mb-3"></p>
        <div id="mediaDeleteWarning" class="alert alert-warning d-none" role="alert">
          <strong>⚠️ WARNING:</strong> This image is currently used in the following:
          <ul id="mediaDeleteAffectedList" class="mt-2 mb-0"></ul>
          <p class="mt-2 mb-0 small">Deleting this image will remove it from these posts.</p>
        </div>
        <div id="mediaDeleteNoUsage" class="text-muted d-none">
          This image is not currently used in any posts.
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-danger" id="confirmMediaDelete">Delete Image</button>
      </div>
    </div>
  </div>
</div>

{* Post Delete Confirmation Modal *}
<div class="modal fade" id="deletePostModal" tabindex="-1" aria-labelledby="deletePostModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="deletePostModalLabel">Confirm Delete</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p>Are you sure you want to delete this post?</p>
        <p class="text-muted small mb-0">This action will archive the post and it will no longer be visible to visitors.</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-danger" id="confirmDeletePostAdmin">Delete Post</button>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
<script src="/js/admin.js"></script>
