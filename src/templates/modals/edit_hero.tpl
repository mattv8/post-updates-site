{* Edit Hero Modal - Reusable component for editing hero banner *}
{* Edit Hero Modal *}
<div class="modal fade" id="editHeroModal" tabindex="-1" data-bs-focus="false">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Edit Hero Banner</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="modal-loading text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-2 text-muted">Initializing editor...</p>
        </div>
        <form id="modalHeroForm" style="display: none;">
          {include file='templates/partials/hero_form.tpl' idPrefix='modal_'}
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary" id="saveHeroModal" disabled>Save Changes</button>
      </div>
    </div>
  </div>
</div>

<script>
// Pre-populate modal with settings data from backend
document.addEventListener('DOMContentLoaded', function() {
  const settings = {$settings|@json_encode nofilter};

  // Store settings for modal use
  window.heroModalSettings = settings;
});
</script>
