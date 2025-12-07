<!DOCTYPE html>
<html lang="en">

<head>
  <title>{if $settings.site_title}{$settings.site_title|escape}{else}Post Portal{/if}</title>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  {if $authenticated and $csrf_token}
  <meta name="csrf-token" content="{$csrf_token}" />
  {/if}

  <link rel="stylesheet" type="text/css" href="framework/vendor/bootstrap5/css/bootstrap.min.css" />
  <link rel="stylesheet" type="text/css" href="framework/vendor/font-awesome/css/all.min.css" />
  <link rel="stylesheet" type="text/css" href="framework/css/portal.css" />

  <script>
    "use strict";
    window.GLOBAL = {};
    GLOBAL.config = {$js_config|@json_encode nofilter};
    GLOBAL.config.authenticated = {if $authenticated}true{else}false{/if};
    GLOBAL.config.isAdmin = {if $isadmin}true{else}false{/if};
    GLOBAL.config.currentUser = {if $currentUser}"{$currentUser|escape:'javascript'}"{else}null{/if};
  </script>

  <script src="framework/vendor/jquery/js/jquery-3.6.1.min.js"></script>
  <script src="framework/vendor/bootstrap5/js/bootstrap.bundle.min.js"></script>
  <script src="framework/js/functions.js"></script>

  {* Custom header includes *}
  {if file_exists("templates/header.tpl")}
    {include file="templates/header.tpl"}
  {/if}

  {* Favicon - use dynamic favicon from branding settings or default *}
  {if $favicon_ico}
    <link href="{$favicon_ico}" rel="icon" type="image/x-icon" />
    <link href="{$favicon_ico}" rel="shortcut icon" />
  {/if}
  {if $favicon_16}
    <link href="{$favicon_16}" rel="icon" type="image/png" sizes="16x16" />
  {/if}
  {if $favicon_32}
    <link href="{$favicon_32}" rel="icon" type="image/png" sizes="32x32" />
  {/if}
  {if $favicon_192}
    <link href="{$favicon_192}" rel="icon" type="image/png" sizes="192x192" />
  {/if}
  {if $favicon_512}
    <link href="{$favicon_512}" rel="icon" type="image/png" sizes="512x512" />
  {/if}
  {if $favicon_svg}
    <link href="{$favicon_svg}" rel="icon" type="image/svg+xml" />
  {/if}
</head>

