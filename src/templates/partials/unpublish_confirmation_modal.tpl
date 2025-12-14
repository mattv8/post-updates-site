{* Unpublish Confirmation Modal *}
<div class="modal fade" id="unpublishConfirmModal" tabindex="-1" aria-labelledby="unpublishConfirmModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header bg-info bg-opacity-10">
        <h5 class="modal-title" id="unpublishConfirmModalLabel">
          <i class="bi bi-arrow-down-circle-fill text-info me-2"></i>
          Confirm Unpublish
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p class="mb-3">
          <strong>Are you sure you want to unpublish this post?</strong>
        </p>
        <p class="mb-0 text-muted small">
          <i class="bi bi-info-circle me-1"></i>
          The post will be reverted to draft status and hidden from visitors. You can republish it later.
        </p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-info" id="confirmUnpublishBtn" onclick="window.unpublishConfirmation && window.unpublishConfirmation.inlineConfirm && window.unpublishConfirmation.inlineConfirm()">
          <i class="bi bi-arrow-down-circle me-1"></i>
          Unpublish
        </button>
      </div>
    </div>
  </div>
</div>
