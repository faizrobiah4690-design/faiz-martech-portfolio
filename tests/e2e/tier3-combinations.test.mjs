import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import {
  CANONICAL_CASE_STUDIES,
  CANONICAL_COURSERA_CODES,
  VIEWPORTS,
  assertNoBrokenVisibleImages,
  assertNoHorizontalOverflow,
  closeModal,
  expandAllGovernanceRoles,
  findFirstVisible,
  findLastVisible,
  getAllStagesButton,
  getCaseStudyCard,
  getCurrentLanguage,
  getFunnelStageButton,
  getGovernanceSection,
  getNavbar,
  getRegistrySection,
  getSearchInput,
  getSkmContainer,
  getVisibleProjectIds,
  launchBrowser,
  loadGroundTruth,
  openProjectModal,
  resolveDistDir,
  runIsolatedPrj06Probe,
  scanDirectoryForIndonesianTerms,
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

describe('Tier 3 — Cross-Feature Combinations (20 Pairwise & Multi-Feature Combos)', () => {
  test('T3-01: F5 + F8 + F9 + F10 — Stage 03 + Search "WhatsApp" + EN->BM->EN + PRJ-04 Modal in BM', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await getFunnelStageButton(page, '03').click();
      const search = await getSearchInput(page);
      await search.fill('WhatsApp');
      assert.deepEqual(await getVisibleProjectIds(page), ['PRJ-04']);

      await switchLanguage(page, 'bm');
      assert.deepEqual(await getVisibleProjectIds(page), ['PRJ-04']);
      assert.ok((await page.locator('main').innerText()).includes('Enjin Atribusi Tertutup WhatsApp-ke-Tunai'));

      const dialog = await openProjectModal(page, 'PRJ-04');
      const modalText = await dialog.innerText();
      assert.ok(modalText.includes('HTTP 204'));
      assert.ok(modalText.includes('Cloudflare POS / WA Form'));
      assert.ok(modalText.includes('Kawalan had diskaun'));
      await closeModal(page, 'escape');

      await switchLanguage(page, 'en');
      assert.equal(await getCurrentLanguage(page), 'en');
      assert.deepEqual(await getVisibleProjectIds(page), ['PRJ-04']);
      errors.assertZeroUnexpected('T3-01');
    });
  });

  test('T3-02: F5 + F11 + F12 + F13 + F14 — Full BM Switch across Pillar 2 + Vault + Governance + Footer JSON Export', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await switchLanguage(page, 'bm');
      await expandAllGovernanceRoles(page);
      const text = await page.locator('body').innerText();
      assert.ok(text.includes('Penemuan Organik'));
      assert.ok(text.includes('Sijil Kemahiran Malaysia (SKM) Tahap 3'));
      assert.ok(text.includes('73 pemandu'));
      assert.deepEqual(scanTextForIndonesianTerms(text, 'T3-02 BM DOM'), []);

      const { parsed, rawText } = await triggerFooterJsonExport(page);
      assert.equal(parsed.projects.length, truth.expectedSystems);
      assert.deepEqual(scanTextForPdpaNric(rawText, 'T3-02 JSON'), []);
      errors.assertZeroUnexpected('T3-02');
    });
  });

  test('T3-03: F1 + F2 + F3 + F8 + F18 — Dynamic PRJ-06 Counter Propagation (Isolated Temp Build)', async () => {
    await runIsolatedPrj06Probe(browser, async ({ baseUrl }) => {
      await withTrackedPage(browser, baseUrl, {}, async ({ page, errors }) => {
        const navText = await getNavbar(page).innerText();
        assert.match(navText, /\b6\b/);
        const heroText = await page.locator('main section').first().innerText();
        assert.match(heroText, /\b6\b/);
        assert.equal((await getVisibleProjectIds(page)).length, 6);

        await getFunnelStageButton(page, '02').click();
        assert.deepEqual(await getVisibleProjectIds(page), ['PRJ-02', 'PRJ-06']);
        errors.assertZeroUnexpected('T3-03');
      });
    });
  });

  test('T3-04: F8 + F9 + F10 — Stage Filter + Category Filter + Search Reset + Modal Lifecycle', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await getFunnelStageButton(page, '04').click();
      assert.deepEqual(await getVisibleProjectIds(page), ['PRJ-05']);
      await getAllStagesButton(page).click();

      await selectCategoryFilter(page, 'RevOps & Lead Routing');
      assert.deepEqual(await getVisibleProjectIds(page), ['PRJ-01']);

      // Reset category via All/Semua pill or select default scoped strictly inside Registry
      const regSection = getRegistrySection(page);
      const regScope = (await regSection.count()) > 0 ? regSection : page.locator('main');
      const selectLoc = await findFirstVisible(regScope.locator('select'));
      if (selectLoc) {
        await selectLoc.selectOption({ index: 0 });
      } else {
        const allCat = await findFirstVisible(
          regScope.getByRole('button', { name: /^(all(\s+categories)?|semua(\s+kategori)?)$/i })
        );
        if (allCat) await allCat.click();
      }

      const search = await getSearchInput(page);
      await search.fill('Z-Score');
      assert.deepEqual(await getVisibleProjectIds(page), ['PRJ-03']);
      await openProjectModal(page, 'PRJ-03');
      await closeModal(page, 'escape');
      await search.fill('');
      assert.equal((await getVisibleProjectIds(page)).length, truth.expectedSystems);
      errors.assertZeroUnexpected('T3-04');
    });
  });

  test('T3-05: F4 + F6 + F8 + F10 — Mobile 390x844 Sticky Navbar + Stage Filter + Modal Scroll & Backdrop Close', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.mobile }, async ({ page, errors }) => {
      await assertNoHorizontalOverflow(page);
      await getFunnelStageButton(page, '02').click();
      assert.deepEqual(await getVisibleProjectIds(page), ['PRJ-02']);

      const dialog = await openProjectModal(page, 'PRJ-02');
      await dialog.evaluate((el) => {
        el.scrollTop = 200;
      });
      await assertNoHorizontalOverflow(page);
      await closeModal(page, 'backdrop');
      assert.equal(await page.locator('[role="dialog"], [aria-modal="true"]').count(), 0);
      errors.assertZeroUnexpected('T3-05');
    });
  });

  test('T3-06: F5 + F12 + F15 + F17 — Missing SKM Image + NRIC Masking + BM Toggle + SKM Serial Check', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const skmEn = await getSkmContainer(page);
      const enText = await skmEn.innerText();
      assert.match(enText, /Mask NRIC|NRIC|MyKad|PDPA/i);
      await switchLanguage(page, 'bm');
      const skmBm = await getSkmContainer(page);
      const bmText = await skmBm.innerText();
      assert.ok(bmText.includes('S304265796'));
      assert.ok(bmText.includes('M731-001-3:2021'));
      assert.ok(bmText.includes('TERAMPIL'));
      assert.equal(/pending|belum selesai|dalam proses/i.test(bmText), false);
      assert.deepEqual(scanTextForPdpaNric(bmText, 'T3-06 BM'), []);
      await assertNoBrokenVisibleImages(page);
      errors.assertZeroUnexpected('T3-06');
    });
  });

  test('T3-07: F2 + F7 + F14 + F15 — Hero CTAs vs Footer CTAs Parity & Protocol Safety', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const hero = page.locator('main section').first();
      const footer = page.locator('footer').first();

      for (const selector of [
        'a[href*="linkedin.com"]',
        'a[href*="github.com"]',
        'a[href*="wa.me"]',
        'a[href^="mailto:"]',
      ]) {
        const heroHref = await hero.locator(selector).first().getAttribute('href');
        const footerHref = await footer.locator(selector).first().getAttribute('href');
        assert.equal(heroHref, footerHref, `Mismatch between Hero and Footer for ${selector}`);
        assert.match(heroHref || '', /^(https:\/\/|mailto:)/);
      }
      errors.assertZeroUnexpected('T3-07');
    });
  });

  test('T3-08: F5 + F13 + F16 — Governance Accordion Expand All + BM Toggle + Attribution Banners', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await expandAllGovernanceRoles(page);
      await switchLanguage(page, 'bm');
      const text = await page.locator('main').innerText();
      assert.ok(text.includes('73'));
      assert.ok(text.includes('tanpa tuntutan atribusi iklan berbayar yang berlebihan'));
      assert.deepEqual(scanTextForIndonesianTerms(text, 'T3-08'), []);
      errors.assertZeroUnexpected('T3-08');
    });
  });

  test('T3-09: F9 + F10 + F17 — Sequential Modal Walkthrough (all projects) with Missing Process Visuals', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const closeMethods = ['escape', 'button', 'backdrop', 'escape', 'button'];
      const ids = truth.projects.map((p) => p.id);
      for (let i = 0; i < ids.length; i++) {
        const dialog = await openProjectModal(page, ids[i]);
        const modalText = await dialog.innerText();
        assert.ok(modalText.includes(ids[i]));
        const badLinks = await dialog.locator('a').evaluateAll((els) =>
          els.map((a) => a.getAttribute('href')).filter((h) => !h || h === '#')
        );
        assert.deepEqual(badLinks, []);
        await assertNoBrokenVisibleImages(page);
        await closeModal(page, closeMethods[i % closeMethods.length]);
      }
      errors.assertZeroUnexpected('T3-09');
    });
  });

  test('T3-10: F5 + F9 — Cross-Language Search in BM Mode (EN stack "Apps Script" vs BM "Bawah-10 Saat")', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await switchLanguage(page, 'bm');
      const search = await getSearchInput(page);
      await search.fill('Apps Script');
      assert.equal((await getVisibleProjectIds(page)).length, truth.expectedSystems);
      await search.fill('Bawah-10 Saat');
      assert.deepEqual(await getVisibleProjectIds(page), ['PRJ-01']);
      errors.assertZeroUnexpected('T3-10');
    });
  });

  test('T3-11: F4 + F11 + F17 — Desktop 1440x900 vs Mobile 390x844 Case Studies Fallback Grid', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.desktop }, async ({ page, errors }) => {
      await assertNoHorizontalOverflow(page);
      await assertNoBrokenVisibleImages(page);
      await page.setViewportSize(VIEWPORTS.mobile);
      await assertNoHorizontalOverflow(page);
      for (const cs of CANONICAL_CASE_STUDIES) {
        const card = getCaseStudyCard(page, cs, truth);
        const box = await card.boundingBox();
        assert.ok(box && box.height >= 80 && box.x + box.width <= 391);
      }
      errors.assertZeroUnexpected('T3-11');
    });
  });

  test('T3-12: F6 + F7 + F3 — Navbar Badge vs Hero KPI vs Hero CTA Synchronized Language & Count', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      for (const lang of ['en', 'bm', 'en']) {
        await switchLanguage(page, lang);
        const navText = await getNavbar(page).innerText();
        const heroText = await page.locator('main section').first().innerText();
        assert.match(navText, new RegExp(`\\b${truth.expectedSystems}\\b`));
        assert.match(heroText, new RegExp(`\\b${truth.expectedSystems}\\b`));
      }
      errors.assertZeroUnexpected('T3-12');
    });
  });

  test('T3-13: F8 + F9 — Contradictory Stage 01 + Search "GMV Max" yields 0, Stage All reveals PRJ-05', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await getFunnelStageButton(page, '01').click();
      const search = await getSearchInput(page);
      await search.fill('GMV Max');
      assert.deepEqual(await getVisibleProjectIds(page), []);
      await getAllStagesButton(page).click();
      assert.deepEqual(await getVisibleProjectIds(page), ['PRJ-05']);
      errors.assertZeroUnexpected('T3-13');
    });
  });

  test('T3-14: F10 + F15 + F16 — Modal Attribution & PDPA Audit across PRJ-03 & PRJ-04', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const d3 = await openProjectModal(page, 'PRJ-03');
      const t3 = await d3.innerText();
      assert.ok(t3.includes('Zero-PII Cohort Mart'));
      assert.ok(t3.includes('SHA-256'));
      assert.ok(t3.includes('Sandbox Stress-Test Validated'));
      assert.deepEqual(scanTextForPdpaNric(t3, 'T3-14 PRJ-03'), []);
      await closeModal(page, 'escape');

      const d4 = await openProjectModal(page, 'PRJ-04');
      const t4 = await d4.innerText();
      assert.ok(t4.includes('Masked Attribution Mart'));
      assert.ok(t4.includes('Sandbox Stress-Test Validated'));
      assert.deepEqual(scanTextForPdpaNric(t4, 'T3-14 PRJ-04'), []);
      await closeModal(page, 'escape');
      errors.assertZeroUnexpected('T3-14');
    });
  });

  test('T3-15: F12 + F16 — Credentials Vault Integrity + Coursera 6-of-8 Framing (Desktop & Mobile)', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.desktop }, async ({ page, errors }) => {
      const checkCreds = async () => {
        const text = await page.locator('main').innerText();
        assert.ok(text.includes('TERAMPIL'));
        assert.match(text, /6.*8-course|6 individually verified/i);
        for (const { code } of CANONICAL_COURSERA_CODES) {
          assert.ok((await page.locator(`a[href="https://coursera.org/verify/${code}"]`).count()) === 1);
        }
      };
      await checkCreds();
      await page.setViewportSize(VIEWPORTS.mobile);
      await assertNoHorizontalOverflow(page);
      await checkCreds();
      errors.assertZeroUnexpected('T3-15');
    });
  });

  test('T3-16: F7 + F17 + F1 — Hero Resume PDF Missing Slot & Navigation Integrity', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await assertNoBrokenVisibleImages(page);
      const html = await page.locator('main section').first().innerHTML();
      assert.match(html, /resume-mohd-faiz-oct2026\.pdf|resume|cv/i);
      errors.assertZeroUnexpected('T3-16');
    });
  });

  test('T3-17: F13 + F4 + F15 — Governance 4 Non-Negotiables Visual & PDPA Check', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const gov = await getGovernanceSection(page);
      const text = await gov.innerText();
      assert.match(text, /Deterministic|Deterministik/i);
      assert.match(text, /RM 0\/mo|Zero-Subscription/i);
      assert.match(text, /PDPA/i);
      assert.deepEqual(scanTextForPdpaNric(text, 'T3-17 Governance'), []);
      errors.assertZeroUnexpected('T3-17');
    });
  });

  test('T3-18: F3 + F14 — Registry Count vs Exported JSON projects.length Consistency', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const visibleCount = (await getVisibleProjectIds(page)).length;
      const { parsed } = await triggerFooterJsonExport(page);
      assert.equal(visibleCount, truth.expectedSystems);
      assert.equal(parsed.projects.length, visibleCount);
      errors.assertZeroUnexpected('T3-18');
    });
  });

  test('T3-19: F6 + F10 — Navbar Anchor Scroll Restores Cleanly After Modal Escape Close', async () => {
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      await openProjectModal(page, 'PRJ-01');
      await closeModal(page, 'escape');
      const credAnchor = await findLastVisible(getNavbar(page).locator('a[href^="#"]'));
      assert.ok(credAnchor, 'No visible navbar anchor found');
      await credAnchor.click();
      await page.waitForFunction(() => window.scrollY > 50, null, { timeout: 5000 }).catch(() => {});
      assert.ok((await page.evaluate(() => window.scrollY)) > 50);
      errors.assertZeroUnexpected('T3-19');
    });
  });

  test('T3-20: F2 + F5 + F14 + F16 — End-to-End Bilingual & Indonesian Hygiene Gate (DOM + JSON + dist/)', async () => {
    assert.deepEqual(scanDirectoryForPdpaNric(distDir), []);
    assert.deepEqual(scanDirectoryForIndonesianTerms(distDir), []);
    await withTrackedPage(browser, server.baseUrl, {}, async ({ page, errors }) => {
      const enText = await page.evaluate(() => document.body.innerText);
      assert.deepEqual(scanTextForPdpaNric(enText, 'T3-20 EN'), []);
      assert.equal(enText.includes('[object Object]'), false);

      await switchLanguage(page, 'bm');
      const bmText = await page.evaluate(() => document.body.innerText);
      assert.deepEqual(scanTextForPdpaNric(bmText, 'T3-20 BM'), []);
      assert.deepEqual(scanTextForIndonesianTerms(bmText, 'T3-20 BM'), []);
      assert.equal(bmText.includes('[object Object]'), false);

      const { rawText } = await triggerFooterJsonExport(page);
      assert.deepEqual(scanTextForPdpaNric(rawText, 'T3-20 JSON'), []);
      errors.assertZeroUnexpected('T3-20');
    });
  });
});
