import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, '../..');

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
  narrow: { width: 320, height: 568 },
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const STATIC_EXTENSIONS = new Set(Object.keys(MIME_TYPES));

const OPTIONAL_PORTFOLIO_ASSET_RE = /\/assets\/.*\.(png|jpe?g|webp|pdf)(?:[?#].*)?$/i;

export const CANONICAL_FUNNEL_STAGES = [
  { code: '01', en: 'Inbound Lead SLA', bm: 'SLA Prospek Masuk' },
  { code: '02', en: 'Paid Ads Guardrail', bm: 'Kawalan Iklan Berbayar' },
  { code: '03', en: 'Offline / WA CAPI', bm: 'CAPI WhatsApp / Kaunter' },
  { code: '04', en: 'Marketplace Net Cash', bm: 'Tunai Bersih Marketplace' },
  { code: '05', en: 'RFM Churn & LTV', bm: 'RFM Risiko Lari & LTV' },
];

export const CANONICAL_COURSERA_CODES = [
  { code: 'PKK1OZTW5Z2K', score: '93.23%' },
  { code: 'L5E1WNXCGV88', score: '95.00%' },
  { code: 'F7DOTAL8LOQG', score: '94.00%' },
  { code: '5FT36BCBNL88', score: '97.00%' },
  { code: 'VUE7PMUW1ULF', score: '99.37%' },
  { code: '8BOGKA88CA0H', score: '97.50%' },
];

export const CANONICAL_CASE_STUDIES = [
  { id: 'CS-01', client: 'Radhi Fruits 4690', period: 'Oct 2021 – Present', bullets: 4, asset: '/assets/case-radhi-fruits.png' },
  { id: 'CS-02', client: 'PedalHaus Chukai', period: 'May 2026 – Present', bullets: 3, asset: '/assets/case-pedalhaus.png' },
  { id: 'CS-03', client: 'School Van Service, Binjai', period: 'Feb 2024 – Feb 2025', bullets: 2, asset: '/assets/case-school-van.png' },
];

export const CANONICAL_OPERATIONAL_ORGS = [
  'KMI Kuantan Medical Centre',
  'Illingworth Research Group',
  'Kaneka Malaysia',
  'Swift Integrated Logistics',
  'MISC Integrated Logistics',
];

export const INDONESIAN_FORBIDDEN_RE =
  /\b(dasbor|laba\s+bersih|peramban|peladen|(?:di|ter|me(?:ng)?|peng)?unduh(?:an)?|sertifikat|tautan|kartu\s+skor|antarmuka|pencarian|kata\s+sandi)\b/gi;

export function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function resolveRepoRoot() {
  return REPO_ROOT;
}

export function resolveDistDir(customDistDir) {
  const candidate = customDistDir
    ? path.resolve(customDistDir)
    : process.env.E2E_DIST_DIR
      ? path.resolve(process.env.E2E_DIST_DIR)
      : path.join(REPO_ROOT, 'dist');

  const indexHtml = path.join(candidate, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    throw new Error(
      `Built dist/index.html not found at ${indexHtml}. Run "npm run build" first (or set E2E_DIST_DIR to a built directory).`
    );
  }
  return candidate;
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      srv.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

async function waitForHttp200(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry until timeout
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Timed out waiting for server readiness at ${url}`);
}

export async function startDistServer({ distDir, port } = {}) {
  const resolvedDist = resolveDistDir(distDir);
  const requestedPort = port !== undefined ? Number(port) : Number(process.env.E2E_PORT || 0);

  if (process.env.E2E_USE_VITE_PREVIEW === '1') {
    const previewPort = requestedPort > 0 ? requestedPort : await getFreePort();
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = spawn(
      npxCmd,
      ['vite', 'preview', '--host', '127.0.0.1', '--port', String(previewPort), '--strictPort'],
      {
        cwd: path.dirname(resolvedDist),
        stdio: 'ignore',
        windowsHide: true,
      }
    );
    const baseUrl = `http://127.0.0.1:${previewPort}`;
    try {
      await waitForHttp200(baseUrl, 15000);
    } catch (err) {
      child.kill();
      throw err;
    }
    return {
      baseUrl,
      distDir: resolvedDist,
      async close() {
        if (!child.killed) child.kill();
      },
    };
  }

  const indexPath = path.join(resolvedDist, 'index.html');
  const distPrefix = resolvedDist.endsWith(path.sep) ? resolvedDist : resolvedDist + path.sep;

  const server = http.createServer((req, res) => {
    const method = (req.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      const body = Buffer.from('Method Not Allowed');
      res.writeHead(405, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': String(body.length),
        'Cache-Control': 'no-store',
      });
      res.end(method === 'HEAD' ? undefined : body);
      return;
    }

    const rawUrl = (req.url || '/').split('?')[0].split('#')[0];
    let decodedPath;
    try {
      decodedPath = decodeURIComponent(rawUrl);
    } catch {
      const body = Buffer.from('Bad Request');
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': String(body.length) });
      res.end(method === 'HEAD' ? undefined : body);
      return;
    }

    if (decodedPath.includes('\0')) {
      const body = Buffer.from('Forbidden');
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': String(body.length) });
      res.end(method === 'HEAD' ? undefined : body);
      return;
    }

    const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
    const candidatePath = path.resolve(resolvedDist, relativePath);

    if (candidatePath !== resolvedDist && !candidatePath.startsWith(distPrefix)) {
      const body = Buffer.from('Forbidden');
      res.writeHead(403, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': String(body.length),
        'Cache-Control': 'no-store',
      });
      res.end(method === 'HEAD' ? undefined : body);
      return;
    }

    let fileToServe = null;
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      fileToServe = candidatePath;
    } else {
      const ext = path.extname(decodedPath).toLowerCase();
      const isAssetOrStatic = decodedPath.startsWith('/assets/') || (ext !== '' && STATIC_EXTENSIONS.has(ext)) || ext !== '';
      if (isAssetOrStatic) {
        const body = Buffer.from('Not Found');
        res.writeHead(404, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Length': String(body.length),
          'Cache-Control': 'no-store',
        });
        res.end(method === 'HEAD' ? undefined : body);
        return;
      }
      fileToServe = indexPath;
    }

    const ext = path.extname(fileToServe).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(fileToServe);

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': String(content.length),
      'Cache-Control': 'no-store',
    });
    res.end(method === 'HEAD' ? undefined : content);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(requestedPort, '127.0.0.1', resolve);
  });

  const addr = server.address();
  const actualPort = typeof addr === 'object' && addr ? addr.port : requestedPort;

  return {
    baseUrl: `http://127.0.0.1:${actualPort}`,
    distDir: resolvedDist,
    async close() {
      await new Promise((resolve) => server.close(() => resolve()));
    },
  };
}

