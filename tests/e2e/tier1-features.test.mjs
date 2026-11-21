import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import {
  CANONICAL_CASE_STUDIES,
  CANONICAL_COURSERA_CODES,
  CANONICAL_FUNNEL_STAGES,
  CANONICAL_OPERATIONAL_ORGS,
  REPO_ROOT,
  VIEWPORTS,
  assertNoBrokenVisibleImages,
  assertNoHorizontalOverflow,
  attachErrorTracking,
  closeModal,
  escapeRegExp,
  expandAllGovernanceRoles,
  findFirstVisible,
  findLastVisible,
  getAllStagesButton,
  getCaseStudyCard,
  getCurrentLanguage,
  getFunnelStageButton,
  getGovernanceSection,
  getHeroKpiCards,
  getNavbar,
  getSearchInput,
  getVisibleProjectIds,
  launchBrowser,
  loadGroundTruth,
  openProjectModal,
  parseRgb,
  relativeLuminance,
  resolveDistDir,
  runIsolatedNextProjectProbe,
  scanDirectoryForPdpaNric,
  scanTextForIndonesianTerms,
  scanTextForPdpaNric,
  selectCategoryFilter,
  startDistServer,
  switchLanguage,
  triggerFooterJsonExport,
  withTrackedPage,
} from './helpers.mjs';

let server;
let browser;
let distDir;
let truth;

before(async () => {
  distDir = resolveDistDir();
  truth = loadGroundTruth();
  server = await startDistServer({ distDir });
  browser = await launchBrowser();
});

after(async () => {
  if (browser) await browser.close();
  if (server) await server.close();
});

