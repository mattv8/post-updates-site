/**
 * CKEditor Upload Adapter
 * Handles image uploads directly from the CKEditor toolbar
 */

class MediaUploadAdapter {
  constructor(loader) {
    this.loader = loader;
  }

  upload() {
    return this.loader.file
      .then(file => new Promise((resolve, reject) => {
        this._initRequest();
        this._initListeners(resolve, reject, file);
        this._sendRequest(file);
      }));
  }

  abort() {
    if (this.xhr) {
      this.xhr.abort();
    }
  }

  _initRequest() {
    const xhr = this.xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/media.php', true);
    xhr.responseType = 'json';

    // Add CSRF token
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
    if (csrfToken) {
      xhr.setRequestHeader('X-CSRF-Token', csrfToken);
    }
  }

  _initListeners(resolve, reject, file) {
    const xhr = this.xhr;
    const loader = this.loader;
    const genericErrorText = `Couldn't upload file: ${file.name}.`;

    xhr.addEventListener('error', () => reject(genericErrorText));
    xhr.addEventListener('abort', () => reject());
    xhr.addEventListener('load', () => {
      const response = xhr.response;

      if (!response || !response.success) {
        return reject(response && response.error ? response.error : genericErrorText);
      }

      // Return the URL to the uploaded image
      // CKEditor will insert this into the content
      const mediaData = response.data;
      const variants = JSON.parse(mediaData.variants_json || '{}');

      // Use the 800px variant for in-content images, or original
      const imageUrl = variants['800']?.jpg
        ? '/storage/uploads/variants/800/' + variants['800'].jpg.split('/').pop()
        : '/storage/uploads/originals/' + mediaData.filename;

      resolve({
        default: imageUrl,
        // Provide multiple sizes for responsive images
        '400': variants['400']?.jpg
          ? '/storage/uploads/variants/400/' + variants['400'].jpg.split('/').pop()
          : imageUrl,
        '800': variants['800']?.jpg
          ? '/storage/uploads/variants/800/' + variants['800'].jpg.split('/').pop()
          : imageUrl,
        '1600': variants['1600']?.jpg
          ? '/storage/uploads/variants/1600/' + variants['1600'].jpg.split('/').pop()
          : imageUrl
      });
    });

    if (xhr.upload) {
      xhr.upload.addEventListener('progress', evt => {
        if (evt.lengthComputable) {
          loader.uploadTotal = evt.total;
          loader.uploaded = evt.loaded;
        }
      });
    }
  }

  _sendRequest(file) {
    const data = new FormData();
    data.append('file', file);
    data.append('alt_text', ''); // User can edit alt text later via media library

    this.xhr.send(data);
  }
}

// Plugin factory function
function MediaUploadAdapterPlugin(editor) {
  editor.plugins.get('FileRepository').createUploadAdapter = (loader) => {
    return new MediaUploadAdapter(loader);
  };
}

// Make it available globally
window.MediaUploadAdapterPlugin = MediaUploadAdapterPlugin;
