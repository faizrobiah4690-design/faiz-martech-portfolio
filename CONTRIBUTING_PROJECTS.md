# Contributing & Scaling Guide — Adding `PRJ-06+` and Portfolio Assets

This portfolio uses a **JSON-driven Vite + React + Tailwind architecture**. Adding a new MarTech system (`PRJ-06`, `PRJ-07`, and beyond) or dropping in visual evidence requires **zero UI component edits**.

---

## 1. Purpose & Automatic UI Counter Propagation

`src/data/projects.json` is the single source of truth for Pillar 1 (*Production-Architected & Sandbox Stress-Tested MarTech Systems*). All counters and filter states are computed dynamically by `computePortfolioMetrics(projects, credentials)` in `src/utils/metrics.js`.

When you append `PRJ-06` to `src/data/projects.json`, the UI automatically updates across:
1. **Navbar System Count Badge:** `5 Systems Shipped` -> `6 Systems Shipped` (`5 Sistem Disiapkan` -> `6 Sistem Disiapkan`).
2. **Hero CTA & KPI Card:** `Explore 5 MarTech Systems` -> `Explore 6 MarTech Systems` (`Terokai 5 Sistem MarTech` -> `Terokai 6 Sistem MarTech`) and KPI value `5` -> `6`.
3. **5-Stage Funnel Pipeline Map:** Automatically increments the matching `stageCode` counter (`01`–`05`) and the `All Stages (N)` / `Semua Peringkat (N)` pill.
4. **Systems Registry:** Automatically indexes the new system in category pills, keyword search, and the `ArchitectureModal` 5-node pipeline inspector.

---

## 2. Canonical Funnel `stageCode` Reference (`"01"`–`"05"`)

Use the exact two-digit `stageCode` and bilingual `funnelStageName` pair below so stage filtering and pipeline counters align cleanly:

| `stageCode` | `funnelStageName.en` | `funnelStageName.bm` | Typical Focus |
|---|---|---|---|
| `"01"` | `Inbound Lead SLA` | `SLA Prospek Masuk` | Sub-10s webhook triage, HTTP domain checks, CRM routing |
| `"02"` | `Paid Ads Guardrail` | `Kawalan Iklan Berbayar` | Post-COGS Net POAS gates, HTTP 404/500 spend cutoffs |
| `"03"` | `Offline / WA CAPI` | `CAPI WhatsApp / Kaunter` | Click-to-WhatsApp & counter receipt closed-loop attribution |
| `"04"` | `Marketplace Net Cash` | `Tunai Bersih Marketplace` | TikTok Shop & Shopee order-to-settlement reconciliation |
| `"05"` | `RFM Churn & LTV` | `RFM Risiko Lari & LTV` | Inter-purchase Z-score alerts & SHA-256 VIP CAPI seeding |

---

## 3. `src/data/projects.json` Schema Contract

