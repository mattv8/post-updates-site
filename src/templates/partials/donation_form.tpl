{* Donation Form - Reusable partial for both admin page and modal *}
{* Parameters: idPrefix (optional, for unique IDs) *}
{assign var="prefix" value=$idPrefix|default:""}
<div class="mb-3 form-check form-switch">
  <input class="form-check-input" type="checkbox" id="{$prefix}show_donation" />
  <label class="form-check-label" for="{$prefix}show_donation">
    <strong>Show Donation section in sidebar</strong>
  </label>
</div>
<div class="mb-3 form-check form-switch">
  <input class="form-check-input" type="checkbox" id="{$prefix}show_donate_button" />
  <label class="form-check-label" for="{$prefix}show_donate_button">
    <strong>Show Donate button</strong>
  </label>
</div>

<hr class="mb-3" />

<div class="mb-3">
  <div class="d-flex justify-content-between align-items-center mb-2">
    <label class="form-label mb-0">Donation Section Content</label>
    <small class="editor-autosave-indicator" id="{$prefix}donation-autosave-status"></small>
  </div>
  <small class="text-muted d-block mb-2">This content appears in the donation card in the sidebar</small>
  <div id="{$prefix}donate_text_html" class="form-control" style="min-height: 150px;"></div>
</div>

<hr class="mb-3" />

<div class="mb-3">
  <label class="form-label">Donation Method</label>
  <div class="form-check">
    <input class="form-check-input" type="radio" name="{$prefix}donation_method" id="{$prefix}donation_method_link" value="link">
    <label class="form-check-label" for="{$prefix}donation_method_link">
      Link Only
    </label>
  </div>
  <div class="form-check">
    <input class="form-check-input" type="radio" name="{$prefix}donation_method" id="{$prefix}donation_method_qr" value="qr">
    <label class="form-check-label" for="{$prefix}donation_method_qr">
      Image or QR Code Only
    </label>
  </div>
  <div class="form-check">
    <input class="form-check-input" type="radio" name="{$prefix}donation_method" id="{$prefix}donation_method_both" value="both">
    <label class="form-check-label" for="{$prefix}donation_method_both">
      Both Link and Image/QR Code
    </label>
  </div>
</div>

<div class="mb-3">
  <label for="{$prefix}donation_link" class="form-label">Donation Link</label>
  <input type="url" class="form-control" id="{$prefix}donation_link" placeholder="https://venmo.com/u/username or https://paypal.me/username">
  <small class="text-muted">Link to your Venmo, PayPal, Ko-fi, or other donation page</small>
</div>

<div class="mb-3">
  <label class="form-label">Image or QR Code</label>
  <div class="qr-upload-section">
    <div class="qr-preview-container mb-3" style="display:none;">
      <div class="text-center">
        <img src="" alt="Donation Image Preview" class="qr-preview-img img-thumbnail" style="max-width: 200px;">
        <div>
          <button type="button" class="btn btn-sm btn-danger mt-2 btn-remove-qr">
            <i class="bi bi-trash"></i> Remove Image
          </button>
        </div>
      </div>
    </div>
    <div class="qr-upload-controls">
      <div class="input-group">
        <select class="form-select {$prefix}donation-qr-select" id="{$prefix}donation_qr_media_id">
          <option value="">Choose from library...</option>
        </select>
        <span class="mx-2">or</span>
        <input type="file" class="form-control qr-upload-input" accept="image/jpeg,image/png,image/webp" />
        <button type="button" class="btn btn-outline-primary btn-upload-qr" style="display:none;">Upload</button>
      </div>
      <small class="text-muted">Upload a payment QR code or image (Venmo, PayPal, etc.). Max 20MB.</small>
    </div>
  </div>
</div>

<div class="mb-3">
  <div class="d-flex justify-content-between align-items-center mb-2">
    <label class="form-label mb-0">Donation Modal Instructions</label>
    <small class="editor-autosave-indicator" id="{$prefix}donation-instructions-autosave-status"></small>
  </div>
  <small class="text-muted d-block mb-2">Instructions shown in the donation modal</small>
  <div id="{$prefix}donation_instructions_html" class="form-control" style="min-height: 150px;"></div>
</div>

<hr class="mb-3" />

<div class="mb-3">
  <label class="form-label">Donation Presets (comma-separated)</label>
  <input type="text" id="{$prefix}donation_presets" class="form-control" placeholder="10,25,50,100" />
  <small class="text-muted">Suggested donation amounts shown to users</small>
</div>

{* Donation Modal Preview *}
<div class="mb-3">
  <label class="form-label fw-bold">Preview</label>
  <p class="text-muted small">This is how the donation modal will appear to users after clicking the <span class="btn btn-success btn-sm">Donate</span> button:</p>
  <div class="border rounded p-3 bg-light">
    <div class="donation-modal-preview-wrapper">
      <div class="donation-modal-preview-content ql-snow">
        <div class="donation-modal-preview-header">
          <h5 class="donation-modal-preview-title">Support Us</h5>
        </div>
        <div class="donation-modal-preview-body">
          <div id="{$prefix}preview-instructions" class="ql-editor">
            <p>Thank you for your support!</p>
          </div>

          <div id="{$prefix}preview-qr" style="display:none;" class="donation-qr">
            <img src="" alt="Donation Image" class="img-fluid">
          </div>

          <div id="{$prefix}preview-link" style="display:none;" class="donation-link">
            <p class="donation-link-label">
              <i class="preview-platform-icon bi bi-credit-card text-secondary"></i>
              <span class="preview-platform-name">Send payment:</span>
            </p>
            <code class="donation-link-code preview-link-text">username</code>
            <small class="donation-link-hint">Tap to copy • <a href="#" onclick="return false;">Open app</a></small>
          </div>

          <div id="{$prefix}preview-empty" class="text-muted fst-italic">
            Configure donation method, link, or image above to see preview
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
