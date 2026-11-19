import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FUNNEL_STAGES, computePortfolioMetrics } from '../../src/utils/metrics.js';
import { normalizeLang, localize, syncDocumentLang } from '../../src/utils/i18n.js';
import { normalizeExternalUrl, isSafeExternalUrl } from '../../src/utils/urlSafety.js';
import {
  buildSanitizedPortfolioExport,
  downloadPortfolioJson
} from '../../src/utils/exportPortfolioJson.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');

function readJson(relPath) {
  const fullPath = path.join(ROOT_DIR, relPath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

const profile = readJson('src/data/profile.json');
const projects = readJson('src/data/projects.json');
const liveApps = readJson('src/data/liveApps.json');
const caseStudies = readJson('src/data/caseStudies.json');
const credentials = readJson('src/data/credentials.json');
const operationalHistory = readJson('src/data/operationalHistory.json');
const i18n = readJson('src/data/i18n.json');

const FORBIDDEN_INDONESIAN_RE =
  /\b(dasbor|laba\s+bersih|peramban|peladen|(?:di|ter|me(?:ng)?|peng)?unduh(?:an)?|sertifikat|tautan|kartu\s+skor|antarmuka|pencarian|kata\s+sandi|arsitektur|tingkap|berisipadu|perangkat|fitur|bisnis|kualitas|kinerja|solusi|otomatis|efektif|konten|saat\s+ini|bisa|gimana|playbook)\b/i;

function assertBilingualObject(val, label) {
  assert.ok(val && typeof val === 'object', `${label} must be an object`);
  assert.ok(
    (typeof val.en === 'string' && val.en.trim().length > 0) ||
      (Array.isArray(val.en) && val.en.length > 0),
    `${label}.en must be non-empty`
  );
  assert.ok(
    (typeof val.bm === 'string' && val.bm.trim().length > 0) ||
      (Array.isArray(val.bm) && val.bm.length > 0),
    `${label}.bm must be non-empty`
  );
  if (Array.isArray(val.en) || Array.isArray(val.bm)) {
    assert.ok(Array.isArray(val.en) && Array.isArray(val.bm), `${label} must have arrays for both en and bm`);
    assert.equal(val.en.length, val.bm.length, `${label} en/bm array length mismatch`);
  }
}

function walkBilingualPairs(node, pathLabel = 'root', bmStrings = []) {
  if (Array.isArray(node)) {
    node.forEach((item, idx) => walkBilingualPairs(item, `${pathLabel}[${idx}]`, bmStrings));
    return bmStrings;
  }
  if (node && typeof node === 'object') {
    const hasEn = Object.prototype.hasOwnProperty.call(node, 'en');
    const hasBm = Object.prototype.hasOwnProperty.call(node, 'bm');
    if (hasEn || hasBm) {
      assertBilingualObject(node, pathLabel);
      if (typeof node.bm === 'string') {
        bmStrings.push({ path: `${pathLabel}.bm`, text: node.bm });
      } else if (Array.isArray(node.bm)) {
        node.bm.forEach((s, idx) => {
          if (typeof s === 'string') bmStrings.push({ path: `${pathLabel}.bm[${idx}]`, text: s });
        });
      }
    }
    for (const [key, val] of Object.entries(node)) {
      if (key === 'en' || key === 'bm') continue;
      walkBilingualPairs(val, `${pathLabel}.${key}`, bmStrings);
    }
  }
  return bmStrings;
}

function walkNonBilingualStrings(node, pathLabel = 'root', strings = []) {
  if (typeof node === 'string') {
    strings.push({ path: pathLabel, text: node });
    return strings;
  }
  if (Array.isArray(node)) {
    node.forEach((item, idx) => walkNonBilingualStrings(item, `${pathLabel}[${idx}]`, strings));
    return strings;
  }
  if (node && typeof node === 'object') {
    const hasEn = Object.prototype.hasOwnProperty.call(node, 'en');
    const hasBm = Object.prototype.hasOwnProperty.call(node, 'bm');
    for (const [key, val] of Object.entries(node)) {
      if ((hasEn || hasBm) && (key === 'en' || key === 'bm')) continue;
      walkNonBilingualStrings(val, `${pathLabel}.${key}`, strings);
    }
  }
  return strings;
}

function extractPlaceholders(str) {
  return (str.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort();
}

function checkI18nParity(enNode, bmNode, nodePath = 'i18n', bmStrings = []) {
  if (Array.isArray(enNode) || Array.isArray(bmNode)) {
    assert.ok(Array.isArray(enNode) && Array.isArray(bmNode), `${nodePath} must be array in both EN and BM`);
    assert.equal(enNode.length, bmNode.length, `${nodePath} array length mismatch`);
    enNode.forEach((item, idx) => checkI18nParity(item, bmNode[idx], `${nodePath}[${idx}]`, bmStrings));
    return bmStrings;
  }
  if (enNode && typeof enNode === 'object' && bmNode && typeof bmNode === 'object') {
    const enKeys = Object.keys(enNode).sort();
    const bmKeys = Object.keys(bmNode).sort();
    assert.deepEqual(enKeys, bmKeys, `${nodePath} key mismatch between en and bm`);
    for (const key of enKeys) {
      checkI18nParity(enNode[key], bmNode[key], `${nodePath}.${key}`, bmStrings);
    }
    return bmStrings;
  }
  assert.equal(typeof enNode, 'string', `${nodePath}.en must be a string`);
  assert.equal(typeof bmNode, 'string', `${nodePath}.bm must be a string`);
  assert.ok(enNode.trim().length > 0, `${nodePath}.en must not be empty`);
  assert.ok(bmNode.trim().length > 0, `${nodePath}.bm must not be empty`);
  assert.deepEqual(
    extractPlaceholders(enNode),
    extractPlaceholders(bmNode),
    `${nodePath} {placeholder} token mismatch between en and bm`
  );
  bmStrings.push({ path: `${nodePath}.bm`, text: bmNode });
  return bmStrings;
}

test('schema: profile.json matches candidate identity and safe URL contracts', () => {
  assert.equal(profile.fullName, 'Mohd Faiz Bin Md Nordin');
  assert.ok(typeof profile.brandAlias === 'string' && profile.brandAlias.includes('Abu Radhi'));
  assertBilingualObject(profile.headline, 'profile.headline');
  assertBilingualObject(profile.subheadline, 'profile.subheadline');
  assert.equal(profile.location, 'Kemaman, Terengganu, Malaysia');
  assert.ok(typeof profile.contacts.email === 'string' && profile.contacts.email.includes('@'));
  assert.ok(
    typeof profile.contacts.phoneDisplay === 'string' &&
      profile.contacts.phoneDisplay.trim().length > 0
  );
  assert.ok(profile.contacts.emailHref.startsWith('mailto:'));
  assert.ok(isSafeExternalUrl(profile.contacts.emailHref));
  assert.ok(isSafeExternalUrl(profile.contacts.whatsappUrl));
  assert.ok(isSafeExternalUrl(profile.contacts.linkedinUrl));
  assert.ok(isSafeExternalUrl(profile.contacts.githubUrl));
  assert.equal(profile.contacts.resumePdfPath, undefined);
});

test('schema: projects.json satisfies PRJ-01..05+ contract, 5 pipeline nodes, and safe URLs', () => {
  assert.ok(Array.isArray(projects) && projects.length >= 5);
  const validStages = new Set(['01', '02', '03', '04', '05']);
  const projectIds = projects.map((p) => p.id);
  assert.equal(new Set(projectIds).size, projectIds.length, 'Project IDs must be unique');

  for (const project of projects) {
    assert.match(project.id, /^PRJ-\d{2,}$/);
    assert.ok(validStages.has(project.stageCode), `Invalid stageCode on ${project.id}`);
    assertBilingualObject(project.funnelStageName, `${project.id}.funnelStageName`);
    assert.ok(typeof project.category === 'string' && project.category.trim().length > 0);
    assert.ok(typeof project.statusBadge === 'string' && project.statusBadge.trim().length > 0);
    assertBilingualObject(project.title, `${project.id}.title`);
    assertBilingualObject(project.businessObjective, `${project.id}.businessObjective`);
    assertBilingualObject(project.martechInsight, `${project.id}.martechInsight`);
    assert.ok(typeof project.headlineMetric === 'string' && project.headlineMetric.trim().length > 0);
    assertBilingualObject(project.commercialLeak, `${project.id}.commercialLeak`);
    assertBilingualObject(project.deterministicGate, `${project.id}.deterministicGate`);
    assertBilingualObject(project.boundedAiRole, `${project.id}.boundedAiRole`);
    assertBilingualObject(project.validatedOutcome, `${project.id}.validatedOutcome`);
    assert.ok(Array.isArray(project.stack) && project.stack.length > 0);
    assert.ok(Array.isArray(project.pipelineNodes) && project.pipelineNodes.length === 5);
    for (const [nodeIdx, node] of project.pipelineNodes.entries()) {
      assertBilingualObject(node, `${project.id}.pipelineNodes[${nodeIdx}]`);
    }
    assert.ok(Array.isArray(project.pipelineStepDetails) && project.pipelineStepDetails.length === 5);
    for (const [stepIdx, step] of project.pipelineStepDetails.entries()) {
      assert.equal(step.stepNumber, stepIdx + 1);
      assertBilingualObject(step.role, `${project.id}.pipelineStepDetails[${stepIdx}].role`);
      assertBilingualObject(step.summary, `${project.id}.pipelineStepDetails[${stepIdx}].summary`);
    }
    assert.ok(Array.isArray(project.formulas) && project.formulas.length >= 1);
    for (const [fIdx, formula] of project.formulas.entries()) {
      assertBilingualObject(formula.name, `${project.id}.formulas[${fIdx}].name`);
      assert.ok(typeof formula.formula === 'string' && formula.formula.trim().length > 0);
      assertBilingualObject(formula.note, `${project.id}.formulas[${fIdx}].note`);
    }
    assert.ok(Array.isArray(project.processVisuals) && project.processVisuals.length > 0);
    for (const [vIdx, visual] of project.processVisuals.entries()) {
      assert.ok(typeof visual.src === 'string' && visual.src.startsWith('/assets/projects/'));
      assertBilingualObject(visual.caption, `${project.id}.processVisuals[${vIdx}].caption`);
      assertBilingualObject(visual.flowStep, `${project.id}.processVisuals[${vIdx}].flowStep`);
      assertBilingualObject(visual.takeaway, `${project.id}.processVisuals[${vIdx}].takeaway`);
    }

    assert.equal(typeof project.lookerUrl, 'string');
    assert.equal(typeof project.liveAppUrl, 'string');
    assert.equal(typeof project.repoUrl, 'string');
    if (project.lookerUrl) assert.ok(isSafeExternalUrl(project.lookerUrl));
    if (project.liveAppUrl) assert.ok(isSafeExternalUrl(project.liveAppUrl));
    assert.ok(project.repoUrl.startsWith('https://') && isSafeExternalUrl(project.repoUrl));

    if (project.processVisual !== undefined) {
      if (typeof project.processVisual === 'string') {
        assert.ok(project.processVisual.startsWith('/assets/'));
      } else {
        assert.ok(
          project.processVisual &&
            typeof project.processVisual.src === 'string' &&
            project.processVisual.src.startsWith('/assets/')
        );
      }
    }
  }
});

test('schema: caseStudies.json satisfies CS-01..03 real-world engagement schema', () => {
  assert.ok(Array.isArray(caseStudies) && caseStudies.length === 3);
  assert.deepEqual(
    caseStudies.map((cs) => cs.id),
    ['CS-01', 'CS-02', 'CS-03']
  );

  for (const cs of caseStudies) {
    assert.ok(typeof cs.period === 'string' && cs.period.trim().length > 0);
    assert.ok(typeof cs.client === 'string' && cs.client.trim().length > 0);
    assert.ok(typeof cs.sector === 'string' && cs.sector.trim().length > 0);
    assertBilingualObject(cs.focus, `${cs.id}.focus`);
    assertBilingualObject(cs.workDelivered, `${cs.id}.workDelivered`);
    assertBilingualObject(cs.whyItMatters, `${cs.id}.whyItMatters`);
    assertBilingualObject(cs.evidenceBoundary, `${cs.id}.evidenceBoundary`);
    assert.equal(typeof cs.evidenceImage, 'string');
    if (cs.evidenceImage !== '') {
      assert.ok(cs.evidenceImage.startsWith('/assets/'));
    }
  }
});

test('schema: credentials.json enforces SKM Level 3 TERAMPIL (never pending), 6 Coursera links, and UMP/IIUM', () => {
  const skm = credentials.nationalAccreditation;
  assertBilingualObject(skm.title, 'credentials.nationalAccreditation.title');
  assert.equal(skm.certificateSerialNo, 'S304265796');
  assert.equal(skm.nossCode, 'M731-001-3:2021');
  assert.ok(skm.batchCode.includes('M731-001-3:2021-102026'));
  assert.ok(skm.assessmentMethod.includes('TERAMPIL'));
  assert.equal(
    JSON.stringify(skm).toLowerCase().includes('pending'),
    false,
    'SKM accreditation must NEVER be labeled pending'
  );
  assert.equal(skm.certificateImage, undefined);
  assert.match(skm.privacyNote, /nric/i);

  assert.ok(Array.isArray(credentials.googleCourseraCourses));
  assert.equal(credentials.googleCourseraCourses.length, 6);
  for (const course of credentials.googleCourseraCourses) {
    assert.ok(typeof course.courseNumber === 'string' && course.courseNumber.trim().length > 0);
    assert.ok(typeof course.title === 'string' && course.title.trim().length > 0);
    assertBilingualObject(course.completionDate, `course-${course.courseNumber}.completionDate`);
    assertBilingualObject(course.studyHours, `course-${course.courseNumber}.studyHours`);
    assert.ok(typeof course.verifyCode === 'string' && course.verifyCode.length > 0);
    assert.ok(typeof course.score === 'string' && course.score.endsWith('%'));
    assert.equal(course.verifyUrl, `https://coursera.org/verify/${course.verifyCode}`);
    assert.match(course.verifyUrl, /^https:\/\/coursera\.org\/verify\/[A-Z0-9]+$/);
    assert.ok(isSafeExternalUrl(course.verifyUrl));
  }

  assertBilingualObject(credentials.systemBridge, 'credentials.systemBridge');
  assert.ok(Array.isArray(credentials.academicEducation) && credentials.academicEducation.length === 2);
  const eduText = JSON.stringify(credentials.academicEducation);
  assert.ok(eduText.includes('UMP') && eduText.includes('IIUM'));
});

test('schema: operationalHistory.json has 5 bilingual entries covering clinical, HSEQ, and 73-driver logistics', () => {
  assert.ok(Array.isArray(operationalHistory) && operationalHistory.length === 5);
  for (const entry of operationalHistory) {
    assert.match(entry.id, /^OPS-0[1-5]$/);
    assertBilingualObject(entry.period, `${entry.id}.period`);
    assertBilingualObject(entry.role, `${entry.id}.role`);
    assert.ok(typeof entry.organization === 'string' && entry.organization.trim().length > 0);
    assertBilingualObject(entry.domainTag, `${entry.id}.domainTag`);
    assertBilingualObject(entry.summary, `${entry.id}.summary`);
    assertBilingualObject(entry.martechTransfer, `${entry.id}.martechTransfer`);
  }
  const combined = JSON.stringify(operationalHistory);
  assert.ok(combined.includes('KMI Kuantan Medical Centre'));
  assert.ok(combined.includes('Illingworth Research Group'));
  assert.ok(combined.includes('Kaneka Malaysia'));
  assert.ok(combined.includes('Swift Integrated Logistics') && combined.includes('73'));
  assert.ok(combined.includes('MISC Integrated Logistics'));
});

test('schema: liveApps.json satisfies APP-01..09 contract, live/coming-soon states, and safe URLs', () => {
  assert.ok(Array.isArray(liveApps) && liveApps.length === 9);
  assert.deepEqual(
    liveApps.map((a) => a.id),
    ['APP-01', 'APP-02', 'APP-03', 'APP-04', 'APP-05', 'APP-06', 'APP-07', 'APP-08', 'APP-09']
  );

  for (const app of liveApps) {
    assert.ok(typeof app.name === 'string' && app.name.trim().length > 0, `${app.id}.name must be non-empty`);
    assert.ok(
      app.status === 'live' || app.status === 'coming-soon',
      `${app.id}.status must be 'live' or 'coming-soon', got ${app.status}`
    );
    assertBilingualObject(app.category, `${app.id}.category`);
    assertBilingualObject(app.tagline, `${app.id}.tagline`);
    assert.ok(Array.isArray(app.stack) && app.stack.length > 0, `${app.id}.stack must be non-empty`);
    assert.equal(typeof app.liveUrl, 'string', `${app.id}.liveUrl must be string`);
    assert.equal(typeof app.repoUrl, 'string', `${app.id}.repoUrl must be string`);

    if (app.status === 'live') {
      assert.ok(
        app.liveUrl.startsWith('https://') && isSafeExternalUrl(app.liveUrl),
        `${app.id} live app must have safe https:// liveUrl`
      );
    } else {
      assert.equal(app.liveUrl, '', `${app.id} non-live app must have empty liveUrl`);
    }

    if (app.repoUrl !== '') {
      assert.ok(
        app.repoUrl.startsWith('https://') && isSafeExternalUrl(app.repoUrl),
        `${app.id} non-empty repoUrl must be safe https://`
      );
    }

    if (app.repoVisibility !== undefined) {
      assert.ok(['public', 'private', 'unlisted'].includes(app.repoVisibility), `${app.id}.repoVisibility invalid`);
    }
  }

  const sebutCepat = liveApps.find((a) => a.id === 'APP-09');
  assert.equal(sebutCepat?.name, 'SebutCepat AI');
  assert.equal(sebutCepat?.status, 'coming-soon');
  assert.equal(sebutCepat?.liveUrl, '');
});

test('i18n & Malaysian BM hygiene: 100% EN/BM parity and zero forbidden Indonesian terms', () => {
  const dataBmStrings = [
    ...walkBilingualPairs(profile, 'profile'),
    ...walkBilingualPairs(projects, 'projects'),
    ...walkBilingualPairs(liveApps, 'liveApps'),
    ...walkBilingualPairs(caseStudies, 'caseStudies'),
    ...walkBilingualPairs(credentials, 'credentials'),
    ...walkBilingualPairs(operationalHistory, 'operationalHistory')
  ];

  let i18nBmStrings = [];
  if (i18n.en && i18n.bm) {
    i18nBmStrings = checkI18nParity(i18n.en, i18n.bm, 'i18n');
  } else {
    i18nBmStrings = walkBilingualPairs(i18n, 'i18n');
  }

  const allBm = [...dataBmStrings, ...i18nBmStrings];
  assert.ok(allBm.length > 50, 'Expected substantial BM localization coverage');

  const nonBilingualDataStrings = [
    ...walkNonBilingualStrings(profile, 'profile'),
    ...walkNonBilingualStrings(projects, 'projects'),
    ...walkNonBilingualStrings(liveApps, 'liveApps'),
    ...walkNonBilingualStrings(caseStudies, 'caseStudies'),
    ...walkNonBilingualStrings(credentials, 'credentials'),
    ...walkNonBilingualStrings(operationalHistory, 'operationalHistory')
  ];

  for (const item of [...allBm, ...nonBilingualDataStrings]) {
    const match = item.text.match(FORBIDDEN_INDONESIAN_RE);
    assert.equal(
      match,
      null,
      `Forbidden Indonesian term "${match?.[0]}" found at ${item.path}: ${item.text}`
    );
  }
});

test('metrics: dynamic counter bumps 5 -> 6 when temporary PRJ-06 is appended', () => {
  assert.equal(FUNNEL_STAGES.length, 5);
  assert.deepEqual(
    FUNNEL_STAGES.map((s) => s.code),
    ['01', '02', '03', '04', '05']
  );

  const baseline = computePortfolioMetrics(projects, credentials);
  assert.equal(baseline.totalSystems, 5);
  assert.equal(baseline.courseraCount, 6);
  assert.equal(baseline.stageCounts.length, 5);
  assert.deepEqual(
    baseline.stageCounts.map((s) => s.count),
    [1, 1, 1, 1, 1]
  );

  const extendedProjects = [
    ...structuredClone(projects),
    {
      ...structuredClone(projects[1]),
      id: 'PRJ-06',
      stageCode: '02',
      category: 'Ad Ops & Guardrail'
    }
  ];
  const extended = computePortfolioMetrics(extendedProjects, credentials);
  assert.equal(extended.totalSystems, 6);
  const stage02 = extended.stageCounts.find((s) => s.code === '02');
  assert.equal(stage02.count, 2);
  assert.equal(extended.stageCounts.find((s) => s.code === '01').count, 1);
  assert.equal(extended.stageCounts.find((s) => s.code === '03').count, 1);
  assert.equal(extended.stageCounts.find((s) => s.code === '04').count, 1);
  assert.equal(extended.stageCounts.find((s) => s.code === '05').count, 1);
  assert.equal(extended.categoryCounts['Ad Ops & Guardrail'], 2);

  // Edge cases
  const emptyMetrics = computePortfolioMetrics([], undefined);
  assert.equal(emptyMetrics.totalSystems, 0);
  assert.equal(emptyMetrics.courseraCount, 0);
  assert.deepEqual(emptyMetrics.categoryCounts, {});
  assert.deepEqual(
    emptyMetrics.stageCounts.map((s) => s.count),
    [0, 0, 0, 0, 0]
  );

  const unknownStageMetrics = computePortfolioMetrics(
    [{ id: 'PRJ-99', stageCode: '99', category: '__proto__' }],
    null
  );
  assert.equal(unknownStageMetrics.totalSystems, 1);
  assert.equal(unknownStageMetrics.stageCounts.length, 5);
  assert.equal(Object.prototype.hasOwnProperty.call(unknownStageMetrics.categoryCounts, '__proto__'), false);

  const protoCollisionMetrics = computePortfolioMetrics(
    [
      { id: 'PRJ-A', stageCode: '01', category: 'toString' },
      { id: 'PRJ-B', stageCode: '01', category: 'toString' },
      { id: 'PRJ-C', stageCode: '02', category: 'valueOf' },
      { id: 'PRJ-D', stageCode: '03', category: 'hasOwnProperty' },
      { id: 'PRJ-E', stageCode: '04', category: 'toLocaleString' },
      { id: 'PRJ-F', stageCode: '05', category: 'constructor' },
      { id: 'PRJ-G', stageCode: '05', category: 'prototype' }
    ],
    null
  );
  assert.deepStrictEqual(protoCollisionMetrics.categoryCounts, {
    toString: 2,
    valueOf: 1,
    hasOwnProperty: 1,
    toLocaleString: 1
  });
});

test('utils: i18n, urlSafety, and exportPortfolioJson pure helpers handle edge cases safely', () => {
  assert.equal(normalizeLang('bm'), 'bm');
  assert.equal(normalizeLang('ms'), 'bm');
  assert.equal(normalizeLang('EN'), 'en');
  assert.equal(normalizeLang(null), 'en');

  assert.equal(localize({ en: 'Hello', bm: 'Hai' }, 'bm'), 'Hai');
  assert.equal(localize({ en: 'Fallback', bm: '' }, 'bm'), 'Fallback');
  assert.equal(localize('nav.funnel', 'bm', i18n), i18n.bm.nav.funnel);
  assert.deepEqual(localize([{ en: 'A', bm: 'B' }], 'bm'), ['B']);
  assert.deepEqual(localize([[{ en: 'X', bm: 'Y' }]], 'bm'), [['Y']]);
  assert.equal(localize({}, 'bm'), '');
  assert.deepStrictEqual(localize('hero.kpis', 'en', i18n), i18n.en.hero.kpis);
  assert.deepStrictEqual(localize('hero.kpis', 'bm', i18n), i18n.bm.hero.kpis);
  assert.deepStrictEqual(
    localize('modal.deterministicFormulas', 'bm', i18n),
    i18n.bm.modal.deterministicFormulas
  );
  assert.deepStrictEqual(
    localize('governance.engineeringNonNegotiables', 'bm', i18n),
    i18n.bm.governance.engineeringNonNegotiables
  );
  assert.deepStrictEqual(localize('funnel.stages.01', 'bm', i18n), i18n.bm.funnel.stages['01']);
  assert.equal(syncDocumentLang('bm'), 'ms');
  assert.equal(syncDocumentLang('en'), 'en');

  assert.equal(
    normalizeExternalUrl('http://www.linkedin.com/in/example'),
    'https://www.linkedin.com/in/example'
  );
  assert.equal(
    normalizeExternalUrl('http://linkedin.com:80/in/test'),
    'https://linkedin.com/in/test'
  );
  assert.equal(
    normalizeExternalUrl('http://linkedin.com:8080/in/test'),
    'https://linkedin.com:8080/in/test'
  );
  assert.equal(normalizeExternalUrl('coursera.org/verify/ABC'), 'https://coursera.org/verify/ABC');
  assert.equal(normalizeExternalUrl('mailto:mfaiz.mdnordin@gmail.com'), 'mailto:mfaiz.mdnordin@gmail.com');
  assert.equal(normalizeExternalUrl('/assets/sample-document.pdf'), '');
  assert.equal(normalizeExternalUrl('javascript:alert(1)'), '');
  assert.equal(normalizeExternalUrl('java\tscript:alert(1)'), '');
  assert.equal(normalizeExternalUrl('data:text/html,<script>'), '');
  assert.equal(normalizeExternalUrl('https://linkedin.com/in/test\n'), '');
  assert.equal(isSafeExternalUrl('https://github.com/faizrobiah4690-design'), true);
  assert.equal(isSafeExternalUrl('http://github.com/faizrobiah4690-design'), false);
  assert.equal(isSafeExternalUrl('javascript:alert(1)'), false);
  assert.equal(isSafeExternalUrl('https://linkedin.com/in/test\n'), false);

  const syntheticHyphen = ['850512', '10', '5678'].join('-');
  const syntheticSpaced = ['850512', '10', '5678'].join(' ');
  const syntheticCompact = ['850512', '10', '5678'].join('');
  const synthetic1960Oct = ['601015', '08', '5123'].join('');
  const synthetic1960Dec = ['601231', '01', '5432'].join('');
  const syntheticJsonQuoted = JSON.stringify({ nric: ['123456', '78', '9012'].join('') });
  const syntheticSpacedJsonQuoted = '{"nric": "' + ['123456', '78', '9012'].join('') + '"}';

  const payload = buildSanitizedPortfolioExport({
    profile: {
      ...profile,
      nric: syntheticHyphen,
      nric_no: 'secret-1',
      mykad_no: 'secret-2',
      kp: 'secret-3',
      note: `ID ${syntheticCompact} | Spaced ${syntheticSpaced} | Oct60 ${synthetic1960Oct} | Dec60 ${synthetic1960Dec}`,
      rawJsonNote: syntheticJsonQuoted,
      spacedJsonNote: syntheticSpacedJsonQuoted,
      phoneSafe: '601112345678 601512345678 018-3904690'
    },
    projects,
    liveApps,
    caseStudies,
    credentials,
    operationalHistory
  });
  assert.equal(payload.pdpaCompliant, true);
  assert.equal(payload.liveApps.length, 9);
  assert.deepEqual(
    payload.liveApps.map((a) => a.id),
    ['APP-01', 'APP-02', 'APP-03', 'APP-04', 'APP-05', 'APP-06', 'APP-07', 'APP-08', 'APP-09']
  );
  assert.match(payload.attributionScope.liveApps, /Live Deployed.*Upcoming/i);
  assert.ok(typeof payload.exportedAt === 'string' && payload.exportedAt.length > 0);
  assert.equal(Object.prototype.hasOwnProperty.call(payload.profile, 'nric'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(payload.profile, 'nric_no'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(payload.profile, 'mykad_no'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(payload.profile, 'kp'), false);
  assert.equal(payload.profile.note.includes(syntheticCompact), false);
  assert.equal(payload.profile.note.includes(syntheticSpaced), false);
  assert.equal(payload.profile.note.includes(synthetic1960Oct), false);
  assert.equal(payload.profile.note.includes(synthetic1960Dec), false);
  assert.equal(payload.profile.note.includes('[REDACTED-PDPA]'), true);
  assert.equal(payload.profile.rawJsonNote, '{"nric":"[REDACTED-PDPA]"}');
  assert.equal(payload.profile.spacedJsonNote, '{"nric": "[REDACTED-PDPA]"}');
  assert.equal(payload.profile.phoneSafe, '601112345678 601512345678 018-3904690');
  assert.equal(payload.credentials.nationalAccreditation.certificateSerialNo, 'S304265796');
  assert.equal(payload.credentials.nationalAccreditation.batchCode, 'M731-001-3:2021-102026');
  assert.equal(downloadPortfolioJson(payload), false);
});

test('R3 compliance: zero resume/cert file path references and zero hardcoded JSX lang===bm strings', () => {
  const forbiddenRefRe = /resume-mohd-faiz|skm-level-3-cert/i;
  const checkFiles = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|jsx|json|css|md)$/i.test(entry.name)) checkFiles.push(full);
    }
  };
  walk(path.join(ROOT_DIR, 'src'));
  checkFiles.push(path.join(ROOT_DIR, 'CONTRIBUTING_PROJECTS.md'));

  for (const filePath of checkFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.equal(
      forbiddenRefRe.test(content),
      false,
      `Residual resume/cert file reference found in ${path.relative(ROOT_DIR, filePath)}`
    );
  }

  const jsxTargets = [
    path.join(ROOT_DIR, 'src', 'App.jsx'),
    ...fs
      .readdirSync(path.join(ROOT_DIR, 'src', 'components'))
      .filter((name) => name.endsWith('.jsx'))
      .map((name) => path.join(ROOT_DIR, 'src', 'components', name)),
  ];
  for (const filePath of jsxTargets) {
    const jsx = fs.readFileSync(filePath, 'utf8').replace(/className=\{`[\s\S]*?`\}/g, '');
    assert.equal(
      /\b(?:activeLang|lang)\s*===\s*['"]bm['"]|\bisBm\s*\?/.test(jsx),
      false,
      `Hardcoded JSX lang==='bm' / isBm ternary found in ${path.relative(ROOT_DIR, filePath)}`
    );
  }
});
