import { API_BASE_URL, BASE_URL } from '../config/env';

/**
 * Compress and resize an image File/Blob on the client to avoid reverse-proxy
 * body size limits (e.g. Nginx 1MB default) and slow mobile upload timeouts.
 */
export async function compressImageFile(
  file,
  { maxWidth = 1400, maxHeight = 1400, quality = 0.8 } = {}
) {
  if (!file || typeof file.type !== 'string' || !file.type.startsWith('image/')) {
    return file;
  }
  // Skip SVG/GIF or already small images (< 250KB)
  if (file.type === 'image/svg+xml' || file.type === 'image/gif' || file.size <= 250 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }
          const baseName = (file.name || 'image').replace(/\.[^/.]+$/, '');
          const compressedFile = new File([blob], `${baseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Resolve a stored upload path (e.g. `/uploads/...`) into an absolute URL
 * routed through `/api/uploads/...` so it works behind `/api` reverse proxies.
 */
export function resolveUploadUrl(path, fallbackBaseUrl = BASE_URL) {
  if (!path || typeof path !== 'string') return null;

  if (
    path.startsWith('data:') ||
    path.startsWith('blob:') ||
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (cleanPath.startsWith('/uploads/')) {
    const apiBase = (API_BASE_URL || `${fallbackBaseUrl}/api`).replace(/\/+$/, '');
    return `${apiBase}${cleanPath}`;
  }

  const cleanBase = (fallbackBaseUrl || '').replace(/\/+$/, '');
  return `${cleanBase}${cleanPath}`;
}
