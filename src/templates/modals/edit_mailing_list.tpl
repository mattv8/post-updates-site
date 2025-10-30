{* Edit Mailing List Modal - Reusable component for editing mailing list section *}
<div class="modal fade" id="editMailingListModal" tabindex="-1" aria-labelledby="editMailingListModalLabel" aria-hidden="true" data-bs-focus="false">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="editMailingListModalLabel">Edit Mailing List Section</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="modal-loading text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-2 text-muted">Initializing editor...</p>
        </div>
        <form id="mailingListFormModal" style="display: none;">
          {include file='templates/partials/mailing_list_form.tpl' idPrefix='modal_'}
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary" id="saveMailingListModal" disabled>Save And Publish</button>
      </div>
    </div>
  </div>
</div>

<script>
// Pre-populate modal with settings data from backend
document.addEventListener('DOMContentLoaded', function() {
  const settings = {$settings|@json_encode nofilter};
  window.mailingListModalSettings = settings;
});
</script>
