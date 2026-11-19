import { useEffect, useState } from 'react';
import { Download, EyeOff, FileText, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import { localizeText, normalizeLang } from '../utils/i18n.js';
import { isSafeExternalUrl, normalizeExternalUrl } from '../utils/urlSafety.js';

const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/;
const SAFE_LOCAL_ASSET_PATH_RE = /^\/(?![/\\])[^\s\\]*$/;
const DOT_SEGMENT_RE = /(?:^|\/)\.\.?(?:\/|$)/;
const ENCODED_TRAVERSAL_RE = /%(?:2e|2f|5c)/i;
const VITE_INTERNAL_PREFIX_RE = /^\/@(?:fs|id)(?:\/|$)/i;

function sanitizeAssetPath(value) {
  if (typeof value !== 'string') return '';
  if (CONTROL_CHARS_RE.test(value)) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (SAFE_LOCAL_ASSET_PATH_RE.test(trimmed)) {
    if (
      DOT_SEGMENT_RE.test(trimmed) ||
      ENCODED_TRAVERSAL_RE.test(trimmed) ||
      VITE_INTERNAL_PREFIX_RE.test(trimmed)
    ) {
      return '';
    }
    try {
      const parsed = new URL(trimmed, 'https://asset.invalid');
      if (parsed.origin !== 'https://asset.invalid') return '';
      if (parsed.pathname + parsed.search + parsed.hash !== trimmed) return '';
      const decodedPathname = decodeURIComponent(parsed.pathname);
      if (
        CONTROL_CHARS_RE.test(decodedPathname) ||
        decodedPathname.includes('\\') ||
        DOT_SEGMENT_RE.test(decodedPathname) ||
        ENCODED_TRAVERSAL_RE.test(decodedPathname) ||
        VITE_INTERNAL_PREFIX_RE.test(decodedPathname)
      ) {
        return '';
      }
      return trimmed;
    } catch {
      return '';
    }
  }
  if (/^https:\/\//i.test(trimmed)) {
    const normalized = normalizeExternalUrl(trimmed);
    if (normalized.startsWith('https://') && isSafeExternalUrl(normalized)) {
      return normalized;
    }
  }
  return '';
}

export default function AssetSlot({
  src = '',
  kind = 'image',
  title = '',
  expectedPathHint = '',
  isNricProtected = false,
  privacyNotice = '',
  variant = 'card',
  downloadLabel = '',
  unavailableLabel = '',
  lang = 'en',
  t = {}
}) {
  const isBm = normalizeLang(lang) === 'bm';
  const safeSrc = sanitizeAssetPath(src);
  const safeHint = sanitizeAssetPath(expectedPathHint);
  const displayPath = safeSrc || safeHint || '';
  const safeTitle = localizeText(title, lang);
  const safeDownloadLabel = localizeText(downloadLabel, lang);
  const safeUnavailableLabel = localizeText(unavailableLabel, lang);
  const safePrivacyNotice = localizeText(privacyNotice, lang);
  const safeDropInHint = localizeText(t?.assets?.dropInHint, lang);
  const safeCtaResume = localizeText(t?.hero?.ctaResume, lang);
  const safeResumeUnavailable = localizeText(t?.hero?.resumeUnavailable, lang);
  const safePlaceholderBadge = localizeText(t?.assets?.placeholderBadge, lang);
  const safeExpectedPathLabel = localizeText(t?.assets?.expectedPathLabel, lang);

  const [status, setStatus] = useState(safeSrc ? 'checking' : 'missing');
  const [showResumeSlotDetails, setShowResumeSlotDetails] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !safeSrc) {
      setStatus('missing');
      return undefined;
    }

    let cancelled = false;

    if (kind === 'pdf') {
      setStatus('checking');
      if (typeof fetch !== 'function') {
        setStatus('missing');
        return undefined;
      }

      const controller = new AbortController();
      fetch(safeSrc, { method: 'HEAD', signal: controller.signal })
        .then((res) => {
          if (cancelled) return;
          const contentType = (res.headers.get('content-type') || '').toLowerCase();
          const isValidPdf =
            res.ok && contentType.includes('pdf') && !contentType.includes('text/html');
          setStatus(isValidPdf ? 'ready' : 'missing');
        })
        .catch(() => {
          if (!cancelled) setStatus('missing');
        });

      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    setStatus('checking');
    const probeImg = new window.Image();
    probeImg.onload = () => {
      if (!cancelled) {
        setStatus(probeImg.naturalWidth > 0 ? 'ready' : 'missing');
      }
    };
    probeImg.onerror = () => {
      if (!cancelled) {
        setStatus('missing');
      }
    };
    probeImg.src = safeSrc;

    return () => {
      cancelled = true;
      probeImg.onload = null;
      probeImg.onerror = null;
    };
  }, [safeSrc, kind]);

  if (variant === 'button' && kind === 'pdf') {
    if (status === 'ready' && safeSrc) {
      return (
        <a
          href={safeSrc}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
        >
          <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {safeDownloadLabel ||
              safeCtaResume ||
              (isBm ? 'Muat Turun Resume (PDF)' : 'Download Resume (PDF)')}
          </span>
        </a>
      );
    }

    return (
      <div className="inline-flex flex-col items-start gap-1.5 min-w-0 max-w-full">
        <button
          type="button"
          onClick={() => setShowResumeSlotDetails((prev) => !prev)}
          aria-expanded={showResumeSlotDetails}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-900/90 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-200"
        >
          <FileText className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
          <span>
            {safeUnavailableLabel ||
              safeResumeUnavailable ||
              (isBm ? 'Slot PDF Resume Sedia' : 'Resume PDF Slot Ready')}
          </span>
        </button>
        <div className="text-xs text-slate-400 font-mono break-all" data-asset-slot={displayPath}>
          <code>{displayPath}</code>
        </div>
        {showResumeSlotDetails ? (
          <p className="text-xs text-slate-300 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 max-w-sm">
            {safeDropInHint ||
              (isBm
                ? 'Letakkan fail aset sah ke dalam public/assets/ untuk paparan automatik tanpa suntingan kod.'
                : 'Place verified asset in public/assets/ to render automatically without code changes.')}
          </p>
        ) : null}
      </div>
    );
  }

  const shieldNotice = safePrivacyNotice || localizeText(t?.assets?.nricMaskNotice, lang);

  if (status === 'ready' && kind === 'pdf' && safeSrc) {
    return (
      <div
        className="min-h-[140px] w-full rounded-xl border border-cyan-400/40 bg-slate-950/70 p-4 sm:p-5 flex flex-col justify-between gap-3 min-w-0"
        data-asset-slot={displayPath}
        data-asset-status="ready"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-cyan-300">
            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>PDF</span>
          </span>
          {isNricProtected ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 font-mono text-[11px] text-emerald-300">
              <EyeOff className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{isBm ? 'Perisai PDPA 2024' : 'PDPA 2024 Shield'}</span>
            </span>
          ) : null}
        </div>
        {safeTitle ? <p className="text-sm font-semibold text-slate-100 break-words">{safeTitle}</p> : null}
        <div>
          <a
            href={safeSrc}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {safeDownloadLabel ||
                safeCtaResume ||
                (isBm ? 'Muat Turun Resume (PDF)' : 'Download Resume (PDF)')}
            </span>
          </a>
        </div>
        {isNricProtected && shieldNotice ? (
          <div className="rounded-lg border border-amber-400/30 bg-amber-950/25 px-3 py-2 text-xs text-amber-200 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" aria-hidden="true" />
            <span className="leading-relaxed">{shieldNotice}</span>
          </div>
        ) : null}
      </div>
    );
  }

  if (status === 'ready' && kind === 'image' && safeSrc) {
    return (
      <div
        className="space-y-2.5 min-w-0"
        data-asset-slot={displayPath}
        data-asset-status="ready"
      >
        <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950/90">
          <img
            src={safeSrc}
            alt={safeTitle}
            loading="lazy"
            onError={() => setStatus('missing')}
            onLoad={(e) => {
              if (e.currentTarget.naturalWidth === 0) {
                setStatus('missing');
              }
            }}
            className="w-full h-auto max-h-[460px] object-contain mx-auto bg-slate-950"
          />
          {isNricProtected && shieldNotice ? (
            <div className="border-t border-emerald-400/30 bg-slate-950/90 px-3 py-2 text-xs text-emerald-200 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" aria-hidden="true" />
              <span>{shieldNotice}</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[140px] w-full rounded-xl border border-dashed border-slate-700 bg-slate-950/70 p-4 sm:p-5 flex flex-col justify-between gap-3 min-w-0"
      data-asset-slot={displayPath}
      data-asset-status="fallback"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-cyan-300">
          {kind === 'pdf' ? (
            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          <span>{safePlaceholderBadge || (isBm ? 'Slot Aset Sedia' : 'Asset Slot Ready')}</span>
        </span>
        {isNricProtected ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 font-mono text-[11px] text-emerald-300">
            <EyeOff className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{isBm ? 'Perisai PDPA 2024' : 'PDPA 2024 Shield'}</span>
          </span>
        ) : null}
      </div>

      <div className="space-y-1 min-w-0">
        {safeTitle ? <p className="text-sm font-semibold text-slate-200 break-words">{safeTitle}</p> : null}
        {displayPath ? (
          <p className="text-xs text-slate-400 break-words">
            <span className="mr-1.5">
              {safeExpectedPathLabel || (isBm ? 'Laluan Aset Dijangka' : 'Expected Asset Path')}:
            </span>
            <code className="font-mono text-cyan-300 break-all">{displayPath}</code>
          </p>
        ) : null}
        <p className="text-xs text-slate-400 leading-relaxed">
          {safeUnavailableLabel ||
            safeDropInHint ||
            (isBm
              ? 'Letakkan fail aset sah ke dalam public/assets/ untuk paparan automatik tanpa suntingan kod.'
              : 'Place verified asset in public/assets/ to render automatically without code changes.')}
        </p>
      </div>

      {isNricProtected && shieldNotice ? (
        <div className="rounded-lg border border-amber-400/30 bg-amber-950/25 px-3 py-2 text-xs text-amber-200 flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" aria-hidden="true" />
          <span className="leading-relaxed">{shieldNotice}</span>
        </div>
      ) : null}
    </div>
  );
}
