/**
 * Safe return URL guard - validate and sanitize URLs
 */
export function safeReturnUrl(url?: string | null): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    // Only allow https in production
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
      return null;
    }

    // Whitelist known origins
    const whitelist = (process.env.RETURN_URL_WHITELIST || '').split(',');
    if (whitelist.length > 0 && !whitelist.includes(parsed.origin)) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Truncate string to max length
 */
export function truncate(text: string, maxLen = 100): string {
  return text.length > maxLen ? text.slice(0, maxLen - 3) + '...' : text;
}
