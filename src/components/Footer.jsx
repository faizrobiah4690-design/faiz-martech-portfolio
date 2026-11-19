import { useEffect, useRef, useState } from 'react';
import {
  Briefcase,
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Mail,
  MessageCircle,
  ShieldCheck
} from 'lucide-react';
import {
  buildSanitizedPortfolioExport,
  downloadPortfolioJson
} from '../utils/exportPortfolioJson.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { localizeText } from '../utils/i18n.js';
import { isSafeExternalUrl, normalizeExternalUrl } from '../utils/urlSafety.js';

function isPlainObject(v) {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v));
}

export default function Footer({
  profile,
  projects,
  liveApps = [],
  caseStudies,
  credentials,
  operationalHistory,
  lang = 'en',
  t
}) {
  const [hasExported, setHasExported] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const copyTimerRef = useRef(null);
  const safeProfile = isPlainObject(profile) ? profile : {};
  const contacts = isPlainObject(safeProfile.contacts) ? safeProfile.contacts : {};

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const whatsappUrl = normalizeExternalUrl(contacts.whatsappUrl);
  const linkedinUrl = normalizeExternalUrl(contacts.linkedinUrl);
  const githubUrl = normalizeExternalUrl(contacts.githubUrl);
  const emailAddress = typeof contacts.email === 'string' ? contacts.email.trim() : '';
  const gmailSubject =
    localizeText(t?.hero?.gmailSubject, lang) || 'Portfolio Inquiry — Mohd Faiz Bin Md Nordin';
  const gmailComposeUrl = emailAddress
    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailAddress)}&su=${encodeURIComponent(gmailSubject)}`
    : '';
  const handleCopyEmail = () => {
    if (!emailAddress) return;
    copyToClipboard(emailAddress).then((copied) => {
      if (!copied) return;
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      setEmailCopied(true);
      copyTimerRef.current = setTimeout(() => {
        setEmailCopied(false);
        copyTimerRef.current = null;
      }, 2500);
    });
  };

  const identityParts = [
    localizeText(safeProfile.fullName, lang).trim(),
    localizeText(safeProfile.location, lang).trim()
  ].filter(Boolean);

  const handleExport = () => {
    const payload = buildSanitizedPortfolioExport({
      profile,
      projects,
      liveApps,
      caseStudies,
      credentials,
      operationalHistory
    });
    const ok = downloadPortfolioJson(payload);
    if (ok) {
      setHasExported(true);
    }
  };

  return (
    <footer className="bg-slate-950 py-12 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-4 min-w-0">
          <div className="space-y-1">
            <h2 className="text-lg font-display font-bold text-white">
              {localizeText(t?.footer?.contactHeading, lang) || 'Direct Contact & Verification'}
            </h2>
            {identityParts.length > 0 ? (
              <p className="text-sm text-slate-300">{identityParts.join(' · ')}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isSafeExternalUrl(whatsappUrl) ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-200 hover:border-emerald-400/50 hover:text-emerald-300"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>{localizeText(t?.hero?.ctaWhatsapp, lang) || 'WhatsApp'}</span>
                <ExternalLink className="h-3 w-3 text-slate-400 shrink-0" aria-hidden="true" />
              </a>
            ) : null}

            {isSafeExternalUrl(linkedinUrl) ? (
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-200 hover:border-cyan-400/50 hover:text-cyan-300"
              >
                <Briefcase className="h-3.5 w-3.5 text-cyan-400 shrink-0" aria-hidden="true" />
                <span>{localizeText(t?.hero?.ctaLinkedin, lang) || 'LinkedIn'}</span>
                <ExternalLink className="h-3 w-3 text-slate-400 shrink-0" aria-hidden="true" />
              </a>
            ) : null}

            {isSafeExternalUrl(githubUrl) ? (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-200 hover:border-emerald-400/50 hover:text-emerald-300"
              >
                <Code2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>{localizeText(t?.hero?.ctaGithub, lang) || 'GitHub'}</span>
                <ExternalLink className="h-3 w-3 text-slate-400 shrink-0" aria-hidden="true" />
              </a>
            ) : null}

            {gmailComposeUrl ? (
              <div className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-900/80 overflow-hidden">
                <a
                  href={gmailComposeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-amber-400/10 hover:text-amber-300 transition"
                  title={localizeText(t?.hero?.gmailComposeTitle, lang) || 'Compose email in Gmail'}
                >
                  <Mail className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                  <span>
                    {localizeText(contacts.email, lang) || localizeText(t?.hero?.ctaEmail, lang) || 'Email'}
                  </span>
                  <ExternalLink className="h-3 w-3 text-slate-400 shrink-0" aria-hidden="true" />
                </a>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  aria-label={localizeText(t?.hero?.copyEmailAria, lang) || 'Copy email address'}
                  className="inline-flex items-center gap-1 border-l border-slate-800 px-2 py-2 text-xs font-mono text-slate-400 hover:bg-slate-800/80 hover:text-emerald-300 transition"
                >
                  {emailCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                      <span className="text-emerald-300">
                        {localizeText(t?.hero?.copiedLabel, lang) || 'Copied'}
                      </span>
                    </>
                  ) : (
                    <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  )}
                </button>
                <span role="status" aria-live="polite" className="sr-only">
                  {emailCopied
                    ? localizeText(t?.hero?.emailCopiedAnnouncement, lang) ||
                      'Email address copied to clipboard.'
                    : ''}
                </span>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-emerald-400/25 bg-emerald-950/15 px-3.5 py-2.5 text-xs text-emerald-200 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">{localizeText(t?.footer?.pdpaStatement, lang)}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-400">{localizeText(t?.footer?.builtWith, lang)}</p>
            <a
              href="#top"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-mono font-medium text-slate-200 hover:border-emerald-400/50 hover:text-emerald-300 transition shrink-0"
            >
              {localizeText(t?.footer?.backToTop, lang) || 'Back to top ↑'}
            </a>
          </div>
        </div>

        <div className="lg:col-span-5 glass-card rounded-2xl p-5 space-y-3 min-w-0">
          <h3 className="text-base font-display font-bold text-white">
            {localizeText(t?.footer?.exportHeading, lang)}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {localizeText(t?.footer?.exportDescription, lang)}
          </p>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/15 px-4 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400 hover:text-slate-950"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{localizeText(t?.footer?.exportButton, lang)}</span>
          </button>
          <p role="status" aria-live="polite" className="text-xs font-mono text-emerald-400 min-h-[1rem]">
            {hasExported
              ? localizeText(t?.footer?.exportedSuccess, lang) ||
                'Sanitized portfolio JSON downloaded.'
              : ''}
          </p>
        </div>
      </div>
    </footer>
  );
}
