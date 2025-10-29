{*
  Reusable Background Image Preview Component
  Used for hero banners, footer backgrounds, and post hero images

  Parameters:
  - idPrefix: Unique prefix for element IDs (required)
  - showHeightControl: Boolean to show height slider (default: true)
  - showOverlayControls: Boolean to show overlay controls (default: true)
  - showTextPreview: Boolean to show text preview overlay (default: false)
  - previewText: Text to display in preview (default: 'Text will appear here...')
  - minHeight: Minimum height percentage (default: 10)
  - maxHeight: Maximum height percentage (default: 100)
  - defaultHeight: Default height percentage (default: 100)
  - previewLabel: Label for the preview (default: 'Background Preview')
  - removeButtonClass: Class for the remove button (default: 'btn-remove-bg')
*}

{assign var="prefix" value=$idPrefix|default:"preview"}
{assign var="showHeight" value=$showHeightControl|default:true}
{assign var="showOverlay" value=$showOverlayControls|default:true}
{assign var="showText" value=$showTextPreview|default:false}
{assign var="text" value=$previewText|default:'Text will appear here...'}
{assign var="minH" value=$minHeight|default:10}
{assign var="maxH" value=$maxHeight|default:100}
{assign var="defH" value=$defaultHeight|default:100}
{assign var="label" value=$previewLabel|default:'Background Preview'}
{assign var="removeBtnClass" value=$removeButtonClass|default:'btn-remove-bg'}

<div class="{$prefix}-preview-container mt-3" style="display: none;">
  <div class="row g-3 align-items-start">
    <div class="col-md-7">
      <div class="{$prefix}-preview-wrapper position-relative" style="overflow: hidden; border-radius: 0.375rem;">
        <div class="{$prefix}-preview" style="display: block; height: 0; padding-bottom: {$defH}%; position: relative; overflow: hidden;">
          <img src="" alt="{$label}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; display: block; z-index: 0;" />
          {if $showOverlay}
          <div class="{$prefix}-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: #000000; opacity: 0.5; pointer-events: none; z-index: 1;"></div>
          {/if}
          {if $showText}
          <div class="{$prefix}-text-preview" style="position: absolute; bottom: 0; left: 0; right: 0; color: white; z-index: 2; padding: 0 0.5rem 0.5rem; text-shadow: 0 1px 2px rgba(0,0,0,0.7);">
            {* Single column layout (default) *}
            <div class="{$prefix}-text-content {$prefix}-layout-single" style="text-align: center; font-size: 0.65rem; line-height: 1.2;">
              {$text}
            </div>
            {* Two column layout (hidden by default) *}
            <div class="{$prefix}-layout-double" style="display: none;">
              <div class="row gx-1">
                <div class="col-6">
                  <div class="{$prefix}-text-col1" style="font-size: 0.5rem; line-height: 1.2;">{$text}</div>
                </div>
                <div class="col-6">
                  <div class="{$prefix}-text-col2" style="font-size: 0.5rem; line-height: 1.2;">{$text}</div>
                </div>
              </div>
            </div>
          </div>
          {/if}
          <button type="button" class="btn btn-danger btn-sm {$removeBtnClass} position-absolute top-0 end-0 m-2"
                  style="z-index: 10; opacity: 0; transition: opacity 0.2s;" title="Remove background image">
            <i class="bi bi-trash"></i>
          </button>
        </div>
        <div class="text-muted small mt-1 text-center">{$label}</div>
      </div>
    </div>
    <div class="col-md-5">
      {if $showHeight}
      <div class="mb-3">
        <label for="{$prefix}_height" class="form-label fw-semibold">
          Display Height: <span class="{$prefix}-height-value text-primary">{$defH}</span>%
        </label>
        <input type="range" class="form-range {$prefix}-height-slider" id="{$prefix}_height" min="{$minH}" max="{$maxH}" step="5" value="{$defH}">
        <div class="d-flex justify-content-between mt-1">
          <small class="text-muted">{$minH}%</small>
          <small class="text-muted">{($minH + $maxH) / 2}%</small>
          <small class="text-muted">{$maxH}%</small>
        </div>
      </div>
      {/if}

      {if $showOverlay}
      <div class="mb-3">
        <label for="{$prefix}_overlay_opacity" class="form-label fw-semibold">
          Overlay Opacity: <span class="{$prefix}-overlay-opacity-value text-primary">0.50</span>
        </label>
        <input type="range" class="form-range {$prefix}-overlay-opacity-slider" id="{$prefix}_overlay_opacity" min="0" max="1" step="0.05" value="0.5">
        <div class="d-flex justify-content-between mt-1">
          <small class="text-muted">0% (transparent)</small>
          <small class="text-muted">100% (solid)</small>
        </div>
      </div>

      <div class="mb-3">
        <label for="{$prefix}_overlay_color" class="form-label fw-semibold">
          Overlay Color
        </label>
        <div class="d-flex align-items-center gap-2">
          <input type="color" class="form-control form-control-color {$prefix}-overlay-color-picker" id="{$prefix}_overlay_color" value="#000000" title="Choose overlay color">
          <input type="text" class="form-control form-control-sm {$prefix}-overlay-color-hex" id="{$prefix}_overlay_color_hex" value="#000000" pattern="^#[0-9A-Fa-f]{6}$" style="width: 100px;">
        </div>
      </div>
      {/if}
    </div>
  </div>
</div>
