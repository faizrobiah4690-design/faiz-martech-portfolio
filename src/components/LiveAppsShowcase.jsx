import { Code2, ExternalLink, Globe, Rocket } from 'lucide-react';
import i18nData from '../data/i18n.json';
import { localizeText, normalizeLang } from '../utils/i18n.js';
import { isSafeExternalUrl, normalizeExternalUrl } from '../utils/urlSafety.js';

function isPlainObject(v) {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v));
}

export default function LiveAppsShowcase({ apps, lang, t }) {
  const safeApps = (Array.isArray(apps) ? apps : []).filter(isPlainObject);
  if (safeApps.length === 0) return null;

  const activeLang = normalizeLang(lang);
  const fallbackLiveApps = i18nData?.[activeLang]?.liveApps || i18nData.en.liveApps;
  const liveBadgeLabel =
    localizeText(t?.liveApps?.liveBadge, activeLang) ||
    localizeText(fallbackLiveApps?.liveBadge, activeLang);
  const launchButtonLabel =
    localizeText(t?.liveApps?.launchButton, activeLang) ||
    localizeText(fallbackLiveApps?.launchButton, activeLang);
  const githubLabel =
    localizeText(t?.liveApps?.githubLabel, activeLang) ||
    localizeText(fallbackLiveApps?.githubLabel, activeLang) ||
    'GitHub';

  return (
    <section
      id="live-apps"
      className="border-b border-slate-800/80 py-14 sm:py-16 bg-slate-950/60"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="space-y-2 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-wider text-emerald-400">
            {localizeText(t?.liveApps?.eyebrow, activeLang) ||
              'Live Production Web Apps · Shipped & Interactive'}
          </p>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
            {localizeText(t?.liveApps?.heading, activeLang) ||
              'Live Production Web Applications'}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            {localizeText(t?.liveApps?.subtitle, activeLang)}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {safeApps.map((app) => {
            const liveUrl = normalizeExternalUrl(app.liveUrl);
            const repoUrl = normalizeExternalUrl(app.repoUrl);
            const stack = Array.isArray(app.stack) ? app.stack : [];

            return (
              <article
                key={app.id || app.name}
                data-live-app-id={app.id || app.name}
                className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-5 hover:border-emerald-400/40 transition min-w-0"
              >
                <div className="space-y-3 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-400/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                      <span>{liveBadgeLabel}</span>
                    </span>
                    <span className="font-mono text-xs text-cyan-300">
                      {localizeText(app.category, activeLang)}
                    </span>
                  </div>

                  <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
                    <span>{app.name}</span>
                  </h3>

                  <p className="text-sm text-slate-300 leading-relaxed">
                    {localizeText(app.tagline, activeLang)}
                  </p>

                  {stack.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {stack.map((tech) => (
                        <span
                          key={`${app.id}-${tech}`}
                          className="rounded-md border border-slate-800 bg-slate-950/80 px-2 py-0.5 font-mono text-[11px] text-slate-300"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-800/80">
                  {isSafeExternalUrl(liveUrl) ? (
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                    >
                      <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{launchButtonLabel}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    </a>
                  ) : null}

                  {isSafeExternalUrl(repoUrl) ? (
                    <a
                      href={repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-200"
                    >
                      <Code2 className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden="true" />
                      <span>{githubLabel}</span>
                      <ExternalLink className="h-3 w-3 text-slate-400 shrink-0" aria-hidden="true" />
                    </a>
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
