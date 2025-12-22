{* Save Draft Confirmation Modal - explains that saving as draft won't publish *}
<div class="modal fade" id="saveDraftConfirmModal" tabindex="-1" aria-labelledby="saveDraftConfirmModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header bg-primary bg-opacity-10">
        <h5 class="modal-title" id="saveDraftConfirmModalLabel">
          <i class="bi bi-info-circle text-primary me-2"></i>
          Saving as Draft
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p class="mb-3">
          This will save your changes as a <strong>draft</strong>.
        </p>
        <p class="mb-3">
          The changes will <strong>not be visible</strong> to visitors until you click <strong>"Publish"</strong>.
        </p>
        <div class="form-check mt-3">
          <input class="form-check-input" type="checkbox" id="saveDraftDontShowAgain">
          <label class="form-check-label" for="saveDraftDontShowAgain">
            Don't show this message again
          </label>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary btn-confirm-save-draft">
          <i class="bi bi-floppy me-1"></i>Save Draft
        </button>
      </div>
    </div>
  </div>
</div>
