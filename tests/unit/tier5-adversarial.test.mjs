import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer as createViteServer } from 'vite';

import { FUNNEL_STAGES, computePortfolioMetrics } from '../../src/utils/metrics.js';
import { localize, localizeText, safeLookup } from '../../src/utils/i18n.js';
import { isSafeExternalUrl, normalizeExternalUrl } from '../../src/utils/urlSafety.js';
import {
  buildSanitizedPortfolioExport,
  downloadPortfolioJson
} from '../../src/utils/exportPortfolioJson.js';
import {
  closeModal,
  getVisibleProjectIds,
  launchBrowser,
  openProjectModal,
  openTrackedPage,
  scanTextForIndonesianTerms,
  scanTextForPdpaNric,
  startDistServer,
  triggerFooterJsonExport
} from '../e2e/helpers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT_DIR, relPath), 'utf8'));
}

const profile = readJson('src/data/profile.json');
const projects = readJson('src/data/projects.json');
const caseStudies = readJson('src/data/caseStudies.json');
const credentials = readJson('src/data/credentials.json');
const operationalHistory = readJson('src/data/operationalHistory.json');
const i18n = readJson('src/data/i18n.json');

function makePrj06() {
  return {
    ...structuredClone(projects[1]),
    id: 'PRJ-06',
    stageCode: '02',
    funnelStageName: { en: 'Paid Ads Guardrail', bm: 'Kawalan Iklan Berbayar' },
    category: 'Ad Ops & Guardrail',
    title: {
      en: 'Creative Fatigue & LCP Sentinel',
      bm: 'Pemantau Kelesuan Kreatif & LCP'
    }
  };
}

async function settleVitePendingWork(vite) {
  const envs = Object.values(vite?.environments || {});
  if (envs.length === 0) return;

  for (const env of envs) {
    if (!env) continue;
    if (env.waitForRequestsIdle) {
      await Promise.allSettled([env.waitForRequestsIdle()]);
    }
    if (env.depsOptimizer?.scanProcessing) {
      await Promise.allSettled([env.depsOptimizer.scanProcessing]);
    }
    const discovered = env.depsOptimizer?.metadata?.discovered;
    if (discovered) {
      await Promise.allSettled(Object.values(discovered).map((dep) => dep?.processing).filter(Boolean));
    }
    const optimized = env.depsOptimizer?.metadata?.optimized;
    if (optimized) {
      await Promise.allSettled(Object.values(optimized).map((dep) => dep?.processing).filter(Boolean));
    }
  }
}

test('GAP-01 / X1: metrics.js and CredentialsVault filter non-plain objects consistently', () => {
  const course0 = structuredClone(credentials.googleCourseraCourses[0]);
  const badProjects = [null, undefined, 'bad', 42, [], structuredClone(projects[0])];
  const badCredentials = {
    ...structuredClone(credentials),
    googleCourseraCourses: [null, [], 'bad', 123, course0]
  };

  const result = computePortfolioMetrics(badProjects, badCredentials);
  assert.equal(result.totalSystems, 1);
  assert.equal(result.courseraCount, 1);
  assert.equal(
    result.stageCounts.reduce((acc, s) => acc + s.count, 0),
    1
  );
});

test('GAP-02, GAP-03, R6: i18n safeLookup, localizeText, and top-level lang branch guard', () => {
  const sampleMap = { 'Ad Ops & Guardrail': 'Ad Ops & Kawalan Belanja' };
  for (const protoKey of ['toString', 'valueOf', 'constructor', 'hasOwnProperty', 'toLocaleString', '__proto__']) {
    assert.equal(safeLookup(sampleMap, protoKey), '');
  }
  assert.equal(safeLookup(sampleMap, 'Ad Ops & Guardrail'), 'Ad Ops & Kawalan Belanja');
  assert.equal(safeLookup(null, 'Ad Ops & Guardrail'), '');
  assert.equal(safeLookup([], '0'), '');

  assert.equal(localizeText({ en: { nested: 1 }, bm: { nested: 2 } }, 'en'), '');
  assert.equal(localizeText({ en: { nested: 1 }, bm: { nested: 2 } }, 'bm'), '');
  assert.equal(localizeText({ nested: 1 }, 'en'), '');
  assert.equal(localizeText(['a', 'b'], 'en'), '');
  assert.equal(localizeText(42, 'en'), '42');
  assert.equal(localizeText(null, 'en'), '');

  // R6: bare language keys must not leak entire dictionary tree
  assert.equal(localize('en', 'bm', i18n), 'en');
  assert.equal(localize('bm', 'en', i18n), 'bm');
  assert.equal(localizeText('en', 'bm', i18n), 'en');

  // Structured array lookups via localize() remain intact
  assert.deepStrictEqual(localize('hero.kpis', 'en', i18n), i18n.en.hero.kpis);
  assert.deepStrictEqual(localize('hero.kpis', 'bm', i18n), i18n.bm.hero.kpis);
});

test('GAP-05 & U4: urlSafety rejects credentialed URLs, malformed mailto hashes, and unsafe schemes', () => {
  assert.equal(normalizeExternalUrl('https://user:pass@evil.com/x'), '');
  assert.equal(normalizeExternalUrl('https://coursera.org@evil.com/verify/1'), '');
  assert.equal(normalizeExternalUrl('http://user:pass@example.com/path'), '');
  assert.equal(normalizeExternalUrl('foo.bar@evil.com/x'), '');
  assert.equal(normalizeExternalUrl('//evil.com'), '');
  assert.equal(normalizeExternalUrl('https://'), '');
  assert.equal(normalizeExternalUrl('mailto:bad'), '');
  assert.equal(normalizeExternalUrl('mailto:user@example.com#evil'), '');
  assert.equal(normalizeExternalUrl('mailto:user@example.com#evil?subject=hi'), '');
  assert.equal(normalizeExternalUrl('mailto:user@example.com/path'), '');
  assert.equal(normalizeExternalUrl('mailto:user@example.com\\path'), '');

  assert.equal(isSafeExternalUrl('https://user:pass@evil.com/x'), false);
  assert.equal(isSafeExternalUrl('https://coursera.org@evil.com/verify/1'), false);
  assert.equal(isSafeExternalUrl('mailto:user@example.com#evil'), false);
  assert.equal(isSafeExternalUrl('mailto:user@example.com/path'), false);
  assert.equal(isSafeExternalUrl('mailto:user@example.com\\path'), false);
  assert.equal(isSafeExternalUrl('//evil.com'), false);
  assert.equal(isSafeExternalUrl('https://'), false);
  assert.equal(isSafeExternalUrl('mailto:bad'), false);

  // Valid URLs still preserved
  assert.equal(normalizeExternalUrl('mailto:user@example.com'), 'mailto:user@example.com');
  assert.equal(
    normalizeExternalUrl('mailto:user@example.com?subject=Portfolio'),
    'mailto:user@example.com?subject=Portfolio'
  );
  assert.equal(isSafeExternalUrl('mailto:user@example.com?subject=Portfolio'), true);
});

