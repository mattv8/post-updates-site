// Edit Hero Modal - Height slider and preview
(function() {
  'use strict';
  document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('editHeroModal');
    if (!modal) return;

    const heightSlider = modal.querySelector('#modal_hero_height');
    const heightValue = modal.querySelector('.hero-banner-height-value');
    const previewDiv = modal.querySelector('.hero-banner-preview');
    const previewWrapper = modal.querySelector('.hero-banner-preview-wrapper');
    const removeBtn = modal.querySelector('.btn-remove-hero-banner');

    if (!heightSlider || !heightValue || !previewDiv) return;

    // Update preview height dynamically when slider moves
    heightSlider.addEventListener('input', function() {
      const heightPercent = parseInt(this.value);
      heightValue.textContent = heightPercent;
      previewDiv.style.paddingBottom = heightPercent + '%';
    });

    // Show trash icon on hover
    if (previewWrapper && removeBtn) {
      previewWrapper.addEventListener('mouseenter', function() {
        removeBtn.style.opacity = '1';
      });

      previewWrapper.addEventListener('mouseleave', function() {
        removeBtn.style.opacity = '0';
      });
    }
  });
})();
