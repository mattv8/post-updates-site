{* Donation section using settings *}
<div class="card">
  <div class="card-body">
    <h5 class="card-title">Support</h5>
    <div class="card-text mb-2">{$settings.donate_text_html nofilter}</div>
    {if $settings.show_donate_button}
    <div class="d-grid">
      <button id="donate-btn" class="btn btn-success" data-amount="{$settings.donation_default|default:25}">
        Donate
      </button>
    </div>
    {/if}
  </div>
</div>
