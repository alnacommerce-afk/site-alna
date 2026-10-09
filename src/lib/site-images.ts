// Smaller copies of the product photos for the listing cards. The photos are stored once, at 1200 px (up to
// ~300 KB each); the catalogue cards only show them at about 250 px, so the storage service resizes them on the fly
// (WebP when the browser accepts it) and the first screen of the store downloads ~75% fewer bytes.
// Always keep the original URL as a fallback: if the resized copy cannot be served, the card swaps to it.
const PUBLIC_PATH = "/storage/v1/object/public/";
const RENDER_PATH = "/storage/v1/render/image/public/";

export function cardImageUrl(originalUrl: string, width = 480, quality = 60): string {
  if (!originalUrl.includes(PUBLIC_PATH)) return originalUrl;
  return `${originalUrl.replace(PUBLIC_PATH, RENDER_PATH)}?width=${width}&quality=${quality}`;
}
