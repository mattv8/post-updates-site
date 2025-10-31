<div class="container py-4" id="adminApp" data-csrf="{$csrf_token}">
  <h1 class="mb-4">Site Admin</h1>

  <ul class="nav nav-tabs" id="adminTabs" role="tablist">
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="tab-posts" data-bs-toggle="tab" data-bs-target="#pane-posts" type="button" role="tab">Posts</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="tab-hero" data-bs-toggle="tab" data-bs-target="#pane-hero" type="button" role="tab">Hero Banner</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="tab-about" data-bs-toggle="tab" data-bs-target="#pane-about" type="button" role="tab">About</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="tab-donation" data-bs-toggle="tab" data-bs-target="#pane-donation" type="button" role="tab">Donation</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="tab-newsletter" data-bs-toggle="tab" data-bs-target="#pane-newsletter" type="button" role="tab">Newsletter</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="tab-media" data-bs-toggle="tab" data-bs-target="#pane-media" type="button" role="tab">Media</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="tab-settings" data-bs-toggle="tab" data-bs-target="#pane-settings" type="button" role="tab">Settings</button>
    </li>
  </ul>

  <div class="tab-content border border-top-0 p-3 bg-white" id="adminTabContent" style="visibility: hidden;">
    <div class="tab-pane fade" id="pane-posts" role="tabpanel">
      <div class="d-flex justify-content-between align-items-center mt-3">
        <h5 class="mb-0">Posts</h5>
        <button class="btn btn-sm btn-success" id="btnNewPost" data-bs-toggle="modal" data-bs-target="#postEditorModal">New Post</button>
      </div>
      <div id="postsList" class="mt-3"></div>
    </div>

    <div class="tab-pane fade" id="pane-hero" role="tabpanel">
      <form id="heroForm" class="mt-3">
        {include file='templates/partials/hero_form.tpl'}
        <button type="submit" class="btn btn-primary mt-3">Save</button>
      </form>
    </div>

    <div class="tab-pane fade" id="pane-about" role="tabpanel">
      <form id="aboutForm" class="mt-3">
        {include file='templates/partials/about_form.tpl'}
        <button type="submit" class="btn btn-primary">Save About</button>
      </form>
    </div>

    <div class="tab-pane fade" id="pane-donation" role="tabpanel">
      <form id="donationForm" class="mt-3">
        {include file='templates/partials/donation_form.tpl'}
        <button type="submit" class="btn btn-primary">Save Donation</button>
      </form>
    </div>

    <div class="tab-pane fade" id="pane-newsletter" role="tabpanel">
      <div class="mt-3">
        <div class="mb-4">
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="show_mailing_list" />
            <label class="form-check-label" for="show_mailing_list">
              <strong>Show mailing list section on home page</strong>
            </label>
          </div>
          <small class="text-muted">Toggle visibility of the newsletter signup section in the sidebar</small>
        </div>

        <ul class="nav nav-pills mb-3" id="newsletterSubTabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" id="subtab-subscribers" data-bs-toggle="pill" data-bs-target="#subpane-subscribers" type="button" role="tab">Subscribers</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="subtab-email-settings" data-bs-toggle="pill" data-bs-target="#subpane-email-settings" type="button" role="tab">Email Settings</button>
          </li>
        </ul>

        <div class="tab-content" id="newsletterSubTabContent">
          <div class="tab-pane fade show active" id="subpane-subscribers" role="tabpanel">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h5 class="mb-0">Newsletter Subscribers</h5>
              <div>
                <button class="btn btn-sm btn-outline-secondary me-2" id="btnRefreshSubscribers">
                  <i class="bi bi-arrow-clockwise"></i> Refresh
                </button>
                <button class="btn btn-sm btn-success" id="btnAddSubscriber">
                  <i class="bi bi-plus-circle"></i> Add Subscriber
                </button>
              </div>
            </div>

            <div class="mb-3">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="showArchivedSubscribers" />
                <label class="form-check-label" for="showArchivedSubscribers">
                  Show archived subscribers
                </label>
              </div>
            </div>

            <div class="table-responsive">
              <table class="table table-hover align-middle" id="subscribersTable">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Subscribed At</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="subscribersList">
                  {if $active_subscriber_count > 0}
                    <tr>
                      <td colspan="4" class="text-center text-muted py-4">
                        <div class="spinner-border spinner-border-sm me-2" role="status">
                          <span class="visually-hidden">Loading...</span>
                        </div>
                        Loading subscribers...
                      </td>
                    </tr>
                  {else}
                    <tr>
                      <td colspan="4" class="text-center text-muted py-4">
                        <i class="bi bi-info-circle me-2"></i>
                        No active subscribers. Users can sign up via the mailing list section on the home page.
                      </td>
                    </tr>
                  {/if}
                </tbody>
              </table>
            </div>
          </div>

          <div class="tab-pane fade" id="subpane-email-settings" role="tabpanel">
            <h6 class="mb-3">Email Notification Settings</h6>

            <div class="d-flex flex-column flex-md-row gap-4 align-items-start">
              <div class="flex-fill">
                <h6 class="mb-3">SMTP Rate Limiting</h6>
                <small class="text-muted d-block mb-3">Configure rate limits to prevent overloading your mail relay. Changes are saved automatically when you leave a field.</small>

                <div class="mb-3">
                  <label for="smtp_rate_limit" class="form-label"><strong>Email Rate Limit</strong></label>
                  <div class="input-group">
                    <input type="number" class="form-control" id="smtp_rate_limit" min="0" max="1000" />
                    <span class="input-group-text" id="smtp_rate_limit_status" style="display: none;">
                      <i class="bi bi-check-circle text-success"></i>
                    </span>
                  </div>
                  <small class="text-muted">Maximum emails to send per period (0 = unlimited)</small>
                </div>

                <div class="mb-3">
                  <label for="smtp_rate_period" class="form-label"><strong>Rate Period (seconds)</strong></label>
                  <div class="input-group">
                    <input type="number" class="form-control" id="smtp_rate_period" min="1" max="86400" />
                    <span class="input-group-text" id="smtp_rate_period_status" style="display: none;">
                      <i class="bi bi-check-circle text-success"></i>
                    </span>
                  </div>
                  <small class="text-muted">Time period in seconds for rate limit (e.g., 60 for per minute)</small>
                </div>

                <div class="mb-3">
                  <label for="smtp_batch_delay" class="form-label"><strong>Batch Delay (seconds)</strong></label>
                  <div class="input-group">
                    <input type="number" class="form-control" id="smtp_batch_delay" min="0" max="60" step="0.1" />
                    <span class="input-group-text" id="smtp_batch_delay_status" style="display: none;">
                      <i class="bi bi-check-circle text-success"></i>
                    </span>
                  </div>
                  <small class="text-muted">Delay between individual emails (0 = no delay)</small>
                </div>
              </div>
              <div class="flex-fill">
                <h6 class="mb-3">Notification Options</h6>

                <div class="mb-3">
                  <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="notify_subscribers_on_post" />
                    <label class="form-check-label" for="notify_subscribers_on_post">
                      <strong>Send email notifications to subscribers</strong>
                    </label>
                  </div>
                  <small class="text-muted">When enabled, subscribers receive an email when you publish a new post for the first time</small>
                </div>

                <div class="mb-3">
                  <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="email_include_post_body" />
                    <label class="form-check-label" for="email_include_post_body">
                      <strong>Include full post content in email</strong>
                    </label>
                  </div>
                  <small class="text-muted">When enabled, the formatted post body is included in the email. When disabled, only a summary and link to the post is sent</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="tab-pane fade" id="pane-media" role="tabpanel">
      <form id="uploadForm" class="mt-3">
        <div class="row g-2">
          <div class="col-12 col-md-5">
            <input type="file" class="form-control" id="mediaFile" accept="image/*" />
          </div>
          <div class="col-12 col-md-4">
            <input type="text" class="form-control" id="mediaAlt" placeholder="Alt text" />
          </div>
          <div class="col-12 col-md-3">
            <button class="btn btn-primary w-100" type="submit">Upload</button>
          </div>
        </div>
      </form>
      <div id="mediaGrid" class="row row-cols-2 row-cols-md-4 g-2 mt-2"></div>
    </div>

    <div class="tab-pane fade" id="pane-settings" role="tabpanel">
      <form id="settingsForm" class="mt-3">
        <div class="mb-3">
          <label class="form-label">Site Title</label>
          <input type="text" id="site_title" class="form-control" />
        </div>
        <div class="mb-3">
          <label class="form-label">Donation Presets (comma-separated)</label>
          <input type="text" id="donation_presets" class="form-control" placeholder="10,25,50,100" />
        </div>
        <div class="mb-3">
          <label class="form-label d-flex justify-content-between align-items-center">
            <span>AI Title Generation System Prompt</span>
            <button type="button" class="btn btn-sm btn-outline-secondary" id="btnResetAIPrompt" data-default-prompt="{$default_ai_prompt|escape:'html'}">Reset to Default</button>
          </label>
          <textarea id="ai_system_prompt" class="form-control" rows="4" placeholder="Enter custom AI system prompt for title generation..."></textarea>
          <small class="form-text text-muted">
            This prompt guides the AI when generating post titles. It should instruct the AI on tone, length, and style.
          </small>
        </div>
        <button type="submit" class="btn btn-primary">Save Settings</button>
      </form>
    </div>
  </div>