test('GAP-07, R7, U4: exportPortfolioJson handles cycles, BigInt, object-key NRICs, dynamic Coursera count, and filename sanitization', () => {
  const synthDelim = ['850512', '10', '5678'].join('-');
  const synthSixSix = ['850512', '105678'].join('-');
  const synthIcNo = 'IC No: ' + ['1234', '5678'].join('');
  const synthIcNum = 'IC Number: ' + ['8505', '12'].join('');

  const circularProfile = { ...structuredClone(profile) };
  circularProfile.self = circularProfile;
  circularProfile.sharedObj = { tag: 'shared' };
  circularProfile.dupRef = circularProfile.sharedObj;
  circularProfile.big = 42n;
  circularProfile.nricNumber = 'secret-a';
  circularProfile.mykadNumber = 'secret-b';
  circularProfile.noKadPengenalan = 'secret-c';
  circularProfile[synthDelim] = 'key-leak';
  circularProfile.notes = `${synthIcNo} | ${synthIcNum} | ${synthSixSix}`;

  const eightCourses = [
    ...structuredClone(credentials.googleCourseraCourses),
    { ...structuredClone(credentials.googleCourseraCourses[0]), courseNumber: '07', verifyCode: 'TEST07' },
    { ...structuredClone(credentials.googleCourseraCourses[1]), courseNumber: '08', verifyCode: 'TEST08' }
  ];

  const payload = buildSanitizedPortfolioExport({
    profile: circularProfile,
    projects,
    caseStudies,
    credentials: { ...structuredClone(credentials), googleCourseraCourses: eightCourses },
    operationalHistory
  });

  assert.equal(payload.profile.self, '[Circular]');
  assert.deepStrictEqual(payload.profile.dupRef, { tag: 'shared' });
  assert.equal(payload.profile.big, '42');
  assert.equal(Object.hasOwn(payload.profile, 'nricNumber'), false);
  assert.equal(Object.hasOwn(payload.profile, 'mykadNumber'), false);
  assert.equal(Object.hasOwn(payload.profile, 'noKadPengenalan'), false);
  assert.equal(Object.hasOwn(payload.profile, synthDelim), false);
  assert.equal(Object.hasOwn(payload.profile, '[REDACTED-PDPA]'), true);
  assert.equal(payload.profile.notes.includes('12345678'), false);
  assert.equal(payload.profile.notes.includes('850512'), false);
  assert.equal(payload.profile.notes.includes(synthSixSix), false);
  assert.ok(payload.attributionScope.credentials.startsWith('8 '));

  // U4: downloadPortfolioJson mocked DOM filename sanitization & serialization
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const prevBlob = globalThis.Blob;
  const prevURL = globalThis.URL;

  const clickedLinks = [];
  let createdBlobText = '';
  let revokedUrl = '';
  try {
    globalThis.window = {};
    globalThis.Blob = class MockBlob {
      constructor(parts, opts) {
        this.parts = parts;
        this.type = opts?.type;
        createdBlobText = parts.join('');
      }
    };
    globalThis.URL = {
      createObjectURL: () => 'blob:mock-1',
      revokeObjectURL: (u) => {
        revokedUrl = u;
      }
    };
    globalThis.document = {
      body: {
        appendChild: () => {},
        removeChild: () => {}
      },
      createElement: () => ({
        style: {},
        click() {
          clickedLinks.push({ href: this.href, download: this.download });
        }
      })
    };

    const ok = downloadPortfolioJson({ ok: true }, 'bad/name:1');
    assert.equal(ok, true);
    assert.equal(clickedLinks.length, 1);
    assert.equal(clickedLinks[0].download, 'bad-name-1.json');
    assert.equal(clickedLinks[0].href, 'blob:mock-1');
    assert.deepStrictEqual(JSON.parse(createdBlobText), { ok: true });
    assert.equal(revokedUrl, '');
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDocument;
    globalThis.Blob = prevBlob;
    globalThis.URL = prevURL;
  }
});

test('U2 & U3: projects funnelStageName parity with FUNNEL_STAGES and CONTRIBUTING_PROJECTS.md PRJ-06 JSON validation', () => {
  const stageByCode = new Map(FUNNEL_STAGES.map((s) => [s.code, s]));
  for (const project of projects) {
    const stage = stageByCode.get(project.stageCode);
    assert.ok(stage, `Unknown stageCode ${project.stageCode} on ${project.id}`);
    assert.equal(project.funnelStageName.en, stage.en);
    assert.equal(project.funnelStageName.bm, stage.bm);
  }
  assert.deepStrictEqual(Object.keys(i18n.en.funnel.stages).sort(), FUNNEL_STAGES.map((s) => s.code));
  assert.deepStrictEqual(Object.keys(i18n.bm.funnel.stages).sort(), FUNNEL_STAGES.map((s) => s.code));

  const md = fs.readFileSync(path.join(ROOT_DIR, 'CONTRIBUTING_PROJECTS.md'), 'utf8');
  const jsonMatch = md.match(/```json\s*([\s\S]*?)```/);
  assert.ok(jsonMatch, 'Expected ```json block in CONTRIBUTING_PROJECTS.md');
  const prj06Snippet = JSON.parse(jsonMatch[1]);
  assert.equal(prj06Snippet.id, 'PRJ-06');
  assert.ok(stageByCode.has(prj06Snippet.stageCode));
  assert.equal(prj06Snippet.funnelStageName.en, stageByCode.get(prj06Snippet.stageCode).en);
  assert.equal(prj06Snippet.funnelStageName.bm, stageByCode.get(prj06Snippet.stageCode).bm);
  assert.equal(prj06Snippet.pipelineNodes.length, 5);
  assert.ok(isSafeExternalUrl(prj06Snippet.repoUrl));
});

