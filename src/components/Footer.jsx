import { useState } from 'react';
import {
  Briefcase,
  Code2,
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
import { localizeText } from '../utils/i18n.js';
import { isSafeExternalUrl, normalizeExternalUrl } from '../utils/urlSafety.js';

function isPlainObject(v) {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v));
}

export default function Footer({
  profile,
  projects,
  caseStudies,
  credentials,
  operationalHistory,
  lang = 'en',
  t
}) {
  const [exportStatus, setExportStatus] = useState('');
  const safeProfile = isPlainObject(profile) ? profile : {};
  const contacts = isPlainObject(safeProfile.contacts) ? safeProfile.contacts : {};

  const whatsappUrl = normalizeExternalUrl(contacts.whatsappUrl);
  const linkedinUrl = normalizeExternalUrl(contacts.linkedinUrl);
  const githubUrl = normalizeExternalUrl(contacts.githubUrl);
  const emailHref = normalizeExternalUrl(
    contacts.emailHref || (contacts.email ? `mailto:${contacts.email}` : '')
  );

  const identityParts = [
    localizeText(safeProfile.fullName, lang).trim(),
    localizeText(safeProfile.location, lang).trim()
  ].filter(Boolean);

  const handleExport = () => {
    const payload = buildSanitizedPortfolioExport({
      profile,
      projects,
      caseStudies,
      credentials,
      operationalHistory
    });
    const ok = downloadPortfolioJson(payload);
    if (ok) {
      setExportStatus(
        localizeText(t?.footer?.exportedSuccess, lang) || 'Sanitized portfolio JSON downloaded.'
      );
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

            {isSafeExternalUrl(emailHref) ? (
              <a
                href={emailHref}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-200 hover:border-amber-400/50 hover:text-amber-300"
              >
                <Mail className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                <span>
                  {localizeText(contacts.email, lang) || localizeText(t?.hero?.ctaEmail, lang) || 'Email'}
                </span>
              </a>
            ) : null}
          </div>

          <div className="rounded-xl border border-emerald-400/25 bg-emerald-950/15 px-3.5 py-2.5 text-xs text-emerald-200 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">{localizeText(t?.footer?.pdpaStatement, lang)}</p>
          </div>

          <p className="text-xs text-slate-400">{localizeText(t?.footer?.builtWith, lang)}</p>
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
            {exportStatus}
          </p>
        </div>
      </div>
    </footer>
  );
}
