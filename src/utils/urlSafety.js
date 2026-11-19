const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/;
const SCHEME_PREFIX_RE = /^([a-zA-Z][a-zA-Z0-9+.-]*):/;
const BARE_DOMAIN_RE = /^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:[/:?#].*)?$/;
const MAILTO_BODY_RE = /^[^\s@#\/\\]+@[^\s@#\/\\]+\.[^\s@#\/\\]+$/;

export function normalizeExternalUrl(url) {
  if (typeof url !== 'string') return '';
  if (CONTROL_CHARS_RE.test(url)) return '';
  const raw = url.trim();
  if (!raw) return '';

  // Reject relative/hash/query paths so internal routes are never turned into https://
  if (raw.startsWith('/') || raw.startsWith('.') || raw.startsWith('#') || raw.startsWith('?')) {
    return '';
  }

  const schemeMatch = raw.match(SCHEME_PREFIX_RE);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme === 'mailto') {
      const rest = raw.slice('mailto:'.length).trim();
      const address = rest.split('?')[0].trim();
      return MAILTO_BODY_RE.test(address) ? `mailto:${rest}` : '';
    }
    if (scheme === 'http' || scheme === 'https') {
      const candidate = scheme === 'http' ? `https:${raw.slice(5)}` : raw;
      try {
        const parsed = new URL(candidate);
        if (parsed.protocol !== 'https:' || !parsed.hostname) return '';
        if (parsed.username || parsed.password) return '';
        if (scheme === 'http' && parsed.port === '80') {
          parsed.port = '';
        }
        return parsed.toString();
      } catch {
        return '';
      }
    }
    return '';
  }

  if (/\s/.test(raw) || !BARE_DOMAIN_RE.test(raw)) return '';
  try {
    const parsed = new URL(`https://${raw}`);
    if (parsed.protocol !== 'https:' || !parsed.hostname.includes('.')) return '';
    if (parsed.username || parsed.password) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

export function isSafeExternalUrl(url) {
  if (typeof url !== 'string') return false;
  if (CONTROL_CHARS_RE.test(url)) return false;
  const raw = url.trim();
  if (!raw) return false;

  const schemeMatch = raw.match(SCHEME_PREFIX_RE);
  if (!schemeMatch) return false;

  const scheme = schemeMatch[1].toLowerCase();
  if (scheme === 'mailto') {
    const address = raw.slice('mailto:'.length).split('?')[0].trim();
    return MAILTO_BODY_RE.test(address);
  }
  if (scheme === 'https') {
    try {
      const parsed = new URL(raw);
      return (
        parsed.protocol === 'https:' &&
        Boolean(parsed.hostname) &&
        !parsed.username &&
        !parsed.password
      );
    } catch {
      return false;
    }
  }
  return false;
}