test('SSR adversarial checks (U1, GAP-01..05, GAP-08e): Vite SSR renderToStaticMarkup resilience & counter sync', async () => {
  let ssrCacheDir = null;
  let vite = null;

  try {
    ssrCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tier5-vite-ssr-'));
    vite = await createViteServer({
      root: ROOT_DIR,
      cacheDir: ssrCacheDir,
      optimizeDeps: { noDiscovery: true },
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'custom',
      logLevel: 'error'
    });
    const { default: App } = await vite.ssrLoadModule('/src/App.jsx');
    const { default: HeroSection } = await vite.ssrLoadModule('/src/components/HeroSection.jsx');
    const { default: Navbar } = await vite.ssrLoadModule('/src/components/Navbar.jsx');
    const { default: ArchitectureModal } = await vite.ssrLoadModule('/src/components/ArchitectureModal.jsx');
    const { default: AssetSlot } = await vite.ssrLoadModule('/src/components/AssetSlot.jsx');
    const { default: CredentialsVault } = await vite.ssrLoadModule('/src/components/CredentialsVault.jsx');
    const { default: GovernanceAndBackground } = await vite.ssrLoadModule('/src/components/GovernanceAndBackground.jsx');
    const { default: SystemsRegistry } = await vite.ssrLoadModule('/src/components/SystemsRegistry.jsx');
    const { default: Footer } = await vite.ssrLoadModule('/src/components/Footer.jsx');

    const renderEl = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));

    // U1: SSR 5 -> 6 in EN & BM
    const ssr5En = renderEl(App);
    assert.ok(ssr5En.includes('5 Systems Shipped'));
    assert.ok(ssr5En.includes('Explore 5 Live Systems'));

    const extendedProjects = [...structuredClone(projects), makePrj06()];
    const ssr6En = renderEl(App, { initialData: { projects: extendedProjects, lang: 'en' } });
    assert.ok(ssr6En.includes('6 Systems Shipped'));
    assert.ok(ssr6En.includes('Explore 6 Live Systems'));
    assert.ok(ssr6En.includes('2 Systems'));

    const ssr6Bm = renderEl(App, { initialData: { projects: extendedProjects, lang: 'bm' } });
    assert.ok(ssr6Bm.includes('6 Sistem Disiapkan'));
    assert.ok(ssr6Bm.includes('Terokai 6 Sistem Aktif'));

    // GAP-01 / X1: SSR Hero KPI & CredentialsVault count sync on malformed array
    const badCreds = {
      ...structuredClone(credentials),
      googleCourseraCourses: [null, [], 'bad', structuredClone(credentials.googleCourseraCourses[0])]
    };
    const ssrSync = renderEl(App, { initialData: { credentials: badCreds, lang: 'en' } });
    assert.ok(ssrSync.includes('1 Google Coursera Courses'));
    assert.ok(ssrSync.includes('1 individually verified courses'));

    // GAP-02 / X2 / R1: Prototype-key collisions cause zero console.errors and render literals
    const capturedConsoleErrors = [];
    const origConsoleError = console.error;
    console.error = (...args) => {
      capturedConsoleErrors.push(args.map(String).join(' '));
    };
    try {
      const protoProject = {
        ...structuredClone(projects[0]),
        id: 'PRJ-99',
        category: 'toString',
        statusBadge: 'constructor',
        headlineMetric: 'valueOf'
      };
      const protoCase = {
        ...structuredClone(caseStudies[0]),
        period: 'toString',
        client: 'valueOf',
        sector: 'hasOwnProperty'
      };
      const protoCreds = {
        ...structuredClone(credentials),
        academicEducation: [{ qualification: 'toString', institution: 'UMP', period: '2022' }]
      };
      const protoHtml = renderEl(App, {
        initialData: {
          projects: [protoProject],
          caseStudies: [protoCase],
          credentials: protoCreds
        }
      });
      assert.ok(protoHtml.includes('>toString<'));
      assert.ok(protoHtml.includes('>constructor<'));
      assert.ok(protoHtml.includes('>valueOf<'));

      const modalProtoHtml = renderEl(ArchitectureModal, {
        project: protoProject,
        lang: 'en',
        t: i18n.en,
        onClose: () => {}
      });
      assert.ok(modalProtoHtml.includes('>constructor<'));
      assert.deepEqual(capturedConsoleErrors, []);
    } finally {
      console.error = origConsoleError;
    }

    // GAP-03 / X3: Nested object in {en, bm} or scalar slots does not crash or emit [object Object]
    const nestedAppHtml = renderEl(App, {
      initialData: {
        projects: [
          {
            ...structuredClone(projects[0]),
            title: { en: { nested: 1 }, bm: { nested: 2 } },
            stack: [{ en: { nested: 1 }, bm: 'x' }],
            pipelineNodes: [{ nested: 1 }, 'B', 'C', 'D', 'E']
          }
        ],
        credentials: {
          ...structuredClone(credentials),
          nationalAccreditation: {
            ...structuredClone(credentials.nationalAccreditation),
            certificateSerialNo: { nested: 1 }
          }
        }
      }
    });
    assert.equal(nestedAppHtml.includes('[object Object]'), false);

    const nestedGovHtml = renderEl(GovernanceAndBackground, {
      operationalHistory,
      lang: 'en',
      t: {
        ...structuredClone(i18n.en),
        governance: {
          ...structuredClone(i18n.en.governance),
          engineeringNonNegotiables: [null, { code: '01', title: { nested: 1 }, description: { nested: 2 } }]
        }
      }
    });
    assert.equal(nestedGovHtml.includes('[object Object]'), false);

    const nestedSysHtml = renderEl(SystemsRegistry, {
      filteredProjects: [null, structuredClone(projects[0])],
      totalSystems: 1,
      categories: ['RevOps & Lead Routing'],
      selectedStage: 'ALL',
      selectedCategory: 'ALL',
      searchQuery: '',
      onCategoryChange: () => {},
      onSearchChange: () => {},
      onResetFilters: () => {},
      onSelectProject: () => {},
      lang: 'en',
      t: i18n.en
    });
    assert.ok(nestedSysHtml.includes('PRJ-01'));

    const nestedCredHtml = renderEl(CredentialsVault, {
      credentials: {
        ...structuredClone(credentials),
        nationalAccreditation: {
          ...structuredClone(credentials.nationalAccreditation),
          nossCode: { nested: 1 }
        }
      },
      lang: 'en',
      t: i18n.en
    });
    assert.equal(nestedCredHtml.includes('[object Object]'), false);

    // GAP-04 / X5 / R8d: Undefined metrics, null items, Navbar undefined totalSystems & lang="ms"
    const undefHeroHtml = renderEl(HeroSection, {
      profile: null,
      lang: 'en',
      t: { ...structuredClone(i18n.en), hero: { ...i18n.en.hero, kpis: [null, { key: 'systems', value: '{count}', label: 'Systems', subtext: 'OK' }] } },
      metrics: undefined
    });
    assert.ok(undefHeroHtml.includes('Explore 0 Live Systems'));

    const navMsHtml = renderEl(Navbar, {
      lang: 'ms',
      onToggleLang: () => {},
      totalSystems: undefined,
      t: i18n.bm,
      profile
    });
    assert.ok(navMsHtml.includes('0 Sistem Disiapkan'));
    assert.ok(navMsHtml.includes('aria-label="Navigasi utama"'));

    // GAP-05 / R2 / Iter-7: AssetSlot rejects backslash, credentialed URLs, dot-segment traversal, encoded traversal & Vite internal prefixes
    for (const badSrc of [
      '/\\evil.com/x.png',
      '/\\\\evil.com/x.png',
      '/assets/sub\\evil.png',
      'https://coursera.org:pass@evil.com/x.png',
      '/../../etc/passwd',
      '/assets/../../secret.png',
      '/assets/../secret.png',
      '/assets/./secret.png',
      '/assets/%2e%2e/secret.png',
      '/assets/%2E%2E/secret.png',
      '/assets/%252e%252e/secret.png',
      '/@fs/C:/Windows/win.ini',
      '/@id/virtual:secret',
      '/%40fs/C:/Windows/win.ini'
    ]) {
      const slotHtml = renderEl(AssetSlot, { src: badSrc, kind: 'image', title: { nested: 1 } });
      assert.ok(slotHtml.includes('data-asset-slot=""'), `Expected empty data-asset-slot for ${badSrc}`);
      assert.equal(slotHtml.includes(badSrc), false, `Traversal input leaked into SSR HTML for ${badSrc}`);
      assert.equal(slotHtml.includes('[object Object]'), false);
    }

    // Valid local & external paths remain accepted by AssetSlot
    for (const [validSrc, validKind] of [
      ['/assets/resume-mohd-faiz-oct2026.pdf', 'pdf'],
      ['/assets/skm-level-3-cert.jpg', 'image'],
      ['https://example.com/img.png', 'image']
    ]) {
      const validHtml = renderEl(AssetSlot, { src: validSrc, kind: validKind, title: 'Valid Asset' });
      assert.ok(
        validHtml.includes(`data-asset-slot="${validSrc}"`),
        `Expected valid asset path ${validSrc} to be preserved`
      );
    }

    // ArchitectureModal with traversal processVisual neutralizes src and falls back cleanly to expectedVisualHint
    const modalTraversalHtml = renderEl(ArchitectureModal, {
      project: {
        ...structuredClone(projects[0]),
        processVisual: '/assets/../../secret.png'
      },
      lang: 'en',
      t: i18n.en,
      onClose: () => {}
    });
    assert.equal(modalTraversalHtml.includes('/assets/../../secret.png'), false);
    assert.equal(modalTraversalHtml.includes('secret.png'), false);
    assert.ok(modalTraversalHtml.includes('data-asset-slot="/assets/prj-01-architecture.png"'));

    const modalEncodedTraversalHtml = renderEl(ArchitectureModal, {
      project: {
        ...structuredClone(projects[0]),
        processVisual: { src: '/assets/%2e%2e/secret.png', caption: 'Visual' }
      },
      lang: 'en',
      t: i18n.en,
      onClose: () => {}
    });
    assert.equal(modalEncodedTraversalHtml.includes('secret.png'), false);
    assert.ok(modalEncodedTraversalHtml.includes('data-asset-slot="/assets/prj-01-architecture.png"'));

    // GAP-08e / R8c: 10+ pipelineNodes -> "10" (not "010"), and sanitized expectedVisualHint
    const modal10Html = renderEl(ArchitectureModal, {
      project: {
        ...structuredClone(projects[0]),
        id: '../../evil',
        processVisuals: undefined,
        pipelineNodes: Array.from({ length: 10 }, (_, idx) => `Node ${idx + 1}`)
      },
      lang: 'en',
      t: {
        ...structuredClone(i18n.en),
        modal: {
          ...structuredClone(i18n.en.modal),
          deterministicFormulas: [null, ...i18n.en.modal.deterministicFormulas]
        }
      },
      onClose: () => {}
    });
    assert.ok(modal10Html.includes('>10<'));
    assert.equal(modal10Html.includes('>010<'), false);
    assert.ok(modal10Html.includes('data-asset-slot="/assets/evil-architecture.png"'));
    assert.equal(modal10Html.includes('/assets/..'), false);

    // NEW-GAP-03: Footer renders BM profile fields & BM i18n copy when lang === 'bm'
    const ssrFooterBm = renderEl(App, {
      initialData: {
        lang: 'bm',
        profile: {
          ...structuredClone(profile),
          fullName: { en: 'Name EN', bm: 'Nama BM' },
          location: { en: 'Loc EN', bm: 'Lokasi BM' }
        }
      }
    });
    const footerSlice = ssrFooterBm.match(/<footer[\s\S]*?<\/footer>/)?.[0] || '';
    assert.ok(footerSlice.includes('Nama BM'));
    assert.ok(footerSlice.includes('Lokasi BM'));
    assert.equal(footerSlice.includes('Name EN'), false);
    assert.equal(footerSlice.includes('Loc EN'), false);

    // App.jsx:71: primitive i18n.en safely falls back to bundled i18nData.en
    const ssrPrimitiveI18n = renderEl(App, {
      initialData: {
        lang: 'en',
        i18n: { en: 'invalid-primitive', bm: i18n.bm }
      }
    });
    assert.ok(ssrPrimitiveI18n.includes('Explore 5 Live Systems'));

    // REM-GAP-02: Footer omits stray ' · ' separator on empty or partial profile
    const ssrFooterEmpty = renderEl(Footer, {
      profile: {},
      lang: 'en',
      t: i18n.en
    });
    assert.equal(ssrFooterEmpty.includes('<p class="text-sm text-slate-300">'), false);
    assert.equal(ssrFooterEmpty.includes('> · <'), false);

    const ssrFooterPartialName = renderEl(Footer, {
      profile: { fullName: 'Only Name' },
      lang: 'en',
      t: i18n.en
    });
    assert.ok(ssrFooterPartialName.includes('<p class="text-sm text-slate-300">Only Name</p>'));
    assert.equal(ssrFooterPartialName.includes('Only Name ·'), false);

    const ssrFooterPartialLoc = renderEl(Footer, {
      profile: { location: 'Only Location' },
      lang: 'en',
      t: i18n.en
    });
    assert.ok(ssrFooterPartialLoc.includes('<p class="text-sm text-slate-300">Only Location</p>'));
    assert.equal(ssrFooterPartialLoc.includes('· Only Location'), false);
  } finally {
    if (vite) {
      try {
        await settleVitePendingWork(vite);
      } catch {}
      try {
        await vite.close();
      } catch {}
    }
    if (ssrCacheDir) {
      try {
        fs.rmSync(ssrCacheDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
      } catch {}
    }
  }
});

