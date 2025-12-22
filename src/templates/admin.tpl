<div class="container py-4" id="adminApp" data-csrf="{$csrf_token}" data-debug="{if $debug|default:false}1{else}0{/if}">
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
      <button class="nav-link" id="tab-footer" data-bs-toggle="tab" data-bs-target="#pane-footer" type="button" role="tab">Footer</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="tab-newsletter" data-bs-toggle="tab" data-bs-target="#pane-newsletter" type="button" role="tab">Newsletter</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="tab-media" data-bs-toggle="tab" data-bs-target="#pane-media" type="button" role="tab">Media</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="tab-branding" data-bs-toggle="tab" data-bs-target="#pane-branding" type="button" role="tab">Branding</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="tab-analytics" data-bs-toggle="tab" data-bs-target="#pane-analytics" type="button" role="tab">Analytics</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="tab-settings" data-bs-toggle="tab" data-bs-target="#pane-settings" type="button" role="tab">AI Settings</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="tab-caching" data-bs-toggle="tab" data-bs-target="#pane-caching" type="button" role="tab">Caching</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="tab-backup" data-bs-toggle="tab" data-bs-target="#pane-backup" type="button" role="tab">Backup</button>
    </li>
  </ul>

  <div class="tab-content border border-top-0 p-3 bg-white" id="adminTabContent" style="visibility: hidden;">
    <div class="tab-pane fade" id="pane-posts" role="tabpanel">
      <div class="d-flex justify-content-between align-items-center mt-3">
        <h5 class="mb-0">Posts</h5>
        <div class="d-flex align-items-center gap-3">
          <div class="form-check form-switch" title="Toggle visibility of draft post previews in the timeline">
            <input class="form-check-input" type="checkbox" id="hideDraftPreviews">
            <label class="form-check-label small text-muted" for="hideDraftPreviews">
              Hide draft previews in timeline
            </label>
          </div>
          <button class="btn btn-sm btn-success" id="btnNewPost" data-bs-toggle="modal" data-bs-target="#postEditorModal">New Post</button>
        </div>
      </div>
      <div id="postsList" class="mt-3"></div>
    </div>

    <div class="tab-pane fade" id="pane-hero" role="tabpanel">
      <form id="heroForm" class="mt-3">
        {include file='templates/partials/hero_form.tpl'}
        <button type="submit" class="btn btn-primary mt-3">Save</button>
      </form>
    </div>

    {* Media Crop UI *}
    <div id="mediaCropContainer" class="mt-3" style="display: none;">
      <label class="form-label">Crop Image</label>
      <div class="border rounded p-2 bg-light" style="max-height: 500px; overflow: auto;">
        <img id="mediaCropImage" src="" style="max-width: 100%; display: block;" />
      </div>
      <div class="mt-2">
        <button type="button" class="btn btn-sm btn-outline-secondary" id="mediaAutoDetect">
          <i class="bi bi-magic"></i> Auto-Detect Bounds
        </button>
        <button type="button" class="btn btn-sm btn-outline-secondary" id="mediaRotateLeft" title="Rotate Left">
          <i class="bi bi-arrow-counterclockwise"></i>
        </button>
        <button type="button" class="btn btn-sm btn-outline-secondary" id="mediaRotateRight" title="Rotate Right">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
        <button type="button" class="btn btn-sm btn-primary" id="mediaUploadBtn">
          <i class="bi bi-upload"></i> Upload & Apply
        </button>
        <button type="button" class="btn btn-sm btn-secondary" id="mediaCancelBtn">Cancel</button>
      </div>
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

    <div class="tab-pane fade" id="pane-footer" role="tabpanel">
      <form id="footerForm" class="mt-3">
        {include file='templates/partials/footer_form.tpl'}
        <button type="submit" class="btn btn-primary mt-3">Save Footer</button>
      </form>
    </div>

    <div class="tab-pane fade" id="pane-newsletter" role="tabpanel">
      <div class="mt-3">
        <div class="mb-4">
          <div class="form-check form-switch mb-2">
            <input class="form-check-input" type="checkbox" id="show_mailing_list" />
            <label class="form-check-label" for="show_mailing_list">
              <strong>Show mailing list section on home page</strong>
            </label>
          </div>
          <small class="text-muted d-block mb-3">Toggle visibility of the newsletter signup section</small>

          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="newsletter_position_toggle" />
            <label class="form-check-label" for="newsletter_position_toggle">
              <strong>Display newsletter above post timeline</strong>
            </label>
          </div>
          <small class="text-muted d-block mb-2">Show newsletter signup above posts instead of in the sidebar</small>

          <div class="ms-4 mt-2 d-none" id="newsletter_position_scope_wrapper">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="newsletter_position_scope_toggle" />
              <label class="form-check-label" for="newsletter_position_scope_toggle">
                <strong>Apply to desktop as well</strong>
              </label>
            </div>
            <small class="text-muted">When off, only mobile devices will see the newsletter above the timeline. Desktop will keep it in the sidebar.</small>
          </div>
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
            <h6 class="mb-3">SMTP Configuration</h6>
            {if $debug|default:false}
              <div class="form-check form-switch mb-3" id="smtpMailpitToggleRow">
                <input class="form-check-input" type="checkbox" id="smtp_mailpit_toggle" checked>
                <label class="form-check-label" for="smtp_mailpit_toggle">
                  Use Mailpit (dev override)
                </label>
                <div class="text-muted small">When enabled, SMTP settings are forced to Mailpit (host: mailpit, port: 1025, no auth).</div>
              </div>
            {/if}
            <div class="row mb-4">
              <div class="col-md-6">
                <div class="mb-3">
                  <label for="smtp_host" class="form-label"><strong>SMTP Host</strong></label>
                  <input type="text" class="form-control" id="smtp_host" placeholder="smtp.example.com" />
                  <small class="text-muted">SMTP server hostname or IP address</small>
                </div>

                <div class="mb-3">
                  <label for="smtp_port" class="form-label"><strong>SMTP Port</strong></label>
                  <input type="number" class="form-control" id="smtp_port" min="1" max="65535" placeholder="587" />
                  <small class="text-muted">Common ports: 25 (unencrypted), 587 (TLS), 465 (SSL)</small>
                </div>

                <div class="mb-3">
                  <label for="smtp_secure" class="form-label"><strong>Encryption</strong></label>
                  <select class="form-select" id="smtp_secure">
                    <option value="none">None</option>
                    <option value="tls">TLS (STARTTLS)</option>
                    <option value="ssl">SSL</option>
                  </select>
                  <small class="text-muted">Use TLS for port 587, SSL for port 465</small>
                </div>

                <div class="mb-3">
                  <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="smtp_auth" />
                    <label class="form-check-label" for="smtp_auth">
                      <strong>Enable SMTP Authentication</strong>
                    </label>
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <div class="mb-3">
                  <label for="smtp_username" class="form-label"><strong>SMTP Username</strong></label>
                  <input type="text" class="form-control" id="smtp_username" placeholder="username or email" autocomplete="off" />
                  <small class="text-muted">Username for SMTP authentication</small>
                </div>

                <div class="mb-3">
                  <label for="smtp_password" class="form-label"><strong>SMTP Password</strong></label>
                  <input type="password" class="form-control" id="smtp_password" autocomplete="new-password" />
                  <small class="text-muted">Password for SMTP authentication</small>
                </div>

                <div class="mb-3">
                  <label for="smtp_from_email" class="form-label"><strong>From Email Address</strong></label>
                  <input type="email" class="form-control" id="smtp_from_email" placeholder="noreply@example.com" />
                  <small class="text-muted">Email address used in the "From" field</small>
                </div>

                <div class="mb-3">
                  <label for="smtp_from_name" class="form-label"><strong>From Name</strong></label>
                  <input type="text" class="form-control" id="smtp_from_name" placeholder="Post Portal" />
                  <small class="text-muted">Display name used in the "From" field</small>
                </div>
              </div>
            </div>

            <div class="mb-4">
              <button type="button" class="btn btn-primary" id="smtp_save_config">
                <i class="bi bi-save"></i> Save SMTP Configuration
              </button>
              <button type="button" class="btn btn-outline-secondary" id="smtp_test_connection">
                <i class="bi bi-lightning"></i> Test Connection
              </button>
              <button type="button" class="btn btn-outline-primary" id="smtp_send_test">
                <i class="bi bi-envelope"></i> Send Test Email
              </button>
            </div>

            <div id="smtp_test_result" class="d-none mb-4"></div>

            <hr class="my-4" />

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

    <div class="tab-pane fade" id="pane-branding" role="tabpanel">
      <div class="mt-3">
        <h5 class="mb-3">Site Branding</h5>
        <div class="alert alert-info mt-3">
          <i class="bi bi-info-circle"></i>
          <strong>Note:</strong> After uploading a new logo or favicon, you may need to refresh the page to see the changes in the site header.
        </div>

        {* Site Title *}
        <div class="mb-3">
          <label class="form-label"><strong>Site Title</strong></label>
          <input type="text" id="site_title" class="form-control" />
          <div class="form-text">The title displayed in the browser tab and site header</div>
        </div>

        <hr>

        {* Logo Section *}
        <h6 class="mb-3">Site Logo</h6>
        <div class="row">
          <div class="col-md-6">
            <div class="mb-3">
              <label class="form-label"><strong>Upload Logo</strong></label>
              <input type="file" class="form-control" id="logoFile" accept="image/*" />
              <div class="form-text">Upload a logo image. You can crop it after upload. Recommended: PNG with transparent background.</div>
            </div>

            {* Logo Display Toggle *}
            <div class="mb-3 form-check form-switch">
              <input class="form-check-input" type="checkbox" id="showLogoToggle" {if $settings.show_logo}checked{/if}>
              <label class="form-check-label" for="showLogoToggle">
                <strong>Display Logo Site-Wide</strong>
              </label>
              <div class="form-text">When enabled, the logo will appear in the site header. When disabled, only the site title will be shown.</div>
            </div>

            <div id="logoCropContainer" class="mb-3" style="display: none;">
              <label class="form-label">Crop Logo</label>
              <div class="border rounded p-2 bg-light" style="max-height: 500px; overflow: auto;">
                <img id="logoCropImage" src="" style="max-width: 100%; display: block;" />
              </div>
              <div class="mt-2">
                <button type="button" class="btn btn-sm btn-outline-secondary" id="logoAutoDetect">
                  <i class="bi bi-magic"></i> Auto-Detect Bounds
                </button>
                <button type="button" class="btn btn-sm btn-outline-secondary" id="logoRotateLeft" title="Rotate Left">
                  <i class="bi bi-arrow-counterclockwise"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-secondary" id="logoRotateRight" title="Rotate Right">
                  <i class="bi bi-arrow-clockwise"></i>
                </button>
                <button type="button" class="btn btn-sm btn-primary" id="logoUploadBtn">
                  <i class="bi bi-upload"></i> Upload & Apply
                </button>
                <button type="button" class="btn btn-sm btn-secondary" id="logoCancelBtn">Cancel</button>
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="mb-3">
              <label class="form-label"><strong>Current Logo</strong></label>
              <div id="logoPreview" class="border rounded p-3 bg-light text-center" style="min-height: 120px;">
                <div class="text-muted">No logo uploaded</div>
              </div>
              <div class="mt-2" id="logoActions" style="display: none;">
                <button type="button" class="btn btn-sm btn-danger" id="logoRemoveBtn">
                  <i class="bi bi-trash"></i> Remove Logo
                </button>
              </div>
            </div>
          </div>
        </div>

        <hr>

        {* Favicon Section *}
        <h6 class="mb-3">Site Favicon</h6>
        <div class="row">
          <div class="col-md-6">
            <div class="mb-3">
              <label class="form-label"><strong>Upload Favicon</strong></label>
              <input type="file" class="form-control" id="faviconFile" accept="image/*" />
              <div class="form-text">Upload a square image for your favicon. It will be automatically cropped to 1:1 aspect ratio and resized to multiple sizes.</div>
            </div>

            <div id="faviconCropContainer" class="mb-3" style="display: none;">
              <label class="form-label">Crop Favicon (1:1 Aspect Ratio)</label>
              <div class="border rounded p-2 bg-light" style="max-height: 500px; overflow: auto;">
                <img id="faviconCropImage" src="" style="max-width: 100%; display: block;" />
              </div>
              <div class="mt-2">
                <button type="button" class="btn btn-sm btn-outline-secondary" id="faviconAutoDetect">
                  <i class="bi bi-magic"></i> Auto-Detect Bounds
                </button>
                <button type="button" class="btn btn-sm btn-outline-secondary" id="faviconRotateLeft" title="Rotate Left">
                  <i class="bi bi-arrow-counterclockwise"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-secondary" id="faviconRotateRight" title="Rotate Right">
                  <i class="bi bi-arrow-clockwise"></i>
                </button>
                <button type="button" class="btn btn-sm btn-primary" id="faviconUploadBtn">
                  <i class="bi bi-upload"></i> Upload & Apply
                </button>
                <button type="button" class="btn btn-sm btn-secondary" id="faviconCancelBtn">Cancel</button>
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="mb-3">
              <label class="form-label"><strong>Current Favicon</strong></label>
              <div id="faviconPreview" class="border rounded p-3 bg-light text-center" style="min-height: 120px;">
                <div class="text-muted">No favicon uploaded</div>
              </div>
              <div class="mt-2" id="faviconActions" style="display: none;">
                <button type="button" class="btn btn-sm btn-danger" id="faviconRemoveBtn">
                  <i class="bi bi-trash"></i> Remove Favicon
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <div class="tab-pane fade" id="pane-analytics" role="tabpanel">
      <div class="mt-3">
        <h5 class="mb-3">View & Impression Tracking</h5>
        <div class="alert alert-info">
          <i class="bi bi-info-circle"></i>
          <strong>How tracking works:</strong>
          <ul class="mb-0 mt-2">
            <li>A <strong>view</strong> requires some level of <em>active consumption</em>. In this case, a user must open a post for a view to be counted.</li>
            <li>An <strong>impression</strong> is a <em>load event</em>. An impression is counted when the post appears on someone's screen, even if they don't actually look at it or interact with it.</li>
          </ul>
        </div>
        <div class="mb-3 form-check form-switch">
          <input class="form-check-input" type="checkbox" id="ignore_admin_tracking" />
          <label class="form-check-label" for="ignore_admin_tracking">
            <strong>Don't track admin views & impressions</strong>
          </label>
          <div class="form-text">When enabled, logged-in admin activity won't be counted in view/impression stats.</div>
        </div>
        <hr>
        <div class="mb-3 form-check form-switch">
          <input class="form-check-input" type="checkbox" id="show_view_counts" />
          <label class="form-check-label" for="show_view_counts">
            <strong>Show view counts publicly</strong>
          </label>
          <div class="form-text">Display view counts (total and unique) on post cards and overlays.</div>
        </div>
        <div class="mb-3 form-check form-switch">
          <input class="form-check-input" type="checkbox" id="show_impression_counts" />
          <label class="form-check-label" for="show_impression_counts">
            <strong>Show impression counts publicly</strong>
          </label>
          <div class="form-text">Display impression counts (total and unique) on post cards and overlays.</div>
        </div>
      </div>
    </div>

    <div class="tab-pane fade" id="pane-settings" role="tabpanel">
      <form id="settingsForm" class="mt-3">
        <h5 class="mb-4">AI Settings</h5>
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

    <div class="tab-pane fade" id="pane-caching" role="tabpanel">
      <h5 class="mb-4 mt-3">Page Cache</h5>
      <div class="alert alert-info">
        <i class="bi bi-info-circle"></i>
        Clears the server-side page cache. Use this if visitors are seeing stale content after publishing changes.
        The cache automatically clears when you publish posts or settings.
      </div>
      <div class="mb-3">
        <div>
          <button type="button" class="btn btn-outline-warning" id="btnPurgeCache">
            <i class="bi bi-trash"></i> Purge Cache
          </button>
          <span id="cacheStatus" class="ms-2 text-muted small"
            {if $settings.last_cache_purge}data-last-purge="{$settings.last_cache_purge}"{/if}>
            {if $settings.last_cache_purge}
              Last purged: <span id="lastPurgeTime">{$settings.last_cache_purge}</span>
            {else}
              Never purged
            {/if}
          </span>
        </div>
      </div>
    </div>

    <div class="tab-pane fade" id="pane-backup" role="tabpanel">
      <h5 class="mb-4 mt-3">Backup &amp; Restore</h5>

      {* Backup Section *}
      <h6 class="mb-3"><i class="bi bi-download me-2"></i>Create Backup</h6>
      <p class="text-muted mb-3">
        Download a complete backup of your site including the database and all uploaded media.
        The backup is compressed as a <code>.tar.gz</code> archive.
      </p>
      <div class="mb-4">
        <button type="button" class="btn btn-primary" id="btnCreateBackup">
          <i class="bi bi-cloud-download"></i> Download Backup
        </button>
        <span id="backupStatus" class="ms-2 text-muted small"></span>
      </div>

      {* Restore Section *}
      <h6 class="mb-3"><i class="bi bi-upload me-2"></i>Restore from Backup</h6>
      <div class="alert alert-warning mb-3">
        <i class="bi bi-exclamation-triangle-fill me-1"></i>
        <strong>Warning:</strong> Restoring a backup will replace all current data including posts, media, and settings.
        This action cannot be undone.
      </div>
      <div class="mb-3">
        <label for="restoreFile" class="form-label">Select backup file</label>
        <input type="file" class="form-control" id="restoreFile" accept=".tar.gz,.tgz">
        <div class="form-text">Upload a <code>.tar.gz</code> backup file created by this system.</div>
      </div>
      <div class="mb-3">
        <button type="button" class="btn btn-danger" id="btnRestoreBackup" disabled>
          <i class="bi bi-cloud-upload"></i> Restore Backup
        </button>
        <span id="restoreStatus" class="ms-2 text-muted small"></span>
      </div>
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
            <input type="email" class="form-control" id="newSubscriberEmail" required pattern="[^\s@]+@[^\s@]+\.[^\s@]+" maxlength="255" />
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

