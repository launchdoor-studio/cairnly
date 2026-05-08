/**
 * Appends a 1×1 tracking pixel at the end of an HTML body when tracking is enabled.
 */
export function appendTrackingPixel(html: string, pixelUrl: string): string {
  if (!html.trim()) {
    return html;
  }
  const pixel = `<img src="${pixelUrl}" alt="" width="1" height="1" style="display:none" />`;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${pixel}</body>`);
  }
  return `${html}${pixel}`;
}

const HREF_RE = /\bhref\s*=\s*(["'])([^"']+)\1/gi;

/**
 * Rewrites http(s) links to pass through the Cairnly redirect endpoint.
 */
export function rewriteLinksForTracking(html: string, linkBaseUrl: string): string {
  return html.replace(HREF_RE, (full, quote: string, url: string) => {
    const trimmed = url.trim();
    if (
      !/^https?:\/\//i.test(trimmed) ||
      trimmed.startsWith(linkBaseUrl) ||
      trimmed.includes("/api/email/track/")
    ) {
      return full;
    }
    const encoded = encodeURIComponent(trimmed);
    const sep = linkBaseUrl.includes("?") ? "&" : "?";
    const wrapped = `${linkBaseUrl}${sep}u=${encoded}`;
    return `href=${quote}${wrapped}${quote}`;
  });
}
