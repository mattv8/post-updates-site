{* Page-specific JS *}
<script src="js/home.js"></script>

<div class="container py-4">
  {if $settings.show_hero && $settings.hero_media_id}
    <div class="hero position-relative mb-4">
      <picture>
        {if $hero_webp}
          <source type="image/webp" srcset="{$hero_webp}" sizes="100vw" />
        {/if}
        {if $hero_jpg}
          <img class="w-100 rounded" srcset="{$hero_jpg}" sizes="100vw" alt="Hero image" />
        {/if}
      </picture>
      {if $settings.hero_overlay_opacity}
        <div class="hero-overlay position-absolute top-0 start-0 w-100 h-100" style="background-color: {$settings.hero_overlay_color|default:'#000'}; opacity: {$settings.hero_overlay_opacity|default:'0.3'}"></div>
      {/if}
      {if $settings.hero_html}
        <div class="hero-content position-absolute top-50 start-50 translate-middle text-white p-3 text-center">
          {$settings.hero_html nofilter}
        </div>
      {/if}
    </div>
  {/if}

  <div class="row g-4">
    <div class="col-12 col-lg-8">
      <h2 class="mb-3">Updates</h2>
      <div id="posts-list" class="timeline">
        {if $posts|@count == 0}
          <p>No updates yet.</p>
        {/if}
        {foreach $posts as $post}
          {include file='templates/partials/post_card.tpl' post=$post}
        {/foreach}
      </div>
    </div>
    <div class="col-12 col-lg-4">
      <div class="sticky-top" style="top: 90px;">
        {if $settings.show_about}
          <div class="card mb-4">
            <div class="card-body">
              <h5 class="card-title">About</h5>
              <div class="card-text">{$settings.site_bio_html nofilter}</div>
            </div>
          </div>
        {/if}
        {if $settings.show_donation}
          {include file='templates/partials/donate_section.tpl'}
        {/if}
      </div>
    </div>
  </div>

  {include file='templates/partials/post_overlay.tpl'}

  {* Post Editor Modal - only shown when authenticated *}
  {if $is_authenticated|default:false}
    <div class="modal fade" id="postEditorModal" tabindex="-1" aria-labelledby="postEditorModalLabel" aria-hidden="true">
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

    <meta name="csrf-token" content="{$csrf_token|default:''}" />
  {/if}

</div>