test('helpers.mjs unit & synthetic DOM verification (D4b/D4b2, D4c, D2d, JSON3, H1a-H1c, H2)', async () => {
  // H1a-H1c: scanTextForPdpaNric accuracy
  assert.deepEqual(scanTextForPdpaNric('color: #120505011234;', 'hex'), []);
  assert.deepEqual(scanTextForPdpaNric('ts=20261119022234', 'ts'), []);
  assert.deepEqual(scanTextForPdpaNric('phone=+60183904690 018-3904690', 'phone'), []);

  const y2020 = ['200512', '10', '5678'].join('');
  assert.ok(scanTextForPdpaNric(y2020, 'y2020').length > 0, 'Must catch 2020-born 12-digit MyKad');

  const jsonQuoted = JSON.stringify({ nric: ['123456', '78', '9012'].join('') });
  assert.ok(scanTextForPdpaNric(jsonQuoted, 'json').length > 0, 'Must catch JSON-quoted NRIC');

  assert.ok(scanTextForPdpaNric('IC No: ' + ['1234', '5678'].join(''), 'icNo').length > 0);
  assert.ok(scanTextForPdpaNric(['850512', '105678'].join('-'), 'sixSix').length > 0);
  assert.deepEqual(scanTextForPdpaNric('#' + ['850512', '10', '5678'].join('-'), 'hash-delim'), []);
  assert.ok(scanTextForPdpaNric(['880115', '08', '5123'].join(' '), 'spaced-mykad').length > 0);

  // H2: INDONESIAN_FORBIDDEN_RE parity
  const indoHits = scanTextForIndonesianTerms(
    'Silakan mengunduh kartu skor melalui tautan pencarian antarmuka kata sandi.',
    'indo'
  );
  assert.ok(indoHits.length >= 6);

  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // D4b / D4b2: #funnel-map mentions PRJ-01 to PRJ-05 before #registry-no-systems-id
    await page.setContent(`
      <main>
        <section id="funnel-map">
          <p>Covers PRJ-01 to PRJ-05 across 5 stages.</p>
        </section>
        <section id="registry-no-systems-id">
          <input type="search" placeholder="Search" />
          <div data-project-id="PRJ-01">
            <h3>PRJ-01 Inbound</h3>
            <button type="button" onclick="document.getElementById('dlg').hidden = false">Inspect</button>
          </div>
          <div id="dlg" role="dialog" aria-modal="true" hidden>
            <button type="button" id="disclose" aria-label="Disclose Details">Disclose Details</button>
            <button type="button" id="real-close" aria-label="Close modal" onclick="document.getElementById('dlg').hidden = true">X</button>
          </div>
        </section>
      </main>
    `);

    const d4bIds = await getVisibleProjectIds(page);
    assert.deepEqual(d4bIds, ['PRJ-01']);
    await openProjectModal(page, 'PRJ-01');
    // D2d: word-boundary close skips "Disclose Details" and clicks "Close modal"
    await closeModal(page, 'button');
    assert.equal(await page.locator('#dlg').isVisible(), false);

    // D4c: Empty-state en-dash span & single-notice do not leak into getVisibleProjectIds
    await page.setContent(`
      <main>
        <section id="systems">
          <input type="search" value="nomatch" />
          <div class="notice">Attribution: <span>PRJ-01</span>–<span>PRJ-05+</span> sandbox systems.</div>
          <div class="single-notice">Note: PRJ-02 uses mock adapter.</div>
          <div>Empty state</div>
        </section>
      </main>
    `);
    assert.deepEqual(await getVisibleProjectIds(page), []);

    // JSON3: toggle-close inline <pre> works on consecutive triggerFooterJsonExport calls
    await page.setContent(`
      <footer>
        <button id="exp-btn" type="button">Export JSON</button>
        <pre id="exp-pre" hidden>{"projects":[{"id":"PRJ-01"}]}</pre>
        <script>
          document.getElementById('exp-btn').addEventListener('click', () => {
            const pre = document.getElementById('exp-pre');
            pre.hidden = !pre.hidden;
          });
        </script>
      </footer>
    `);
    const exp1 = await triggerFooterJsonExport(page);
    assert.equal(exp1.parsed.projects.length, 1);
    const exp2 = await triggerFooterJsonExport(page);
    assert.equal(exp2.parsed.projects.length, 1);

    await context.close();
  } finally {
    await browser.close();
  }
});

