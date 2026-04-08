/**
 * Platform-agnostic share URLs (intent / sharer) — no OAuth tokens required.
 * Use for "open in new tab" UX or automation that drives the browser.
 */

export interface SocialShareLinks {
  twitter: string;
  x: string;
  facebook: string;
  linkedin: string;
  reddit: string;
  whatsapp: string;
  email: string;
}

const MAX_TEXT = 280;

/**
 * @param url Absolute HTTPS URL of the published landing page
 * @param text Short promo line (truncated for Twitter-style limits)
 */
export function buildSocialShareLinks(url: string, text: string): SocialShareLinks {
  const safeUrl = url.trim();
  const snippet = text.trim().slice(0, MAX_TEXT);
  const u = encodeURIComponent(safeUrl);
  const t = encodeURIComponent(snippet);
  const combined = encodeURIComponent(`${snippet ? `${snippet} ` : ''}${safeUrl}`);

  return {
    twitter: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
    x: `https://x.com/intent/tweet?url=${u}&text=${t}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    reddit: `https://www.reddit.com/submit?url=${u}&title=${t}`,
    whatsapp: `https://api.whatsapp.com/send?text=${combined}`,
    email: `mailto:?subject=${t}&body=${encodeURIComponent(`${snippet}\n\n${safeUrl}`)}`,
  };
}
