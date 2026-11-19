import { useCallback, useEffect, useMemo, useState } from 'react';

import profileData from './data/profile.json';
import projectsData from './data/projects.json';
import caseStudiesData from './data/caseStudies.json';
import credentialsData from './data/credentials.json';
import operationalHistoryData from './data/operationalHistory.json';
import liveAppsData from './data/liveApps.json';
import i18nData from './data/i18n.json';

import { localizeText, normalizeLang, safeLookup, syncDocumentLang } from './utils/i18n.js';
import { computePortfolioMetrics } from './utils/metrics.js';

import Navbar from './components/Navbar.jsx';
import HeroSection from './components/HeroSection.jsx';
import FunnelPipelineMap from './components/FunnelPipelineMap.jsx';
import SystemsRegistry from './components/SystemsRegistry.jsx';
import ArchitectureModal from './components/ArchitectureModal.jsx';
import LiveAppsShowcase from './components/LiveAppsShowcase.jsx';
import LocalCaseStudies from './components/LocalCaseStudies.jsx';
import CredentialsVault from './components/CredentialsVault.jsx';
import GovernanceAndBackground from './components/GovernanceAndBackground.jsx';
import Footer from './components/Footer.jsx';

function isPlainObject(v) {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v));
}

function buildProjectIdMap(projects) {
  const usedIds = new Set();
  for (const project of projects) {
    if (typeof project.id === 'string' && project.id.trim() !== '') {
      usedIds.add(project.id.trim());
    } else if (typeof project.id === 'number') {
      usedIds.add(String(project.id).trim());
    }
  }

  const assignedIds = new Set();
  const idMap = new WeakMap();
  projects.forEach((project, index) => {
    const hasExplicitId =
      (typeof project.id === 'string' && project.id.trim() !== '') ||
      typeof project.id === 'number';
    if (hasExplicitId) {
      const baseId = String(project.id).trim();
      let candidate = baseId;
      if (assignedIds.has(candidate)) {
        let suffix = 2;
        candidate = `${baseId}-${suffix}`;
        while (usedIds.has(candidate) || assignedIds.has(candidate)) {
          suffix += 1;
          candidate = `${baseId}-${suffix}`;
        }
      }
      assignedIds.add(candidate);
      idMap.set(project, candidate);
      return;
    }

    let candidateNum = index + 1;
    let candidate = `prj-${candidateNum}`;
    while (usedIds.has(candidate) || assignedIds.has(candidate)) {
      candidateNum += 1;
      candidate = `prj-${candidateNum}`;
    }
    usedIds.add(candidate);
    assignedIds.add(candidate);
    idMap.set(project, candidate);
  });
  return idMap;
}