async function prewarmViteHarness(vite, harnessHtml) {
  const modulesToWarm = [
    '/src/App.jsx',
    '/src/components/ArchitectureModal.jsx',
    '/src/components/GovernanceAndBackground.jsx',
    '/src/components/Footer.jsx',
    '/src/components/AssetSlot.jsx',
    '/src/utils/i18n.js',
    '/src/utils/urlSafety.js',
    '/src/utils/exportPortfolioJson.js',
    '/src/data/projects.json',
    '/src/data/i18n.json',
    '/src/data/operationalHistory.json'
  ];

  try {
    const clientEnv = vite.environments?.client;
    if (clientEnv?.depsOptimizer?.init) {
      await clientEnv.depsOptimizer.init();
      if (clientEnv.depsOptimizer.scanProcessing) {
        await clientEnv.depsOptimizer.scanProcessing;
      }
    }

    await vite.transformIndexHtml('/__tier5_harness__.html', harnessHtml);
    const firstPass = await Promise.allSettled(modulesToWarm.map((mod) => vite.transformRequest(mod)));
    const firstFailure = firstPass.find((res) => res.status === 'rejected');
    if (firstFailure) {
      throw firstFailure.reason;
    }

    await settleVitePendingWork(vite);

    // Refresh module transforms against finalized optimizeDeps browserHash
    const secondPass = await Promise.allSettled(modulesToWarm.map((mod) => vite.transformRequest(mod)));
    const secondFailure = secondPass.find((res) => res.status === 'rejected');
    if (secondFailure) {
      throw secondFailure.reason;
    }
  } finally {
    await settleVitePendingWork(vite);
  }
}

