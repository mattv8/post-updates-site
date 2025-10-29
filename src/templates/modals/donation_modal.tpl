{* Donation Modal - Custom modal without Bootstrap constraints *}
<div class="donation-modal-overlay" id="donationModal" style="display: none;">
  <div class="donation-modal-wrapper">
    <div class="donation-modal-content">
      <button type="button" class="donation-modal-close" aria-label="Close">
        <i class="bi bi-x-lg"></i>
      </button>
      <div class="donation-modal-body">
        <div id="donation-instructions" class="ql-editor">
          {$settings.donation_instructions_html nofilter}
        </div>

        {if $settings.donation_method == 'qr' || $settings.donation_method == 'both'}
          {if $settings.donation_qr_media_id && ($donation_qr_jpg || $donation_qr_webp)}
            <div class="donation-qr">
              <picture>
                {if $donation_qr_webp}
                  <source type="image/webp" srcset="{$donation_qr_webp}" sizes="300px">
                {/if}
                {if $donation_qr_jpg}
                  <img srcset="{$donation_qr_jpg}"
                       sizes="300px"
                       alt="Donation Image"
                       class="img-fluid"
                       loading="lazy">
                {/if}
              </picture>
            </div>
          {/if}
        {/if}

        {if $settings.donation_method == 'link' || $settings.donation_method == 'both'}
          {if $settings.donation_link}
            <div class="donation-link">
              <p class="donation-link-label">
                <i class="donation-platform-icon bi"></i>
                <span class="donation-platform-name">Send payment:</span>
              </p>
              <code class="donation-link-code" id="donation-link-text" data-full-url="{$settings.donation_link}">{$settings.donation_link}</code>
              <small class="donation-link-hint">Tap to copy • <a href="{$settings.donation_link}" target="_blank" rel="noopener noreferrer">Open app</a></small>
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
</div>