export default function App({ initialData } = {}) {
  const profile = isPlainObject(initialData?.profile) ? initialData.profile : profileData;
  const projects = useMemo(
    () =>
      (Array.isArray(initialData?.projects) ? initialData.projects : projectsData).filter(
        isPlainObject
      ),
    [initialData?.projects]
  );
  const caseStudies = useMemo(
    () =>
      (Array.isArray(initialData?.caseStudies)
        ? initialData.caseStudies
        : caseStudiesData
      ).filter(isPlainObject),
    [initialData?.caseStudies]
  );
  const credentials = isPlainObject(initialData?.credentials)
    ? initialData.credentials
    : credentialsData;
  const operationalHistory = useMemo(
    () =>
      (Array.isArray(initialData?.operationalHistory)
        ? initialData.operationalHistory
        : operationalHistoryData
      ).filter(isPlainObject),
    [initialData?.operationalHistory]
  );
  const i18n = isPlainObject(initialData?.i18n) ? initialData.i18n : i18nData;

  const [lang, setLang] = useState(() => normalizeLang(initialData?.lang ?? 'en'));
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const t =
    (isPlainObject(i18n?.[lang]) ? i18n[lang] : null) ??
    (isPlainObject(i18n?.en) ? i18n.en : null) ??
    i18nData.en;

  useEffect(() => {
    syncDocumentLang(lang);
    const titleText = localizeText(t?.meta?.title, lang);
    if (typeof document !== 'undefined' && titleText) {
      document.title = titleText;
    }
  }, [lang, t]);

  const metrics = useMemo(
    () => computePortfolioMetrics(projects, credentials),
    [projects, credentials]
  );

  const projectIdMap = useMemo(() => buildProjectIdMap(projects), [projects]);
  const resolveProjectId = useCallback(
    (project, index) => projectIdMap.get(project) ?? `prj-${index + 1}`,
    [projectIdMap]
  );

  const categories = useMemo(
    () => Object.keys(metrics.categoryCounts || {}),
    [metrics.categoryCounts]
  );

  const filteredProjects = useMemo(() => {
    const q = typeof searchQuery === 'string' ? searchQuery.trim().toLowerCase() : '';

    return projects.filter((project) => {
      if (!isPlainObject(project)) return false;

      if (selectedStage !== 'ALL' && String(project.stageCode || '').trim() !== selectedStage) {
        return false;
      }

      const rawCategory =
        typeof project.category === 'string'
          ? project.category.trim()
          : typeof project.category?.en === 'string'
            ? project.category.en.trim()
            : '';

      if (selectedCategory !== 'ALL' && rawCategory !== selectedCategory) {
        return false;
      }

      if (!q) return true;

      const rawMetric =
        typeof project.headlineMetric === 'string' ? project.headlineMetric.trim() : '';
      const rawStatus =
        typeof project.statusBadge === 'string' ? project.statusBadge.trim() : '';

      const haystack = [
        localizeText(project.id, lang),
        localizeText(project.stageCode, lang),
        rawCategory,
        safeLookup(t?.categories, rawCategory),
        localizeText(project.category, 'en'),
        localizeText(project.category, 'bm'),
        localizeText(project.headlineMetric, 'en'),
        localizeText(project.headlineMetric, 'bm'),
        rawMetric ? safeLookup(t?.systems?.headlineMetricsMap, rawMetric) : '',
        rawStatus,
        rawStatus ? safeLookup(t?.statusBadges, rawStatus) : '',
        localizeText(project.statusBadge, 'en'),
        localizeText(project.statusBadge, 'bm'),
        localizeText(project.funnelStageName, 'en'),
        localizeText(project.funnelStageName, 'bm'),
        localizeText(project.title, 'en'),
        localizeText(project.title, 'bm'),
        localizeText(project.commercialLeak, 'en'),
        localizeText(project.commercialLeak, 'bm'),
        localizeText(project.deterministicGate, 'en'),
        localizeText(project.deterministicGate, 'bm'),
        localizeText(project.boundedAiRole, 'en'),
        localizeText(project.boundedAiRole, 'bm'),
        localizeText(project.validatedOutcome, 'en'),
        localizeText(project.validatedOutcome, 'bm'),
        ...(Array.isArray(project.stack)
          ? project.stack.map((s) => `${localizeText(s, 'en')} ${localizeText(s, 'bm')}`)
          : []),
        ...(Array.isArray(project.pipelineNodes)
          ? project.pipelineNodes.map((n) => `${localizeText(n, 'en')} ${localizeText(n, 'bm')}`)
          : [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [projects, selectedStage, selectedCategory, searchQuery, lang, t]);

  const selectedProject = useMemo(() => {
    if (selectedProjectId === null || selectedProjectId === undefined) return null;
    return (
      projects.find((project) => projectIdMap.get(project) === selectedProjectId) ?? null
    );
  }, [projects, projectIdMap, selectedProjectId]);

  const handleCloseModal = useCallback(() => {
    setSelectedProjectId(null);
  }, []);

  const handleToggleLang = useCallback((nextLang) => {
    setLang(normalizeLang(nextLang));
  }, []);

  const handleSelectStage = useCallback((stageCode) => {
    setSelectedStage((prev) => {
      if (stageCode === 'ALL') return 'ALL';
      return prev === stageCode ? 'ALL' : stageCode;
    });

    if (stageCode !== 'ALL' && typeof document !== 'undefined') {
      const systemsEl = document.getElementById('systems');
      if (systemsEl && typeof systemsEl.scrollIntoView === 'function') {
        systemsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, []);

  const handleResetFilters = useCallback(() => {
    setSelectedStage('ALL');
    setSelectedCategory('ALL');
    setSearchQuery('');
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-emerald-400 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950"
      >
        {normalizeLang(lang) === 'bm' ? 'Langkau ke kandungan' : 'Skip to content'}
      </a>

      <Navbar
        lang={lang}
        onToggleLang={handleToggleLang}
        totalSystems={metrics.totalSystems}
        t={t}
        profile={profile}
      />

      <main id="main-content" className="flex-1">
        <HeroSection profile={profile} lang={lang} t={t} metrics={metrics} />

        <FunnelPipelineMap
          lang={lang}
          t={t}
          metrics={metrics}
          selectedStage={selectedStage}
          onSelectStage={handleSelectStage}
        />

        <SystemsRegistry
          projects={projects}
          filteredProjects={filteredProjects}
          totalSystems={metrics.totalSystems}
          categories={categories}
          selectedStage={selectedStage}
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          onCategoryChange={setSelectedCategory}
          onSearchChange={setSearchQuery}
          onResetFilters={handleResetFilters}
          onSelectProject={setSelectedProjectId}
          getProjectId={resolveProjectId}
          lang={lang}
          t={t}
        />

        <LiveAppsShowcase apps={liveAppsData} lang={lang} />

        <LocalCaseStudies caseStudies={caseStudies} lang={lang} t={t} />

        <CredentialsVault credentials={credentials} lang={lang} t={t} />

        <GovernanceAndBackground
          operationalHistory={operationalHistory}
          lang={lang}
          t={t}
        />
      </main>

      <Footer
        profile={profile}
        projects={projects}
        caseStudies={caseStudies}
        credentials={credentials}
        operationalHistory={operationalHistory}
        lang={lang}
        t={t}
      />

      <ArchitectureModal
        project={selectedProject}
        lang={lang}
        t={t}
        onClose={handleCloseModal}
      />
    </div>
  );
}
