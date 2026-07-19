/**
 * Upgrade an image URL to a resolution/crop suitable for the surface it renders
 * on. Seed and many profile photos come from Unsplash at low widths (w=400),
 * which look blurry on full-screen swipe cards — this rewrites them to a sharp,
 * face-cropped, auto-formatted variant. Non-Unsplash hosts (uploaded CDN photos,
 * randomuser) pass through unchanged; DiceBear avatars get a larger size.
 *
 *   photoUri(url)                 → full-screen card quality (1080×1440)
 *   photoUri(url, { size: 160 })  → square thumbnail quality
 */
export function photoUri(
  url?: string | null,
  opts: { w?: number; h?: number; size?: number } = {},
): string | undefined {
  if (!url) return undefined;

  // Square thumbnail (avatars, list rows)
  if (opts.size) {
    const s = opts.size * 2; // 2x for crisp rendering on high-DPI screens
    if (url.includes('images.unsplash.com')) {
      return `${url.split('?')[0]}?w=${s}&h=${s}&fit=crop&crop=faces,center&q=80&auto=format`;
    }
    if (url.includes('api.dicebear.com')) {
      return url.replace(/([?&])size=\d+/, `$1size=${s}`);
    }
    return url;
  }

  // Full-bleed portrait card
  const w = opts.w ?? 1080;
  const h = opts.h ?? 1440;
  if (url.includes('images.unsplash.com')) {
    return `${url.split('?')[0]}?w=${w}&h=${h}&fit=crop&crop=faces,center&q=80&auto=format`;
  }
  if (url.includes('api.dicebear.com')) {
    return url.replace(/([?&])size=\d+/, `$1size=512`);
  }
  return url;
}
