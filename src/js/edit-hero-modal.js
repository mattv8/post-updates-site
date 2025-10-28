// Edit Hero Modal Height Live Preview
(function() {
  'use strict';
  document.addEventListener('DOMContentLoaded', function() {
    var modal = document.getElementById('editHeroModal');
    if (!modal) return;
    var heightInput = modal.querySelector('#modal_hero_height');
    var heroPreview = modal.querySelector('.hero-banner-preview');
    if (!heightInput || !heroPreview) return;
    heightInput.addEventListener('input', function() {
      var value = parseInt(heightInput.value, 10);
      if (value > 100) {
        heroPreview.style.maxHeight = value + 'px';
        heroPreview.querySelector('img').style.maxHeight = value + 'px';
      }
    });
  });
})();
