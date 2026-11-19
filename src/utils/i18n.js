export function normalizeLang(lang) {
  if (typeof lang !== 'string') return 'en';
  const lower = lang.trim().toLowerCase();
  return lower === 'bm' || lower === 'ms' ? 'bm' : 'en';
}

function getByDotPath(obj, path) {
  if (!obj || typeof obj !== 'object' || typeof path !== 'string' || !path) return undefined;
  const parts = path.split('.');
  let cur = obj;
  for (const part of parts) {
    if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
      return undefined;
    }
    if (cur && typeof cur === 'object' && Object.prototype.hasOwnProperty.call(cur, part)) {
      cur = cur[part];
    } else {
      return undefined;
    }
  }
  return cur;
}

function resolveBilingualNode(node, targetLang) {
  const primary = node[targetLang];
  const fallback = targetLang === 'bm' ? node.en : node.bm;
  if (Array.isArray(primary)) {
    return primary.length > 0 ? primary : Array.isArray(fallback) ? fallback : [];
  }
  if (primary !== undefined && primary !== null && primary !== '') {
    return primary;
  }
  if (Array.isArray(fallback)) return fallback;
  return fallback !== undefined && fallback !== null ? fallback : '';
}

function resolveScopedNode(node, targetLang) {
  if (node === null || node === undefined) return '';
  if (Array.isArray(node)) {
    return node.map((item) => resolveScopedNode(item, targetLang));
  }
  if (typeof node === 'object') {
    const hasEn = Object.prototype.hasOwnProperty.call(node, 'en');
    const hasBm = Object.prototype.hasOwnProperty.call(node, 'bm');
    if (hasEn || hasBm) {
      return resolveBilingualNode(node, targetLang);
    }
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      out[k] = resolveScopedNode(v, targetLang);
    }
    return out;
  }
  return typeof node === 'string' ? node : String(node);
}

export function safeLookup(map, key) {
  if (!map || typeof map !== 'object' || Array.isArray(map) || typeof key !== 'string' || !key) {
    return '';
  }
  return Object.hasOwn(map, key) && typeof map[key] === 'string' ? map[key] : '';
}

function isResolvableValue(v) {
  return v !== undefined && v !== null && v !== '' && (!Array.isArray(v) || v.length > 0);
}

export function localize(val, lang = 'en', dict = null) {
  const targetLang = normalizeLang(lang);

  if (val === null || val === undefined) return '';

  if (Array.isArray(val)) {
    return val.map((item) => localize(item, targetLang, dict));
  }

  if (typeof val === 'string') {
    if (dict && typeof dict === 'object') {
      if (dict[targetLang] && typeof dict[targetLang] === 'object') {
        const fromLangTree = getByDotPath(dict[targetLang], val);
        if (isResolvableValue(fromLangTree)) {
          return resolveScopedNode(fromLangTree, targetLang);
        }
        const fallbackLang = targetLang === 'bm' ? 'en' : 'bm';
        const fromFallbackTree = getByDotPath(dict[fallbackLang], val);
        if (isResolvableValue(fromFallbackTree)) {
          return resolveScopedNode(fromFallbackTree, targetLang);
        }
      }
      const isTopLevelLangBranch =
        (val === 'en' || val === 'bm') &&
        Object.hasOwn(dict, val) &&
        dict[val] &&
        typeof dict[val] === 'object' &&
        !Array.isArray(dict[val]) &&
        !Object.hasOwn(dict[val], 'en') &&
        !Object.hasOwn(dict[val], 'bm');
      if (!isTopLevelLangBranch) {
        const fromFlatTree = getByDotPath(dict, val);
        if (fromFlatTree !== undefined) {
          return resolveScopedNode(fromFlatTree, targetLang);
        }
      }
    }
    return val;
  }

  if (typeof val === 'object') {
    const hasEn = Object.prototype.hasOwnProperty.call(val, 'en');
    const hasBm = Object.prototype.hasOwnProperty.call(val, 'bm');
    if (hasEn || hasBm) {
      return resolveBilingualNode(val, targetLang);
    }
    return '';
  }

  return String(val);
}

export function localizeText(val, lang = 'en', dict = null) {
  const resolved = localize(val, lang, dict);
  if (
    resolved === null ||
    resolved === undefined ||
    typeof resolved === 'object' ||
    typeof resolved === 'function' ||
    typeof resolved === 'symbol'
  ) {
    return '';
  }
  return typeof resolved === 'string' ? resolved : String(resolved);
}

export function syncDocumentLang(lang = 'en') {
  const docLang = normalizeLang(lang) === 'bm' ? 'ms' : 'en';
  if (typeof document !== 'undefined' && document?.documentElement) {
    document.documentElement.lang = docLang;
  }
  return docLang;
}