export async function loadPlaywright() {
  const candidates = [];

  try {
    const pkgPath = path.join(REPO_ROOT, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const req = createRequire(pkgPath);
      try {
        candidates.push(req.resolve('playwright'));
      } catch {
        // fallback below
      }
      try {
        candidates.push(req.resolve('playwright-core'));
      } catch {
        // fallback below
      }
    }
  } catch {
    // ignore createRequire error
  }

  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const linksDir = path.join(localAppData, 'ms-playwright', '.links');
  if (fs.existsSync(linksDir)) {
    for (const name of fs.readdirSync(linksDir)) {
      try {
        const linkedRoot = fs.readFileSync(path.join(linksDir, name), 'utf8').trim();
        for (const entry of ['index.mjs', 'index.js']) {
          const full = path.join(linkedRoot, entry);
          if (fs.existsSync(full)) candidates.push(full);
        }
      } catch {
        // ignore broken link file
      }
    }
  }

  const knownNpx = path.join(
    localAppData,
    'npm-cache',
    '_npx',
    'e41f203b7505f1fb',
    'node_modules',
    'playwright-core',
    'index.mjs'
  );
  if (fs.existsSync(knownNpx)) candidates.push(knownNpx);

  const npxCacheRoot = path.join(localAppData, 'npm-cache', '_npx');
  if (fs.existsSync(npxCacheRoot)) {
    for (const hashDir of fs.readdirSync(npxCacheRoot)) {
      const mjs = path.join(npxCacheRoot, hashDir, 'node_modules', 'playwright-core', 'index.mjs');
      if (fs.existsSync(mjs)) candidates.push(mjs);
    }
  }

  const seen = new Set();
  for (const entry of candidates) {
    if (!entry || seen.has(entry) || !fs.existsSync(entry)) continue;
    seen.add(entry);
    try {
      const mod = await import(pathToFileURL(entry).href);
      const chromium = mod.chromium ?? mod.default?.chromium;
      if (chromium) {
        return { playwright: mod, chromium, entryPath: entry };
      }
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    'Unable to locate Playwright or playwright-core. Install playwright or ensure cached playwright-core is available.'
  );
}

export function resolveExecutableCandidates(chromium) {
  const candidates = [];

  for (const envKey of ['E2E_EXECUTABLE_PATH', 'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']) {
    const val = process.env[envKey];
    if (val && fs.existsSync(val)) {
      candidates.push(val);
    }
  }

  try {
    const defaultExe = chromium.executablePath();
    if (defaultExe && fs.existsSync(defaultExe)) {
      candidates.push(undefined);
    }
  } catch {
    // ignore missing default browser
  }

  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const msPlaywrightDir = path.join(localAppData, 'ms-playwright');

  if (fs.existsSync(msPlaywrightDir)) {
    const entries = fs.readdirSync(msPlaywrightDir).sort().reverse();
    for (const dirName of entries) {
      if (dirName.startsWith('chromium-')) {
        const chromeExe = path.join(msPlaywrightDir, dirName, 'chrome-win64', 'chrome.exe');
        if (fs.existsSync(chromeExe)) candidates.push(chromeExe);
      }
    }
  }

  for (const sysExe of [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ]) {
    if (fs.existsSync(sysExe)) candidates.push(sysExe);
  }

  if (fs.existsSync(msPlaywrightDir)) {
    const entries = fs.readdirSync(msPlaywrightDir).sort().reverse();
    for (const dirName of entries) {
      if (dirName.startsWith('chromium_headless_shell-')) {
        for (const sub of [
          path.join('chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
          path.join('chrome-win64', 'chrome-headless-shell.exe'),
        ]) {
          const shellExe = path.join(msPlaywrightDir, dirName, sub);
          if (fs.existsSync(shellExe)) candidates.push(shellExe);
        }
      }
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const c of candidates) {
    const key = c === undefined ? '__DEFAULT__' : c.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(c);
    }
  }
  return deduped;
}

export async function launchBrowser() {
  const { chromium } = await loadPlaywright();
  const candidates = resolveExecutableCandidates(chromium);
  const errors = [];

  for (const executablePath of candidates) {
    try {
      const browser = await chromium.launch({
        headless: true,
        ...(executablePath ? { executablePath } : {}),
      });
      return browser;
    } catch (err) {
      errors.push(`${executablePath ?? 'playwright-default'}: ${err.message}`);
    }
  }

  throw new Error(`Failed to launch Chromium browser. Tried:\n${errors.join('\n')}`);
}

export function attachErrorTracking(page) {
  const errors = {
    pageErrors: [],
    unexpectedConsoleErrors: [],
    expectedAssetConsoleErrors: [],
    unexpectedRequestFailures: [],
    expectedAssetRequestFailures: [],
    unexpectedHttpErrors: [],
    expectedAssetHttpErrors: [],
    assertZeroUnexpected(contextLabel = 'page') {
      assert.deepEqual(
        errors.pageErrors,
        [],
        `[${contextLabel}] Unexpected pageerror(s): ${JSON.stringify(errors.pageErrors)}`
      );
      assert.deepEqual(
        errors.unexpectedConsoleErrors,
        [],
        `[${contextLabel}] Unexpected console.error(s): ${JSON.stringify(errors.unexpectedConsoleErrors)}`
      );
      assert.deepEqual(
        errors.unexpectedRequestFailures,
        [],
        `[${contextLabel}] Unexpected request failure(s): ${JSON.stringify(errors.unexpectedRequestFailures)}`
      );
      assert.deepEqual(
        errors.unexpectedHttpErrors,
        [],
        `[${contextLabel}] Unexpected HTTP >=400 response(s): ${JSON.stringify(errors.unexpectedHttpErrors)}`
      );
    },
  };

  page.on('pageerror', (err) => {
    errors.pageErrors.push(err?.stack || err?.message || String(err));
  });

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const locUrl = msg.location()?.url || '';
    const text = msg.text() || '';
    if (text.includes('Failed to load resource') && OPTIONAL_PORTFOLIO_ASSET_RE.test(locUrl)) {
      errors.expectedAssetConsoleErrors.push({ text, location: locUrl });
      return;
    }
    errors.unexpectedConsoleErrors.push({ text, location: locUrl });
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    const errorText = req.failure()?.errorText || 'unknown';
    if (errorText === 'net::ERR_ABORTED') return;
    if (OPTIONAL_PORTFOLIO_ASSET_RE.test(url)) {
      errors.expectedAssetRequestFailures.push({ url, errorText });
      return;
    }
    errors.unexpectedRequestFailures.push({ url, errorText });
  });

  page.on('response', (res) => {
    const status = res.status();
    if (status < 400) return;
    const url = res.url();
    if (OPTIONAL_PORTFOLIO_ASSET_RE.test(url)) {
      errors.expectedAssetHttpErrors.push({ url, status });
      return;
    }
    errors.unexpectedHttpErrors.push({ url, status });
  });

  return errors;
}

