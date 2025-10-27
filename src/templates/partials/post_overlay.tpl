{* Overlay modal for full post view *}
<div id="post-overlay" class="post-overlay d-none">
  <div class="post-overlay-backdrop"></div>
  <div class="post-overlay-content card shadow">
    <div class="card-header d-flex justify-content-between align-items-center">
      <h5 class="mb-0" id="overlay-title"></h5>
      <div class="d-flex gap-2">
        {if $is_authenticated|default:false}
          <button type="button" class="btn btn-sm btn-outline-danger" id="overlay-delete" style="display: none;">
            <i class="bi bi-trash"></i> Delete
          </button>
        {/if}
        <button type="button" class="btn-close" aria-label="Close" id="overlay-close"></button>
      </div>
    </div>
    <div class="card-body">
      <div id="overlay-media" class="mb-3"></div>
      <div id="overlay-body"></div>
    </div>
  </div>
</div>
