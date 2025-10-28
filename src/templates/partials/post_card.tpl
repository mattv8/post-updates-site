{* Post card partial - Timeline version *}
{assign var=jpg_srcset value=$post.hero_srcset_jpg}
{assign var=webp_srcset value=$post.hero_srcset_webp}

<div class="timeline-item" data-post-id="{$post.id}">
  <div class="timeline-date">
    <div class="timeline-date-content">
      {if $post.published_at}
        <div class="timeline-month">{$post.published_at|date_format:"%b"}</div>
        <div class="timeline-day">{$post.published_at|date_format:"%e"}</div>
        <div class="timeline-year">{$post.published_at|date_format:"%Y"}</div>
      {/if}
    </div>
  </div>
  <div class="timeline-content">
    <div class="card post-card">
      {if $jpg_srcset || $webp_srcset}
        <div class="hero-image-container" style="max-height: 600px; overflow: hidden; position: relative;">
          <picture style="display: block; height: 0; padding-bottom: {$post.hero_image_height|default:100}%; position: relative; overflow: hidden;">
            {if $webp_srcset}
              <source type="image/webp" srcset="{$webp_srcset}" sizes="(max-width: 768px) 100vw, 50vw" />
            {/if}
            {if $jpg_srcset}
              <img class="card-img-top" srcset="{$jpg_srcset}" sizes="(max-width: 768px) 100vw, 50vw" alt="{$post.title|escape}"
                   style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; object-position: center;" />
            {/if}
          </picture>
        </div>
      {/if}
      <div class="card-body">
        <h5 class="card-title">{$post.title|escape}</h5>
        {if $post.author_first || $post.author_last}
          <p class="text-muted small mb-2">
            <em>By {if $post.author_first}{$post.author_first}{/if} {if $post.author_last}{$post.author_last}{/if}</em>
          </p>
        {/if}
        <div class="card-text post-preview-content">{$post.body_html nofilter}</div>
        <div class="d-flex justify-content-between align-items-center">
          <small class="text-muted fst-italic">
            <span class="d-none d-md-inline">Click to read more</span>
            <span class="d-md-none">Tap to read more</span>
          </small>
          {if $is_authenticated|default:false}
            <div class="btn-group" role="group">
              <button class="btn btn-sm btn-outline-secondary btn-edit-post-home" data-post-id="{$post.id}" title="Edit post">
                <i class="bi bi-pencil"></i> Edit
              </button>
              <button class="btn btn-sm btn-outline-danger btn-delete-post-home" data-post-id="{$post.id}" title="Delete post">
                <i class="bi bi-trash"></i> Delete
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>
