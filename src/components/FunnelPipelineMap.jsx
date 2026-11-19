import { CheckCircle2, Filter } from 'lucide-react';
import { localizeText } from '../utils/i18n.js';

function isPlainObject(v) {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v));
}

export default function FunnelPipelineMap({
  lang,
  t,
  metrics,
  selectedStage,
  onSelectStage
}) {
  const stageCounts = (Array.isArray(metrics?.stageCounts) ? metrics.stageCounts : []).filter(
    isPlainObject
  );
  const allStagesLabel = (localizeText(t?.funnel?.allStages, lang) || 'All Stages ({count})').replace(
    '{count}',
    String(metrics?.totalSystems ?? 0)
  );
  const stagesMap = isPlainObject(t?.funnel?.stages) ? t.funnel.stages : null;

  return (
    <section id="funnel" className="scroll-mt-20 border-b border-slate-800/80 py-14 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div className="space-y-2 max-w-3xl min-w-0">
            <p className="font-mono text-xs uppercase tracking-wider text-cyan-400">
              {localizeText(t?.funnel?.eyebrow, lang)}
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
              {localizeText(t?.funnel?.heading, lang)}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {localizeText(t?.funnel?.subtitle, lang)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onSelectStage('ALL')}
            aria-pressed={selectedStage === 'ALL'}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-mono font-semibold transition self-start md:self-auto shrink-0 ${
              selectedStage === 'ALL'
                ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300'
                : 'border-slate-700 bg-slate-900/80 text-slate-200 hover:border-cyan-400/50 hover:text-cyan-200'
            }`}
          >
            <Filter className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{allStagesLabel}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {stageCounts.map((stage, idx) => {
            const stageCode = localizeText(stage.code, lang) || `0${idx + 1}`;
            const isSelected = selectedStage === stageCode;
            const stageEntry =
              stagesMap &&
              Object.hasOwn(stagesMap, stageCode) &&
              isPlainObject(stagesMap[stageCode])
                ? stagesMap[stageCode]
                : null;
            const stageName = localizeText(stageEntry?.name, lang) || localizeText(stage, lang);
            const stageDesc = localizeText(stageEntry?.description, lang);
            const countNum = typeof stage.count === 'number' ? stage.count : 0;
            const countTemplate =
              countNum === 1
                ? localizeText(t?.funnel?.stageCountSingle, lang) || '{count} System'
                : localizeText(t?.funnel?.stageCount, lang) || '{count} Systems';
            const countText = countTemplate.replace('{count}', String(countNum));

            return (
              <button
                key={stageCode}
                type="button"
                onClick={() => onSelectStage(stageCode)}
                aria-pressed={isSelected}
                data-funnel-stage={stageCode}
                className={`min-h-[44px] text-left rounded-2xl border p-4 transition flex flex-col justify-between gap-3 min-w-0 ${
                  isSelected
                    ? 'border-emerald-400 bg-emerald-950/30 ring-1 ring-emerald-400/50'
                    : 'border-slate-800 bg-slate-900/80 hover:border-cyan-400/50 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="font-mono text-xs font-bold text-cyan-400">
                    {stageCode}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                      isSelected
                        ? 'bg-emerald-400 text-slate-950'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    {isSelected ? (
                      <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                    ) : null}
                    <span>{countText}</span>
                  </span>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <h3 className="text-sm sm:text-base font-display font-bold text-white break-words">
                    {stageName}
                  </h3>
                  {stageDesc ? (
                    <p className="text-xs text-slate-400 leading-relaxed break-words">
                      {stageDesc}
                    </p>
                  ) : null}
                </div>

                <span
                  className={`text-[11px] font-mono font-semibold ${
                    isSelected ? 'text-emerald-300' : 'text-cyan-400'
                  }`}
                >
                  {isSelected
                    ? localizeText(t?.funnel?.activeFilterCue, lang) || 'Active Filter ✓'
                    : localizeText(t?.funnel?.filterCue, lang) || 'Filter Stage ->'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