Every entry in `src/data/projects.json` must satisfy these field contracts:

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | Yes | Sequential identifier matching `/^PRJ-\d{2,}$/` (e.g., `"PRJ-06"`) |
| `stageCode` | `"01" \| "02" \| "03" \| "04" \| "05"` | Yes | Must match one of the 5 canonical funnel stages |
| `funnelStageName` | `{ en: string, bm: string }` | Yes | Must match the canonical stage label for `stageCode` |
| `category` | `string` | Yes | e.g., `"RevOps & Lead Routing"`, `"Ad Ops & Guardrail"`, `"Offline & WhatsApp CAPI"`, `"Social Commerce & Affiliate"`, `"Retention & LTV"` |
| `statusBadge` | `string` | Yes | Honest attribution badge (e.g., `"Sandbox Stress-Test Validated"` or `"Production Live"`) |
| `title` | `{ en: string, bm: string }` | Yes | Bilingual project title |
| `businessObjective` | `{ en: string, bm: string }` | No (Recommended) | Plain-language business problem & goal shown upfront |
| `martechInsight` | `{ en: string, bm: string }` | No (Recommended) | Commercial MarTech / Ad Ops "why it matters" rationale |
| `headlineMetric` | `string` | Yes | Concise telemetry metric shown on card & modal |
| `commercialLeak` | `{ en: string, bm: string }` | Yes | Revenue/margin leak solved by the system |
| `deterministicGate` | `{ en: string, bm: string }` | Yes | Strict deterministic math/HTTP rules (never delegated to an LLM) |
| `boundedAiRole` | `{ en: string, bm: string }` | Yes | Bounded LLM synthesis or hashed API signal dispatch |
| `validatedOutcome` | `{ en: string, bm: string }` | Yes | Sandbox or verified operational outcome |
| `stack` | `string[]` | Yes | Non-empty list of tools, APIs, and platforms |
| `pipelineNodes` | `Array<{ en, bm } \| string>` | Yes | **Exactly 5 nodes** rendered inside `ArchitectureModal.jsx` |
| `pipelineStepDetails` | `Array<{ stepNumber, role, summary }>` | No (Recommended) | Sequential 5-step mapping (`Trigger` -> `Gate` -> `AI/Router` -> `Mart` -> `Outcome`) |
| `formulas` | `Array<{ name, formula, note }>` | No (Recommended) | Project-specific deterministic guardrail formulas |
| `processVisuals` | `Array<{ stage, src, caption, flowStep?, takeaway? }>` | No | Multi-slide walkthrough visuals under `/assets/projects/...` |
| `lookerUrl` | `string` | Yes | `""` when pending, or valid `https://...` Looker Studio URL |
| `liveAppUrl` | `string` | Yes | `""` when pending, or valid `https://...` app URL |
| `repoUrl` | `string` | Yes | Valid `https://...` GitHub profile or repository URL |
| `processVisual` | `string \| { src, alt?, caption? }` | No | Optional path under `/assets/...` (e.g., `"/assets/prj-06-architecture.png"`) |

---

## 4. Copy-Paste `PRJ-06` Template & Fast Antigravity Prompt

### 4.1 Ready-to-Append JSON Object

Append the following template inside the top-level JSON array in `src/data/projects.json` (remembering the trailing comma after `PRJ-05`):

```json
{
  "id": "PRJ-06",
  "stageCode": "02",
  "funnelStageName": {
    "en": "Paid Ads Guardrail",
    "bm": "Kawalan Iklan Berbayar"
  },
  "category": "Ad Ops & Guardrail",
  "statusBadge": "Sandbox Stress-Test Validated",
  "title": {
    "en": "Automated Creative Fatigue & Landing Page Speed Sentinel",
    "bm": "Pengesan Automatik Kelesuan Kreatif & Kelajuan Halaman Pendaratan"
  },
  "headlineMetric": "Sub-2.5s LCP Gate + Automated Alert",
  "commercialLeak": {
    "en": "Paid social clicks bouncing on slow mobile landing pages and fatigued ad creatives draining daily budget without conversion recovery.",
    "bm": "Klik iklan berbayar terbazir pada halaman mudah alih yang perlahan dan kreatif iklan lesu tanpa pemulihan penukaran."
  },
  "deterministicGate": {
    "en": "Deterministic Core Web Vitals threshold gate (LCP > 2.5s / HTTP != 200) and rolling 7-day CTR decay threshold before alert dispatch.",
    "bm": "Kawalan ambang Core Web Vitals deterministik (LCP > 2.5s / HTTP != 200) serta ambang kejatuhan CTR 7 hari sebelum amaran dihantar."
  },
  "boundedAiRole": {
    "en": "Gemini Flash drafts three localized Bahasa Malaysia ad hook variations only after deterministic decay flags trigger.",
    "bm": "Gemini Flash merangka tiga variasi tajuk iklan Bahasa Melayu tempatan hanya selepas bendera kejatuhan deterministik dicetuskan."
  },
  "validatedOutcome": {
    "en": "Immediate Telegram sentinel alert to pause degraded destination URLs and refresh ad creatives with zero manual spreadsheet checks.",
    "bm": "Amaran segera Telegram untuk menghentikan pautan rosak dan menyegarkan kreatif iklan tanpa semakan manual papan pemuka hamparan."
  },
  "stack": [
    "Meta Marketing API",
    "PageSpeed Insights API",
    "Google Sheets",
    "Apps Script",
    "Gemini API",
    "Telegram Bot"
  ],
  "pipelineNodes": [
    "Meta Creative Pull",
    "LCP & CTR Decay Gate",
    "BM Hook Generator",
    "Zero-PII Ad Scorecard",
    "Telegram + Looker BI"
  ],
  "lookerUrl": "",
  "liveAppUrl": "",
  "repoUrl": "https://github.com/faizrobiah4690-design",
  "processVisual": "/assets/prj-06-architecture.png"
}
```

