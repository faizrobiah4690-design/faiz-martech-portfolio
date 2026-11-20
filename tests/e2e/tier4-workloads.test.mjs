import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import {
  CANONICAL_CASE_STUDIES,
  CANONICAL_COURSERA_CODES,
  CANONICAL_OPERATIONAL_ORGS,
  REPO_ROOT,
  VIEWPORTS,
  assertNoBrokenVisibleImages,
  assertNoHorizontalOverflow,
  closeModal,
  expandAllGovernanceRoles,
  getAllStagesButton,
  getFunnelStageButton,
  getNavbar,
  getSearchInput,
  getSkmContainer,
  getVisibleProjectIds,
  launchBrowser,
  loadGroundTruth,
  openProjectModal,
  resolveDistDir,
  runIsolatedNextProjectProbe,
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

describe('Tier 4 — Real-World Application Scenarios (10 End-to-End User Journeys)', () => {
  test('T4-01: Enterprise RevOps / MarTech Recruiter (Desktop 1440x900)', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.desktop }, async ({ page, errors }) => {
      const heroText = await page.locator('main section').first().innerText();
      assert.ok(heroText.includes('Mohd Faiz Bin Md Nordin'));
      assert.match(heroText, new RegExp(`\\b${truth.expectedSystems}\\b`));
      assert.equal(
        await page.locator('a[href*="linkedin.com"]').first().getAttribute('href'),
        'https://www.linkedin.com/in/mohd-faiz-md-nordin-896205283'
      );

      const heroCta = page
        .locator('main section')
        .first()
        .locator('a, button')
        .filter({ hasText: new RegExp(`\\b${truth.expectedSystems}\\b.*(?:System|Sistem|Explore|Teroka)`, 'i') })
        .first();
      await heroCta.click();

      const expected01 = truth.projects.filter((p) => p.stageCode === '01').map((p) => p.id).sort();
      await getFunnelStageButton(page, '01').click();
      assert.deepEqual(await getVisibleProjectIds(page), expected01);

      const dialog = await openProjectModal(page, 'PRJ-01');
      const modalText = await dialog.innerText();
      assert.match(modalText, /< 10s Speed-to-Lead SLA sync/i);
      assert.ok(modalText.includes('Inbound Form Webhook'));
      assert.ok(modalText.includes('Deterministic SLA timer'));
      assert.ok(modalText.includes('Gemini Flash'));
      await closeModal(page, 'escape');

      const mainText = await page.locator('main').innerText();
      assert.ok(mainText.includes('S304265796'));
      assert.ok(mainText.includes('TERAMPIL'));
      assert.ok(mainText.includes('93.23%'));
      assert.ok(mainText.includes('99.37%'));
      assert.ok(mainText.includes('Universiti Malaysia Pahang (UMP)'));
      assert.ok(mainText.includes('International Islamic University Malaysia (IIUM)'));
      assert.equal(await page.locator('a[href^="https://coursera.org/verify/"]').count(), 6);
      await assertNoBrokenVisibleImages(page);
      errors.assertZeroUnexpected('T4-01');
    });
  });

  test('T4-02: Local SME / Clinic Client Seeking WhatsApp-to-Cash Attribution (PRJ-04 + CS-01)', async () => {
    const expected03 = truth.projects.filter((p) => p.stageCode === '03').map((p) => p.id).sort();
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.desktop }, async ({ page, errors }) => {
      await getFunnelStageButton(page, '03').click();
      assert.deepEqual(await getVisibleProjectIds(page), expected03);

      const dialog = await openProjectModal(page, 'PRJ-04');
      const modalText = await dialog.innerText();
      assert.ok(modalText.includes('HTTP 204'));
      assert.ok(modalText.includes('ctwa_clid'));
      assert.ok(modalText.includes('physical_store SHA-256'));
      await closeModal(page, 'button');

      const mainText = await page.locator('main').innerText();
      assert.ok(mainText.includes('Radhi Fruits 4690'));
      assert.ok(mainText.includes('Oct 2021 – Present'));
      assert.equal(
        await page.locator('a[href*="wa.me"]').first().getAttribute('href'),
        'https://wa.me/60183904690'
      );
      errors.assertZeroUnexpected('T4-02');
    });
  });

  test('T4-03: PDPA 2024 & Data Governance Compliance Auditor (DOM + Modals + JSON + dist/)', async () => {
    assert.deepEqual(scanDirectoryForPdpaNric(distDir), []);
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.desktop }, async ({ page, errors }) => {
      for (const [id, expectedMarker] of [
        ['PRJ-03', 'Zero-PII Cohort Mart'],
        ['PRJ-04', 'Masked Attribution Mart'],
      ]) {
        const dialog = await openProjectModal(page, id);
        const modalText = await dialog.innerText();
        assert.ok(modalText.includes(expectedMarker));
        assert.deepEqual(scanTextForPdpaNric(modalText, `T4-03 ${id}`), []);
        await closeModal(page, 'escape');
      }

      await expandAllGovernanceRoles(page);
      const mainText = await page.locator('main').innerText();
      assert.match(mainText, /Mask NRIC|PDPA/i);
      assert.match(mainText, /zero-fabrication/i);
      assert.deepEqual(scanTextForPdpaNric(mainText, 'T4-03 main'), []);

      const { rawText } = await triggerFooterJsonExport(page);
      assert.deepEqual(scanTextForPdpaNric(rawText, 'T4-03 JSON'), []);
      errors.assertZeroUnexpected('T4-03');
    });
  });

  test('T4-04: Malaysian Bahasa Melayu Mobile User (390x844 Full BM + 0 Indonesian Words)', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.mobile }, async ({ page, errors }) => {
      await switchLanguage(page, 'bm');
      await assertNoHorizontalOverflow(page);

      const heroText = await page.locator('main section').first().innerText();
      assert.ok(heroText.includes('Pengamal Pemasaran Digital'));
      assert.ok(heroText.includes('Tunai Bersih Sebenar'));

      const expected05 = truth.projects.filter((p) => p.stageCode === '05').map((p) => p.id).sort();
      await getFunnelStageButton(page, '05').click();
      assert.deepEqual(await getVisibleProjectIds(page), expected05);
      const dialog = await openProjectModal(page, 'PRJ-03');
      assert.ok((await dialog.innerText()).includes('Enjin Pengekalan DTC'));
      await closeModal(page, 'escape');

      await expandAllGovernanceRoles(page);
      await page.locator('footer').scrollIntoViewIfNeeded();
      await assertNoHorizontalOverflow(page);

      const fullBmText = await page.evaluate(() => document.body.innerText);
      assert.deepEqual(scanTextForIndonesianTerms(fullBmText, 'T4-04 BM'), []);
      errors.assertZeroUnexpected('T4-04');
    });
  });

  test('T4-05: Social Commerce / Marketplace Hiring Manager (PRJ-05 Net Cash Audit + Export)', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.desktop }, async ({ page, errors }) => {
      const search = await getSearchInput(page);
      await search.fill('GMV Max');
      assert.deepEqual(await getVisibleProjectIds(page), ['PRJ-05']);

      const dialog = await openProjectModal(page, 'PRJ-05');
      const modalText = await dialog.innerText();
      assert.match(modalText, /RM 0\.00 Order-to-Settlement/i);
      assert.ok(modalText.includes('7-tab relational schema'));
      assert.ok(modalText.includes('8% SST'));
      assert.ok(modalText.includes('RTS/refund clawbacks'));
      assert.ok(modalText.includes('Sandbox Stress-Test Validated'));
      await closeModal(page, 'escape');

      const { parsed } = await triggerFooterJsonExport(page);
      assert.ok(parsed.projects.some((p) => p.id === 'PRJ-05'));
      errors.assertZeroUnexpected('T4-05');
    });
  });

  test('T4-06: Ad Ops Lead Evaluating Paid Media Guardrails (PRJ-02 + PRJ-06 + Non-Negotiables)', async () => {
    const expected02 = truth.projects.filter((p) => p.stageCode === '02').map((p) => p.id).sort();
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.desktop }, async ({ page, errors }) => {
      await getFunnelStageButton(page, '02').click();
      assert.deepEqual(await getVisibleProjectIds(page), expected02);

      const dialog = await openProjectModal(page, 'PRJ-02');
      const modalText = await dialog.innerText();
      assert.ok(modalText.includes('Automated sub-floor POAS & dead-link detection'));
      assert.ok(modalText.includes('Sample Gate + HTTP + POAS Math'));
      assert.ok(modalText.includes('Creative Fatigue Diagnostic'));
      const badLinks = await dialog.locator('a').evaluateAll((els) =>
        els.map((a) => a.getAttribute('href')).filter((h) => !h || h === '#')
      );
      assert.deepEqual(badLinks, []);
      await closeModal(page, 'escape');

      const mainText = await page.locator('main').innerText();
      assert.match(mainText, /RM 0\/mo|Zero-Subscription/i);
      assert.match(mainText, /Deterministic/i);
      errors.assertZeroUnexpected('T4-06');
    });
  });

  test('T4-07: F&B / Community Service Prospect (CS-02 PedalHaus + CS-03 School Van EN/BM)', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.desktop }, async ({ page, errors }) => {
      const enText = await page.locator('main').innerText();
      assert.ok(enText.includes('PedalHaus Chukai'));
      assert.ok(enText.includes('May 2026 – Present'));
      assert.ok(enText.includes('School Van Service, Binjai'));
      assert.ok(enText.includes('Feb 2024 – Feb 2025'));
      assert.ok(enText.includes('without claiming isolated paid-ad attribution'));

      await switchLanguage(page, 'bm');
      const bmText = await page.locator('main').innerText();
      assert.ok(bmText.includes('Dine-in / Tapau / Pickup'));
      assert.ok(bmText.includes('Lesen PSV'));
      assert.ok(bmText.includes('tanpa tuntutan atribusi iklan berbayar yang berlebihan'));
      await assertNoBrokenVisibleImages(page);
      errors.assertZeroUnexpected('T4-07');
    });
  });

  test('T4-08: JPK / Academic / HR Background Verifier (SKM, 6 Coursera, UMP/IIUM, 5 Roles)', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.desktop }, async ({ page, errors }) => {
      await expandAllGovernanceRoles(page);
      const skmCard = await getSkmContainer(page);
      const skmText = await skmCard.innerText();
      assert.ok(skmText.includes('S304265796'));
      assert.ok(skmText.includes('M731-001-3:2021'));
      assert.ok(skmText.includes('M731-001-3:2021-102026'));
      assert.ok(skmText.includes('TERAMPIL'));
      assert.equal(/pending|belum selesai|dalam proses/i.test(skmText), false);

      const text = await page.locator('main').innerText();
      for (const { code, score } of CANONICAL_COURSERA_CODES) {
        assert.ok(text.includes(score), `Missing score ${score}`);
        assert.equal(await page.locator(`a[href="https://coursera.org/verify/${code}"]`).count(), 1);
      }

      assert.ok(text.includes('Universiti Malaysia Pahang (UMP)'));
      assert.ok(text.includes('International Islamic University Malaysia (IIUM)'));
      for (const org of CANONICAL_OPERATIONAL_ORGS) {
        assert.ok(text.includes(org), `Missing org ${org}`);
      }
      assert.ok(text.includes('73 inland distribution drivers'));
      errors.assertZeroUnexpected('T4-08');
    });
  });

  test('T4-09: Portfolio Maintainer Adding Next PRJ-0N (PRJ-07) Day-by-Day (Isolated Rebuild 6 -> 7)', async () => {
    const doc = fs.readFileSync(path.join(REPO_ROOT, 'CONTRIBUTING_PROJECTS.md'), 'utf8');
    assert.ok(doc.includes('src/data/projects.json'));
    assert.ok(doc.includes('PRJ-06'));

    await runIsolatedNextProjectProbe(browser, async ({ baseUrl, nextId, totalSystems, expectedStage02Ids }) => {
      await withTrackedPage(browser, baseUrl, { viewport: VIEWPORTS.desktop }, async ({ page, errors }) => {
        assert.match(await getNavbar(page).innerText(), new RegExp(`\\b${totalSystems}\\b`));
        assert.match(await page.locator('main section').first().innerText(), new RegExp(`\\b${totalSystems}\\b`));
        assert.match(await getFunnelStageButton(page, '02').innerText(), new RegExp(`\\b${expectedStage02Ids.length}\\b`));
        assert.equal((await getVisibleProjectIds(page)).length, totalSystems);

        await getFunnelStageButton(page, '02').click();
        assert.deepEqual(await getVisibleProjectIds(page), expectedStage02Ids);
        const dNext = await openProjectModal(page, nextId);
        assert.ok((await dNext.innerText()).includes(nextId));
        await closeModal(page, 'escape');
        errors.assertZeroUnexpected('T4-09');
      });
    });
  });

  test('T4-10: Zero-Asset Greenfield Resilience & Full Interactive Session Health Audit', async () => {
    await withTrackedPage(browser, server.baseUrl, { viewport: VIEWPORTS.desktop }, async ({ page, errors }) => {
      for (const id of truth.projects.map((p) => p.id)) {
        await openProjectModal(page, id);
        await assertNoBrokenVisibleImages(page);
        await closeModal(page, 'escape');
      }

      for (const cs of CANONICAL_CASE_STUDIES) {
        assert.ok((await page.locator('main').innerText()).includes(cs.client));
      }
      await assertNoBrokenVisibleImages(page);

      const { parsed, rawText } = await triggerFooterJsonExport(page);
      assert.equal(parsed.projects.length, truth.expectedSystems);
      assert.deepEqual(scanTextForPdpaNric(rawText, 'T4-10 JSON'), []);
      errors.assertZeroUnexpected('T4-10');
    });
  });
});