</div>

{* Add Subscriber Modal *}
<div class="modal fade" id="addSubscriberModal" tabindex="-1" aria-labelledby="addSubscriberModalLabel" aria-hidden="true" data-bs-focus="false">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="addSubscriberModalLabel">Add Subscriber</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <form id="addSubscriberForm" class="needs-validation" novalidate>
          <div class="mb-3">
            <label for="newSubscriberEmail" class="form-label">Email Address</label>
            <input type="email" class="form-control" id="newSubscriberEmail" required pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{ldelim}2,{rdelim}$" maxlength="255" />
            <div class="invalid-feedback">
              Please enter a valid email address.
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary" id="confirmAddSubscriber">Add Subscriber</button>
      </div>
    </div>
  </div>
</div>

{* Delete Subscriber Confirmation Modal *}
<div class="modal fade" id="deleteSubscriberModal" tabindex="-1" aria-labelledby="deleteSubscriberModalLabel" aria-hidden="true" data-bs-focus="false">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="deleteSubscriberModalLabel">Confirm Archive</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p>Are you sure you want to archive this subscriber?</p>
        <p class="fw-bold mb-2" id="deleteSubscriberEmail"></p>
        <p class="text-muted small mb-0">This will mark the subscription as inactive. The subscriber can re-subscribe if needed.</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-danger" id="confirmDeleteSubscriber">Archive Subscriber</button>
      </div>
    </div>
  </div>