<body>

  {* Login page - use framework default *}
  {if $page eq 'login'}
    {if file_exists("templates/login.tpl")}
      {include file="templates/login.tpl"}
    {else if file_exists("framework/tpl/login.tpl")}
      {include file="framework/tpl/login.tpl"}
    {/if}

  {* For public pages, use minimal layout *}
  {else if $page|in_array:$public_pages and not $authenticated}

    {* Simple public navigation for unauthenticated users *}
    <nav class="navbar navbar-light bg-white shadow-sm">
      <div class="container d-flex align-items-center">
        <a class="navbar-brand fw-bold fs-4 m-0 py-2 d-flex align-items-center" id="navbar-brand-public" href="?page=home">
          {if $settings.show_logo && $logo_url}
            {if $logo_srcset_png && $logo_srcset_webp}
              {* Custom uploaded logo with responsive variants *}
              <picture>
                <source type="image/webp" srcset="{$logo_srcset_webp}" />
                <img src="{$logo_url}" srcset="{$logo_srcset_png}" alt="Logo" style="max-height: 40px; width: auto;" class="me-2" />
              </picture>
            {else}
              {* Default logo or simple image *}
              <img src="{$logo_url}" alt="Logo" style="max-height: 40px; width: auto;" class="me-2" />
            {/if}
          {/if}
          {if $settings.site_title}
            <span>{$settings.site_title|escape}</span>
          {else}
            <span>Post Portal</span>
          {/if}
        </a>
        <div>
          <a href="?page=login" class="btn btn-sm btn-outline-primary">Admin Login</a>
        </div>
      </div>
    </nav>

    {* Public page content *}
    {if $error or $page eq 'error'}
      <div class="container mt-4">
        <div class="alert alert-danger">
          <i class="fa fa-fw fa-exclamation-circle"></i> {$error}
        </div>
      </div>
    {else}
      {if file_exists("templates/$page.tpl")}
        {include file="templates/$page.tpl"}
      {else if file_exists("framework/tpl/$page.tpl")}
        {include file="framework/tpl/$page.tpl"}
      {else}
        <div class="container mt-4">
          <div class="alert alert-danger">
            <i class="fa fa-fw fa-exclamation-circle"></i> Page not found: {$page}
          </div>
        </div>
      {/if}
    {/if}

  {else if $page|in_array:$public_pages and $authenticated}

    {* Public page with authenticated menu *}
    <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
      <div class="container-fluid d-flex align-items-center">
        <a class="navbar-brand fw-bold fs-4 m-0 py-2 d-flex align-items-center" id="navbar-brand-public-auth" href="?page=home">
          {if $settings.show_logo && $logo_url}
            {if $logo_srcset_png && $logo_srcset_webp}
              {* Custom uploaded logo with responsive variants *}
              <picture>
                <source type="image/webp" srcset="{$logo_srcset_webp}" />
                <img src="{$logo_url}" srcset="{$logo_srcset_png}" alt="Logo" style="max-height: 40px; width: auto;" class="me-2" />
              </picture>
            {else}
              {* Default logo or simple image *}
              <img src="{$logo_url}" alt="Logo" style="max-height: 40px; width: auto;" class="me-2" />
            {/if}
          {/if}
          {if $settings.site_title}
            <span>{$settings.site_title|escape}</span>
          {else}
            <span>Post Portal</span>
          {/if}
        </a>

        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav ms-auto">
            <li class="nav-item">
              <a class="nav-link" href="?page=admin">
                <i class="fa fa-fw fa-cog"></i> Admin Dashboard
              </a>
            </li>
            <li class="nav-item">
              <button class="nav-link btn btn-link" data-bs-toggle="modal" data-bs-target="#createPostModal">
                <i class="fa fa-fw fa-plus"></i> Create Post
              </button>
            </li>
            <li class="nav-item">
              <button class="nav-link btn btn-link" onclick="logoff()">
                <i class="fa fa-fw fa-sign-out"></i> Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    {* Public page content *}
    {if $error or $page eq 'error'}
      <div class="container mt-4">
        <div class="alert alert-danger">
          <i class="fa fa-fw fa-exclamation-circle"></i> {$error}
        </div>
      </div>
    {else}
      {if file_exists("templates/$page.tpl")}
        {include file="templates/$page.tpl"}
      {else if file_exists("framework/tpl/$page.tpl")}
        {include file="framework/tpl/$page.tpl"}
      {else}
        <div class="container mt-4">
          <div class="alert alert-danger">
            <i class="fa fa-fw fa-exclamation-circle"></i> Page not found: {$page}
          </div>
        </div>
      {/if}
    {/if}

    {* Include Create Post modal for authenticated users *}
    {include file='templates/modals/create_post.tpl'}

    {* Cropper.js for image cropping *}
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.css" />
    <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js"></script>
    <script src="/js/image-crop-manager.js"></script>
    <script src="/js/post-modal.js"></script>  {else}
    {* Authenticated/Admin layout - use framework structure *}
    <div class="container-fluid inset-3">
      <div class="panel panel-success {$page_bg_color_class}">

        {if file_exists("templates/menu.tpl")}
          {include file="templates/menu.tpl"}
        {else}
          {include file="framework/tpl/menu.tpl"}
        {/if}

        <div class="container-fluid px-0" id="page-content">
          {if $error or $page eq 'error'}
            <div class="alert alert-danger">
              <i class="fa fa-fw fa-exclamation-circle"></i> {$error}
            </div>
          {else}
            {if file_exists("templates/$page.tpl")}
              {include file="templates/$page.tpl"}
            {else if file_exists("framework/tpl/$page.tpl")}
              {include file="framework/tpl/$page.tpl"}
            {else}
              <div class="alert alert-danger">
                <i class="fa fa-fw fa-exclamation-circle"></i> Page not found: {$page}
              </div>
            {/if}
          {/if}
        </div>

      </div>
    </div>

    {* Include framework modals for nav buttons *}
    {if file_exists("framework/tpl/modals/modal.navbuttons.tpl")}
      {include file="framework/tpl/modals/modal.navbuttons.tpl"}
    {/if}
  {/if}

</body>
</html>