export async function openTrackedPage(
  browser,
  url,
  { viewport = VIEWPORTS.desktop, waitUntil = 'load', acceptDownloads = true } = {}
) {
  const context = await browser.newContext({ viewport, acceptDownloads });
  const page = await context.newPage();
  const errors = attachErrorTracking(page);
  await page.goto(url, { waitUntil });
  await page.waitForLoadState('domcontentloaded');
  await page
    .waitForFunction(() => {
      const root = document.querySelector('#root');
      return !root || root.children.length > 0 || root.innerHTML.trim().length > 0;
    }, null, { timeout: 5000 })
    .catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(100);
  return {
    context,
    page,
    errors,
    async close() {
      await context.close();
    },
  };
}

export async function withTrackedPage(browser, url, opts, fn) {
  const handle = await openTrackedPage(browser, url, opts);
  try {
    return await fn(handle);
  } finally {
    await handle.close();
  }
}

export function loadGroundTruth(repoRoot = REPO_ROOT) {
  const readJsonIfExists = (relPath) => {
    const full = path.join(repoRoot, relPath);
    if (!fs.existsSync(full)) return null;
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  };

  const projects = readJsonIfExists('src/data/projects.json');
  const profile = readJsonIfExists('src/data/profile.json');
  const caseStudies = readJsonIfExists('src/data/caseStudies.json');
  const credentials = readJsonIfExists('src/data/credentials.json');
  const operationalHistory = readJsonIfExists('src/data/operationalHistory.json');
  const i18n = readJsonIfExists('src/data/i18n.json');

  const expectedSystems = process.env.E2E_EXPECTED_SYSTEMS
    ? Number(process.env.E2E_EXPECTED_SYSTEMS)
    : Array.isArray(projects)
      ? projects.length
      : 5;

  const effectiveProjects = Array.isArray(projects)
    ? projects
    : [
        { id: 'PRJ-01', stageCode: '01', category: 'RevOps & Lead Routing' },
        { id: 'PRJ-02', stageCode: '02', category: 'Ad Ops & Guardrail' },
        { id: 'PRJ-03', stageCode: '05', category: 'Retention & LTV' },
        { id: 'PRJ-04', stageCode: '03', category: 'Offline & WhatsApp CAPI' },
        { id: 'PRJ-05', stageCode: '04', category: 'Social Commerce & Affiliate' },
      ];

  const stageCounts = CANONICAL_FUNNEL_STAGES.map((stage) => ({
    ...stage,
    count: effectiveProjects.filter((p) => p.stageCode === stage.code).length,
  }));

  return {
    expectedSystems,
    stageCounts,
    projects: effectiveProjects,
    profile,
    caseStudies,
    credentials,
    operationalHistory,
    i18n,
    hasSourceData: Array.isArray(projects),
  };
}

export function getNavbar(page) {
  return page.locator('header, nav').first();
}

export async function findFirstVisible(locator) {
  const count = await locator.count();
  for (let i = 0; i < count; i++) {
    const item = locator.nth(i);
    if (await item.isVisible()) return item;
  }
  return null;
}

export async function findLastVisible(locator) {
  const count = await locator.count();
  for (let i = count - 1; i >= 0; i--) {
    const item = locator.nth(i);
    if (await item.isVisible()) return item;
  }
  return null;
}

export async function getCurrentLanguage(page) {
  return page.evaluate(() => {
    const text = document.body?.innerText || '';
    if (/Pengamal Pemasaran Digital|Tunai Bersih Sebenar|SLA Prospek Masuk/i.test(text)) return 'bm';
    if (/Digital Marketing Practitioner|Realized Net Cash|Inbound Lead SLA/i.test(text)) return 'en';
    const lang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
    if (lang.startsWith('ms') || lang.startsWith('bm')) return 'bm';
    return 'en';
  });
}