</div>

{* Reactivate Subscriber Confirmation Modal *}
<div class="modal fade" id="reactivateSubscriberModal" tabindex="-1" aria-labelledby="reactivateSubscriberModalLabel" aria-hidden="true" data-bs-focus="false">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="reactivateSubscriberModalLabel">Confirm Reactivation</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p>Are you sure you want to reactivate this subscriber?</p>
        <p class="fw-bold mb-2" id="reactivateSubscriberEmail"></p>
        <p class="text-muted small mb-0">This will restore the subscription to active status.</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-success" id="confirmReactivateSubscriber">Reactivate Subscriber</button>
      </div>
    </div>
  </div>
</div>

{* Post Editor Modal - Will be moved to body by JS *}
<div class="modal fade" id="postEditorModal" tabindex="-1" aria-labelledby="postEditorModalLabel" aria-hidden="true" data-bs-focus="false">
  <div class="modal-dialog modal-xl">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="postEditorModalLabel">Edit Post</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        {include file='templates/partials/post_editor.tpl'}
      </div>
    </div>
  </div>
</div>

{* Media Delete Confirmation Modal *}
<div class="modal fade" id="mediaDeleteModal" tabindex="-1" aria-labelledby="mediaDeleteModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="mediaDeleteModalLabel">Confirm Delete</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p id="mediaDeleteFilename" class="fw-bold mb-3"></p>
        <div id="mediaDeleteWarning" class="alert alert-warning d-none" role="alert">
          <strong>⚠️ WARNING:</strong> This image is currently used in the following:
          <ul id="mediaDeleteAffectedList" class="mt-2 mb-0"></ul>
          <p class="mt-2 mb-0 small">Deleting this image will remove it from these posts.</p>
        </div>
        <div id="mediaDeleteNoUsage" class="text-muted d-none">
          This image is not currently used in any posts.
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-danger" id="confirmMediaDelete">Delete Image</button>
      </div>
    </div>
  </div>
</div>

{* Post Delete Confirmation Modal *}
<div class="modal fade" id="deletePostModal" tabindex="-1" aria-labelledby="deletePostModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="deletePostModalLabel">Confirm Delete</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p>Are you sure you want to delete this post?</p>
        <p class="text-muted small mb-0">This action will archive the post and it will no longer be visible to visitors.</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-danger" id="confirmDeletePostAdmin">Delete Post</button>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
<script src="/js/admin.js"></script>
<script src="/js/newsletter-admin.js"></script>