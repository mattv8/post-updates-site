<nav class="navbar navbar-expand-lg bg-transparent">

  <div class="container-fluid d-flex align-items-center">
    {* Logo/Brand display based on show_logo setting *}
    <a class="navbar-brand" id="navbar-brand-admin" href="index.php">
      {if $settings.show_logo && $logo_url}
        {if $logo_srcset_png && $logo_srcset_webp}
          {* Custom uploaded logo with responsive variants *}
          <picture>
            <source type="image/webp" srcset="{$logo_srcset_webp}" />
            <img src="{$logo_url}" srcset="{$logo_srcset_png}" alt="Logo" class="menu-logo img-responsive" style="max-height: 40px; width: auto;" />
          </picture>
        {else}
          {* Default logo or simple image *}
          <img src="{$logo_url}" alt="Logo" class="menu-logo img-responsive" style="max-height: 40px; width: auto;" />
        {/if}
      {else}
        {* Show site title when logo is disabled or not set *}
        {if $settings.site_title}{$settings.site_title|escape}{else}Post Portal{/if}
      {/if}
    </a>

    {* Navbar Collapse Button *}
    <button class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>

    {* Collapsable Menu Items *}
    <div class="container-fluid px-2 collapse navbar-collapse" id="navbarSupportedContent">

      {if ($auth_type neq "none" and $authenticated) and $isadmin  and not ($page eq 'home' or $page eq 'post')}
        {assign var=nav_buttons value=[
          'users' => [
            'title' => 'Users',
            'faclass' => 'user-plus',
            'btn_color' => 'secondary',
            'btn_type' => 'modal',
            'modalId' => 'UserMgmtModal',
            'modalFunction' => null,
          ],
          'home' => [
            'title' => 'View Site',
            'faclass' => 'house',
            'btn_color' => 'success',
            'btn_type' => 'page',
            'url' => '/',
          ],
        ]}

        <div class="col d-grid gap-2 d-md-flex">

          {* Nav Buttons *}
          {foreach from=$nav_buttons item=button key=btn_name}
            {if $button.btn_type == 'modal'}
              <button class="btn btn-{$button.btn_color} mb-1" id="{$btn_name}Button" onclick="openModal('{$button.modalId}', this{if isset($button.modalFunction) && $button.modalFunction}, {$button.modalFunction}{/if})"><i class="fa fa-fw fa-{$button.faclass} me-1"></i>{$button.title|@ucfirst}</button>
            {elseif $button.btn_type == 'pageSmooth'}
              <button class="btn btn-{$button.btn_color} mb-1" id="{$btn_name}Button" onclick="goToPage('{$btn_name}','page-content')"><i class="fa fa-fw fa-{$button.faclass} me-1"></i>{$button.title|@ucfirst}</button>
            {elseif $button.btn_type == 'page'}
              <button class="btn btn-{$button.btn_color} mb-1" id="{$btn_name}Button" onclick="window.location = '?page={$btn_name}'"><i class="fa fa-fw fa-{$button.faclass} me-1"></i>{$button.title|@ucfirst}</button>
            {/if}
          {/foreach}

        </div>
      {/if}

      {* Logout/Login Button*}
      {if $auth_type neq "none" and isset($authenticated) and $authenticated  and not ($page eq 'home' or $page eq 'post')}
        <div class="col d-grid gap-2 d-md-flex my-2 justify-content-lg-end">
          <button type="submit" class="btn btn-success" id="logoutButton" onclick="logoff()" title="Log off"><i class="fa fa-fw fa-sign-out"></i> {$msg_logout}</button>
        </div>
      {/if}

    </div>{* END Collapsable Menu Items *}

  </div>{* END container-fluid *}

</nav>{* END nav *}

{* Welcome Banner *}
{if ($auth_type neq "none" and $authenticated) and $page eq $default_page and not ($page eq 'home' or $page eq 'post')}
  <div class="container-fluid inset-1" id="welcome-banner">
    <div class="row alert alert-success" role="alert">
      <div class="col-auto me-auto my-1"><i class="fa fa-fw fa-info-circle"></i> Welcome, {$displayname}.</div>
      <div class="col-auto ms-auto my-1">
        <p class="text-right mb-0">{if $isadmin} You have admin privileges.{/if}</p>
      </div>
      <div class="col-auto my-1"><button class="fa fa-fw fa-remove inline-icon" id="banner-dismiss" onclick="fadeOutAfter(document.getElementById('welcome-banner'),0,false,this)"></button></div>
    </div>
  </div>
  <script>
    fadeOutAfter(document.getElementById('welcome-banner'), 10000, false, document.getElementById('banner-dismiss'))
  </script>{* fade banner out after 10 seconds *}
{/if}
