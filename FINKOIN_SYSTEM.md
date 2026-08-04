---
⚡ HOW TO USE THIS FILE WITH CURSOR:

At the start of any new Cursor conversation paste:
"Read FINKOIN_SYSTEM.md first. 
Use it as complete context for all changes.
Do not break existing functionality.
Check sections 27 (critical paths), 29 (analytics), 30 (runbooks),
32 (requirements→solution→outcome), 34 (split schema),
36 (live DB inventory), 37 (API inventory), 38 (SEO/OG/PWA handoff)
before making relevant changes."

This file is the system source of truth for Finkoin (money-os).
Update it after every significant change (flows, APIs, schema, UX).
Last full sync: 2026-08-04 — app v0.4.0+ (tracker month unlock, Split iOS join, OG SEO, DB audit notes).
Companion docs: `docs/README.md`, `docs/CORE_ARCHITECTURE.md`, `docs/DATA_AND_STORES.md`,
`docs/API_REFERENCE.md`, `docs/PRODUCT_SURFACE.md`, `docs/FUNCTIONS_REFERENCE.md`,
`docs/DESIGN_SYSTEM.md`, `docs/ENV_AND_SCRIPTS.md`, `tests/TESTING.md`,
`supabase/USER_DATA_AUDIT_NOTES.sql` (read-only SQL for per-user DB audits).
---

## TABLE OF CONTENTS

1. Product Overview
2. Tech Stack
3. Environment Variables
4. Folder Structure
5. Database Schema
6. Data Models
7. Zustand Stores
8. Financial Engine Rules
9. Priority Engine Rules
10. API Routes
11. RAG System
12. Caching Strategy
13. Auth Flow
14. Page Flows
15. Gamification
16. Insurance Marketplace
17. Known Issues and TODOs
18. How to Make Common Changes
19. Deployment
20. Revenue Model
21. Complete Form Fields
22. Exact Financial Rules
23. AI Prompt Content
24. Life Stage Business Rules
25. Component Relationships
26. Quick Reference Card
27. What Not to Touch
28. Progressive Web App (PWA)
29. Analytics & GA4 (product telemetry)
30. Precise Flow Runbooks (line-by-line)
31. Complete Feature Catalog (routes + outcome)
32. Requirements → Solution → Outcome
33. Test Suite
34. Split Schema (runtime tables)
35. Home / Profile / Navigation UX (2026-07-18)
36. Live database inventory (used vs unused, encryption, audit SQL)
37. Complete backend API inventory (every `app/api/**/route.ts`)
38. SEO / Open Graph / Share / Calculator surfaces (2026-08-04)
39. Sync matrix (client ↔ Supabase ↔ server)

# FINKOIN SYSTEM DOCUMENTATION

Last updated: 2026-07-18 (full codebase sync)  
Doc / app version: **0.4.0** (`package.json`)  
Generated from: actual codebase at `/Users/himanshukumar/Desktop/money-os`  
Canonical site: **https://www.finkoin.com**

---

## TEST STATUS

Last run: 2026-08-02T17:35:01.197Z
Unit tests: 500/500 passing
Failed: 0

Living docs:

- `docs/README.md`
- `docs/PRODUCT_SURFACE.md`
- `docs/API_REFERENCE.md`
- `docs/CORE_ARCHITECTURE.md`
- `docs/DATA_AND_STORES.md`
- `docs/FUNCTIONS_REFERENCE.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/ENV_AND_SCRIPTS.md`
- `docs/TESTING.md`

## 1. PRODUCT OVERVIEW

Finkoin is a Next.js web app for Indian personal finance planning, analysis, and guided action.  
It is built for Indian users who want structured budgeting, insurance and debt checks, portfolio/goals tracking, expense tracking, bill splitting (**FK Split**), and a personalized AI “fix plan.”

**Marketing promise (landing):** Free financial health check in ~5 minutes — emergency fund, insurance gap, net worth, and a clear fix plan. **No PAN. No Aadhaar** required for the core check.

**Core value proposition:** Collect profile + money data once → run **deterministic** finance logic in code (`lib/financialEngine.ts`, `lib/priorityEngine.ts`, `lib/universal-buckets.ts`) → optionally augment with **RAG-grounded Groq AI** explanations → unlock deeper fix-plan via **₹99 Razorpay** or **FK tokens**.

**Major product surfaces:**

| Surface            | Route(s)                                            | Outcome for user                                                         |
| ------------------ | --------------------------------------------------- | ------------------------------------------------------------------------ |
| Landing / PWA home | `/`                                                 | Health-check CTA, hero carousel, mobile quick tools                      |
| Analyse            | `/analyse` → `/analyse/result` → `/analyse/fixplan` | Score, checklist, buckets, AI fix plan                                   |
| Calculators        | `/calculators`, `/calculators/tax-regime-2026`      | SIP/SWP/EMI/tax/FIRE/PPF/etc.                                            |
| Tracker            | `/tracker`, `/tracker/[month]`                      | Monthly spend + Month Safety Pulse + **financial obligations checklist** |
| Split              | `/split`, `/split/[groupId]`, `/split/join`         | Groups, open invite links, settle-up                                     |
| Profile / assets   | `/profile`, `/investments`                          | Editable assets synced app-wide                                          |
| Rewards / refer    | `/rewards`, `/refer`, `/leaderboard`                | FK gamification                                                          |
| Policies           | `/policies`, `/insurance`                           | Policy vault + marketplace shell                                         |
| Learn / blog       | `/learn`, `/blog`                                   | Education + SEO content                                                  |
| Legal              | `/legal/*`                                          | Privacy, terms, refund, disclaimer                                       |

**Auth:** Supabase (email + Google OAuth + optional phone OTP helpers). **Not Firebase.**  
**Payments:** Razorpay. **Email:** Resend (split invites + tips). **Analytics:** GA4 + Microsoft Clarity (optional env).

---

## 2. TECH STACK

| Package               | Version            | Purpose                                                                                                                    |
| --------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| @hookform/resolvers   | ^3.9.1             | Zod integration with react-hook-form                                                                                       |
| @supabase/supabase-js | ^2.103.0           | Supabase auth + database client                                                                                            |
| @supabase/ssr         | ^0.10.2            | Cookie-aligned browser/server Supabase clients + middleware session refresh                                                |
| clsx                  | ^2.1.1             | Conditional class names                                                                                                    |
| framer-motion         | ^11.18.2           | Animations/transitions                                                                                                     |
| groq-sdk              | ^1.1.2             | Groq API client for AI route                                                                                               |
| jspdf                 | ^4.2.1             | Client-side PDF report generation                                                                                          |
| next                  | ^14.2.35           | Framework (App Router)                                                                                                     |
| react                 | ^18.3.1            | UI library                                                                                                                 |
| react-dom             | ^18.3.1            | DOM renderer                                                                                                               |
| react-hook-form       | ^7.53.2            | Form state/validation flow                                                                                                 |
| recharts              | ^2.13.3            | Chart rendering                                                                                                            |
| xlsx                  | ^0.18.5            | Excel export utilities                                                                                                     |
| zod                   | ^3.23.8            | Schema validation/types                                                                                                    |
| zustand               | ^5.0.1             | Client state stores                                                                                                        |
| @eslint/eslintrc      | ^3.2.0             | ESLint config helpers                                                                                                      |
| @types/node           | ^20                | TS Node types                                                                                                              |
| @types/react          | ^18                | TS React types                                                                                                             |
| @types/react-dom      | ^18                | TS React DOM types                                                                                                         |
| eslint                | ^9.21.0            | Linting                                                                                                                    |
| eslint-config-next    | ^15.2.4            | Next lint rules                                                                                                            |
| postcss               | ^8                 | CSS processing                                                                                                             |
| tailwindcss           | ^3.4.1             | Utility CSS                                                                                                                |
| typescript            | ^5                 | Type checking                                                                                                              |
| vitest                | ^4.1.2             | Unit tests                                                                                                                 |
| next-pwa              | (see package.json) | Service worker + Workbox; installable PWA in production builds                                                             |
| sharp                 | (dev)              | Generates `public/icons/` and `public/splash/` assets via `scripts/generate-icons.mjs` and `scripts/generate-splashes.mjs` |

---

## 3. ENVIRONMENT VARIABLES

