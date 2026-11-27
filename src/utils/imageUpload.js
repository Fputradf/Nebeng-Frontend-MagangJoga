import { API_BASE_URL, BASE_URL } from '../config/env';

export const IMAGE_PRESETS = {
  logo: {
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.9,
    preserveAlpha: true,
    skipSizeBytes: 80 * 1024,
  },
  qris: {
    maxWidth: 1000,
    maxHeight: 1000,
    quality: 0.92,
    preserveAlpha: true,
    skipSizeBytes: 150 * 1024,
  },
  banner: {
    maxWidth: 1600,
    maxHeight: 900,
    quality: 0.85,
    preserveAlpha: false,
    skipSizeBytes: 250 * 1024,
  },
  avatar: {
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.82,
    preserveAlpha: false,
    skipSizeBytes: 100 * 1024,
  },
  proof: {
    maxWidth: 1400,
    maxHeight: 1400,
    quality: 0.82,
    preserveAlpha: false,
    skipSizeBytes: 200 * 1024,
  },
  default: {
    maxWidth: 1400,
    maxHeight: 1400,
    quality: 0.82,
    preserveAlpha: false,
    skipSizeBytes: 250 * 1024,
  },
};

export function getPresetForUploadUrl(url = '') {
  const normalized = String(url).toLowerCase();
  if (normalized.includes('/uploads/banners')) return IMAGE_PRESETS.banner;
  if (normalized.includes('/uploads/social-links')) return IMAGE_PRESETS.logo;
  if (normalized.includes('/users/me/avatar')) return IMAGE_PRESETS.avatar;
  if (normalized.includes('/uploads/payment-proof')) return IMAGE_PRESETS.proof;
  return IMAGE_PRESETS.default;
}

/**
 * Compress and auto-resize an image File/Blob on the client to avoid reverse-proxy
 * body size limits, save storage/bandwidth, and normalize oversized dimensions.
 */
export async function compressImageFile(
  file,
  {
    maxWidth = 1400,
    maxHeight = 1400,
    quality = 0.82,
    preserveAlpha = false,
    skipSizeBytes = 250 * 1024,
  } = {}
) {
  if (!file || typeof file.type !== 'string' || !file.type.startsWith('image/')) {
    return file;
  }
  // Skip SVG/GIF so vector graphics and animations stay intact
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      const needsResize = width > maxWidth || height > maxHeight;

      if (!needsResize && file.size <= skipSizeBytes) {
        resolve(file);
        return;
      }

      if (needsResize) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
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

      const keepPng = preserveAlpha && file.type === 'image/png';
      const keepWebp = preserveAlpha && file.type === 'image/webp';
      const targetMime = keepPng ? 'image/png' : keepWebp ? 'image/webp' : 'image/jpeg';
      const targetExt = keepPng ? 'png' : keepWebp ? 'webp' : 'jpg';

      canvas.toBlob(
        (blob) => {
          if (!blob || (!needsResize && blob.size >= file.size)) {
            resolve(file);
            return;
          }
          const baseName = (file.name || 'image').replace(/\.[^/.]+$/, '');
          const resizedFile = new File([blob], `${baseName}.${targetExt}`, {
            type: targetMime,
            lastModified: Date.now(),
          });
          resolve(resizedFile);
        },
        targetMime,
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
 * Resize an image File/Blob and return a base64 Data URL string
 * (used for inline-stored images like app logo and static QRIS).
 */
export async function resizeImageToDataUrl(file, options = {}) {
  const processed = await compressImageFile(file, options);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(processed);
  });
}

/**
 * Automatically resize any image File entries inside a FormData payload
 * according to the target upload endpoint preset.
 */
export async function resizeFormDataImages(formData, url = '') {
  if (!(formData instanceof FormData)) return formData;
  const preset = getPresetForUploadUrl(url);
  const nextFormData = new FormData();

  for (const [key, value] of formData.entries()) {
    if (
      value instanceof Blob &&
      typeof value.type === 'string' &&
      value.type.startsWith('image/') &&
      value.type !== 'image/svg+xml' &&
      value.type !== 'image/gif'
    ) {
      const resized = await compressImageFile(value, preset);
      nextFormData.append(key, resized, resized.name || 'image.jpg');
    } else {
      nextFormData.append(key, value);
    }
  }

  return nextFormData;
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