{* Restore Backup Confirmation Modal *}
<div class="modal fade" id="restoreBackupModal" tabindex="-1" aria-labelledby="restoreBackupModalLabel" aria-hidden="true" data-bs-focus="false">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header bg-danger text-white">
        <h5 class="modal-title" id="restoreBackupModalLabel"><i class="bi bi-exclamation-triangle-fill me-2"></i>Confirm Restore</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p>Are you sure you want to restore from this backup?</p>
        <p class="fw-bold mb-2" id="restoreBackupFilename"></p>
        <div class="alert alert-danger mb-0">
          <i class="bi bi-exclamation-circle-fill me-1"></i>
          This will <strong>permanently replace</strong> all current data including posts, media, and settings. This action cannot be undone.
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-danger" id="confirmRestoreBackup"><i class="bi bi-cloud-upload me-1"></i>Yes, Restore Backup</button>
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

{* Publish Confirmation Modal *}
{include file='templates/partials/publish_confirmation_modal.tpl'}
{include file='templates/partials/unpublish_confirmation_modal.tpl'}

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

{* Resend Email Confirmation Modal *}
<div class="modal fade" id="resendEmailModal" tabindex="-1" aria-labelledby="resendEmailModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="resendEmailModalLabel">Resend to All Subscribers</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p>Are you sure you want to resend email notifications for this post to <strong>all active subscribers</strong>?</p>
        <p class="text-muted small mb-0">This sends to everyone again, including subscribers who already received the previous notification.</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary" id="confirmResendEmail">Resend to All</button>
      </div>
    </div>
  </div>
