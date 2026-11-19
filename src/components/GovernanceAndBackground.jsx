import { useState } from 'react';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import { localizeText } from '../utils/i18n.js';

function isPlainObject(v) {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v));
}

function getOpsId(item, index) {
  if (item && (typeof item.id === 'string' || typeof item.id === 'number')) {
    const val = String(item.id).trim();
    if (val) return val;
  }
  return `ops-${index + 1}`;
}

export default function GovernanceAndBackground({ operationalHistory, lang, t }) {
  const safeHistory = (Array.isArray(operationalHistory) ? operationalHistory : []).filter(
    isPlainObject
  );
  const nonNegotiables = (
    Array.isArray(t?.governance?.engineeringNonNegotiables)
      ? t.governance.engineeringNonNegotiables
      : []
  ).filter(isPlainObject);

  const [collapsedIds, setCollapsedIds] = useState(() => new Set());

  const toggleItem = (id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <section id="governance" className="border-b border-slate-800/80 py-14 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="space-y-2 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-wider text-cyan-400">
            {localizeText(t?.governance?.eyebrow, lang)}
          </p>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
            {localizeText(t?.governance?.heading, lang)}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            {localizeText(t?.governance?.subtitle, lang)}
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-display font-bold text-white">
            {localizeText(t?.governance?.nonNegotiablesTitle, lang)}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {nonNegotiables.map((rule, idx) => {
              const ruleCode = localizeText(rule.code, lang) || String(idx + 1).padStart(2, '0');
              return (
                <div
                  key={ruleCode}
                  className="glass-card rounded-2xl p-5 space-y-2 min-w-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-emerald-400/15 border border-emerald-400/30 px-2 py-0.5 font-mono text-xs font-bold text-emerald-300">
                      {ruleCode}
                    </span>
                    <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
                    <h4 className="text-sm sm:text-base font-display font-bold text-white break-words">
                      {localizeText(rule.title, lang)}
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {localizeText(rule.description, lang)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-display font-bold text-white">
            {localizeText(t?.governance?.timelineTitle, lang)}
          </h3>

          <div className="space-y-3">
            {safeHistory.map((item, idx) => {
              const itemId = getOpsId(item, idx);
              const isExpanded = !collapsedIds.has(itemId);
              const panelId = `ops-panel-${itemId}`;

              return (
                <div
                  key={itemId}
                  data-ops-id={itemId}
                  className="glass-card rounded-2xl overflow-hidden min-w-0"
                >
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    onClick={() => toggleItem(itemId)}
                    className="w-full text-left px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-900/90 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400">
                          {itemId}
                        </span>
                        <span className="font-mono text-xs text-slate-400">
                          {localizeText(item.period, lang)}
                        </span>
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                          {localizeText(item.domainTag, lang)}
                        </span>
                      </div>
                      <p className="text-base font-display font-bold text-white break-words">
                        {localizeText(item.role, lang)} —{' '}
                        <span className="text-cyan-300">{localizeText(item.organization, lang)}</span>
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 shrink-0">
                      <span>{localizeText(t?.governance?.expandHint, lang)}</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          isExpanded ? 'rotate-180 text-emerald-400' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </span>
                  </button>

                  <div
                    id={panelId}
                    hidden={!isExpanded}
                    className="border-t border-slate-800/80 px-5 py-4 bg-slate-950/50 grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                        {localizeText(t?.governance?.summaryLabel, lang)}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                        {localizeText(item.summary, lang)}
                      </p>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                        {localizeText(t?.governance?.transferLabel, lang)}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                        {localizeText(item.martechTransfer, lang)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
