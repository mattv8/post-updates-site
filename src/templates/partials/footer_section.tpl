{* Footer Section - Displays site footer with configurable layout and optional background *}
{if $settings.show_footer}
<footer class="mt-5 py-4 border-top position-relative rounded-3" style="overflow: hidden; {if $settings.footer_media_id}min-height: 200px;{/if}">
  {if $is_authenticated|default:false}
    <button class="btn btn-sm btn-light btn-edit-section position-absolute top-0 end-0 m-2" style="z-index: 10;" data-bs-toggle="modal" data-bs-target="#editFooterModal" title="Edit Footer">
      <i class="bi bi-pencil"></i> Edit
    </button>
  {/if}

  {* Background Image with Overlay *}
  {if $settings.footer_media_id}
    {if $footer_jpg}
      <div class="footer-background position-absolute top-0 start-0 w-100 h-100" style="z-index: 0;">
        <picture style="display: block; width: 100%; height: 100%;">
          {if $footer_webp}
            <source type="image/webp" srcset="{$footer_webp}" />
          {/if}
          <img src="{$footer_jpg}" alt="Footer background" style="width: 100%; height: 100%; object-fit: cover;" />
        </picture>
      </div>
      {if $settings.footer_overlay_opacity}
        <div class="footer-overlay position-absolute top-0 start-0 w-100 h-100" style="background-color: {$settings.footer_overlay_color|default:'#000'}; opacity: {$settings.footer_overlay_opacity|default:'0.5'}; z-index: 1;"></div>
      {/if}
    {/if}
  {/if}

  <div class="container position-relative" style="z-index: 2; {if $settings.footer_media_id}color: white;{/if}">
    {if $settings.footer_layout == 'single'}
      {* Single column layout *}
      <div class="row">
        <div class="col-12 text-center">
          {$settings.footer_column1_html nofilter}
        </div>
      </div>
    {else}
      {* Two column layout *}
      <div class="row">
        <div class="col-md-6 mb-3 mb-md-0">
          {$settings.footer_column1_html nofilter}
        </div>
        <div class="col-md-6">
          {$settings.footer_column2_html nofilter}
        </div>
      </div>
    {/if}
  </div>
</footer>
{/if}
