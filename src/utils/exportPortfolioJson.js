const BLOCKED_NRIC_KEYS = new Set([
  'nric',
  'nricno',
  'nricnumber',
  'ic',
  'icnumber',
  'icno',
  'mykad',
  'mykadno',
  'mykadnumber',
  'kadpengenalan',
  'nokadpengenalan',
  'nokp',
  'kp',
  'nationalid',
  'passport',
  'ssn'
]);

const DELIMITED_NRIC_RE =
  /(?<![#\d])\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])(?:([ -])\d{2}\1\d{4}|-\d{6})(?!\d)/g;
const COMPACT_NRIC_RE =
  /(?<![+#a-fA-F0-9])(?!601[15]\d)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])(?:0[1-9]|1[0-6]|[2-5]\d|6[0-8]|7[1-9]|8[2-9]|9[0-3]|9[89])\d{4}(?![a-fA-F0-9])/g;
const KEYWORD_NRIC_RE =
  /(\b(?:no\.?\s*k\/?p|mykad|nric|ic\s*(?:no\.?|number|num)|kad\s*pengenalan)(?:(?:["']|\s*)[:#=\-]+\s*["']?\s*|\s+["']?))\d{4,}(?:[- ]\d{2,4})*/gi;

function isPlainObject(v) {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v));
}

function sanitizeString(str) {
  return str
    .replace(DELIMITED_NRIC_RE, '[REDACTED-PDPA]')
    .replace(COMPACT_NRIC_RE, '[REDACTED-PDPA]')
    .replace(KEYWORD_NRIC_RE, '$1[REDACTED-PDPA]');
}

function sanitizeValue(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return String(value);
  if (typeof value === 'string') {
    return sanitizeString(value);
  }
  if (typeof value === 'object') {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    try {
      if (Array.isArray(value)) {
        return value.map((item) => sanitizeValue(item, seen));
      }
      const clean = {};
      for (const [key, val] of Object.entries(value)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (BLOCKED_NRIC_KEYS.has(normalizedKey)) continue;
        const safeKey = sanitizeString(key);
        if (safeKey === '__proto__' || safeKey === 'constructor' || safeKey === 'prototype') {
          continue;
        }
        clean[safeKey] = sanitizeValue(val, seen);
      }
      return clean;
    } finally {
      seen.delete(value);
    }
  }
  return value;
}

export function buildSanitizedPortfolioExport({
  profile = null,
  projects = [],
  caseStudies = [],
  credentials = null,
  operationalHistory = []
} = {}) {
  const courseraCount = Array.isArray(credentials?.googleCourseraCourses)
    ? credentials.googleCourseraCourses.filter(isPlainObject).length
    : 0;

  return {
    exportedAt: new Date().toISOString(),
    pdpaCompliant: true,
    attributionScope: {
      systems:
        'Production-Architected & Sandbox Stress-Tested MarTech Systems (Mock/Live API Adapter Ready)',
      caseStudies: 'Documented Real-World Client & Local Business Engagements',
      credentials:
        `${courseraCount} individually verified Google/Coursera courses completed within the 8-course pathway; SKM Level 3 officially issued (TERAMPIL)`
    },
    profile: sanitizeValue(profile),
    projects: sanitizeValue(Array.isArray(projects) ? projects : []),
    caseStudies: sanitizeValue(Array.isArray(caseStudies) ? caseStudies : []),
    credentials: sanitizeValue(credentials),
    operationalHistory: sanitizeValue(Array.isArray(operationalHistory) ? operationalHistory : [])
  };
}

export function downloadPortfolioJson(
  payload,
  filename = 'faiz-martech-portfolio-export.json'
) {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof Blob === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return false;
  }

  const baseName =
    typeof filename === 'string' && filename.trim()
      ? filename.trim().replace(/[^a-zA-Z0-9._-]/g, '-')
      : 'faiz-martech-portfolio-export.json';
  const safeFilename = baseName.endsWith('.json') ? baseName : `${baseName}.json`;

  const blob = new Blob([JSON.stringify(payload ?? {}, null, 2)], {
    type: 'application/json;charset=utf-8'
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = safeFilename;
  link.style.display = 'none';

  if (document.body) {
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    link.click();
  }

  const timer = setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  timer?.unref?.();
  return true;
}
