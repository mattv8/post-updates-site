{* Custom header includes for Post Portal *}
<link rel="stylesheet" type="text/css" href="{asset_css file='global.css'}" />
<link rel="stylesheet" type="text/css" href="{asset_css file='custom.css'}" />
<link rel="stylesheet" type="text/css" href="{asset_css file='home.css'}" />
<link rel="stylesheet" type="text/css" href="{asset_css file='post_overlay.css'}" />
<link rel="stylesheet" type="text/css" href="{asset_css file='donation-modal.css'}" />

{* Bootstrap Icons *}
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">

{* Quill WYSIWYG Editor *}
<link href="https://cdn.quilljs.com/1.3.7/quill.snow.css" rel="stylesheet">
<script src="https://cdn.quilljs.com/1.3.7/quill.min.js"></script>
{* Quill ImageResize Module *}
<script src="https://cdn.jsdelivr.net/npm/quill-image-resize-module@3.0.0/image-resize.min.js"></script>

{* Core utilities bundle: shared-utils, validation-utils, notifications *}
{if $_bundle_mode}
<script defer src="{bundle_url name='core.bundle.js'}"></script>
<script defer src="{bundle_url name='editor.bundle.js'}"></script>
<script defer src="{bundle_url name='cropping.bundle.js'}"></script>
{else}
{* Development mode: load individual files *}
<script defer src="{asset_js file='quill-upload-adapter.js'}"></script>
<script defer src="{asset_js file='auto-save.js'}"></script>
<script defer src="{asset_js file='shared-utils.js'}"></script>
<script defer src="{asset_js file='ai-title-generator.js'}"></script>
<script defer src="{asset_js file='settings-manager.js'}"></script>
<script defer src="{asset_js file='bg-preview-manager.js'}"></script>
<script defer src="{asset_js file='validation-utils.js'}"></script>
{/if}
