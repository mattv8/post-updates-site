{* Mailing List Form - Reusable partial for both admin page and modal *}
{* Parameters: idPrefix (optional, for unique IDs) *}
{assign var="prefix" value=$idPrefix|default:""}
<div class="mb-3 form-check form-switch">
  <input class="form-check-input" type="checkbox" id="{$prefix}show_mailing_list" />
  <label class="form-check-label" for="{$prefix}show_mailing_list">
    <strong>Show Mailing List section in sidebar</strong>
  </label>
</div>
<hr class="mb-3" />
<div class="mb-3">
  <div class="d-flex justify-content-between align-items-center mb-2">
    <label class="form-label mb-0">Mailing List Section</label>
    <small class="editor-autosave-indicator" id="{$prefix}mailing-list-autosave-status"></small>
  </div>
  <small class="text-muted d-block mb-2">This content appears above the email signup form in the sidebar</small>
  <div id="{$prefix}mailing_list_html" class="form-control"></div>
</div>
<hr class="mb-3" />
<h6 class="mb-3">Email Notification Settings</h6>
<div class="mb-3 form-check form-switch">
  <input class="form-check-input" type="checkbox" id="{$prefix}notify_subscribers_on_post" />
  <label class="form-check-label" for="{$prefix}notify_subscribers_on_post">
    <strong>Send email notifications to subscribers</strong>
    <br><small class="text-muted">When enabled, subscribers receive an email when you publish a new post for the first time</small>
  </label>
</div>
<div class="mb-3 form-check form-switch">
  <input class="form-check-input" type="checkbox" id="{$prefix}email_include_post_body" />
  <label class="form-check-label" for="{$prefix}email_include_post_body">
    <strong>Include full post content in email</strong>
    <br><small class="text-muted">When enabled, the formatted post body is included in the email. When disabled, only a summary and link to the post is sent</small>
  </label>
</div>