export async function switchLanguage(page, targetLang) {
  const desired = targetLang.toLowerCase() === 'bm' ? 'bm' : 'en';
  const current = await getCurrentLanguage(page);
  if (current === desired) return;

  const header = getNavbar(page);
  const dualTargetRe =
    desired === 'bm'
      ? /^(BM|Bahasa Melayu|Malay|MS)$|Switch language to (?:Bahasa Melayu|Malay|BM)|Tukar bahasa ke Bahasa Melayu/i
      : /^(EN|English)$|Switch language to English|Tukar bahasa ke Bahasa Inggeris/i;

  let clicked = false;
  for (const scope of [header, page]) {
    const dualBtn = await findFirstVisible(scope.getByRole('button', { name: dualTargetRe }));
    if (dualBtn) {
      await dualBtn.click();
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    const singleToggleRe = /EN\s*\|\s*BM|BM\s*\|\s*EN|Bahasa|English|Switch language|Tukar bahasa/i;
    for (const scope of [header, page]) {
      const toggleBtn = await findFirstVisible(scope.getByRole('button', { name: singleToggleRe }));
      if (toggleBtn) {
        await toggleBtn.click();
        clicked = true;
        break;
      }
    }
  }

  if (!clicked) {
    throw new Error(`Could not find visible language toggle button to switch to "${desired}".`);
  }

  await page.waitForFunction(
    (exp) => {
      const text = document.body?.innerText || '';
      if (exp === 'bm') {
        return /Pengamal Pemasaran Digital|Tunai Bersih Sebenar|SLA Prospek Masuk/i.test(text);
      }
      return /Digital Marketing Practitioner|Realized Net Cash|Inbound Lead SLA/i.test(text);
    },
    desired,
    { timeout: 5000 }
  );
}

export function getFunnelStageButton(page, code, stageMeta = null) {
  const meta = stageMeta || CANONICAL_FUNNEL_STAGES.find((s) => s.code === code);
  if (!meta) throw new Error(`Unknown funnel stage code: ${code}`);
  const pattern = new RegExp(
    `(?:\\b0?${Number(code)}\\b.*(?:${escapeRegExp(meta.en)}|${escapeRegExp(meta.bm)})|(?:${escapeRegExp(meta.en)}|${escapeRegExp(meta.bm)}))`,
    'i'
  );
  return page.locator('main').getByRole('button', { name: pattern }).first();
}

export function getAllStagesButton(page) {
  return page
    .locator('main')
    .getByRole('button', {
      name: /^(all(\s+(stages|systems))?|semua(\s+(peringkat|sistem))?)(\s*\(\d+\))?$/i,
    })
    .first();
}

export async function getSearchInput(page) {
  const main = page.locator('main');
  const candidates = [
    main.getByRole('searchbox'),
    main.getByPlaceholder(/search|cari|filter|tapis|stack|system|sistem/i),
    main.getByLabel(/search|cari/i),
    main.locator('input[type="search"], input[type="text"], input:not([type])'),
  ];
  for (const loc of candidates) {
    const visible = await findFirstVisible(loc);
    if (visible) return visible;
  }
  for (const loc of candidates) {
    if ((await loc.count()) > 0) return loc.first();
  }
  throw new Error('Could not locate Systems Registry search input.');
}

export async function selectCategoryFilter(page, category) {
  const main = page.locator('main');
  const selectLoc = await findFirstVisible(main.locator('select'));
  if (selectLoc) {
    const matchedValue = await selectLoc.evaluate((sel, target) => {
      const lower = target.toLowerCase();
      for (const opt of sel.options) {
        if (opt.value.toLowerCase() === lower || opt.text.toLowerCase().includes(lower)) {
          return opt.value;
        }
      }
      return null;
    }, category);
    if (matchedValue !== null) {
      await selectLoc.selectOption(matchedValue);
      return;
    }
  }

  const pillBtn = await findFirstVisible(main.getByRole('button', { name: new RegExp(escapeRegExp(category), 'i') }));
  if (pillBtn) {
    await pillBtn.click();
    return;
  }

  throw new Error(`Could not find category filter control for "${category}".`);
}

export function getRegistrySection(page) {
  const searchSel = 'input[type="search"], input[type="text"], input:not([type]), [role="searchbox"]';
  return page
    .locator('main section, main > div')
    .filter({ has: page.locator(searchSel) })
    .filter({ hasNot: page.locator('h1') })
    .last();
}

export async function getVisibleProjectIds(page) {
  return page.evaluate(() => {
    const isVisible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const searchSel = 'input[type="search"], input[type="text"], input:not([type]), [role="searchbox"]';
    const hasRegistryControls = (el) =>
      Boolean(el && (el.querySelector(searchSel) || el.querySelector('article, [data-project-id]')));

    const isHeroOrOtherSection = (el) => {
      if (!el) return true;
      if (el.querySelector('h1')) return true;
      const txt = el.textContent || '';
      if (/S304265796/.test(txt) && !el.querySelector(searchSel)) return true;
      if (/Radhi Fruits 4690/.test(txt) && !el.querySelector(searchSel)) return true;
      return false;
    };

    const candidateRoots = [
      document.querySelector('#systems'),
      ...Array.from(document.querySelectorAll('main section')),
      ...Array.from(document.querySelectorAll('[id*="system" i], [id*="registry" i]')),
    ].filter(Boolean);

    const validCandidates = candidateRoots.filter((cand) => isVisible(cand) && !isHeroOrOtherSection(cand));
    let registryRoot =
      validCandidates.find((cand) => cand.id === 'systems') ||
      validCandidates.find((cand) => hasRegistryControls(cand)) ||
      validCandidates.find((cand) => /\bPRJ-\d{2,}\b/.test(cand.textContent || '')) ||
      null;
    if (!registryRoot) {
      registryRoot = document.querySelector('main') || document.body;
    }

    const isInsideAttributionOrProse = (el) => {
      let curr = el;
      while (curr && curr !== registryRoot) {
        if (
          curr.querySelector(searchSel) ||
          curr.querySelector('article, [data-project-id], [role="article"]') ||
          curr.querySelectorAll('button, [role="button"]').length >= 2
        ) {
          curr = curr.parentElement;
          continue;
        }
        if (
          typeof curr.matches === 'function' &&
          curr.matches('.notice, .single-notice, [class*="attribution" i], [class*="notice" i]')
        ) {
          return true;
        }
        const t = curr.textContent || '';
        const matches = new Set(t.match(/\bPRJ-\d{2,}\b/g) || []);
        if (
          /Honest Attribution|Sempadan Atribusi|PRJ-\d{2,}\s*(?:through|hingga|to|\.\.|[\u2013\u2014\-])\s*PRJ-\d{2,}/i.test(t) &&
          (matches.size > 1 || curr.tagName === 'P')
        ) {
          return true;
        }
        curr = curr.parentElement;
      }
      return false;
    };

    const seen = new Set();

    const semanticCards = Array.from(
      registryRoot.querySelectorAll('article, [data-project-id], [role="article"]')
    ).filter((el) => {
      if (!isVisible(el)) return false;
      if (el.closest('[role="dialog"], [aria-modal="true"], header, nav, footer')) return false;
      if (isInsideAttributionOrProse(el)) return false;
      return true;
    });

    if (semanticCards.length > 0) {
      for (const card of semanticCards) {
        const attrId = card.getAttribute('data-project-id');
        if (attrId && /^PRJ-\d{2,}$/.test(attrId.trim())) {
          seen.add(attrId.trim());
          continue;
        }
        const matches = Array.from(new Set((card.innerText || card.textContent || '').match(/\bPRJ-\d{2,}\b/g) || []));
        if (matches.length === 1) {
          seen.add(matches[0]);
        }
      }
      if (seen.size > 0) return Array.from(seen).sort();
    }

    const allEls = Array.from(registryRoot.querySelectorAll('div, li, button, a, [role="button"], span, code'));
    for (const el of allEls) {
      if (!isVisible(el)) continue;
      if (el.closest('[role="dialog"], [aria-modal="true"], header, nav, footer')) continue;
      if (el.tagName === 'P' || el.closest('p')) continue;
      if (isInsideAttributionOrProse(el)) continue;
      const txt = el.innerText || el.textContent || '';
      const matches = Array.from(new Set(txt.match(/\bPRJ-\d{2,}\b/g) || []));
      if (matches.length !== 1) continue;
      seen.add(matches[0]);
    }

    return Array.from(seen).sort();
  });
}

export function getProjectCards(page) {
  return page
    .locator('main article, main [data-project-id], main [role="article"]')
    .filter({ hasText: /\bPRJ-\d{2,}\b/ });
}

export async function openProjectModal(page, projectId) {
  const located = await page.evaluate((pid) => {
    document.querySelectorAll('[data-e2e-modal-trigger]').forEach((el) => el.removeAttribute('data-e2e-modal-trigger'));
    const isVisible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const searchSel = 'input[type="search"], input[type="text"], input:not([type]), [role="searchbox"]';
    const isHeroOrOther = (el) => {
      if (!el) return true;
      if (el.querySelector('h1')) return true;
      const txt = el.textContent || '';
      if (/S304265796/.test(txt) && !el.querySelector(searchSel)) return true;
      if (/Radhi Fruits 4690/.test(txt) && !el.querySelector(searchSel)) return true;
      return false;
    };

    const candidateRoots = [
      document.querySelector('#systems'),
      ...Array.from(document.querySelectorAll('main section')),
      ...Array.from(document.querySelectorAll('[id*="system" i], [id*="registry" i]')),
    ].filter(Boolean);

    const hasRegistryControls = (el) =>
      Boolean(el && (el.querySelector(searchSel) || el.querySelector('article, [data-project-id], [role="article"]')));
    const idRe = new RegExp(`\\b${pid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    const validCandidates = candidateRoots.filter((cand) => isVisible(cand) && !isHeroOrOther(cand));
    let registryRoot =
      validCandidates.find((cand) => cand.id === 'systems') ||
      validCandidates.find((cand) => hasRegistryControls(cand)) ||
      validCandidates.find((cand) => idRe.test(cand.textContent || '')) ||
      null;
    if (!registryRoot) registryRoot = document.querySelector('main') || document.body;

    const getUniqueIds = (el) => Array.from(new Set((el.innerText || el.textContent || '').match(/\bPRJ-\d{2,}\b/g) || []));

    const isAttribution = (el) => {
      let curr = el;
      while (curr && curr !== registryRoot) {
        if (
          curr.querySelector(searchSel) ||
          curr.querySelector('article, [data-project-id], [role="article"]') ||
          curr.querySelectorAll('button, [role="button"]').length >= 2
        ) {
          curr = curr.parentElement;
          continue;
        }
        if (
          typeof curr.matches === 'function' &&
          curr.matches('.notice, .single-notice, [class*="attribution" i], [class*="notice" i]')
        ) {
          return true;
        }
        const t = curr.textContent || '';
        const ids = getUniqueIds(curr);
        if (
          /Honest Attribution|Sempadan Atribusi|PRJ-\d{2,}\s*(?:through|hingga|to|\.\.|[\u2013\u2014\-])\s*PRJ-\d{2,}/i.test(t) &&
          (ids.length > 1 || curr.tagName === 'P')
        ) {
          return true;
        }
        curr = curr.parentElement;
      }
      return false;
    };

    const candidates = Array.from(
      registryRoot.querySelectorAll('article, [data-project-id], [role="article"], div, li, button, a, [role="button"]')
    ).filter((el) => {
      if (!isVisible(el)) return false;
      if (el.closest('[role="dialog"], [aria-modal="true"], header, nav, footer')) return false;
      if (el.tagName === 'P' || el.closest('p')) return false;
      if (isAttribution(el)) return false;
      const attrId = el.getAttribute('data-project-id');
      if (attrId) return attrId.trim() === pid;
      const ids = getUniqueIds(el);
      return ids.length === 1 && ids[0] === pid;
    });

    if (candidates.length === 0) return false;

    let card = candidates.find(
      (el) => el.tagName === 'ARTICLE' || el.hasAttribute('data-project-id') || el.getAttribute('role') === 'article'
    );
    if (!card) {
      const withTrigger = candidates.filter(
        (el) => el.matches('button, [role="button"], a') || el.querySelector('button, [role="button"], a')
      );
      if (withTrigger.length > 0) {
        card = withTrigger[withTrigger.length - 1];
      } else {
        card = candidates.find((el) => el.getBoundingClientRect().height >= 40) || candidates[0];
      }
    }

    let trigger = card;
    if (!card.matches('button, [role="button"]')) {
      const buttons = Array.from(card.querySelectorAll('button, [role="button"]')).filter(isVisible);
      if (buttons.length > 0) {
        trigger =
          buttons.find((b) => /inspect|detail|architecture|view|open|teliti|lihat|buka/i.test(b.textContent || '')) ||
          buttons[0];
      } else {
        const links = Array.from(card.querySelectorAll('a')).filter(isVisible);
        if (links.length > 0) trigger = links[0];
      }
    }

    trigger.setAttribute('data-e2e-modal-trigger', pid);
    return true;
  }, projectId);

  if (!located) {
    throw new Error(`Could not locate distinct project card for ${projectId}.`);
  }

  const triggerLoc = page.locator(`[data-e2e-modal-trigger="${projectId}"]`).first();
  await triggerLoc.click();
  await page.evaluate(() => {
    document.querySelectorAll('[data-e2e-modal-trigger]').forEach((el) => el.removeAttribute('data-e2e-modal-trigger'));
  });

  const dialog = page.locator('[role="dialog"], [aria-modal="true"]').first();
  await dialog.waitFor({ state: 'visible', timeout: 5000 });
  return dialog;
}

export async function closeModal(page, method = 'escape') {
  const dialog = page.locator('[role="dialog"], [aria-modal="true"]').first();
  if ((await dialog.count()) === 0) return;

  if (method === 'escape') {
    await page.keyboard.press('Escape');
  } else if (method === 'button') {
    let closeBtn = null;
    const labeledBtns = dialog.locator('button[aria-label], [role="button"][aria-label]');
    const lblCount = await labeledBtns.count();
    for (let i = 0; i < lblCount; i++) {
      const cand = labeledBtns.nth(i);
      if (!(await cand.isVisible())) continue;
      const ariaLbl = (await cand.getAttribute('aria-label')) || '';
      if (/\b(close|tutup|dismiss)\b/i.test(ariaLbl)) {
        closeBtn = cand;
        break;
      }
    }
    if (!closeBtn) {
      closeBtn = await findFirstVisible(
        dialog.getByRole('button', { name: /(?:\b(?:close|tutup|dismiss)\b|^[×✕x]$)/i })
      );
    }
    assert.ok(closeBtn, 'Could not locate modal Close button');
    await closeBtn.click();
  } else if (method === 'backdrop') {
    const vp = page.viewportSize() || VIEWPORTS.desktop;
    const box = await dialog.boundingBox();
    if (box && box.width >= vp.width * 0.85 && box.height >= vp.height * 0.85) {
      await page.mouse.click(8, 8);
    } else if (box && box.x > 16) {
      await page.mouse.click(Math.floor(box.x / 2), Math.floor(vp.height / 2));
    } else {
      await page.mouse.click(4, 4);
    }
  } else {
    throw new Error(`Unknown closeModal method: ${method}`);
  }

  await dialog.waitFor({ state: 'hidden', timeout: 5000 });
}

export function getCaseStudyClientPattern(cs, truth = null) {
  const names = [cs.client];
  const bmClient = truth?.i18n?.bm?.caseStudies?.clients?.[cs.client];
  if (bmClient && !names.includes(bmClient)) names.push(bmClient);
  if (cs.client === 'School Van Service, Binjai' && !names.includes('Perkhidmatan Van Sekolah, Binjai')) {
    names.push('Perkhidmatan Van Sekolah, Binjai');
  }
  return new RegExp(names.map(escapeRegExp).join('|'), 'i');
}

export function getCaseStudyCard(page, cs, truth = null) {
  const clientRe = getCaseStudyClientPattern(cs, truth);
  return page
    .locator('main article, main div')
    .filter({ hasText: clientRe })
    .filter({ has: page.locator('li') })
    .last();
}

export async function getCaseStudiesSection(page) {
  const found = await page.evaluate(() => {
    document.querySelectorAll('[data-e2e-case-studies]').forEach((el) => el.removeAttribute('data-e2e-case-studies'));
    const all = Array.from(document.querySelectorAll('main section, main div'));
    const candidates = all.filter((el) => {
      if (el.closest('[role="dialog"], [aria-modal="true"], header, nav, footer')) return false;
      const t = el.textContent || '';
      return /Radhi Fruits 4690/i.test(t) && /PedalHaus Chukai/i.test(t);
    });
    if (candidates.length === 0) return false;
    const nonWrapper = candidates.filter((el) => !el.querySelector('h1') && !/PRJ-01/.test(el.textContent || ''));
    const pool = nonWrapper.length > 0 ? nonWrapper : candidates;
    const sec = pool.filter((el) => el.tagName === 'SECTION');
    const chosen = sec.length > 0 ? sec[sec.length - 1] : pool[pool.length - 1];
    chosen.setAttribute('data-e2e-case-studies', '1');
    return true;
  });
  assert.ok(found, 'Could not locate Local Case Studies section');
  return page.locator('[data-e2e-case-studies="1"]').first();
}

export async function getSkmContainer(page) {
  const found = await page.evaluate(() => {
    document.querySelectorAll('[data-e2e-skm-card]').forEach((el) => el.removeAttribute('data-e2e-skm-card'));
    const all = Array.from(document.querySelectorAll('main section, main article, main div'));
    const candidates = all.filter((el) => {
      if (el.closest('[role="dialog"], [aria-modal="true"], header, nav, footer')) return false;
      const t = el.textContent || '';
      return t.includes('S304265796') && t.includes('M731-001-3:2021');
    });
    if (candidates.length === 0) return false;

    const nonHero = candidates.filter((el) => !el.querySelector('h1'));
    const withBatch = nonHero.filter((el) => (el.textContent || '').includes('M731-001-3:2021-102026'));
    const pool = withBatch.length > 0 ? withBatch : nonHero.length > 0 ? nonHero : candidates;

    let card = pool[pool.length - 1];
    while (card.parentElement && card.parentElement.closest('main') && card.parentElement.tagName !== 'MAIN') {
      const parent = card.parentElement;
      const pt = parent.textContent || '';
      if (
        parent.querySelector('h1') ||
        /coursera\.org|PKK1OZTW5Z2K|Universiti Malaysia Pahang|Radhi Fruits 4690|PRJ-01/i.test(pt)
      ) {
        break;
      }
      card = parent;
    }

    card.setAttribute('data-e2e-skm-card', '1');
    return true;
  });

  assert.ok(found, 'Could not locate SKM accreditation container (S304265796 + M731-001-3:2021)');
  return page.locator('[data-e2e-skm-card="1"]').first();
}

export async function getGovernanceSection(page) {
  const found = await page.evaluate(() => {
    document.querySelectorAll('[data-e2e-governance]').forEach((el) => el.removeAttribute('data-e2e-governance'));
    const all = Array.from(document.querySelectorAll('main section, main div'));
    const candidates = all.filter((el) => {
      if (el.closest('[role="dialog"], [aria-modal="true"], header, nav, footer')) return false;
      const t = el.textContent || '';
      return (
        /KMI Kuantan Medical Centre/i.test(t) &&
        (/Illingworth Research Group/i.test(t) || /MISC Integrated Logistics/i.test(t))
      );
    });
    if (candidates.length === 0) return false;
    const nonWrapper = candidates.filter((el) => !el.querySelector('h1') && !/Radhi Fruits 4690/i.test(el.textContent || ''));
    const pool = nonWrapper.length > 0 ? nonWrapper : candidates;
    const sec = pool.filter((el) => el.tagName === 'SECTION');
    const chosen = sec.length > 0 ? sec[sec.length - 1] : pool[pool.length - 1];
    chosen.setAttribute('data-e2e-governance', '1');
    return true;
  });

  assert.ok(found, 'Could not locate Governance section (KMI Kuantan Medical Centre)');
  return page.locator('[data-e2e-governance="1"]').first();
}

export async function expandAllGovernanceRoles(page) {
  const govSection = await getGovernanceSection(page);

  const collapsedButtons = govSection.locator('button[aria-expanded="false"]');
  const btnCount = await collapsedButtons.count();
  for (let i = 0; i < btnCount; i++) {
    const btn = govSection.locator('button[aria-expanded="false"]').first();
    if ((await btn.count()) > 0 && (await btn.isVisible())) {
      await btn.click();
    }
  }

  const collapsedDetails = govSection.locator('details:not([open]) > summary');
  const detCount = await collapsedDetails.count();
  for (let i = 0; i < detCount; i++) {
    const sum = govSection.locator('details:not([open]) > summary').first();
    if ((await sum.count()) > 0 && (await sum.isVisible())) {
      await sum.click();
    }
  }
}

export async function triggerFooterJsonExport(page) {
  const footer = page.locator('footer').first();
  let trigger = await findFirstVisible(
    footer.locator('button, a[download], [role="button"]').filter({ hasText: /export|json|muat turun|download/i })
  );
  if (!trigger) {
    trigger = await findFirstVisible(footer.getByRole('button', { name: /export|json|muat turun|download/i }));
  }
  if (!trigger) {
    trigger = await findFirstVisible(page.getByRole('button', { name: /export.*json|muat turun.*json/i }));
  }
  assert.ok(trigger, 'Footer JSON export button/link not found');

  const hadDialogBefore = (await page.locator('[role="dialog"], [aria-modal="true"]').count()) > 0;
  const existingPreTexts = await page
    .locator('pre, code, textarea')
    .evaluateAll((els) => els.map((el) => ('value' in el ? el.value : el.textContent) || ''));

  const readVisibleInlineJson = async () =>
    page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('pre, code, textarea, [role="dialog"] pre, [role="dialog"] textarea'));
      for (const el of nodes) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const txt = (('value' in el ? el.value : el.textContent) || '').trim();
        if (!txt.startsWith('{')) continue;
        try {
          const parsed = JSON.parse(txt);
          if (parsed && typeof parsed === 'object' && Array.isArray(parsed.projects)) {
            return { rawText: txt, parsed };
          }
        } catch {
          // continue checking
        }
      }
      return null;
    });

  const hadVisibleInlineJson = Boolean(await readVisibleInlineJson());

  const downloadPromise = page.waitForEvent('download', { timeout: 2500 }).catch(() => null);
  await trigger.click();
  const download = await downloadPromise;

  if (download) {
    const tempPath = await download.path();
    let rawText = '';
    if (tempPath && fs.existsSync(tempPath)) {
      rawText = fs.readFileSync(tempPath, 'utf8');
    } else {
      const stream = await download.createReadStream();
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      rawText = Buffer.concat(chunks).toString('utf8');
    }

    const parsed = JSON.parse(rawText);
    return {
      filename: download.suggestedFilename(),
      rawText,
      parsed,
    };
  }

  await page
    .waitForFunction(
      (prevTexts) => {
        const nodes = Array.from(document.querySelectorAll('pre, code, textarea, [role="dialog"] pre, [role="dialog"] textarea'));
        return nodes.some((el) => {
          const txt = ('value' in el ? el.value : el.textContent) || '';
          if (!txt.includes('{') || !txt.includes('"projects"')) return false;
          if (prevTexts.includes(txt)) {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          }
          return true;
        });
      },
      existingPreTexts,
      { timeout: 2500 }
    )
    .catch(() => {});

  let inlineJson = await readVisibleInlineJson();

  if (!inlineJson && hadVisibleInlineJson) {
    await trigger.click();
    await page
      .waitForFunction(() => {
        const nodes = Array.from(document.querySelectorAll('pre, code, textarea, [role="dialog"] pre, [role="dialog"] textarea'));
        return nodes.some((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return false;
          const txt = ('value' in el ? el.value : el.textContent) || '';
          return txt.includes('{') && txt.includes('"projects"');
        });
      }, null, { timeout: 2500 })
      .catch(() => {});
    inlineJson = await readVisibleInlineJson();
  }

  if (inlineJson) {
    if (!hadDialogBefore && (await page.locator('[role="dialog"], [aria-modal="true"]').count()) > 0) {
      await closeModal(page, 'escape').catch(() => {});
    }
    return {
      filename: 'inline-json-preview.json',
      rawText: inlineJson.rawText,
      parsed: inlineJson.parsed,
    };
  }

  throw new Error('Clicking Footer Export JSON trigger did not trigger a file download or render valid inline JSON.');
}

export async function assertMobileCardsFitViewport(page, cardLocator, expectedCount, maxWidth = 390, label = 'cards') {
  const count = await cardLocator.count();
  assert.ok(count >= expectedCount, `[${label}] Expected at least ${expectedCount} cards, found ${count}`);
  const issues = [];
  for (let i = 0; i < count; i++) {
    const card = cardLocator.nth(i);
    const box = await card.boundingBox();
    if (!box || box.width <= 0 || box.height <= 0) {
      issues.push({ index: i, reason: 'zero-or-missing-box', box });
      continue;
    }
    if (box.x < -1 || box.x + box.width > maxWidth + 1) {
      issues.push({ index: i, reason: 'exceeds-viewport-width', box });
    }
    const clippedParent = await card.evaluate((el, vpW) => {
      let curr = el.parentElement;
      while (curr && curr !== document.documentElement) {
        if (curr.clientWidth > 0 && curr.scrollWidth > curr.clientWidth + 1) {
          return {
            tag: curr.tagName,
            scrollWidth: curr.scrollWidth,
            clientWidth: curr.clientWidth,
            vpW,
          };
        }
        curr = curr.parentElement;
      }
      return null;
    }, maxWidth);
    if (clippedParent) {
      issues.push({ index: i, reason: 'overflow-x-clipped-container', clippedParent });
    }
  }
  assert.deepEqual(issues, [], `[${label}] Mobile viewport/overflow issues: ${JSON.stringify(issues)}`);
}

export async function getHeroKpiCards(page) {
  const count = await page.evaluate(() => {
    document.querySelectorAll('[data-e2e-hero-kpi]').forEach((el) => el.removeAttribute('data-e2e-hero-kpi'));
    const hero = document.querySelector('main section') || document.querySelector('main');
    if (!hero) return 0;

    const kpiMarkers = [
      /MarTech Systems Shipped|Sistem MarTech Disiapkan/i,
      /SKM Level 3 \(JPK\)|SKM Tahap 3 \(JPK\)/i,
      /6 Google Coursera Courses|6 Kursus Google Coursera/i,
      /Middleware Overhead|Kos Perantara/i,
    ];

    const isVisible = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width >= 80 && r.height >= 40;
    };

    const chosen = new Set();
    const allContainers = Array.from(hero.querySelectorAll('article, div, li')).filter(isVisible);

    for (const marker of kpiMarkers) {
      const matches = allContainers.filter((el) => {
        if (el.querySelector('h1')) return false;
        const t = el.innerText || el.textContent || '';
        if (!marker.test(t)) return false;
        const matchCount = kpiMarkers.filter((re) => re.test(t)).length;
        return matchCount === 1;
      });
      if (matches.length > 0) {
        // Outermost single-KPI container (first in DOM order among matches containing exactly 1 KPI marker)
        const card = matches[0];
        if (!chosen.has(card)) {
          chosen.add(card);
          card.setAttribute('data-e2e-hero-kpi', '1');
        }
      }
    }
    return chosen.size;
  });
  return { count, locator: page.locator('[data-e2e-hero-kpi="1"]') };
}

export async function getCourseraCards(page) {
  const count = await page.evaluate(() => {
    document.querySelectorAll('[data-e2e-coursera-card]').forEach((el) => el.removeAttribute('data-e2e-coursera-card'));
    const links = Array.from(document.querySelectorAll('a[href^="https://coursera.org/verify/"]'));
    const chosen = new Set();
    for (const link of links) {
      let curr = link;
      while (curr.parentElement && curr.parentElement.tagName !== 'MAIN' && curr.parentElement.tagName !== 'SECTION') {
        const parent = curr.parentElement;
        const innerLinks = parent.querySelectorAll('a[href^="https://coursera.org/verify/"]');
        if (innerLinks.length > 1) break;
        curr = parent;
      }
      if (!chosen.has(curr)) {
        chosen.add(curr);
        curr.setAttribute('data-e2e-coursera-card', '1');
      }
    }
    return chosen.size;
  });
  return { count, locator: page.locator('[data-e2e-coursera-card="1"]') };
}

export async function assertNoHorizontalOverflow(page, tolerance = 1) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  assert.ok(
    metrics.scrollWidth <= metrics.innerWidth + tolerance,
    `Horizontal overflow detected: scrollWidth=${metrics.scrollWidth} > innerWidth=${metrics.innerWidth}`
  );
  return metrics;
}

export async function assertNoBrokenVisibleImages(page) {
  const broken = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs
      .filter((img) => {
        const style = window.getComputedStyle(img);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        const rect = img.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;
        return !img.complete || img.naturalWidth === 0;
      })
      .map((img) => ({ src: img.getAttribute('src'), alt: img.getAttribute('alt') }));
  });
  assert.deepEqual(broken, [], `Broken visible <img> elements found: ${JSON.stringify(broken)}`);
}

export function scanTextForPdpaNric(text, sourceLabel = 'text') {
  const violations = [];
  const rules = [
    {
      rule: 'A_HYPHENATED_MYKAD',
      regex: /(?<![#\d.])\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])(?:([ -])\d{2}\1\d{4}|-\d{6})(?!\d)/g,
    },
    {
      rule: 'B_GENERIC_6_2_4',
      regex: /(?<![#\d.])\d{6}-\d{2}-\d{4}(?!\d)/g,
    },
    {
      rule: 'C_COMPACT_12_DIGIT_MYKAD',
      regex: /(?<![+#a-fA-F0-9])(?!601[15]\d)(?!202[4-9]|203\d)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])(?:0[1-9]|1[0-6]|[2-5]\d|6[0-8]|7[1-9]|8[2-9]|9[0-3]|9[89])\d{4}(?![a-fA-F0-9])/g,
    },
    {
      rule: 'D_KEYWORD_PROXIMITY_DIGITS',
      regex: /\b(?:no\.?\s*k\/?p|mykad|nric|ic\s*(?:no\.?|number|num)|kad\s*pengenalan)(?:(?:["']|\s*)[:#=\-]+\s*["']?\s*|\s+["']?)\d{4,}(?:[- ]\d{2,4})*/gi,
    },
  ];

  for (const { rule, regex } of rules) {
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(text)) !== null) {
      const start = Math.max(0, m.index - 24);
      const end = Math.min(text.length, m.index + m[0].length + 24);
      violations.push({
        rule,
        match: m[0],
        source: sourceLabel,
        snippet: text.slice(start, end).replace(/\s+/g, ' '),
      });
    }
  }
  return violations;
}

export function scanDirectoryForPdpaNric(dirPath) {
  const textExts = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt', '.md']);
  const violations = [];

  function walk(curr) {
    for (const entry of fs.readdirSync(curr, { withFileTypes: true })) {
      const full = path.join(curr, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        walk(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!textExts.has(ext)) continue;
        const content = fs.readFileSync(full, 'utf8');
        violations.push(...scanTextForPdpaNric(content, path.relative(dirPath, full)));
      }
    }
  }

  walk(dirPath);
  return violations;
}

export function scanTextForIndonesianTerms(text, sourceLabel = 'text') {
  const matches = [];
  INDONESIAN_FORBIDDEN_RE.lastIndex = 0;
  let m;
  while ((m = INDONESIAN_FORBIDDEN_RE.exec(text)) !== null) {
    matches.push({ term: m[0], source: sourceLabel, index: m.index });
  }
  return matches;
}

export function scanDirectoryForIndonesianTerms(dirPath) {
  const textExts = new Set(['.html', '.js', '.mjs', '.json']);
  const matches = [];
  function walk(curr) {
    for (const entry of fs.readdirSync(curr, { withFileTypes: true })) {
      const full = path.join(curr, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        walk(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!textExts.has(ext)) continue;
        const content = fs.readFileSync(full, 'utf8');
        matches.push(...scanTextForIndonesianTerms(content, path.relative(dirPath, full)));
      }
    }
  }
  walk(dirPath);
  return matches;
}

export function parseRgb(colorStr) {
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(colorStr || '');
  if (!m) return null;
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
}

export function relativeLuminance({ r, g, b }) {
  const toLinear = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export async function runIsolatedPrj06Probe(browser, fn, { missingProcessVisual = false } = {}) {
  const srcProjectsPath = path.join(REPO_ROOT, 'src', 'data', 'projects.json');
  const srcNodeModules = path.join(REPO_ROOT, 'node_modules');
  if (!fs.existsSync(srcProjectsPath) || !fs.existsSync(srcNodeModules)) {
    throw new Error(
      `Cannot run isolated PRJ-06 rebuild probe: missing ${srcProjectsPath} or ${srcNodeModules}.`
    );
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-prj06-'));
  const tempNodeModules = path.join(tempDir, 'node_modules');
  let server = null;

  try {
    fs.cpSync(REPO_ROOT, tempDir, {
      recursive: true,
      filter: (src) => {
        const rel = path.relative(REPO_ROOT, src);
        if (!rel) return true;
        const top = rel.split(path.sep)[0];
        return top !== 'node_modules' && top !== 'dist' && top !== '.git' && top !== 'tests';
      },
    });

    fs.symlinkSync(srcNodeModules, tempNodeModules, 'junction');

    const tempProjectsPath = path.join(tempDir, 'src', 'data', 'projects.json');
    const projects = JSON.parse(fs.readFileSync(tempProjectsPath, 'utf8'));

    const prj06 = {
      id: 'PRJ-06',
      stageCode: '02',
      funnelStageName: { en: 'Paid Ads Guardrail', bm: 'Kawalan Iklan Berbayar' },
      category: 'Ad Ops & Guardrail',
      statusBadge: 'Sandbox Stress-Test Validated',
      title: {
        en: 'Creative Fatigue Velocity & Budget Reallocation Sentinel',
        bm: 'Pemantau Kelesuan Kreatif & Agihan Semula Bajet Iklan',
      },
      headlineMetric: '100% Automated Fatigue Guardrail',
      commercialLeak: {
        en: 'Silent CTR decay on scaling ad sets draining acquisition budget before weekly manual reviews.',
        bm: 'Penurunan CTR secara senyap pada set iklan aktif menyebabkan pembaziran bajet sebelum semakan mingguan.',
      },
      deterministicGate: {
        en: 'Deterministic 7-day rolling CTR decay threshold and minimum 1,500-impression statistical floor.',
        bm: 'Ambang kejatuhan CTR 7 hari deterministik serta lantai statistik minimum 1,500 impresi.',
      },
      boundedAiRole: {
        en: 'Drafts new hook test matrices strictly after deterministic fatigue trigger fires.',
        bm: 'Menjana matriks ujian cangkuk kreatif baharu hanya selepas pencetus kelesuan deterministik diaktifkan.',
      },
      validatedOutcome: {
        en: 'Zero premature pauses on low-volume tests with automated Slack/Telegram budget shift alerts.',
        bm: 'Tiada pemberhentian pramatang pada ujian volum rendah dengan amaran agihan bajet automatik.',
      },
      stack: ['Meta Marketing API', 'Google Sheets', 'Apps Script', 'Gemini API', 'Telegram Bot'],
      pipelineNodes: [
        'Meta Insights Ingestion',
        '1,500 Impr + CTR Decay Gate',
        'Hook Matrix AI Drafter',
        'Zero-PII Ad Creative Mart',
        'Telegram Reallocation Alert',
      ],
      lookerUrl: '',
      liveAppUrl: '',
      repoUrl: 'https://github.com/faizrobiah4690-design',
      ...(missingProcessVisual ? { processVisual: '/assets/prj-06-nonexistent-diagram.png' } : {}),
    };

    projects.push(prj06);
    fs.writeFileSync(tempProjectsPath, JSON.stringify(projects, null, 2), 'utf8');

    const viteBin = path.join(tempNodeModules, 'vite', 'bin', 'vite.js');
    execFileSync(process.execPath, [viteBin, 'build'], {
      cwd: tempDir,
      stdio: 'pipe',
      encoding: 'utf8',
    });

    const tempDistDir = path.join(tempDir, 'dist');
    server = await startDistServer({ distDir: tempDistDir, port: 0 });
    return await fn({
      baseUrl: server.baseUrl,
      tempDir,
      tempDistDir,
      prj06,
      totalSystems: projects.length,
    });
  } finally {
    if (server) {
      await server.close();
    }
    if (fs.existsSync(tempNodeModules)) {
      fs.unlinkSync(tempNodeModules);
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