</div>

{* Logo Remove Confirmation Modal *}
<div class="modal fade" id="removeLogoModal" tabindex="-1" aria-labelledby="removeLogoModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="removeLogoModalLabel">Remove Logo</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p>Are you sure you want to remove the site logo?</p>
        <p class="text-muted small mb-0">The logo will no longer appear in the site header. You can upload a new logo at any time.</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-danger" id="confirmRemoveLogo">Remove Logo</button>
      </div>
    </div>
  </div>
</div>

{* Favicon Remove Confirmation Modal *}
<div class="modal fade" id="removeFaviconModal" tabindex="-1" aria-labelledby="removeFaviconModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="removeFaviconModalLabel">Remove Favicon</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p>Are you sure you want to remove the custom favicon?</p>
        <p class="text-muted small mb-0">The default favicon will be used instead. You can upload a new favicon at any time.</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-danger" id="confirmRemoveFavicon">Remove Favicon</button>
      </div>
    </div>
  </div>
</div>

{* Cropper.js for logo/favicon cropping *}
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js"></script>

{* User Management Modal *}
{include file='templates/modals/user_management.tpl'}

<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
<script src="/js/image-crop-manager.js"></script>
<script src="/js/admin-crop-init.js"></script>
<script src="/js/publish-confirmation.js"></script>
<script src="/js/unpublish-confirmation.js"></script>
<script src="/js/post-draft-handler.js"></script>
<script src="/js/branding.js"></script>
<script src="/js/admin.js"></script>
<script src="/js/newsletter-admin.js"></script>