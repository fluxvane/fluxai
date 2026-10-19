/**
 * Scheme whitelist for values rendered into <img src> / <a href>. Anything
 * that isn't http(s) or an image data: URI is dropped — a malicious or
 * compromised upstream can return `javascript:` / `data:text/html` URLs that
 * would otherwise execute when a gallery image is clicked.
 * Pure TS — safe to import from client components.
 */

const SAFE_HTTP = /^https?:\/\//i;
const SAFE_IMAGE_DATA = /^data:image\/(png|jpe?g|webp|gif);base64,/i;

export function safeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const value = url.trim();
  return SAFE_HTTP.test(value) || SAFE_IMAGE_DATA.test(value) ? value : null;
}

const SAFE_CLIENT_SRC = /^https?:\/\/|^data:image\//i;

/** Client-side render guard (slightly looser than safeImageUrl). */
export function isSafeImageSrc(src: string | null | undefined): src is string {
  return typeof src === "string" && SAFE_CLIENT_SRC.test(src);
}
