import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');

const DELIMITED_NRIC_RE =
  /(?<![#\d.])\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])(?:([ -])\d{2}\1\d{4}|-\d{6})(?!\d)/g;
const GENERIC_6_2_4_NRIC_RE =
  /(?<![#\d.])\d{6}-\d{2}-\d{4}(?!\d)/g;
const COMPACT_NRIC_RE =
  /(?<![+#a-fA-F0-9])(?!601[15]\d)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])(?:0[1-9]|1[0-6]|[2-5]\d|6[0-8]|7[1-9]|8[2-9]|9[0-3]|9[89])\d{4}(?![a-fA-F0-9])/g;
const KEYWORD_NRIC_RE =
  /\b(?:no\.?\s*k\/?p|mykad|nric|ic\s*(?:no\.?|number|num)|kad\s*pengenalan)(?:(?:["']|\s*)[:#=\-]+\s*["']?\s*|\s+["']?)\d{4,}(?:[- ]\d{2,4})*/gi;

const BINARY_EXTS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.svgz',
  '.pdf',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.mp4',
  '.zip'
]);

function scanTextForNric(text) {
  const matches = [];
  for (const [label, re] of [
    ['delimited NRIC', DELIMITED_NRIC_RE],
    ['generic 6-2-4 NRIC', GENERIC_6_2_4_NRIC_RE],
    ['compact 12-digit MyKad', COMPACT_NRIC_RE],
    ['NRIC keyword+digits', KEYWORD_NRIC_RE]
  ]) {
    const found = text.match(re);
    if (found) {
      matches.push({ label, samples: found });
    }
  }
  return matches;
}

function collectFiles(targetPath, out = []) {
  if (!fs.existsSync(targetPath)) return out;
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    const ext = path.extname(targetPath).toLowerCase();
    if (!BINARY_EXTS.has(ext)) out.push(targetPath);
    return out;
  }
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      collectFiles(path.join(targetPath, entry.name), out);
    }
  }
  return out;
}

test('pdpa scanner self-test: immune to Malaysian phone/date/hex/batch false positives and catches synthetic NRICs', () => {
  const benignSamples = [
    '+60183904690',
    '60183904690',
    '601112345678',
    '601512345678',
    '018-3904690',
    '6018-3904690',
    '20261119022234',
    '20261119',
    '20261119-02-3512',
    '#020617',
    '#120505011234',
    'M731-001-3:2021-102026',
    'S304265796',
    'public number 12345',
    '#' + ['850512', '10', '5678'].join('-'),
    'v1.' + ['850512', '10', '5678'].join('-'),
    'PDPA 2024: Candidate NRIC / MyKad number is masked and never stored in source code.'
  ];
  for (const sample of benignSamples) {
    assert.deepEqual(scanTextForNric(sample), [], `False positive on benign string: ${sample}`);
  }

  const syntheticHyphen = ['850512', '10', '5678'].join('-');
  const syntheticGeneric624 = ['991332', '10', '5678'].join('-');
  const syntheticSixSixHyphen = ['850512', '105678'].join('-');
  const syntheticSpaced = ['880115', '08', '5123'].join(' ');
  const syntheticUnderscoreDelim = 'ic_' + ['880115', '08', '5123'].join('-');
  const syntheticCompact = ['850512', '10', '5678'].join('');
  const synthetic2020Compact = ['200512', '10', '5678'].join('');
  const syntheticUnderscoreCompact = 'nric_' + ['790228', '01', '5432'].join('');
  const syntheticDotCompact = '.' + ['880115', '08', '5123'].join('');
  const synthetic1960Oct = ['601015', '08', '5123'].join('');
  const synthetic1960Dec = ['601231', '01', '5432'].join('');
  const syntheticKeyword = 'MyKad: ' + ['850512', '10', '5678'].join(' ');
  const syntheticIcNo = 'IC No: ' + ['1234', '5678'].join('');
  const syntheticIcNumber = 'IC Number: ' + ['8505', '12'].join('');
  const syntheticJsonQuoted = JSON.stringify({ nric: ['123456', '78', '9012'].join('') });
  const syntheticQuotedKeyword = 'No. K/P: "' + ['123456', '78', '9012'].join('') + '"';
  const syntheticMultilineKeyword = 'No. K/P:\n' + ['123456', '78', '9012'].join('');

  assert.ok(scanTextForNric(syntheticHyphen).length > 0, 'Must detect hyphenated NRIC');
  assert.ok(scanTextForNric(syntheticGeneric624).length > 0, 'Must detect generic 6-2-4 NRIC');
  assert.ok(scanTextForNric(syntheticSixSixHyphen).length > 0, 'Must detect 6-6 hyphenated NRIC');
  assert.ok(scanTextForNric(syntheticSpaced).length > 0, 'Must detect space-delimited NRIC');
  assert.ok(scanTextForNric(syntheticUnderscoreDelim).length > 0, 'Must detect underscore-prefixed delimited NRIC');
  assert.ok(scanTextForNric(syntheticCompact).length > 0, 'Must detect compact 12-digit NRIC');
  assert.ok(scanTextForNric(synthetic2020Compact).length > 0, 'Must detect 2020-born compact 12-digit NRIC');
  assert.ok(scanTextForNric(syntheticUnderscoreCompact).length > 0, 'Must detect underscore-prefixed compact NRIC');
  assert.ok(scanTextForNric(syntheticDotCompact).length > 0, 'Must detect dot-prefixed compact NRIC');
  assert.ok(scanTextForNric(synthetic1960Oct).length > 0, 'Must detect 1960 Oct compact NRIC');
  assert.ok(scanTextForNric(synthetic1960Dec).length > 0, 'Must detect 1960 Dec compact NRIC');
  assert.ok(scanTextForNric(syntheticKeyword).length > 0, 'Must detect keyword + spaced NRIC digits');
  assert.ok(scanTextForNric(syntheticIcNo).length > 0, 'Must detect IC No keyword+digits');
  assert.ok(scanTextForNric(syntheticIcNumber).length > 0, 'Must detect IC Number keyword+digits');
  assert.ok(scanTextForNric(syntheticJsonQuoted).length > 0, 'Must detect JSON-quoted NRIC keyword+digits');
  assert.ok(scanTextForNric(syntheticQuotedKeyword).length > 0, 'Must detect quoted keyword+digits');
  assert.ok(scanTextForNric(syntheticMultilineKeyword).length > 0, 'Must detect multiline keyword+digits');
});

test('pdpa scan: zero NRIC/IC patterns in src/, public/, index.html, CONTRIBUTING_PROJECTS.md, and dist/ (if built)', () => {
  const targets = [
    path.join(ROOT_DIR, 'src'),
    path.join(ROOT_DIR, 'public'),
    path.join(ROOT_DIR, 'index.html'),
    path.join(ROOT_DIR, 'CONTRIBUTING_PROJECTS.md'),
    path.join(ROOT_DIR, 'dist')
  ];

  const files = targets.flatMap((t) => collectFiles(t));
  assert.ok(files.length >= 10, 'Expected src/, public/, index.html, and CONTRIBUTING_PROJECTS.md files');

  const violations = [];
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const lineViolations = [];
    lines.forEach((lineText, idx) => {
      const hits = scanTextForNric(lineText);
      if (hits.length > 0) {
        lineViolations.push({
          file: path.relative(ROOT_DIR, filePath),
          line: idx + 1,
          hits
        });
      }
    });
    if (lineViolations.length > 0) {
      violations.push(...lineViolations);
    } else {
      const fullHits = scanTextForNric(content);
      if (fullHits.length > 0) {
        violations.push({
          file: path.relative(ROOT_DIR, filePath),
          line: 'multiline',
          hits: fullHits
        });
      }
    }
  }

  assert.deepEqual(violations, [], `PDPA NRIC pattern violations detected: ${JSON.stringify(violations)}`);
});

test('skm authenticity guard: serial S304265796 and NOSS M731-001-3:2021 present, TERAMPIL, never pending', () => {
  const credPath = path.join(ROOT_DIR, 'src', 'data', 'credentials.json');
  const cred = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  const skm = cred.nationalAccreditation;

  assert.equal(skm.certificateSerialNo, 'S304265796');
  assert.equal(skm.nossCode, 'M731-001-3:2021');
  assert.ok(skm.assessmentMethod.includes('TERAMPIL'));
  assert.equal(JSON.stringify(skm).toLowerCase().includes('pending'), false);

  const distAssetsDir = path.join(ROOT_DIR, 'dist', 'assets');
  if (fs.existsSync(distAssetsDir)) {
    const jsBundles = fs
      .readdirSync(distAssetsDir)
      .filter((name) => name.endsWith('.js'))
      .map((name) => fs.readFileSync(path.join(distAssetsDir, name), 'utf8'));
    if (jsBundles.length > 0) {
      const joined = jsBundles.join('\n');
      assert.ok(joined.includes('S304265796'), 'Built dist bundle must contain S304265796');
      assert.ok(joined.includes('M731-001-3:2021'), 'Built dist bundle must contain M731-001-3:2021');
      assert.ok(joined.includes('TERAMPIL'), 'Built dist bundle must contain TERAMPIL');
    }
  }
});