### 4.2 Fast Antigravity Prompt Snippet

> "Add `PRJ-06` to `src/data/projects.json` using the canonical schema in `CONTRIBUTING_PROJECTS.md` with complete `EN` and natural Malaysian `BM` fields, `pipelineNodes` of length 5, `https://` URLs, and optional `processVisual` under `/assets/`. Run `npm run test:data`, `npm run test:pdpa`, and `npm run build` to verify dynamic counter propagation (`5 -> 6`) and zero PDPA issues."

---

## 5. Adding Process Visuals & Evidence Assets (`public/assets/`)

Drop real binary image assets into `public/assets/projects/`. Missing optional assets render clean labeled dark-glass placeholder slots automatically without broken images.

| Web Path (Referenced in JSON) | Disk Path (`public/assets/`) | Purpose |
|---|---|---|
| `/assets/case-radhi-fruits.png` | `public/assets/case-radhi-fruits.png` | `CS-01` Radhi Fruits 4690 campaign evidence |
| `/assets/case-pedalhaus.png` | `public/assets/case-pedalhaus.png` | `CS-02` PedalHaus Chukai campaign evidence |
| `/assets/case-school-van.png` | `public/assets/case-school-van.png` | `CS-03` School Van Service, Binjai campaign evidence |
| `/assets/prj-06-architecture.png` | `public/assets/prj-06-architecture.png` | Optional `PRJ-XX` system diagram / scorecard screenshot |

### PDPA 2024, Attribution & Language Guardrails
- **PDPA 2024 Strict Zero-NRIC & Zero Resume/Cert File Rule:** Never place candidate NRIC numbers, certificate scans, or resume files into `src/`, `public/`, `index.html`, or filenames. Keep SKM accreditation referenced solely via official Serial Number and NOSS metadata.
- **SKM Status Integrity:** Keep SKM Level 3 (`S304265796`, NOSS `M731-001-3:2021`, Batch `M731-001-3:2021-102026`) marked as **Assessed TERAMPIL / Issued** — never label it as pending.
- **Honest Attribution Boundaries:** Label `PRJ-01`–`PRJ-06+` accurately as *Production-Architected & Sandbox Stress-Tested MarTech Systems* (Mock/Live API Adapter Ready), and keep `CS-01`–`CS-03` free of exaggerated paid-ROAS claims.
- **Malaysian Bahasa Melayu Only:** Use authentic Malaysian terminology (*papan pemuka*, *untung bersih*, *tunai bersih*, *kad skor*, *pelayar*, *pelayan*, *muat turun*, *sijil kemahiran*, *pautan*). Never use Indonesian terms.

---

## 6. Pre-Publish Verification & Future Cloudflare Pages Deployment

Run these checks locally before publishing:

```powershell
# 1. Verify JSON schemas, EN/BM parity, URL safety, and dynamic counter bump (5 -> 6)
npm run test:data

# 2. Scan src/, public/, index.html, and dist/ for PDPA 2024 NRIC patterns
npm run test:pdpa

# 3. Compile production static bundle into dist/
npm run build

# 4. Preview the production dist/ bundle locally (http://localhost:4173)
npm run preview

# 5. Optional: Run Playwright E2E checks against dist/
npm run test:e2e
```

### Future Cloudflare Pages Settings (Reference Only)
When ready for future production deployment from `https://github.com/faizrobiah4690-design`:
- **Framework preset:** `Vite`
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Node.js version:** `22`
- **Hosting cost:** `RM 0/month` static edge hosting
