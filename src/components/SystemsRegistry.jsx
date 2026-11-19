import { AlertTriangle, ArrowUpRight, Layers, RotateCcw, Search } from 'lucide-react';
import { localizeText, safeLookup } from '../utils/i18n.js';

function isPlainObject(v) {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v));
}

export default function SystemsRegistry({
  filteredProjects,
  totalSystems,
  categories,
  selectedStage,
  selectedCategory,
  searchQuery,
  onStageChange,
  onCategoryChange,
  onSearchChange,
  onResetFilters,
  onSelectProject,
  getProjectId,
  lang,
  t
}) {
  const safeFilteredProjects = (Array.isArray(filteredProjects) ? filteredProjects : []).filter(
    isPlainObject
  );
  const safeCategories = (Array.isArray(categories) ? categories : []).filter(
    (category) => typeof category === 'string' && category.trim() !== ''
  );

  const hasActiveFilter =
    selectedStage !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    (typeof searchQuery === 'string' && searchQuery.trim() !== '');

  const showingText = (
    localizeText(t?.systems?.showingCount, lang) || 'Showing {shown} of {total} Systems'
  )
    .replace('{shown}', String(safeFilteredProjects.length))
    .replace('{total}', String(totalSystems ?? 0));

  const allCategoriesLabel = localizeText(t?.systems?.allCategories, lang) || 'All Categories';
  const clearFiltersLabel = localizeText(t?.systems?.clearFilters, lang) || 'Reset Filters';
  const activeStageEntry =
    selectedStage !== 'ALL' &&
    isPlainObject(t?.funnel?.stages) &&
    Object.hasOwn(t.funnel.stages, selectedStage) &&
    isPlainObject(t.funnel.stages[selectedStage])
      ? t.funnel.stages[selectedStage]
      : null;
  const activeStageName = activeStageEntry ? localizeText(activeStageEntry.name, lang) : '';

  return (
    <section id="systems" className="scroll-mt-20 border-b border-slate-800/80 py-14 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-2 max-w-3xl mb-6">
          <p className="font-mono text-xs uppercase tracking-wider text-emerald-400">
            {localizeText(t?.systems?.eyebrow, lang)}
          </p>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
            {localizeText(t?.systems?.heading, lang)}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            {localizeText(t?.systems?.subtitle, lang)}
          </p>
        </div>

        <div className="rounded-xl border border-amber-400/30 bg-amber-950/20 px-4 py-3 text-xs sm:text-sm text-amber-200 flex items-start gap-2.5 mb-6">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">{localizeText(t?.systems?.attributionNotice, lang)}</p>
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-5 mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="relative flex-1 min-w-0">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={typeof searchQuery === 'string' ? searchQuery : ''}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label={localizeText(t?.systems?.searchLabel, lang) || 'Search MarTech systems'}
                placeholder={
                  localizeText(t?.systems?.searchPlaceholder, lang) || 'Search systems...'
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950/90 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 focus:border-emerald-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <p
                role="status"
                aria-live="polite"
                className="font-mono text-xs text-slate-300"
                data-testid="systems-showing-count"
              >
                {showingText}
              </p>

              {selectedStage !== 'ALL' ? (
                <button
                  type="button"
                  onClick={() =>
                    typeof onStageChange === 'function' ? onStageChange('ALL') : onResetFilters?.()
                  }
                  aria-label={`${localizeText(t?.systems?.clearStageAria, lang) || 'Clear stage filter'}: ${selectedStage}`}
                  data-testid="active-stage-chip"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-400/15 px-2.5 py-1 text-xs font-mono font-semibold text-emerald-300 hover:border-emerald-400 transition"
                >
                  <span>
                    {localizeText(t?.systems?.stagePrefix, lang) || 'Stage'} {selectedStage}
                    {activeStageName ? ` · ${activeStageName}` : ''}
                  </span>
                  <span aria-hidden="true">×</span>
                </button>
              ) : null}

              {hasActiveFilter ? (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-400/50 hover:text-emerald-300"
                >
                  <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{clearFiltersLabel}</span>
                </button>
              ) : null}
            </div>
          </div>

          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label={allCategoriesLabel}
          >
            <button
              type="button"
              onClick={() => onCategoryChange('ALL')}
              aria-pressed={selectedCategory === 'ALL'}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                selectedCategory === 'ALL'
                  ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300'
                  : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-cyan-400/50 hover:text-cyan-200'
              }`}
            >
              {allCategoriesLabel}
            </button>

            {safeCategories.map((category) => {
              const isSelected = selectedCategory === category;
              const categoryLabel = safeLookup(t?.categories, category) || category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onCategoryChange(category)}
                  aria-pressed={isSelected}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300'
                      : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-cyan-400/50 hover:text-cyan-200'
                  }`}
                >
                  {categoryLabel}
                </button>
              );
            })}
          </div>
        </div>

        {safeFilteredProjects.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center space-y-3">
            <Layers className="h-8 w-8 text-slate-500 mx-auto" aria-hidden="true" />
            <h3 className="text-lg font-display font-bold text-white">
              {localizeText(t?.systems?.emptyStateTitle, lang) || 'No matching systems found'}
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              {localizeText(t?.systems?.emptyStateBody, lang)}
            </p>
            <div>
              <button
                type="button"
                onClick={onResetFilters}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
              >
                <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{clearFiltersLabel}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {safeFilteredProjects.map((project, index) => {
              const hasExplicitId =
                (typeof project.id === 'string' && project.id.trim() !== '') ||
                typeof project.id === 'number';
              const fallbackId = hasExplicitId
                ? String(project.id).trim()
                : `prj-${index + 1}`;
              const projectId =
                typeof getProjectId === 'function' ? getProjectId(project, index) : fallbackId;
              const displayId = hasExplicitId
                ? localizeText(project.id, lang).trim() || projectId
                : projectId;
              const selectKey = projectId;
              const stageCode =
                typeof project.stageCode === 'string' || typeof project.stageCode === 'number'
                  ? String(project.stageCode).trim()
                  : '';

              const statusKey =
                typeof project.statusBadge === 'string' ? project.statusBadge.trim() : '';
              const translatedStatus =
                (statusKey && safeLookup(t?.statusBadges, statusKey)) ||
                localizeText(project.statusBadge, lang);

              const rawCategoryKey =
                typeof project.category === 'string'
                  ? project.category.trim()
                  : typeof project.category?.en === 'string'
                    ? project.category.en.trim()
                    : '';
              const translatedCategory =
                (rawCategoryKey && safeLookup(t?.categories, rawCategoryKey)) ||
                localizeText(project.category, lang);

              const metricKey =
                typeof project.headlineMetric === 'string' ? project.headlineMetric.trim() : '';
              const translatedMetric =
                (metricKey && safeLookup(t?.systems?.headlineMetricsMap, metricKey)) ||
                localizeText(project.headlineMetric, lang);
              const visualCount =
                project.processVisual === undefined && Array.isArray(project.processVisuals)
                  ? project.processVisuals.filter(
                      (v) => isPlainObject(v) && typeof v.src === 'string' && v.src.trim()
                    ).length
                  : 0;
              const visualSuffix =
                visualCount > 0
                  ? ` ${(localizeText(t?.systems?.visualCountLabel, lang) || '({count} Visuals)').replace('{count}', String(visualCount))}`
                  : '';

              return (
                <article
                  key={projectId}
                  data-project-id={projectId}
                  className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-4 min-w-0 hover:border-emerald-400/50 transition-colors"
                >
                  <div className="space-y-3.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-xs font-bold text-emerald-300">
                        {displayId}
                      </span>
                      <span className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 font-mono text-[11px] text-cyan-300">
                        {stageCode} · {localizeText(project.funnelStageName, lang)}
                      </span>
                      {translatedStatus ? (
                        <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                          {translatedStatus}
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-mono text-slate-400">{translatedCategory}</p>
                      <h3 className="text-lg font-display font-bold text-white leading-snug break-words">
                        {localizeText(project.title, lang)}
                      </h3>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                      <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                        {localizeText(t?.systems?.headlineMetricLabel, lang)}
                      </p>
                      <p className="text-sm font-mono font-semibold text-cyan-300 mt-0.5 break-words">
                        {translatedMetric}
                      </p>
                    </div>

                    {localizeText(project.businessObjective, lang) ? (
                      <div className="rounded-xl border border-emerald-400/25 bg-emerald-950/15 px-3 py-2.5 space-y-1">
                        <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-300">
                          {localizeText(t?.systems?.businessObjectiveLabel, lang) || 'Business Objective'}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">
                          {localizeText(project.businessObjective, lang)}
                        </p>
                      </div>
                    ) : null}

                    <div className="space-y-2 text-xs sm:text-sm text-slate-300">
                      <div>
                        <span className="font-semibold text-slate-200">
                          {localizeText(t?.systems?.commercialLeakLabel, lang)}:{' '}
                        </span>
                        <span className="text-slate-300">
                          {localizeText(project.commercialLeak, lang)}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-emerald-300">
                          {localizeText(t?.systems?.outcomeLabel, lang)}:{' '}
                        </span>
                        <span className="text-slate-200">
                          {localizeText(project.validatedOutcome, lang)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(Array.isArray(project.stack) ? project.stack : []).map((tech, techIdx) => {
                        const techLabel = localizeText(tech, lang);
                        if (!techLabel) return null;
                        return (
                          <span
                            key={`${projectId}-tech-${techIdx + 1}-${techLabel}`}
                            className="rounded-md border border-slate-700/80 bg-slate-950/80 px-2 py-0.5 font-mono text-[11px] text-slate-300"
                          >
                            {techLabel}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => onSelectProject(selectKey)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400 hover:text-slate-950"
                    >
                      <span>
                        {(localizeText(t?.systems?.inspectButton, lang) ||
                          'Inspect 5-Node Architecture') + visualSuffix}
                      </span>
                      <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
