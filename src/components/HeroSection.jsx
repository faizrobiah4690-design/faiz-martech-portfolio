import { useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  Check,
  Code2,
  Copy,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle
} from 'lucide-react';
import { localizeText } from '../utils/i18n.js';
import { isSafeExternalUrl, normalizeExternalUrl } from '../utils/urlSafety.js';
import AssetSlot from './AssetSlot.jsx';

function isPlainObject(v) {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v));
}

export default function HeroSection({ profile, lang, t, metrics }) {
  const [emailCopied, setEmailCopied] = useState(false);
  const safeProfile = isPlainObject(profile) ? profile : {};
  const contacts = isPlainObject(safeProfile.contacts) ? safeProfile.contacts : {};
  const totalSystems = metrics?.totalSystems ?? 0;
  const courseraCount = metrics?.courseraCount ?? 0;
  const kpis = (Array.isArray(t?.hero?.kpis) ? t.hero.kpis : []).filter(isPlainObject);

  const whatsappUrl = normalizeExternalUrl(contacts.whatsappUrl);
  const linkedinUrl = normalizeExternalUrl(contacts.linkedinUrl);
  const githubUrl = normalizeExternalUrl(contacts.githubUrl);
  const emailAddress = typeof contacts.email === 'string' ? contacts.email.trim() : '';
  const gmailComposeUrl = emailAddress
    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailAddress)}&su=${encodeURIComponent('Portfolio Inquiry — Mohd Faiz Bin Md Nordin')}`
    : '';
  const handleCopyEmail = () => {
    if (!emailAddress || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(emailAddress).then(() => {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2500);
    }).catch(() => {});
  };

  const ctaExploreLabel = (
    localizeText(t?.hero?.ctaExplore, lang) || 'Explore {count} Live Systems'
  ).replace('{count}', String(totalSystems));

  const fullName = localizeText(safeProfile.fullName, lang) || 'Mohd Faiz Bin Md Nordin';
  const brandAlias = localizeText(safeProfile.brandAlias, lang);
  const location = localizeText(safeProfile.location, lang);

  return (
    <section
      id="top"
      className="relative border-b border-slate-800/80 bg-executive-grid py-12 sm:py-16 lg:py-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          <div className="lg:col-span-7 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-mono font-medium text-emerald-300 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              <span>{localizeText(t?.hero?.eyebrow, lang)}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white leading-tight break-words">
              {fullName}
              {brandAlias ? (
                <span className="block text-base sm:text-lg font-medium text-emerald-400 mt-2">
                  {brandAlias}
                </span>
              ) : null}
            </h1>

            <p className="mt-4 text-lg sm:text-xl font-medium text-cyan-300 leading-snug break-words">
              {localizeText(safeProfile.headline, lang)}
            </p>

            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              {localizeText(safeProfile.subheadline, lang)}
            </p>

            {location ? (
              <div className="mt-4 inline-flex items-center gap-2 text-xs sm:text-sm text-slate-400">
                <MapPin className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>
                  {localizeText(t?.hero?.locationLabel, lang) || 'Based in'} {location}
                </span>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-start gap-3">
              <a
                href="#systems"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300"
              >
                <span>{ctaExploreLabel}</span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </a>

              <a
                href="#case-studies"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/50 hover:text-cyan-200"
              >
                <span>{localizeText(t?.hero?.ctaCaseStudies, lang) || 'View Local Case Studies'}</span>
              </a>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              {isSafeExternalUrl(whatsappUrl) ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs sm:text-sm font-medium text-slate-200 transition hover:border-emerald-400/50 hover:text-emerald-300"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>{localizeText(t?.hero?.ctaWhatsapp, lang) || 'WhatsApp'}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                </a>
              ) : null}

              {isSafeExternalUrl(linkedinUrl) ? (
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs sm:text-sm font-medium text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-300"
                >
                  <Briefcase className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden="true" />
                  <span>{localizeText(t?.hero?.ctaLinkedin, lang) || 'LinkedIn'}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                </a>
              ) : null}

              {isSafeExternalUrl(githubUrl) ? (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs sm:text-sm font-medium text-slate-200 transition hover:border-emerald-400/50 hover:text-emerald-300"
                >
                  <Code2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>{localizeText(t?.hero?.ctaGithub, lang) || 'GitHub'}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                </a>
              ) : null}

              {gmailComposeUrl ? (
                <div className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-900/80 overflow-hidden">
                  <a
                    href={gmailComposeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleCopyEmail}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-200 transition hover:bg-amber-400/10 hover:text-amber-300"
                    title={lang === 'bm' ? 'Tulis e-mel di Gmail' : 'Compose email in Gmail'}
                  >
                    <Mail className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />
                    <span>{localizeText(t?.hero?.ctaEmail, lang) || 'Email'}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    aria-label={lang === 'bm' ? 'Salin alamat e-mel' : 'Copy email address'}
                    title={emailAddress}
                    className="inline-flex items-center gap-1 border-l border-slate-800 px-2.5 py-2 text-xs font-mono text-slate-400 hover:bg-slate-800/80 hover:text-emerald-300 transition"
                  >
                    {emailCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                        <span className="text-emerald-300">{lang === 'bm' ? 'Disalin' : 'Copied'}</span>
                      </>
                    ) : (
                      <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div
            className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0"
            data-testid="hero-kpi-grid"
          >
            {kpis.map((kpi, idx) => {
              const kpiKey = localizeText(kpi.key, lang) || `kpi-${idx}`;
              const rawValue = localizeText(kpi.value, lang);
              const displayValue =
                kpiKey === 'systems'
                  ? (rawValue || '{count}').replace('{count}', String(totalSystems))
                  : rawValue;

              const rawLabel = localizeText(kpi.label, lang);
              const displayLabel =
                kpiKey === 'coursera' && courseraCount !== 6
                  ? rawLabel.replace(/\b6\b/, String(courseraCount))
                  : rawLabel;

              const valueColorClass =
                kpiKey === 'skm'
                  ? 'text-emerald-400'
                  : kpiKey === 'cost'
                    ? 'text-cyan-400'
                    : kpiKey === 'coursera'
                      ? 'text-amber-400'
                      : 'text-white';

              return (
                <div
                  key={kpiKey}
                  data-kpi-key={kpiKey}
                  className="glass-card rounded-2xl p-5 min-w-0 flex flex-col justify-between gap-2"
                >
                  <p className={`font-mono text-2xl sm:text-3xl font-bold ${valueColorClass} break-words`}>
                    {displayValue}
                  </p>
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100 break-words">
                      {displayLabel}
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed break-words">
                      {localizeText(kpi.subtext, lang)}
                    </p>
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