describe('Tier 1 — Feature Coverage (F1–F18, 90 Tests)', () => {
  // F1: Vite + React + Tailwind Build Pipeline
  test('T1-F01-01: Static dist/index.html HTTP 200 delivery & non-empty #root mount', async () => {
    const res = await fetch(`${server.baseUrl}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/html/i);

    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const rootHtml = await page.locator('#root').innerHTML();
      assert.ok(rootHtml.trim().length > 100, 'Expected hydrated #root content');
      errors.assertZeroUnexpected('T1-F01-01');
    });
  });

  test('T1-F01-02: Bundled JS & CSS asset integrity (all HTTP 200)', async () => {
    const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
    const page = await context.newPage();
    const errors = attachErrorTracking(page);
    const bundleResponses = [];
    page.on('response', (res) => {
      if (/\.(js|css)(?:\?|$)/i.test(res.url())) {
        bundleResponses.push({ url: res.url(), status: res.status() });
      }
    });
    try {
      await page.goto(server.baseUrl, { waitUntil: 'load' });
      await page.waitForTimeout(200);
      assert.ok(bundleResponses.some((r) => /\.js(?:\?|$)/i.test(r.url)), 'Expected at least one JS bundle');
      assert.ok(bundleResponses.some((r) => /\.css(?:\?|$)/i.test(r.url)), 'Expected at least one CSS bundle');
      for (const r of bundleResponses) {
        assert.equal(r.status, 200, `Bundle failed: ${r.url} -> ${r.status}`);
      }
      errors.assertZeroUnexpected('T1-F01-02');
    } finally {
      await context.close();
    }
  });

  test('T1-F01-03: Zero uncaught runtime pageerror or console.error on boot', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await page.waitForTimeout(250);
      errors.assertZeroUnexpected('T1-F01-03');
    });
  });

  test('T1-F01-04: Self-hosted font asset delivery without external CDN errors', async () => {
    const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
    const page = await context.newPage();
    const errors = attachErrorTracking(page);
    const externalFontRequests = [];
    page.on('request', (req) => {
      if (/fonts\.(googleapis|gstatic)\.com/i.test(req.url())) {
        externalFontRequests.push(req.url());
      }
    });
    try {
      await page.goto(server.baseUrl, { waitUntil: 'load' });
      const fontReady = await page.evaluate(async () => {
        await document.fonts.ready;
        return document.fonts.size;
      });
      assert.equal(externalFontRequests.length, 0, 'Expected zero external Google Fonts CDN requests');
      assert.ok(fontReady > 0, 'Expected loaded @font-face entries in document.fonts');
      errors.assertZeroUnexpected('T1-F01-04');
    } finally {
      await context.close();
    }
  });

  test('T1-F01-05: Document title & responsive viewport meta tag', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const title = await page.title();
      const viewportContent = await page.locator('meta[name="viewport"]').getAttribute('content');
      assert.match(title, /Mohd Faiz|Faiz/i);
      assert.match(viewportContent || '', /width=device-width/i);
      errors.assertZeroUnexpected('T1-F01-05');
    });
  });

  // F2: 6-File JSON Data Layer
  test('T1-F02-01: Profile JSON data fidelity rendered', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('body').innerText();
      for (const expected of [
        'Mohd Faiz Bin Md Nordin',
        'Mohd Faiz (Abu Radhi)',
        'Kemaman, Terengganu, Malaysia',
        'mfaiz.mdnordin@gmail.com',
      ]) {
        assert.ok(text.includes(expected), `Missing profile datum: ${expected}`);
      }
      const hasPhoneOrWa =
        text.includes('018-3904690') || (await page.locator('a[href="https://wa.me/60183904690"]').count()) > 0;
      assert.ok(hasPhoneOrWa, 'Missing profile phone/WhatsApp contact (018-3904690 / wa.me/60183904690)');
      errors.assertZeroUnexpected('T1-F02-01');
    });
  });

  test('T1-F02-02: Projects JSON data fidelity (PRJ-01..PRJ-06)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      for (const id of ['PRJ-01', 'PRJ-02', 'PRJ-03', 'PRJ-04', 'PRJ-05', 'PRJ-06']) {
        assert.ok(text.includes(id), `Missing project ID: ${id}`);
      }
      assert.ok(text.includes('< 10s Speed-to-Lead SLA Sync'));
      assert.ok(text.includes('Automated POAS & 404/500 Spend Cutoff'));
      assert.ok(text.includes('Z-Score Churn Anomaly + Meta CAPI v21.0'));
      assert.ok(text.includes('HTTP 204 Margin Gate + Dual CAPI Sync'));
      assert.ok(text.includes('RM 0.00 Order-to-Settlement Audit Variance'));
      assert.ok(text.includes('+60.8% Overclaim Caught · RM 0.00 Variance'));
      assert.ok(text.includes('Sandbox Stress-Test Validated'));
      errors.assertZeroUnexpected('T1-F02-02');
    });
  });

  test('T1-F02-03: Case Studies JSON data fidelity (CS-01..CS-03)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      for (const cs of CANONICAL_CASE_STUDIES) {
        assert.ok(text.includes(cs.client), `Missing client: ${cs.client}`);
        assert.ok(text.includes(cs.period), `Missing period: ${cs.period}`);
      }
      errors.assertZeroUnexpected('T1-F02-03');
    });
  });

  test('T1-F02-04: Credentials JSON data fidelity (SKM, 6 Coursera, UMP/IIUM)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      for (const token of [
        'S304265796',
        'M731-001-3:2021',
        'M731-001-3:2021-102026',
        'Universiti Malaysia Pahang',
        '2022',
        'International Islamic University Malaysia',
        '2004 – 2008',
      ]) {
        assert.ok(text.includes(token), `Missing credential token: ${token}`);
      }
      const courseraLinks = await page.locator('a[href^="https://coursera.org/verify/"]').count();
      assert.equal(courseraLinks, 6);
      errors.assertZeroUnexpected('T1-F02-04');
    });
  });

  test('T1-F02-05: Operational History JSON data fidelity (5 roles)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await expandAllGovernanceRoles(page);
      const text = await page.locator('main').innerText();
      for (const org of CANONICAL_OPERATIONAL_ORGS) {
        assert.ok(text.includes(org), `Missing operational org: ${org}`);
      }
      errors.assertZeroUnexpected('T1-F02-05');
    });
  });

  // F3: Dynamic System Counters (projects.length)
  test('T1-F03-01: Navbar dynamic system badge reflects expected N', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const navText = await getNavbar(page).innerText();
      assert.match(navText, new RegExp(`\\b${truth.expectedSystems}\\b.*(?:System|Sistem)`, 'i'));
      errors.assertZeroUnexpected('T1-F03-01');
    });
  });

  test('T1-F03-02: Hero CTA & KPI card reflect expected N', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const heroText = await page.locator('main section').first().innerText();
      assert.match(heroText, new RegExp(`\\b${truth.expectedSystems}\\b`));
      const heroCta = page
        .locator('main section')
        .first()
        .locator('a, button')
        .filter({ hasText: new RegExp(`\\b${truth.expectedSystems}\\b.*(?:System|Sistem)`, 'i') });
      assert.ok((await heroCta.count()) >= 1, 'Expected Hero CTA/KPI displaying dynamic system count');
      errors.assertZeroUnexpected('T1-F03-02');
    });
  });

  test('T1-F03-03: Funnel stage counts sum equals expected N', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      let sum = 0;
      for (const stage of truth.stageCounts) {
        const btn = getFunnelStageButton(page, stage.code, stage);
        const btnText = await btn.innerText();
        assert.match(btnText, new RegExp(`\\b${stage.count}\\b`), `Stage ${stage.code} missing count ${stage.count}`);
        sum += stage.count;
      }
      assert.equal(sum, truth.expectedSystems);
      errors.assertZeroUnexpected('T1-F03-03');
    });
  });

  test('T1-F03-04: Registry visible count matches expected N', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const visibleIds = await getVisibleProjectIds(page);
      assert.equal(visibleIds.length, truth.expectedSystems);
      errors.assertZeroUnexpected('T1-F03-04');
    });
  });

  test('T1-F03-05: Isolated next-project (PRJ-07) rebuild increments counters from 6 to 7 with 0 UI edits', async () => {
    await runIsolatedNextProjectProbe(browser, async ({ baseUrl, nextId, prevTotal, totalSystems, expectedStage02Ids }) => {
      assert.equal(totalSystems, prevTotal + 1);
      await withTrackedPage(browser, baseUrl, {}, async ({ page, errors }) => {
        const navText = await getNavbar(page).innerText();
        assert.match(navText, new RegExp(`\\b${totalSystems}\\b.*(?:System|Sistem)`, 'i'));
        const visibleIds = await getVisibleProjectIds(page);
        assert.equal(visibleIds.length, totalSystems);
        assert.ok(visibleIds.includes(nextId));
        const stage02Text = await getFunnelStageButton(page, '02').innerText();
        assert.match(stage02Text, new RegExp(`\\b${expectedStage02Ids.length}\\b`));
        errors.assertZeroUnexpected('T1-F03-05');
      });
    });
  });

  // F4: Dark Executive Design System
  test('T1-F04-01: Dark Executive canvas (#020617 / dark slate luminance < 0.05)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const bg = await page.evaluate(() => {
        const bodyBg = getComputedStyle(document.body).backgroundColor;
        const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
        return bodyBg !== 'rgba(0, 0, 0, 0)' ? bodyBg : htmlBg;
      });
      const rgb = parseRgb(bg);
      assert.ok(rgb, `Expected valid RGB background, got: ${bg}`);
      assert.ok(relativeLuminance(rgb) < 0.05, `Expected dark canvas luminance < 0.05, got ${bg}`);
      errors.assertZeroUnexpected('T1-F04-01');
    });
  });

  test('T1-F04-02: Glass card surface & subtle border on project cards', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const result = await page.evaluate(() => {
        const bodyBg = getComputedStyle(document.body).backgroundColor;
        const candidates = Array.from(document.querySelectorAll('main article, main div, main button')).filter((el) => {
          const matches = new Set((el.textContent || '').match(/\bPRJ-\d{2,}\b/g) || []);
          const h = el.getBoundingClientRect().height;
          return matches.size === 1 && matches.has('PRJ-01') && h >= 120 && h < 600;
        });
        const styles = candidates.map((el) => {
          const cs = getComputedStyle(el);
          return {
            bg: cs.backgroundColor,
            borderWidth: parseFloat(cs.borderTopWidth) || 0,
            borderColor: cs.borderTopColor,
          };
        });
        const hasBorder = styles.some((s) => s.borderWidth >= 1);
        const hasDistinctBg = styles.some(
          (s) => s.bg !== bodyBg && s.bg !== 'rgba(0, 0, 0, 0)' && s.bg !== 'transparent'
        );
        const hasCardSurface = styles.some(
          (s) => s.borderWidth >= 1 && s.bg !== bodyBg && s.bg !== 'rgba(0, 0, 0, 0)' && s.bg !== 'transparent'
        );
        return { count: candidates.length, hasBorder, hasDistinctBg, hasCardSurface, styles };
      });
      assert.ok(result.count > 0, 'Could not locate PRJ-01 card surface (120 <= height < 600)');
      assert.ok(result.hasBorder, `Expected visible card border >= 1px, got ${JSON.stringify(result.styles)}`);
      assert.ok(
        result.hasDistinctBg,
        `Expected distinct glass card background surface (bg !== bodyBg), got ${JSON.stringify(result.styles)}`
      );
      assert.ok(result.hasCardSurface, `Expected single PRJ-01 card surface combining border + background`);
      errors.assertZeroUnexpected('T1-F04-02');
    });
  });

  test('T1-F04-03: Primary & accent palette presence (Emerald/Cyan/Amber)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const accentCount = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('body *'));
        const accentColors = new Set();
        for (const el of els) {
          const cs = getComputedStyle(el);
          for (const prop of [cs.color, cs.borderTopColor, cs.backgroundColor]) {
            const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(prop);
            if (!m) continue;
            const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
            if ((g > 180 && r < 100 && b > 120) || (b > 200 && g > 180 && r < 100) || (r > 200 && g > 150 && b < 100)) {
              accentColors.add(`${r},${g},${b}`);
            }
          }
        }
        return accentColors.size;
      });
      assert.ok(accentCount >= 2, `Expected at least 2 executive accent hues (emerald/cyan/amber), found ${accentCount}`);
      errors.assertZeroUnexpected('T1-F04-03');
    });
  });

  test('T1-F04-04: Sans & JetBrains Mono typography stack applied', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const fonts = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        const bodyFont = getComputedStyle(document.body).fontFamily;
        const h1Font = h1 ? getComputedStyle(h1).fontFamily : bodyFont;
        const monoCandidates = Array.from(document.querySelectorAll('code, span, p, div, kbd, samp')).filter((el) => {
          const txt = (el.textContent || '').trim();
          return /^(PRJ-01|S304265796|M731-001-3:2021)$/.test(txt) && (el.children.length === 0 || el.tagName === 'CODE');
        });
        const monoFonts = monoCandidates.map((el) => getComputedStyle(el).fontFamily);
        return { bodyFont, h1Font, monoFonts };
      });
      assert.match(fonts.h1Font, /Plus Jakarta Sans|Inter/i);
      assert.ok(
        fonts.monoFonts.some((f) => /JetBrains Mono|monospace/i.test(f)),
        `Expected JetBrains Mono or monospace on badge elements, got ${JSON.stringify(fonts.monoFonts)}`
      );
      errors.assertZeroUnexpected('T1-F04-04');
    });
  });

  test('T1-F04-05: Readable dark-mode text contrast on Hero h1', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const color = await page.locator('h1').first().evaluate((el) => getComputedStyle(el).color);
      const rgb = parseRgb(color);
      assert.ok(rgb, `Invalid h1 color: ${color}`);
      assert.ok(relativeLuminance(rgb) > 0.6, `Expected light h1 foreground luminance > 0.6, got ${color}`);
      errors.assertZeroUnexpected('T1-F04-05');
    });
  });

  // F5: Instant Bilingual EN | BM Toggle
  test('T1-F05-01: Initial English state & html[lang="en"]', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const lang = await page.evaluate(() => document.documentElement.lang);
      assert.match(lang, /^en/i);
      const text = await page.locator('main').innerText();
      assert.match(text, /Digital Marketing Practitioner/i);
      errors.assertZeroUnexpected('T1-F05-01');
    });
  });

  test('T1-F05-02: Instant EN -> BM toggle without page reload', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await page.evaluate(() => {
        window.__e2eMarker = 'no-reload';
      });
      await switchLanguage(page, 'bm');
      const marker = await page.evaluate(() => window.__e2eMarker);
      const lang = await page.evaluate(() => document.documentElement.lang);
      const text = await page.locator('main').innerText();
      assert.equal(marker, 'no-reload');
      assert.match(lang, /^(ms|bm)/i);
      assert.ok(text.includes('Pengamal Pemasaran Digital'));
      assert.ok(text.includes('Tunai Bersih Sebenar'));
      errors.assertZeroUnexpected('T1-F05-02');
    });
  });

  test('T1-F05-03: Malaysian BM copy across all sections', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await switchLanguage(page, 'bm');
      const text = await page.locator('main').innerText();
      for (const phrase of [
        'SLA Prospek Masuk',
        'Kawalan Iklan Berbayar',
        'Sijil Kemahiran Malaysia (SKM) Tahap 3',
        'Penemuan Organik',
      ]) {
        assert.ok(text.includes(phrase), `Missing BM copy: ${phrase}`);
      }
      errors.assertZeroUnexpected('T1-F05-03');
    });
  });

  test('T1-F05-04: Authentic Malaysian BM lexicon (no Indonesian terms)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await switchLanguage(page, 'bm');
      const text = await page.locator('body').innerText();
      assert.match(text, /Sijil Kemahiran/i);
      assert.match(text, /Tunai Bersih|Untung Bersih/i);
      assert.match(text, /Muat Turun|Papan Pemuka|Kad Skor|Pelayan|Pelayar/i);
      assert.deepEqual(scanTextForIndonesianTerms(text, 'BM DOM'), []);
      errors.assertZeroUnexpected('T1-F05-04');
    });
  });

  test('T1-F05-05: Round-trip BM -> EN toggle restoration', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await switchLanguage(page, 'bm');
      await switchLanguage(page, 'en');
      const lang = await page.evaluate(() => document.documentElement.lang);
      const text = await page.locator('main').innerText();
      assert.match(lang, /^en/i);
      assert.ok(text.includes('Digital Marketing Practitioner'));
      assert.ok(text.includes('Inbound Lead SLA'));
      errors.assertZeroUnexpected('T1-F05-05');
    });
  });

  // F6: Navbar.jsx
  test('T1-F06-01: Sticky/fixed top navbar visibility at y=0', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const nav = getNavbar(page);
      const pos = await nav.evaluate((el) => getComputedStyle(el).position);
      const box = await nav.boundingBox();
      assert.ok(pos === 'sticky' || pos === 'fixed', `Expected sticky/fixed navbar, got ${pos}`);
      assert.ok(box && box.y >= 0 && box.y <= 5 && box.height > 30);
      errors.assertZeroUnexpected('T1-F06-01');
    });
  });

  test('T1-F06-02: Navbar remains accessible at top after scroll (y=1800)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await page.evaluate(() => window.scrollTo(0, 1800));
      await page.waitForTimeout(100);
      const nav = getNavbar(page);
      await nav.waitFor({ state: 'visible' });
      const box = await nav.boundingBox();
      assert.ok(box && box.y >= 0 && box.y < 120, `Navbar not pinned after scroll: ${JSON.stringify(box)}`);
      errors.assertZeroUnexpected('T1-F06-02');
    });
  });

  test('T1-F06-03: Navbar candidate identity & system count badge', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const navText = await getNavbar(page).innerText();
      assert.match(navText, /Mohd Faiz|Abu Radhi/i);
      assert.match(navText, new RegExp(`\\b${truth.expectedSystems}\\b`));
      errors.assertZeroUnexpected('T1-F06-03');
    });
  });

  test('T1-F06-04: Working section anchor navigation inside Navbar', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const anchors = getNavbar(page).locator('a[href^="#"]');
      const totalCount = await anchors.count();
      let visibleCount = 0;
      for (let i = 0; i < totalCount; i++) {
        if (await anchors.nth(i).isVisible()) visibleCount++;
      }
      assert.ok(visibleCount >= 3, `Expected >= 3 visible section anchor links in Navbar, got ${visibleCount}`);
      const lastVisible = await findLastVisible(anchors);
      assert.ok(lastVisible, 'No visible navbar anchor found');
      const href = await lastVisible.getAttribute('href');
      await lastVisible.click();
      await page.waitForFunction(() => window.scrollY > 50, null, { timeout: 5000 }).catch(() => {});
      const scrollY = await page.evaluate(() => window.scrollY);
      assert.ok(scrollY > 50, `Expected clicking ${href} to scroll page, scrollY=${scrollY}`);
      errors.assertZeroUnexpected('T1-F06-04');
    });
  });

  test('T1-F06-05: Navbar EN | BM toggle accessible by keyboard', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const nav = getNavbar(page);
      const toggle = await findFirstVisible(
        nav.getByRole('button', {
          name: /^(BM|Bahasa Melayu|Malay|MS)$|EN\s*\|\s*BM|BM\s*\|\s*EN|Switch language to (?:Bahasa Melayu|Malay|BM)|Tukar bahasa ke Bahasa Melayu/i,
        })
      );
      assert.ok(toggle, 'Visible Navbar language toggle button not found');
      await toggle.focus();
      await page.keyboard.press('Enter');
      await page
        .waitForFunction(() => /Pengamal Pemasaran Digital|Tunai Bersih Sebenar/i.test(document.body.innerText), null, {
          timeout: 5000,
        })
        .catch(() => {});
      const lang = await getCurrentLanguage(page);
      assert.equal(lang, 'bm');
      errors.assertZeroUnexpected('T1-F06-05');
    });
  });

  // F7: HeroSection.jsx
  test('T1-F07-01: Hero executive headline, subheadline & location', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const heroText = await page.locator('main section').first().innerText();
      assert.ok(heroText.includes('Mohd Faiz Bin Md Nordin'));
      assert.ok(heroText.includes('Marketing Operations, Ad Ops & Zero-Subscription Revenue Systems'));
      assert.ok(heroText.includes('Kemaman, Terengganu, Malaysia'));
      errors.assertZeroUnexpected('T1-F07-01');
    });
  });

  test('T1-F07-02: Hero normalized external CTAs (https:// & Gmail compose)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const hero = page.locator('main section').first();
      assert.equal(
        await hero.locator('a[href*="linkedin.com"]').first().getAttribute('href'),
        'https://www.linkedin.com/in/mohd-faiz-md-nordin-896205283'
      );
      assert.equal(
        await hero.locator('a[href*="github.com"]').first().getAttribute('href'),
        'https://github.com/faizrobiah4690-design'
      );
      assert.equal(
        await hero.locator('a[href*="wa.me"]').first().getAttribute('href'),
        'https://wa.me/60183904690'
      );
      const gmailHref = await hero.locator('a[href^="https://mail.google.com/mail/"]').first().getAttribute('href');
      assert.ok(gmailHref && gmailHref.includes('mfaiz.mdnordin%40gmail.com'), `Unexpected Gmail compose href: ${gmailHref}`);
      assert.equal(await hero.getByRole('button', { name: /copy email address/i }).count(), 1);
      errors.assertZeroUnexpected('T1-F07-02');
    });
  });

  test('T1-F07-03: Hero dynamic systems CTA scrolls to Funnel / Systems section', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const heroCta = page
        .locator('main section')
        .first()
        .locator('a, button')
        .filter({ hasText: new RegExp(`\\b${truth.expectedSystems}\\b.*(?:System|Sistem|Explore|Teroka)`, 'i') })
        .first();
      await heroCta.click();
      await page.waitForFunction(() => window.scrollY > 100, null, { timeout: 5000 }).catch(() => {});
      const scrollY = await page.evaluate(() => window.scrollY);
      assert.ok(scrollY > 100, `Expected Hero CTA click to scroll toward Systems, scrollY=${scrollY}`);
      errors.assertZeroUnexpected('T1-F07-03');
    });
  });

  test('T1-F07-04: Hero 4 KPI cards rendered with core figures', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const { count, locator } = await getHeroKpiCards(page);
      assert.equal(count, 4, `Expected 4 distinct Hero KPI cards, found ${count}`);
      const cardTexts = await locator.allInnerTexts();
      const joined = cardTexts.join('\n');
      assert.match(joined, new RegExp(`\\b${truth.expectedSystems}\\b`));
      assert.match(joined, /TERAMPIL/i);
      assert.match(joined, /93\.23%–99\.37%|93\.23%/);
      assert.match(joined, /RM\s*0\/(?:mo|bln)/i);
      errors.assertZeroUnexpected('T1-F07-04');
    });
  });

  test('T1-F07-05: Hero zero resume/PDF file references & zero broken images', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const hero = page.locator('main section').first();
      const html = await hero.innerHTML();
      assert.equal(/resume-mohd-faiz|\.pdf/i.test(html), false, 'Unexpected resume/PDF file reference in Hero');
      await assertNoBrokenVisibleImages(page);
      errors.assertZeroUnexpected('T1-F07-05');
    });
  });

  // F8: FunnelPipelineMap.jsx
  test('T1-F08-01: 5 ordered funnel stages (01 -> 02 -> 03 -> 04 -> 05)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const positions = [];
      for (const stage of CANONICAL_FUNNEL_STAGES) {
        const btn = getFunnelStageButton(page, stage.code, stage);
        await btn.waitFor({ state: 'visible' });
        const box = await btn.boundingBox();
        assert.ok(box, `Missing boundingBox for stage ${stage.code}`);
        positions.push({ code: stage.code, box });
      }
      for (let i = 1; i < positions.length; i++) {
        const prev = positions[i - 1].box;
        const curr = positions[i].box;
        const ordered = curr.y > prev.y + 5 || (Math.abs(curr.y - prev.y) <= 20 && curr.x > prev.x);
        assert.ok(ordered, `Funnel stage ${positions[i].code} not ordered after ${positions[i - 1].code}`);
      }
      errors.assertZeroUnexpected('T1-F08-01');
    });
  });

  test('T1-F08-02: Stage 01 click filters Registry strictly to Stage 01 projects', async () => {
    const expected01 = truth.projects.filter((p) => p.stageCode === '01').map((p) => p.id).sort();
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await getFunnelStageButton(page, '01').click();
      assert.deepEqual(await getVisibleProjectIds(page), expected01);
      errors.assertZeroUnexpected('T1-F08-02');
    });
  });

  test('T1-F08-03: Stage 03 click maps to Stage 03 projects (non-index stageCode mapping)', async () => {
    const expected03 = truth.projects.filter((p) => p.stageCode === '03').map((p) => p.id).sort();
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await getFunnelStageButton(page, '03').click();
      assert.deepEqual(await getVisibleProjectIds(page), expected03);
      errors.assertZeroUnexpected('T1-F08-03');
    });
  });

  test('T1-F08-04: Stage 04 and Stage 05 map accurately to their projects', async () => {
    const expected04 = truth.projects.filter((p) => p.stageCode === '04').map((p) => p.id).sort();
    const expected05 = truth.projects.filter((p) => p.stageCode === '05').map((p) => p.id).sort();
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await getFunnelStageButton(page, '04').click();
      assert.deepEqual(await getVisibleProjectIds(page), expected04);
      await getFunnelStageButton(page, '05').click();
      assert.deepEqual(await getVisibleProjectIds(page), expected05);
      errors.assertZeroUnexpected('T1-F08-04');
    });
  });

  test('T1-F08-05: All Stages reset restores all systems', async () => {
    const expected02 = truth.projects.filter((p) => p.stageCode === '02').map((p) => p.id).sort();
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await getFunnelStageButton(page, '02').click();
      assert.deepEqual(await getVisibleProjectIds(page), expected02);
      await getAllStagesButton(page).click();
      assert.equal((await getVisibleProjectIds(page)).length, truth.expectedSystems);
      errors.assertZeroUnexpected('T1-F08-05');
    });
  });

  // F9: SystemsRegistry.jsx
  test('T1-F09-01: Default project cards rendered with ID, title, metric & stack', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const visibleIds = await getVisibleProjectIds(page);
      const expectedIds = truth.projects.map((p) => p.id).sort();
      assert.deepEqual(visibleIds, expectedIds);
      const text = await page.locator('main').innerText();
      assert.ok(text.includes('Apps Script'));
      assert.ok(text.includes('Looker Studio'));
      errors.assertZeroUnexpected('T1-F09-01');
    });
  });

  test('T1-F09-02: Keyword search "GMV Max" isolates PRJ-05', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const search = await getSearchInput(page);
      await search.fill('GMV Max');
      assert.deepEqual(await getVisibleProjectIds(page), ['PRJ-05']);
      errors.assertZeroUnexpected('T1-F09-02');
    });
  });

  test('T1-F09-03: Case-insensitive keyword search "hubspot" isolates PRJ-01', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const search = await getSearchInput(page);
      await search.fill('hubspot');
      assert.deepEqual(await getVisibleProjectIds(page), ['PRJ-01']);
      errors.assertZeroUnexpected('T1-F09-03');
    });
  });

  test('T1-F09-04: Category filter narrows to Retention & LTV (PRJ-03)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await selectCategoryFilter(page, 'Retention & LTV');
      assert.deepEqual(await getVisibleProjectIds(page), ['PRJ-03']);
      errors.assertZeroUnexpected('T1-F09-04');
    });
  });

  test('T1-F09-05: Clicking project card opens ArchitectureModal for PRJ-01', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const dialog = await openProjectModal(page, 'PRJ-01');
      assert.match(await dialog.innerText(), /PRJ-01/);
      errors.assertZeroUnexpected('T1-F09-05');
    });
  });

  // F10: ArchitectureModal.jsx
  test('T1-F10-01: Modal accessibility semantics ([role="dialog"][aria-modal="true"])', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const dialog = await openProjectModal(page, 'PRJ-02');
      assert.equal(await dialog.getAttribute('aria-modal'), 'true');
      assert.match(await dialog.innerText(), /Paid Ads POAS & Broken-URL Sentinel Guardrail/);
      errors.assertZeroUnexpected('T1-F10-01');
    });
  });

  test('T1-F10-02: 5-node pipeline visualizer renders all 5 PRJ-04 nodes in order', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const dialog = await openProjectModal(page, 'PRJ-04');
      const modalText = await dialog.innerText();
      const expectedNodes = [
        'Cloudflare POS / WA Form',
        'Discount Floor Gate (HTTP 204)',
        '7d CTWA / Physical Store CAPI',
        'Masked Attribution Mart',
        'Channel Net Cash Scorecard',
      ];
      let lastIdx = -1;
      for (const node of expectedNodes) {
        const idx = modalText.indexOf(node);
        assert.ok(idx > lastIdx, `Pipeline node "${node}" missing or out of order`);
        lastIdx = idx;
      }
      errors.assertZeroUnexpected('T1-F10-02');
    });
  });

  test('T1-F10-03: Deterministic Gate, Bounded AI, Business Objective, Project Formulas & Walkthrough in PRJ-01 & PRJ-05', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const d1 = await openProjectModal(page, 'PRJ-01');
      const t1 = await d1.innerText();
      assert.ok(t1.includes('Deterministic SLA timer'));
      assert.ok(t1.includes('Gemini Flash strictly scores'));
      assert.match(t1, /Plain-Language Business Objective/i);
      assert.ok(t1.includes('Speed-to-Lead SLA Latency'));
      assert.ok(t1.includes('Executive Outcome Preview'));
      assert.ok(await d1.getByTestId('slide-walkthrough-takeaway').isVisible());
      await closeModal(page, 'escape');

      const d5 = await openProjectModal(page, 'PRJ-05');
      const t5 = await d5.innerText();
      assert.ok(t5.includes('7-tab relational schema'));
      assert.ok(t5.includes('Synthesizes executive settlement discrepancy briefings'));
      assert.ok(t5.includes('Paper GMV-to-Bank Settlement Waterfall'));
      assert.ok(await d5.getByTestId('slide-walkthrough-takeaway').isVisible());
      errors.assertZeroUnexpected('T1-F10-03');
    });
  });

  test('T1-F10-04: Validated outcome & all 6 stack pills inside PRJ-03 modal', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const dialog = await openProjectModal(page, 'PRJ-03');
      const text = await dialog.innerText();
      assert.ok(text.includes('Automated at-risk VIP cohort detection'));
      for (const item of [
        'Google Sheets Mart',
        'Apps Script',
        'RFM + Z-Score Math',
        'Meta CAPI v21.0',
        'SHA-256 Hashing',
        'Looker Studio',
      ]) {
        assert.ok(text.includes(item), `Missing stack item in modal: ${item}`);
      }
      errors.assertZeroUnexpected('T1-F10-04');
    });
  });

  test('T1-F10-05: Modal conditional URLs (slide link safe, empty looker/live URLs never emit href="")', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const dialog = await openProjectModal(page, 'PRJ-01');
      const hrefs = await dialog.locator('a').evaluateAll((els) => els.map((a) => a.getAttribute('href')));
      assert.ok(hrefs.length >= 1, 'Expected at least 1 safe link inside modal (Open Full slide link)');
      for (const href of hrefs) {
        assert.ok(href && href !== '#' && href !== 'undefined', `Unsafe modal href: ${href}`);
      }
      errors.assertZeroUnexpected('T1-F10-05');
    });
  });

  // F11: LocalCaseStudies.jsx
  test('T1-F11-01: Pillar 2 heading & 3 local case studies visible', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      assert.match(text, /Local Business|Case Studies|Kajian Kes/i);
      for (const cs of CANONICAL_CASE_STUDIES) {
        assert.ok(text.includes(cs.client));
      }
      errors.assertZeroUnexpected('T1-F11-01');
    });
  });

  test('T1-F11-02: CS-01 Radhi Fruits 4690 full evidence details', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      assert.ok(text.includes('Oct 2021 – Present'));
      assert.ok(text.includes('Local Fruit Retail | Kemaman, Terengganu'));
      assert.ok(text.includes('Facebook Marketplace'));
      assert.ok(text.includes('Google Business Profile'));
      errors.assertZeroUnexpected('T1-F11-02');
    });
  });

  test('T1-F11-03: CS-02 PedalHaus Chukai & honest POS observation note', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      assert.ok(text.includes('May 2026 – Present'));
      assert.ok(text.includes('Koleksi Premium PedalHaus'));
      assert.ok(text.includes('without claiming isolated paid-ad attribution'));
      errors.assertZeroUnexpected('T1-F11-03');
    });
  });

  test('T1-F11-04: CS-03 School Van Service, Binjai route & PSV details', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      for (const token of ['Feb 2024 – Feb 2025', 'SK Binjai', 'SMK Binjai', 'SK Sri Jaya', 'PASTI', 'PSV']) {
        assert.ok(text.includes(token), `Missing CS-03 token: ${token}`);
      }
      errors.assertZeroUnexpected('T1-F11-04');
    });
  });

  test('T1-F11-05: Case study cards & Funnel/MarTech connection render cleanly with zero broken images', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      assert.match(text, /Radhi Fruits 4690/i);
      assert.match(text, /PedalHaus Chukai/i);
      assert.match(text, /School Van Service, Binjai/i);
      assert.match(text, /Funnel & MarTech Connection/i);
      await assertNoBrokenVisibleImages(page);
      errors.assertZeroUnexpected('T1-F11-05');
    });
  });

  // F12: CredentialsVault.jsx
  test('T1-F12-01: SKM Level 3 serial S304265796, NOSS & TERAMPIL', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      for (const token of [
        'S304265796',
        'M731-001-3:2021',
        'M731-001-3:2021-102026',
        'TERAMPIL',
        'Ministry of Human Resources, Malaysia',
      ]) {
        assert.ok(text.includes(token), `Missing SKM datum: ${token}`);
      }
      errors.assertZeroUnexpected('T1-F12-01');
    });
  });

  test('T1-F12-02: SKM NRIC-masking notice & asset slot fallback', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      assert.match(text, /NRIC|MyKad|Kad Pengenalan/i);
      assert.match(text, /Mask|masked|PDPA|privacy|privasi|lindungi/i);
      await assertNoBrokenVisibleImages(page);
      errors.assertZeroUnexpected('T1-F12-02');
    });
  });

  test('T1-F12-03: All 6 Coursera verify cards & exact verification URLs', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const hrefs = await page
        .locator('a[href^="https://coursera.org/verify/"]')
        .evaluateAll((els) => els.map((a) => a.getAttribute('href')));
      assert.equal(hrefs.length, 6);
      for (const { code } of CANONICAL_COURSERA_CODES) {
        assert.ok(hrefs.includes(`https://coursera.org/verify/${code}`), `Missing Coursera verify URL for ${code}`);
      }
      errors.assertZeroUnexpected('T1-F12-03');
    });
  });

  test('T1-F12-04: Coursera exact scores & Jun–Oct 2026 dates', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      for (const { score } of CANONICAL_COURSERA_CODES) {
        assert.ok(text.includes(score), `Missing Coursera score: ${score}`);
      }
      for (const date of ['Jun 4, 2026', 'Oct 25, 2026']) {
        assert.ok(text.includes(date), `Missing Coursera date: ${date}`);
      }
      errors.assertZeroUnexpected('T1-F12-04');
    });
  });

  test('T1-F12-05: Academic education (UMP 2022 & IIUM 2004–2008)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      assert.ok(text.includes('Professional Diploma in Blockchain Technology'));
      assert.ok(text.includes('Universiti Malaysia Pahang (UMP)'));
      assert.ok(text.includes('2022'));
      assert.ok(text.includes('Bachelor of Nursing'));
      assert.ok(text.includes('International Islamic University Malaysia (IIUM)'));
      assert.ok(text.includes('2004 – 2008'));
      errors.assertZeroUnexpected('T1-F12-05');
    });
  });

  // F13: GovernanceAndBackground.jsx
  test('T1-F13-01: Governance heading & all 5 chronological roles rendered', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      for (const org of CANONICAL_OPERATIONAL_ORGS) {
        assert.ok(text.includes(org), `Missing role org: ${org}`);
      }
      assert.ok(text.includes('Mar 2025 – Aug 2026'));
      assert.ok(text.includes('Apr 2015 – Aug 2018'));
      errors.assertZeroUnexpected('T1-F13-01');
    });
  });

  test('T1-F13-02: Clinical & HSEQ transferable details (zero-fabrication & 73 drivers)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await expandAllGovernanceRoles(page);
      const text = await page.locator('main').innerText();
      assert.ok(text.includes('73 inland distribution drivers'));
      assert.match(text, /zero-fabrication/i);
      errors.assertZeroUnexpected('T1-F13-02');
    });
  });

  test('T1-F13-03: Interactive accordion toggle behavior on operational roles', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const govSection = await getGovernanceSection(page);
      const accordionBtn = govSection.locator('button[aria-expanded]').first();
      const detailsEl = govSection.locator('details').first();
      if ((await accordionBtn.count()) > 0) {
        const before = await accordionBtn.getAttribute('aria-expanded');
        await accordionBtn.click();
        const afterClick = await accordionBtn.getAttribute('aria-expanded');
        assert.notEqual(afterClick, before);
      } else if ((await detailsEl.count()) > 0) {
        const summary = detailsEl.locator('summary').first();
        const beforeOpen = (await detailsEl.getAttribute('open')) !== null;
        await summary.click();
        const afterOpen = (await detailsEl.getAttribute('open')) !== null;
        assert.notEqual(afterOpen, beforeOpen);
      } else {
        assert.fail('Expected interactive Governance accordion (button[aria-expanded] or <details><summary>)');
      }
      errors.assertZeroUnexpected('T1-F13-03');
    });
  });

  test('T1-F13-04: 4 Engineering Non-Negotiables rendered', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      assert.match(text, /Deterministic Math|Deterministik/i);
      assert.match(text, /RM 0\/mo|Zero-Subscription|Tanpa Langganan/i);
      assert.match(text, /PDPA 2024|Zero-PII|NRIC/i);
      assert.match(text, /Honest Attribution|Atribusi Telus|Jujur/i);
      errors.assertZeroUnexpected('T1-F13-04');
    });
  });

  test('T1-F13-05: Governance bilingual switch updates roles & Non-Negotiables to BM', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await switchLanguage(page, 'bm');
      await expandAllGovernanceRoles(page);
      const text = await page.locator('main').innerText();
      assert.match(text, /73 pemandu/i);
      assert.match(text, /PDPA 2024|NRIC/i);
      assert.deepEqual(scanTextForIndonesianTerms(text, 'Governance BM'), []);
      errors.assertZeroUnexpected('T1-F13-05');
    });
  });

  // F14: Footer.jsx
  test('T1-F14-01: Footer direct contact links (Gmail compose, WhatsApp, LinkedIn, GitHub)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const footer = page.locator('footer').first();
      const gmailHref = await footer.locator('a[href^="https://mail.google.com/mail/"]').first().getAttribute('href');
      assert.ok(gmailHref && gmailHref.includes('mfaiz.mdnordin%40gmail.com'));
      assert.equal(await footer.locator('a[href*="wa.me"]').first().getAttribute('href'), 'https://wa.me/60183904690');
      assert.match(await footer.locator('a[href*="linkedin.com"]').first().getAttribute('href') || '', /^https:\/\//);
      assert.match(await footer.locator('a[href*="github.com"]').first().getAttribute('href') || '', /^https:\/\//);
      errors.assertZeroUnexpected('T1-F14-01');
    });
  });

  test('T1-F14-02: Footer PDPA & candidate attribution statement', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const footerText = await page.locator('footer').first().innerText();
      assert.match(footerText, /PDPA/i);
      assert.match(footerText, /Mohd Faiz/i);
      errors.assertZeroUnexpected('T1-F14-02');
    });
  });

  test('T1-F14-03: Footer JSON export trigger exists & is interactive', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const footer = page.locator('footer').first();
      let trigger = await findFirstVisible(
        footer.locator('button, a[download], [role="button"]').filter({ hasText: /export|json|muat turun|download/i })
      );
      if (!trigger) {
        trigger = await findFirstVisible(footer.getByRole('button', { name: /export|json|muat turun|download/i }));
      }
      assert.ok(trigger, 'Visible Footer JSON export trigger not found');
      assert.equal(await trigger.isEnabled(), true);
      errors.assertZeroUnexpected('T1-F14-03');
    });
  });

  test('T1-F14-04: Footer JSON export downloads valid sanitized JSON', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const { parsed } = await triggerFooterJsonExport(page);
      assert.ok(parsed.profile, 'Exported JSON missing profile');
      assert.ok(Array.isArray(parsed.projects), 'Exported JSON missing projects array');
      assert.equal(parsed.projects.length, truth.expectedSystems);
      assert.ok(Array.isArray(parsed.caseStudies), 'Exported JSON missing caseStudies');
      assert.ok(parsed.credentials, 'Exported JSON missing credentials');
      errors.assertZeroUnexpected('T1-F14-04');
    });
  });

  test('T1-F14-05: Footer JSON export contains zero NRIC/PII', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const { rawText } = await triggerFooterJsonExport(page);
      assert.deepEqual(scanTextForPdpaNric(rawText, 'exported-json'), []);
      errors.assertZeroUnexpected('T1-F14-05');
    });
  });

  // F15: PDPA 2024 Zero-NRIC Protection
  test('T1-F15-01: Zero NRIC in initial rendered EN DOM (innerText & innerHTML)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const { innerText, innerHTML } = await page.evaluate(() => ({
        innerText: document.body.innerText,
        innerHTML: document.documentElement.innerHTML,
      }));
      assert.deepEqual(scanTextForPdpaNric(innerText, 'EN innerText'), []);
      assert.deepEqual(scanTextForPdpaNric(innerHTML, 'EN innerHTML'), []);
      errors.assertZeroUnexpected('T1-F15-01');
    });
  });

  test('T1-F15-02: Zero NRIC in BM DOM, open modals & expanded accordions', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await switchLanguage(page, 'bm');
      await expandAllGovernanceRoles(page);
      for (const id of truth.projects.map((p) => p.id)) {
        const dialog = await openProjectModal(page, id);
        const modalText = await dialog.innerText();
        assert.deepEqual(scanTextForPdpaNric(modalText, `BM modal ${id}`), []);
        await closeModal(page, 'escape');
      }
      const fullText = await page.evaluate(() => document.body.innerText);
      assert.deepEqual(scanTextForPdpaNric(fullText, 'BM expanded DOM'), []);
      errors.assertZeroUnexpected('T1-F15-02');
    });
  });

  test('T1-F15-03: Zero NRIC across all built dist/ files', () => {
    const violations = scanDirectoryForPdpaNric(distDir);
    assert.deepEqual(violations, []);
  });

  test('T1-F15-04: SKM NRIC-masking overlay/notice visible in Credentials Vault', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      assert.match(text, /Mask NRIC|NRIC.*mask|Lindungi.*NRIC|PDPA/i);
      errors.assertZeroUnexpected('T1-F15-04');
    });
  });

  test('T1-F15-05: Zero unmasked keyword-proximity IC numbers in DOM & dist/', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const html = await page.evaluate(() => document.documentElement.outerHTML);
      assert.deepEqual(scanTextForPdpaNric(html, 'outerHTML'), []);
      assert.deepEqual(scanDirectoryForPdpaNric(distDir), []);
      errors.assertZeroUnexpected('T1-F15-05');
    });
  });

  // F16: Honest Attribution Boundaries
  test('T1-F16-01: Pillar 1 attribution boundary (Sandbox Stress-Tested)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      assert.match(text, /Production-Architected & Sandbox Stress-Tested/i);
      assert.match(text, /Mock\/Live API Adapter Ready/i);
      errors.assertZeroUnexpected('T1-F16-01');
    });
  });

  test('T1-F16-02: Pillar 2 attribution boundary (Documented Real-World Local Engagements)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      assert.match(text, /Documented Real-World.*Engagements/i);
      errors.assertZeroUnexpected('T1-F16-02');
    });
  });

  test('T1-F16-03: CS-02 POS sales lift honest operational observation framing', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      assert.ok(text.includes('without claiming isolated paid-ad attribution'));
      errors.assertZeroUnexpected('T1-F16-03');
    });
  });

  test('T1-F16-04: Coursera 6-of-8 pathway attribution accuracy', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      assert.match(text, /6.*8-course|6 individually verified/i);
      errors.assertZeroUnexpected('T1-F16-04');
    });
  });

  test('T1-F16-05: Honest attribution disclaimers persist in Malaysian BM', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await switchLanguage(page, 'bm');
      const text = await page.locator('main').innerText();
      assert.ok(text.includes('tanpa tuntutan atribusi iklan berbayar yang berlebihan'));
      assert.match(text, /6 daripada 8|6 kursus|Sandbox/i);
      errors.assertZeroUnexpected('T1-F16-05');
    });
  });

  // F17: PDPA Zero-File Guard & 40 Process Visuals Integrity
  test('T1-F17-01: Hero contains zero resume PDF file references & zero broken images', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const hero = page.locator('main section').first();
      const html = await hero.innerHTML();
      assert.equal(/resume-mohd-faiz|\.pdf/i.test(html), false, 'Unexpected resume PDF reference in Hero');
      await assertNoBrokenVisibleImages(page);
      errors.assertZeroUnexpected('T1-F17-01');
    });
  });

  test('T1-F17-02: SKM verification metadata renders cleanly without cert file reference or broken img', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await assertNoBrokenVisibleImages(page);
      const html = await page.locator('main').innerHTML();
      assert.ok(html.includes('S304265796'));
      assert.equal(/skm-level-3-cert/i.test(html), false, 'Unexpected cert file reference in DOM');
      errors.assertZeroUnexpected('T1-F17-02');
    });
  });

  test('T1-F17-03: All 3 Case Study fallback slots have non-zero layout dimensions', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      for (const cs of CANONICAL_CASE_STUDIES) {
        const card = getCaseStudyCard(page, cs, truth);
        const box = await card.boundingBox();
        assert.ok(box && box.height >= 80, `Case study card ${cs.id} collapsed unexpectedly`);
      }
      await assertNoBrokenVisibleImages(page);
      errors.assertZeroUnexpected('T1-F17-03');
    });
  });

  test('T1-F17-04: Project modal optional process-visual slot renders safely', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await openProjectModal(page, 'PRJ-01');
      await assertNoBrokenVisibleImages(page);
      errors.assertZeroUnexpected('T1-F17-04');
    });
  });

  test('T1-F17-05: Zero broken visible <img> elements across full page & open modal', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await assertNoBrokenVisibleImages(page);
      await openProjectModal(page, 'PRJ-05');
      await assertNoBrokenVisibleImages(page);
      errors.assertZeroUnexpected('T1-F17-05');
    });
  });

  test('T1-F17-06: PRJ-06 all 9 processVisuals exist in dist/ and render [data-asset-status="ready"] with naturalWidth > 0', async () => {
    const prj06 = truth.projects.find((p) => p.id === 'PRJ-06');
    assert.ok(prj06, 'Expected PRJ-06 in truth.projects');
    assert.equal(prj06.processVisuals.length, 9);
    for (const visual of prj06.processVisuals) {
      const distAsset = path.join(distDir, visual.src.replace(/^\/+/, ''));
      assert.ok(fs.existsSync(distAsset), `Missing built PRJ-06 slide in dist/: ${distAsset}`);
    }

    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const dialog = await openProjectModal(page, 'PRJ-06');
      const visualsSection = dialog.getByTestId('process-visuals-section');
      await visualsSection.waitFor({ state: 'visible' });
      const tabs = visualsSection.locator('[role="tab"]');
      assert.equal(await tabs.count(), 9, 'Expected 9 slide tabs in PRJ-06 modal');

      for (let i = 0; i < 9; i++) {
        await tabs.nth(i).click();
        const readySlot = visualsSection.locator('[data-asset-status="ready"]');
        await readySlot.waitFor({ state: 'visible', timeout: 5000 });
        const imgCheck = await readySlot.locator('img').evaluate((img) => ({
          src: img.getAttribute('src'),
          complete: img.complete,
          naturalWidth: img.naturalWidth,
        }));
        assert.equal(imgCheck.complete, true, `PRJ-06 slide ${i + 1} image did not finish loading`);
        assert.ok(imgCheck.naturalWidth > 0, `PRJ-06 slide ${i + 1} naturalWidth must be > 0`);
        assert.equal(imgCheck.src, prj06.processVisuals[i].src);
      }

      await closeModal(page, 'escape');
      errors.assertZeroUnexpected('T1-F17-06');
    });
  });

  // F18: CONTRIBUTING_PROJECTS.md & PRJ-06+ Scaling Contract
  test('T1-F18-01: CONTRIBUTING_PROJECTS.md exists and is non-empty (>500 bytes)', () => {
    const docPath = path.join(REPO_ROOT, 'CONTRIBUTING_PROJECTS.md');
    assert.ok(fs.existsSync(docPath), `Missing ${docPath}`);
    const stat = fs.statSync(docPath);
    assert.ok(stat.size > 500, `CONTRIBUTING_PROJECTS.md too small: ${stat.size} bytes`);
  });

  test('T1-F18-02: CONTRIBUTING_PROJECTS.md documents src/data/projects.json & PRJ-06 schema', () => {
    const doc = fs.readFileSync(path.join(REPO_ROOT, 'CONTRIBUTING_PROJECTS.md'), 'utf8');
    for (const token of ['src/data/projects.json', 'PRJ-06', 'stageCode', 'pipelineNodes', 'deterministicGate', 'boundedAiRole']) {
      assert.ok(doc.includes(token), `CONTRIBUTING_PROJECTS.md missing token: ${token}`);
    }
  });

  test('T1-F18-03: CONTRIBUTING_PROJECTS.md documents public/assets/ process visuals', () => {
    const doc = fs.readFileSync(path.join(REPO_ROOT, 'CONTRIBUTING_PROJECTS.md'), 'utf8');
    assert.ok(doc.includes('public/assets/'));
    assert.match(doc, /processVisual|visual|png|jpg|pdf/i);
  });

  test('T1-F18-04: CONTRIBUTING_PROJECTS.md documents npm run build -> dist/ & Cloudflare Pages', () => {
    const doc = fs.readFileSync(path.join(REPO_ROOT, 'CONTRIBUTING_PROJECTS.md'), 'utf8');
    assert.ok(doc.includes('npm run build'));
    assert.ok(doc.includes('dist/'));
    assert.match(doc, /Cloudflare Pages|pages\.dev/i);
  });

  test('T1-F18-05: Schema consistency between CONTRIBUTING_PROJECTS.md & rendered PRJ-01..05', async () => {
    const doc = fs.readFileSync(path.join(REPO_ROOT, 'CONTRIBUTING_PROJECTS.md'), 'utf8');
    for (const key of ['id', 'stageCode', 'title', 'stack', 'pipelineNodes']) {
      assert.ok(doc.includes(key), `Schema key "${key}" missing from CONTRIBUTING_PROJECTS.md`);
    }
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const dialog = await openProjectModal(page, 'PRJ-01');
      const modalText = await dialog.innerText();
      assert.ok(modalText.includes('PRJ-01'));
      assert.ok(modalText.includes('Inbound Form Webhook'));
      errors.assertZeroUnexpected('T1-F18-05');
    });
  });

  // R2 & R3 Coverage: LiveAppsShowcase & Light Mode Contrast
  test('T1-R2-01: LiveAppsShowcase renders APP-01..10 in EN & BM with live links and non-live coming-soon state', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const section = page.locator('#live-apps');
      await section.waitFor({ state: 'visible' });
      const enText = await section.innerText();
      const expectedApps = [
        'AdForge MY',
        'VertigoLab',
        'PanicLab',
        'AddMath Mudah',
        'Kelas Mengaji Ruby',
        'TemanBakti',
        'AdVenture AI',
        'AuditSiap',
        'Radhi Fruits',
        'SebutCepat AI',
      ];
      for (const appName of expectedApps) {
        assert.ok(enText.includes(appName), `Missing live app in EN: ${appName}`);
      }
      assert.equal(await section.locator('[data-live-app-id]').count(), 10);
      assert.equal(await section.locator('[data-live-app-status="live"]').count(), 9);
      assert.equal(await section.locator('[data-live-app-status="coming-soon"]').count(), 1);

      for (const liveId of ['APP-01', 'APP-02', 'APP-03', 'APP-04', 'APP-05', 'APP-06', 'APP-07', 'APP-08', 'APP-09']) {
        const card = section.locator(`[data-live-app-id="${liveId}"]`);
        assert.equal(await card.getAttribute('data-live-app-status'), 'live');
        assert.ok((await card.innerText()).includes('LIVE'));
        const launchHref = await card.locator('a[target="_blank"][rel*="noopener"]').first().getAttribute('href');
        assert.match(launchHref || '', /^https:\/\//, `Missing https:// launch URL on ${liveId}`);
      }

      for (const privateId of ['APP-05', 'APP-06', 'APP-07', 'APP-09']) {
        const card = section.locator(`[data-live-app-id="${privateId}"]`);
        assert.ok((await card.innerText()).includes('Private Repo'), `Expected Private Repo pill on ${privateId}`);
        assert.equal(await card.locator('a[href*="github.com"]').count(), 0, `Unexpected broken GitHub link on ${privateId}`);
      }

      const app10 = section.locator('[data-live-app-id="APP-10"]');
      assert.equal(await app10.getAttribute('data-live-app-status'), 'coming-soon');
      const app10En = await app10.innerText();
      assert.ok(app10En.includes('COMING SOON'));
      assert.ok(app10En.includes('Deployment Coming Soon'));
      assert.equal(await app10.locator('a').count(), 0, 'Non-live APP-10 must render zero <a> links');

      await switchLanguage(page, 'bm');
      const bmText = await section.innerText();
      for (const appName of expectedApps) {
        assert.ok(bmText.includes(appName), `Missing live app in BM: ${appName}`);
      }
      assert.ok(bmText.includes('Aplikasi Web Langsung'));
      assert.ok(bmText.includes('Buka Aplikasi Langsung'));
      assert.ok(bmText.includes('AKAN DATANG'));
      assert.ok(bmText.includes('Pelancaran Akan Datang'));
      assert.ok(bmText.includes('Repositori Persendirian'));
      assert.deepEqual(scanTextForIndonesianTerms(bmText, 'LiveAppsShowcase BM'), []);

      await page.setViewportSize(VIEWPORTS.mobile);
      await assertNoHorizontalOverflow(page);
      await page.setViewportSize(VIEWPORTS.narrow);
      await assertNoHorizontalOverflow(page);
      errors.assertZeroUnexpected('T1-R2-01');
    });
  });

  test('T1-R3-01: Light Mode toggle applies readable surface & WCAG 2.1 AA text contrast (>=4.5:1) across Funnel, Systems, Live Apps, Credentials & Modal', async () => {
    const contrastRatio = (fgStr, bgStr) => {
      const l1 = relativeLuminance(parseRgb(fgStr));
      const l2 = relativeLuminance(parseRgb(bgStr));
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };

    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await page.getByTestId('theme-toggle').click();
      const theme = await page.evaluate(() => document.documentElement.dataset.theme);
      assert.equal(theme, 'light');
      await page.waitForTimeout(250);

      // Click stage 02 so active .bg-emerald-400 funnel pill is also rendered
      await getFunnelStageButton(page, '02').click();
      await page.waitForTimeout(250);

      const metrics = await page.evaluate(() => {
        const readColors = (el) => {
          if (!el) return null;
          const cs = getComputedStyle(el);
          return { text: (el.textContent || '').trim(), bg: cs.backgroundColor, color: cs.color };
        };
        const stage2 = document.querySelector('[data-funnel-stage="02"]');
        const activePill = stage2?.querySelector('span:last-child');
        const stage1 = document.querySelector('[data-funnel-stage="01"]');
        const inactivePill = stage1?.querySelector('span:last-child');
        const emeraldSolidNodes = Array.from(document.querySelectorAll('.bg-emerald-400')).filter((el) => {
          const rect = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return rect.width > 4 && rect.height > 4 && cs.visibility !== 'hidden' && (el.textContent || '').trim().length > 0;
        });
        const prjBadges = Array.from(document.querySelectorAll('#systems article .bg-slate-800.text-emerald-300'));
        const comingSoonBadges = Array.from(document.querySelectorAll('#live-apps [data-live-app-status="coming-soon"] .bg-amber-950\\/20'));
        const liveAppNoticePills = Array.from(document.querySelectorAll('#live-apps .bg-slate-800'));
        return {
          bodyBg: getComputedStyle(document.body).backgroundColor,
          activePill: readColors(activePill),
          inactivePill: readColors(inactivePill),
          emeraldSolids: emeraldSolidNodes.map(readColors),
          prjBadges: prjBadges.map(readColors),
          comingSoonBadges: comingSoonBadges.map(readColors),
          liveAppNoticePills: liveAppNoticePills.map(readColors),
        };
      });

      const bodyLum = relativeLuminance(parseRgb(metrics.bodyBg));
      assert.ok(bodyLum > 0.8, `Expected light body background, got ${metrics.bodyBg}`);
      assert.ok(metrics.inactivePill, 'Expected inactive stage pill');
      assert.ok(
        contrastRatio(metrics.inactivePill.color, metrics.inactivePill.bg) >= 4.5,
        `Inactive stage pill failed AA contrast: ${JSON.stringify(metrics.inactivePill)}`
      );
      assert.ok(metrics.activePill, 'Expected active stage pill');
      assert.ok(
        contrastRatio(metrics.activePill.color, metrics.activePill.bg) >= 4.5,
        `Active stage pill failed AA contrast: ${JSON.stringify(metrics.activePill)}`
      );

      assert.ok(metrics.emeraldSolids.length >= 4, `Expected >=4 visible .bg-emerald-400 controls/badges, got ${metrics.emeraldSolids.length}`);
      for (const item of metrics.emeraldSolids) {
        const ratio = contrastRatio(item.color, item.bg);
        assert.ok(ratio >= 4.5, `Light Mode .bg-emerald-400 element "${item.text}" failed WCAG 2.1 AA (${ratio.toFixed(2)}:1 < 4.5:1): ${JSON.stringify(item)}`);
      }

      assert.equal(metrics.comingSoonBadges.length, 1, 'Expected 1 coming-soon badge on APP-09');
      for (const badge of metrics.comingSoonBadges) {
        const ratio = contrastRatio(badge.color, badge.bg);
        assert.ok(ratio >= 4.5, `Light Mode coming-soon badge "${badge.text}" failed WCAG 2.1 AA (${ratio.toFixed(2)}:1 < 4.5:1): ${JSON.stringify(badge)}`);
      }

      assert.ok(metrics.liveAppNoticePills.length >= 4, `Expected >=4 non-interactive notice/private-repo pills in Live Apps, got ${metrics.liveAppNoticePills.length}`);
      for (const pill of metrics.liveAppNoticePills) {
        const ratio = contrastRatio(pill.color, pill.bg);
        assert.ok(ratio >= 4.5, `Light Mode Live Apps pill "${pill.text}" failed WCAG 2.1 AA (${ratio.toFixed(2)}:1 < 4.5:1): ${JSON.stringify(pill)}`);
      }

      // Reset stages so all PRJ badges are visible (already verified for stage 02, now verify all)
      await getAllStagesButton(page).click();
      await page.waitForTimeout(250);
      const allPrjBadges = await page.evaluate(() =>
        Array.from(document.querySelectorAll('#systems article .bg-slate-800.text-emerald-300')).map((el) => {
          const cs = getComputedStyle(el);
          return { text: (el.textContent || '').trim(), bg: cs.backgroundColor, color: cs.color };
        })
      );
      assert.equal(allPrjBadges.length, truth.expectedSystems, `Expected all ${truth.expectedSystems} PRJ ID badges`);
      for (const badge of allPrjBadges) {
        const ratio = contrastRatio(badge.color, badge.bg);
        assert.ok(ratio >= 4.5, `Light Mode PRJ badge "${badge.text}" failed WCAG 2.1 AA (${ratio.toFixed(2)}:1 < 4.5:1): ${JSON.stringify(badge)}`);
      }

      const dialog = await openProjectModal(page, 'PRJ-02');
      const formulaPreLum = await dialog.locator('pre').first().evaluate((el) => {
        const cs = getComputedStyle(el);
        return { bg: cs.backgroundColor, color: cs.color };
      });
      assert.ok(relativeLuminance(parseRgb(formulaPreLum.bg)) > 0.7, `Expected light <pre> surface, got ${formulaPreLum.bg}`);
      assert.ok(contrastRatio(formulaPreLum.color, formulaPreLum.bg) >= 4.5, `Light Mode <pre> failed AA contrast: ${JSON.stringify(formulaPreLum)}`);
      await closeModal(page, 'escape');

      errors.assertZeroUnexpected('T1-R3-01');
    });
  });
});