test('Browser adversarial integration against built dist/ & Vite component harness (R4, R5, R8b, GAP-05, GAP-06, GAP-08)', async () => {
  let distServer = null;
  let harnessCacheDir = null;
  let vite = null;
  let harnessServer = null;
  let browser = null;
  const externalRequests = [];
  const viteServerErrors = [];
  const HARNESS_HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="data:," />
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
      import React, { useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import App from '/src/App.jsx';
      import ArchitectureModal from '/src/components/ArchitectureModal.jsx';
      import AssetSlot from '/src/components/AssetSlot.jsx';
      import GovernanceAndBackground from '/src/components/GovernanceAndBackground.jsx';
      import projectsData from '/src/data/projects.json';
      import i18nData from '/src/data/i18n.json';
      import opsData from '/src/data/operationalHistory.json';

      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      const root = createRoot(document.getElementById('root'));

      if (mode === 'p01') {
        const pNoId = { ...projectsData[1], id: undefined };
        root.render(React.createElement(App, { initialData: { projects: [projectsData[0], pNoId] } }));
      } else if (mode === 'p03') {
        const backslash = String.fromCharCode(92);
        root.render(React.createElement(AssetSlot, { src: '/' + backslash + 'evil.com/x.png', kind: 'image', title: 'Bad' }));
      } else if (mode === 'p04') {
        function PdfHarness() {
          const [src, setSrc] = useState('/__mock_ready.pdf');
          return React.createElement('div', null,
            React.createElement('button', { id: 'switch-pdf', type: 'button', onClick: () => setSrc('/__mock_slow_404.pdf') }, 'Switch'),
            React.createElement(AssetSlot, { kind: 'pdf', variant: 'button', src, lang: 'en', t: i18nData.en })
          );
        }
        root.render(React.createElement(PdfHarness));
      } else if (mode === 'p05') {
        const pBilingual = {
          ...projectsData[0],
          id: 'PRJ-01',
          category: 'toString',
          stack: [{ en: 'Meta Conversions API', bm: 'API Penukaran Meta' }],
          pipelineNodes: [{ en: 'Webhook Node', bm: 'Nod Webhook' }, 'B', 'C', 'D', 'E']
        };
        root.render(React.createElement(App, { initialData: { projects: [pBilingual] } }));
      } else if (mode === 'p06') {
        function GovHarness() {
          const [items, setItems] = useState([opsData[0]]);
          return React.createElement('div', null,
            React.createElement('button', { id: 'add-ops', type: 'button', onClick: () => setItems([opsData[0], opsData[1]]) }, 'Add'),
            React.createElement(GovernanceAndBackground, { operationalHistory: items, lang: 'en', t: i18nData.en })
          );
        }
        root.render(React.createElement(GovHarness));
      } else if (mode === 'new_gap_02') {
        root.render(
          React.createElement(App, {
            initialData: {
              projects: [
                { ...projectsData[0], id: 'prj-1', stageCode: '01' },
                { ...projectsData[1], id: undefined, stageCode: '02' }
              ]
            }
          })
        );
      } else if (mode === 'new_gap_04') {
        root.render(
          React.createElement(AssetSlot, {
            kind: 'pdf',
            variant: 'card',
            src: '/__mock_ready.pdf',
            isNricProtected: true,
            privacyNotice: 'NRIC MASKED',
            lang: 'en',
            t: i18nData.en
          })
        );
      } else if (mode === 'rem_gap_01') {
        root.render(
          React.createElement(App, {
            initialData: {
              projects: [
                {
                  ...projectsData[0],
                  id: 'PRJ-DUP',
                  stageCode: '01',
                  title: { en: 'Dup First Stage 01', bm: 'Dup Pertama' }
                },
                {
                  ...projectsData[1],
                  id: 'PRJ-DUP',
                  stageCode: '02',
                  title: { en: 'Dup Second Stage 02', bm: 'Dup Kedua' }
                }
              ]
            }
          })
        );
      } else if (mode === 'traversal_img') {
        root.render(
          React.createElement(
            'div',
            null,
            React.createElement(
              'div',
              { id: 'standalone-traversal' },
              React.createElement(AssetSlot, {
                kind: 'image',
                src: '/assets/../../secret.png',
                title: 'Traversal Slot',
                lang: 'en',
                t: i18nData.en
              })
            ),
            React.createElement(ArchitectureModal, {
              project: {
                ...projectsData[0],
                processVisual: '/assets/../../secret.png'
              },
              lang: 'en',
              t: i18nData.en,
              onClose: () => {}
            })
          )
        );
      }
    </script>
  </body>
</html>`;

  try {
    distServer = await startDistServer();
    harnessCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tier5-vite-harness-'));

    harnessServer = http.createServer(async (req, res) => {
      const reqPath = (req.url || '/').split('?')[0];
      if (reqPath === '/__tier5_harness__.html') {
        try {
          const html = await vite.transformIndexHtml(req.url || '/__tier5_harness__.html', HARNESS_HTML);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
        } catch (err) {
          const message = err?.stack || String(err);
          viteServerErrors.push({ url: req.url || '/', status: 500, source: 'transformIndexHtml', message });
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(message);
        }
        return;
      }
      vite.middlewares(req, res, (err) => {
        if (err) {
          const message = err?.stack || String(err);
          viteServerErrors.push({ url: req.url || '/', status: 500, source: 'vite.middlewares', message });
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          }
          res.end(message);
          return;
        }
        res.writeHead(404);
        res.end('Not Found');
      });
    });

    vite = await createViteServer({
      root: ROOT_DIR,
      cacheDir: harnessCacheDir,
      optimizeDeps: {
        holdUntilCrawlEnd: true,
        include: [
          'react',
          'react-dom',
          'react-dom/client',
          'react/jsx-runtime',
          'react/jsx-dev-runtime',
          'lucide-react'
        ]
      },
      server: { middlewareMode: true, hmr: false, ws: { server: harnessServer } },
      appType: 'custom',
      logLevel: 'error'
    });

    await prewarmViteHarness(vite, HARNESS_HTML);

    await new Promise((resolve, reject) => {
      harnessServer.once('error', reject);
      harnessServer.listen(0, '127.0.0.1', () => {
        harnessServer.off('error', reject);
        resolve();
      });
    });
    const harnessPort = harnessServer.address().port;
    const harnessBaseUrl = `http://127.0.0.1:${harnessPort}`;

    browser = await launchBrowser();
    // 1. Real built dist/ checks: R4 (mobile Escape + outside click), R5 (pipelineNodes + statusBadge search), R8b (modal drag-select backdrop)
    const { page: mobPage, errors: mobErrs, close: closeMob } = await openTrackedPage(
      browser,
      distServer.baseUrl,
      { viewport: { width: 390, height: 844 } }
    );
    try {
      const toggleBtn = mobPage.locator('button[aria-controls="mobile-nav-drawer"]');
      await toggleBtn.click();
      await mobPage.locator('#mobile-nav-drawer').waitFor({ state: 'visible' });
      await mobPage.keyboard.press('Escape');
      await mobPage.locator('#mobile-nav-drawer').waitFor({ state: 'hidden' });

      await toggleBtn.click();
      await mobPage.locator('#mobile-nav-drawer').waitFor({ state: 'visible' });
      await mobPage.locator('main h1').click();
      await mobPage.locator('#mobile-nav-drawer').waitFor({ state: 'hidden' });
      mobErrs.assertZeroUnexpected('mobile-drawer');
    } finally {
      await closeMob();
    }

    const { page: deskPage, errors: deskErrs, close: closeDesk } = await openTrackedPage(
      browser,
      distServer.baseUrl,
      { viewport: { width: 1440, height: 900 } }
    );
    try {
      const searchInput = deskPage.locator('#systems input[type="search"]');
      await searchInput.fill('Ingestion');
      const ingestionIds = await getVisibleProjectIds(deskPage);
      assert.deepEqual(ingestionIds, ['PRJ-03', 'PRJ-05']);

      await searchInput.fill('Sandbox Stress-Test Validated');
      const statusIds = await getVisibleProjectIds(deskPage);
      assert.equal(statusIds.length, projects.length);

      await searchInput.fill('');
      const dialog = await openProjectModal(deskPage, 'PRJ-01');

      // NEW-GAP-01: Clicking non-focusable dialog title then pressing Shift+Tab / Tab keeps focus trapped inside dialog
      await deskPage.locator('#arch-modal-title').click();
      await deskPage.keyboard.press('Shift+Tab');
      assert.equal(
        await deskPage.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))),
        true,
        'Shift+Tab after clicking dialog title must remain inside dialog'
      );
      await deskPage.keyboard.press('Tab');
      assert.equal(
        await deskPage.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))),
        true,
        'Tab inside dialog must remain inside dialog'
      );

      const titleBox = await deskPage.locator('#arch-modal-title').boundingBox();
      assert.ok(titleBox);
      await deskPage.mouse.move(titleBox.x + 10, titleBox.y + 10);
      await deskPage.mouse.down();
      await deskPage.mouse.move(4, 4);
      await deskPage.mouse.up();
      assert.equal(await dialog.isVisible(), true, 'Drag-selecting outside backdrop must not close modal');
      await closeModal(deskPage, 'backdrop');
      assert.equal(await dialog.isVisible(), false, 'Direct click on backdrop closes modal');

      deskErrs.assertZeroUnexpected('desktop-r5-r8b');
    } finally {
      await closeDesk();
    }

    // 2. Vite harness adversarial probes (P01, P03, P04, P05, P06)
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const hPage = await ctx.newPage();
    const harnessPageErrors = [];
    const harnessConsoleErrors = [];
    const viteHttpErrors = [];
    const traversalRequests = [];
    let activeMode = null;
    hPage.on('pageerror', (err) => harnessPageErrors.push(err?.message || String(err)));
    hPage.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text() || '';
      const locUrl = msg.location()?.url || '';
      if (
        text.includes('Failed to load resource') &&
        (/\/assets\/.*\.(png|jpe?g|webp|pdf)(?:[?#].*)?$/i.test(locUrl) ||
          (activeMode === 'p04' && /\/__mock_slow_404\.pdf(?:[?#].*)?$/i.test(locUrl)))
      ) {
        return;
      }
      harnessConsoleErrors.push({ text, location: locUrl });
    });
    hPage.on('response', (res) => {
      const url = res.url();
      const status = res.status();
      if (!url.startsWith(harnessBaseUrl)) return;
      if (
        status >= 500 ||
        (status >= 400 &&
          (url.includes('/__tier5_harness__.html') ||
            url.includes('/src/') ||
            url.includes('/node_modules/')))
      ) {
        viteHttpErrors.push({ url, status, statusText: res.statusText() });
      }
    });

    const gotoHarness = async (mode) => {
      activeMode = mode;
      const preServerErrs = viteServerErrors.length;
      const preHttpErrs = viteHttpErrors.length;
      await hPage.goto(`${harnessBaseUrl}/__tier5_harness__.html?mode=${mode}`, {
        waitUntil: 'networkidle'
      });
      assert.deepEqual(
        viteServerErrors.slice(preServerErrs),
        [],
        `Vite server transform error(s) on mode=${mode}: ${JSON.stringify(viteServerErrors.slice(preServerErrs))}`
      );
      assert.deepEqual(
        viteHttpErrors.slice(preHttpErrs),
        [],
        `Vite HTTP error(s) on mode=${mode}: ${JSON.stringify(viteHttpErrors.slice(preHttpErrs))}`
      );
      assert.deepEqual(
        harnessPageErrors,
        [],
        `Uncaught page error(s) on mode=${mode}: ${JSON.stringify(harnessPageErrors)}`
      );
      await hPage.locator('#root > *').first().waitFor({ state: 'attached', timeout: 10000 });
    };

    let releaseSlowPdf = null;
    let onSlowPdfIntercepted = null;
    await hPage.route('**/*', async (route) => {
      const url = route.request().url();
      if (activeMode === 'traversal_img' && route.request().frame().url().includes('mode=traversal_img')) {
        traversalRequests.push(url);
      }
      if (!url.startsWith(harnessBaseUrl)) {
        externalRequests.push(url);
        await route.abort();
        return;
      }
      if (url.endsWith('/__mock_ready.pdf')) {
        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'application/pdf' },
          body: '%PDF-1.4\n'
        });
        return;
      }
      if (url.endsWith('/__mock_slow_404.pdf')) {
        await new Promise((resolve) => {
          releaseSlowPdf = resolve;
          if (onSlowPdfIntercepted) onSlowPdfIntercepted();
        });
        await route.fulfill({ status: 404, body: 'Not Found' });
        return;
      }
      await route.continue();
    });

    // P01: Missing-ID card click opens modal
    await gotoHarness('p01');
    assert.deepEqual(harnessConsoleErrors, []);
    await hPage.locator('[data-project-id="prj-2"] button').click();
    await hPage.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.deepEqual(harnessConsoleErrors, []);

    // P03: /\evil.com/x.png blocked from leaving origin
    await gotoHarness('p03');
    assert.equal(await hPage.locator('[data-asset-slot=""]').count(), 1);
    assert.deepEqual(externalRequests, []);
    assert.deepEqual(harnessConsoleErrors, []);

    // P04: PDF AssetSlot resets from 'ready' (<a download>) immediately to 'checking' fallback when src switches
    await gotoHarness('p04');
    await hPage.locator('a[download][href="/__mock_ready.pdf"]').waitFor({ state: 'visible', timeout: 5000 });
    const slowPdfIntercepted = new Promise((resolve) => {
      if (releaseSlowPdf) resolve();
      else onSlowPdfIntercepted = resolve;
    });
    const slowPdfRespPromise = hPage.waitForResponse((res) => res.url().endsWith('/__mock_slow_404.pdf'));
    await hPage.locator('#switch-pdf').click();
    await hPage.locator('[data-asset-slot="/__mock_slow_404.pdf"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await hPage.locator('a[download]').count(), 0);
    await slowPdfIntercepted;
    releaseSlowPdf();
    releaseSlowPdf = null;
    onSlowPdfIntercepted = null;
    await slowPdfRespPromise;
    await hPage.evaluate(() => new Promise((resolve) => setTimeout(resolve, 25)));
    assert.deepEqual(harnessConsoleErrors, []);

    // P05: Bilingual stack & pipelineNodes search works, prototype-key category does not match "native code"
    await gotoHarness('p05');
    const p05Input = hPage.locator('#systems input[type="search"]');
    for (const query of ['Conversions', 'Penukaran', 'Webhook Node', 'Nod Webhook']) {
      await p05Input.fill(query);
      assert.equal(await hPage.locator('[data-testid="systems-showing-count"]').innerText(), 'Showing 1 of 1 Systems');
    }
    await p05Input.fill('native code');
    assert.equal(await hPage.locator('[data-testid="systems-showing-count"]').innerText(), 'Showing 0 of 1 Systems');
    assert.deepEqual(harnessConsoleErrors, []);

    // P06: GovernanceAndBackground dynamically appended item defaults to expanded
    await gotoHarness('p06');
    await hPage.locator('#add-ops').click();
    const ops2Btn = hPage.locator('[data-ops-id="OPS-02"] button');
    await ops2Btn.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await ops2Btn.getAttribute('aria-expanded'), 'true');
    assert.deepEqual(harnessConsoleErrors, []);

    // NEW-GAP-02: Stage 02 filter with missing-id does not collide with explicit prj-1 in Stage 01
    await gotoHarness('new_gap_02');
    await hPage.locator('button[data-funnel-stage="02"]').click();
    const stage02Card = hPage.locator('#systems article[data-project-id="prj-2"]');
    await stage02Card.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await hPage.locator('#systems article[data-project-id="prj-1"]').count(), 0);
    await stage02Card.locator('button').click();
    await hPage.locator('#arch-modal-title').waitFor({ state: 'visible', timeout: 5000 });
    const gap02Title = await hPage.locator('#arch-modal-title').innerText();
    assert.ok(gap02Title.includes(projects[1].title.en));
    assert.equal(gap02Title.includes(projects[0].title.en), false);
    assert.deepEqual(harnessConsoleErrors, []);

    // NEW-GAP-04: Ready PDF card preserves PDPA 2024 Shield & privacyNotice
    await gotoHarness('new_gap_04');
    const readyPdfCard = hPage.locator('[data-asset-status="ready"]');
    await readyPdfCard.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await hPage.locator('a[download][href="/__mock_ready.pdf"]').isVisible(), true);
    const readyPdfText = await readyPdfCard.innerText();
    assert.ok(readyPdfText.includes('NRIC MASKED'));
    assert.ok(readyPdfText.includes('PDPA 2024 Shield'));
    assert.deepEqual(harnessConsoleErrors, []);

    // REM-GAP-01: Duplicate explicit project IDs produce zero duplicate-key console errors & open correct 2nd modal
    await gotoHarness('rem_gap_01');
    const dupCard1 = hPage.locator('#systems article[data-project-id="PRJ-DUP"]');
    const dupCard2 = hPage.locator('#systems article[data-project-id="PRJ-DUP-2"]');
    await dupCard1.waitFor({ state: 'visible', timeout: 5000 });
    await dupCard2.waitFor({ state: 'visible', timeout: 5000 });
    assert.deepEqual(harnessConsoleErrors, []);
    await dupCard2.locator('button').click();
    await hPage.locator('#arch-modal-title').waitFor({ state: 'visible', timeout: 5000 });
    const remGap01Title = await hPage.locator('#arch-modal-title').innerText();
    assert.ok(remGap01Title.includes('Dup Second Stage 02'));
    assert.equal(remGap01Title.includes('Dup First Stage 01'), false);
    assert.deepEqual(harnessConsoleErrors, []);

    // Iter-7: Path-traversal AssetSlot & ArchitectureModal processVisual emit zero /secret.png or /assets/ requests & render fallback cleanly
    await hPage.waitForLoadState('networkidle');
    traversalRequests.length = 0;
    await gotoHarness('traversal_img');
    const standaloneSlot = hPage.locator('#standalone-traversal [data-asset-slot]');
    await standaloneSlot.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await standaloneSlot.getAttribute('data-asset-slot'), '');
    assert.equal(await standaloneSlot.getAttribute('data-asset-status'), 'fallback');
    const modalSlot = hPage.locator('[role="dialog"] [data-asset-slot]');
    await modalSlot.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await modalSlot.getAttribute('data-asset-slot'), '/assets/prj-01-architecture.png');
    assert.equal(await modalSlot.getAttribute('data-asset-status'), 'fallback');
    assert.equal(await hPage.locator('img').count(), 0);
    assert.equal((await hPage.locator('body').innerText()).includes('secret.png'), false);
    assert.deepEqual(
      traversalRequests.filter((u) => {
        const pathname = new URL(u).pathname;
        return pathname.includes('secret.png') || pathname.startsWith('/assets/');
      }),
      []
    );
    assert.deepEqual(harnessConsoleErrors, []);

    // Two-pass consecutive Vite harness navigation stress check (p01 -> new_gap_04)
    await gotoHarness('p01');
    await hPage.locator('[data-project-id="prj-2"]').waitFor({ state: 'visible', timeout: 5000 });
    await gotoHarness('new_gap_04');
    await hPage.locator('[data-asset-status="ready"]').waitFor({ state: 'visible', timeout: 5000 });

    assert.deepEqual(harnessConsoleErrors, []);
    assert.deepEqual(harnessPageErrors, []);

    await ctx.close();
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
    if (vite) {
      try {
        await settleVitePendingWork(vite);
      } catch {}
      try {
        await vite.close();
      } catch {}
    }
    if (harnessServer?.listening) {
      try {
        await new Promise((resolve) => harnessServer.close(() => resolve()));
      } catch {}
    }
    if (distServer) {
      try {
        await distServer.close();
      } catch {}
    }
    if (harnessCacheDir) {
      try {
        fs.rmSync(harnessCacheDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
      } catch {}
    }
  }
});
