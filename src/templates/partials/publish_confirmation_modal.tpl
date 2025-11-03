{* Publish Confirmation Modal *}
<div class="modal fade" id="publishConfirmModal" tabindex="-1" aria-labelledby="publishConfirmModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header bg-warning bg-opacity-10">
        <h5 class="modal-title" id="publishConfirmModalLabel">
          <i class="bi bi-exclamation-triangle-fill text-warning me-2"></i>
          Confirm First-Time Publish
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p class="mb-3">
          <strong>This post has never been published before.</strong>
        </p>
        <p class="mb-3">
          Publishing this post for the first time will trigger an email notification to
          <strong><span id="publishConfirmSubscriberCount">...</span> active subscriber(s)</strong>.
        </p>
        <p class="mb-0 text-muted small">
          <i class="bi bi-info-circle me-1"></i>
          Re-publishing or updating an already published post will not trigger email notifications.
        </p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-warning" id="confirmPublishBtn" onclick="window.publishConfirmation && window.publishConfirmation.inlineConfirm && window.publishConfirmation.inlineConfirm()">
          <i class="bi bi-send-fill me-1"></i>
          Publish &amp; Send Emails
        </button>
      </div>
    </div>
  </div>
</div>
