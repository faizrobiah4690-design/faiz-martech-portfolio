import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { localize, localizeText, safeLookup } from '../utils/i18n.js';
import AssetSlot from './AssetSlot.jsx';

function isPlainObject(v) {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v));
}

export default function LocalCaseStudies({ caseStudies, lang, t }) {
  const safeCases = (Array.isArray(caseStudies) ? caseStudies : []).filter(isPlainObject);

  return (
    <section id="case-studies" className="border-b border-slate-800/80 py-14 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-2 max-w-3xl mb-6">
          <p className="font-mono text-xs uppercase tracking-wider text-cyan-400">
            {localizeText(t?.caseStudies?.eyebrow, lang)}
          </p>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
            {localizeText(t?.caseStudies?.heading, lang)}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            {localizeText(t?.caseStudies?.subtitle, lang)}
          </p>
        </div>

        <div className="rounded-xl border border-amber-400/30 bg-amber-950/20 px-4 py-3 text-xs sm:text-sm text-amber-200 flex items-start gap-2.5 mb-8">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">{localizeText(t?.caseStudies?.attributionNotice, lang)}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {safeCases.map((cs, caseIndex) => {
            const caseId =
              typeof cs.id === 'string' || typeof cs.id === 'number'
                ? String(cs.id).trim() || `cs-${caseIndex + 1}`
                : `cs-${caseIndex + 1}`;
            const periodKey = typeof cs.period === 'string' ? cs.period.trim() : '';
            const periodText =
              (periodKey && safeLookup(t?.caseStudies?.periods, periodKey)) ||
              localizeText(cs.period, lang);
            const clientKey = typeof cs.client === 'string' ? cs.client.trim() : '';
            const clientText =
              (clientKey && safeLookup(t?.caseStudies?.clients, clientKey)) ||
              localizeText(cs.client, lang);
            const sectorKey = typeof cs.sector === 'string' ? cs.sector.trim() : '';
            const sectorText =
              (sectorKey && safeLookup(t?.caseStudies?.sectors, sectorKey)) ||
              localizeText(cs.sector, lang);
            const deliverables = localize(cs.workDelivered, lang);
            const items = Array.isArray(deliverables)
              ? deliverables.map((entry) => localizeText(entry, lang)).filter(Boolean)
              : [];

            return (
              <article
                key={caseId}
                data-case-id={caseId}
                className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-5 min-w-0"
              >
                <div className="space-y-4 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-md bg-cyan-400/15 border border-cyan-400/30 px-2.5 py-0.5 font-mono text-xs font-bold text-cyan-300">
                      {caseId}
                    </span>
                    <span className="font-mono text-xs text-slate-400">{periodText}</span>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-display font-bold text-white break-words">
                      {clientText}
                    </h3>
                    <p className="text-xs font-medium text-emerald-300 break-words">
                      {sectorText}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                      {localizeText(t?.caseStudies?.focusLabel, lang)}
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-slate-100 mt-1">
                      {localizeText(cs.focus, lang)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-mono uppercase tracking-wider text-slate-400">
                      {localizeText(t?.caseStudies?.deliverablesLabel, lang)}
                    </p>
                    <ul className="space-y-2">
                      {items.map((entry, idx) => (
                        <li
                          key={`${caseId}-item-${idx + 1}`}
                          className="flex items-start gap-2 text-xs sm:text-sm text-slate-300 leading-relaxed"
                        >
                          <CheckCircle2
                            className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5"
                            aria-hidden="true"
                          />
                          <span>{entry}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-4 min-w-0">
                  {localizeText(cs.whyItMatters, lang) ? (
                    <div className="rounded-xl border border-cyan-400/25 bg-cyan-950/20 p-3 space-y-1">
                      <p className="text-[11px] font-mono uppercase tracking-wider text-cyan-300">
                        {localizeText(t?.caseStudies?.whyItMattersLabel, lang) ||
                          'Funnel & MarTech Connection'}
                      </p>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {localizeText(cs.whyItMatters, lang)}
                      </p>
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-amber-400/25 bg-amber-950/15 p-3 space-y-1">
                    <p className="text-[11px] font-mono uppercase tracking-wider text-amber-300">
                      {localizeText(t?.caseStudies?.evidenceBoundaryLabel, lang)}
                    </p>
                    <p className="text-xs text-amber-100/90 leading-relaxed">
                      {localizeText(cs.evidenceBoundary, lang)}
                    </p>
                  </div>

                  {typeof cs.evidenceImage === 'string' && cs.evidenceImage.trim() ? (
                    <AssetSlot
                      kind="image"
                      src={cs.evidenceImage}
                      title={
                        localizeText(t?.caseStudies?.visualEvidenceLabel, lang) ||
                        'Campaign & Visual Evidence'
                      }
                      lang={lang}
                      t={t}
                    />
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
