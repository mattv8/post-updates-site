{* Donation Form - Reusable partial for both admin page and modal *}
{* Parameters: idPrefix (optional, for unique IDs) *}
{assign var="prefix" value=$idPrefix|default:""}
<div class="mb-3 form-check form-switch">
  <input class="form-check-input" type="checkbox" id="{$prefix}show_donation" />
  <label class="form-check-label" for="{$prefix}show_donation">
    <strong>Show Donation section in sidebar</strong>
  </label>
</div>
<hr class="mb-3" />
<div class="mb-3">
  <div class="d-flex justify-content-between align-items-center mb-2">
    <label class="form-label mb-0">Donation Section Content</label>
    <small class="editor-autosave-indicator" id="{$prefix}donation-autosave-status"></small>
  </div>
  <small class="text-muted d-block mb-2">This content appears in the donation card in the sidebar</small>
  <textarea id="{$prefix}donate_text_html" class="form-control" rows="8"></textarea>
</div>
