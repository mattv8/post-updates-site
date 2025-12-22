{* User Management Modal *}
<style>
  /* Hide edit pencil icons by default, show on cell hover */
  #user-mgmt-table .edit-field-btn {
    opacity: 0;
    transition: opacity 0.15s ease-in-out;
  }
  #user-mgmt-table tbody td:hover .edit-field-btn {
    opacity: 1;
  }
</style>
<div class="modal fade" id="UserMgmtModal" tabindex="-1" aria-labelledby="UserMgmtModalLabel" aria-hidden="true" data-bs-focus="false">
  <div class="modal-dialog modal-xl modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="UserMgmtModalLabel"><i class="bi bi-people me-2"></i>User Management</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        {* Manage Existing Users *}
        <div class="card mb-4">
          <div class="card-header">
            <h6 class="mb-0"><i class="bi bi-person-lines-fill me-2"></i>Existing Users</h6>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover table-striped mb-0" id="user-mgmt-table">
                <thead class="table-light">
                  <tr>
                    <th scope="col" class="ps-3">#</th>
                    <th scope="col">Username</th>
                    <th scope="col">First Name</th>
                    <th scope="col">Last Name</th>
                    <th scope="col">Email</th>
                    <th scope="col" class="text-center">Admin</th>
                    <th scope="col" class="text-center">Active</th>
                    <th scope="col" class="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody id="user-mgmt-tbody">
                  <tr>
                    <td colspan="8" class="text-center text-muted py-4">
                      <i class="bi bi-hourglass-split me-2"></i>Loading users...
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {* Create New User *}
        <div class="card">
          <div class="card-header">
            <h6 class="mb-0"><i class="bi bi-person-plus me-2"></i>Create New User</h6>
          </div>
          <div class="card-body">
            <form id="createUserForm" class="needs-validation" novalidate>
              <div class="row g-3">
                <div class="col-md-6">
                  <label for="newUsername" class="form-label">Username <span class="text-danger">*</span></label>
                  <input type="text" class="form-control" id="newUsername" name="username" required maxlength="32" pattern="[a-zA-Z0-9_-]+" autocomplete="off" />
                  <div class="invalid-feedback">Username is required (letters, numbers, underscores, hyphens only)</div>
                </div>
                <div class="col-md-6">
                  <label for="newPassword" class="form-label">Password <span class="text-danger">*</span></label>
                  <div class="input-group">
                    <input type="password" class="form-control" id="newPassword" name="password" required minlength="8" autocomplete="new-password" />
                    <button class="btn btn-outline-secondary" type="button" id="generatePasswordBtn" title="Generate random password">
                      <i class="bi bi-shuffle"></i>
                    </button>
                    <button class="btn btn-outline-secondary" type="button" id="toggleNewPassword" title="Show/hide password">
                      <i class="bi bi-eye"></i>
                    </button>
                  </div>
                  <div class="form-text" id="passwordStrengthHint">Must be 8+ chars with uppercase, lowercase, and number</div>
                  <div class="invalid-feedback">Password must be 8+ characters with uppercase, lowercase, and number</div>
                </div>
                <div class="col-md-6">
                  <label for="newFirst" class="form-label">First Name</label>
                  <input type="text" class="form-control" id="newFirst" name="first" maxlength="32" />
                </div>
                <div class="col-md-6">
                  <label for="newLast" class="form-label">Last Name</label>
                  <input type="text" class="form-control" id="newLast" name="last" maxlength="32" />
                </div>
                <div class="col-md-6">
                  <label for="newEmail" class="form-label">Email</label>
                  <input type="email" class="form-control" id="newEmail" name="email" maxlength="32" />
                  <div class="invalid-feedback">Please enter a valid email address</div>
                </div>
                <div class="col-md-6 d-flex align-items-end gap-4">
                  <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="newIsAdmin" name="isadmin" />
                    <label class="form-check-label" for="newIsAdmin">Admin</label>
                  </div>
                  <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="newActive" name="active" checked />
                    <label class="form-check-label" for="newActive">Active</label>
                  </div>
                </div>
              </div>
              <div class="mt-4 d-flex justify-content-end gap-2">
                <button type="submit" class="btn btn-outline-secondary" title="Create user without sending welcome email">
                  <i class="bi bi-person-plus me-1"></i> Create
                </button>
                <button type="button" class="btn btn-success" id="createAndEmailBtn" title="Create user and send welcome email with login credentials">
                  <i class="bi bi-envelope-plus me-1"></i> Create & Send Welcome Email
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
      </div>
    </div>
  </div>
</div>

{* Delete User Confirmation Modal *}
<div class="modal fade" id="deleteUserModal" tabindex="-1" aria-labelledby="deleteUserModalLabel" aria-hidden="true" data-bs-focus="false">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header bg-danger text-white">
        <h5 class="modal-title" id="deleteUserModalLabel"><i class="bi bi-exclamation-triangle me-2"></i>Confirm Delete</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p>Are you sure you want to delete this user?</p>
        <p class="fw-bold mb-2" id="deleteUserUsername"></p>
        <div class="alert alert-danger mb-0">
          <i class="bi bi-exclamation-circle-fill me-1"></i>
          This action cannot be undone.
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-danger" id="confirmDeleteUser">
          <i class="bi bi-trash me-1"></i>Delete User
        </button>
      </div>
    </div>
  </div>
</div>

{if !$_bundle_mode}
<script defer src="{asset_js file='user-management.js'}"></script>
{/if}
