export const FUNNEL_STAGES = Object.freeze([
  Object.freeze({ code: '01', key: 'inbound', en: 'Inbound Lead SLA', bm: 'SLA Prospek Masuk' }),
  Object.freeze({ code: '02', key: 'paidAds', en: 'Paid Ads Guardrail', bm: 'Kawalan Iklan Berbayar' }),
  Object.freeze({ code: '03', key: 'offlineCapi', en: 'Offline / WA CAPI', bm: 'CAPI WhatsApp / Kaunter' }),
  Object.freeze({ code: '04', key: 'marketplace', en: 'Marketplace Net Cash', bm: 'Tunai Bersih Marketplace' }),
  Object.freeze({ code: '05', key: 'retention', en: 'RFM Churn & LTV', bm: 'RFM Risiko Lari & LTV' })
]);

function isPlainObject(v) {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v));
}

export function computePortfolioMetrics(projects = [], credentials = null) {
  const safeProjects = (Array.isArray(projects) ? projects : []).filter(isPlainObject);
  const courses = (
    Array.isArray(credentials?.googleCourseraCourses) ? credentials.googleCourseraCourses : []
  ).filter(isPlainObject);

  const countByStage = new Map(FUNNEL_STAGES.map((stage) => [stage.code, 0]));
  const categoryCounts = {};

  for (const project of safeProjects) {
    const code = typeof project.stageCode === 'string' ? project.stageCode.trim() : '';
    if (countByStage.has(code)) {
      countByStage.set(code, countByStage.get(code) + 1);
    }

    const rawCategory =
      typeof project.category === 'string'
        ? project.category
        : typeof project.category?.en === 'string'
          ? project.category.en
          : '';
    const category = rawCategory.trim();
    if (
      category &&
      category !== '__proto__' &&
      category !== 'constructor' &&
      category !== 'prototype'
    ) {
      categoryCounts[category] =
        (Object.hasOwn(categoryCounts, category) ? categoryCounts[category] : 0) + 1;
    }
  }

  const stageCounts = FUNNEL_STAGES.map((stage) => ({
    ...stage,
    count: countByStage.get(stage.code) ?? 0
  }));

  return {
    totalSystems: safeProjects.length,
    stageCounts,
    courseraCount: courses.length,
    categoryCounts
  };
}
