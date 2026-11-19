import { Award, CheckCircle2, ExternalLink, GraduationCap } from 'lucide-react';
import { localizeText, safeLookup } from '../utils/i18n.js';
import { isSafeExternalUrl, normalizeExternalUrl } from '../utils/urlSafety.js';

function isPlainObject(v) {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v));
}

export default function CredentialsVault({ credentials, lang, t }) {
  const skm = isPlainObject(credentials?.nationalAccreditation)
    ? credentials.nationalAccreditation
    : {};
  const courses = (
    Array.isArray(credentials?.googleCourseraCourses)
      ? credentials.googleCourseraCourses
      : []
  ).filter(isPlainObject);
  const education = (
    Array.isArray(credentials?.academicEducation) ? credentials.academicEducation : []
  ).filter(isPlainObject);

  const rawSubtitle = localizeText(t?.credentials?.subtitle, lang);
  const credentialsSubtitle =
    courses.length !== 6
      ? rawSubtitle.replace(/\b6\b/, String(courses.length))
      : rawSubtitle;

  const rawCourseraAttribution = localizeText(t?.credentials?.courseraAttribution, lang);
  const courseraAttribution =
    courses.length !== 6
      ? rawCourseraAttribution.replace(/\b6\b/, String(courses.length))
      : rawCourseraAttribution;

  return (
    <section id="credentials" className="scroll-mt-20 border-b border-slate-800/80 py-14 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="space-y-2 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-wider text-emerald-400">
            {localizeText(t?.credentials?.eyebrow, lang)}
          </p>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
            {localizeText(t?.credentials?.heading, lang)}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            {credentialsSubtitle}
          </p>
        </div>

        {localizeText(credentials?.systemBridge, lang) ? (
          <div className="rounded-2xl border border-cyan-400/30 bg-cyan-950/20 p-5 space-y-1.5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-300">
              {localizeText(t?.credentials?.bridgeTitle, lang) ||
                'How These Credentials Power PRJ-01..05'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {localizeText(credentials.systemBridge, lang)}
            </p>
          </div>
        ) : null}

        <div
          className="glass-card rounded-2xl p-5 sm:p-7 border-emerald-400/30"
          data-testid="skm-credential-card"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-4 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-3 py-1 text-xs font-mono font-semibold text-emerald-300">
                  <Award className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{localizeText(t?.credentials?.skmSectionTitle, lang)}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400 px-3 py-1 text-xs font-mono font-bold text-slate-950">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{localizeText(t?.credentials?.skmStatusBadge, lang)}</span>
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-display font-bold text-white leading-snug break-words">
                {localizeText(skm.title, lang)}
              </h3>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 min-w-0">
                  <dt className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                    {localizeText(t?.credentials?.serialLabel, lang)}
                  </dt>
                  <dd className="font-mono font-semibold text-emerald-300 mt-1 break-all">
                    {localizeText(skm.certificateSerialNo, lang)}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 min-w-0">
                  <dt className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                    {localizeText(t?.credentials?.nossLabel, lang)}
                  </dt>
                  <dd className="font-mono font-semibold text-cyan-300 mt-1 break-all">
                    {localizeText(skm.nossCode, lang)}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 min-w-0">
                  <dt className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                    {localizeText(t?.credentials?.batchLabel, lang)}
                  </dt>
                  <dd className="font-mono font-semibold text-slate-100 mt-1 break-all">
                    {localizeText(skm.batchCode, lang)}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 min-w-0">
                  <dt className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                    {localizeText(t?.credentials?.methodLabel, lang)}
                  </dt>
                  <dd className="font-medium text-slate-100 mt-1 break-words">
                    {localizeText(t?.credentials?.skmAssessmentMethod, lang) ||
                      localizeText(skm.assessmentMethod, lang)}
                  </dd>
                </div>

                <div className="sm:col-span-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 min-w-0">
                  <dt className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                    {localizeText(t?.credentials?.issuerLabel, lang)}
                  </dt>
                  <dd className="font-medium text-slate-200 mt-1 break-words">
                    {localizeText(t?.credentials?.skmIssuingMinistry, lang) ||
                      localizeText(skm.issuingMinistry, lang)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="lg:col-span-5 min-w-0">
              <div className="rounded-2xl border border-emerald-400/30 bg-slate-950/80 p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 font-mono text-xs font-semibold text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      {localizeText(t?.credentials?.jpkVerifiedBadge, lang) ||
                        'Official JPK Verified'}
                    </span>
                  </span>
                  <span className="font-mono text-xs text-slate-400">PDPA 2024</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {localizeText(t?.credentials?.pdpaCertNotice, lang)}
                </p>
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3.5 py-2.5 font-mono text-xs text-cyan-300 flex items-center justify-between gap-2">
                  <span>{localizeText(skm.certificateSerialNo, lang)}</span>
                  <span className="text-emerald-300">{localizeText(skm.nossCode, lang)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-xl font-display font-bold text-white">
              {localizeText(t?.credentials?.courseraSectionTitle, lang)}
            </h3>
            <p className="text-xs sm:text-sm text-amber-200 rounded-xl border border-amber-400/25 bg-amber-950/15 px-4 py-2.5">
              {courseraAttribution}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course, idx) => {
              const safeVerifyUrl = normalizeExternalUrl(course.verifyUrl);
              const verifyCode = localizeText(course.verifyCode, lang);
              const courseNumRaw = localizeText(course.courseNumber, lang);
              const courseKey = verifyCode || courseNumRaw || `course-${idx + 1}`;
              const courseNum = courseNumRaw || String(idx + 1).padStart(2, '0');

              return (
                <article
                  key={courseKey}
                  data-coursera-code={verifyCode}
                  className="glass-card rounded-2xl p-5 flex flex-col justify-between gap-4 min-w-0"
                >
                  <div className="space-y-2.5 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-md bg-cyan-400/15 border border-cyan-400/30 px-2 py-0.5 font-mono text-xs font-bold text-cyan-300">
                        #{courseNum}
                      </span>
                      <span className="font-mono text-sm font-bold text-emerald-400">
                        {localizeText(course.score, lang)}
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-display font-bold text-white leading-snug break-words">
                      {localizeText(course.title, lang)}
                    </h4>
                    <p className="text-xs text-slate-400">{localizeText(course.issuer, lang)}</p>
                  </div>

                  <div className="space-y-3 border-t border-slate-800/80 pt-3">
                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <dt className="text-slate-400">
                          {localizeText(t?.credentials?.completedLabel, lang)}
                        </dt>
                        <dd className="font-mono text-slate-200">
                          {localizeText(course.completionDate, lang)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">
                          {localizeText(t?.credentials?.hoursLabel, lang)}
                        </dt>
                        <dd className="font-mono text-slate-200">
                          {localizeText(course.studyHours, lang)}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-slate-400">
                          {localizeText(t?.credentials?.verifyIdLabel, lang)}
                        </dt>
                        <dd className="font-mono text-cyan-300 break-all">
                          {verifyCode}
                        </dd>
                      </div>
                    </dl>

                    {isSafeExternalUrl(safeVerifyUrl) ? (
                      <a
                        href={safeVerifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400 hover:text-slate-950"
                      >
                        <span>{localizeText(t?.credentials?.verifyCta, lang)}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-display font-bold text-white">
            {localizeText(t?.credentials?.academicTitle, lang)}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {education.map((edu, idx) => {
              const qualKey = typeof edu.qualification === 'string' ? edu.qualification.trim() : '';
              const qualTitle =
                (qualKey && safeLookup(t?.credentials?.qualificationsMap, qualKey)) ||
                localizeText(edu.qualification, lang);
              const institutionText = localizeText(edu.institution, lang);
              const periodText = localizeText(edu.period, lang);

              return (
                <div
                  key={`${institutionText || 'edu'}-${periodText || idx}`}
                  className="glass-card rounded-2xl p-5 flex items-start gap-3.5 min-w-0"
                >
                  <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-2.5 text-cyan-300 shrink-0">
                    <GraduationCap className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-base font-display font-bold text-white break-words">
                      {qualTitle}
                    </h4>
                    <p className="text-sm text-slate-300 break-words">
                      {institutionText}
                    </p>
                    <p className="font-mono text-xs text-emerald-400">
                      {periodText}
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
