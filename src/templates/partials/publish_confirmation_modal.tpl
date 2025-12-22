{* Email Confirmation Modal - confirms sending email to subscribers *}
<div class="modal fade" id="publishConfirmModal" tabindex="-1" aria-labelledby="publishConfirmModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header bg-success bg-opacity-10">
        <h5 class="modal-title" id="publishConfirmModalLabel">
          <i class="bi bi-envelope-fill text-success me-2"></i>
          Confirm Email Notification
        </h5>
        <button type="button" class="btn-close" aria-label="Close" onclick="window.publishConfirmation && window.publishConfirmation.inlineCancel && window.publishConfirmation.inlineCancel()"></button>
      </div>
      <div class="modal-body">
        <p class="mb-3">
          <strong>You are about to send an email notification.</strong>
        </p>
        <p class="mb-3">
          This will publish the post and send an email to
          <strong><span id="publishConfirmSubscriberCount">...</span> active subscriber(s)</strong>.
        </p>
        <p class="mb-0 text-muted small">
          <i class="bi bi-info-circle me-1"></i>
          Email notifications can only be sent once per post.
        </p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="publishCancelBtn" onclick="window.publishConfirmation && window.publishConfirmation.inlineCancel && window.publishConfirmation.inlineCancel()">Cancel</button>
        <button type="button" class="btn btn-outline-primary" id="publishOnlyBtn" onclick="window.publishConfirmation && window.publishConfirmation.inlinePublishOnly && window.publishConfirmation.inlinePublishOnly()">
          <i class="bi bi-check-lg me-1"></i>
          Publish Only
        </button>
        <button type="button" class="btn btn-success" id="confirmPublishBtn" onclick="window.publishConfirmation && window.publishConfirmation.inlineConfirm && window.publishConfirmation.inlineConfirm()">
          <i class="bi bi-send-fill me-1"></i>
          Publish &amp; Send Emails
        </button>
      </div>
    </div>
  </div>
</div>
