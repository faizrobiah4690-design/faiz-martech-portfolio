import { useEffect, useRef, useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { localizeText, normalizeLang } from '../utils/i18n.js';

export default function Navbar({
  lang,
  onToggleLang,
  theme = 'dark',
  onToggleTheme,
  totalSystems = 0,
  t,
  profile
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const headerRef = useRef(null);
  const menuButtonRef = useRef(null);
  const isBm = normalizeLang(lang) === 'bm';
  const isLight = theme === 'light';
  const safeTotalSystems = totalSystems ?? 0;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const sectionIds = [
      'top',
      'funnel',
      'systems',
      'live-apps',
      'case-studies',
      'credentials',
      'governance'
    ];

    let rafId = 0;

    const computeActiveSection = () => {
      rafId = 0;
      const headerHeight = headerRef.current?.getBoundingClientRect().height || 65;
      const activationOffset = headerHeight + 56;

      if (window.scrollY < 40) {
        setActiveSection('');
        return;
      }

      const docEl = document.documentElement;
      const atBottom =
        window.innerHeight + window.scrollY >= (docEl?.scrollHeight || 0) - 4;
      if (atBottom) {
        const lastEl = document.getElementById(sectionIds[sectionIds.length - 1]);
        if (lastEl && lastEl.getBoundingClientRect().top < window.innerHeight) {
          setActiveSection(`#${lastEl.id}`);
          return;
        }
      }

      let currentId = '';
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= activationOffset) {
          currentId = id;
        }
      }

      if (!currentId || currentId === 'top') {
        setActiveSection('');
      } else {
        setActiveSection(`#${currentId}`);
      }
    };

    const scheduleUpdate = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(computeActiveSection);
    };

    computeActiveSection();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    window.addEventListener('hashchange', scheduleUpdate);

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('hashchange', scheduleUpdate);
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen || typeof document === 'undefined') return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    const handleOutsidePointer = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setMobileOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleOutsidePointer);
    document.addEventListener('touchstart', handleOutsidePointer);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleOutsidePointer);
      document.removeEventListener('touchstart', handleOutsidePointer);
    };
  }, [mobileOpen]);

  const navItems = [
    { href: '#funnel', label: localizeText(t?.nav?.funnel, lang) || 'Funnel Map' },
    { href: '#systems', label: localizeText(t?.nav?.systems, lang) || 'Systems' },
    { href: '#live-apps', label: localizeText(t?.nav?.liveApps, lang) || 'Live Apps' },
    { href: '#case-studies', label: localizeText(t?.nav?.caseStudies, lang) || 'Case Studies' },
    { href: '#credentials', label: localizeText(t?.nav?.credentials, lang) || 'Credentials' },
    { href: '#governance', label: localizeText(t?.nav?.governance, lang) || 'Governance' }
  ];

  const systemBadgeText = (
    localizeText(t?.nav?.systemCountBadge, lang) || '{count} Systems Shipped'
  ).replace('{count}', String(safeTotalSystems));

  const switchToEnLabel = localizeText(t?.nav?.switchToEn, lang) || 'Switch language to English';
  const switchToBmLabel =
    localizeText(t?.nav?.switchToBm, lang) || 'Tukar bahasa ke Bahasa Melayu';
  const themeToggleLabel = isLight
    ? localizeText(t?.nav?.switchToDark, lang) || 'Switch to Dark Mode'
    : localizeText(t?.nav?.switchToLight, lang) || 'Switch to Light Mode';
  const themeShortLabel = isLight
    ? localizeText(t?.nav?.darkShort, lang) || 'Dark'
    : localizeText(t?.nav?.lightShort, lang) || 'Light';

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/95 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <a
            href="#top"
            onClick={() => setActiveSection('')}
            className="flex items-center gap-1.5 sm:gap-2 min-w-0 group"
          >
            <span className="w-7 h-7 sm:w-9 sm:h-9 shrink-0 rounded-lg bg-emerald-400/15 border border-emerald-400/40 text-emerald-300 font-mono font-bold text-xs sm:text-sm flex items-center justify-center">
              MF
            </span>
            <span className="min-w-0">
              <span className="block text-xs sm:text-sm font-display font-bold text-slate-100 truncate group-hover:text-emerald-300 transition-colors">
                {localizeText(profile?.fullName, lang) || 'Mohd Faiz Bin Md Nordin'}
              </span>
              <span className="hidden md:block text-[11px] text-slate-400 truncate">
                {localizeText(t?.nav?.brandSubtitle, lang) || 'MarTech & Ad Ops Portfolio'}
              </span>
            </span>
          </a>

          <span
            className="sm:hidden inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-300 whitespace-nowrap shrink-0"
            title={systemBadgeText}
            aria-label={systemBadgeText}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            <span>{safeTotalSystems}</span>
          </span>

          <span
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 font-mono text-xs font-medium text-emerald-300 whitespace-nowrap shrink-0"
            data-testid="nav-system-count"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            <span>{systemBadgeText}</span>
          </span>
        </div>

        <nav
          className="hidden xl:flex items-center gap-5"
          aria-label={localizeText(t?.nav?.primaryAria, lang) || 'Primary navigation'}
        >
          {navItems.map((item) => {
            const isActive = activeSection === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'location' : undefined}
                onClick={() => setActiveSection(item.href)}
                className={`text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-emerald-300 font-semibold'
                    : 'text-slate-300 hover:text-emerald-300'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {typeof onToggleTheme === 'function' ? (
            <button
              type="button"
              onClick={onToggleTheme}
              data-testid="theme-toggle"
              aria-pressed={isLight}
              aria-label={themeToggleLabel}
              title={themeToggleLabel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2 sm:px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-200 hover:border-emerald-400/60 hover:text-emerald-300 transition-colors shrink-0"
            >
              {isLight ? (
                <Moon className="h-3.5 w-3.5 text-cyan-400 shrink-0" aria-hidden="true" />
              ) : (
                <Sun className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">{themeShortLabel}</span>
            </button>
          ) : null}

          <div
            role="group"
            aria-label={localizeText(t?.nav?.languageLabel, lang) || 'Language'}
            className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 p-0.5 shrink-0"
          >
            <button
              type="button"
              onClick={() => onToggleLang('en')}
              aria-pressed={!isBm}
              aria-label={`EN — ${switchToEnLabel}`}
              title={switchToEnLabel}
              className={`px-2 sm:px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-colors ${
                !isBm
                  ? 'bg-emerald-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onToggleLang('bm')}
              aria-pressed={isBm}
              aria-label={`BM — ${switchToBmLabel}`}
              title={switchToBmLabel}
              className={`px-2 sm:px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-colors ${
                isBm
                  ? 'bg-emerald-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              BM
            </button>
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={
              mobileOpen
                ? localizeText(t?.nav?.closeMenu, lang) || 'Close navigation menu'
                : localizeText(t?.nav?.openMenu, lang) || 'Open navigation menu'
            }
            className="xl:hidden inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-200 hover:border-emerald-400/50 hover:text-emerald-300"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <nav
          id="mobile-nav-drawer"
          aria-label={localizeText(t?.nav?.mobileAria, lang) || 'Mobile navigation'}
          className="xl:hidden border-t border-slate-800 bg-slate-950/95 px-4 py-3 space-y-1"
        >
          <div className="sm:hidden pb-2 mb-2 border-b border-slate-800">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 font-mono text-xs font-medium text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              <span>{systemBadgeText}</span>
            </span>
          </div>
          {navItems.map((item) => {
            const isActive = activeSection === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'location' : undefined}
                onClick={() => {
                  setActiveSection(item.href);
                  setMobileOpen(false);
                }}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-slate-900 text-emerald-300 font-semibold'
                    : 'text-slate-200 hover:bg-slate-900 hover:text-emerald-300'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
