{* About Form - Reusable partial for both admin page and modal *}
{* Parameters: idPrefix (optional, for unique IDs) *}
{assign var="prefix" value=$idPrefix|default:""}
<div class="mb-3 form-check form-switch">
  <input class="form-check-input" type="checkbox" id="{$prefix}show_about" />
  <label class="form-check-label" for="{$prefix}show_about">
    <strong>Show About section in sidebar</strong>
  </label>
</div>
<hr class="mb-3" />
<div class="mb-3">
  <div class="d-flex justify-content-between align-items-center mb-2">
    <label class="form-label mb-0">About Section</label>
    <small class="editor-autosave-indicator" id="{$prefix}about-autosave-status"></small>
  </div>
  <small class="text-muted d-block mb-2">This content appears in the sidebar on the home page</small>
  <div id="{$prefix}site_bio_html" class="form-control"></div>
</div>
