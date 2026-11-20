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
  assertMobileCardsFitViewport,
  assertNoBrokenVisibleImages,
  assertNoHorizontalOverflow,
  closeModal,
  expandAllGovernanceRoles,
  findFirstVisible,
  getAllStagesButton,
  getCaseStudiesSection,
  getCaseStudyCard,
  getCourseraCards,
  getCurrentLanguage,
  getFunnelStageButton,
  getGovernanceSection,
  getHeroKpiCards,
  getNavbar,
  getSearchInput,
  getSkmContainer,
  getVisibleProjectIds,
  launchBrowser,
  loadGroundTruth,
  openProjectModal,
  parseRgb,
  relativeLuminance,
  resolveDistDir,
  runIsolatedNextProjectProbe,
  scanDirectoryForIndonesianTerms,
  scanDirectoryForPdpaNric,
  scanTextForIndonesianTerms,
  scanTextForPdpaNric,
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

describe('Tier 2 — Boundaries, Corner Cases & Adversarial Inputs (F1–F18, 90 Tests)', () => {
  // F1 Boundaries
  test('T2-F01-01: Unknown SPA route (/nonexistent-route) loads cleanly without JS crash', async () => {
    await withTrackedPage(browser, `${server.baseUrl}/nonexistent-route`, {}, async ({ page, errors }) => {
      const rootLen = await page.locator('#root').innerHTML();
      assert.ok(rootLen.trim().length > 0);
      errors.assertZeroUnexpected('T2-F01-01');
    });
  });

  test('T2-F01-02: Missing optional portfolio assets never emit fatal JS/bundle errors', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await page.waitForTimeout(200);
      errors.assertZeroUnexpected('T2-F01-02');
    });
  });

  test('T2-F01-03: Desktop 1440x900 zero horizontal overflow', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.desktop }, async ({ page, errors }) => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await assertNoHorizontalOverflow(page);
      errors.assertZeroUnexpected('T2-F01-03');
    });
  });

  test('T2-F01-04: Mobile 390x844 zero horizontal overflow', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.mobile }, async ({ page, errors }) => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await assertNoHorizontalOverflow(page);
      errors.assertZeroUnexpected('T2-F01-04');
    });
  });

  test('T2-F01-05: Ultra-narrow 320x568 viewport zero horizontal overflow', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.narrow }, async ({ page, errors }) => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await assertNoHorizontalOverflow(page);
      errors.assertZeroUnexpected('T2-F01-05');
    });
  });

  // F2 Boundaries
  test('T2-F02-01: Long project title (PRJ-05) wraps cleanly within 390px mobile viewport', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.mobile }, async ({ page, errors }) => {
      const rightEdge = await page.evaluate(() => {
        const isVisible = (n) => {
          const cs = getComputedStyle(n);
          const r = n.getBoundingClientRect();
          return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
        };
        const heading = Array.from(document.querySelectorAll('main h2, main h3, main h4')).find(
          (n) => isVisible(n) && (n.textContent || '').includes('Order-to-Settlement Reconciler') && !/PRJ-01/.test(n.textContent || '')
        );
        if (heading) return heading.getBoundingClientRect().right;
        const inner = Array.from(document.querySelectorAll('main *'))
          .reverse()
          .find((n) => isVisible(n) && (n.textContent || '').includes('Order-to-Settlement Reconciler'));
        return inner ? inner.getBoundingClientRect().right : null;
      });
      assert.ok(rightEdge !== null && rightEdge <= 390, `PRJ-05 title overflowed mobile edge: ${rightEdge}`);
      errors.assertZeroUnexpected('T2-F02-01');
    });
  });

  test('T2-F02-02: Non-sequential stageCode mapping (01,02,05,03,04) preserved accurately', async () => {
    const expected03 = truth.projects.filter((p) => p.stageCode === '03').map((p) => p.id).sort();
    const expected04 = truth.projects.filter((p) => p.stageCode === '04').map((p) => p.id).sort();
    const expected05 = truth.projects.filter((p) => p.stageCode === '05').map((p) => p.id).sort();
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await getFunnelStageButton(page, '03').click();
      assert.deepEqual(await getVisibleProjectIds(page), expected03);
      await getFunnelStageButton(page, '04').click();
      assert.deepEqual(await getVisibleProjectIds(page), expected04);
      await getFunnelStageButton(page, '05').click();
      assert.deepEqual(await getVisibleProjectIds(page), expected05);
      errors.assertZeroUnexpected('T2-F02-02');
    });
  });

  test('T2-F02-03: Special UTF-8 symbols & ranges (< 10s, RM 0.00, 93.23%–99.37%) render uncorrupted', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('body').innerText();
      assert.ok(text.includes('< 10s'));
      assert.ok(text.includes('RM 0.00'));
      assert.ok(text.includes('93.23%'));
      assert.ok(text.includes('99.37%'));
      assert.equal(/&lt;|&amp;|&mdash;|â€“/.test(text), false, 'Found unescaped HTML entity or mojibake in DOM');
      errors.assertZeroUnexpected('T2-F02-03');
    });
  });

  test('T2-F02-04: Omitted optional processVisual in PRJ-01..PRJ-05 renders modal with zero TypeError', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const ids = truth.projects.filter((p) => !p.processVisual).map((p) => p.id);
      assert.ok(ids.length >= 1, 'Expected at least 1 project without processVisual');
      for (const id of ids) {
        const dialog = await openProjectModal(page, id);
        assert.ok((await dialog.innerText()).includes(id));
        await closeModal(page, 'escape');
      }
      errors.assertZeroUnexpected('T2-F02-04');
    });
  });

  test('T2-F02-05: Zero monetary values (RM 0/mo, RM 0.00) never treated as falsy/blank', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const dialog1 = await openProjectModal(page, 'PRJ-01');
      assert.ok((await dialog1.innerText()).includes('RM 0/mo'));
      await closeModal(page, 'escape');

      const dialog5 = await openProjectModal(page, 'PRJ-05');
      assert.ok((await dialog5.innerText()).includes('RM 0.00'));
      await closeModal(page, 'escape');
      errors.assertZeroUnexpected('T2-F02-05');
    });
  });

  // F3 Boundaries
  test('T2-F03-01: Filtering Registry to 1 item preserves Navbar/Hero total count N', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await getFunnelStageButton(page, '01').click();
      assert.deepEqual(await getVisibleProjectIds(page), ['PRJ-01']);
      const navText = await getNavbar(page).innerText();
      assert.match(navText, new RegExp(`\\b${truth.expectedSystems}\\b`));
      errors.assertZeroUnexpected('T2-F03-01');
    });
  });

  test('T2-F03-02: Zero search matches shows 0 visible cards while total stays N', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const search = await getSearchInput(page);
      await search.fill('zzzz-no-match-999');
      assert.deepEqual(await getVisibleProjectIds(page), []);
      const navText = await getNavbar(page).innerText();
      assert.match(navText, new RegExp(`\\b${truth.expectedSystems}\\b`));
      errors.assertZeroUnexpected('T2-F03-02');
    });
  });

  test('T2-F03-03: Filtering/search combination yielding 0 systems never shows NaN or undefined', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await getFunnelStageButton(page, '01').click();
      const search = await getSearchInput(page);
      await search.fill('GMV Max');
      assert.deepEqual(await getVisibleProjectIds(page), []);
      const regText = await page.locator('main').innerText();
      assert.equal(/\b(NaN|undefined)\b/.test(regText), false);
      errors.assertZeroUnexpected('T2-F03-03');
    });
  });

  test('T2-F03-04: PRJ-07 isolated rebuild increments ONLY Stage 02 and total (6 -> 7)', async () => {
    await runIsolatedNextProjectProbe(browser, async ({ baseUrl, expectedStageCounts, expectedStage02Ids }) => {
      await withTrackedPage(browser, baseUrl, {}, async ({ page, errors }) => {
        for (const [code, expectedCount] of expectedStageCounts) {
          const text = await getFunnelStageButton(page, code).innerText();
          assert.match(text, new RegExp(`\\b${expectedCount}\\b`), `Stage ${code} expected count ${expectedCount}`);
        }
        await getFunnelStageButton(page, '02').click();
        assert.deepEqual(await getVisibleProjectIds(page), expectedStage02Ids);
        errors.assertZeroUnexpected('T2-F03-04');
      });
    });
  });

  test('T2-F03-05: No undefined/NaN in dynamic counters across EN -> BM -> EN roundtrip', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await switchLanguage(page, 'bm');
      let bodyText = await page.locator('body').innerText();
      assert.equal(/\b(NaN|undefined|null)\b/.test(bodyText), false);
      await switchLanguage(page, 'en');
      bodyText = await page.locator('body').innerText();
      assert.equal(/\b(NaN|undefined|null)\b/.test(bodyText), false);
      errors.assertZeroUnexpected('T2-F03-05');
    });
  });

  // F4 Boundaries
  test('T2-F04-01: Zero white-flash or light default canvas on html & body', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const colors = await page.evaluate(() => ({
        htmlBg: getComputedStyle(document.documentElement).backgroundColor,
        bodyBg: getComputedStyle(document.body).backgroundColor,
      }));
      assert.notEqual(colors.bodyBg, 'rgb(255, 255, 255)');
      assert.notEqual(colors.htmlBg, 'rgb(255, 255, 255)');
      const rgb = parseRgb(colors.bodyBg) || parseRgb(colors.htmlBg);
      assert.ok(rgb && relativeLuminance(rgb) < 0.1);
      errors.assertZeroUnexpected('T2-F04-01');
    });
  });

  test('T2-F04-02: Modal z-index stacks cleanly over sticky Navbar', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const dialog = await openProjectModal(page, 'PRJ-01');
      const modalZ = await dialog.evaluate((el) => {
        let curr = el;
        while (curr) {
          const z = parseInt(getComputedStyle(curr).zIndex, 10);
          if (!Number.isNaN(z) && z > 0) return z;
          curr = curr.parentElement;
        }
        return 0;
      });
      const navZ = await getNavbar(page).evaluate((el) => parseInt(getComputedStyle(el).zIndex, 10) || 0);
      assert.ok(modalZ >= navZ, `Expected modal z-index (${modalZ}) >= navbar z-index (${navZ})`);
      errors.assertZeroUnexpected('T2-F04-02');
    });
  });

  test('T2-F04-03: Mobile 390x844 headings and mono badges do not exceed viewport width', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.mobile }, async ({ page, errors }) => {
      const overflowing = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('h1, h2, h3, code'))
          .filter((el) => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().right > 391)
          .map((el) => ({ tag: el.tagName, text: el.textContent?.slice(0, 40), right: el.getBoundingClientRect().right }));
      });
      assert.deepEqual(overflowing, []);
      errors.assertZeroUnexpected('T2-F04-03');
    });
  });

  test('T2-F04-04: PRJ-05 7-stack pill wrap fits cleanly on 390x844 mobile', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.mobile }, async ({ page, errors }) => {
      await getFunnelStageButton(page, '04').click();
      await assertNoHorizontalOverflow(page);
      errors.assertZeroUnexpected('T2-F04-04');
    });
  });

  test('T2-F04-05: Keyboard Tab navigation advances focus across interactive controls', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const visited = [];
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
        visited.push(await page.evaluate(() => document.activeElement?.tagName || 'NONE'));
      }
      assert.ok(visited.some((tag) => tag === 'A' || tag === 'BUTTON'), `Expected focusable A/BUTTON elements, got ${visited}`);
      errors.assertZeroUnexpected('T2-F04-05');
    });
  });

  // F5 Boundaries
  test('T2-F05-01: Zero Indonesian leakage in BM rendered DOM', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await switchLanguage(page, 'bm');
      await expandAllGovernanceRoles(page);
      const text = await page.locator('body').innerText();
      assert.deepEqual(scanTextForIndonesianTerms(text, 'BM body.innerText'), []);
      errors.assertZeroUnexpected('T2-F05-01');
    });
  });

  test('T2-F05-02: Zero Indonesian leakage across built dist/ static files', () => {
    const matches = scanDirectoryForIndonesianTerms(distDir);
    assert.deepEqual(matches, []);
  });

  test('T2-F05-03: Rapid 5x EN/BM toggle settles deterministically without mixed-language state', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const nav = getNavbar(page);
      const bmRe = /^(BM|Bahasa Melayu|Malay|MS)$|Switch language to (?:Bahasa Melayu|Malay|BM)|Tukar bahasa ke Bahasa Melayu/i;
      const enRe = /^(EN|English)$|Switch language to English|Tukar bahasa ke Bahasa Inggeris/i;
      const singleRe = /EN\s*\|\s*BM|BM\s*\|\s*EN|Bahasa|English|Switch language|Tukar bahasa/i;

      const bmBtn = await findFirstVisible(nav.getByRole('button', { name: bmRe }));
      const enBtn = await findFirstVisible(nav.getByRole('button', { name: enRe }));
      const isDual =
        Boolean(bmBtn && enBtn) &&
        (await bmBtn.evaluate((a, b) => a !== b, await enBtn.elementHandle())) &&
        !(await bmBtn.innerText()).includes('|');

      if (isDual) {
        await bmBtn.click();
        await enBtn.click();
        await bmBtn.click();
        await enBtn.click();
        await bmBtn.click();
      } else {
        for (let i = 0; i < 5; i++) {
          const btn = await findFirstVisible(nav.getByRole('button', { name: singleRe }));
          assert.ok(btn, `Language toggle button missing on click ${i + 1}`);
          await btn.click();
        }
      }
      await page
        .waitForFunction(() => /Pengamal Pemasaran Digital|Tunai Bersih Sebenar/i.test(document.body.innerText), null, {
          timeout: 5000,
        })
        .catch(() => {});
      assert.equal(await getCurrentLanguage(page), 'bm');
      const text = await page.locator('main').innerText();
      assert.ok(text.includes('Pengamal Pemasaran Digital'));
      errors.assertZeroUnexpected('T2-F05-03');
    });
  });

  test('T2-F05-04: Zero [object Object] or raw i18n keys rendered in EN or BM', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      for (const lang of ['en', 'bm']) {
        await switchLanguage(page, lang);
        const text = await page.locator('body').innerText();
        assert.equal(text.includes('[object Object]'), false, `[object Object] leaked in ${lang}`);
        assert.equal(/\b(nav|hero|funnel|registry|footer)\.[a-zA-Z]+\b/.test(text), false, `Raw i18n key leaked in ${lang}`);
      }
      errors.assertZeroUnexpected('T2-F05-04');
    });
  });

  test('T2-F05-05: BM language persists across scroll, modal open & modal close', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await switchLanguage(page, 'bm');
      await page.evaluate(() => window.scrollTo(0, 1200));
      await openProjectModal(page, 'PRJ-01');
      await closeModal(page, 'escape');
      assert.equal(await getCurrentLanguage(page), 'bm');
      errors.assertZeroUnexpected('T2-F05-05');
    });
  });

  // F6 Boundaries
  test('T2-F06-01: Mobile 390x844 Navbar stays compact (height <= 140px) with clickable toggle', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.mobile }, async ({ page, errors }) => {
      const box = await getNavbar(page).boundingBox();
      assert.ok(box && box.height <= 140, `Mobile navbar too tall: ${box?.height}px`);
      await switchLanguage(page, 'bm');
      assert.equal(await getCurrentLanguage(page), 'bm');
      errors.assertZeroUnexpected('T2-F06-01');
    });
  });

  test('T2-F06-02: Clicking Navbar anchors while in BM preserves BM language state', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await switchLanguage(page, 'bm');
      const anchors = getNavbar(page).locator('a[href^="#"]');
      const count = await anchors.count();
      for (let i = 0; i < count; i++) {
        if (await anchors.nth(i).isVisible()) {
          await anchors.nth(i).click();
        }
      }
      assert.equal(await getCurrentLanguage(page), 'bm');
      errors.assertZeroUnexpected('T2-F06-02');
    });
  });

  test('T2-F06-03: Navbar system count badge visible on 390x844 mobile', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.mobile }, async ({ page, errors }) => {
      const navText = await getNavbar(page).innerText();
      assert.match(navText, new RegExp(`\\b${truth.expectedSystems}\\b`));
      errors.assertZeroUnexpected('T2-F06-03');
    });
  });

  test('T2-F06-04: Language toggle Space/Enter keyboard activation causes zero page jump', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
      const yBefore = await page.evaluate(() => window.scrollY);
      const toggle = await findFirstVisible(
        getNavbar(page).getByRole('button', {
          name: /^(BM|Bahasa Melayu|Malay|MS)$|EN\s*\|\s*BM|BM\s*\|\s*EN|Switch language to (?:Bahasa Melayu|Malay|BM)|Tukar bahasa ke Bahasa Melayu/i,
        })
      );
      assert.ok(toggle, 'Visible Navbar language toggle not found');
      await toggle.focus();
      await page.keyboard.press('Space');
      await page
        .waitForFunction(() => /Pengamal Pemasaran Digital|Tunai Bersih Sebenar/i.test(document.body.innerText), null, {
          timeout: 5000,
        })
        .catch(() => {});
      const yAfter = await page.evaluate(() => window.scrollY);
      assert.equal(await getCurrentLanguage(page), 'bm');
      assert.ok(Math.abs(yAfter - yBefore) < 50, `Unexpected scroll jump on toggle: ${yBefore} -> ${yAfter}`);
      errors.assertZeroUnexpected('T2-F06-04');
    });
  });

  test('T2-F06-05: Zero overlapping interactive elements inside Navbar (elementFromPoint hit check)', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.desktop }, async ({ page, errors }) => {
      const toggle = await findFirstVisible(
        getNavbar(page).getByRole('button', {
          name: /^(BM|Bahasa Melayu|Malay|MS)$|EN\s*\|\s*BM|BM\s*\|\s*EN|Switch language to (?:Bahasa Melayu|Malay|BM)|Tukar bahasa ke Bahasa Melayu/i,
        })
      );
      assert.ok(toggle, 'Visible Navbar language toggle not found');
      const box = await toggle.boundingBox();
      assert.ok(box);
      const hitSelf = await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return Boolean(el && el.closest('button'));
      }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
      assert.equal(hitSelf, true, 'Navbar language toggle was overlapped by another element');
      errors.assertZeroUnexpected('T2-F06-05');
    });
  });

  // F7 Boundaries
  test('T2-F07-01: LinkedIn URL normalized with strict https://www.linkedin.com/ prefix', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const href = await page.locator('a[href*="linkedin.com"]').first().getAttribute('href');
      assert.ok(href && href.startsWith('https://www.linkedin.com/'));
      errors.assertZeroUnexpected('T2-F07-01');
    });
  });

  test('T2-F07-02: All target="_blank" links enforce rel containing noopener', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const unsafe = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[target="_blank"]'))
          .filter((a) => !/\bnoopener\b/i.test(a.getAttribute('rel') || ''))
          .map((a) => a.getAttribute('href'));
      });
      assert.deepEqual(unsafe, [], `Links missing rel="noopener": ${JSON.stringify(unsafe)}`);
      errors.assertZeroUnexpected('T2-F07-02');
    });
  });

  test('T2-F07-03: Zero empty href="" or javascript: links in Hero', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const badHrefs = await page.locator('main section').first().locator('a').evaluateAll((els) =>
        els
          .map((a) => a.getAttribute('href'))
          .filter((h) => !h || h === '#' || /^javascript:/i.test(h) || h === 'undefined')
      );
      assert.deepEqual(badHrefs, []);
      errors.assertZeroUnexpected('T2-F07-03');
    });
  });

  test('T2-F07-04: 4 Hero KPI cards stack cleanly on 390x844 mobile without overflow', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.mobile }, async ({ page, errors }) => {
      await assertNoHorizontalOverflow(page);
      const { count, locator } = await getHeroKpiCards(page);
      assert.equal(count, 4, `Expected 4 Hero KPI cards on mobile, found ${count}`);
      await assertMobileCardsFitViewport(page, locator, 4, 390, 'Hero 4 KPI cards');
      errors.assertZeroUnexpected('T2-F07-04');
    });
  });

  test('T2-F07-05: Hero zero resume/PDF file references & interactive Copy Email button', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const hero = page.locator('main section').first();
      const heroHtml = await hero.innerHTML();
      assert.equal(/resume-mohd-faiz|\.pdf/i.test(heroHtml), false, 'Unexpected resume PDF reference in Hero');
      const urlBefore = page.url();
      const copyBtn = hero.getByRole('button', { name: /copy email address/i });
      await copyBtn.click();
      assert.equal(page.url(), urlBefore);
      errors.assertZeroUnexpected('T2-F07-05');
    });
  });

  // F8 Boundaries
  test('T2-F08-01: Clicking already-active stage twice leaves UI state consistent', async () => {
    const expected01 = truth.projects.filter((p) => p.stageCode === '01').map((p) => p.id).sort();
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const s1 = getFunnelStageButton(page, '01');
      await s1.click();
      assert.deepEqual(await getVisibleProjectIds(page), expected01);
      await s1.click();
      const ids = await getVisibleProjectIds(page);
      assert.ok(ids.length === expected01.length || ids.length === truth.expectedSystems, `Unexpected state after double-click: ${ids}`);
      errors.assertZeroUnexpected('T2-F08-01');
    });
  });

  test('T2-F08-02: Rapid sequential clicks 01 -> 02 -> 03 -> 04 -> 05 settle on Stage 05', async () => {
    const expected05 = truth.projects.filter((p) => p.stageCode === '05').map((p) => p.id).sort();
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      for (const code of ['01', '02', '03', '04', '05']) {
        await getFunnelStageButton(page, code).click();
      }
      assert.deepEqual(await getVisibleProjectIds(page), expected05);
      errors.assertZeroUnexpected('T2-F08-02');
    });
  });

  test('T2-F08-03: Stage filter persists when toggling EN -> BM', async () => {
    const expected02 = truth.projects.filter((p) => p.stageCode === '02').map((p) => p.id).sort();
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await getFunnelStageButton(page, '02').click();
      assert.deepEqual(await getVisibleProjectIds(page), expected02);
      await switchLanguage(page, 'bm');
      assert.deepEqual(await getVisibleProjectIds(page), expected02);
      const text = await page.locator('main').innerText();
      assert.ok(text.includes('Sistem Kawalan Paid Ads POAS'));
      assert.ok(text.includes('Enjin Penyah-Tindihan Atribusi Merentas Platform'));
      errors.assertZeroUnexpected('T2-F08-03');
    });
  });

  test('T2-F08-04: Mobile 390x844 funnel stage buttons meet tap target size (>= 36px height)', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.mobile }, async ({ page, errors }) => {
      for (const stage of CANONICAL_FUNNEL_STAGES) {
        const box = await getFunnelStageButton(page, stage.code, stage).boundingBox();
        assert.ok(box && box.height >= 36 && box.x + box.width <= 391, `Bad mobile stage button box for ${stage.code}: ${JSON.stringify(box)}`);
      }
      errors.assertZeroUnexpected('T2-F08-04');
    });
  });

  test('T2-F08-05: Stage order 01..05 invariant holds in BM mode as well', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await switchLanguage(page, 'bm');
      const ys = [];
      for (const stage of CANONICAL_FUNNEL_STAGES) {
        const box = await getFunnelStageButton(page, stage.code, stage).boundingBox();
        assert.ok(box);
        ys.push(box);
      }
      for (let i = 1; i < ys.length; i++) {
        assert.ok(ys[i].y > ys[i - 1].y + 5 || ys[i].x > ys[i - 1].x);
      }
      errors.assertZeroUnexpected('T2-F08-05');
    });
  });

  // F9 Boundaries
  test('T2-F09-01: Empty search state renders cleanly and clearing restores all N systems', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const search = await getSearchInput(page);
      await search.fill('nonexistent-xyz-999');
      assert.deepEqual(await getVisibleProjectIds(page), []);
      await search.fill('');
      assert.equal((await getVisibleProjectIds(page)).length, truth.expectedSystems);
      errors.assertZeroUnexpected('T2-F09-01');
    });
  });

  test('T2-F09-02: Whitespace-only search "   " behaves as empty query (shows all N)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const search = await getSearchInput(page);
      await search.fill('   ');
      assert.equal((await getVisibleProjectIds(page)).length, truth.expectedSystems);
      errors.assertZeroUnexpected('T2-F09-02');
    });
  });

  test('T2-F09-03: Special regex/HTML characters in search (< 10s, 404/500, <script>alert(1)</script>)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const search = await getSearchInput(page);
      await search.fill('< 10s');
      assert.deepEqual(await getVisibleProjectIds(page), ['PRJ-01']);
      await search.fill('404/500');
      assert.deepEqual(await getVisibleProjectIds(page), ['PRJ-02']);
      await search.fill('<script>alert(1)</script>');
      assert.deepEqual(await getVisibleProjectIds(page), []);
      errors.assertZeroUnexpected('T2-F09-03');
    });
  });

  test('T2-F09-04: Search across BM terms in BM mode ("Penghala CRM" -> PRJ-01)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await switchLanguage(page, 'bm');
      const search = await getSearchInput(page);
      await search.fill('Penghala CRM');
      assert.deepEqual(await getVisibleProjectIds(page), ['PRJ-01']);
      errors.assertZeroUnexpected('T2-F09-04');
    });
  });

  test('T2-F09-05: Very long 150-char search string causes zero overflow or crash', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.mobile }, async ({ page, errors }) => {
      const search = await getSearchInput(page);
      await search.fill('A'.repeat(150));
      assert.deepEqual(await getVisibleProjectIds(page), []);
      await assertNoHorizontalOverflow(page);
      errors.assertZeroUnexpected('T2-F09-05');
    });
  });

  // F10 Boundaries
  test('T2-F10-01: Escape key closes open modal cleanly (and Escape when closed is safe no-op)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await page.keyboard.press('Escape');
      await openProjectModal(page, 'PRJ-01');
      await closeModal(page, 'escape');
      assert.equal(await page.locator('[role="dialog"], [aria-modal="true"]').count(), 0);
      errors.assertZeroUnexpected('T2-F10-01');
    });
  });

  test('T2-F10-02: Backdrop click closes PRJ-02 modal cleanly', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await openProjectModal(page, 'PRJ-02');
      await closeModal(page, 'backdrop');
      assert.equal(await page.locator('[role="dialog"], [aria-modal="true"]').count(), 0);
      errors.assertZeroUnexpected('T2-F10-02');
    });
  });

  test('T2-F10-03: Close button closes PRJ-03 modal and keeps page scrollable', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await openProjectModal(page, 'PRJ-03');
      await closeModal(page, 'button');
      await page.evaluate(() => window.scrollTo(0, 600));
      assert.ok((await page.evaluate(() => window.scrollY)) > 100);
      errors.assertZeroUnexpected('T2-F10-03');
    });
  });

  test('T2-F10-04: All modals suppress empty lookerUrl/liveAppUrl without emitting <a href="">', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      for (const id of truth.projects.map((p) => p.id)) {
        const dialog = await openProjectModal(page, id);
        const badLinks = await dialog.locator('a').evaluateAll((els) =>
          els.map((a) => a.getAttribute('href')).filter((h) => !h || h === '#' || h === 'null' || h === 'undefined')
        );
        assert.deepEqual(badLinks, [], `Modal ${id} emitted invalid hrefs: ${JSON.stringify(badLinks)}`);
        await closeModal(page, 'escape');
      }
      errors.assertZeroUnexpected('T2-F10-04');
    });
  });

  test('T2-F10-05: Longest modal (PRJ-05) fits 390x844 mobile width and scrolls cleanly', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.mobile }, async ({ page, errors }) => {
      const dialog = await openProjectModal(page, 'PRJ-05');
      await assertNoHorizontalOverflow(page);
      const box = await dialog.boundingBox();
      assert.ok(box && box.width <= 391, `Modal overflowed mobile width: ${box?.width}`);
      errors.assertZeroUnexpected('T2-F10-05');
    });
  });

  // F11 Boundaries
  test('T2-F11-01: Missing CS-01..03 images emit zero broken visible <img> elements', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await assertNoBrokenVisibleImages(page);
      errors.assertZeroUnexpected('T2-F11-01');
    });
  });

  test('T2-F11-02: Zero exaggerated paid-ROAS claims in Local Case Studies', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const csSection = await getCaseStudiesSection(page);
      const text = await csSection.innerText();
      assert.equal(/10x\s*ROAS|RM\s*100k|guaranteed\s*ROAS/i.test(text), false);
      errors.assertZeroUnexpected('T2-F11-02');
    });
  });

  test('T2-F11-03: Case study workDelivered bullet counts (4, 3, 2) intact in EN & BM', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      for (const lang of ['en', 'bm']) {
        await switchLanguage(page, lang);
        for (const cs of CANONICAL_CASE_STUDIES) {
          const card = getCaseStudyCard(page, cs, truth);
          const liCount = await card.locator('li').count();
          assert.equal(liCount, cs.bullets, `Expected ${cs.bullets} bullets for ${cs.id} in ${lang}, got ${liCount}`);
        }
      }
      errors.assertZeroUnexpected('T2-F11-03');
    });
  });

  test('T2-F11-04: Mobile 390x844 Case Study cards fit cleanly with zero horizontal overflow', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.mobile }, async ({ page, errors }) => {
      await assertNoHorizontalOverflow(page);
      for (const cs of CANONICAL_CASE_STUDIES) {
        const card = getCaseStudyCard(page, cs, truth);
        await assertMobileCardsFitViewport(page, card, 1, 390, `Case Study ${cs.id}`);
      }
      errors.assertZeroUnexpected('T2-F11-04');
    });
  });

  test('T2-F11-05: CS-02 "May 2026 – Present" date preserved verbatim', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      assert.ok(text.includes('May 2026 – Present'));
      errors.assertZeroUnexpected('T2-F11-05');
    });
  });

  // F12 Boundaries
  test('T2-F12-01: SKM card NEVER displays "pending" / "dalam proses" in EN or BM', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      for (const lang of ['en', 'bm']) {
        await switchLanguage(page, lang);
        const skmCard = await getSkmContainer(page);
        const text = await skmCard.innerText();
        assert.equal(/pending|belum selesai|dalam proses/i.test(text), false, `SKM marked pending in ${lang}`);
      }
      errors.assertZeroUnexpected('T2-F12-01');
    });
  });

  test('T2-F12-02: Missing SKM certificate image displays NRIC-masking notice & 0 broken img', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const skmCard = await getSkmContainer(page);
      assert.match(await skmCard.innerText(), /NRIC|MyKad|Kad Pengenalan/i);
      await assertNoBrokenVisibleImages(page);
      errors.assertZeroUnexpected('T2-F12-02');
    });
  });

  test('T2-F12-03: All 6 Coursera links match strict verify code regex + rel="noopener"', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const links = await page.locator('a[href^="https://coursera.org/verify/"]').evaluateAll((els) =>
        els.map((a) => ({ href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel') || '' }))
      );
      assert.equal(links.length, 6);
      for (const l of links) {
        assert.match(l.href || '', /^https:\/\/coursera\.org\/verify\/[A-Z0-9]{12}$/);
        assert.equal(l.target, '_blank');
        assert.match(l.rel, /\bnoopener\b/i);
      }
      errors.assertZeroUnexpected('T2-F12-03');
    });
  });

  test('T2-F12-04: Coursera exact 2-decimal scores preserved without rounding', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      for (const { score } of CANONICAL_COURSERA_CODES) {
        assert.ok(text.includes(score), `Score ${score} rounded or missing`);
      }
      errors.assertZeroUnexpected('T2-F12-04');
    });
  });

  test('T2-F12-05: Mobile 390x844 Coursera 6-card grid renders without horizontal overflow', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.mobile }, async ({ page, errors }) => {
      await assertNoHorizontalOverflow(page);
      const { count, locator } = await getCourseraCards(page);
      assert.equal(count, 6, `Expected 6 Coursera cards on mobile, found ${count}`);
      await assertMobileCardsFitViewport(page, locator, 6, 390, 'Coursera 6-card grid');
      errors.assertZeroUnexpected('T2-F12-05');
    });
  });

  // F13 Boundaries
  test('T2-F13-01: Repeated accordion expand/collapse stability across all roles', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const gov = await getGovernanceSection(page);
      const buttons = gov.locator('button[aria-expanded]');
      const details = gov.locator('details');
      const btnCount = await buttons.count();
      const detCount = await details.count();
      assert.ok(
        btnCount > 0 || detCount > 0,
        'Expected interactive Governance accordions (button[aria-expanded] or <details><summary>), found 0'
      );

      if (btnCount > 0) {
        for (let i = 0; i < btnCount; i++) {
          const b = buttons.nth(i);
          const initial = await b.getAttribute('aria-expanded');
          const panelId = await b.getAttribute('aria-controls');
          const panel = panelId ? gov.locator(`#${panelId}`) : null;

          await b.click();
          assert.notEqual(await b.getAttribute('aria-expanded'), initial);
          if (panel && (await panel.count()) > 0) {
            assert.equal(await panel.isVisible(), false, `Panel ${panelId} remained visible after collapse`);
            const collapsedDisplay = await panel.evaluate((el) => getComputedStyle(el).display);
            assert.equal(collapsedDisplay, 'none', `Panel ${panelId} computed display was ${collapsedDisplay}`);
            assert.equal(await panel.boundingBox(), null, `Panel ${panelId} boundingBox should be null when collapsed`);
          }
          const chevronCollapsed = await b.locator('svg').evaluate((el) => el.getAttribute('class') || '');
          assert.equal(chevronCollapsed.includes('rotate-180'), false, 'Chevron should un-rotate when collapsed');

          await b.click();
          assert.equal(await b.getAttribute('aria-expanded'), initial);
          if (panel && (await panel.count()) > 0) {
            assert.equal(await panel.isVisible(), true, `Panel ${panelId} did not re-expand`);
            const expandedDisplay = await panel.evaluate((el) => getComputedStyle(el).display);
            assert.equal(expandedDisplay, 'grid');
            const box = await panel.boundingBox();
            assert.ok(box && box.height > 20, `Panel ${panelId} height invalid after expand`);
          }
          const chevronExpanded = await b.locator('svg').evaluate((el) => el.getAttribute('class') || '');
          assert.equal(chevronExpanded.includes('rotate-180'), true, 'Chevron should rotate-180 when expanded');
        }
      } else {
        for (let i = 0; i < detCount; i++) {
          const d = details.nth(i);
          const sum = d.locator('summary').first();
          const initial = (await d.getAttribute('open')) !== null;
          await sum.click();
          assert.notEqual((await d.getAttribute('open')) !== null, initial);
          await sum.click();
          assert.equal((await d.getAttribute('open')) !== null, initial);
        }
      }
      errors.assertZeroUnexpected('T2-F13-01');
    });
  });

  test('T2-F13-02: "73 inland distribution drivers" preserved verbatim in EN & BM', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await expandAllGovernanceRoles(page);
      assert.ok((await page.locator('main').innerText()).includes('73'));
      await switchLanguage(page, 'bm');
      await expandAllGovernanceRoles(page);
      assert.ok((await page.locator('main').innerText()).includes('73'));
      errors.assertZeroUnexpected('T2-F13-02');
    });
  });

  test('T2-F13-03: Chronological reverse order (2025–2026 appears before 2015–2018)', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      const idxLatest = text.indexOf('Mar 2025 – Aug 2026');
      const idxEarliest = text.indexOf('Apr 2015 – Aug 2018');
      assert.ok(idxLatest !== -1 && idxEarliest !== -1 && idxLatest < idxEarliest);
      errors.assertZeroUnexpected('T2-F13-03');
    });
  });

  test('T2-F13-04: Mobile 390x844 Governance overflow-free when all 5 items expanded', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.mobile }, async ({ page, errors }) => {
      await expandAllGovernanceRoles(page);
      await assertNoHorizontalOverflow(page);
      errors.assertZeroUnexpected('T2-F13-04');
    });
  });

  test('T2-F13-05: Keyboard activation on Governance accordion trigger', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const gov = await getGovernanceSection(page);
      const btn = gov.locator('button[aria-expanded]').first();
      const detailsEl = gov.locator('details').first();
      if ((await btn.count()) > 0) {
        const before = await btn.getAttribute('aria-expanded');
        await btn.focus();
        await page.keyboard.press('Enter');
        assert.notEqual(await btn.getAttribute('aria-expanded'), before);
      } else if ((await detailsEl.count()) > 0) {
        const sum = detailsEl.locator('summary').first();
        const before = (await detailsEl.getAttribute('open')) !== null;
        await sum.focus();
        await page.keyboard.press('Enter');
        assert.notEqual((await detailsEl.getAttribute('open')) !== null, before);
      } else {
        assert.fail('Expected keyboard-activatable Governance accordion (button[aria-expanded] or <details><summary>)');
      }
      errors.assertZeroUnexpected('T2-F13-05');
    });
  });

  // F14 Boundaries
  test('T2-F14-01: Footer WhatsApp link strictly normalized to https://wa.me/60183904690', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const href = await page.locator('footer a[href*="wa.me"]').first().getAttribute('href');
      assert.equal(href, 'https://wa.me/60183904690');
      errors.assertZeroUnexpected('T2-F14-01');
    });
  });

  test('T2-F14-02: Footer Gmail compose link strictly valid', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const href = await page.locator('footer a[href^="https://mail.google.com/mail/"]').first().getAttribute('href');
      assert.ok(href && href.includes('mfaiz.mdnordin%40gmail.com'), `Unexpected Footer Gmail href: ${href}`);
      errors.assertZeroUnexpected('T2-F14-02');
    });
  });

  test('T2-F14-03: Footer JSON export in BM mode remains valid JSON', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await switchLanguage(page, 'bm');
      const { parsed, rawText } = await triggerFooterJsonExport(page);
      assert.equal(parsed.projects.length, truth.expectedSystems);
      assert.deepEqual(scanTextForPdpaNric(rawText, 'BM exported JSON'), []);
      errors.assertZeroUnexpected('T2-F14-03');
    });
  });

  test('T2-F14-04: Consecutive JSON exports succeed cleanly without errors', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const first = await triggerFooterJsonExport(page);
      const second = await triggerFooterJsonExport(page);
      assert.equal(first.parsed.projects.length, second.parsed.projects.length);
      errors.assertZeroUnexpected('T2-F14-04');
    });
  });

  test('T2-F14-05: Mobile 390x844 Footer layout fits within viewport width', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.mobile }, async ({ page, errors }) => {
      await page.locator('footer').scrollIntoViewIfNeeded();
      await assertNoHorizontalOverflow(page);
      errors.assertZeroUnexpected('T2-F14-05');
    });
  });

  // F15 Boundaries (PDPA Scanner Precision & Zero False Positives)
  test('T2-F15-01: Safe tokens (+60183904690, 601112345678, timestamps, SKM/NOSS) trigger 0 PDPA violations', async () => {
    const safeSample = [
      'Phone: +60183904690',
      'Alt phone: 601112345678',
      'Timestamp: 202611190214',
      'SKM: S304265796',
      'Batch: M731-001-3:2021-102026',
      'Notice: Mask NRIC number when rendering',
    ].join(' | ');
    assert.deepEqual(scanTextForPdpaNric(safeSample, 'safe-sample'), []);
  });

  test('T2-F15-02: Hyphenated MyKad scanner catches synthetic leak & dist/ has 0 matches', () => {
    const syntheticDash = [['85', '01', '01'].join(''), '11', '5123'].join('-');
    const caught = scanTextForPdpaNric(`Sample ${syntheticDash} leak`, 'synthetic-dash');
    assert.ok(caught.length >= 1, 'Rule A/B failed to catch synthetic hyphenated MyKad');
    assert.deepEqual(scanDirectoryForPdpaNric(distDir), []);
  });

  test('T2-F15-03: Compact 12-digit MyKad scanner catches synthetic leak & DOM has 0 matches', async () => {
    const syntheticCompact = ['85', '01', '01', '11', '5123'].join('');
    const caught = scanTextForPdpaNric(`Compact ${syntheticCompact} leak`, 'synthetic-compact');
    assert.ok(caught.some((v) => v.rule === 'C_COMPACT_12_DIGIT_MYKAD'));

    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const domText = await page.evaluate(() => document.body.innerText);
      assert.deepEqual(scanTextForPdpaNric(domText, 'live-dom'), []);
      errors.assertZeroUnexpected('T2-F15-03');
    });
  });

  test('T2-F15-04: Keyword-proximity scanner catches "NRIC: <digits>" & exported JSON has 0 matches', async () => {
    const syntheticProximity = 'NRIC: ' + ['8501', '0111'].join('');
    const caught = scanTextForPdpaNric(syntheticProximity, 'synthetic-proximity');
    assert.ok(caught.some((v) => v.rule === 'D_KEYWORD_PROXIMITY_DIGITS'));

    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const { rawText } = await triggerFooterJsonExport(page);
      assert.deepEqual(scanTextForPdpaNric(rawText, 'exported-json'), []);
      errors.assertZeroUnexpected('T2-F15-04');
    });
  });

  test('T2-F15-05: <meta> and <title> tags in head contain zero NRIC/PII leaks', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const headText = await page.evaluate(() => document.head.innerHTML);
      assert.deepEqual(scanTextForPdpaNric(headText, 'document.head'), []);
      errors.assertZeroUnexpected('T2-F15-05');
    });
  });

  // F16 Boundaries
  test('T2-F16-01: Coursera section never claims "8 of 8" or full Google certificate completion', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      assert.equal(/8 of 8|8\/8 completed|full 8-course certificate completed/i.test(text), false);
      errors.assertZeroUnexpected('T2-F16-01');
    });
  });

  test('T2-F16-02: PRJ-01..05 never mislabeled as live enterprise production client deployments', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      assert.equal(/Live Enterprise Production Client/i.test(text), false);
      assert.ok(text.includes('Sandbox Stress-Test Validated'));
      errors.assertZeroUnexpected('T2-F16-02');
    });
  });

  test('T2-F16-03: Attribution banners remain visible on 390x844 mobile', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.mobile }, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      assert.match(text, /Sandbox Stress-Test/i);
      assert.match(text, /without claiming isolated paid-ad attribution/i);
      errors.assertZeroUnexpected('T2-F16-03');
    });
  });

  test('T2-F16-04: Case studies CS-01..03 never carry "Sandbox Stress-Test Validated" tag', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const csCard = getCaseStudyCard(page, CANONICAL_CASE_STUDIES[0], truth);
      assert.equal((await csCard.innerText()).includes('Sandbox Stress-Test Validated'), false);
      errors.assertZeroUnexpected('T2-F16-04');
    });
  });

  test('T2-F16-05: Exported JSON preserves statusBadge & evidenceBoundary metadata', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const { parsed } = await triggerFooterJsonExport(page);
      for (const p of parsed.projects) {
        assert.ok(p.statusBadge, `Missing statusBadge on ${p.id}`);
      }
      for (const cs of parsed.caseStudies) {
        assert.ok(cs.evidenceBoundary, `Missing evidenceBoundary on ${cs.id}`);
      }
      errors.assertZeroUnexpected('T2-F16-05');
    });
  });

  // F17 Boundaries
  test('T2-F17-01: Placeholder slots maintain >= 150px width and >= 60px height', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      for (const cs of CANONICAL_CASE_STUDIES) {
        const card = getCaseStudyCard(page, cs, truth);
        const box = await card.boundingBox();
        assert.ok(box && box.width >= 150 && box.height >= 60, `Slot/card collapsed for ${cs.id}: ${JSON.stringify(box)}`);
      }
      errors.assertZeroUnexpected('T2-F17-01');
    });
  });

  test('T2-F17-02: Case studies render client labels & Funnel/MarTech connection cleanly', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const text = await page.locator('main').innerText();
      for (const cs of CANONICAL_CASE_STUDIES) {
        assert.ok(text.includes(cs.client), `Missing client label for ${cs.id}`);
      }
      assert.match(text, /Funnel & MarTech Connection/i);
      errors.assertZeroUnexpected('T2-F17-02');
    });
  });

  test('T2-F17-03: Fallback slots translate cleanly in BM without layout failure', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await switchLanguage(page, 'bm');
      await assertNoBrokenVisibleImages(page);
      await assertNoHorizontalOverflow(page);
      errors.assertZeroUnexpected('T2-F17-03');
    });
  });

  test('T2-F17-04: Missing portfolio drop-in assets generate zero console.error noise', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await page.waitForTimeout(200);
      assert.deepEqual(errors.unexpectedConsoleErrors, []);
      assert.deepEqual(errors.pageErrors, []);
    });
  });

  test('T2-F17-05: Modal with missing processVisual file path falls back cleanly without broken img', async () => {
    await runIsolatedNextProjectProbe(
      browser,
      async ({ baseUrl, nextId }) => {
        await withTrackedPage(browser, baseUrl, {}, async ({ page, errors }) => {
          const dialog = await openProjectModal(page, nextId);
          assert.equal(await dialog.locator('[data-asset-status="fallback"]').count(), 1);
          await assertNoBrokenVisibleImages(page);
          errors.assertZeroUnexpected('T2-F17-05');
        });
      },
      { missingProcessVisual: true }
    );
  });

  // F18 Boundaries
  test('T2-F18-01: CONTRIBUTING_PROJECTS.md includes JSON fenced template for PRJ-06', () => {
    const doc = fs.readFileSync(path.join(REPO_ROOT, 'CONTRIBUTING_PROJECTS.md'), 'utf8');
    assert.match(doc, /```json[\s\S]*PRJ-06[\s\S]*```/i);
  });

  test('T2-F18-02: CONTRIBUTING_PROJECTS.md documents all 5 valid stageCodes (01–05)', () => {
    const doc = fs.readFileSync(path.join(REPO_ROOT, 'CONTRIBUTING_PROJECTS.md'), 'utf8');
    for (const code of ['"01"', '"02"', '"03"', '"04"', '"05"']) {
      assert.ok(doc.includes(code) || doc.includes(code.replace(/"/g, '')), `Missing stageCode ${code}`);
    }
  });

  test('T2-F18-03: CONTRIBUTING_PROJECTS.md explicitly warns against NRIC/PII in projects.json', () => {
    const doc = fs.readFileSync(path.join(REPO_ROOT, 'CONTRIBUTING_PROJECTS.md'), 'utf8');
    assert.match(doc, /PDPA|NRIC|PII/i);
  });

  test('T2-F18-04: CONTRIBUTING_PROJECTS.md specifies npm run build verification command', () => {
    const doc = fs.readFileSync(path.join(REPO_ROOT, 'CONTRIBUTING_PROJECTS.md'), 'utf8');
    assert.ok(doc.includes('npm run build'));
  });

  test('T2-F18-05: Appending next PRJ-0N (PRJ-07) in isolated workspace requires 0 component edits & builds exit 0', async () => {
    await runIsolatedNextProjectProbe(browser, async ({ tempDir, tempDistDir }) => {
      assert.ok(fs.existsSync(path.join(tempDistDir, 'index.html')));
      const origCompDir = path.join(REPO_ROOT, 'src', 'components');
      const tempCompDir = path.join(tempDir, 'src', 'components');
      if (fs.existsSync(origCompDir)) {
        for (const f of fs.readdirSync(origCompDir)) {
          assert.equal(
            fs.readFileSync(path.join(tempCompDir, f), 'utf8'),
            fs.readFileSync(path.join(origCompDir, f), 'utf8')
          );
        }
      }
    });
  });

  // Regression Coverage (R1/R2/R3 Surgical Fixes)
  test('T2-REG-01: Governance Collapse all / Expand all batch toggle & real DOM collapse', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const gov = await getGovernanceSection(page);
      const toggleAll = gov.getByTestId('governance-toggle-all');
      await toggleAll.click();
      for (const id of ['OPS-01', 'OPS-02', 'OPS-03', 'OPS-04', 'OPS-05']) {
        const panel = gov.locator(`#ops-panel-${id}`);
        assert.equal(await panel.isVisible(), false, `${id} should be hidden after Collapse all`);
        assert.equal(await panel.evaluate((el) => getComputedStyle(el).display), 'none');
      }
      await toggleAll.click();
      for (const id of ['OPS-01', 'OPS-02', 'OPS-03', 'OPS-04', 'OPS-05']) {
        const panel = gov.locator(`#ops-panel-${id}`);
        assert.equal(await panel.isVisible(), true, `${id} should be visible after Expand all`);
      }
      errors.assertZeroUnexpected('T2-REG-01');
    });
  });

  test('T2-REG-02: Sticky Navbar anchor clearance (scroll-mt-20), Light search contrast & mobile scroll-spy/brand legibility', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const headerBox = await getNavbar(page).boundingBox();
      assert.ok(headerBox);
      await page.locator('header a[href="#systems"]').first().click();
      await page.waitForFunction(() => {
        const el = document.getElementById('systems');
        return Boolean(el && Math.abs(el.getBoundingClientRect().top - 80) <= 25);
      }, null, { timeout: 5000 });
      await page.waitForTimeout(150);

      const systemsBox = await page.locator('#systems').boundingBox();
      assert.ok(
        systemsBox && systemsBox.y >= headerBox.height - 1,
        `#systems section clipped by sticky navbar: y=${systemsBox?.y}`
      );
      const eyebrowTop = await page.locator('#systems p').first().boundingBox();
      assert.ok(
        eyebrowTop && eyebrowTop.y >= headerBox.height - 1,
        `Eyebrow clipped by sticky navbar: y=${eyebrowTop?.y}`
      );

      await page.getByTestId('theme-toggle').click();
      await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'light');
      const searchInput = await getSearchInput(page);
      await searchInput.evaluate((el) => el.blur());
      const unfocusedBorder = await searchInput.evaluate((el) => getComputedStyle(el).borderTopColor);
      assert.equal(
        unfocusedBorder,
        'rgb(100, 116, 139)',
        `Light unfocused search border expected rgb(100, 116, 139), got ${unfocusedBorder}`
      );
      await searchInput.focus();
      const focusedBorder = await searchInput.evaluate((el) => getComputedStyle(el).borderTopColor);
      assert.equal(
        focusedBorder,
        'rgb(4, 120, 87)',
        `Light focused search border expected rgb(4, 120, 87), got ${focusedBorder}`
      );
      errors.assertZeroUnexpected('T2-REG-02-desktop');
    });

    for (const vp of [VIEWPORTS.narrow, VIEWPORTS.mobile, { width: 1024, height: 768 }]) {
      await withTrackedPage(browser, server.baseUrl, { viewport: vp }, async ({ page, errors }) => {
        await switchLanguage(page, 'bm');
        const brandWidth = await page.locator('header a[href="#top"] span.min-w-0 > span').first().boundingBox();
        assert.ok(brandWidth && brandWidth.width >= 60, `Navbar brand crushed at ${vp.width}px BM: ${brandWidth?.width}px`);
        await assertNoHorizontalOverflow(page);

        if (vp.width === VIEWPORTS.mobile.width) {
          const headerBox = await getNavbar(page).boundingBox();
          assert.ok(headerBox);
          await page.locator('button[aria-controls="mobile-nav-drawer"]').click();
          const drawer = page.locator('#mobile-nav-drawer');
          assert.equal(await drawer.isVisible(), true);
          await drawer.locator('a[href="#credentials"]').click();

          await page.waitForFunction(() => {
            const cred = document.getElementById('credentials');
            return Boolean(cred && Math.abs(cred.getBoundingClientRect().top - 80) <= 25);
          }, null, { timeout: 6000 });
          await page.waitForTimeout(250);

          const credBox = await page.locator('#credentials').boundingBox();
          assert.ok(
            credBox && credBox.y >= headerBox.height - 1,
            `#credentials section clipped by sticky navbar on mobile: y=${credBox?.y}`
          );

          const activeHrefs = await page.evaluate(() =>
            Array.from(document.querySelectorAll('header a[aria-current="location"]')).map((a) =>
              a.getAttribute('href')
            )
          );
          assert.deepEqual(
            activeHrefs,
            ['#credentials'],
            `Mobile scroll-spy expected ["#credentials"], got ${JSON.stringify(activeHrefs)}`
          );

          await page.locator('button[aria-controls="mobile-nav-drawer"]').click();
          const drawerActiveHrefs = await drawer
            .locator('a[aria-current="location"]')
            .evaluateAll((els) => els.map((a) => a.getAttribute('href')));
          assert.deepEqual(drawerActiveHrefs, ['#credentials']);
        }

        errors.assertZeroUnexpected(`T2-REG-02-${vp.width}`);
      });
    }
  });

  test('T2-REG-03: ArchitectureModal WAI-ARIA tablist ArrowRight/ArrowLeft/Home/End & bottom close', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const dialog = await openProjectModal(page, 'PRJ-01');
      const tabs = dialog.locator('[role="tablist"] [role="tab"]');
      const firstBox = await tabs.first().boundingBox();
      assert.ok(firstBox && firstBox.height >= 36, `Modal tab height < 36px: ${firstBox?.height}`);

      await tabs.first().focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
      await page.keyboard.press('End');
      assert.equal(await tabs.last().getAttribute('aria-selected'), 'true');
      await page.keyboard.press('Home');
      assert.equal(await tabs.first().getAttribute('aria-selected'), 'true');

      await dialog.getByTestId('modal-bottom-close').click();
      assert.equal(await page.locator('[role="dialog"]').count(), 0);
      errors.assertZeroUnexpected('T2-REG-03');
    });
  });

  test('T2-REG-04: Footer export status [role="status"] updates live on EN -> BM toggle', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await triggerFooterJsonExport(page);
      const statusLoc = page.locator('footer [role="status"]').last();
      assert.match(await statusLoc.innerText(), /Sanitized portfolio JSON downloaded/i);
      await switchLanguage(page, 'bm');
      assert.match(await statusLoc.innerText(), /berjaya dimuat turun/i);
      errors.assertZeroUnexpected('T2-REG-04');
    });
  });
});
