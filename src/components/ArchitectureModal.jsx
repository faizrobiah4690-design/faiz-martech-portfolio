import { useEffect, useRef, useState } from 'react';
import {
  Calculator,
  ChevronLeft,
  ChevronRight,
  Code2,
  Cpu,
  ExternalLink,
  Images,
  X
} from 'lucide-react';
import { localizeText, safeLookup } from '../utils/i18n.js';
import { isSafeExternalUrl, normalizeExternalUrl } from '../utils/urlSafety.js';
import AssetSlot from './AssetSlot.jsx';

function isPlainObject(v) {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v));
}

export default function ArchitectureModal({ project, lang, t, onClose }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const backdropMouseDownRef = useRef(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    setActiveSlideIndex(0);
  }, [project?.id]);

  useEffect(() => {
    if (!project || typeof document === 'undefined') return undefined;

    const previouslyFocused = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) {
          event.preventDefault();
          dialogRef.current.focus();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;

        if (!dialogRef.current.contains(active) || active === dialogRef.current) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
          return;
        }

        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [project, onClose]);

  if (!isPlainObject(project)) return null;

  const projectId =
    typeof project.id === 'string'
      ? project.id.trim()
      : typeof project.id === 'number'
        ? String(project.id)
        : '';
  const stageCode =
    typeof project.stageCode === 'string' || typeof project.stageCode === 'number'
      ? String(project.stageCode).trim()
      : '';

  const pipelineNodes = Array.isArray(project.pipelineNodes) ? project.pipelineNodes : [];
  const formulas = (
    Array.isArray(t?.modal?.deterministicFormulas) ? t.modal.deterministicFormulas : []
  ).filter(isPlainObject);

  const statusKey =
    typeof project.statusBadge === 'string' ? project.statusBadge.trim() : '';
  const translatedStatus =
    (statusKey && safeLookup(t?.statusBadges, statusKey)) ||
    localizeText(project.statusBadge, lang);
  const safeRepo = normalizeExternalUrl(project.repoUrl);
  const safeLooker = normalizeExternalUrl(project.lookerUrl);
  const safeLive = normalizeExternalUrl(project.liveAppUrl);

  const rawVisual = project.processVisual;
  const processVisualDefaultTitle = localizeText(t?.modal?.processVisualTitle, lang);
  const visualConfig =
    typeof rawVisual === 'string'
      ? { src: rawVisual, title: processVisualDefaultTitle }
      : isPlainObject(rawVisual)
        ? {
            src: typeof rawVisual.src === 'string' ? rawVisual.src : '',
            title:
              localizeText(rawVisual.caption || rawVisual.alt, lang) ||
              processVisualDefaultTitle
          }
        : null;
  const galleryVisuals =
    rawVisual !== undefined
      ? []
      : (Array.isArray(project.processVisuals) ? project.processVisuals : [])
          .filter((item) => isPlainObject(item) && typeof item.src === 'string' && item.src.trim())
          .map((item, idx) => ({
            stage:
              typeof item.stage === 'string' && item.stage.trim()
                ? item.stage.trim()
                : String(idx + 1).padStart(2, '0'),
            src: item.src.trim(),
            caption:
              localizeText(item.caption || item.alt, lang) ||
              `${processVisualDefaultTitle} #${idx + 1}`
          }));
  const clampedSlideIndex =
    galleryVisuals.length > 0
      ? Math.min(activeSlideIndex, galleryVisuals.length - 1)
      : 0;
  const activeVisual = galleryVisuals[clampedSlideIndex] || null;
  const isBm = lang === 'bm';
  const safeProjectSlug =
    (projectId || 'project')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'project';
  const expectedVisualHint = `/assets/${safeProjectSlug}-architecture.png`;

  return (
    <div
      onMouseDown={(e) => {
        backdropMouseDownRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && backdropMouseDownRef.current) {
          onClose();
        }
        backdropMouseDownRef.current = false;
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="arch-modal-title"
        aria-describedby="arch-modal-desc"
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-6 md:p-8 shadow-2xl min-w-0 space-y-6 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {projectId ? (
                <span className="rounded-md bg-emerald-400/15 border border-emerald-400/40 px-2 py-0.5 font-mono text-xs font-bold text-emerald-300">
                  {projectId}
                </span>
              ) : null}
              <span className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 font-mono text-xs text-cyan-300">
                {localizeText(t?.modal?.stagePrefix, lang) || 'Stage'} {stageCode} ·{' '}
                {localizeText(project.funnelStageName, lang)}
              </span>
              {translatedStatus ? (
                <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-200">
                  {translatedStatus}
                </span>
              ) : null}
            </div>

            <h2
              id="arch-modal-title"
              className="text-xl sm:text-2xl font-display font-bold text-white leading-snug break-words"
            >
              {localizeText(project.title, lang)}
            </h2>
            <p className="text-xs text-slate-400 font-mono">{localizeText(t?.modal?.escHint, lang)}</p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={localizeText(t?.modal?.close, lang) || 'Close modal'}
            className="shrink-0 inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-950/80 p-2 text-slate-300 hover:border-emerald-400/60 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400">
            {localizeText(t?.modal?.pipelineTitle, lang) || '5-Node Data Flow Pipeline'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
            {pipelineNodes.map((node, index) => (
              <div
                key={`${projectId || 'project'}-node-${index + 1}`}
                data-pipeline-node={index + 1}
                className="relative rounded-xl border border-slate-700/90 bg-slate-950/80 p-3 flex flex-col justify-between gap-1.5 min-w-0"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-xs font-bold text-cyan-400">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {index < pipelineNodes.length - 1 ? (
                    <ChevronRight
                      className="hidden sm:block h-3.5 w-3.5 text-slate-500"
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
                <p className="text-xs font-medium text-slate-100 leading-snug break-words">
                  {localizeText(node, lang)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-1.5">
          <h3 className="text-xs font-mono uppercase tracking-wider text-amber-300">
            {localizeText(t?.modal?.commercialLeakTitle, lang)}
          </h3>
          <p id="arch-modal-desc" className="text-sm text-slate-200 leading-relaxed">
            {localizeText(project.commercialLeak, lang)}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-cyan-400/40 bg-cyan-950/20 p-4 space-y-2 min-w-0">
            <div className="flex items-center gap-2 text-cyan-300">
              <Calculator className="h-4 w-4 shrink-0" aria-hidden="true" />
              <h3 className="text-sm font-display font-bold">
                {localizeText(t?.modal?.deterministicTitle, lang)}
              </h3>
            </div>
            <p className="text-xs text-cyan-200/80">
              {localizeText(t?.modal?.deterministicSubtitle, lang)}
            </p>
            <p className="text-sm text-slate-100 leading-relaxed pt-1">
              {localizeText(project.deterministicGate, lang)}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-400/40 bg-emerald-950/20 p-4 space-y-2 min-w-0">
            <div className="flex items-center gap-2 text-emerald-300">
              <Cpu className="h-4 w-4 shrink-0" aria-hidden="true" />
              <h3 className="text-sm font-display font-bold">
                {localizeText(t?.modal?.boundedAiTitle, lang)}
              </h3>
            </div>
            <p className="text-xs text-emerald-200/80">
              {localizeText(t?.modal?.boundedAiSubtitle, lang)}
            </p>
            <p className="text-sm text-slate-100 leading-relaxed pt-1">
              {localizeText(project.boundedAiRole, lang)}
            </p>
          </div>
        </div>

        {formulas.length > 0 ? (
          <div className="space-y-2.5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300">
              {localizeText(t?.modal?.formulasTitle, lang)}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {formulas.map((item, idx) => {
                const formulaName = localizeText(item.name, lang);
                return (
                  <div
                    key={formulaName || `formula-${idx}`}
                    className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-1.5 min-w-0"
                  >
                    <p className="text-xs font-semibold text-emerald-300">{formulaName}</p>
                    <pre className="overflow-x-auto rounded-lg bg-slate-900 px-2.5 py-2 font-mono text-xs text-cyan-300 whitespace-pre-wrap break-words">
                      <code>{localizeText(item.formula, lang)}</code>
                    </pre>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {localizeText(item.note, lang)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-emerald-400/30 bg-emerald-950/15 p-4 space-y-1">
          <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-300">
            {localizeText(t?.modal?.validatedOutcomeTitle, lang)}
          </h3>
          <p className="text-sm font-medium text-white leading-relaxed">
            {localizeText(project.validatedOutcome, lang)}
          </p>
        </div>

        <div className="space-y-3" data-testid="process-visuals-section">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Images className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden="true" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300">
                {processVisualDefaultTitle}
              </h3>
              {galleryVisuals.length > 0 ? (
                <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-cyan-300">
                  {String(clampedSlideIndex + 1).padStart(2, '0')} /{' '}
                  {String(galleryVisuals.length).padStart(2, '0')}
                </span>
              ) : null}
            </div>

            {galleryVisuals.length > 1 ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setActiveSlideIndex((prev) =>
                      prev <= 0 ? galleryVisuals.length - 1 : prev - 1
                    )
                  }
                  aria-label={isBm ? 'Slaid sebelumnya' : 'Previous slide'}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400/60 hover:text-cyan-200 transition"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">{isBm ? 'Sebelum' : 'Prev'}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveSlideIndex((prev) => (prev + 1) % galleryVisuals.length)
                  }
                  aria-label={isBm ? 'Slaid seterusnya' : 'Next slide'}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400/60 hover:text-cyan-200 transition"
                >
                  <span className="hidden sm:inline">{isBm ? 'Seterusnya' : 'Next'}</span>
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>

          {activeVisual ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
                <p className="text-xs sm:text-sm font-medium text-slate-100">
                  <span className="font-mono text-cyan-400 mr-2">
                    {isBm ? 'Slaid' : 'Slide'} {activeVisual.stage}
                  </span>
                  {activeVisual.caption}
                </p>
                <a
                  href={activeVisual.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-mono text-emerald-300 hover:text-emerald-200 shrink-0"
                >
                  <span>{isBm ? 'Buka Penuh' : 'Open Full'}</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>

              <AssetSlot
                key={activeVisual.src}
                kind="image"
                src={activeVisual.src}
                title={activeVisual.caption}
                expectedPathHint={activeVisual.src}
                unavailableLabel={localizeText(t?.assets?.processVisualPendingNote, lang)}
                lang={lang}
                t={t}
              />

              {galleryVisuals.length > 1 ? (
                <div
                  className="flex flex-wrap gap-1.5"
                  role="tablist"
                  aria-label={isBm ? 'Pilihan slaid peringkat proses' : 'Process stage slide selector'}
                >
                  {galleryVisuals.map((item, idx) => {
                    const isSelected = idx === clampedSlideIndex;
                    return (
                      <button
                        key={item.src}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        onClick={() => setActiveSlideIndex(idx)}
                        className={`rounded-lg border px-2.5 py-1.5 font-mono text-xs transition ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-400/15 text-cyan-200 font-semibold'
                            : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                        }`}
                        title={item.caption}
                      >
                        {item.stage}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : (
            <AssetSlot
              kind="image"
              src={visualConfig?.src || ''}
              title={visualConfig?.title || localizeText(t?.assets?.processVisualSlotTitle, lang)}
              expectedPathHint={expectedVisualHint}
              unavailableLabel={localizeText(t?.assets?.processVisualPendingNote, lang)}
              lang={lang}
              t={t}
            />
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
            {localizeText(t?.modal?.stackTitle, lang)}
          </h3>
          <div className="flex flex-wrap gap-2">
            {(Array.isArray(project.stack) ? project.stack : []).map((tech, techIdx) => {
              const techLabel = localizeText(tech, lang);
              if (!techLabel) return null;
              return (
                <span
                  key={`${projectId || 'project'}-tech-${techIdx + 1}-${techLabel}`}
                  className="rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1 font-mono text-xs text-slate-200"
                >
                  {techLabel}
                </span>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-800 pt-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
            {localizeText(t?.modal?.linksTitle, lang)}
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            {isSafeExternalUrl(safeRepo) ? (
              <a
                href={safeRepo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-xs sm:text-sm font-semibold text-emerald-300 hover:bg-emerald-400 hover:text-slate-950 transition"
              >
                <Code2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{localizeText(t?.modal?.repoButton, lang)}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </a>
            ) : null}

            {isSafeExternalUrl(safeLooker) ? (
              <a
                href={safeLooker}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-xs sm:text-sm font-semibold text-cyan-300 hover:bg-cyan-400 hover:text-slate-950 transition"
              >
                <span>{localizeText(t?.modal?.lookerButton, lang)}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              <span className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs font-mono text-slate-400">
                {localizeText(t?.modal?.lookerButton, lang)}:{' '}
                {localizeText(t?.modal?.pendingAdapterBadge, lang)}
              </span>
            )}

            {isSafeExternalUrl(safeLive) ? (
              <a
                href={safeLive}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-xs sm:text-sm font-semibold text-cyan-300 hover:bg-cyan-400 hover:text-slate-950 transition"
              >
                <span>{localizeText(t?.modal?.liveAppButton, lang)}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              <span className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs font-mono text-slate-400">
                {localizeText(t?.modal?.liveAppButton, lang)}:{' '}
                {localizeText(t?.modal?.pendingAdapterBadge, lang)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