| Variable                                                       | Required                              | Purpose                                                                                                        | Where to get                                  |
| -------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| NEXT_PUBLIC_SUPABASE_URL                                       | Yes                                   | Public Supabase URL for browser + server clients                                                               | Supabase project settings                     |
| NEXT_PUBLIC_SUPABASE_ANON_KEY                                  | Yes                                   | Public anon key for browser auth/db calls                                                                      | Supabase project settings                     |
| SUPABASE_SERVICE_ROLE_KEY                                      | Yes (server features)                 | Server/admin Supabase operations (`supabaseServer`)                                                            | Supabase project settings                     |
| GROQ_API_KEY                                                   | Yes (AI plan)                         | Groq API key used by `/api/ai/analyse`                                                                         | Groq console                                  |
| NEXT_PUBLIC_APP_URL                                            | Recommended                           | App URL used in UI/runtime references                                                                          | Deployment URL                                |
| NEXT_PUBLIC_APP_NAME                                           | Optional                              | Branding name string                                                                                           | Internal config                               |
| NEXT_PUBLIC_SKIP_PAYMENT                                       | Optional                              | Payment bypass for dev/test access logic                                                                       | Internal config                               |
| NEXT_PUBLIC_ADMIN_EMAIL                                        | Optional                              | Admin email marker                                                                                             | Internal config                               |
| RAZORPAY_KEY_ID                                                | Yes (Razorpay API route)              | Razorpay order creation ID                                                                                     | Razorpay dashboard                            |
| RAZORPAY_KEY_SECRET                                            | Yes (Razorpay API route)              | Razorpay order creation secret                                                                                 | Razorpay dashboard                            |
| NEXT_PUBLIC_RAZORPAY_KEY_ID                                    | Yes (client payment UI)               | Client-side Razorpay key for checkout                                                                          | Razorpay dashboard                            |
| NEXT_PUBLIC_FINKOIN_AGENT_CODE                                 | Optional                              | Agent code used in policy transfer links                                                                       | Internal config                               |
| NEXT_PUBLIC_SITE_URL                                           | Recommended                           | Metadata/sitemap/robots canonical URL                                                                          | Deployment URL                                |
| NEXT_PUBLIC_GA_MEASUREMENT_ID                                  | Optional                              | GA4 Measurement ID (`G-xxxxxxxxxx`). When set, loads gtag + enriched events; omit to disable analytics scripts | Google Analytics → Admin → Data streams → Web |
| NEXT_PUBLIC_CLARITY_ID                                         | Optional                              | Microsoft Clarity project ID loaded by `components/ClarityScript.tsx`                                          | Clarity project settings                      |
| RESEND_API_KEY                                                 | Optional (split invites + tip emails) | Resend API key for split invite emails and notification tip emails                                             | [Resend dashboard](https://resend.com)        |
| EMAIL_FROM                                                     | Optional (emails)                     | Sender identity (e.g. `tips@finkoin.com` / verified domain)                                                    | Verified sender/domain in Resend              |
| CRON_SECRET                                                    | Yes (cron tip + obligation reminders) | Bearer secret for tip + `/api/obligations/reminders` (Vercel cron)                                             | Generate a long random string                 |
| NEXT_PUBLIC_DEBUG_AI                                           | Optional                              | AI debug logging in client service                                                                             | Internal config                               |
| NEXT_PUBLIC_AI_TIMEOUT_MS                                      | Optional                              | Client-side AI timeout override                                                                                | Internal config                               |
| NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY                          | Yes (device push tips)                | Web Push **public** VAPID key (browser subscribe). Generate with `npx web-push generate-vapid-keys`            | Same command; also `.env.local` / Vercel      |
| WEB_PUSH_VAPID_PRIVATE_KEY                                     | Yes (device push tips)                | Web Push **private** VAPID key — **server-only**, never `NEXT_PUBLIC_`                                         | Same generate command                         |
| WEB_PUSH_VAPID_SUBJECT                                         | Optional                              | Contact for push services (`mailto:support@finkoin.com` or https URL)                                          | Default mailto in code                        |
| NEXT_PUBLIC_FEEDBACK_GOOGLE_FORM_URL                           | Optional                              | When set, Feedback button opens Google Form only (no DB write)                                                 | Google Forms                                  |
| GOOGLE*FEEDBACK_FORM_RESPONSE_URL / `GOOGLE_FEEDBACK_ENTRY*\*` | Optional (server)                     | Mirror in-app wizard answers to a Google Form                                                                  | Google Forms HTML / prefilled link            |

### 3.1 Secret hygiene (what you should do)

1. **Keep real values only in** `.env.local` (local) and **Vercel → Environment Variables** (hosted). Never commit `.env.local` — it is **gitignored**; use **`.env.example`** only as a blank template (no live keys).
2. **Never prefix server secrets with `NEXT_PUBLIC_`.** Anything `NEXT_PUBLIC_*` is embedded in the browser bundle. Safe there: Supabase **anon** key (RLS-enforced), Razorpay **Key ID**, GA Measurement ID. **Never** expose: `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `GROQ_API_KEY`.
3. **Run `npm run check:secrets` before PRs.** Script: `scripts/check-server-secrets-scope.mjs` — fails if `process.env.SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, or `GROQ_API_KEY` appears outside `app/api/**`, `lib/supabaseServer.ts`, or `scripts/`.
4. **Rotate keys** if they were ever pasted into chat, committed, or exposed in a screenshot.

### 3.2 Tax calculator (`lib/tax*` + `TaxRegimeCalculator`) — client vs server

- **Current design:** All regime math runs **in the browser** (`lib/taxRegimeComparisonFY2026.ts`, helpers, UI). That gives instant feedback and works offline after load.
- **Security reality:** Slabs and deduction rules are **public law**, not proprietary secrets; a competitor can reimplement from the Income Tax Act. Moving logic to **`/api/...`** would **not** hide it from someone who calls the API, but would add latency and hosting cost.
- **Recommendation:** **Keep tax computation client-side** unless you add **authenticated**, rate-limited server endpoints for another reason (e.g. audit logs only server-side). **Do keep** payment verification and AI (`GROQ_API_KEY`) strictly server-side — already the case.

---

## 4. FOLDER STRUCTURE

Complete inventory with one-line purpose per file:

| Path                                                      | Purpose                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                                               | Project overview, setup, and known constraints                                                                                                                                                                                                                                                                                                      |
| `package.json`                                            | Scripts and dependency manifest                                                                                                                                                                                                                                                                                                                     |
| `package-lock.json`                                       | NPM lockfile                                                                                                                                                                                                                                                                                                                                        |
| `scripts/check-server-secrets-scope.mjs`                  | CI/dev guard: server env vars only in API / `supabaseServer` (`npm run check:secrets`)                                                                                                                                                                                                                                                              |
| `.gitignore`                                              | Git ignore rules                                                                                                                                                                                                                                                                                                                                    |
| `next-env.d.ts`                                           | Next.js TypeScript ambient types                                                                                                                                                                                                                                                                                                                    |
| `next.config.mjs`                                         | Next runtime/build configuration                                                                                                                                                                                                                                                                                                                    |
| `tsconfig.json`                                           | TypeScript compiler settings                                                                                                                                                                                                                                                                                                                        |
| `tailwind.config.ts`                                      | Tailwind theme/content setup                                                                                                                                                                                                                                                                                                                        |
| `postcss.config.mjs`                                      | PostCSS plugin setup                                                                                                                                                                                                                                                                                                                                |
| `eslint.config.mjs`                                       | ESLint configuration                                                                                                                                                                                                                                                                                                                                |
| `vitest.config.ts`                                        | Vitest configuration                                                                                                                                                                                                                                                                                                                                |
| `middleware.ts`                                           | Supabase session refresh + protected-route gate                                                                                                                                                                                                                                                                                                     |
| `FINKOIN_SYSTEM.md`                                       | This documentation file                                                                                                                                                                                                                                                                                                                             |
| `.expo/settings.json`                                     | Local editor/tooling settings                                                                                                                                                                                                                                                                                                                       |
| `public/logo.png`                                         | Public logo asset                                                                                                                                                                                                                                                                                                                                   |
| `public/manifest.json`                                    | Web app manifest (name, icons, shortcuts, display) for PWA install                                                                                                                                                                                                                                                                                  |
| `public/icons/`                                           | PWA / Apple touch icons (`icon-{size}x{size}.png`), generated from logo                                                                                                                                                                                                                                                                             |
| `public/splash/`                                          | Apple launch images (`apple-splash-*.png`), generated                                                                                                                                                                                                                                                                                               |
| `public/screenshots/`                                     | Manifest store screenshots (e.g. `home.png`)                                                                                                                                                                                                                                                                                                        |
| `scripts/generate-icons.mjs`                              | Resize logo (or fallback) into manifest icon set + optional screenshot                                                                                                                                                                                                                                                                              |
| `scripts/generate-splashes.mjs`                           | Generate iOS splash PNGs                                                                                                                                                                                                                                                                                                                            |
| `public/assets/brand/finkoin-icon-1024.svg`               | Brand icon used in metadata                                                                                                                                                                                                                                                                                                                         |
| `app/layout.tsx`                                          | Root layout + global wrappers/navbar + mounts **`GoogleAnalytics`** when GA env is set                                                                                                                                                                                                                                                              |
| `pages/_document.tsx`                                     | Minimal Pages Router **`Document`** so **`next-pwa`** build can resolve `/_document` (App Router project compatibility)                                                                                                                                                                                                                             |
| `app/page.tsx`                                            | Landing page                                                                                                                                                                                                                                                                                                                                        |
| `app/globals.css`                                         | Global CSS styles                                                                                                                                                                                                                                                                                                                                   |
| `app/robots.ts`                                           | Robots metadata endpoint                                                                                                                                                                                                                                                                                                                            |
| `app/sitemap.ts`                                          | Sitemap metadata endpoint                                                                                                                                                                                                                                                                                                                           |
| `app/analyse/page.tsx`                                    | **`ConsentModal`** gate → **`AnalyseOnboardingForm`**; consent cached per user in **`localStorage`** (`finkoin_analyse_consent_v2_<userId>`); on cache miss reads **`users.data_consent_given`**; on accept **`UPDATE users`** sets **`data_consent_given`**, **`data_consent_at`**, **`data_consent_version`** (`v2`)                              |
| `app/analyse/result/page.tsx`                             | Analysis result/paywall flow                                                                                                                                                                                                                                                                                                                        |
| `app/analyse/fixplan/page.tsx`                            | Full AI fix-plan page with cache/access gating                                                                                                                                                                                                                                                                                                      |
| `app/login/page.tsx`                                      | Email login/signup + Google OAuth entry                                                                                                                                                                                                                                                                                                             |
| `app/auth/callback/page.tsx`                              | OAuth / email-link callback (PKCE code exchange)                                                                                                                                                                                                                                                                                                    |
| `app/auth/reset-password/page.tsx`                        | Request password reset email                                                                                                                                                                                                                                                                                                                        |
| `app/auth/update-password/page.tsx`                       | Set new password after recovery link                                                                                                                                                                                                                                                                                                                |
| `components/AppInitializer.tsx`                           | Client gate: Zustand persist rehydrate then **`initAuth()`** before app shell; **`initStartedRef`** avoids double auth init under React Strict Mode (dev)                                                                                                                                                                                           |
| `app/optimizer/page.tsx`                                  | Optimizer page                                                                                                                                                                                                                                                                                                                                      |
| `app/insurance/page.tsx`                                  | Insurance marketplace placeholder/comparison entry                                                                                                                                                                                                                                                                                                  |
| `app/policies/page.tsx`                                   | Policy vault page wrapper                                                                                                                                                                                                                                                                                                                           |
| `app/profile/page.tsx`                                    | User profile page                                                                                                                                                                                                                                                                                                                                   |
| `app/portfolio/page.tsx`                                  | Portfolio analysis page                                                                                                                                                                                                                                                                                                                             |
| `app/investments/page.tsx`                                | Investments placeholder page                                                                                                                                                                                                                                                                                                                        |
| `app/goals/page.tsx`                                      | Goals placeholder page                                                                                                                                                                                                                                                                                                                              |
| `app/tracker/page.tsx`                                    | Expense tracker home: month nav, privacy eye flip, bucket cards, **obligations checklist**, **Month Safety Pulse**                                                                                                                                                                                                                                  |
| `app/tracker/[month]/page.tsx`                            | Historical month detail (`YYYY-MM`) with table + summary bars                                                                                                                                                                                                                                                                                       |
| `components/tracker/MonthSafetyPulse.tsx`                 | Safe/Tight/Over coaching card (MoM + one action)                                                                                                                                                                                                                                                                                                    |
| `components/tracker/TrackerIcons.tsx`                     | Purple stroke SVG icons for tracker categories/types                                                                                                                                                                                                                                                                                                |
| `components/tracker/AddExpenseModal.tsx`                  | Add/edit expense sheet with bucket + type picker                                                                                                                                                                                                                                                                                                    |
| `components/tracker/ObligationsChecklist.tsx`             | This-month obligations card + add modal + learn suggestion                                                                                                                                                                                                                                                                                          |
| `components/tracker/AddObligationForm.tsx`                | Manual obligation create sheet                                                                                                                                                                                                                                                                                                                      |
| `components/forms/ObligationDateFields.tsx`               | Shared month/day + day-of-month pickers for analyse + advisor                                                                                                                                                                                                                                                                                       |
| `store/obligationStore.ts`                                | Zustand: obligations CRUD, monthly checklist, sync from health check                                                                                                                                                                                                                                                                                |
| `app/api/obligations/reminders/route.ts`                  | Cron: insert `user_notifications` when remind_days_before matches                                                                                                                                                                                                                                                                                   |
| `supabase/migrations/036_financial_obligations.sql`       | `financial_obligations`, `obligation_checklist`, `generate_monthly_checklist()`                                                                                                                                                                                                                                                                     |
| `components/tracker/ExpenseTable.tsx`                     | Month expense table rows                                                                                                                                                                                                                                                                                                                            |
| `components/tracker/MonthSummary.tsx`                     | Bucket progress bars for month detail                                                                                                                                                                                                                                                                                                               |
| `components/tracker/TrackerConsent.tsx`                   | Tracker data-consent gate                                                                                                                                                                                                                                                                                                                           |
| `lib/tracker-categories.ts`                               | Buckets, % caps, subcategories, `pickerSubcategories` / `findSubcategory`                                                                                                                                                                                                                                                                           |
| `lib/trackerSafetyPulse.ts`                               | Deterministic month safety analytics engine (no AI)                                                                                                                                                                                                                                                                                                 |
| `lib/trackerProfileIncome.ts`                             | Cached analyse-profile salary fallback for tracker income                                                                                                                                                                                                                                                                                           |
| `app/kyc/page.tsx`                                        | KYC status page                                                                                                                                                                                                                                                                                                                                     |
| `app/refer/page.tsx`                                      | Referral page                                                                                                                                                                                                                                                                                                                                       |
| `app/rewards/page.tsx`                                    | Rewards page                                                                                                                                                                                                                                                                                                                                        |
| `app/leaderboard/page.tsx`                                | Leaderboard page                                                                                                                                                                                                                                                                                                                                    |
| `app/learn/page.tsx`                                      | Learn hub listing page                                                                                                                                                                                                                                                                                                                              |
| `app/learn/[id]/page.tsx`                                 | Individual article page                                                                                                                                                                                                                                                                                                                             |
| `app/calculators/page.tsx`                                | Calculators hub + **conditional JSON-LD** (**`WebApplication`** when **`tax-regime`** active)                                                                                                                                                                                                                                                       |
| `app/calculators/layout.tsx`                              | Calculators layout wrapper                                                                                                                                                                                                                                                                                                                          |
| `app/calculators/CalculatorsClient.tsx`                   | Client calculator index rendering; **`trackToolOpen`** on active calculator change                                                                                                                                                                                                                                                                  |
| `app/calculators/tax-regime-2026/page.tsx`                | Dedicated tax regime landing with **`WebApplication`** JSON-LD + metadata                                                                                                                                                                                                                                                                           |
| `app/calculators/calculator-config.ts`                    | Calculator metadata config                                                                                                                                                                                                                                                                                                                          |
| `app/calculators/[id]/page.tsx`                           | Dynamic calculator page                                                                                                                                                                                                                                                                                                                             |
| `app/plans/page.tsx`                                      | Subscription plans page (contains TODO Razorpay note)                                                                                                                                                                                                                                                                                               |
| `app/pricing/page.tsx`                                    | Pricing placeholder page                                                                                                                                                                                                                                                                                                                            |
| `app/privacy/page.tsx`                                    | Redirects to `/legal/privacy`                                                                                                                                                                                                                                                                                                                       |
| `app/terms/page.tsx`                                      | Redirects to `/legal/terms`                                                                                                                                                                                                                                                                                                                         |
| `app/legal/privacy/page.tsx`                              | Privacy Policy (India / DPDP 2023–aligned content)                                                                                                                                                                                                                                                                                                  |
| `app/legal/terms/page.tsx`                                | Terms of Service                                                                                                                                                                                                                                                                                                                                    |
| `app/legal/refund/page.tsx`                               | Refund Policy (Razorpay / digital goods)                                                                                                                                                                                                                                                                                                            |
| `app/legal/disclaimer/page.tsx`                           | Legal disclaimer page                                                                                                                                                                                                                                                                                                                               |
| `app/api/ai/analyse/route.ts`                             | AI analysis API route                                                                                                                                                                                                                                                                                                                               |
| `app/api/razorpay/checkout-config/route.ts`               | Razorpay Key ID for Standard Checkout (server → frontend)                                                                                                                                                                                                                                                                                           |
| `app/api/razorpay/create-order/route.ts`                  | Razorpay order API route                                                                                                                                                                                                                                                                                                                            |
| `app/api/razorpay/verify-payment/route.ts`                | Razorpay payment signature verification + pro tier                                                                                                                                                                                                                                                                                                  |
| `components/global-navbar.tsx`                            | Main header/navbar + profile dropdown (backdrop, scroll lock); **`data-track-nav-zone`** + delegated **`nav_click`** analytics                                                                                                                                                                                                                      |
| `components/GoogleAnalytics.tsx`                          | GA4 scripts + SPA **`page_path`** via **`gtag('config')`**, **`user_properties`**, merges **`getAnalyticsContext()`**, logged-in **`user_id`**                                                                                                                                                                                                      |
| `components/AnalyticsBehavior.tsx`                        | Per-route scroll-depth milestones (25/50/75/90%) → **`scroll_depth`** event                                                                                                                                                                                                                                                                         |
| `components/TrackImpression.tsx`                          | **`IntersectionObserver`** wrapper → **`element_impression`** once per **`component_id`**                                                                                                                                                                                                                                                           |
| `components/auth/ProtectedGate.tsx`                       | Client gate: wait **`hasInitialized`** then enforce **`isLoggedIn`**                                                                                                                                                                                                                                                                                |
| `components/ReferralCapture.tsx`                          | Captures **`?ref=`** into **`sessionStorage`** for post-login attribution                                                                                                                                                                                                                                                                           |
| `lib/referralRewards.ts`                                  | Applies pending referral + FK bumps after successful **`/auth/callback`**                                                                                                                                                                                                                                                                           |
| `components/AuthSessionSync.tsx`                          | Sync Supabase session into auth store                                                                                                                                                                                                                                                                                                               |
| `components/FinancialStoreAuthSync.tsx`                   | Rehydrate financial store on auth user switch                                                                                                                                                                                                                                                                                                       |
| `components/ScrollToTopOnRouteChange.tsx`                 | Scroll reset on route change                                                                                                                                                                                                                                                                                                                        |
| `components/RenewalReminderBanner.tsx`                    | Renewal reminder banner                                                                                                                                                                                                                                                                                                                             |
| `components/analyse/analyse-result-error-boundary.tsx`    | Result page error boundary                                                                                                                                                                                                                                                                                                                          |
| `components/analyse/paywall-modal.tsx`                    | Unlock confirmation modal for fix-plan access                                                                                                                                                                                                                                                                                                       |
| `components/forms/analyse-onboarding-form.tsx`            | Core 7-step intake form logic/UI                                                                                                                                                                                                                                                                                                                    |
| `components/forms/onboarding-wizard.tsx`                  | Onboarding wizard component                                                                                                                                                                                                                                                                                                                         |
| `components/forms/onboarding-step-basics.tsx`             | Onboarding basics step                                                                                                                                                                                                                                                                                                                              |
| `components/forms/onboarding-step-goals.tsx`              | Onboarding goals step                                                                                                                                                                                                                                                                                                                               |
| `components/forms/onboarding-step-complete.tsx`           | Onboarding completion step                                                                                                                                                                                                                                                                                                                          |
| `components/finkoin/finkoin-ai-plan-view.tsx`             | Render AI plan sections                                                                                                                                                                                                                                                                                                                             |
| `components/finkoin/optimizer-full-sections.tsx`          | Full optimizer section components                                                                                                                                                                                                                                                                                                                   |
| `components/finkoin/MonthlyAllocationPieChart.tsx`        | Monthly allocation pie chart                                                                                                                                                                                                                                                                                                                        |
| `components/policies/PolicyVaultClient.tsx`               | Policy CRUD, renewal, transfer workflows                                                                                                                                                                                                                                                                                                            |
| `components/learn/learn-hub.tsx`                          | Learn hub UI                                                                                                                                                                                                                                                                                                                                        |
| `components/learn/article-tracker.tsx`                    | Tracks article reads and rewards                                                                                                                                                                                                                                                                                                                    |
| `components/learn/article-share.tsx`                      | Article share helper                                                                                                                                                                                                                                                                                                                                |
| `components/learn/share-button.tsx`                       | Share / clipboard UI + **`share`** GA events (native / clipboard / fallback)                                                                                                                                                                                                                                                                        |
| `components/landing/Footer.tsx`                           | Landing footer                                                                                                                                                                                                                                                                                                                                      |
| `components/landing/FeatureCardsCarousel.tsx`             | Landing feature carousel                                                                                                                                                                                                                                                                                                                            |
| `components/ui/button.tsx`                                | Button primitives                                                                                                                                                                                                                                                                                                                                   |
| `components/ui/MoneyInput.tsx`                            | Currency input with Indian formatting                                                                                                                                                                                                                                                                                                               |
| `components/ui/PrivateAmount.tsx`                         | Privacy-aware amount: hidden by default, eye reveals; eye omitted when value is 0 / no data. Used for income displays app-wide                                                                                                                                                                                                                      |
| `components/ui/NumberInput.tsx`                           | Reusable number input matching MoneyInput style with optional suffix                                                                                                                                                                                                                                                                                |
| `components/ui/SpeedoMeter.tsx`                           | Multi-gauge speedometer component                                                                                                                                                                                                                                                                                                                   |
| `components/ui/BottomSheet.tsx`                           | Bottom sheet UI                                                                                                                                                                                                                                                                                                                                     |
| `components/ui/Toast.tsx`                                 | Toast UI                                                                                                                                                                                                                                                                                                                                            |
| `components/ui/LoginSheet.tsx`                            | Login bottom sheet (optional; primary auth is **`/login`**)                                                                                                                                                                                                                                                                                         |
| `components/ui/brand-logo.tsx`                            | Brand logo UI                                                                                                                                                                                                                                                                                                                                       |
| `components/ui/ScrollSection.tsx`                         | Scroll section wrapper                                                                                                                                                                                                                                                                                                                              |
| `components/ui/AnimateOnScroll.tsx`                       | Scroll animation wrapper                                                                                                                                                                                                                                                                                                                            |
| `components/ui/SectionToggle.tsx`                         | Toggleable section wrapper                                                                                                                                                                                                                                                                                                                          |
| `components/ui/ChipSelector.tsx`                          | Chip selector UI                                                                                                                                                                                                                                                                                                                                    |
| `components/ui/GoalCard.tsx`                              | Goal card UI                                                                                                                                                                                                                                                                                                                                        |
| `components/calculators/calculator-ui.tsx`                | Shared calculator UI primitives                                                                                                                                                                                                                                                                                                                     |
| `components/calculators/lazy-calculators.tsx`             | Lazy-loaded calculator map                                                                                                                                                                                                                                                                                                                          |
| `components/calculators/SIPCalculator.tsx`                | SIP calculator                                                                                                                                                                                                                                                                                                                                      |
| `components/calculators/EMICalculator.tsx`                | EMI calculator                                                                                                                                                                                                                                                                                                                                      |
| `components/calculators/HomeLoanCalculator.tsx`           | Home loan calculator                                                                                                                                                                                                                                                                                                                                |
| `components/calculators/CarLoanCalculator.tsx`            | Car loan calculator                                                                                                                                                                                                                                                                                                                                 |
| `components/calculators/RentVsBuyCalculator.tsx`          | Rent vs buy calculator                                                                                                                                                                                                                                                                                                                              |
| `components/calculators/RentVsOwnCarCalculator.tsx`       | Rent vs own car calculator                                                                                                                                                                                                                                                                                                                          |
| `components/calculators/WhenToBuyCarCalculator.tsx`       | Car purchase timing calculator                                                                                                                                                                                                                                                                                                                      |
| `components/calculators/PostOfficeCalculator.tsx`         | Post-office scheme calculator                                                                                                                                                                                                                                                                                                                       |
| `components/calculators/PPFCalculator.tsx`                | PPF calculator                                                                                                                                                                                                                                                                                                                                      |
| `components/calculators/NSCCalculator.tsx`                | NSC calculator                                                                                                                                                                                                                                                                                                                                      |
| `components/calculators/SWPCalculator.tsx`                | SWP calculator                                                                                                                                                                                                                                                                                                                                      |
| `components/calculators/EmergencyFundCalculator.tsx`      | Emergency fund calculator                                                                                                                                                                                                                                                                                                                           |
| `components/calculators/TaxRegimeCalculator.tsx`          | Old vs new regime UI: **`TAX_CALC_SCHEMA_VERSION`** autosave **`finkoin_tax_calculator`**, meal voucher exemption (₹50 vs ₹200 cap toggle), **`<details>`** steps + mobile 3-col comparison table, suggested **ITR** from inputs, removed MF-dividend field; Personal CA scroll-unlock; conditional missed-deduction nudges when old regime can win |
| `components/calculators/ToggleSection.tsx`                | Section on/off + separate chevron expand/collapse for inner fields                                                                                                                                                                                                                                                                                  |
| `lib/taxCalculatorHelpers.ts`                             | Illustrative gratuity / leave / LTA / rental / business / pension / RSU helpers for tax UI                                                                                                                                                                                                                                                          |
| `lib/taxRegimeComparisonFY2026.ts`                        | Pure tax comparison (**ComparisonInputs** incl. **`mealVoucherExemptionAnnual`** subtracted from salary), slabs, HRA, 80GG illustrative, surcharge, cess, 87A model                                                                                                                                                                                 |
| `lib/taxMissedDeductionAlerts.ts`                         | Missed-deduction strings; **`encourageDeductionInvestment`** flag suppresses 80C/HRA-style nudges when new regime already wins                                                                                                                                                                                                                      |
| `components/calculators/compound-interest-calculator.tsx` | Compound interest calculator                                                                                                                                                                                                                                                                                                                        |
| `components/calculators/spending-trend-chart.tsx`         | Spending chart component                                                                                                                                                                                                                                                                                                                            |
| `lib/analyse-form-schema.ts`                              | Form schema, normalization, shared model types                                                                                                                                                                                                                                                                                                      |
| `lib/analyse-form-schema.test.ts`                         | Schema/unit tests                                                                                                                                                                                                                                                                                                                                   |
| `lib/financialEngine.ts`                                  | Deterministic analysis engine                                                                                                                                                                                                                                                                                                                       |
| `lib/financialEngine.test.ts`                             | Financial engine tests                                                                                                                                                                                                                                                                                                                              |
| `lib/priorityEngine.ts`                                   | Priority-plan engine for fix plan                                                                                                                                                                                                                                                                                                                   |
| `lib/universal-buckets.ts`                                | Bucket caps/actuals/status logic                                                                                                                                                                                                                                                                                                                    |
| `lib/bucket-breakdown.ts`                                 | Breakdown helpers for bucket display                                                                                                                                                                                                                                                                                                                |
| `lib/speedo-meter-buckets.ts`                             | Speedometer input-builder helpers                                                                                                                                                                                                                                                                                                                   |
| `lib/financialOptimizer.ts`                               | Optimizer logic                                                                                                                                                                                                                                                                                                                                     |
| `lib/optimizer-format.ts`                                 | Optimizer formatting helpers                                                                                                                                                                                                                                                                                                                        |
| `lib/finkoinAiPlan.ts`                                    | AI plan type schema/validation helpers                                                                                                                                                                                                                                                                                                              |
| `lib/aiService.ts`                                        | Client AI orchestration                                                                                                                                                                                                                                                                                                                             |
| `lib/aiProviderMessages.ts`                               | AI/provider message helpers                                                                                                                                                                                                                                                                                                                         |
| `lib/cache.ts`                                            | Profile hash + local/supabase AI cache                                                                                                                                                                                                                                                                                                              |
| `lib/generatePDF.ts`                                      | Multi-page optimizer/fix-plan PDF report generator                                                                                                                                                                                                                                                                                                  |
| `lib/payment.ts`                                          | Access check + FK redemption logic                                                                                                                                                                                                                                                                                                                  |
| `lib/auth.ts`                                             | Auth helper methods                                                                                                                                                                                                                                                                                                                                 |
| `lib/supabase.ts`                                         | Browser `createBrowserClient` singleton (`getSupabase`) + lazy `supabase` proxy                                                                                                                                                                                                                                                                     |
| `lib/supabaseClient.ts`                                   | Re-exports browser helpers                                                                                                                                                                                                                                                                                                                          |
| `lib/supabaseServer.ts`                                   | `createSupabaseServerClient()` (cookies) + lazy service-role admin proxy                                                                                                                                                                                                                                                                            |
| `lib/userAnalyseSnapshot.ts`                              | Snapshot fetch/upsert helpers                                                                                                                                                                                                                                                                                                                       |
| `lib/userPolicies.ts`                                     | Policy types and Supabase operations                                                                                                                                                                                                                                                                                                                |
| `lib/kycVerification.ts`                                  | PAN verification mock logic                                                                                                                                                                                                                                                                                                                         |
| `lib/finance.ts`                                          | Financial formatting/math helpers                                                                                                                                                                                                                                                                                                                   |
| `lib/formatters.ts`                                       | Indian number/string format helpers                                                                                                                                                                                                                                                                                                                 |
| `lib/formatINR.ts`                                        | INR formatting helper                                                                                                                                                                                                                                                                                                                               |
| `lib/exportExcel.ts`                                      | Export utilities                                                                                                                                                                                                                                                                                                                                    |
| `lib/netWorth.ts`                                         | Net-worth computation helpers                                                                                                                                                                                                                                                                                                                       |
| `lib/subscriptionBypass.ts`                               | Subscription bypass checks                                                                                                                                                                                                                                                                                                                          |
| `lib/analysisSnapshotValidation.ts`                       | Validation for persisted analysis snapshots                                                                                                                                                                                                                                                                                                         |
| `lib/amortisation.ts`                                     | Loan amortisation helpers                                                                                                                                                                                                                                                                                                                           |
| `lib/animations.ts`                                       | Animation variants                                                                                                                                                                                                                                                                                                                                  |
| `lib/cn.ts`                                               | Classname utility                                                                                                                                                                                                                                                                                                                                   |
| `lib/expense-bucket-recommendations.ts`                   | Bucket recommendation text                                                                                                                                                                                                                                                                                                                          |
| `lib/learnContent.ts`                                     | Learn article content metadata (incl. India taxation / slabs / ITR primer article)                                                                                                                                                                                                                                                                  |
| `lib/blogContent.ts`                                      | Blog article bodies + SEO slugs (incl. **`know-taxation-in-india`**)                                                                                                                                                                                                                                                                                |
| `lib/seo.ts`                                              | **`SITE_URL`** normalization (no trailing slash), canonical helpers                                                                                                                                                                                                                                                                                 |
| `lib/analyticsContext.ts`                                 | Client context for every GA hit: **`app_surface`** (PWA vs browser), **`device_category`**, timezone, language, viewport, optional **`connection_type`**                                                                                                                                                                                            |
| `lib/gtag.ts`                                             | **`trackEvent`** / **`trackCta`** / **`trackShare`** / **`trackImpression`** / **`trackScrollDepth`** / **`trackToolOpen`** / **`trackNavClick`** — all merge **`getAnalyticsContext()`**                                                                                                                                                           |
| `types/gtag.d.ts`                                         | **`window.gtag`** / **`window.dataLayer`** typings                                                                                                                                                                                                                                                                                                  |
| `lib/knowledgeBase/index.ts`                              | Local KB entrypoint                                                                                                                                                                                                                                                                                                                                 |
| `lib/knowledgeBase/entries.ts`                            | Local KB entries                                                                                                                                                                                                                                                                                                                                    |
| `lib/knowledgeBase/retriever.ts`                          | Local KB retrieval logic                                                                                                                                                                                                                                                                                                                            |
| `lib/rag/retriever.ts`                                    | Supabase RAG retrieval logic                                                                                                                                                                                                                                                                                                                        |
| `store/authStore.ts`                                      | Auth Zustand store                                                                                                                                                                                                                                                                                                                                  |
| `store/financialStore.ts`                                 | Financial Zustand store                                                                                                                                                                                                                                                                                                                             |
| `store/gamificationStore.ts`                              | Gamification Zustand store                                                                                                                                                                                                                                                                                                                          |
| `store/portfolioStore.ts`                                 | Portfolio Zustand store                                                                                                                                                                                                                                                                                                                             |
| `store/use-app-store.ts`                                  | App onboarding store                                                                                                                                                                                                                                                                                                                                |
| `store/use-financial-store.ts`                            | Legacy financial store alias/compat                                                                                                                                                                                                                                                                                                                 |
| `supabase/migrations/001_initial.sql`                     | Initial DB schema/migrations                                                                                                                                                                                                                                                                                                                        |
| `supabase/migrations/002_user_analyse_snapshots.sql`      | Snapshot table migration                                                                                                                                                                                                                                                                                                                            |
| `supabase/migrations/003_user_policies.sql`               | User policy schema migration                                                                                                                                                                                                                                                                                                                        |
| `supabase/migrations/003_complete_setup.sql`              | Complete setup + RAG + policies                                                                                                                                                                                                                                                                                                                     |
| `supabase/migrations/004_user_policies_add_status.sql`    | Adds policy status column                                                                                                                                                                                                                                                                                                                           |
| `supabase/migrations/005_fix_snapshots.sql`               | Creates snapshots/analysis tables + RLS                                                                                                                                                                                                                                                                                                             |

### 4.x Incremental inventory updates (2026-06-02)

- `app/split/layout.tsx`: Split route metadata (SEO/open graph).
- `app/split/page.tsx`: protected split home (groups list, create group modal, invite-on-create, soft delete, realtime refresh hooks).
- `app/split/[groupId]/page.tsx`: protected group detail (balances, expenses, invite modal, settle-up, expense delete, creator delete actions).
- `app/split/[groupId]/add-expense/page.tsx`: protected add-expense flow (equal/exact/percentage split UI, amount validation, category/date/notes).
- `app/split/join/page.tsx`: suspense shell for invite-join page.
- `app/split/join/JoinSplitGroupClient.tsx`: invite token auth handoff + join execution via server route + post-join redirect.
- `app/api/split/groups/route.ts`: create group (POST), soft-delete group by creator (DELETE query param `groupId`).
- `app/api/split/groups/[groupId]/route.ts`: hard-delete group and related rows for active admin users.
- `app/api/split/invite/route.ts`: create invitation token, upsert pending member, compose invite URL, optional email delivery via Resend.
- `app/api/split/join/route.ts`: server-authoritative invite acceptance (token validation, invited email match, member activation, invitation accept).
- `app/api/split/expenses/route.ts`: create expense + computed shares + group timestamp bump.
- `app/api/split/expenses/[expenseId]/route.ts`: delete expense + shares (creator or admin only).
- `app/api/split/settle/route.ts`: record settlement and mark matching shares settled.
- `store/splitStore.ts`: split state + actions (fetchGroups, fetchGroupDetail, create/invite/add/settle/delete, cache TTL, net-balance helper).
- `store/notificationStore.ts`: fetch/mark notification state backed by `user_notifications`.
- `components/NotificationBell.tsx`: realtime inbox dropdown with unread badge and mark-all-read behavior.
- `components/MorningTipPopup.tsx`: once-per-day IST tip popup (6 AM–11 PM) using notification store + localStorage suppression key.
- `components/PushPermissionPrompt.tsx`: one-time post-login **Allow notifications** prompt → Web Push subscribe.
- `lib/webPush.ts` / `lib/webPushClient.ts`: server send + client subscribe; `app/api/notifications/push-subscribe`.
- `worker/index.js` (+ `public/sw-push.js` for dev): SW `push` / `notificationclick` handlers.
- `supabase/migrations/035_push_subscriptions.sql`: device push endpoints for OS tip alerts.
- `components/FeedbackWidget.tsx`: lightweight feedback capture widget posting to `/api/feedback`.
- `components/FeedbackPopupManager.tsx`: delayed page-context feedback popup manager on tracked routes.
- `components/ClarityScript.tsx`: client-side Clarity bootstrap (guarded by `NEXT_PUBLIC_CLARITY_ID`).
- `lib/analytics.ts`: GA + Clarity shared event helper methods with compatibility wrappers.
- `.husky/pre-commit`: runs lint-staged plus non-blocking `console.log` warning scan.
- `.husky/pre-push`: runs `tsc --noEmit`; additionally runs `npm run build` only on `production` branch.
- `package.json`: lint-staged currently runs `eslint --fix` + `prettier --write` for TS/TSX; Prettier for JSON/MD/CSS.
- `eslint.config.mjs`: stricter lint rules scoped to split paths (`app/split/**/*`, `app/api/split/**/*`, `store/splitStore.ts`).
- `vercel.json`: daily crons at `0 3 * * *` UTC for `/api/notifications/deliver-tip` and `/api/obligations/reminders`.
- Financial calendar: `store/obligationStore.ts`, tracker checklist UI, analyse date fields, migration `036_financial_obligations.sql`.

### 4.y Incremental inventory updates (2026-07-18 — open invites, profile assets, home mobile)

- `lib/splitInvite.ts`: open-invite marker `OPEN_SPLIT_INVITE_EMAIL = __open__@finkoin.invite` + `isOpenSplitInvite()`.
- `lib/splitInvite.test.ts`: unit tests for open-invite recognition.
- `lib/splitBalances.ts` + `lib/splitBalances.test.ts`: net balances + `simplifyDebts` (min cash-flow).
- `lib/splitShares.ts` + `lib/splitShares.test.ts`: equal / exact / percentage share math.
- `lib/apiGuard.ts`: `getAuthedUser`, `unauthorized`, `tooManyRequests`, in-memory `rateLimit`.
- `lib/profileAssetsPatch.ts` + `lib/profileAssetsPatch.test.ts`: catalogs + patch helpers for cash/investments/physical/liabilities.
- `lib/syncProfileAssets.ts`: `setFullAnalysis` + `upsertUserAnalyseSnapshot` after asset edits.
- `components/profile/ProfileAssets.tsx`: IndMoney-style editable Assets UI with Add menus + privacy eye.
- `components/split/InviteLinkShare.tsx`: copy + WhatsApp share + visible invite URL.
- `components/ui/BackLink.tsx`: `BackLink` (history.back + fallback) and `BackHref` (static link).
- `components/landing/HomeMobileQuickTools.tsx`: mobile-only quick tools under hero (SIP → SWP → Split → Tax → EMI → Portfolio → Analyse).
- `components/landing/HomeHeroCarousel.tsx`: compact mobile banner heights / typography.
- `components/landing/HomePageClient.tsx`: hero + carousel + mobile quick tools; social-proof badge row removed.
- `app/api/split/invite/route.ts`: `linkOnly` / open invites; reuse pending open token; skip pending seat for open links.
- `app/api/split/join/route.ts`: open invites allow any logged-in user; invite stays `pending` for reuse.
- `app/api/split/balances/route.ts`: `GET` membership-checked net + simplified edges.
- `store/splitStore.ts`: `linkOnly` on `inviteMember`; `netBalances` + balances API (not RPC).
- `app/split/page.tsx`: create → invite-link step (no group type); `InviteLinkShare`.
- `app/split/[groupId]/page.tsx`: auto-generate open link on Invite; email optional; `BackHref`.
- Profile / goals / investments / calculators: `BackLink` + mobile bottom-nav padding.
- `app/page.tsx`: hero subtitle `line-clamp-1` on mobile.
- Tests: `profileAssetsPatch`, `splitInvite`, expanded `splitBalances` / `splitShares`.

### 4.z Incremental inventory updates (2026-08-04)

| Path                                                                     | Role                                                    |
| ------------------------------------------------------------------------ | ------------------------------------------------------- |
| `lib/pwaLaunch.ts` + `.test.ts`                                          | Standalone detect; Android-only open-in-app; intent URL |
| `lib/seo.ts` (`socialImageTags`)                                         | Consistent OG/Twitter image tags                        |
| `lib/trackerMonthIncome.ts` (`trackerForwardLimit`, `lastFridayOfMonth`) | Next-month unlock on last Friday                        |
| `lib/calculatorInput.ts`                                                 | Money max + rate decimal helpers                        |
| `lib/postOfficeSchemes.ts`                                               | India Post scheme rates/math (Jul–Sep 2026)             |
| `components/ui/ShareButton.tsx`                                          | Native share / copy for calculators + Learn             |
| `components/SplitInviteResume.tsx`                                       | Resume join (incl. logged-out → login)                  |
| `scripts/generate-og-placeholders.mjs`                                   | Product + blog 1200×630 banners                         |
| `public/og/og-*.png`, `public/og/blog/*.png`                             | Share images                                            |
| `supabase/USER_DATA_AUDIT_NOTES.sql`                                     | Read-only per-user DB audit queries                     |
| `app/calculators/calculator-seo.ts` (`CALC_OG_IMAGE` expanded)           | Per-calc OG paths                                       |

---

## 5. DATABASE SCHEMA

### Table: users

Purpose: App-level user profile extending Supabase auth user.

| Column               | Type        | Description                                                     |
| -------------------- | ----------- | --------------------------------------------------------------- |
| id                   | uuid        | PK, references `auth.users(id)`                                 |
| name                 | text        | Display name                                                    |
| phone                | text        | Phone number                                                    |
| email                | text        | Email                                                           |
| is_admin             | boolean     | Admin flag                                                      |
| referral_code        | text        | Unique referral code                                            |
| referred_by          | text        | Referrer code                                                   |
| subscription_tier    | text        | free/pro/promax                                                 |
| subscription_expiry  | timestamptz | Subscription end                                                |
| fk_balance           | integer     | FK token balance                                                |
| created_at           | timestamptz | Created time                                                    |
| updated_at           | timestamptz | Updated time                                                    |
| data_consent_given   | boolean     | User accepted analyse/financial data processing consent         |
| data_consent_at      | timestamptz | When consent was recorded                                       |
| data_consent_version | text        | Consent copy/version marker (e.g. **`v2`** from **`/analyse`**) |

RLS: `users_own` (auth.uid() == id)  
Trigger: populated by `handle_new_user()` on signup.

Trigger details (`handle_new_user()`):

- Creates `users`, `gamification`, and `user_stats` rows for each new auth signup.
- Seeds initial FK balance at `50`.

### Table: user_analysis

Purpose: Stores submitted profile, deterministic analysis output, and cached AI plan.

| Column              | Type        | Description                            |
| ------------------- | ----------- | -------------------------------------- |
| id                  | uuid        | PK                                     |
| user_id             | uuid        | Unique per user, references auth.users |
| profile_hash        | text        | Hash for cache invalidation            |
| profile             | jsonb       | Full profile payload                   |
| analysis_result     | jsonb       | Engine output                          |
| ai_fix_plan         | jsonb       | AI plan payload                        |
| projection          | jsonb       | Optional projection                    |
| ai_generated_at     | timestamptz | Last AI generation time                |
| last_step_completed | integer     | Intake completion marker               |
| updated_at          | timestamptz | Updated time                           |
| created_at          | timestamptz | Created time                           |

RLS: `analysis_own` (auth.uid() == user_id)  
Trigger: none.

Note: `profile`/`analysis_result`/`ai_fix_plan` are `jsonb`, so new fields like `unifiedLoans[]` and mapped `additionalObligations[]` persist without column changes.

### Table: user_analyse_snapshots

Purpose: Persisted analyse snapshots from client for restore/hydration.

| Column     | Type        | Description               |
| ---------- | ----------- | ------------------------- |
| user_id    | uuid        | PK, references auth.users |
| payload    | jsonb       | Snapshot blob             |
| updated_at | timestamptz | Updated timestamp         |

RLS: own-row policies (from migrations).

Note: `payload` is `jsonb` and stores the full snapshot blob; loan schema changes are backward compatible without table column changes.

### Table: financial_obligations

Purpose: Recurring money obligations (EMI, insurance premium, SIP, rent, etc.) for the financial calendar.

| Column             | Type        | Description                                                     |
| ------------------ | ----------- | --------------------------------------------------------------- |
| id                 | uuid        | PK                                                              |
| user_id            | uuid        | Owner (`auth.users`)                                            |
| title              | text        | Display title                                                   |
| category           | text        | e.g. `loan_emi`, `insurance_life`, `investment_sip`             |
| amount             | numeric     | Expected amount                                                 |
| frequency          | text        | `monthly` / `quarterly` / `half_yearly` / `yearly` / `one_time` |
| due_day            | int         | Day of month (1–31)                                             |
| due_month          | int         | Month for yearly (1–12)                                         |
| due_date           | date        | Optional one-time date                                          |
| source             | text        | `health_check` / `manual` / `tracker_learned`                   |
| is_active          | boolean     | Soft-delete flag                                                |
| remind_days_before | int         | Days before due for reminder                                    |
| notes              | text        | Optional                                                        |
| created_at         | timestamptz | Created                                                         |
| updated_at         | timestamptz | Updated                                                         |

Unique: `(user_id, title, category)`. RLS: own-row. Realtime enabled in Supabase.

### Table: obligation_checklist

Purpose: Per-month instance of an obligation (pending / paid / skipped / auto_debit).

| Column          | Type        | Description                           |
| --------------- | ----------- | ------------------------------------- |
| id              | uuid        | PK                                    |
| user_id         | uuid        | Owner                                 |
| obligation_id   | uuid        | FK → `financial_obligations`          |
| checklist_month | date        | First of month                        |
| expected_amount | numeric     | Snapshot amount                       |
| status          | text        | pending / paid / skipped / auto_debit |
| paid_at         | timestamptz | When marked paid                      |
| paid_amount     | numeric     | Amount paid                           |
| created_at      | timestamptz | Created                               |

Unique: `(user_id, obligation_id, checklist_month)`. RPC: `generate_monthly_checklist(p_user_id, p_month)`.

### Table: user_policies

Purpose: Policy vault (health/term/car/bike/life/etc), renewals, transfer status.

| Column            | Type    | Description                                         |
| ----------------- | ------- | --------------------------------------------------- |
| id                | uuid    | PK                                                  |
| user_id           | uuid    | Owner                                               |
| policy_type       | text    | Type                                                |
| policy_name       | text    | Product/provider                                    |
| insurer           | text    | Insurer name                                        |
| premium_amount    | numeric | Premium                                             |
| premium_frequency | text    | monthly/yearly                                      |
| cover_amount      | numeric | Sum insured/assured                                 |
| renewal_date      | date    | Renewal date                                        |
| status            | text    | active/lapsed/renewed/transferred                   |
| ...               | ...     | Additional transfer/metadata columns per migrations |

RLS: own-row access policies.

### Table: finkoin_knowledge

Purpose: RAG knowledge base rows used by keyword retrieval.

| Column           | Type        | Description             |
| ---------------- | ----------- | ----------------------- |
| id               | uuid        | PK                      |
| category         | text        | High-level category     |
| subcategory      | text        | Subcategory             |
| title            | text        | Rule title              |
| content          | text        | Rule content            |
| keywords         | text[]      | Search keywords         |
| applies_when     | text        | Applicability condition |
| priority_context | text[]      | Priority tags           |
| embedding        | vector(384) | Embedding column        |
| is_active        | boolean     | Active flag             |
| last_updated     | date        | Last update date        |
| source           | text        | Source note             |
| created_at       | timestamptz | Created time            |

RLS: `knowledge_read` (public select true).

### Table: gamification

Purpose: FK balances, badges, streak tracking.

| Column       | Type        | Description             |
| ------------ | ----------- | ----------------------- |
| user_id      | uuid        | PK, owner               |
| fk_balance   | integer     | FK tokens               |
| badges       | jsonb       | Badge list              |
| streak_days  | integer     | Login streak            |
| last_login   | date        | Last login              |
| total_earned | integer     | Aggregate earned tokens |
| created_at   | timestamptz | Created time            |

RLS: `gamification_own`.

### Table: financial_profiles

Purpose: Legacy profile table.

Status:

- Legacy table — deprecated.
- Use `user_analysis` instead.
- Will be dropped after verification.

### Table: insurance_clicks

Purpose: Insurance click and revenue tracking.

| Column            | Type        | Description       |
| ----------------- | ----------- | ----------------- |
| id                | uuid        | PK                |
| user_id           | uuid        | User              |
| insurance_type    | text        | Type clicked      |
| insurer_name      | text        | Insurer           |
| recommended_cover | numeric     | Recommended cover |
| monthly_premium   | numeric     | Premium           |
| user_age          | integer     | Age at click      |
| city              | text        | City              |
| fk_tokens_used    | integer     | FK spent          |
| clicked_at        | timestamptz | Click timestamp   |

RLS: `clicks_own` insert check (auth.uid() == user_id).

### Extra tables from initial schema

- `referrals`: referral tracking — **live columns** are `referrer_id`, `referred_id`, `signed_up_at`, `tokens_awarded` (migration `001` scaffold names `referrer_user_id` / `referred_user_id` are **stale**; trust app code + live DB).
- `user_stats`: per-user stats/metrics (may be lightly used).

### Live public tables (verified 2026-08-04) — see also §36

| Table                       | Feature                          | User link                     | Field encryption?                                    |
| --------------------------- | -------------------------------- | ----------------------------- | ---------------------------------------------------- |
| `users`                     | Profile                          | `id`                          | No (PII plaintext; passwords only in `auth.users`)   |
| `user_analysis`             | Analyse structured               | `user_id`                     | No (jsonb plaintext)                                 |
| `user_analyse_snapshots`    | Analyse backup                   | `user_id`                     | No (jsonb plaintext)                                 |
| `user_financial_data`       | Encrypted health blob            | `user_id`                     | **Yes** AES-GCM (`encrypted_data`, `iv`, `auth_tag`) |
| `gamification`              | FK / streak                      | `user_id`                     | No                                                   |
| `fk_transactions`           | FK ledger                        | `user_id`                     | No                                                   |
| `expense_transactions`      | Tracker spends                   | `user_id`                     | No                                                   |
| `tracker_consent`           | Tracker consent                  | `user_id`                     | No                                                   |
| `user_credit_cards`         | Card nicknames                   | `user_id`                     | `last4` fragment only                                |
| `financial_obligations`     | Bills calendar                   | `user_id`                     | No                                                   |
| `obligation_checklist`      | Monthly checklist                | `user_id`                     | No                                                   |
| `user_policies`             | Policy vault                     | `user_id`                     | `policy_number` plaintext                            |
| `notification_preferences`  | Tips / push prefs                | `user_id`                     | `push_token` secret                                  |
| `push_subscriptions`        | Web Push                         | `user_id`                     | endpoint/keys secrets                                |
| `user_notifications`        | In-app inbox                     | `user_id`                     | No                                                   |
| `user_tip_history`          | Tip dedupe                       | `user_id`                     | No                                                   |
| `app_feedback` / `feedback` | Feedback / testimonials          | `user_id`                     | Free-text may hold PII                               |
| `insurance_clicks`          | Affiliate clicks                 | `user_id`                     | Soft PII                                             |
| `tax_documents`             | Tax docs (if used)               | `user_id`                     | Treat as sensitive                                   |
| `financial_profiles`        | **Legacy**                       | `user_id`                     | Prefer `user_analysis`                               |
| `referrals`                 | Referral graph                   | `referrer_id` / `referred_id` | No                                                   |
| `split_*` (6 tables)        | Finkoin Split                    | see §34                       | Invite `token` is secret                             |
| `finance_tips`              | Tip catalog                      | n/a                           | No                                                   |
| `finkoin_knowledge`         | RAG (may be absent on some envs) | n/a                           | No                                                   |

**Audit SQL (copy/paste):** `supabase/USER_DATA_AUDIT_NOTES.sql`

---

## 6. DATA MODELS

### FinancialProfile

Location: `lib/analyse-form-schema.ts`

Core fields include life stage, demographics, income, loan obligations, monthly expenses, insurance cover/premium fields, assets, savings, investment contributions, and goals.

| Field                                              | Type                                            | Description                         | Default         |
| -------------------------------------------------- | ----------------------------------------------- | ----------------------------------- | --------------- |
| lifeStage                                          | `"bachelor" \| "married" \| "kids" \| "senior"` | User life stage                     | `"bachelor"`    |
| selfAge                                            | number                                          | User age                            | 0               |
| cityTier                                           | `"metro" \| "tier2" \| "tier3"`                 | City category                       | `"metro"`       |
| monthlySalary                                      | number                                          | Main monthly take-home salary       | 0               |
| spouseIncome                                       | number?                                         | Spouse monthly income               | 0               |
| otherIncome                                        | number?                                         | Other monthly income                | 0               |
| homeLoanEMI/carLoanEMI/bikeEMI/personalLoanEMI/... | number?                                         | Loan EMIs                           | 0               |
| vegetables/grocery/electricity/...                 | number                                          | Expense subfields                   | 0               |
| hasHealthInsurance/hasTermInsurance                | boolean                                         | Insurance toggles                   | false           |
| healthInsuranceSumInsured/termInsuranceSumAssured  | number?                                         | Cover values                        | 0               |
| *PremiumInput/*PremiumFrequency/\*PremiumMonthly   | number/text                                     | Premium input + normalized monthly  | varies          |
| savingsAccountBalance/fdValue/liquidMFValue        | number                                          | Liquid assets                       | 0               |
| mfValue/ppfBalance/npsBalance/epfBalance           | number?                                         | Investments and retirement balances | 0               |
| monthlySIP/monthlyRD/monthlyPPFContribution/...    | number                                          | Ongoing investments                 | 0               |
| primaryGoal                                        | string                                          | Goal key                            | `"grow_wealth"` |

### AnalysisResult

Location: `lib/financialEngine.ts`

| Field              | Type            | Description                                             |
| ------------------ | --------------- | ------------------------------------------------------- |
| overallScore       | number          | Computed health score from issue severities             |
| criticalIssueCount | number          | Count of critical issues                                |
| warningIssueCount  | number          | Count of warning issues                                 |
| scores             | object          | savingsRate, debtRatio, untrackedCash, emergencyFundGap |
| flags              | AnalysisFlag[]  | Highlight flags                                         |
| issues             | AnalysisIssue[] | Detailed issues with severities                         |
| teaser             | string          | Headline message                                        |
| planSteps          | string[]        | Action steps                                            |
| securityChecklist  | SecurityItem[]  | Safety checklist rows                                   |

### PriorityPlan

Location: `lib/priorityEngine.ts`

| Field              | Type           | Description                  |
| ------------------ | -------------- | ---------------------------- |
| priorities         | PriorityItem[] | Ranked items                 |
| debts              | DebtItem[]     | Debt list                    |
| goals              | GoalItem[]     | Goal list                    |
| monthlyIncome      | number         | Calculated total income      |
| monthlySurplus     | number         | Calculated surplus           |
| allocationPlan     | array          | Suggested monthly allocation |
| scoreToday         | number         | Current score                |
| scoreAfter12Months | number         | Projected score              |
| topAction          | string         | Immediate top action         |

### User

Location: `store/authStore.ts`

| Field            | Type            | Description      |
| ---------------- | --------------- | ---------------- |
| id               | string          | Auth user ID     |
| name/email/phone | string \| null  | Basic identity   |
| subscriptionTier | free/pro/promax | Plan tier        |
| isAdmin          | boolean?        | Admin marker     |
| fkBalance        | number?         | FK token balance |

### Other key interfaces/types

- `AnalyseFormValues`, `LifeStage`, `CityTier`, `PrimaryGoal`, `PremiumFrequency` (`lib/analyse-form-schema.ts`)
- `SecurityItem`, `AnalysisIssue`, `RealEmergencyFundBreakdown` (`lib/financialEngine.ts`)
- `PriorityItem`, `DebtItem`, `GoalItem` (`lib/priorityEngine.ts`)
- `KnowledgeChunk` (`lib/rag/retriever.ts`)
- `FinkoinAIPlan` and nested plan models (`lib/finkoinAiPlan.ts`)
- `UserPolicy`, `PolicyFormInput` (`lib/userPolicies.ts`)

---

## 7. ZUSTAND STORES

### financialStore

File: `store/financialStore.ts`  
Persisted: Yes (`finkoin-financial`, user-scoped localStorage key per auth user)

State:

- `analysis`: draft form values
- `profile`: mirrored draft values
- `lastSubmission`: normalized profile submitted
- `result`: analysis result
- `currentStep`: current form step
- `aiPlan`: cached AI plan
- `hasHydrated`: hydration flag

Actions:

- `setAnalysis(patch)`
- `setFullAnalysis(data)`
- `updateProfile(patch)`
- `setResult(result)`
- `setAiPlan(plan)`
- `setCurrentStep(value)`
- `hydrateFromSnapshot(profile, result, options)`
- `runAnalysis()`
- `clearSubmission()`
- `resetAll()`

### authStore

File: `store/authStore.ts`  
Persisted: Yes (`finkoin-auth`) — partializes **`user`** and **`isLoggedIn` only** (not `subscriptionTier`, `userId`, `isLoading`, or `hasInitialized`; tier stays on `user` and is refetched after `initAuth`)

State: `user`, `isLoggedIn`, `isLoading`, `hasInitialized`, `subscriptionTier`, `userId`  
Actions: `setUser`, `updateUser`, `setLoading`, `setSubscription`, `logout` (async: Supabase sign-out + clears persist + financial/AI cache keys), `initAuth`, `refreshUser`, `signInWithEmail`, `signUpWithEmail`

### gamificationStore

File: `store/gamificationStore.ts`  
Persisted: Yes (`finkoin-gamification`)

State: FK balance, badges, streak, earnedActions, toast  
Actions: `earnTokens`, `awardBadge`, `hasEarnedAction`, `markEarnedAction`, `clearToast`

### splitStore

File: `store/splitStore.ts`  
Persisted: No

State:

- `groups`, `activeGroup`, `expenses`, `balances`, `netBalances`, `loading`, `lastFetched`

Actions:

- `fetchGroups(userId, userEmail, forceRefresh?)` (2-minute TTL cache keyed by user)
- `fetchGroupDetail(groupId)` — group, members, expenses + shares; loads **`netBalances` + simplified edges** from **`GET /api/split/balances`** (not the old `get_split_balances` RPC)
- `createGroup(...)`
- `inviteMember({ groupId, groupName, invitedEmail?, invitedByName?, invitedById?, linkOnly? })` — `linkOnly: true` or empty email → open shareable invite
- `addExpense(...)`
- `settleUp(...)`
- `deleteGroup(groupId)` (soft delete route)
- `deleteExpense(groupId, expenseId)`
- `clearActive()`

Helper exports:

- `getMyNetBalance(myEmail, netBalances)`
- `getMyBalanceFromEdges(myEmail, edges)` (legacy helper if edges present)

### notificationStore

File: `store/notificationStore.ts`  
Persisted: No

State: `notifications`, `unreadCount`, `loading`  
Actions: `fetchNotifications`, `markAllRead`, `markPopupShown`, `getTodayUnshownPopup`

### obligationStore

File: `store/obligationStore.ts`  
Persisted: No

State: `obligations`, `checklist`, `currentMonth`, `loading`, `totalObligated`, `totalPaid`, `totalPending`

Actions:

- `fetchObligations(userId)`
- `fetchChecklist(userId, month?)`
- `addObligation` / `updateObligation` / `deleteObligation` (soft)
- `markPaid` / `markSkipped`
- `generateChecklist` → RPC `generate_monthly_checklist`
- `syncFromHealthCheck(userId, submission)` — upserts from analyse premiums/EMIs/SIP/CC/PPF + date fields, then generates checklist

### portfolioStore

File: `store/portfolioStore.ts`  
Persisted: No  
State/action: `lastAnalysis`, `setLastAnalysis`

### use-app-store

File: `store/use-app-store.ts`  
Persisted: No  
State/action: onboarding step tracking

---

## 8. FINANCIAL ENGINE RULES

From `lib/financialEngine.ts` + `lib/universal-buckets.ts`:

### Bucket Caps

- Base caps:
  - needs: 20% (or 30% if home loan present)
  - wants: 5%
  - security: 5%
  - loans: 40%
  - investment: 30% (or 20% if home loan present)

### Monthly bucket actuals (`getUniversalBucketActuals`)

- **Insurance (“security”) bucket:** Sum of **insurance premiums** converted to monthly (health, term, motor/other policies). **Not** EPF / PF / NPS / SSY — those are monthly contributions counted under **investment**.
- **Investment bucket:** `monthlySIP` + `monthlyRD` + `monthlyNPSContribution` + `monthlyPPFContribution` + `monthlyEPFContribution` + `ssy`.

### Status Rules

- `good`: actual <= cap
- `warning`: actual <= cap \* 1.15
- `critical`: actual > cap \* 1.15

### Emergency Fund Weighted Corpus

- savings account counted at 100%
- liquid MF counted at 95%
- FD counted at 70%
- other liquid savings counted at 50%
- legacy emergency fund field counted at 100%

### Emergency Target Windows

- bachelor: 3-6 months
- married: 6-12 months
- kids: 9-12 months

### Term Insurance Formula (`calculateTermNeeded`)

1. annual income = monthly total income \* 12
2. base = annual income \* 10
3. liabilities = homeLoanOutstanding + carLoanOutstanding
4. existing assets = mf + indianStocks + ppf + epf + fd
5. dependent buffer = dependentCount \* 20,00,000
6. age multiplier: <30 => 1.2, <40 => 1.0, <50 => 0.8, >=50 => 0.6
7. term needed = max(50,00,000, (base + liabilities + dependentBuffer - existingAssets) \* ageMultiplier)
8. rounded up to nearest 10,00,000

### Insurance Floor Rules

- insurance guideline = 5% of income
- critical floor = 2% of income

### Security Checklist Logic

- emergency fund adequacy
- medical insurance adequacy
- medical emergency corpus
- term cover adequacy
- premium reserve (~12 months)
- SSY (if eligible)
- NSC (if selected)
- child education/marriage targets
- parents medical coverage (if supported)
- bereavement fund

---

## 9. PRIORITY ENGINE RULES

From `lib/priorityEngine.ts`:

### Priority Order (current implemented)

1. `emergency_fund`
2. `medical_fund`
3. `term_insurance` (when gap > 0)
4. `health_insurance` (when gap > 0)
5. `ssy_girl_age_*` (per eligible girl child under 10)

Current `buildPriorityPlan` implementation returns:

- priorities: emergency + medical + conditional insurance/SSY priorities
- debts: ranked debt list including additional obligations
- goals: generated goal plan list (house/car/FIRE paths)
- score projection: urgency-weighted projected gain
- `additionalObligations[]` includes non-primary `unifiedLoans[]` rows after normalization, so debt ranking includes PF/OD/other loans that are not the first personal/car/bike mapping.

### Emergency Fund Rule (implemented)

- income from salary + spouse + other
- emergency months matrix by stage/parents/kids/age
- target = `needsActual * emergencyMonthsNeeded`
- current = `0.5*savings + 0.95*liquidMF + 0.7*fd`
- gap = `max(0, target-current)`
- monthly recommendation: `min(surplus*0.4, gap/12)`

### Medical Fund Rule (implemented)

- target fixed: ₹2,00,000
- current = min(50% liquid MF, target)
- monthly recommendation: `min(surplus*0.2, gap/6)`

### Implementation status

- P3/P4/P5 suite: implemented
- debt ranking output: implemented
- goal planning output: implemented
- detailed allocation table with many categories: **NOT IMPLEMENTED YET** (`allocationPlan` currently empty)
- debt outstanding fallback: implemented using `calculateOutstanding(emi, annualRate, remainingMonths)` when loan rate + months are present; otherwise EMI-multiplier estimate fallback is used
- consolidated expense compatibility: implemented (`foodTotal`/`transportTotal`/`utilityTotal`/`domesticHelpTotal`/`lifestyleTotal` preferred with granular fallback)
- asset enrichment in priority math: implemented (`totalEquityValue` and `customInvestments[]` included in asset base)
- FD opportunity suggestion: implemented (`fdSuggestion` with best-rate comparison and CTA payload)

---

## 10. API ROUTES

### POST `/api/ai/analyse`

File: `app/api/ai/analyse/route.ts`  
Auth required: Yes — cookie session via `getAuthedUser` (rate limit 10/hr/user). Body: profile+analysis payload.

Request body:

```json
{
  "profile": {},
  "analysis": {}
}
```

What it does:

1. Validates `GROQ_API_KEY`
2. Builds `priorityPlan` via `buildPriorityPlan`
3. Retrieves knowledge via `retrieveKnowledge` (RAG)
4. Calls Groq model with system prompt + retrieved context
5. Parses JSON from model response
6. On AI failure, returns deterministic fallback explanations from code-engine output
7. Returns plan + explanations + knowledge titles

Response:

```json
{
  "priorityPlan": {},
  "explanations": {},
  "knowledgeUsed": [],
  "isFallback": false
}
```

### GET `/api/razorpay/checkout-config`

File: `app/api/razorpay/checkout-config/route.ts`  
Auth required: No

Returns the Razorpay **Key ID** to the frontend (safe to expose). Never exposes `RAZORPAY_KEY_SECRET`.

Reads `NEXT_PUBLIC_RAZORPAY_KEY_ID`, falls back to `RAZORPAY_KEY_ID`.

Response (success):

```json
{
  "keyId": "rzp_test_..."
}
```

Errors: **503** `{ "error": "Payments are not configured." }` when neither env Key ID is set.

---

### POST `/api/razorpay/create-order`

File: `app/api/razorpay/create-order/route.ts`  
Auth required: Yes — cookie session via `getAuthedUser` (rate limit 15/hr/user).

Creates a fixed **₹99** (9900 paise) INR order via Razorpay Orders API.

Request body: none required.

Response:

```json
{
  "orderId": "order_...",
  "amount": 9900,
  "currency": "INR"
}
```

Errors: **503** if keys missing; **502** if Razorpay API fails (`error`, `detail`).

---

### POST `/api/razorpay/verify-payment`

File: `app/api/razorpay/verify-payment/route.ts`  
Auth required: Yes — `Authorization: Bearer <Supabase access_token>`

Body:

```json
{
  "razorpay_order_id": "",
  "razorpay_payment_id": "",
  "razorpay_signature": ""
}
```

Verifies **HMAC-SHA256** over `order_id|payment_id` using `RAZORPAY_KEY_SECRET` (`timingSafeEqual`).  
On success: updates **`users.subscription_tier`** to **`pro`** for the authenticated user.

Response:

```json
{
  "ok": true
}
```

Errors: **401** without valid session; **400** missing fields or signature mismatch; **503** if secret not configured.

---

### Split routes (`/api/split/*`)

Auth: cookie session via `createSupabaseServerClient` / `getAuthedUser` (`lib/apiGuard.ts`) where noted. Rate limits apply on invite/settle.

#### POST `/api/split/groups`

Creates a split group for the authenticated user and inserts creator membership as `admin` in `split_group_members`.

#### DELETE `/api/split/groups?groupId=<id>`

Soft-deletes group by creator in `split_groups` (`is_active=false`) and updates `updated_at`.

#### DELETE `/api/split/groups/[groupId]`

Hard-delete route for active admins: removes `split_expense_shares`, `split_settlements`, `split_invitations`, `split_expenses`, `split_group_members`, and finally the `split_groups` row.

#### POST `/api/split/invite`

**Requires auth** + active group membership. Rate limit: 30/hr/user.

Body: `{ groupId, groupName?, invitedEmail?, linkOnly? }`

Modes:

1. **Email invite** — valid `invitedEmail`:
   - Inserts `split_invitations` (`status=pending`, expiry +7d).
   - Upserts **pending** seat in `split_group_members`.
   - Optionally emails via Resend (`RESEND_API_KEY`, `EMAIL_FROM`).
   - Returns `{ inviteUrl, token, emailSent, emailError, linkOnly: false }`.

2. **Open / link-only invite** — `linkOnly: true` **or** empty/missing email:
   - Stores `invited_email = __open__@finkoin.invite` (`OPEN_SPLIT_INVITE_EMAIL` in `lib/splitInvite.ts`).
   - **Reuses** existing pending open invite for the group when present (refreshes expiry if expired).
   - Does **not** upsert a pending member (members are added on join).
   - Returns `{ inviteUrl, token, emailSent: false, linkOnly: true }` — no email sent.

Invite URL shape: `<siteUrl>/split/join?token=<token>` (`getPublicSiteUrl()`).

#### POST `/api/split/join`

Server-side invite acceptance:

1. Authenticates current user (`createSupabaseServerClient`)
2. Validates invite token and expiry from `split_invitations`
3. **Email invite:** enforces invited email == logged-in email; activates pending member; marks invitation `accepted`
4. **Open invite** (`isOpenSplitInvite`): any logged-in user may join; upserts **active** member for their email; **keeps invite `pending`** so the same link stays reusable
5. If already active member on open invite → success (idempotent)

#### GET `/api/split/balances?groupId=`

Auth + membership-checked. Computes `{ net, edges }` via `lib/splitBalances.ts` (`computeNetBalances` + `simplifyDebts`) using admin client. Replaces opaque `get_split_balances` RPC for UI.

#### POST `/api/split/expenses`

Creates an expense in `split_expenses`, computes/validates shares via `computeSplitShares`, inserts `split_expense_shares`, then bumps `split_groups.updated_at`.

#### PUT `/api/split/expenses/[expenseId]`

Expense **creator only**. Updates title/amount/category/date/notes and recomputes shares via `computeSplitShares` (supports `shares` type).

#### DELETE `/api/split/expenses/[expenseId]`

Expense **creator only**. Soft-deletes with `is_deleted=true` (balances/list exclude deleted).

#### DELETE `/api/split/members?groupId=&email=`

Self-leave or admin/creator remove. Sets `status=left` + `left_at`. Blocked when target net balance ≠ 0 (settlement-aware). Creators cannot leave via this path.

#### POST `/api/split/settle`

Auth + membership. Records settlement amount in `split_settlements` (amount-accurate; `payment_method`; blocks self-settlement). Rate-limited 60/hr.

### GET|POST `/api/obligations/reminders`

File: `app/api/obligations/reminders/route.ts`  
Auth: `Authorization: Bearer CRON_SECRET` or `x-vercel-cron: 1`.

Scans active `financial_obligations` and inserts `user_notifications` (`category: obligation_reminder`) when due in exactly `remind_days_before` days. Cron in `vercel.json` at `0 3 * * *` UTC.

## 11. RAG SYSTEM

### How it works

1. Profile + analysis is sent to AI route
2. `buildKeywords(profile, analysis)` extracts search keywords
3. Supabase RPC `search_by_keywords(search_keywords, match_count)` executes
4. Top matches are mapped into `KnowledgeChunk[]`
5. `formatForPrompt()` creates prompt context block
6. Context is sent to Groq for constrained explanation generation

### Knowledge categories

Source categories used in DB rows include:

- priority
- goal
- debt
- insurance
- tax

### Adding new knowledge

1. Insert row in `public.finkoin_knowledge`
2. Fill `category`, `title`, `content`, `keywords[]`, and optional fields
3. Ensure `is_active = true`
4. No redeploy required

### Updating rates

1. Update `content` in existing knowledge row
2. Keep keywords relevant for retrieval
3. Changes apply immediately

---

## 12. CACHING STRATEGY

| Data                         | Where                                                                    | When saved                                       | When cleared                         |
| ---------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------ |
| Form/profile draft           | Zustand persisted localStorage                                           | During form updates                              | reset/clear actions                  |
| Tax regime calculator inputs | localStorage `finkoin_tax_calculator`                                    | On any field/toggle change (TaxRegimeCalculator) | Reset button or manual clear         |
| Analysis result              | Zustand + optional Supabase snapshot                                     | On submit/runAnalysis                            | reset/clear                          |
| AI fix plan                  | localStorage (`finkoin_ai_cache`) + optional `user_analysis.ai_fix_plan` | After AI call in fixplan page                    | hash change / expiry / clearCache    |
| Cross-device profile         | user_analyse_snapshots (Supabase)                                        | After every form submit (if logged in)           | Never auto-cleared — user must reset |

### Profile hash check

- `hashProfile(profile)` creates deterministic hash from selected profile fields
- `getCachedPlan(hash)` checks hash match and max age
- match -> use cached AI plan (no API call)
- mismatch/expired -> call `/api/ai/analyse`
- cache age: 30 days

---

## 13. AUTH FLOW

### Overview (production-oriented)

1. **Browser client** (`lib/supabase.ts`): `@supabase/ssr` **`createBrowserClient`** singleton via **`getSupabase()`**. Sessions use **cookie-backed storage** aligned with middleware. Options include **`auth.storageKey: 'finkoin-auth-token'`**, **`persistSession`**, **`autoRefreshToken`**, **`detectSessionInUrl`**. A **`supabase` proxy** preserves legacy `import { supabase } from "@/lib/supabase"` call sites (client-only).

2. **Middleware** (`middleware.ts`): **`createServerClient`** from `@supabase/ssr` reads request cookies, runs **`auth.getUser()`** (validates JWT + refreshes / rotates refresh token when needed), writes updated cookies on the response via **`setAll`**. If env vars are missing, middleware no-ops. **Homepage `/` is skipped** (no Supabase round-trip — LCP).

   **Important (current code):** Middleware does **NOT** redirect unauthenticated users to `/login`. Page protection is **client-side** via **`ProtectedGate`** + route-level checks (e.g. `/analyse` login redirect). Server-only cookie gates previously caused logged-in mobile users to be bounced incorrectly.

3. **Protected routes (client `ProtectedGate`):** `/profile`, `/policies` (as used), `/rewards`, `/goals`, `/investments`, `/leaderboard`, `/refer`, `/settings`, `/tracker`, `/tracker/[month]`, `/split`, `/split/[groupId]`, `/split/.../add-expense`. Unauthenticated users are redirected to **`/login?redirect=<path>`** (or equivalent next param) after **`hasInitialized`**. `/analyse/fixplan` also gates via **`canAccessFixPlan`** / login.

4. **App bootstrap** (`components/AppInitializer.tsx`): Waits for **`useAuthStore.persist.rehydrate()`** + hydration completion, then **`initAuth()`** so UI does not trust persisted Zustand user state before Supabase **`getSession()`** validates the session (avoids **refresh crashes** from stale persisted user).

5. **`initAuth` / `refreshUser`** (`store/authStore.ts`): Loads **`users`** + **`gamification`** (creates gamification row if missing), maps **`subscription_tier`**, **`referral_code`**, **`fk_balance`**, and syncs **`useGamificationStore`** FK display with Supabase. Registers **one** **`onAuthStateChange`** listener (sign-in, token refresh, sign-out).

6. **Cross-tab**: `components/AuthSessionSync.tsx` listens for **`storage`** (persist / Supabase keys) and **`visibilitychange`** to **`refreshUser()`** when returning to a tab.

7. **Logout**: `logout()` calls **`POST /api/auth/sign-out`**, client **`supabase.auth.signOut({ scope: 'global' })`**, **`persist.clearStorage()`** for `finkoin-auth`, removes **`finkoin-financial`** / **`finkoin_ai_cache`** / **`finkoin-gamification`** from `localStorage`. Profile menu **Sign out** calls **`logout()`** then **`router.push('/')`** / **`refresh()`**.

8. **Navbar / profile menu**: Logged-out users see **`Log in`** → **`/login`**; avatar opens **`/login`** when logged out. Logged-in dropdown: **My Profile**, **My Analysis**, **My Policies**, **My Goals**, **My Investments**, **Leaderboard**, **Rewards**, **Refer & Earn**, **Settings**, legal shortcuts, **Sign out**. **KYC** entry removed from this menu (KYC remains on **`/profile`** page until insurance flows mature). Dropdown is **scrollable** on small screens (**`max-height` + `overflow-y: auto`**), uses a **backdrop**, and locks **`document.body`** overflow while open.

9. **Referral capture**: **`components/ReferralCapture.tsx`** (mounted in root layout) stores **`?ref=`** in **`sessionStorage`**; **`lib/referralRewards.ts`** applies pending referral after OAuth/password login on **`/auth/callback`** (best-effort FK bonuses + **`referred_by`**).

10. **`LoginSheet`**: `components/ui/LoginSheet.tsx` remains optional/unwired from the global navbar.

### Sign up

1. User opens **`/login`**, **Sign up** tab, submits name + email + password (or uses **`signUpWithEmail`** elsewhere).
2. **`supabase.auth.signUp`** with **`emailRedirectTo`** → `{origin}/auth/callback`.
3. If **no session** is returned (email confirmation required), UI prompts to verify email, then user logs in on the **Login** tab.
4. DB trigger **`handle_new_user()`** inserts **`users`** + **`gamification`** + **`user_stats`** when the auth user is confirmed.
5. After session exists, **`initAuth()`** / **`refreshUser()`** loads profile and gamification.

### Sign in

1. **`/login`** → **`signInWithPassword`** → **`initAuth()`** → redirect to **`?redirect=`** or **`/analyse`**.
2. **`?redirect=`** preserves deep links after login.

### OAuth (Google)

1. **`signInWithOAuth`** (`/login` or **`lib/auth`** **`signInWithGoogle`**) with **`redirectTo`** **`{origin}/auth/callback?next=<encoded-path>`** so deep links survive OAuth.
2. **`/auth/callback`** (wrapped in **`Suspense`**): **`exchangeCodeForSession(code)`** when **`?code=`** present, then **`initAuth()`**, then redirect to **`next`** (default **`/analyse`**).
3. **Supabase Dashboard → Authentication → URL configuration**: add **`Site URL`** and **Redirect URLs** that include **`/auth/callback`** (and variants with query strings if your project enforces exact redirect matching).

### Password reset

1. **`/login`** → **Forgot password?** inline mode, or **`/auth/reset-password`**, calls **`resetPasswordForEmail`** with **`redirectTo`** **`{origin}/auth/callback?type=recovery`** so the magic link establishes a session via PKCE before **`/auth/update-password`**.
2. **`/auth/callback`** with **`type=recovery`** → **`/auth/update-password`** after **`initAuth()`**.
3. **`/auth/update-password`** → **`auth.updateUser({ password })`** when a recovery session exists.

### JWT / refresh (dashboard configuration)

Configure in **Supabase Dashboard → Authentication**: JWT expiry (e.g. **3600s**), **refresh token rotation ON**, reuse interval as recommended. Middleware **`getUser()`** ensures cookies stay fresh on navigations.

---

## 14. PAGE FLOWS

### `/` (landing)

1. `app/page.tsx` renders H1 + health-score blurb inside `HomePageClient`.
2. Mobile: blurb is **one line** (`line-clamp-1`); desktop wraps normally.
3. Hero carousel (`HomeHeroCarousel`) — compact on mobile.
4. **Below carousel on mobile only:** `HomeMobileQuickTools` — SIP → SWP → Split → Tax → EMI → Portfolio → Analyse (no Calcs tile).
5. Social-proof pills (Earn Finkoins / 10k users / Made in India / bank-level security) were **removed** from the hero.
6. Below-fold content lazy-loaded via `HomePageBelowFold`.

### `/analyse` (7-step form)

**Gate:** `components/analyse/ConsentModal.tsx` must be accepted once per user: **`localStorage`** fast path + **`users`** row fallback + **`UPDATE`** on agree (see **`app/analyse/page.tsx`**). **`redirectedToLoginRef`** avoids duplicate login redirects under Strict Mode. User must be logged in (page redirects to login).

Current runtime uses `components/forms/analyse-onboarding-form.tsx`:

- step 1: profile/life stage
- step 2: income
- step 3: obligations/loans
- step 4: expenses
- step 5: insurance
- step 6: assets/savings
- step 7: goals

On submit:

1. Validate final schema
2. Normalize form values
3. Run deterministic analysis (`setFullAnalysis`)
4. Fetch AI plan via `getAIFixPlan`
5. Save snapshot to Supabase (if logged in)
6. **`syncFromHealthCheck`** → upsert `financial_obligations` from premiums / EMIs / SIP / CC / PPF + optional date fields, then `generate_monthly_checklist`
7. Navigate to `/analyse/result`

Date fields (optional) collected after amounts: insurance renewal month/day, per-loan `emiDay` / legacy EMI day fields, SIP auto-debit day, PPF deposit day, credit-card bill day.

### `/analyse/result`

- Reads last submission + analysis
- Displays expanded production sections (hero, net-worth summary, bucket table, gauges, safety-net, fix-plan preview)
- Uses `components/analyse/paywall-modal.tsx` for unlock confirmation flow
- FK token unlock path triggers redemption

### `/analyse/fixplan`

- Calls `canAccessFixPlan`
- If no access -> redirect result
- Computes profile hash and checks local cache
- Cache hit: immediate render
- Cache miss: call `/api/ai/analyse`, cache response, optionally persist to Supabase
- Displays loading gradient with rotating status messages, then full plan sections (greeting, priorities, debt, goal, score projection, this-week action)
- Download button generates a multi-page PDF using `downloadOptimizerPDF()` in `lib/generatePDF.ts`

### `/optimizer`

- Shows full AI plan view
- Includes report export CTA wired to `downloadOptimizerPDF()`

### `/calculators`

- Hub with category chips; `?calc=<id>` opens tool in BottomSheet (mobile) / panel (desktop).
- Lazy components via `components/calculators/lazy-calculators.tsx`.
- Mobile list scrolls with bottom-nav padding; Framer wrappers removed from mobile list for scroll reliability.
- `BackLink` → `/`.

### `/profile`

- `ProtectedGate` + `BackLink` → `/`.
- Hero with avatar; checklist rows (label left / detail right).
- **`ProfileAssets`**: editable Cash / Investments / Physical / Liabilities with Add menus; eye privacy; patches via `profileAssetsPatch` → `syncProfileAssets` (re-runs engine + snapshot).
- PAN mock KYC; referral share; Aadhaar coming soon.

### `/investments` / `/goals`

- Protected; assets rollup / goal cards; `BackLink` → `/profile`. Goals actions mostly “Coming soon”.

### `/tracker`

- Consent gate (`TrackerConsent` + `finkoin_tracker_consent` / `tracker_consent` table).
- Loads current-month + previous-month `expense_transactions` in parallel.
- Summary card: income / spent / left with privacy eye (180° flip); bucket cards with purple icons and % caps.
- **Month navigation:** back to first month with data; **forward** only through `trackerForwardLimit()` in `lib/trackerMonthIncome.ts`.
  - **Default:** current calendar month only.
  - **Next month unlocks on/after the last Friday** of the current month (`lastFridayOfMonth` / `isNextTrackerMonthUnlocked`). Example: on 4 Aug 2026 only August is open; from Fri 28 Aug, September unlocks.
  - If the user somehow has a future month selected before unlock, UI snaps back to the limit.
- **Financial calendar / obligations** (`ObligationsChecklist` + `obligationStore`): after income section — monthly checklist, mark paid/skip, add obligation modal; empty-state CTA. Expense descriptions matching EMI/SIP/insurance/rent keywords can suggest “Add to obligations?”.
- **Month Safety Pulse** (`computeMonthSafetyPulse` → `MonthSafetyPulse`): Safe/Tight/Over, MoM spent delta, top movers, one action, daily safe spend when viewing the current calendar month. Amounts masked when eye is off.
- **Credit card dues:** `CreditCardBillReminder` + `lib/trackerCreditCards.ts` (billing/due days, statement windows).
- Add/edit via `AddExpenseModal`; soft refetch while modal open / on visibility to avoid PWA tap lock.
- Share not required on tracker (PWA has no URL bar elsewhere — see calculators Share).

### `/calculators` (+ `/calculators/[id]`, `/calculators/tax-regime-2026`, Post Office routes)

- Hub + deep links via `CalculatorsClient` + `calculator-config` / `calculator-seo`.
- **Share:** `components/ui/ShareButton.tsx` on every calculator (native `navigator.share` → clipboard fallback) — critical for installed PWA (no address bar).
- **Money inputs:** capped at ₹99 crore (`CALCULATOR_MONEY_MAX`); rate fields accept decimals with slider sync (`lib/calculatorInput.ts`).
- **Post Office schemes:** hub `/calculators/po` + dedicated routes (`po-savings`, `po-td`, `po-rd`, `nsc`, `po-kvp`, `po-mis`, `po-scss`, `po-ssy`) using `lib/postOfficeSchemes.ts` + Jul–Sep 2026 MoF/DoP rates.
- **OG images:** `getOgImagePathForCalc` maps calc ids → `/og/og-*.png` (sip/swp/tax/emi/ppf/po/emergency/fire; else home).

### `/split` ecosystem

#### `/split`

- Protected by `ProtectedGate` + `BackLink` → `/`.
- Group list via `useSplitStore.fetchGroups`.
- **Create modal (2 steps):**
  1. **details** — name + optional emoji only (no group type).
  2. After create → auto `inviteMember({ linkOnly: true })` → **invite** step with `InviteLinkShare` (Copy / WhatsApp / URL).
  3. Continue → `/split/[groupId]`.
- Refreshes on visibility/focus and realtime updates from `split_group_members`.

#### `/split/[groupId]`

- Loads group details via `fetchGroupDetail` (balances from **`/api/split/balances`**, with optional `get_split_balances` RPC probe; expenses filtered `is_deleted=false`).
- Tabs: **expenses** | **members** | **settlements**.
- Header net + **Simplified settle-up** edges + per-member balances; settle modal with payment method (UPI/cash/bank).
- Expense creator: **Edit** (`/add-expense?edit=`) + soft **Delete** (`is_deleted=true`).
- Members tab: admin/creator can Remove others; non-creator can Leave (blocked if unsettled net).
- **Invite friends:** open token link + permanent `invite_code` group link (`/split/join?code=`).
- Group soft-delete (`…`) **creator-only** on detail + list.
- Realtime: expenses insert/update/delete, shares, settlements.

#### `/split/[groupId]/add-expense`

- Create + edit (`?edit=<expenseId>`).
- Split types: `equal`, `exact`, `percentage`, **`shares`** (proportional share counts).
- Validates exact sum / % = 100 / positive share counts.
- `POST /api/split/expenses` or `PUT /api/split/expenses/[id]`.

#### `/split/join?token=...` or `?code=...`

- Client: `JoinSplitGroupClient` (token **or** group `invite_code`).
- Persist invite via `lib/splitAuthRedirect.ts` (localStorage **+** cookies) and resume via `components/SplitInviteResume.tsx` (root layout).
- **PWA / mobile open-in-app (`lib/pwaLaunch.ts`):**
  - **Android:** may offer “Open in Finkoin app” via `intent://` deep link carrying the full `/split/join?…` URL (WebAPK can land on join).
  - **iOS:** **does not** offer “close browser and open home-screen app”. Safari/WhatsApp storage is siloed from the PWA — that path never delivered the invite. iOS continues **in-browser** → login → `POST /api/split/join` → group. After join (same account), membership is server-side so the PWA list shows the group once logged in.
- After auth: `POST /api/split/join` `{ token }` or `{ code }` → `/split/[groupId]`.
- Open token links: any logged-in account; email invites: matching email; code: any logged-in user.

### Notification and feedback surfaces

- `components/NotificationBell.tsx` shows `user_notifications` inbox with realtime inserts and unread badge.
- `components/MorningTipPopup.tsx` shows one unshown tip popup/day (IST key `finkoin_tip_popup_<date>`), and marks popup as shown via store.
- `components/FeedbackPopupManager.tsx` triggers delayed feedback modal (120s) on tracked routes for logged-in users.
- `components/FeedbackWidget.tsx` submits rating/message/context to `/api/feedback` and sets page-scope suppression key `finkoin_feedback_<context>`.

---

## 15. GAMIFICATION

### FK Token earning events (implemented)

- Calculator usage reward in calculators dynamic page
- Learn article read reward in article tracker
- Portfolio analysis reward in portfolio flow
- Generic store action `earnTokens(amount, label)`

### FK Token spending (implemented)

- Result unlock path:
  - 1000 FK -> free unlock path
  - 500 FK -> discounted unlock path
- Deduction persisted via `gamification.fk_balance` update in Supabase

---

## 16. INSURANCE MARKETPLACE

Current status: **partially implemented**

- `app/insurance/page.tsx`: marketplace/compare UX entry
- `components/policies/PolicyVaultClient.tsx`: policy vault CRUD, renewal actions, transfer flow
- `lib/userPolicies.ts`: policy data operations and helper mappings
- `insurance_clicks` table exists for click/revenue tracking

### Commission tracking

- Table supports click logging (`insurance_clicks`)
- UI has renewal/transfer intent flows
- Full production affiliate/insurer API integration is **NOT IMPLEMENTED YET**

---

## 17. KNOWN ISSUES AND TODOS

### TODO/FIXME found

- `app/plans/page.tsx`: `TODO: Replace with Razorpay later` (2 occurrences)

### Known placeholders / coming-soon pages

- `app/goals/page.tsx`: coming soon
- `app/pricing/page.tsx`: full plans coming soon
- `app/careers/page.tsx`, `app/press/page.tsx`: coming soon
- `lib/kycVerification.ts`: PAN verification is mock logic; Aadhaar on profile is “Coming soon”
- `app/insurance/page.tsx`: full comparison engine not complete
- `app/portfolio/page.tsx`: sample fund data (not live CAMS)
- `app/plans/page.tsx`: Razorpay wiring TODOs remain

### Doc accuracy notes (2026-07-18)

- Middleware **does not** enforce login redirects — use `ProtectedGate` / page logic.
- Split balances use **`GET /api/split/balances`**, not `get_split_balances` RPC, for UI.
- Open invites (`__open__@finkoin.invite`) are first-class; email-match join is email invites only.
- `POST /api/ai/analyse` and `POST /api/razorpay/create-order` **require auth** (cookie session + rate limits).
- Overview docs live under `docs/` ([`docs/README.md`](./docs/README.md)); this file remains deep SoT.

### Legal pages (complete)

- **`/legal/privacy`**: Full Privacy Policy (DPDP Act 2023 rights, grievance officer, processors: Supabase, Vercel, Groq, Razorpay).
- **`/legal/terms`**: Full Terms of Service (educational-only / not SEBI-RIA disclaimer, payments, liability cap).
- **`/legal/refund`**: Standalone Refund Policy for digital products (Razorpay-friendly).
- **`/legal/disclaimer`**: Existing disclaimer page unchanged by this batch unless edited separately.
- **`/privacy`** and **`/terms`** redirect to the canonical **`/legal/*`** routes.
- Footer **Legal** column and profile menu link to Privacy, Terms, Refund, and Disclaimer.

### Hardcoded values needing future dynamic handling

- Some paywall and token thresholds are hardcoded in result/fixplan/payment flow
- Some insurance text/premium estimate strings are static

### Recently fixed

- Moved to the CHANGE LOG section below to keep this section focused on active known issues only.
- Personal loan outstanding entry is now explicitly surfaced in Step 3 (Loans/Obligations) between EMI and rate, with clarified helper copy for unknown-outstanding fallback.

---

## 18. HOW TO MAKE COMMON CHANGES

### Add a new form field

1. Add field to `FinancialProfile` + defaults in `lib/analyse-form-schema.ts`
2. Add UI in `components/forms/analyse-onboarding-form.tsx` at correct step
3. Wire `react-hook-form` binding and validation schema
4. Update normalization (`normalizeAnalyseFormValues`) and reverse mapping (`financialProfileToFormValues`) if needed
5. Update engine logic if the field changes calculations

### Add a new financial rule

1. Add deterministic rule in `lib/financialEngine.ts` or `lib/priorityEngine.ts`
2. Update related types/interfaces
3. Add tests in `lib/*.test.ts`
4. Validate result rendering pages still handle new outputs

### Update an interest rate

1. If AI/RAG rate: update `finkoin_knowledge` row in Supabase
2. If deterministic code rate: update rule in `lib/financialEngine.ts`/`lib/priorityEngine.ts`
3. Run `npx tsc --noEmit` and `npm run build`

### Add a new priority

1. Extend `PriorityItem` usage in `lib/priorityEngine.ts`
2. Add generation logic in `buildPriorityPlan`
3. Ensure `/api/ai/analyse` prompt includes required fields
4. Ensure `/analyse/fixplan` rendering handles new item

### Add a new insurance product

1. Extend policy type mappings in `lib/userPolicies.ts`
2. Update policy UI forms in `components/policies/PolicyVaultClient.tsx`
3. If marketplace compare involved, add handling in `app/insurance/page.tsx`
4. Add DB columns/migration only if required

---

## 19. DEPLOYMENT

### Environment setup

1. Set all required env vars (Supabase, Groq, Razorpay)
2. Ensure `NEXT_PUBLIC_SITE_URL` points to deployed domain
3. Ensure Supabase RLS policies and migrations are applied

### Vercel settings

- Add all env vars in project settings for Preview + Production
- Build command: `next build`
- Install command: `npm install`

### Supabase migrations

Run SQL migration files in order:

1. `001_initial.sql`
2. `002_user_analyse_snapshots.sql`
3. `003_user_policies.sql`
4. `003_complete_setup.sql` (contains additional setup and may overlap with earlier objects)
5. `004_user_policies_add_status.sql`
6. `005_fix_snapshots.sql` (creates user_analyse_snapshots, user_analysis, gamification, user_stats tables + RLS policies)

---

## 20. REVENUE MODEL

### How Finkoin makes money

1. Paid fix plan unlock/paywall flow (UI + payment route scaffolding)
2. Insurance referral/renewal/transfer commissions (policy vault + click tracking table)
3. Subscription plans (`pro`, `promax`) via plans/pricing flows

### FK Token economics

- FK is earned through engagement events (calculators, learning, portfolio actions)
- FK can reduce/unlock fix plan cost
- Current thresholds are implementation-defined in client flow (500/1000 levels)

---

## 21. COMPLETE FORM FIELDS

Source of truth: `components/forms/analyse-onboarding-form.tsx` (UI), validated by `lib/analyse-form-schema.ts`.

### 2026-04-25 delta (major form pass)

- Added loan metadata fields: `personalLoanRate`, `personalLoanRemainingMonths`, `homeLoanRate`, `homeLoanRemainingMonths`, `carLoanRate`, `carLoanRemainingMonths`, `bikeLoanRate`, `bikeLoanRemainingMonths`, plus OD detail fields (`odLimit`, `odUsed`, `odInterestRate`, `odInterestOnlyYears`, `odEMIStartYear`).
- Added consolidated monthly expense fields used by form + normalizer: `foodTotal`, `transportTotal`, `utilityTotal`, `domesticHelpTotal`, `lifestyleTotal`; legacy granular fields are retained for backward compatibility.
- Added insurance and maturity metadata: `termInsurancePremiumTillYear`, `lifeInsuranceMaturityAmount`, `lifeInsuranceMaturityYear`.
- Added FD and NSC lifecycle metadata: `fdRate`, `fdTenureYears`, `fdMaturityYear`, `nscMaturityYear`.
- Added investment simplification fields: `totalEquityValue` and `customInvestments[]` (`label`, `currentValue`, `monthlyContribution`, `type`).
- Goals UI now conditionally renders amount/year inputs by selected `primaryGoal` instead of always rendering all targets.

### Step 1 — Profile

| Code field       | Label shown in UI | Type              | Required                                        | Stored in `FinancialProfile` |
| ---------------- | ----------------- | ----------------- | ----------------------------------------------- | ---------------------------- |
| `lifeStage`      | Life stage        | card select       | Required                                        | `lifeStage`                  |
| `selfAge`        | Your age          | number input      | Required                                        | `selfAge`                    |
| `spouseAge`      | Spouse age        | number input      | Required for `married`/`kids`; hidden otherwise | `spouseAge`                  |
| `numberOfKids`   | Number of kids    | number input      | Required when `lifeStage = kids`                | `numberOfKids`               |
| `kidsAges[i]`    | Kid N age         | number input      | Required for each kid when `lifeStage = kids`   | `kidsAges[]`                 |
| `kidsGenders[i]` | Kid N gender      | card/radio select | Required for each kid when `lifeStage = kids`   | `kidsGenders[]`              |
| `cityTier`       | City tier         | select            | Required                                        | `cityTier`                   |

### Step 2 — Income

| Code field      | Label shown in UI                          | Type         | Required                       | Stored in `FinancialProfile` |
| --------------- | ------------------------------------------ | ------------ | ------------------------------ | ---------------------------- |
| `monthlySalary` | Monthly take-home salary                   | `MoneyInput` | Required (>0)                  | `monthlySalary`              |
| `spouseIncome`  | Spouse monthly income                      | `MoneyInput` | Optional (hidden for bachelor) | `spouseIncome`               |
| `otherIncome`   | Other income — freelance, rental, business | `MoneyInput` | Optional                       | `otherIncome`                |

### Step 3 — Loans/Obligations

| Code field                               | Label shown in UI                             | Type         | Required                                          | Stored in `FinancialProfile`            |
| ---------------------------------------- | --------------------------------------------- | ------------ | ------------------------------------------------- | --------------------------------------- |
| `rentAmount`                             | Rent you pay monthly                          | `MoneyInput` | Optional                                          | `rentAmount`                            |
| `rentMaintenanceMonthly`                 | Rent flat maintenance (society / maintenance) | `MoneyInput` | Optional (shown only if rent > 0)                 | `rentMaintenanceMonthly`                |
| `homeLoanEMI`                            | Home loan EMI (if any)                        | `MoneyInput` | Optional                                          | `homeLoanEMI`                           |
| `secondPropertyEMI`                      | Second property loan EMI (if any)             | `MoneyInput` | Optional                                          | `secondPropertyEMI`                     |
| `carLoanEMI`                             | Car loan EMI                                  | `MoneyInput` | Optional                                          | `carLoanEMI`                            |
| `bikeEMI`                                | Two-wheeler loan EMI                          | `MoneyInput` | Optional                                          | `bikeEMI`                               |
| `personalLoanEMI`                        | Personal loan EMI                             | `MoneyInput` | Optional                                          | `personalLoanEMI`                       |
| `personalLoanOutstanding`                | Personal loan outstanding (optional)          | `MoneyInput` | Optional                                          | `personalLoanOutstanding`               |
| `personalLoanRate`                       | Personal loan interest rate %                 | number input | Optional                                          | `personalLoanRate`                      |
| `personalLoanRemainingMonths`            | Personal loan remaining months                | number input | Optional                                          | `personalLoanRemainingMonths`           |
| `homeLoanRate`                           | Home loan interest rate %                     | number input | Optional                                          | `homeLoanRate`                          |
| `homeLoanRemainingMonths`                | Home loan remaining months                    | number input | Optional                                          | `homeLoanRemainingMonths`               |
| `carLoanRate`                            | Car loan interest rate %                      | number input | Optional                                          | `carLoanRate`                           |
| `carLoanRemainingMonths`                 | Car loan remaining months                     | number input | Optional                                          | `carLoanRemainingMonths`                |
| `bikeLoanRate`                           | Bike loan interest rate %                     | number input | Optional                                          | `bikeLoanRate`                          |
| `bikeLoanRemainingMonths`                | Bike loan remaining months                    | number input | Optional                                          | `bikeLoanRemainingMonths`               |
| `creditCardBillMonthly`                  | Credit card — typical monthly payment         | `MoneyInput` | Optional                                          | `creditCardBillMonthly`                 |
| `unifiedLoans[i].loanType`               | Loan type                                     | select       | Required per row                                  | `unifiedLoans[].loanType`               |
| `unifiedLoans[i].lenderName`             | Lender name                                   | text input   | Optional                                          | `unifiedLoans[].lenderName`             |
| `unifiedLoans[i].monthlyEMI`             | Monthly EMI                                   | `MoneyInput` | Required per row                                  | `unifiedLoans[].monthlyEMI`             |
| `unifiedLoans[i].outstandingAmount`      | Outstanding amount                            | `MoneyInput` | Optional                                          | `unifiedLoans[].outstandingAmount`      |
| `unifiedLoans[i].interestRate`           | Interest rate %                               | number input | Optional                                          | `unifiedLoans[].interestRate`           |
| `unifiedLoans[i].remainingMonths`        | Remaining months                              | number input | Optional                                          | `unifiedLoans[].remainingMonths`        |
| `unifiedLoans[i].odLimit`                | OD limit                                      | `MoneyInput` | Optional (OD rows only)                           | `unifiedLoans[].odLimit`                |
| `unifiedLoans[i].odUsed`                 | OD used                                       | `MoneyInput` | Optional (OD rows only)                           | `unifiedLoans[].odUsed`                 |
| `unifiedLoans[i].odInterestOnlyYears`    | OD interest-only years                        | number input | Optional (OD rows only)                           | `unifiedLoans[].odInterestOnlyYears`    |
| `additionalObligations[i].type`          | Obligation type                               | select       | Required if row added                             | `additionalObligations[].type`          |
| `additionalObligations[i].lenderName`    | Lender name                                   | text input   | Optional                                          | `additionalObligations[].lenderName`    |
| `additionalObligations[i].monthlyAmount` | Monthly payment amount                        | `MoneyInput` | Required positive if row added                    | `additionalObligations[].monthlyAmount` |
| `odLimit`                                | OD limit                                      | `MoneyInput` | Optional (shown when obligation type = Overdraft) | `odLimit`                               |
| `odUsed`                                 | Amount currently used in OD                   | `MoneyInput` | Optional (shown when obligation type = Overdraft) | `odUsed`                                |
| `odInterestRate`                         | OD interest rate %                            | number input | Optional (shown when obligation type = Overdraft) | `odInterestRate`                        |
| `odInterestOnlyYears`                    | OD interest-only period (years)               | number input | Optional (shown when obligation type = Overdraft) | `odInterestOnlyYears`                   |
| `odEMIStartYear`                         | OD EMI start year                             | number input | Optional (shown when obligation type = Overdraft) | `odEMIStartYear`                        |

Step 3 UI now uses a single `My Loans` field-array (`unifiedLoans`) for data entry. Legacy scalar loan fields and `additionalObligations` are still kept in schema/model for backward compatibility and downstream engine compatibility.

### Step 4 — Expenses

| Code field                         | Label shown in UI                                                | Type                       | Required                                 | Stored in `FinancialProfile`       |
| ---------------------------------- | ---------------------------------------------------------------- | -------------------------- | ---------------------------------------- | ---------------------------------- |
| `foodTotal`                        | Food and daily essentials                                        | `MoneyInput`               | Optional                                 | `foodTotal`                        |
| `transportTotal`                   | Transport                                                        | `MoneyInput`               | Optional                                 | `transportTotal`                   |
| `utilityTotal`                     | Utilities                                                        | `MoneyInput`               | Optional                                 | `utilityTotal`                     |
| `domesticHelpTotal`                | Domestic help                                                    | `MoneyInput`               | Optional                                 | `domesticHelpTotal`                |
| `lifestyleTotal`                   | Lifestyle and personal                                           | `MoneyInput`               | Optional                                 | `lifestyleTotal`                   |
| `kidsSchoolFees`                   | Kids school fees and tuition                                     | `MoneyInput`               | Optional (shown for `kids`)              | `kidsSchoolFees`                   |
| `kidsActivities`                   | Kids activities — sports, hobby classes                          | `MoneyInput`               | Optional (shown for `kids`)              | `kidsActivities`                   |
| `parentsSupport`                   | Parents / in-laws support                                        | `MoneyInput`               | Optional                                 | `parentsSupport`                   |
| `parentsCity`                      | Where do your parents reside?                                    | select                     | Optional (shown when parentsSupport > 0) | `parentsCity`                      |
| `parentsHealthInsuranceSumInsured` | Sum insured (₹)                                                  | `MoneyInput` + toggle gate | Optional                                 | `parentsHealthInsuranceSumInsured` |
| `parentsEmergencyCash`             | Liquid cash set aside specifically for parents medical needs (₹) | `MoneyInput`               | Optional (shown when parentsSupport > 0) | `parentsEmergencyCash`             |

Legacy granular expense fields (`vegetables`, `grocery`, `medicine`, `fuel`, `cabMetro`, `electricity`, `internet`, `gas`, `water`, `houseHelpMonthly`, `cookHelpMonthly`, `entertainment`, `shopping`, `personalCare`) are kept in schema/normalizer for backward compatibility but are no longer primary UI inputs.

### Step 5 — Insurance

| Code field                                | Label shown in UI             | Type         | Required                                         | Stored in `FinancialProfile`             |
| ----------------------------------------- | ----------------------------- | ------------ | ------------------------------------------------ | ---------------------------------------- |
| `hasHealthInsurance`                      | Do you have health insurance? | toggle       | Optional                                         | `hasHealthInsurance`                     |
| `healthInsuranceSumInsured`               | Sum insured                   | `MoneyInput` | Required if `hasHealthInsurance = true`          | `healthInsuranceSumInsured`              |
| `healthInsurancePremiumInput`             | Premium amount                | `MoneyInput` | Required if `hasHealthInsurance = true`          | `healthInsurancePremiumInput`            |
| `healthInsurancePremiumFrequency`         | Monthly / Yearly              | toggle       | Optional                                         | `healthInsurancePremiumFrequency`        |
| `hasTermInsurance`                        | Do you have term insurance?   | toggle       | Optional                                         | `hasTermInsurance`                       |
| `termInsuranceSumAssured`                 | Sum assured                   | `MoneyInput` | Required if `hasTermInsurance = true`            | `termInsuranceSumAssured`                |
| `termInsurancePremiumInput`               | Premium amount                | `MoneyInput` | Required if `hasTermInsurance = true`            | `termInsurancePremiumInput`              |
| `termInsurancePremiumFrequency`           | Monthly / Yearly              | toggle       | Optional                                         | `termInsurancePremiumFrequency`          |
| `termInsurancePremiumTillYear`            | Premium paying till year      | number input | Optional                                         | `termInsurancePremiumTillYear`           |
| `carInsurancePremiumInput`                | Car insurance premium         | `MoneyInput` | Optional                                         | `carInsurancePremiumInput`               |
| `carInsurancePremiumFrequency`            | Monthly / Yearly              | toggle       | Optional                                         | `carInsurancePremiumFrequency`           |
| `bikeInsurancePremiumInput`               | Two-wheeler insurance premium | `MoneyInput` | Optional                                         | `bikeInsurancePremiumInput`              |
| `bikeInsurancePremiumFrequency`           | Monthly / Yearly              | toggle       | Optional                                         | `bikeInsurancePremiumFrequency`          |
| `hasOtherInsurance`                       | Any other insurance premium?  | toggle       | Optional                                         | `hasOtherInsurance`                      |
| `otherInsurancePremiums[i].policyName`    | Policy name                   | text input   | Optional                                         | `otherInsurancePremiums[].policyName`    |
| `otherInsurancePremiums[i].premiumAmount` | Premium amount                | `MoneyInput` | Required per row when `hasOtherInsurance = true` | `otherInsurancePremiums[].premiumAmount` |
| `otherInsurancePremiums[i].frequency`     | Monthly / Yearly              | toggle       | Optional                                         | `otherInsurancePremiums[].frequency`     |
| `lifeInsuranceMaturityAmount`             | Maturity amount (if any)      | `MoneyInput` | Optional (shown with other insurance section)    | `lifeInsuranceMaturityAmount`            |
| `lifeInsuranceMaturityYear`               | Maturity year (if any)        | number input | Optional (shown with other insurance section)    | `lifeInsuranceMaturityYear`              |

### Step 6 — Assets/Savings

| Code field                                 | Label shown in UI                                      | Type            | Required                                              | Stored in `FinancialProfile`              |
| ------------------------------------------ | ------------------------------------------------------ | --------------- | ----------------------------------------------------- | ----------------------------------------- |
| `fdValue`                                  | Fixed Deposit total value                              | `MoneyInput`    | Optional                                              | `fdValue`                                 |
| `fdRate`                                   | FD interest rate %                                     | number input    | Optional                                              | `fdRate`                                  |
| `fdTenureYears`                            | FD tenure in years                                     | number input    | Optional                                              | `fdTenureYears`                           |
| `fdMaturityYear`                           | FD maturity year                                       | number input    | Optional                                              | `fdMaturityYear`                          |
| `savingsAccountBalance`                    | Savings account (instantly available)                  | `MoneyInput`    | Optional                                              | `savingsAccountBalance`                   |
| `liquidMFValue`                            | Liquid mutual funds                                    | `MoneyInput`    | Optional                                              | `liquidMFValue`                           |
| `otherLiquidSavings`                       | Other liquid savings                                   | `MoneyInput`    | Optional                                              | `otherLiquidSavings`                      |
| `bereavementFund`                          | Amount set aside (savings / FD you can break quickly)  | `MoneyInput`    | Optional                                              | `bereavementFund`                         |
| `totalEquityValue`                         | Total equity investments (MF + stocks + RSU/ESOP)      | `MoneyInput`    | Optional                                              | `totalEquityValue`                        |
| `ppfBalance`                               | PPF current balance                                    | `MoneyInput`    | Optional                                              | `ppfBalance`                              |
| `npsBalance`                               | NPS current balance                                    | `MoneyInput`    | Optional                                              | `npsBalance`                              |
| `epfBalance`                               | EPF / PF current balance                               | `MoneyInput`    | Optional                                              | `epfBalance`                              |
| `ownsHome`                                 | Do you own a home?                                     | toggle          | Optional                                              | `ownsHome`                                |
| `homeMarketValue`                          | Current market value                                   | `MoneyInput`    | Required if `ownsHome = true`                         | `homeMarketValue`                         |
| `homeLoanOutstanding`                      | Outstanding home loan                                  | `MoneyInput`    | Required if `ownsHome = true`                         | `homeLoanOutstanding`                     |
| `ownsCar`                                  | Do you own a car?                                      | toggle          | Optional                                              | `ownsCar`                                 |
| `carMarketValue`                           | Current market value                                   | `MoneyInput`    | Required if `ownsCar = true`                          | `carMarketValue`                          |
| `carLoanOutstanding`                       | Outstanding car loan                                   | `MoneyInput`    | Required if `ownsCar = true`                          | `carLoanOutstanding`                      |
| `goldValue`                                | Gold and jewellery estimated value                     | `MoneyInput`    | Optional                                              | `goldValue`                               |
| `otherAssets`                              | Any other property or asset                            | `MoneyInput`    | Optional                                              | `otherAssets`                             |
| `otherAssetLabel`                          | What is the other asset?                               | text input      | Optional                                              | `otherAssetLabel`                         |
| `monthlySIP`                               | Monthly SIP amount currently running                   | `MoneyInput`    | Optional                                              | `monthlySIP`                              |
| `monthlyRD`                                | Monthly RD amount currently running                    | `MoneyInput`    | Optional                                              | `monthlyRD`                               |
| `monthlyPPFContribution`                   | Monthly PPF contribution                               | `MoneyInput`    | Optional                                              | `monthlyPPFContribution`                  |
| `monthlyNPSContribution`                   | Monthly NPS contribution                               | `MoneyInput`    | Optional                                              | `monthlyNPSContribution`                  |
| `monthlyEPFContribution`                   | Monthly EPF contribution — employee side only          | `MoneyInput`    | Optional                                              | `monthlyEPFContribution`                  |
| `ssy`                                      | Monthly SSY deposit (girl child under 10)              | `MoneyInput`    | Optional (shown only when eligible girl child exists) | `ssy`                                     |
| `investsInNsc`                             | I hold NSC (National Savings Certificate)              | checkbox toggle | Optional                                              | `investsInNsc`                            |
| `nscDepositAmount`                         | NSC amount (one-time / current holding)                | `MoneyInput`    | Optional (shown when NSC checked)                     | `nscDepositAmount`                        |
| `nscMaturityYear`                          | NSC maturity year                                      | number input    | Optional (shown when NSC checked)                     | `nscMaturityYear`                         |
| `customInvestments[i].label`               | Custom investment name                                 | text input      | Optional (max 5 rows)                                 | `customInvestments[].label`               |
| `customInvestments[i].currentValue`        | Custom investment current value                        | `MoneyInput`    | Optional (max 5 rows)                                 | `customInvestments[].currentValue`        |
| `customInvestments[i].monthlyContribution` | Custom investment monthly contribution                 | `MoneyInput`    | Optional (max 5 rows)                                 | `customInvestments[].monthlyContribution` |
| `customInvestments[i].type`                | Custom investment type (equity/debt/real_estate/other) | select          | Optional (max 5 rows)                                 | `customInvestments[].type`                |

### Step 7 — Goals

| Code field                | Label shown in UI                        | Type         | Required                                    | Stored in `FinancialProfile` |
| ------------------------- | ---------------------------------------- | ------------ | ------------------------------------------- | ---------------------------- |
| `primaryGoal`             | Primary goal                             | card select  | Required                                    | `primaryGoal`                |
| `retirementTargetCorpus`  | Retirement target corpus                 | `MoneyInput` | Optional                                    | `retirementTargetCorpus`     |
| `retirementAge`           | Target retirement age                    | number input | Optional                                    | `retirementAge`              |
| `kidsEducationFundTarget` | Kids education fund target (₹ per child) | `MoneyInput` | Required for `lifeStage = kids`             | `kidsEducationFundTarget`    |
| `kidsMarriageFundTarget`  | Kids marriage fund target (₹ per child)  | `MoneyInput` | Optional                                    | `kidsMarriageFundTarget`     |
| `emergencyFundTarget`     | Emergency fund target                    | `MoneyInput` | Optional                                    | `emergencyFundTarget`        |
| `medicalEmergencyFund`    | Medical emergency fund                   | `MoneyInput` | Optional                                    | `medicalEmergencyFund`       |
| `homePurchaseTarget`      | Home purchase target                     | `MoneyInput` | Optional (shown when user pays rent)        | `homePurchaseTarget`         |
| `homePurchaseYear`        | Target year                              | number input | Optional (shown when user pays rent)        | `homePurchaseYear`           |
| `carPurchaseTarget`       | Car purchase target                      | `MoneyInput` | Optional (shown when user does not own car) | `carPurchaseTarget`          |
| `carPurchaseYear`         | Target year                              | number input | Optional (shown when user does not own car) | `carPurchaseYear`            |

---

## 22. EXACT FINANCIAL RULES

Source: `lib/financialEngine.ts`, `lib/universal-buckets.ts`, `lib/priorityEngine.ts`, and `lib/amortisation.ts`.

### Bucket caps (exact percentages)

- `needs`: `30%` of monthly income (fixed).
- `wants`: `5%`.
- `security`: `5%`.
- `loans`: `40%` (includes home-loan and second-property EMI obligations).
- `investment`: `20%`.
- Total cap allocation is always `100%` (`30+5+5+40+20`).

### Consolidated expense actuals (implemented)

`getUniversalBucketActuals()` and priority planning both now prefer consolidated totals when present, else fallback to legacy granular sums:

- `foodActual = foodTotal > 0 ? foodTotal : vegetables + grocery + medicine`
- `transportActual = transportTotal > 0 ? transportTotal : fuel + cabMetro`
- `utilityActual = utilityTotal > 0 ? utilityTotal : electricity + internet + gas + water`
- `domesticActual = domesticHelpTotal > 0 ? domesticHelpTotal : houseHelpMonthly + cookHelpMonthly`
- `lifestyleActual = lifestyleTotal > 0 ? lifestyleTotal : entertainment + shopping + personalCare`

Usage in budget logic:

- `needs` consumes food/transport/utility/domestic (+ housing, kids, parents support)
- `wants` consumes lifestyle (+ its other existing components)

### Emergency fund formula

1. `monthlyExpenses = universalBucketActuals.needs`
2. Weighted emergency corpus (`computeRealEmergencyFund`):
   - `savingsAccountBalance * 1.0`
   - `liquidMFValue * 0.95`
   - `fdValue * 0.7`
   - `otherLiquidSavings * 0.5`
   - `emergencyFundCurrent * 1.0` (legacy field)
3. `realTotal = sum(all above)`
4. `monthsCovered = realTotal / monthlyExpenses` (if expenses > 0)
5. Engine target band for gap:
   - `bachelor`: min 3 months, max 6 months
   - `married`: min 6 months, max 12 months
   - `kids`: min 9 months, max 12 months
   - `senior`: min 6 months, max 12 months (by current branching)
6. `emergencyFundTargetMax = monthlyExpenses * emergencyFundMonthsMax`
7. `emergencyFundGap = max(0, emergencyFundTargetMax - realTotal)`

Checklist status logic used in section output:

- `critical` if `monthsCovered < 3`
- `warning` if `3 <= monthsCovered < 6`
- `ok` if `monthsCovered >= 6`

### Term insurance formula

From `calculateTermNeeded(data)`:

1. `monthlyTotalIncome = monthlySalary + spouseIncome(if not bachelor) + otherIncome`
2. `annualIncome = monthlyTotalIncome * 12`
3. `base = annualIncome * 10`
4. `liabilities = homeLoanOutstanding + carLoanOutstanding`
5. `equityTotal = totalEquityValue > 0 ? totalEquityValue : (mfValue + indianStocksValue + usStocksValueINR + usMFValueINR + rsuValueINR)`
6. `customInvestmentTotal = sum(customInvestments[].currentValue)`
7. `existingAssets = equityTotal + ppfBalance + epfBalance + fdValue + customInvestmentTotal`
8. `dependentCount = (lifeStage != bachelor ? 1 : 0) + numberOfKids + (parentsSupport > 0 ? 1 : 0)`
9. `dependentBuffer = dependentCount * 20,00,000`
10. Age multiplier:

- `< 30` => `1.2`
- `30-39` => `1.0`
- `40-49` => `0.8`
- `>= 50` => `0.6`

11. `rawTermNeed = (base + liabilities + dependentBuffer - existingAssets) * ageMultiplier`
12. `termNeeded = max(50,00,000, rawTermNeed)`
13. Final output rounded up to nearest `10,00,000`:
    - `ceil(termNeeded / 10,00,000) * 10,00,000`

### Term insurance status scoring logic

- `missing` term cover (`!hasTermInsurance` OR `termCover = 0`): `critical` issue (`-15` score impact).
- `underinsured` term cover (`termCover > 0` and `< termNeeded`): `warning` issue (`-7` score impact).
- `adequate` term cover (`termCover >= termNeeded`): no term-gap penalty.

### Debt outstanding estimation (priority plan)

Debt ranking in `buildPriorityPlan()` uses this order per debt:

1. Use explicit outstanding field if provided (for example `personalLoanOutstanding`).
2. Else if `rate > 0` and `remainingMonths > 0`, use amortisation present-value formula:
   - `calculateOutstanding(emi, annualRate, remainingMonths)`
3. Else fallback to deterministic EMI-month estimate by loan type.

### Unified loans normalization bridge

- Step 3 UI captures loans in `unifiedLoans[]`.
- `normalizeAnalyseFormValues()` maps first loan of each core type back to legacy scalar fields:
  - personal -> `personalLoanEMI`, `personalLoanOutstanding`, `personalLoanRate`, `personalLoanRemainingMonths`
  - car -> `carLoanEMI`, `carLoanOutstanding`, `carLoanRate`, `carLoanRemainingMonths`
  - bike -> `bikeEMI`, `bikeLoanRate`, `bikeLoanRemainingMonths`
- Remaining loans (non-first per type) are mapped into `additionalObligations[]` so downstream priority/debt logic remains backward compatible.
- `financialProfileToFormValues()` performs reverse mapping so older saved profiles render in the unified `My Loans` UI.

Additional term rules in checklist:

- Strong baseline marker at `>= 1,00,00,000` cover.
- Adequacy floor: `max(50,00,000, termNeeded * 0.5)`.

### Health insurance minimums

Current implementation has two layers:

1. Checklist target by family type (`financialEngine.ts`):
   - `bachelor`: `₹5,00,000`
   - non-bachelor (`married`, `kids`, `senior`): `₹10,00,000`

2. Medical emergency cash target by city tier and family situation (`medicalEmergencyTargetLiquid`):
   - Base by city tier:
     - `metro`: `₹3,00,000`
     - `tier2`: `₹2,50,000`
     - `tier3`: `₹2,00,000`
   - Add `₹50,000` if `selfAge >= 45`
   - Add `₹50,000` if `lifeStage === kids`

### Score calculation

`analyseFinances` now computes a canonical score:

- `criticalIssues = count(issue.severity === "critical")`
- `warningIssues = count(issue.severity === "warning")`
- `infoIssues = count(issue.severity === "info")`
- `overallScore = clamp(0..100, 100 - criticalIssues*15 - warningIssues*7 - infoIssues*2)`

Returned fields include:

- `overallScore`
- `criticalIssueCount`
- `warningIssueCount`
- plus existing `scores` object (`savingsRate`, `debtRatio`, `untrackedCash`, `emergencyFundGap`)

### Status thresholds

Exact thresholds in code:

- Universal bucket status (`getUniversalBucketStatus`):
  - `good`: `actual <= capAmount`
  - `warning`: `actual <= capAmount * 1.15`
  - `critical`: `actual > capAmount * 1.15`

- Medical emergency fund checklist:
  - `ok`: `current >= target`
  - `warning`: `current >= target * 0.5` and `< target`
  - `critical`: `< target * 0.5`

- Insurance reserve checklist:
  - `ok`: liquid reserve `>= 12 months` premiums
  - `warning`: `>= 50%` of reserve target and `< 100%`
  - `critical`: `< 50%` of reserve target
  - `na`: if no insurance products exist

- Term insurance checklist:
  - `critical`: no term insurance
  - `ok`: cover `>= 1Cr` OR `>= termAdequacyFloor`
  - `warning`: otherwise

---

## 23. AI PROMPT CONTENT

Source: `app/api/ai/analyse/route.ts`.

### System prompt

Exact `FINKOIN_SYSTEM` string:

```text
You are Finkoin AI.
You are a personal financial advisor for India.
CRITICAL RULES:
1. Code engine has calculated ALL numbers.
2. Follow priority order exactly.
3. Use only retrieved knowledge for rates.
4. Return valid JSON only.
```

### User prompt template

Exact template sent as `messages[1].content`:

```text
${knowledgeContext}

CALCULATED PRIORITY PLAN (use these numbers):
${JSON.stringify(priorityPlan, null, 2)}

Return ONLY JSON:
{
  "greeting": "",
  "overallSummary": "",
  "priorityExplanations": {},
  "debtStrategy": "",
  "goalAdvice": "",
  "thisWeekAction": "",
  "in12Months": "",
  "encouragement": "",
  "disclaimer": "Educational only. Not SEBI registered investment advice."
}
```

Injected runtime variables:

- `knowledgeContext` from `formatForPrompt(retrieveKnowledge(...))`
- `priorityPlan` from `buildPriorityPlan(profile, analysis)`

### Output schema

Route expects AI output parseable JSON object with these keys:

- `greeting: string`
- `overallSummary: string`
- `priorityExplanations: object`
- `debtStrategy: string`
- `goalAdvice: string`
- `thisWeekAction: string`
- `in12Months: string`
- `encouragement: string`
- `disclaimer: string`

Route response shape on success:

```json
{
  "priorityPlan": {},
  "explanations": {},
  "knowledgeUsed": ["..."]
}
```

### Fallback behavior

If AI parse or call fails:

- Missing `GROQ_API_KEY` => `503` with `{ "error": "AI not configured" }`
- Missing input payload => `400` with `{ "error": "Missing data" }`
- Model/runtime failure with built `priorityPlan` => `200` with:
  - `priorityPlan`
  - deterministic `fallbackExplanations`
  - `knowledgeUsed: []`
  - `isFallback: true`
- Model/runtime failure before `priorityPlan` exists => `500` with `{ "error": "<message>" }`

---

## 24. LIFE STAGE BUSINESS RULES

Sources: `lib/financialEngine.ts` and `lib/priorityEngine.ts`.

Important implementation note:

- `financialEngine.ts` uses life stages: `bachelor`, `married`, `kids`, `senior`.
- `priorityEngine.ts` now normalizes stage strings via `normalizeStage()` and maps legacy `single -> bachelor`.

### Bachelor/Single

- **Emergency fund months:**
  - In `financialEngine`: target band `3-6` months.
  - In `priorityEngine` for normalized `stage === "bachelor"`:
    - `6` months if no parent support
    - `9` months if parent support > 0
- **Term insurance rule:**
  - Dependent count excludes spouse (for bachelor), may still include kids and dependent parents.
  - Minimum hard floor still `₹50L`.
- **Priority differences:**
  - Usually fewer dependent buffers than married/kids due to spouse absence.

### Married no kids

- **Emergency fund months:**
  - In `financialEngine`: target band `6-12` months.
  - In `priorityEngine`:
    - `6` months when spouse income > 0 and no kids
    - `9` months when spouse income = 0 and no kids
- **Additional vs single:**
  - Term dependent count includes spouse (`+1`) because lifeStage is not bachelor.

### Married with kids

- **Emergency fund months:**
  - In `financialEngine`: target band `9-12` months.
  - In `priorityEngine` (`stage === "kids"`): `12` months.
- **SSY rule (trigger):**
  - Triggered when at least one child is `girl` and age `< 10`.
  - Checklist item appears and asks SSY contribution if missing.
- **Additional priorities:**
  - Child education and marriage checklist items appear when `numberOfKids > 0`.

### Senior 50+

- **Emergency fund months:**
  - In `financialEngine`, `senior` currently resolves to min `6`, max `12` (fallback branch).
  - In `priorityEngine`, normalized `stage === "senior"` uses `12` months.
- **Investment risk rule:**
  - No explicit risk-profile allocation model in these files yet.
- **Retirement-specific rules:**
  - Term insurance calculation uses age multiplier `0.6` for `age >= 50`.
  - Retirement target fields exist in form/schema, but dedicated retirement planner logic is still limited.

---

## 25. COMPONENT RELATIONSHIPS

### Form flow

`components/forms/analyse-onboarding-form.tsx`

- reads/writes: `store/financialStore.ts` (`setAnalysis`, `setFullAnalysis`, `setCurrentStep`, `setAiPlan`)
- reads auth user from `store/authStore.ts`
- uses components: `components/ui/MoneyInput.tsx`, local `ToggleButtons`, `RadioCards`, `PremiumField`, and `components/ui/button.tsx`
- validation source: `lib/analyse-form-schema.ts` step schemas + normalize helpers
- submit sequence:
  1. validate final step
  2. `normalizeAnalyseFormValues`
  3. `setFullAnalysis` (runs `analyseFinances`)
  4. `getAIFixPlan` from `lib/aiService.ts`
  5. optional snapshot upsert (`lib/userAnalyseSnapshot.ts`)
  6. navigate to `/analyse/result`
- route wrapper: `app/analyse/page.tsx`

### Result flow

`app/analyse/result/page.tsx`

- reads from: `store/financialStore.ts` (`lastSubmission`, `result`), `store/authStore.ts` (`user`)
- calculates priority/safety-net via `lib/priorityEngine.ts` and gauge props via `lib/speedo-meter-buckets.ts`
- shows sections:
  - health hero + score card
  - net-worth summary
  - bucket metrics + allocation table
  - health gauges
  - 5-point safety net with progress
  - fix-plan preview + unlock card
- unlock action:
  - FK redemption via `lib/payment.ts` (`redeemFKTokens`)
  - handled through `PaywallModal`
  - then navigates to `/analyse/fixplan`

### Fix plan flow

`app/analyse/fixplan/page.tsx`

- reads from: `store/financialStore.ts` + `store/authStore.ts`
- access gate: `canAccessFixPlan` from `lib/payment.ts`
- cache path: `lib/cache.ts` (`hashProfile`, `getCachedPlan`, `setCachedPlan`)
- API call on cache miss: `POST /api/ai/analyse` (`app/api/ai/analyse/route.ts`)
- shows sections:
  - loading gradient with rotating messages
  - greeting summary card
  - ranked priority cards with urgency and weekly actions
  - debt strategy table
  - goal plan block
  - score projection panel
  - this-week and encouragement cards
  - download CTA button
- download/PDF:
  - implemented via `downloadOptimizerPDF()` in `lib/generatePDF.ts`
  - button triggers full multi-page report export for fix plan and optimizer

---

## 26. QUICK REFERENCE CARD

### To change a form field label

- File: `components/forms/analyse-onboarding-form.tsx`
- How: find the corresponding `label` prop/text and update it.

### To change a financial rule number

- File: `lib/financialEngine.ts` (and caps in `lib/universal-buckets.ts`)
- How: update the constant/threshold and re-run checks.

### To add a new knowledge entry

- Where: Supabase table `finkoin_knowledge`
- Code changes: not required for basic content additions.

### To change AI behavior

- File: `app/api/ai/analyse/route.ts`
- Where: `FINKOIN_SYSTEM` prompt and user JSON template in `messages`.

### To change what is cached

- File: `lib/cache.ts`
- Where: `hashProfile()` + local cache payload keys (`CACHE_KEY = "finkoin_ai_cache"`).

### To change priority order

- File: `lib/priorityEngine.ts`
- Where: `buildPriorityPlan()` and priority `push` order.

### To verify env / secrets layout

- Run `npm run check:secrets` (fails if service-role / Razorpay secret / Groq key are referenced outside allowed server files).

### To change tracker Safety Pulse rules

- File: `lib/trackerSafetyPulse.ts` (`computeMonthSafetyPulse`)
- UI: `components/tracker/MonthSafetyPulse.tsx` on `/tracker`
- Tests: `lib/trackerSafetyPulse.test.ts`

### To add a new page

1. Create `app/[pagename]/page.tsx`
2. Add route link in `components/global-navbar.tsx`

### To change subscription tiers

- File: `lib/payment.ts` and `store/authStore.ts`
- Where: `canAccessFixPlan()` checks and tier mapping logic.

### To add FK token reward

- File: relevant page/component action
- How: call `gamificationStore.earnTokens(amount, label)` in the event flow.

### Emergency numbers to know

- Supabase URL: `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`)
- GA4 Measurement ID (optional): `.env.local` / Vercel (`NEXT_PUBLIC_GA_MEASUREMENT_ID`)
- Groq key: `.env.local` (`GROQ_API_KEY`)
- Secret scope audit: `npm run check:secrets`
- Cache key name: `'finkoin_ai_cache'`
- Financial store key: `'finkoin-financial'` (scoped per-user in localStorage)
- Tax calculator key: `'finkoin_tax_calculator'` (tax regime planner autosave; not user-scoped — device-only)
- Auth store key: `'finkoin-auth'`

### To check what is saved in Supabase

- Table Editor in Supabase dashboard
- user_analyse_snapshots -> form data
- user_analysis -> structured profile + result
- gamification -> FK balance
- user_policies -> insurance vault

### To fix a broken user account

- Check users table has their row
- Check gamification row exists
- If missing: INSERT manually with user_id
- Check RLS policies are enabled

---

## CHANGE LOG

### 2026-08-04 — Tracker month unlock, Split iOS join, OG SEO, DB audit notes

_Tracker:_

- Next calendar month in `/tracker` unlocks only on/after the **last Friday** of the current month (`lib/trackerMonthIncome.ts`: `lastFridayOfMonth`, `isNextTrackerMonthUnlocked`, `trackerForwardLimit`). Mid-month (e.g. 4 Aug) shows **August only**; September appears from that Friday onward. Selection beyond the limit snaps back.

_Split / PWA:_

- Fixed broken iOS “close browser → open PWA” invite handoff (storage siloed). `shouldOfferOpenInApp` is **Android-only**; iOS joins in-browser. `SplitInviteResume` also routes logged-out users with a pending invite to `/login?next=…`.
- Shared `components/ui/ShareButton.tsx` for calculators (and Learn share reuses it) so PWA users can share without an address bar.

_SEO / OG:_

- Regenerated product + blog OG PNGs via `npm run og:placeholders` (`scripts/generate-og-placeholders.mjs`) with real logo + tagline.
- New banners: `og-emi`, `og-ppf`, `og-po`, `og-emergency`, `og-fire`; blog `know-taxation-in-india.png`.
- `lib/seo.ts` `socialImageTags()` / `absoluteOgUrl()`; Learn articles always set OG/Twitter images; `CALC_OG_IMAGE` covers all indexable calculators; blog JSON-LD includes `image`.

_Calculators:_

- Post Office scheme calculators + Jul–Sep 2026 rates (`lib/postOfficeSchemes.ts`).
- Money max ₹99 crore; rate decimal + slider sync (`lib/calculatorInput.ts`).

_Docs / DB:_

- `supabase/USER_DATA_AUDIT_NOTES.sql` — read-only per-user audit queries.
- This file: §§36–39 inventory (DB used vs unused, every API route, SEO/OG/Share, sync matrix).

### 2026-07-18 — v0.4.0+ (doc sync: open invites, profile assets, home mobile UX)

_Product / Split:_

- **Open shareable invite links:** `linkOnly` invites use marker email `__open__@finkoin.invite`; reusable pending tokens; join does not require email match; UI via `InviteLinkShare` (Copy + WhatsApp).
- **Create group simplified:** name + optional emoji only; post-create invite step; group type removed from UI (always `general`).
- **Balances:** app-side `lib/splitBalances.ts` + `GET /api/split/balances`; simplified settle-up edges on group page.
- **API hardening:** `lib/apiGuard.ts` on AI analyse, split invite/settle, feedback, Razorpay create-order (see also end-of-file v0.4.0 notes).

_Profile / Assets:_

- Editable **Assets** on `/profile` (`ProfileAssets` + `profileAssetsPatch` + `syncProfileAssets`) — cash / investments / physical / liabilities; Add menus; privacy eye; syncs Zustand + `user_analyse_snapshots` and recomputes net worth / checklist.
- Checklist mobile layout aligned with investments-style rows; `BackLink` on profile, goals, investments, calculators, split.

_Home / mobile:_

- Compact hero carousel on phone; quick tools **below** banner (`HomeMobileQuickTools` order: SIP, SWP, Split, Tax, EMI, Portfolio, Analyse).
- Removed hero badge row (Earn Finkoins, 10k users, Made in India, bank-level security) and trophy earn line.
- Hero subtitle single-line clamp on mobile.

_Calculators:_

- Mobile Investment/category list scroll fix (bottom padding, BottomSheet pointer-events, reduced motion wrappers).

_Tests:_

- `lib/splitInvite.test.ts`, `lib/profileAssetsPatch.test.ts`, expanded split balance/share tests.

### 2026-07-18 — v0.3.0

- **Analyse loan double-count fix:** `normalizeAnalyseFormValues` in `lib/analyse-form-schema.ts` now treats **`unifiedLoans`** as the single source of truth. When it has entries, extra obligations are derived **only** from it (self-deduped) and the legacy `additionalObligations` is ignored; the previous merge double-counted the same loan when type/lender strings differed (e.g. a lender-carrying copy plus a stale no-lender copy). First-of-type home/personal/car/bike still map to scalar fields **with** their lender; every remaining loan becomes an obligation exactly once, preserving `lenderName`. Regression tests added in `lib/analyse-form-schema.test.ts`. Legacy fallback (no `unifiedLoans`) keeps existing `additionalObligations`.
- **Tracker “Show all” master privacy toggle:** New pill below the purple summary card in `app/tracker/page.tsx` reveals/hides the summary card + Income + all bucket sections + Month Safety Pulse at once (`allAmountsVisible` / `toggleShowAll`). `MonthSafetyPulse` gained a `forceVisible` prop so the master switch controls it while keeping its own eye.
- **Income masking everywhere (privacy):** New reusable `components/ui/PrivateAmount.tsx` — hidden by default (`₹••••••`), eye reveals; the **eye is omitted when the value is 0 / no data**. Applied to analyse result (Total income + paywall Monthly Income), fixplan (Monthly income), optimizer (Monthly income + Total income), Finkoin AI plan view (Monthly income net), onboarding “Total monthly income”, and tax calculator Old/New monthly take-home. Tracker retains its existing masking.
- **Tax calculator multi-source income:** “What best describes you?” (Personal CA wizard) and “Work / income style” (main form) are now **multi-select** in `components/calculators/TaxRegimeCalculator.tsx`. State moved from single `employment` → `employments: EmploymentKind[]`; a derived `primaryEmployment` (priority salaried → freelancer → business_owner → pensioner → retired) is passed to the engine so ITR hints / missed-deduction alerts still fire. `localStorage` persists the array and migrates old single-value data. Tax math itself is unchanged (engine only uses employment for hints, not computation).
- **Founder + SEO:** About page (`app/about/page.tsx`) now shows the real founder photo (`public/assets/founder-himanshu-kumar.png`) via `next/image` with alt text, plus a visible LinkedIn link. Added founder structured data: `ProfilePage` + `Person` JSON-LD on `/about` and a `founder` Person (with `sameAs` LinkedIn `https://www.linkedin.com/in/himanshu-k-81b484140/`) inside the Organization schema in `app/layout.tsx`.
- **Canonical host standardized to `www.finkoin.com`:** Default host unified to **www** (Google indexes `www.finkoin.com`). `SITE_URL` fallback in `lib/seo.ts`, `app/sitemap.ts` baseUrl, `app/robots.ts` sitemap (now derives from `SITE_URL`), and referral origin fallbacks (`app/profile/page.tsx`, `app/refer/page.tsx`) all default to `https://www.finkoin.com`. Hardcoded OG image URLs now derive from `SITE_URL`/`siteUrl` (home, analyse, tax-calculator, root layout). Notification email links (`send-daily-tip`, `welcome-tip`, `send-test-tip`) and legal page website links point to www. Email addresses (`hello@`, `support@`, etc.) unchanged. **Set `NEXT_PUBLIC_SITE_URL=https://www.finkoin.com` in the deploy env** so it matches the fallback.
- **App version:** `package.json` bumped **0.2.0 → 0.3.0**.

### 2026-07-17 — v0.2.0

- **Tracker Month Safety Pulse (brownie feature):** Deterministic analytics engine in `lib/trackerSafetyPulse.ts` compares current vs previous month spend, bucket % caps (Needs 30 / Wants 5 / Loans & Credit 40 / Investment 20), projected month burn, and daily safe spend. UI: `components/tracker/MonthSafetyPulse.tsx` at the bottom of `/tracker` (replaces emoji `SuggestionBox`). Status: **Safe / Tight / Over** + one action + MoM movers. **Own eye toggle** (independent of summary-card privacy eye); amounts masked by default. Income + each bucket section also have **individual eye** toggles.
- **Tracker categories polish:** Purple theme line icons (`components/tracker/TrackerIcons.tsx`) replace emojis; Needs transport split into **fuel / cab / auto / metro_bus** (legacy `transport_essential` still resolves, hidden from picker via `pickerSubcategories`). **Loans & Credit** = regular EMIs; Needs housing type changed from **“Rent / Home loan EMI”** → **“Rent”** only (home EMI is under Loans & Credit → Home loan EMI). Extra lump-sum **loan prepayment is not an Investment type** and is excluded from all tracker maths via `countsTowardTrackerTotals` (spent, caps, Safety Pulse, MoM).
- **App version:** `package.json` bumped **0.1.0 → 0.2.0**.

### 2026-06-02

- **Split invite acceptance hardened:** Added `POST /api/split/join` (`app/api/split/join/route.ts`) for server-authoritative invite acceptance against `split_invitations` + `split_group_members` with email-match enforcement and expiry/status checks.
- **Join redirect reliability:** `app/split/join/JoinSplitGroupClient.tsx` now redirects unauthenticated users with persisted invite context and completes join via server API before navigating to `/split/[groupId]`.
- **Split auth redirect helper expanded:** `lib/splitAuthRedirect.ts` now supports persisted redirect path (`FINKOIN_SPLIT_REDIRECT_KEY`) in addition to invite token fallback.
- **Split docs synced to actual routes/state:** Documented all current files under `app/split/*`, `app/api/split/*`, and `store/splitStore.ts` including soft-delete route usage and hard-delete admin route existence.
- **Notifications + feedback + telemetry docs updated:** Added accurate coverage for `store/notificationStore.ts`, `NotificationBell`, `MorningTipPopup`, `FeedbackWidget`, `FeedbackPopupManager`, `ClarityScript`, `lib/analytics.ts`, Husky hooks, lint-staged config, split-specific ESLint rules, and Vercel cron.
- **New precise flow runbooks:** Added section **30. PRECISE FLOW RUNBOOKS (LINE-BY-LINE)** with exact runtime sequences for split create/invite/join/add/settle/delete/listening, notifications, morning tip popup, feedback popup/submit, Clarity/analytics helpers, and Vercel cron trigger path.

### 2026-05-28

- **Split delete group (soft delete):** Added `DELETE /api/split/groups?groupId=...` in `app/api/split/groups/route.ts`. Only creator can delete; action is a soft close (`is_active=false`) so history remains preserved.
- **Split store delete flow:** `store/splitStore.ts` now exposes `deleteGroup(groupId): Promise<boolean>` and updates local list state after successful API delete.
- **Split mobile UX pass:** Improved touch targets (`min 44px`), safe bottom padding (`pb-[90px]`), list row heights (`min 64/72px`), bottom-sheet style modals, and 16px input text sizing across split pages.
- **Split add-expense amount UX:** Replaced standard amount input on add-expense page with a prominent calculator-style amount panel (large centered purple amount, per-person hint).
- **Microsoft Clarity:** Added `components/ClarityScript.tsx` and mounted it in `app/layout.tsx` using `NEXT_PUBLIC_CLARITY_ID`.
- **Analytics helper unification:** Expanded `lib/analytics.ts` to support both GA and Clarity custom events with new named helpers (`healthCheckStarted`, `healthCheckCompleted`, `splitGroupCreated`, `splitExpenseAdded`, etc.) while preserving compatibility wrappers.
- **Analytics instrumentation updates:** Added/updated event hooks in analyse, fixplan, split, and calculators route pages.

### 2026-05-08

- **Feedback + FK rewards:** Added inline result-page feedback capture (`components/FeedbackWidget.tsx`) storing to `feedback` with optional message/context/score snapshot. On success, awards `+50 FK` via `gamificationStore.addFK(...)` and logs `fk_transactions` reason `feedback_submitted`.
- **Gamification store revamp:** `store/gamificationStore.ts` now includes server-backed methods `fetchGamification` (5-min cache), `addFK`, `updateLoginStreak`, and realtime subscription helpers (`subscribeToRealtime`). Store keeps compatibility methods (`earnTokens`, `awardBadge`, `markEarnedAction`, toast APIs) and persists key balance/rank/streak fields.
- **Realtime sync:** `components/AppInitializer.tsx` now initializes gamification after auth, updates login streak on login day, and subscribes/unsubscribes realtime row sync for `gamification`.
- **Testimonials (24h cache):** Added `components/Testimonials.tsx` reading approved featured feedback (`is_approved=true`, `is_featured=true`, `rating>=4`) with `localStorage` TTL cache (`finkoin_testimonials`, 24h). Integrated into landing experience.
- **Leaderboard (5-min cache + realtime invalidation):** Replaced `/leaderboard` UI with cached `leaderboard_view` fetch (`finkoin_leaderboard`, 5 minutes) plus realtime invalidation on `gamification` updates and manual refresh.
- **Feedback form link surface:** Added reusable `components/FeedbackFormButton.tsx` and integrated it into profile panel (`global-navbar`), settings page, and footer.
- **Schema/features documented:** This release assumes `feedback`, `gamification`, `fk_transactions`, and `leaderboard_view` already exist with realtime enabled on `gamification` and `feedback`.

### 2026-05-07

- **Google Analytics 4:** Optional **`NEXT_PUBLIC_GA_MEASUREMENT_ID`**. **`components/GoogleAnalytics.tsx`** loads gtag (`send_page_view: false`), sends SPA **`page_path`** + enriched **`gtag('config')`** on route/auth changes, sets **`user_id`** when logged in, refreshes **`user_properties`** (**`app_surface`**, **`device_category`**, **`timezone`**, **`language`**). **`lib/analyticsContext.ts`** adds **`app_surface`** (**`pwa`** vs **`browser`** via display-mode / iOS standalone), viewport, referrer hostname, optional **`connection_type`**. **`lib/gtag.ts`** merges context into **every** event. **`AnalyticsBehavior`**: **`scroll_depth`** at 25/50/75/90% (sessionStorage per path). **`TrackImpression`**: viewport **`element_impression`** for home sections. **Instrumented:** hero **`cta_click`** + **`carousel_select`**; home below-fold **`cta_click`**; **`nav_click`** (delegated, zones: **`header_bar`**, **`bottom_nav`**, **`profile_menu`**); **`CalculatorsClient`** **`tool_open`**; **`FeedbackModal`** **`feedback_open`** / **`feedback_submit`**; **`share`** from **`ShareButton`**, **`/refer`** + **`/profile`** copy/WhatsApp; **`profile`** / **`refer`** pages call **`trackShare`**. **`types/gtag.d.ts`** for **`window.gtag`**. Register custom dimensions in GA4 Admin as needed.
- **Marketing / landing:** Homepage hero repositioned as **financial advisor** journey ( **`HomeHeroCarousel`**, **`HomePageBelowFold`** “Meet your finance advisor” card); carousel container padding / **`min-h`** tuned for mobile.
- **Tax regime calculator:** Meal voucher **Rule 3** exemption inputs (monthly benefit × working days × **₹50 vs ₹200** per-meal cap toggle); persisted in autosave schema; salary net of **`mealVoucherExemptionAnnual`**. **`<details>`** steps for additional income / deductions / results; **Step 5 Results** default-open on mobile; mobile **Category | Old | New** table (desktop dual-panel unchanged). **ITR-1/2/3/4** suggestion block from filled data. Removed Indian MF dividend line item; dividends use Indian + foreign only. **`buildMissedDeductionAlerts`** respects **`encourageDeductionInvestment`** when new regime wins so users aren’t pushed into irrelevant 80C tips. Personal CA flow: **`unlockPageScroll`** / effects fix body scroll lock. Minor results chrome (softer borders).
- **SEO & structured data:** **`lib/seo.ts`** / **`app/sitemap.ts`** strip trailing slash from base URL (fixes **`//`** in OG/canonical URLs). **`app/calculators/page.tsx`** emits tax-specific **`WebApplication`** JSON-LD when **`tax-regime`** is active (aligned with **`/calculators/tax-regime-2026`**). Learn **`know-taxation-in-india-old-vs-new-slabs-interest-rates`** + blog **`know-taxation-in-india`** educational content.
- **Auth / stability:** **`AppInitializer`** single-flight **`initStartedRef`** for **`initAuth`**. **`app/analyse/page.tsx`** **`redirectedToLoginRef`** for login redirect. Defensive optional chaining: **`useSearchParams`** / **`usePathname`** nullability in **`CalculatorsClient`**, **`login`**, **`PolicyVaultClient`**, **`ReferralCapture`**, **`global-navbar`** (**`currentPath`**).
- **PWA build:** **`pages/_document.tsx`** minimal **`Document`** for **`next-pwa`** compatibility with App Router builds.
- **Analyse consent persistence:** Consent stored on **`public.users`** (**`data_consent_given`**, **`data_consent_at`**, **`data_consent_version`**) with **`localStorage`** cache **`finkoin_analyse_consent_v2_<userId>`** to avoid repeated DB reads.
- **Secrets & env hygiene:** **`.env.example`** expanded as a safe template (removed any committed real IDs); documents **`NEXT_PUBLIC_`** vs server-only keys; **`npm run check:secrets`** (`scripts/check-server-secrets-scope.mjs`) enforces server secrets only in **`app/api/**`** and **`lib/supabaseServer.ts`**. **§3.1–§3.2\*\* document checklist + tax-module client/server recommendation (tax stays client-side; payment + Groq stay server-side).
- **Feedback:** Either **(A)** **`NEXT_PUBLIC_FEEDBACK_GOOGLE_FORM_URL`** set → modal opens **Google Form** in a new tab only — **no** Finkoin DB or **`/api/feedback`**; enable **email notifications** in Google Forms → Settings → Responses. **(B)** URL unset → **6-step** in-app wizard + **`POST /api/feedback`** → **`app_feedback`** (`answers` jsonb, **`007_app_feedback_answers.sql`**). Optional **`mirrorFeedbackToGoogleForm`** (`lib/googleFeedbackForm.ts`) only applies to mode **B**.

### 2026-05-03

- **Progressive Web App (PWA):** **`next-pwa`** wraps **`next.config.mjs`** (disabled in **`development`**); production emits **`public/sw.js`** and **`workbox-*.js`** (gitignored). **`public/manifest.json`** defines install metadata, shortcuts, and icons. **`app/layout.tsx`** adds manifest link, **`appleWebApp`** startup images, theme color, and Apple touch meta. **`app/offline/page.tsx`** is the document fallback when offline. **`components/PWAInstallPrompt.tsx`** nudges iOS (Add to Home Screen) and Android (**`beforeinstallprompt`**). Asset scripts: **`npm run pwa:assets`** → **`scripts/generate-icons.mjs`** + **`scripts/generate-splashes.mjs`** (requires **`sharp`**). **`middleware.ts`** excludes service worker URLs from Supabase session handling. See **Section 28**.
- **Analyse form & buckets:** **Start fresh** resets **`react-hook-form`** with **`unifiedLoans`**, **`otherInsurancePremiums`**, **`customInvestments`**, **`additionalObligations`** cleared, wipes **`finkoin-financial:<uid>`** + **`finkoin_ai_cache`**, calls **`resetStore()`**. Home loan EMI moved out of the housing card into **My loans** as unified type **`home_loan`** (normalizer maps first row to **`homeLoanEMI`**). Rent helpers + rent+EMI disclaimer updated. Other-insurance rows use per-row **`maturityAmount`** / **`maturityYear`** so new rows don’t inherit maturity. Global **`16px`** inputs (**`app/globals.css`**, **`MoneyInput`**, **`NumberInput`**) to reduce iOS focus zoom. **`lib/universal-buckets.ts`**: security = premiums only; investment includes PPF/EPF/NPS/SSY. **`app/analyse/result/page.tsx`** roadmap buckets use **`getUniversalBucketActuals`** + **`monthlyTotalIncome`** with **Insurance premiums** label. **`app/optimizer/page.tsx`** reuses persisted **`aiPlan`** when present to skip a redundant AI fetch after analyse.

### 2026-05-02

- **Profile & protected UX:** **`ProtectedGate`** waits on **`hasInitialized`** before redirecting to **`/login`**; applied to **`/profile`**, **`/goals`**, **`/investments`**, **`/leaderboard`**, **`/rewards`**, **`/refer`**, **`/settings`**; **`PolicyVaultClient`** and **`/analyse/fixplan`** gate on **`hasInitialized`** to avoid false logged-out UI. Middleware protects the same route prefixes. Navbar profile panel: backdrop, **body scroll lock**, scrollable panel, **KYC removed** from menu, **Sign out** uses **`logout()`** + home redirect. **`refreshUser`** reads **`users.avatar_url`** into **`photoURL`** and persists generated **`referral_code`** when missing. **`ReferralCapture`** + **`applyPendingReferralRewards`** on auth callback. **`/settings`**: name save, avatar upload (**`avatars`** bucket — run **`supabase/manual/referral_code_avatars.sql`**), password reset email, notification toggles (local), JSON export. **`/leaderboard`** reads **`gamification`** + **`users`** names (anonymised). **`/refer`** full share UX + referred list. **`/rewards`** shows live **`gamification`** row.
- **Legal (India / DPDP):** Replaced **`/legal/privacy`** and **`/legal/terms`** with full policies (readable layout, AI/Groq cross-border note, Razorpay, grievance officer, DPDP rights). Added **`/legal/refund`** for Razorpay. **`/privacy`** and **`/terms`** now **`redirect()`** to canonical legal URLs. Footer Legal column + profile dropdown include Privacy, Terms, Refunds, Disclaimer.

- **Auth (complete UX):** **`/login`** is a single **login · sign-up · forgot-password** page (inline reset email, Google OAuth with **`offline`/`consent`** and **`next`** deep-link preservation). **`lib/supabase.ts`** browser client sets **`auth.storageKey: 'finkoin-auth-token'`** and session refresh flags. **`/auth/callback`** uses **`Suspense`**, **`exchangeCodeForSession`**, **`initAuth()`**, **`type=recovery`** → **`/auth/update-password`**, optional **`next`** redirect. **`middleware`** merges refreshed cookies onto login redirects for protected routes. **`authStore`** **`partialize`** persists only **`user`** + **`isLoggedIn`**; **`subscriptionTier`** for UI reads from **`user?.subscriptionTier`** where needed. **Global navbar** **`Log in`** → **`/login`**; **`LoginSheet`** removed from navbar wiring.
- **Auth (production pass):** Added **`@supabase/ssr`**; browser **`createBrowserClient`** + middleware **`createServerClient`** refresh; **`AppInitializer`** waits for Zustand **`persist` rehydration** then **`initAuth()`** to avoid refresh crashes from stale persisted user; **`authStore`** **`hasInitialized`**, **`refreshUser`**, **`signUpWithEmail`**, single **`onAuthStateChange`** subscription, **`logout`** clears persist + sensitive localStorage keys and syncs **`gamificationStore`** FK from **`refreshUser`**; **`AuthSessionSync`** visibility + **`storage`** hooks; protected routes in **`middleware`**; **`/auth/reset-password`** and **`/auth/update-password`**; login **`Suspense`** + **`redirect`** query + Google OAuth + forgot-password link; **`lib/supabaseServer`** **`createSupabaseServerClient`** + lazy admin client; profile sign-out uses **`signOut()`** (full Supabase logout).
- **Tax regime calculator UX & persistence:** progressive-disclosure **toggle sections** for optional income (HRA, 80GG when no HRA, LTA, RSU/ESOP vest+sale, gratuity, leave encashment, business modes 44AD/44ADA/regular, rental NAV worksheet, pension/family pension + commuted sketch, interest splits, dividends, capital gains buckets, agricultural toggle, other income incl. lottery at illustrative 30%); **sticky LIVE SUMMARY** + mobile summary; **localStorage** key **`finkoin_tax_calculator`** with restore on mount and **Reset** reload; **“What you learned today”** recap from enabled sections; reusable **`ToggleSection`** (`components/calculators/ToggleSection.tsx`); illustrative helpers in **`lib/taxCalculatorHelpers.ts`**; engine adds **`slabTaxedOtherGains`**, **`propertyLtcgGains`**, **`lotteryGamblingIncome`**, **`interestSavingsPortion`** (80TTA nudge), updates equity CG illustration to **20% STCG / 12.5% LTCG after ₹1.25L** plus property-LTCG and lottery components in **`computeScheduleRateTax`** (`lib/taxRegimeComparisonFY2026.ts`).
- Added **Tax Regime Comparison** calculator (`tax-regime`): compares **old vs new** regime for **FY 2025-26 (AY 2026-27)** with inputs for salary, other income, age bracket (regular / senior / super senior), HRA flow (metro vs non-metro), 80C/80D/24(b)/80CCD(1B)/other deductions; implements illustrative slabs, ₹75k standard deduction on new regime, ₹50k on old, simplified **87A** (tax wiped when taxable ≤ ₹12L new / ₹5L old), surcharge brackets, and **4% cess**.
- New tax engine lives in `lib/taxRegimeComparisonFY2026.ts`; UI in `components/calculators/TaxRegimeCalculator.tsx` with comparison table, winner banner, monthly take-home diff, free tips, and **₹99 paywall** for expanded narrative + print/PDF via browser (reuses `PaywallModal` with configurable title, bullets, Razorpay description, and **post-payment redirect** back to `/calculators?calc=tax-regime`).
- Registered calculator in `app/calculators/calculator-config.ts` (new **Tax** category), `components/calculators/lazy-calculators.tsx`, and SEO entry + **dynamic `generateMetadata`** on `app/calculators/page.tsx` for `tax-regime` (title/description/keywords targeting old vs new regime 2026).
- **Expanded (same release):** multi-income inputs (salary, business, freelance, pension, rental, interest, CG/dividend proxy, optional agricultural), employment/person flags (incl. NRI toggle), full Chapter VI-A set (80C through 80RRB, 24(b), professional tax, **HRA** + **80GG** auto), **deduction line-by-line** in old-regime card, **missed deduction alerts** (`lib/taxMissedDeductionAlerts.ts`), on-page **FAQ**, and broader SEO keywords.

### 2026-05-01

- Cleaned up duplicate Razorpay routes created by generic integration prompt (none remained under `app/api/` root; canonical routes are only under `app/api/razorpay/`).
- Fixed `checkout-config`, `create-order`, and `verify-payment` to use the correct `/api/razorpay/` prefix consistently with `components/analyse/paywall-modal.tsx`.
- `checkout-config` returns Key ID from `NEXT_PUBLIC_RAZORPAY_KEY_ID` or `RAZORPAY_KEY_ID`; `create-order` is unauthenticated and creates a fixed ₹99 order; `verify-payment` requires Bearer auth and sets `subscription_tier = pro` after signature verification.
- Documentation Section 10 updated for all three Razorpay routes. Build verified passing.
- Fixed `/analyse/result` reload behavior: page now waits for `financialStore.hasHydrated`, restores missing `lastSubmission`/`result` from `user_analyse_snapshots`, and shows safe fallback UI when no snapshot exists (instead of crashing on empty store state).
- Fixed unlock navigation flow on result page with explicit skip/subscription checks and stable `router.push('/analyse/fixplan')` behavior before opening payment modal.
- Fixed `/analyse/fixplan` access gate to honor `NEXT_PUBLIC_SKIP_PAYMENT === 'true'` without redirect loop back to result.
- ISSUES FIXED TODAY:
  - Razorpay integration complete: `create-order`, `verify-payment`, and `checkout-config` routes created.
  - `checkout-config` was missing, causing build/undefined 403 error.
  - Missing route was created to resolve the above issue.
  - Vercel key values were empty, causing 403 responses.
  - `NEXT_PUBLIC_SKIP_PAYMENT` added to Vercel.
- PENDING FIXES (not done yet):
  - Result page crashes on reload (`/analyse/result`) with application error.
    - Fix: add `hasHydrated` check and optional chaining.
    - Fix: restore from Supabase on reload.
  - Clicking unlock button does nothing.
    - Fix: clean `handleUnlockClick` function.
    - Fix: fixplan access gate redirect loop.
  - Razorpay modal not opening.
    - Cause: empty key values in Vercel.
    - Fix: add actual key values from Razorpay dashboard.
    - When ready to charge: set `NEXT_PUBLIC_SKIP_PAYMENT=false` and add real key values.
- CURRENT STATUS:
  - `NEXT_PUBLIC_SKIP_PAYMENT = true` in Vercel.
  - Users can access fixplan without payment.
  - Good for testing and soft launch.
- ENVIRONMENT VARIABLES IN VERCEL:
  - `NEXT_PUBLIC_SKIP_PAYMENT = true`
  - `RAZORPAY_KEY_ID = needs real value`
  - `RAZORPAY_KEY_SECRET = needs real value`
  - `NEXT_PUBLIC_RAZORPAY_KEY_ID = needs real value`
  - All Supabase vars = configured
  - `GROQ_API_KEY = configured`
- Optimizer and report revamp:
  - Standardized universal bucket caps to fixed 100% allocation (`needs 30%, wants 5%, security 5%, loans 40%, investment 20%`).
  - Added back-navigation arrows on result/fixplan/optimizer pages.
  - Added monthly income/outflow/left-in-hand summary cards on result and optimizer pages.
  - Added surplus allocation guidance and richer optimizer sections for allocation, debt payoff, and timelines.
  - Added AI/fallback state indicator and fallback-refresh retry in fixplan flow.
  - Expanded PDF output with monthly summary on page 1, corrected bucket table logic, payoff-date debt table, and stronger sectioned formatting.

### 2026-04-30

- Replaced fragmented Step 3 loan entry UI with a single `My Loans` unified field-array (`unifiedLoans[]`) supporting multiple loan types and OD-specific fields.
- Added normalization bridge so `unifiedLoans[]` maps back into legacy scalar loan fields + `additionalObligations[]` for backward-compatible engine/priority calculations.
- Added reverse mapping from legacy saved profiles into `unifiedLoans[]` so older users see pre-filled loans in the new unified UI.
- Created `components/ui/NumberInput.tsx` to match MoneyInput visual design for rate/month/year numeric fields, including optional suffix support.
- Applied the reusable NumberInput across onboarding ROI %, tenure/months, rate, and maturity/year fields for consistent numeric UX.
- Removed browser number spinner arrows globally (WebKit + Firefox) for app-wide consistency.
- Fixed nested border visual issue in the onboarding form housing/loan flow by flattening toggle sections to left-line indentation instead of stacked inner cards.
- Removed browser spinner arrows from number inputs globally via `app/globals.css` for consistent numeric input appearance.
- Standardized YES/NO toggle styling and plain input visual tokens across the onboarding form.
- Fixed additional obligations numeric field UX by surfacing typeable ROI + remaining-month style fields in each row.
- Updated onboarding schema + UI so `spouseAge` is optional and accepts `0` without validation errors.
- Fixed loan detail fields in onboarding to use interactive numeric bindings (`valueAsNumber`) with explicit ROI/month constraints.
- Fixed additional obligations EMI/outstanding inputs in onboarding field-array via controlled RHF wiring.
- Added vehicle-insurance toggle in onboarding; car/bike premium fields now render conditionally by vehicle status.
- Updated emergency fund math in engines and result UI:
  - weighted corpus uses savings(100%) + liquid MF(95%) + FD(70%) + other liquid(50%)
  - married emergency target now uses 9 months.
- Exposed and consumed `termInsuranceNeeded` + `realEmergencyFund` in deterministic analysis output and result page safety-net cards.
- Recalibrated issue detection + scoring in `financialEngine` (term gap, medical fund gap, and missing investing are now penalized appropriately).
- Fixed result-page net-worth asset aggregation to include home/car/gold/NSC/other assets/equity.
- Refreshed result-page fix-plan CTA copy and teaser hierarchy for stronger problem-first messaging.
- Added shared SEO utilities (`lib/seo.ts`), route metadata layouts, and JSON-LD blocks (WebApplication + homepage FAQ).
- Updated Loans step copy/placement signals for outstanding principals:
  - personal loan outstanding label/helper clarified in Step 3 between EMI and rate
  - car/bike outstanding labels/helpers clarified in vehicle-loan cards.
- Updated term-insurance severity model:
  - no term insurance => `critical`
  - underinsured with existing term cover => `warning` (top-up guidance)
  - adequate cover => no penalty.
- Root cause confirmed: `analyseFinances` return payload was missing surfaced values used by the result screen.
- Added to deterministic return object: `overallScore`, `criticalIssueCount`, `warningIssueCount`, `termInsuranceNeeded`, `realEmergencyFund` summary values, `totalAssets`, `totalLiabilities`, and `netWorth`.
- Updated result page to read score, emergency corpus, term target, and net worth blocks from `result` payload fields.
- Added issue de-duplication guard in engine to prevent repeated codes such as `loans_on_track`.
- Critical bug fixed: `normalizeAnalyseFormValues` was only preserving first loan-per-type behavior and could drop non-core unified loans from downstream debt data.
- All non-primary entries from `unifiedLoans[]` are now merged into `additionalObligations[]` before engine/priority calls, while first personal/car/bike loans still map to legacy scalar fields.
- Added normalization debug log (`=== NORMALIZED LOANS ===`) to verify personal/car/bike mappings and retained additional obligations count at submit time.
- Fixed normalizer to map all `unifiedLoans[]` rows to downstream debt data: first personal/car/bike loans map to legacy scalar fields, and all remaining loans map to `additionalObligations[]`.
- Added migration `005_fix_snapshots.sql` to ensure `user_analyse_snapshots`/`user_analysis` tables and RLS policies exist (resolving snapshot `404` cases).
- Added explicit engine debug log (`=== ALL LOANS IN ENGINE ===`) to verify primary + additional obligation EMI totals before bucket/debt calculations.
- Confirmed store/snapshot persistence path already includes raw `analysis` and JSON payload blobs, so all loan fields persist across sessions.
- Database fully set up in Supabase.
- Added/verified missing columns in `gamification` and `users` (`total_earned`, `created_at`, `fk_balance`, `updated_at`).
- Created/verified tables: `user_stats`, `insurance_clicks`, `user_analyse_snapshots`, `user_analysis`.
- Added/verified `handle_new_user` trigger flow and RLS across tables.
- Identified `financial_profiles` as legacy/deprecated; app uses `user_analysis`.
- Added lender-name preservation for primary normalized loans (`personalLoanLenderName`, `carLoanLenderName`, `bikeLoanLenderName`, `homeLoanLenderName`) so first personal/car/bike mappings no longer lose lender metadata.
- Debt display now surfaces lender names in result-page loan breakdown, fix-plan debt table, and PDF debt table using `displayName`/`lenderName` fallbacks.
- No DB schema changes were needed; lender-name fields persist via existing `jsonb` profile/snapshot columns.
- Added `components/analyse/ConsentModal.tsx` and gated `/analyse` so users must accept data consent before the onboarding form renders.
- _(Superseded 2026-05-07)_ Consent now uses per-user **`localStorage`** **`finkoin_analyse_consent_v2_<userId>`** plus **`users.data_consent_*`** fields — see **§14 `/analyse`** and **§29**.

### 2026-04-25

- Updated section 9 to reflect current `priorityEngine` behavior: consolidated-expense fallback, amortisation-based debt outstanding fallback, equity/custom-investment asset enrichment, and `fdSuggestion` output.
- Cleaned section 17 known issues by moving resolved items out of active issue tracking and keeping unresolved placeholders/TODOs only.
- Expanded section 21 field registry with newly implemented inputs: consolidated expenses, loan rate/month metadata, OD metadata, insurance maturity metadata, FD maturity/rate metadata, NSC maturity year, `totalEquityValue`, and `customInvestments[]`.
- Updated section 22 exact rules to document consolidated expense actual logic and the current debt-estimation order (`explicit outstanding -> amortisation formula -> EMI-month fallback`).

---

## 27. WHAT NOT TO TOUCH WITHOUT CARE

### These files are critical — change carefully with full tests

- `lib/financialEngine.ts`
  - Any threshold change affects all analysis outputs and issue severities.
  - Run: `npm run test` (and build).

- `lib/analyse-form-schema.ts`
  - Changing fields affects validation, normalization, and downstream engine assumptions.
  - Keep `normalizeAnalyseFormValues` and `financialProfileToFormValues` in sync.

- `store/financialStore.ts`
  - Affects all saved form/result state.
  - Maintain persisted shape compatibility and per-user key strategy.

- `supabase/migrations/`
  - Never edit old migrations in place.
  - Always create a new migration file.

### These will break behavior if changed incorrectly

- `hashProfile()` in `lib/cache.ts`
  - Changing hash inputs invalidates all existing AI cache entries.

- Persist key names
  - Renaming localStorage keys (`finkoin-financial`, `finkoin-auth`, cache key) resets user cached state.

- `normalizeAnalyseFormValues()`
  - Must stay consistent with form fields and engine expectations.

### Coverage check for sections 7-23

Core runtime files referenced in sections 7-23 include:

- `store/financialStore.ts`
- `store/authStore.ts`
- `lib/analyse-form-schema.ts`
- `components/forms/analyse-onboarding-form.tsx`
- `lib/financialEngine.ts`
- `lib/universal-buckets.ts`
- `lib/priorityEngine.ts`
- `lib/rag/retriever.ts`
- `lib/cache.ts`
- `app/api/ai/analyse/route.ts`

These are the files that directly drive form data, deterministic calculations, RAG/AI behavior, and caching.

---

## 28. PROGRESSIVE WEB APP (PWA)

Finkoin is installable as a PWA on **Android (Chrome)** and **iOS (Safari)**. The service worker and precache are active only in **production** builds (`next-pwa` sets `disable` when `NODE_ENV === 'development'`).

| Item              | Location / behavior                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Web manifest      | `public/manifest.json` (`start_url: "/"`, `display: standalone`)                                                              |
| Icons             | `public/icons/` (`icon-72x72.png` … `icon-512x512.png`; regenerate with `npm run pwa:icons`)                                  |
| Splash screens    | `public/splash/` (`apple-splash-*.png`; regenerate with `npm run pwa:splashes`)                                               |
| Service worker    | Auto-generated by **next-pwa** into `public/` at build time (`sw.js`, `workbox-*.js`); listed in `.gitignore` — do not commit |
| Offline page      | Route **`/offline`** (`app/offline/page.tsx`); used as **`fallbacks.document`** in Workbox                                    |
| Install prompt UI | `components/PWAInstallPrompt.tsx` (from `AppInitializer`) — **hidden** on `/split/join`, `/login`, `/auth/*`                  |
| Launch helpers    | `lib/pwaLaunch.ts` — `isStandalonePwa`, `shouldOfferOpenInApp` (**Android only**), `tryOpenHttpsInAndroidApp`                 |
| Split resume      | `SplitInviteResume` + `splitAuthRedirect` (localStorage + cookies; **not** shared Safari ↔ iOS PWA)                           |
| **iOS**           | Install via **Safari → Share → Add to Home Screen** only — **no** auto-install; **no** deep-link into PWA with query URL      |
| **Android**       | Chrome **`beforeinstallprompt`**; invite links can `intent://` into installed WebAPK with full path+query                     |

**Cannot auto-install:** browsers block silent Add to Home Screen. Max = custom install button (Android) or guided Share steps (iOS).

**Local PWA check:** run `npm run build` then `npm run start` (not `npm run dev`), open DevTools → Application → Service Workers / Manifest / Cache Storage.

---

## 29. ANALYTICS & GA4 (PRODUCT TELEMETRY)

**Toggle:** Set **`NEXT_PUBLIC_GA_MEASUREMENT_ID`** (e.g. `G-xxxxxxxxxx`) in **`.env.local`** / Vercel. If unset, **`GoogleAnalytics`** renders nothing.

**Stack:**

| Piece                                  | Role                                                                                                                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`components/GoogleAnalytics.tsx`**   | Loads **`gtag.js`**, disables automatic page views, fires **`gtag('config', …)`** on **`pathname`**, **`searchParams`**, and auth (**`user_id`** when logged in). Sets **`user_properties`**.           |
| **`components/ClarityScript.tsx`**     | Loads Microsoft Clarity script after interactive when **`NEXT_PUBLIC_CLARITY_ID`** is set.                                                                                                              |
| **`lib/analyticsContext.ts`**          | **`getAppSurface()`** (PWA standalone vs browser tab), **`getDeviceCategory()`**, **`timezone`**, **`language`**, **`viewport_*`**, **`referrer_hostname`**, optional **`connection_type`**.            |
| **`lib/gtag.ts`**                      | **`trackEvent`** merges **`getAnalyticsContext()`** into every hit. Helpers: **`trackCta`**, **`trackShare`**, **`trackImpression`**, **`trackScrollDepth`**, **`trackToolOpen`**, **`trackNavClick`**. |
| **`lib/analytics.ts`**                 | App-level helper namespace used across pages (`Analytics.*`) that sends events to GA (`window.gtag`) and mirrors custom event names to Clarity (`window.clarity('event', ...)`) when available.         |
| **`components/AnalyticsBehavior.tsx`** | **`scroll_depth`** milestones per route (session-scoped).                                                                                                                                               |
| **`components/TrackImpression.tsx`**   | **`element_impression`** once per **`component_id`**.                                                                                                                                                   |

**Custom events (non-exhaustive):** `cta_click`, `carousel_select`, `element_impression`, `scroll_depth`, `nav_click`, `tool_open`, `share`, `feedback_open`, `feedback_submit`, plus standard enriched **`page_view`** via config.

**Geo / device:** City/country appear in GA4 **Geo** dimensions from Google’s collection pipeline (IP-based). The app does **not** send GPS coordinates.

**Privacy:** Disclose GA + **`user_id`** in **`/legal/privacy`** as applicable; consider consent banners for jurisdictions that require opt-in before analytics.

**Operators:** Register important event parameters as **Custom dimensions** in GA4 Admin → Data display → Custom definitions.

---

## 30. PRECISE FLOW RUNBOOKS (LINE-BY-LINE)

This section documents runtime flow execution in exact sequence using current function/route names and real table names.

### 30.1 Split invite join flow (`/split/join?token=...`)

Client path (`app/split/join/JoinSplitGroupClient.tsx`):

1. `useSearchParams()` reads `token` and/or `code`.
2. Guard waits for `useAuthStore().hasInitialized`.
3. If neither token nor code → `setStatus("error")` with "Invalid invite link".
4. Calls `resolveAuthenticated()` from `lib/authSession.ts`.
5. If unauthenticated:
   - `persistInvite` → `saveSplitInviteToken` / `saveSplitInviteRedirect` (localStorage **+** cookies).
   - If `shouldOfferOpenInApp()` (**Android mobile browser only**):
     - Optionally auto `tryOpenHttpsInAndroidApp(window.location.href)` once per join key.
     - Show **open_app** UI (“Open in Finkoin app” + “Continue in browser”).
   - Else (desktop / **iOS** / already standalone PWA):
     - `router.replace("/login?next=<encoded join URL>")` — **do not** tell iOS users to close the tab and open the home-screen app (storage is siloed; invite would be lost).
6. If authenticated:
   - `fetch("/api/split/join", { method: "POST", credentials: "include", body: { token } | { code } })`
   - On non-200 or `success !== true` → error state + API message (401 → login with invite preserved).
   - On success → `clearSplitInviteRedirect()`, optional `fetchGroups`, success UI → delayed `router.replace("/split/<groupId>")`.

Resume path (any page): `components/SplitInviteResume.tsx` peeks pending `/split/join…` from storage; if logged in → `router.replace(pending)`; if logged out → `/login?next=…`.

Server path (`app/api/split/join/route.ts`):

1. Parse body `{ token }` or `{ code }`; reject if missing (`400`).
2. Auth user from `createSupabaseServerClient().auth.getUser()`.
3. Read invite row from `split_invitations` by `token` **or** resolve group via `invite_code`.
4. Validate invite exists (`404`), not expired (`400`), status in `pending|accepted` (`400`).
5. **If open invite** (`invited_email === __open__@finkoin.invite`):
   - If member already `active` for this email → return success (idempotent).
   - Else upsert `split_group_members` as `active` for logged-in email.
   - **Do not** mark invitation accepted (link stays reusable).
6. **Else (email invite):**
   - Require logged-in email equals `invited_email` (`403` otherwise).
   - Update `split_group_members` where `group_id + email` → `active`, `joined_at`.
   - If invite status is `pending` → `split_invitations.status="accepted"`.
7. Return `{ success: true, groupId, groupName }`.

### 30.2 Split create group flow (`/split` -> create modal)

Client path (`app/split/page.tsx`):

1. `handleCreate()` validates `gName`, authenticated `user.id`, and email.
2. Calls `useSplitStore.createGroup({ name, emoji, type: "general", ... })` — UI no longer collects group type.
3. On success → `Analytics.splitGroupCreated()`.
4. Immediately `inviteMember({ groupId, groupName, linkOnly: true })`.
5. On invite URL → set `createStep = "invite"` and show `InviteLinkShare`.
6. User taps Continue / closes → `finishCreate()` → `router.push("/split/<groupId>")`.

Store path (`store/splitStore.ts`):

1. `createGroup` → `POST /api/split/groups` with `{name, emoji, type, displayName}`.
2. On success → clears `lastFetched` cache map.
3. `inviteMember` → `POST /api/split/invite` with `linkOnly: true` (or email when provided).

Server create path (`app/api/split/groups/route.ts`, `POST`):

1. Authenticated user via `createSupabaseServerClient`.
2. Validate required `name` and authenticated `email`.
3. Insert group in `split_groups` with `created_by`.
4. Insert creator member in `split_group_members` with:
   - `role="admin"`, `status="active"`, `joined_at`.
5. If member insert fails -> rollback by deleting inserted group row.
6. Return `{ success: true, groupId }`.

### 30.3 Split invite send flow

Server path (`app/api/split/invite/route.ts`):

1. Auth + rate limit + membership check (`lib/apiGuard.ts`).
2. Body: `groupId` required; `invitedEmail` optional; `linkOnly` optional.
3. Resolve email:
   - link-only / empty email → `OPEN_SPLIT_INVITE_EMAIL`
   - else validate email format.
4. **Open invite reuse:** if pending open invite exists for group, return its URL (refresh expiry if needed). Skip new insert.
5. Else insert `split_invitations` (`status=pending`, `expires_at = now + 7 days`).
6. **Email invite only:** upsert pending member in `split_group_members`.
7. Build invite URL: `<siteUrl>/split/join?token=<invite.token>`.
8. Email branch (email invites only):
   - if `RESEND_API_KEY` / `EMAIL_FROM` missing → `emailError`
   - else `resend.emails.send(...)`.
9. Return `{ inviteUrl, token, emailSent, emailError, linkOnly }`.

Client UX:

- Create modal + group Invite modal use `InviteLinkShare` (copy / WhatsApp / show URL).
- Group page may auto-call `inviteMember({ linkOnly: true })` when opening Invite.

### 30.4 Split add-expense flow

Client path (`app/split/[groupId]/add-expense/page.tsx`):

1. On mount -> `fetchGroupDetail(groupId)`.
2. Builds `includedMembers` from active members + chips.
3. `handleSubmit()` validations:
   - title present
   - paidBy selected
   - amount > 0
   - at least one included member
   - for `exact`: sum exact equals amount
   - for `percentage`: sum equals 100.
4. Calls `useSplitStore.addExpense(...)`.
5. On success -> `Analytics.splitExpenseAdded()` then `router.push("/split/<groupId>")`.

Store path:

1. `addExpense` -> `POST /api/split/expenses`.
2. Optimistically prepends `json.expense` if returned.
3. Calls `fetchGroupDetail(groupId)` for canonical state.

Server path (`app/api/split/expenses/route.ts`):

1. Auth user via Supabase cookies.
2. Validate required body + amount.
3. Validate requester membership in `split_group_members` for `group_id + email`.
4. Compute shares using `computeSplitShares(...)` (`lib/splitShares.ts`).
5. Insert expense in `split_expenses`.
6. Insert all shares into `split_expense_shares`.
7. Update `split_groups.updated_at`.
8. Return `expense` + `shares`.

### 30.5 Split settle-up flow

Client path (`app/split/[groupId]/page.tsx`):

1. `handleSettle()` prompts for `toEmail` and `amount`.
2. Calls `useSplitStore.settleUp({ groupId, toEmail, amount, ... })`.

Store path:

1. `settleUp` -> `POST /api/split/settle` with `groupId`, `toEmail`, `amount`, `paymentMethod`.
2. On success -> invalidate cache + `fetchGroupDetail(groupId)`.

Server path (`app/api/split/settle/route.ts`):

1. Auth user from cookies.
2. Validate `groupId`, `toEmail`, `amount`.
3. Lookup receiver member in `split_group_members`.
4. Insert settlement in `split_settlements` (`status="completed"`).
5. Fetch expenses in group paid by `toEmail`.
6. Mark matching unsettled shares for current user in `split_expense_shares`:
   - `is_settled=true`, `settled_at=now`.
7. Return settlement row.

### 30.6 Split delete flows

Group soft-delete (currently used by store):

1. Client/store calls `DELETE /api/split/groups?groupId=<id>`.
2. Server verifies authenticated user is group creator (`split_groups.created_by`).
3. Updates `split_groups.is_active=false` and `updated_at`.

Group hard-delete route (exists but not used by store call path):

1. `DELETE /api/split/groups/[groupId]`.
2. Verifies caller active admin in `split_group_members`.
3. Deletes in order:
   - `split_expense_shares` (by expense ids)
   - `split_settlements`
   - `split_invitations`
   - `split_expenses`
   - `split_group_members`
   - `split_groups`.

Expense delete:

1. Client calls `useSplitStore.deleteExpense(groupId, expenseId)`.
2. Store -> `DELETE /api/split/expenses/[expenseId]`.
3. Server allows only expense creator or active group admin.
4. Deletes `split_expense_shares` for expense, then `split_expenses` row.
5. Updates `split_groups.updated_at`.

### 30.7 Split read/list realtime flow

`/split` list page:

1. `fetchGroups(userId, email, forceRefresh)` checks 2-minute TTL cache.
2. Reads active membership from `split_group_members` by `email`.
3. Fetches groups from `split_groups` with `is_active=true`.
4. Realtime channel `my_groups:<userId>` listens to `split_group_members` UPDATE and force-refreshes.
5. Also refreshes on tab focus and visibility restoration.

`/split/[groupId]` page:

1. `fetchGroupDetail(groupId)` parallel fetches:
   - group from `split_groups`
   - members from `split_group_members` (`active|pending`)
   - expenses (+ joined shares) from `split_expenses` / `split_expense_shares`.
2. Loads **`netBalances` + simplified edges** from **`GET /api/split/balances?groupId=`** (`lib/splitBalances.ts`) — not the old `get_split_balances` RPC.
3. Realtime channel listens:
   - `split_expenses` INSERT
   - `split_expense_shares` UPDATE
     and refreshes details.

### 30.8 Notification bell flow

Source: `components/NotificationBell.tsx` + `store/notificationStore.ts`.

1. On login, `fetchNotifications(user.id)`:
   - query `user_notifications` ordered by `created_at desc`, `limit 20`.
2. Store computes `unreadCount = !is_read` count.
3. Realtime channel `notifications:<user.id>` listens `INSERT` on `user_notifications` and re-fetches.
4. Opening bell:
   - toggles panel state
   - if opening and unread > 0 -> `markAllRead(user.id)`.
5. `markAllRead` updates `user_notifications.is_read=true` for user.
6. Dropdown renders each notification card with title/content/time.

### 30.9 Morning tip popup flow

Source: `components/MorningTipPopup.tsx`.

1. Wait for auth (`hasInitialized`, `isLoggedIn`, `user.id`).
2. Gate by IST hour: show logic only between 06:00 and 22:59.
3. Check daily localStorage suppression key:
   - `finkoin_tip_popup_<IST-date>`.
4. Fetch notifications from store.
5. Pick popup candidate via `getTodayUnshownPopup()`:
   - first notification where `shown_as_popup=false` sorted by oldest `created_at`.
6. Show popup after 3-second delay.
7. On close:
   - `markPopupShown(notification.id)` -> updates `user_notifications`:
     - `shown_as_popup=true`
     - `is_read=true`
   - sets localStorage daily suppression key.
8. "Learn more" closes then routes to `/learn`.

### 30.10 Feedback popup + submit flow

Popup manager (`components/FeedbackPopupManager.tsx`):

1. Watches route via `usePathname()`.
2. Tracks only prefixes:
   - `/calculators`, `/tracker`, `/learn`, `/analyse`, `/portfolio`, `/optimizer`.
3. Requires logged-in user.
4. Uses per-context suppression key:
   - `finkoin_feedback_<pageKey>`.
5. If not suppressed, sets 120-second timer then opens modal.

Widget submit (`components/FeedbackWidget.tsx`):

1. Requires star `rating > 0`.
2. Sends `POST /api/feedback` with:
   - `user_id`, `rating`, `message`, `page_context`, `score_at_time`.
3. On success:
   - sets localStorage suppression key
   - shows success state
   - closes after 2 seconds.

### 30.11 Clarity + Analytics helper flow

Clarity script (`components/ClarityScript.tsx`):

1. Reads `process.env.NEXT_PUBLIC_CLARITY_ID`.
2. If unset -> returns `null`.
3. If set -> injects Clarity bootstrap script with `strategy="afterInteractive"`.

Analytics helper (`lib/analytics.ts`):

1. `Analytics.event(name, params?)`:
   - if `window.gtag` -> `gtag("event", name, params)`
   - if `window.clarity` -> `clarity("event", name)`.
2. Named wrappers call `Analytics.event(...)`:
   - `healthCheckStarted`, `healthCheckCompleted`, `splitGroupCreated`, `splitExpenseAdded`, `splitInviteSent`, `feedbackSubmitted`, etc.
3. Backward compatibility wrappers retained:
   - `formStarted`, `formCompleted`, `paymentStarted`, `paymentCompleted`, etc.

### 30.12 Cron notification trigger (deployment schedule)

Source: `vercel.json` + `app/api/notifications/deliver-tip/route.ts` + `app/api/obligations/reminders/route.ts`.

1. Vercel cron runs path `/api/notifications/deliver-tip` and `/api/obligations/reminders`.
2. Schedule: `0 3 * * *` (UTC) = **08:30 IST** daily.
3. For each user without a tip today:
   - RPC `get_next_tip_for_user` → insert `user_notifications` + `user_tip_history`.
   - If Web Push is configured and the user has rows in **`push_subscriptions`**, send an OS notification via `web-push` (`lib/webPush.ts`).
   - Expired endpoints (HTTP 404/410) are deleted from `push_subscriptions`.
4. Obligation reminders: scan active `financial_obligations` where `due_day - today === remind_days_before` (monthly; yearly also matches `due_month`) → insert `user_notifications` with `category: obligation_reminder`.
5. Auth: `Authorization: Bearer CRON_SECRET` or `x-vercel-cron: 1`.
6. In-app: Realtime / bell / morning popup still show tips when the user opens the app.

### 30.13 Device Web Push (OS notifications)

**Why Supabase:** browsers give each device a unique push **endpoint**. Cron cannot notify phones without storing those endpoints — that is what `push_subscriptions` is for (`035_push_subscriptions.sql`).

**Setup**

1. Generate keys: `npx web-push generate-vapid-keys`
2. Set `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY` (and optional `WEB_PUSH_VAPID_SUBJECT`) in `.env.local` + Vercel.
3. Run migration `035_push_subscriptions.sql` on Supabase.
4. Redeploy (production `next-pwa` SW merges `worker/index.js` push handlers).

**User flow**

1. Logged-in user sees `PushPermissionPrompt` (~2.5s after load) unless already enabled / denied / dismissed &lt;14 days.
2. **Allow notifications** → browser permission → `pushManager.subscribe` → `POST /api/notifications/push-subscribe`.
3. Settings → **Device push notifications** can enable/disable the same path.
4. iOS: Add to Home Screen (16.4+) required for Web Push; Android Chrome / installed PWA works normally.

**Local keys:** `finkoin_push_enabled`, `finkoin_push_prompt_dismissed`.

---

# What Is Stored Where — Complete Map

TABLE: users
What: Basic user identity
Columns:
id → auth user ID
name → display name
email → email address
phone → phone number
fk_balance → FK token balance (mirror)
subscription_tier → free/pro/promax
subscription_expiry → when plan ends
referral_code → unique code to share
referred_by → who referred them
pan_verified → KYC status
is_admin → admin flag
data_consent_given → accepted analyse/data-processing consent
data_consent_at → consent timestamp
data_consent_version → consent policy version string (e.g. v2)
When saved: On signup, on profile update; consent fields on **`/analyse`** accept
Read by: authStore.initAuth(); **`/analyse`** reads **`data_consent_given`** when local cache missing

TABLE: gamification
What: FK tokens and engagement
Columns:
user_id → owner
fk_balance → current FK tokens (PRIMARY)
total_earned → all time tokens earned
badges → JSON array of badges earned
streak_days → consecutive login days
last_login → last login date
weekly_tokens → tokens this week
created_at → when created
When saved: Every earn/spend event
Read by: gamificationStore, navbar FK display

TABLE: user_analyse_snapshots
What: Complete form state backup
Columns:
user_id → owner (primary key)
payload → entire financialStore state
Contains:
lastSubmission (normalized profile)
result (analysis output)
aiPlan (AI fix plan)
currentStep (form progress)
updated_at → last save time
When saved: After every form submit
Read by: On login if localStorage empty
Purpose: Cross-device sync, data recovery

TABLE: user_analysis
What: Structured profile + analysis
Columns:
user_id → owner (unique)
profile_hash → hash for AI cache check
profile → normalized financial profile
Contains ALL form fields:
income, loans, expenses
insurance, assets, goals
unifiedLoans[], additionalObligations[]
analysis_result → engine output
Contains:
overallScore, issues[]
securityChecklist[]
buckets, gauges data
ai_fix_plan → AI generated plan
Contains:
priorities[], debts[], goals[]
explanations, thisWeekAction
projection → score projection data
ai_generated_at → when AI plan was made
last_step_completed → form progress
When saved: After form submit + AI generation
Read by: Fix plan page, optimizer page

TABLE: user_policies
What: Insurance policy vault
Columns:
policy_type → health/term/car/bike/life
insurer_name → HDFC/LIC/etc
policy_number → policy ID
cover_amount → sum insured
premium_amount → premium paid
premium_frequency → monthly/yearly
renewal_date → next renewal
purchase_date → when bought
nominee_name → beneficiary
is_active → active or lapsed
transferred_to_finkoin → migration flag
notes → user notes
When saved: When user adds/edits policy
Read by: Policy vault page, renewal reminders

TABLE: user_stats
What: Usage analytics per user
Columns:
total_analyses → how many times analysed
total_calculators_used → calculator usage
total_articles_read → learn section usage
total_insurance_clicks → insurance clicks
total_fix_plans_purchased → revenue metric
last_analysis_at → last analysis time
last_active_at → last app open
When saved: On each relevant action
Read by: Admin dashboard (future), leaderboard

TABLE: insurance_clicks
What: Revenue tracking for insurance
Columns:
insurance_type → term/health/car etc
insurer_name → which insurer clicked
recommended_cover → what we suggested
monthly_premium → estimated premium
user_age → age at click time
city → city tier
fk_tokens_used → FK spent on this
clicked_at → timestamp
When saved: When user clicks insurance CTA
Read by: Revenue reports (future)

TABLE: referrals
What: Referral tracking
Columns:
referrer_id → who shared
referred_id → who signed up
signed_up_at → when they joined
subscribed_at → when they paid
tokens_awarded → FK given or not
When saved: On signup with referral code
Read by: Referral page, FK award logic

TABLE: finkoin_knowledge
What: RAG knowledge base for AI
Columns:
category → priority/debt/insurance/tax
title → rule title
content → detailed rule text
keywords → search terms
embedding → vector for similarity search
is_active → enabled or not
When saved: Manual updates only
Read by: AI route on every analysis call
Purpose: Grounds AI answers in correct rules

##Cache vs Supabase Priority

#DATA SOURCE PRIORITY ORDER:

1. LOCALSTORAGE (fastest — instant)
   Used for: form state, result, AI plan
   Cache duration: 30 days for AI plan
   Cleared when: user resets or new device

2. SUPABASE (authoritative — ~100ms)
   Used for: cross-device sync, backup
   Always fresh: FK balance, subscription
   Fallback when: localStorage empty

3. GROQ API (slowest — 2-5 seconds)
   Used for: AI explanations only
   Called when: profile hash changed
   Cached after: stored in localStorage
   - Supabase for 30 days

SPECIFIC FLOW:

FK Balance:
Always from Supabase gamification table
Not cached in localStorage
Reason: Must be real-time accurate
(user spends FK → must reflect immediately)

Financial Profile + Result:
First check localStorage (instant)
If empty → fetch from user_analyse_snapshots
Always save to both after submit

AI Fix Plan:
First check localStorage cache
Check profile hash matches
If match and < 30 days → use cache
If no match → call Groq → cache result

Subscription Tier:
From Supabase users table on login
Cached in authStore (memory only)
Re-fetched on every login

## What Happens When User Logs In

STEP 1: Supabase auth validates session
JWT token checked
If valid: proceed
If expired: redirect to login

STEP 2: authStore.initAuth() runs
Fetches users table:
name, email, subscription_tier
referral_code, pan_verified
Fetches gamification table:
fk_balance (PRIMARY source)
badges, streak_days
Sets user state in Zustand

STEP 3: FinancialStoreAuthSync runs
Checks localStorage for saved form data
If found AND belongs to this user:
Loads into financialStore
User sees their last result instantly

If NOT found in localStorage:
Fetches user_analyse_snapshots from Supabase
Hydrates financialStore with saved data
User sees last result (may take ~500ms)

STEP 4: Page renders with all data
Navbar shows: correct FK balance
If on /analyse/result: shows last analysis
If on /analyse/fixplan: loads or fetches AI plan

## Security — How Data Is Protected

LAYER 1: Supabase Auth
Every request needs valid JWT token
Token expires and auto-refreshes
No token = no data access

LAYER 2: Row Level Security (RLS)
Every table has RLS enabled
Policy: auth.uid() = user_id
User A CANNOT see User B's data
Even if they know the user_id
Enforced at database level

LAYER 3: Service Role Key
Only used on server (Next.js API routes)
Never exposed to browser
Used for admin operations only
Stored in environment variables

LAYER 4: Anon Key
Used in browser
Limited permissions
Can only do what RLS allows
Safe to expose (by design)

LAYER 5: Data Encryption
All data encrypted at rest (Supabase)
All connections use HTTPS/TLS
jsonb fields store JSON securely

---

## SEO & organic discovery (2026-05-04; refreshed 2026-08-04)

**Sitemap:** `app/sitemap.ts` → `/sitemap.xml`. Includes homepage, analyse, split, tracker, portfolio, calculators hub, `/calculators/tax-regime-2026`, all `INDEXABLE_CALC_IDS` under `/calculators/[id]`, learn index + each article, about, blog index + each slug, legal pages. `lastModified` uses build time (`new Date()`) for most routes; blog uses `publishedAt`.

**Robots:** `app/robots.ts` → `/robots.txt`. Allows major AI bots; disallows `/api/`, `/analyse/fixplan`, `/auth/`, `/_next/`; sitemap from `SITE_URL`.

**Metadata helpers:** `lib/seo.ts` — `SITE_URL`, `FINKOIN_TAGLINE*`, `generatePageMeta`, **`socialImageTags` / `absoluteOgUrl` / `DEFAULT_OG_IMAGE_PATH`** (1200×630 + alt).

**OG / Twitter images (shipped assets under `public/og/`):**

| File                                                   | Used by                                         |
| ------------------------------------------------------ | ----------------------------------------------- |
| `og-home.png`                                          | Default / learn hub / blog hub / many fallbacks |
| `og-analyse.png`                                       | `/analyse`                                      |
| `og-sip.png` / `og-swp.png`                            | SIP / SWP calculators + related Learn           |
| `og-tax-calculator.png`                                | Tax regime + tax Learn                          |
| `og-emi.png`                                           | EMI / home / car / rent\* calcs + loan Learn    |
| `og-ppf.png`                                           | PPF                                             |
| `og-po.png`                                            | Post Office + NSC                               |
| `og-emergency.png` / `og-fire.png`                     | Emergency / FIRE                                |
| `og-tracker.png` / `og-split.png` / `og-portfolio.png` | Product surfaces                                |
| `og/blog/<slug>.png`                                   | Each blog article (fallback home if missing)    |

Regenerate: `npm run og:placeholders` → `scripts/generate-og-placeholders.mjs` (Sharp + `public/logo.png`).

**Structured data:** Root Organization + WebSite; homepage FAQ; calculator `WebApplication` + FAQ; blog `Article` (+ `image`).

**Canonical host:** `https://www.finkoin.com` via `NEXT_PUBLIC_SITE_URL` / `SITE_URL` fallbacks.

**Changelog — 2026-05-04:** Initial SEO pass (blog routes, tax URL, sitemap, OG placeholders).

**Changelog — 2026-05-07:** Trailing-slash normalization; GA4 §29.

**Changelog — 2026-07-18:** www host standardization; founder Person JSON-LD.

**Changelog — 2026-08-04:** Full OG remap + Learn images + calculator Share + Post Office SEO paths.

---

## Tip delivery SQL helpers (ops)

```sql
-- Find user ID
SELECT id FROM auth.users WHERE email = 'USER_EMAIL';

-- Deliver one tip (replace YOUR_ID)
INSERT INTO public.user_notifications
  (user_id, tip_id, title, content, emoji, category, is_read, shown_as_popup)
SELECT 'YOUR_ID', out_tip_id, out_title, out_content, out_emoji, out_category, false, false
FROM get_next_tip_for_user('YOUR_ID');

-- Inbox
SELECT title, emoji, is_read, shown_as_popup, created_at
FROM public.user_notifications
WHERE user_id = 'YOUR_ID'
ORDER BY created_at DESC;

-- Reset popup flags for retesting
UPDATE public.user_notifications
SET shown_as_popup = false, is_read = false
WHERE user_id = 'YOUR_ID';
```

Full per-user audits: `supabase/USER_DATA_AUDIT_NOTES.sql`.

```sql
-- Optional reset helpers (destructive — use only on test accounts)
DELETE FROM public.user_tip_history WHERE user_id = 'YOUR_ID';
DELETE FROM public.user_notifications WHERE user_id = 'YOUR_ID';
```

---

## 31. COMPLETE FEATURE CATALOG (ROUTES + OUTCOME)

Use this as the master inventory of what the app ships. Status: **shipped** | **partial** | **placeholder**.

### 31.1 Core money product

| Feature                       | Routes / files                                                  | Requirement                                       | Solution                                                      | Outcome                                                    | Status      |
| ----------------------------- | --------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- | ----------- |
| Financial health check        | `/analyse`, `analyse-onboarding-form.tsx`, `financialEngine.ts` | Collect India-relevant profile once; score + gaps | 7-step RHF+Zod form → `analyseFinances` → snapshot            | Score, buckets, checklist, plan steps on `/analyse/result` | shipped     |
| AI fix plan                   | `/analyse/fixplan`, `/api/ai/analyse`, RAG                      | Explain priorities with India knowledge           | Groq + `search_by_keywords` + cache                           | Personalized plan + PDF                                    | shipped     |
| Paywall unlock                | Razorpay routes, paywall modal                                  | Monetize deep plan                                | ₹99 order + verify → `subscription_tier=pro`; FK redeem paths | Access to fixplan                                          | shipped     |
| Calculators hub               | `/calculators`, Post Office routes, `ShareButton`               | Instant tools without full analyse                | Lazy SIP/SWP/EMI/tax/FIRE/PPF/NSC/PO… + OG map                | Live math; GA `tool_open`; PWA share                       | shipped     |
| Tax regime FY2026             | `/calculators/tax-regime-2026`, `taxRegimeComparisonFY2026.ts`  | Old vs new regime compare                         | Client-side engine + multi-select employment                  | Take-home comparison + alerts                              | shipped     |
| Expense tracker               | `/tracker`, `trackerMonthIncome.ts`                             | Monthly spend; controlled forward month           | Safety Pulse + **last-Friday next-month unlock**              | Sept locked until last Fri of Aug                          | shipped     |
| FK Split                      | `/split/*`, `/api/split/*`, `pwaLaunch.ts`                      | Split bills with friends                          | Open/email invites; **iOS join in-browser**                   | Shared expenses + fewest payments                          | shipped     |
| Profile assets                | `/profile` `ProfileAssets`                                      | Edit net-worth inputs after analyse               | Patch helpers + `syncProfileAssets`                           | App-wide net worth/checklist stay current                  | shipped     |
| Investments view              | `/investments`                                                  | Snapshot of assets                                | Read from financial store / analysis                          | Read-only rollup                                           | shipped     |
| Goals                         | `/goals`                                                        | Goal tracking UI                                  | Cards UI                                                      | Most actions coming soon                                   | placeholder |
| Portfolio demo                | `/portfolio`                                                    | Fund verdicts teaser                              | Sample data + CAMS/PAN placeholders                           | Demo only — not live CAMS                                  | partial     |
| Policy vault                  | `/policies`                                                     | Store insurance policies                          | `user_policies` CRUD                                          | Renew/transfer intents                                     | partial     |
| Insurance marketplace         | `/insurance`                                                    | Compare/buy                                       | Entry UX + `insurance_clicks`                                 | Full compare engine incomplete                             | partial     |
| Rewards / leaderboard / refer | `/rewards`, `/leaderboard`, `/refer`                            | Engagement loop                                   | FK + `leaderboard_view` + referrals                           | Earn/spend FK, refer codes                                 | shipped     |
| Settings                      | `/settings`                                                     | Account prefs                                     | Name, avatar, password reset, tip prefs                       | Profile maintenance                                        | shipped     |
| KYC                           | `/kyc`, profile PAN                                             | Verify identity for future insurance              | Mock PAN format check                                         | Status UI; Aadhaar soon                                    | partial     |
| Learn / Blog                  | `/learn`, `/blog`                                               | Education + SEO                                   | Static/MD content modules                                     | Articles + FK read rewards                                 | shipped     |
| Legal                         | `/legal/*`                                                      | Compliance                                        | Full privacy/terms/refund/disclaimer                          | Linked from footer/profile                                 | shipped     |
| PWA                           | `next-pwa`, `/offline`                                          | Installable app                                   | SW + icons + install prompt                                   | Offline fallback page                                      | shipped     |
| Plans / Pricing               | `/plans`, `/pricing`                                            | Subscription catalog                              | UI shells; Razorpay TODOs on plans                            | Coming soon / partial                                      | placeholder |

### 31.2 Auth & account

| Feature            | Solution                                                             | Outcome                       |
| ------------------ | -------------------------------------------------------------------- | ----------------------------- |
| Email signup/login | Supabase Auth + `/login`                                             | Session cookies + `authStore` |
| Google OAuth       | `signInWithOAuth` → `/auth/callback`                                 | Deep-link `next` preserved    |
| Password reset     | `/auth/reset-password` → recovery callback → `/auth/update-password` | New password set              |
| Session refresh    | Middleware `getUser()` (no login redirect)                           | Rotated cookies               |
| Page gates         | `ProtectedGate`                                                      | No flash of protected content |
| Sign out           | `POST /api/auth/sign-out` + client clear                             | Clean local + cookie state    |
| Referrals          | `?ref=` + `referralRewards.ts`                                       | FK bonuses best-effort        |

### 31.3 Cross-cutting UX

| Feature                   | Files                                  | Outcome                         |
| ------------------------- | -------------------------------------- | ------------------------------- |
| Back navigation           | `BackLink`, `BackHref`                 | History back or safe fallback   |
| Private amounts           | `PrivateAmount`                        | Masked ₹ by default + eye       |
| Mobile bottom nav padding | profile/split/calculators/etc.         | Content not hidden behind nav   |
| Home mobile quick tools   | `HomeMobileQuickTools`                 | One-tap tool entry under banner |
| Notifications inbox       | `NotificationBell`, cron tips          | Daily tips + unread badge       |
| Feedback                  | widget / wizard / optional Google Form | Product feedback + optional FK  |

---

## 32. REQUIREMENTS → SOLUTION → OUTCOME (BUILD RATIONALE)

This section answers _why_ major systems exist.

### R1 — “Check financial health without KYC”

- **Requirement:** Indians should get an actionable score without PAN/Aadhaar.
- **Solution:** 7-step analyse form + deterministic engine; marketing copy states Free / No PAN / No Aadhaar.
- **Outcome:** `/analyse/result` with score, emergency fund, insurance gap, net worth, checklist.

### R2 — “Advice must be India-specific and not hallucinate rates”

- **Requirement:** AI explanations grounded in curated knowledge.
- **Solution:** RAG over `finkoin_knowledge` via `search_by_keywords` + Groq constrained prompts; deterministic engines remain source of truth for numbers.
- **Outcome:** Fix plan cites priorities from `priorityEngine` + knowledge chunks.

### R3 — “Protect paid AI from abuse”

- **Requirement:** Groq cost control + auth.
- **Solution:** `/api/ai/analyse` requires session + 10/hr rate limit (`apiGuard`).
- **Outcome:** Anonymous callers cannot burn AI quota.

### R4 — “Split bills like Splitwise, WhatsApp-friendly”

- **Requirement:** Create group, share link, join after login, settle fewest payments.
- **Solution:** Open invite marker email; `InviteLinkShare`; `computeSplitShares` + `computeNetBalances`/`simplifyDebts`; settle API amount-accurate.
- **Outcome:** Reusable invite URLs; simplified settle-up list on group page.

### R5 — “Edit assets later without redoing full form”

- **Requirement:** Profile page should update net worth everywhere.
- **Solution:** `ProfileAssets` → patch catalogs → `syncProfileAssets` → `setFullAnalysis` + snapshot upsert.
- **Outcome:** Investments page, checklist, and analysis stay consistent.

### R6 — “Mobile home must be fast and tool-first”

- **Requirement:** Small banner; tools below (not beside); clear CTAs.
- **Solution:** Compact carousel; `HomeMobileQuickTools` grid; remove badge clutter; one-line subtitle clamp.
- **Outcome:** Faster first viewport; SIP/SWP/Split/Tax/EMI/Portfolio/Analyse one tap away.

### R7 — “Tracker should coach, not just list expenses”

- **Requirement:** Know if month is Safe/Tight/Over.
- **Solution:** `trackerSafetyPulse` vs bucket caps + MoM; privacy eyes.
- **Outcome:** Month Safety Pulse with one recommended action.

### R8 — “Payments must be server-verified”

- **Requirement:** Unlock only after real payment.
- **Solution:** Razorpay create-order (auth) + HMAC verify → `users.subscription_tier=pro`.
- **Outcome:** Client cannot forge unlock without signature.

### R9 — “Secrets never in the browser”

- **Requirement:** Service role / Razorpay secret / Groq key server-only.
- **Solution:** `NEXT_PUBLIC_*` discipline + `npm run check:secrets` + CSP headers.
- **Outcome:** Client bundles cannot contain server secrets.

### R10 — “Session reliability on mobile”

- **Requirement:** Logged-in users must not be falsely sent to login.
- **Solution:** Middleware refreshes cookies only; `ProtectedGate` waits for `hasInitialized`; `AuthSessionSync` on focus.
- **Outcome:** Profile/split tabs work after PWA resume.

---

## 33. TEST SUITE

Runner: `npm test` → `vitest run` (`vitest.config.ts`, jsdom + `tests/setup.ts`).

Coverage: `npm run test:coverage`  
E2E: `npm run test:e2e` (Playwright chromium + Mobile Chrome; WebKit via `npm run test:e2e:webkit` after `npx playwright install webkit`)  
Docs refresh: `npm run docs:update` (updates **TEST STATUS** in this file; hooked in `.husky/pre-push`)

### Unit — `lib/**/*.test.ts` (existing)

| File                              | What it locks in                                                                                      |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `lib/financialEngine.test.ts`     | Income/expense totals, buckets, emergency fund, plan steps, bachelor spouse-income ignore             |
| `lib/analyse-form-schema.test.ts` | Money parse, salary step, loan/premium normalization, girl-child fields, unifiedLoans no double-count |
| `lib/fireCalculator.test.ts`      | 25× FIRE, SIP FV, years-to-wealth                                                                     |
| `lib/splitShares.test.ts`         | equal / exact / percentage validation & rounding                                                      |
| `lib/splitBalances.test.ts`       | net balances, simplifyDebts, settlements                                                              |
| `lib/splitInvite.test.ts`         | open-invite marker recognition                                                                        |
| `lib/profileAssetsPatch.test.ts`  | scalar patch, loans, custom investments, catalogs                                                     |
| `lib/trackerSafetyPulse.test.ts`  | Safe/Tight/Over, MoM, loan_prepayment exclusion                                                       |

### Unit — `tests/unit/**` (expanded QA suite)

| File                                    | What it locks in                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `tests/unit/financialEngine.test.ts`    | `buildNetWorth`, `computeRealEmergencyFund`, `calculateTermNeeded`, `analyseFinances` integration |
| `tests/unit/priorityEngine.test.ts`     | `buildPriorityPlan` ranking, surplus, tight cash-flow                                             |
| `tests/unit/splitBalances.unit.test.ts` | Dinner / settle / three-way edges via `lib/splitBalances`                                         |

### E2E — `tests/e2e/**`

| File                   | Coverage                         |
| ---------------------- | -------------------------------- |
| `health-check.spec.ts` | Landing + analyse shell          |
| `calculators.spec.ts`  | Tax landing + SIP/EMI deep links |
| `split.spec.ts`        | Logged-out split / join token    |
| `navigation.spec.ts`   | Route smoke + history            |
| `responsive.spec.ts`   | Viewports + overflow slack       |

Living docs: `docs/DESIGN_SYSTEM.md`, `docs/FUNCTIONS_REFERENCE.md`, `docs/CORE_ARCHITECTURE.md`.

Prefer unit tests for money math before UI changes. E2E asserts shells/navigation — full authenticated analyse/split flows need seeded credentials.

---

## 34. SPLIT SCHEMA (RUNTIME TABLES)

These tables are **heavily used in app code** but may live in remote/manual SQL (not all appear under `supabase/migrations/`). Treat as required for Split production:

| Table                  | Role                                                                             |
| ---------------------- | -------------------------------------------------------------------------------- |
| `split_groups`         | Group metadata (`name`, `emoji`, `group_type`, `created_by`, `is_active`, …)     |
| `split_group_members`  | Membership (`email`, `user_id`, `role`, `status` pending/active, `display_name`) |
| `split_expenses`       | Expense header (amount, title, category, paid_by, …)                             |
| `split_expense_shares` | Per-member share amounts / settled flags                                         |
| `split_invitations`    | Tokens; `invited_email` may be real email **or** `__open__@finkoin.invite`       |
| `split_settlements`    | Recorded payments between members                                                |

**Open invite invariant:** marker email never corresponds to a real user; join upserts the joiner’s real email as `active`; invitation row stays `pending` for reuse.

**Balance invariant:** UI nets come from `lib/splitBalances.ts` via `GET /api/split/balances`, not from trusting client math alone.

Manual SQL also exists for tracker (`supabase/manual/expense_tracker.sql`) and avatars (`supabase/manual/referral_code_avatars.sql`).

---

## 35. HOME / PROFILE / NAVIGATION UX (2026-07-18)

### Home hero composition (mobile)

1. Brand H1 + one-line health blurb (`line-clamp-1`).
2. Compact feature carousel.
3. Quick tools grid (4 columns) — order fixed in `HomeMobileQuickTools.tsx`.
4. No Earn Finkoin / social-proof pills under carousel.

### Back controls

- Prefer `BackLink` when history may exist (profile, goals, investments, calculators, split home).
- Prefer `BackHref` when a fixed parent is required (e.g. group detail → `/split`).

### Profile assets edit loop

1. User edits amount or Adds catalog item in `ProfileAssets`.
2. `patchScalarAsset` / `upsertUnifiedLoan` / `upsertCustomInvestment` produce new `FinancialProfile`.
3. `syncProfileAssets` → `setFullAnalysis` (engine) → optional Supabase snapshot.
4. `/investments` and checklist read the same store/snapshot.

### Cursor agent instruction (keep at top of this file)

At the start of any new Cursor conversation paste:

> Read FINKOIN_SYSTEM.md first. Use it as complete context for all changes. Do not break existing functionality. Check sections **27** (critical paths), **29** (analytics), **30** (runbooks), **32** (requirements), **34** (split schema), **36** (DB inventory), **37** (API inventory), **38** (SEO/OG/PWA), **39** (sync matrix) before making relevant changes.

---

## 36. LIVE DATABASE INVENTORY (USED VS UNUSED, ENCRYPTION, AUDIT)

**Source of truth for audits:** `supabase/USER_DATA_AUDIT_NOTES.sql` (read-only SELECT notes).  
**Companion:** `docs/DATA_AND_STORES.md`.

### 36.1 Heavily used (product-critical)

| Table / object                                                                                                 | Written by                          | Read by                         | Notes                                  |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------- | -------------------------------------- |
| `auth.users`                                                                                                   | Supabase Auth                       | Session / profile               | Passwords hashed by Supabase           |
| `public.users`                                                                                                 | `handle_new_user`, profile/settings | `authStore`, profile, referrals | App profile                            |
| `user_analyse_snapshots`                                                                                       | Analyse / `syncProfileAssets`       | Restore / cross-device          | Full plaintext JSON blob               |
| `user_analysis`                                                                                                | Analyse / AI cache paths            | Result / fixplan                | May be **empty** while snapshot exists |
| `user_financial_data`                                                                                          | `/api/financial-data`               | Same API decrypt                | **App AES-GCM** only table             |
| `gamification` + `fk_transactions`                                                                             | Rewards / unlock                    | Profile, leaderboard            | FK ledger                              |
| `expense_transactions`                                                                                         | Tracker                             | Tracker                         | Plain rows — normal for reporting      |
| `tracker_consent` / `user_credit_cards`                                                                        | Tracker                             | Tracker                         | Consent + nicknames                    |
| `financial_obligations` / `obligation_checklist`                                                               | Obligations store + sync            | Tracker calendar                | RPC `generate_monthly_checklist`       |
| `split_*` (6)                                                                                                  | Split APIs                          | Split UI                        | See §34                                |
| `notification_preferences` / `push_subscriptions` / `user_notifications` / `user_tip_history` / `finance_tips` | Tip/push pipelines                  | Bell, MorningTip, cron          |                                        |

### 36.2 Partial / optional

| Table                       | Status                                                    |
| --------------------------- | --------------------------------------------------------- |
| `user_policies`             | Policy vault — shipped UI; may be empty per user          |
| `app_feedback` / `feedback` | Feedback + testimonials                                   |
| `insurance_clicks`          | Click logging; full affiliate APIs **not** shipped        |
| `tax_documents`             | Present in live DB — confirm feature usage before relying |
| `referrals`                 | Live columns `referrer_id` / `referred_id`                |
| `user_stats`                | Scaffold; lightly used                                    |

### 36.3 Legacy / unused for new writes

| Table                | Guidance                                     |
| -------------------- | -------------------------------------------- |
| `financial_profiles` | Prefer `user_analysis` + snapshots           |
| `finkoin_knowledge`  | RAG — may be **absent** on some environments |

### 36.4 Encryption reality

- **Disk at rest:** Supabase (all tables).
- **Field-level app encryption:** only `user_financial_data`.
- **Hashes (not passwords):** `user_analysis.profile_hash`, `user_financial_data.data_hash`.
- **Secrets:** push keys, invite tokens, `pan_last4` / card `last4` fragments.
- Encrypting tracker rows does **not** shrink storage and breaks SQL aggregates — keep plain structured expenses.

---

## 37. COMPLETE BACKEND API INVENTORY (`app/api/**/route.ts`)

Also see `docs/API_REFERENCE.md`. Auth = cookie session unless noted.

| Route                               | Methods         | Auth                         | Role                        |
| ----------------------------------- | --------------- | ---------------------------- | --------------------------- |
| `/api/ai/analyse`                   | POST            | Yes + rate limit             | Groq AI fix plan            |
| `/api/financial-data`               | GET/POST        | Yes                          | Encrypted health blob R/W   |
| `/api/feedback`                     | POST            | Optional (FK only if authed) | Feedback widget             |
| `/api/testimonials`                 | GET             | Public                       | Featured testimonials       |
| `/api/auth/sign-out`                | POST            | Session                      | Server sign-out             |
| `/api/razorpay/checkout-config`     | GET             | —                            | Public key / amounts        |
| `/api/razorpay/create-order`        | POST            | Yes + RL                     | Create ₹ order              |
| `/api/razorpay/verify-payment`      | POST            | Yes                          | Verify + upgrade tier       |
| `/api/obligations/reminders`        | GET/POST        | Cron/admin patterns          | Obligation reminder fan-out |
| `/api/notifications/welcome-tip`    | POST            | —                            | Welcome tip email/path      |
| `/api/notifications/send-daily-tip` | POST            | Cron                         | Daily tip send              |
| `/api/notifications/send-test-tip`  | POST            | Ops                          | Test tip                    |
| `/api/notifications/deliver-tip`    | POST            | —                            | Deliver tip to inbox        |
| `/api/notifications/push-subscribe` | POST            | Yes                          | Save Web Push subscription  |
| `/api/split/groups`                 | GET/POST/DELETE | Yes                          | List/create/soft-delete     |
| `/api/split/groups/[groupId]`       | GET/DELETE      | Yes                          | Detail / hard-delete admin  |
| `/api/split/invite`                 | POST            | Yes + member + RL            | Create invite URL           |
| `/api/split/join`                   | POST            | Yes                          | Accept token/code           |
| `/api/split/members`                | GET/DELETE      | Yes                          | Members / remove            |
| `/api/split/expenses`               | POST            | Yes                          | Add expense                 |
| `/api/split/expenses/[expenseId]`   | PUT/DELETE      | Yes                          | Edit / soft-delete          |
| `/api/split/balances`               | GET             | Yes + member                 | Net + simplify edges        |
| `/api/split/settle`                 | POST            | Yes + RL                     | Record settlement           |

Client-heavy features (Analyse engine, Tracker ledger, Calculators, Learn) talk to **Supabase directly** with RLS — not only via these APIs.

---

## 38. SEO / OPEN GRAPH / SHARE / CALCULATOR SURFACES (2026-08-04)

| Concern                 | Files                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Site URL + meta helpers | `lib/seo.ts`                                                                                    |
| Sitemap / robots        | `app/sitemap.ts`, `app/robots.ts`                                                               |
| Calc SEO + OG map       | `app/calculators/calculator-seo.ts` (`getOgImagePathForCalc`, `SEO_COPY`, `INDEXABLE_CALC_IDS`) |
| Learn SEO overrides     | `lib/learnSeo.ts` + `app/learn/[id]/page.tsx` (`withLearnShareImages`)                          |
| Blog OG                 | `app/blog/[slug]/page.tsx` (+ JSON-LD `image`)                                                  |
| OG generator            | `scripts/generate-og-placeholders.mjs` → `npm run og:placeholders`                              |
| Share (PWA)             | `components/ui/ShareButton.tsx`                                                                 |
| Post Office rates/math  | `lib/postOfficeSchemes.ts`, `components/calculators/postOffice/*`                               |
| Calculator inputs       | `lib/calculatorInput.ts` (`CALCULATOR_MONEY_MAX = 99_00_00_000`)                                |

Tagline for banners/meta: **Know it. Fix it. Grow it.** / **Your complete money life.** (`FINKOIN_TAGLINE*`).

---

## 39. SYNC MATRIX (CLIENT ↔ SUPABASE ↔ SERVER)

| Domain                    | Client source                              | Persistence                                           | Realtime / refresh                    |
| ------------------------- | ------------------------------------------ | ----------------------------------------------------- | ------------------------------------- |
| Auth session              | `authStore` + middleware                   | Supabase cookies / JWT                                | `onAuthStateChange`                   |
| Analyse profile           | `financialStore`                           | `user_analyse_snapshots` (+ optional `user_analysis`) | Soft restore on login                 |
| Encrypted analyse payload | `/api/financial-data`                      | `user_financial_data` ciphertext                      | On demand                             |
| FK / streaks              | `gamificationStore`                        | `gamification`, `fk_transactions`                     | Realtime on `gamification`            |
| Tracker expenses          | Tracker page / modal                       | `expense_transactions`                                | Soft refetch on focus/visibility      |
| Obligations               | `obligationStore`                          | `financial_obligations`, `obligation_checklist`       | Sync from health-check; checklist RPC |
| Split groups              | `splitStore`                               | `split_*` via `/api/split/*`                          | Realtime members/expenses/settlements |
| Split invite handoff      | `splitAuthRedirect` + `SplitInviteResume`  | localStorage + cookies (same browser profile)         | Login `?next=` / resume on boot       |
| Tips / push               | `notificationStore`, MorningTip, cron APIs | prefs, subscriptions, inbox, tip history              | Realtime inbox inserts                |
| Portfolio                 | `portfolioStore`                           | Mostly client + optional APIs                         | —                                     |
| Leaderboard               | `/leaderboard`                             | `leaderboard_view` + cache                            | Invalidate on gamification            |

**What is NOT synced Safari → iOS PWA:** localStorage/cookies for invite tokens (siloed). Join must complete in the browser that opened the link (or Android intent deep-link).

**Docs index:** `docs/README.md` · Architecture `docs/CORE_ARCHITECTURE.md` · Product routes `docs/PRODUCT_SURFACE.md` · Functions `docs/FUNCTIONS_REFERENCE.md` · Design `docs/DESIGN_SYSTEM.md` · Env/scripts `docs/ENV_AND_SCRIPTS.md` · Tests `tests/TESTING.md`.
