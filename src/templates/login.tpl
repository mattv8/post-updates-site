<script src="https://www.google.com/recaptcha/api.js?render={$recaptcha_key}"></script>
{* Page Specific JS *}
{if file_exists('framework/js/login.min.js')}
    <script src="framework/js/login.min.js"></script>
{else}{* The following files get minified by CI/CD and are only referenced here for development *}
    <script src="framework/js/login.js"></script>
{/if}

<div class="card {$page_bg_color_class}">

    <div class="container">
        <div class="row justify-content-md-center">
            <div class="col col-lg-6 inset-1">
                <div class="card">
                    <div class="card-header text-center">
                        <i class="fa me-2 fa-user-lock"></i>{$msg_login}
                    </div>
                    <div class="card-body">

                        <div class="container-fluid px-2" id="auth-banner" style="display: none;">
                            <div class="row alert" role="alert">
                                <div class="col-auto me-auto my-1"></div>
                                <div class="col-auto my-1"><button class="fa fa-fw fa-remove inline-icon" id="banner-dismiss" onclick="fadeOutAfter(document.getElementById('auth-banner'),0,false,this)"></button></div>
                            </div>
                        </div>

                        <div class="input-group mb-3">
                            <span class="input-group-text"><i class="fa fa-fw fa-user"></i></span>
                            <input type="username" name="username" id="username" class="form-control" placeholder="{$msg_username}"{if $debug} value="admin"{/if}/>
                        </div>
                        <div class="input-group mb-3">
                            <span class="input-group-text"><i class="fa fa-fw fa-lock"></i></span>
                            <input type="password" name="password" id="password" class="form-control" placeholder="{$msg_password}"{if $debug} value="tacos"{/if}/>
                        </div>
                        <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                            <button type="submit" class="btn btn-primary col-md-auto" onclick="reCaptcha(this, login)"><i class="fa me-2 fa-check-circle"></i>{$msg_submit}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

</div>