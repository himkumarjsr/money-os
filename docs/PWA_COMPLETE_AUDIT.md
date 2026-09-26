# Finkoin PWA — Complete Feature Audit

> Audit date: 2026-09-26 · Branch audited: `mobile-app` (HEAD `e5d3f3b`) · App version `0.4.0` (`package.json`)
> Scope: `FINKOIN_SYSTEM.md`, `package.json`, `next.config.mjs`, `middleware.ts`, `app/**`, `components/**`, `lib/**`, `store/**`, `public/manifest.json`, `supabase/**`, `mobile/**`.
> Read-only audit — no application code was changed.

---

## 0. How to read this document

- **Status** meanings:
  - **Complete** — shipped, wired end-to-end, no known functional gap.
  - **Partial** — works, but has missing pieces, placeholder data, or known gaps.
  - **Broken** — the route requested does not exist or a core path fails.
  - **Not found** — the route was on the audit list but doesn't exist in the codebase. The nearest real route is listed.
- **Design tokens** refer to the palette in `docs/DESIGN_SYSTEM.md`, and match `mobile/constants/theme.ts`:

| Token | Hex | Token | Hex |
|---|---|---|---|
| Primary purple | `#534AB7` | Background | `#F7F7F4` |
| Dark purple | `#3C3489` | Card | `#FFFFFF` |
| Light purple | `#EEEDFE` | Border | `#E8E6F0` |
| Medium purple | `#AFA9EC` / `#D4D2F5` / `#7F77DD` | Border light | `#F0EFF8` |
| Success | `#1D9E75` / light `#E1F5EE` | Text primary | `#111110` |
| Warning | `#BA7517` / light `#FFF3E0` | Text secondary | `#5F5E5A` |
| Error | `#E24B4A` / light `#FCEBEB` / dark text `#791F1F` | Text muted | `#9B9A94` |

- Spacing is based on 4 px (8/12/16/20/24/32). Radius: 8 (sm) / 10–12 (inputs) / 14–16 (cards) / 20–24 (sheets, auth card).
- **16 px rule**: `app/globals.css`, `MoneyInput`, `NumberInput` and the tracker/split inputs use font-size ≥ 16 px to stop iOS focus-zoom. The exceptions are called out per screen.
- **Safe area**: the global bottom nav uses `bottom: max(10px, env(safe-area-inset-bottom))`, and the header uses `padding-top: max(4px, env(safe-area-inset-top))` (`components/global-navbar.tsx`).

### 0.1 App shell (applies to every route)

`app/layout.tsx` mounts, in order: `PwaBootSplash` → `MotionLazyProvider` → `ReferralCapture` (Suspense) → `AppInitializer` { `ScrollToTopOnRouteChange`, `RouteChangeLoader`, `AuthSessionSync`, `PwaLaunchHandler`, `SplitInviteResume`, `FinancialStoreAuthSync`, `GlobalNavbar`, `RenewalReminderBanner`, `<main>`, `MorningTipPopup`, `PushPermissionPrompt`, `FeedbackPopupManager`, `Footer`, `ReferralSuccessToast`, `Toast` } → `GoogleAnalytics`, plus the `ClarityScript` / JSON-LD Organization & WebSite schema.

- `middleware.ts` refreshes Supabase cookies on every non-static path **except `/`**. It never redirects. Route protection is client-side (`ProtectedGate`).
- **PWA**: `next-pwa` (production only), `customWorkerDir: worker` (push handlers), `fallbacks.document: /offline`. Runtime caching: fonts CacheFirst 1y, images CacheFirst 30d, JS/CSS SWR 7d, `/api/*` NetworkFirst 10s/5 min, pages NetworkFirst 10s/1d.
- **Security headers** (`next.config.mjs`): HSTS preload, `X-Frame-Options: SAMEORIGIN`, `nosniff`, strict referrer, Permissions-Policy (camera/mic/geo off), and a CSP limited to `base-uri 'self'; object-src 'none'; frame-ancestors 'self'; upgrade-insecure-requests`.
- **Manifest** (`public/manifest.json`): name "Finkoin — Financial Health", `start_url /`, `display standalone`, portrait, theme/background `#534AB7`, `lang en-IN`, `launch_handler navigate-existing`, `handle_links preferred`. Icons are 72→512 (maskable any), one screenshot `home.png` 390×844, and 3 shortcuts: Check My Score `/analyse`, Expense Tracker `/tracker`, Tax Calculator `/calculators/tax-regime-2026`.

### 0.2 Summary of audit findings (read first)

| # | Finding | Severity | Where |
|---|---|---|---|
| F1 | `/signup`, `/tax`, `/calculators/home-loan`, `/calculators/fd-calculator`, `/calculators/retirement-calculator`, `/calculators/emi-calculator`, `/calculators/emergency-fund`, `/calculators/fire-number` **don't exist**. Real routes: `/login?mode=signup`, `/calculators/tax-regime-2026` (not ITR auto-fill), `/calculators/home`, no FD calculator (closest `/calculators/po-td`), no retirement calculator (closest `/calculators/fire`), `/calculators/emi`, `/calculators/emergency`, `/calculators/fire`. Unknown ids hit `notFound()` in `app/calculators/[id]/page.tsx`. | Info | routing |
| F2 | There is **no ITR auto-fill** feature. Tax is a client-side regime comparison with an "ITR form suggestion" block (`TaxRegimeCalculator.tsx`, lines ~1373–1430). | Info | `/tax` |
| F3 | All `/api/*` routes authenticate via **cookies only** (`lib/apiGuard.ts#getAuthedUser` → `createSupabaseServerClient()` reading `next/headers` cookies). Only `/api/razorpay/verify-payment` accepts `Authorization: Bearer`. **Native mobile can't call the other authed APIs** until Bearer support is added. | High (mobile) | `lib/apiGuard.ts` |
| F4 | `FINKOIN_SYSTEM.md §37` lists `GET /api/split/groups`, `GET /api/split/groups/[groupId]`, `GET /api/split/members` — **these handlers don't exist** (only POST/DELETE, DELETE, DELETE respectively). | Doc drift | `app/api/split/**` |
| F5 | `components/learn/article-tracker.tsx` is a no-op ("FK rewards removed"); `FINKOIN_SYSTEM.md §15` still says learn reads earn FK. | Doc drift | learn |
| F6 | Web `BottomNav` and `HealthScoreRing` are **not standalone components**. The bottom nav lives inside `components/global-navbar.tsx`; the score UI is `SpeedoMeter` + an inline score badge. `HealthScoreRing` exists only in `mobile/components/ui/`. | Info | components |
| F7 | Unused / dead web components: `forms/onboarding-wizard.tsx` (+ its steps), `ui/LoginSheet.tsx`, `ui/GoalCard.tsx`, `ui/ChipSelector.tsx`, `ui/SectionToggle.tsx`, `ui/ScrollSection.tsx`, `calculators/compound-interest-calculator.tsx`, `calculators/spending-trend-chart.tsx`, `tracker/PurpleCashAudit.tsx` (import commented out on `/tracker`). | Low | components |
| F8 | Production `console.log` noise: `/analyse/result` `handleUnlockClick`, `/login` referral logs, engine debug logs gated to `NODE_ENV=development`. | Low | result/login |
| F9 | Analyse writes **`user_analyse_snapshots`** (payload JSON). `user_analysis` is only updated by fix-plan (`ai_fix_plan`) and `lib/cache.ts`. The mobile app reads/writes `user_analysis` → **web users see an empty Report on mobile** (see `docs/MOBILE_BUILD_PLAN.md §0`). | High (mobile) | data |

---

## 1. SCREENS

### 1.1 Home / Landing

Route: `/`
File: `app/page.tsx` (server) → `components/landing/HomePageClient.tsx`
Status: **Complete**
Components used: `HomePageClient`, `HomeHeroCarousel`, `HomeMobileQuickTools`, `HomePageBelowFold` (lazy), `FeatureCardsCarousel`, `Testimonials`, `TrackImpression`, `AnimateOnScroll`, `Footer`, `GlobalNavbar` (shell)
Store used: `authStore` (CTA destinations / logged-in state)
API routes: `GET /api/feedback` (via `Testimonials`, featured testimonials)
Supabase tables: none directly (testimonials go through the API → `feedback`)
Design tokens used: `#534AB7` H1 sub-line, `slate-900` main line, `slate-600` subtitle; hero gradient orbs in lavender; 16 px gutters
Key functionality:
  - SSR H1 `FINKOIN_TAGLINE_SUB` ("Your complete money life.") + `FINKOIN_TAGLINE` ("Know it. Fix it. Grow it.") and a one-line H2 (`line-clamp-1` on mobile).
  - FAQPage JSON-LD (6 Q&As) + OG/Twitter image `og/og-home.png`.
  - Hero carousel: 4 slides → `/analyse` ("Meet your advisor"), tax regime, SIP/tools, `/tracker`.
  - Mobile-only Quick Tools grid (4 columns) in fixed order: SIP `/calculators/sip?from=home`, SWP `/calculators/swp?from=home`, Split `/split?from=home`, Tax `/calculators/tax-regime-2026?from=home`, EMI `/calculators/emi?from=home`, Portfolio `/portfolio?from=home`, Analyse `/analyse?from=home`.
  - Below the fold (lazy): "Meet your finance advisor" card, feature cards carousel, testimonials (24 h `localStorage` cache `finkoin_testimonials`), footer.
  - Middleware skips `/` for LCP.
Interactions:
  - Tap carousel slide CTA → route (GA `cta_click`, `carousel_select`).
  - Tap quick tool tile → route (GA `cta_click` with `cta_name`, `href`).
  - Section impressions → `element_impression`; scroll milestones → `scroll_depth`.
  - No forms.
Mobile specific:
  - Compact carousel heights on phones; quick tools render **below** the banner.
  - Touch targets: tool tiles ≈ 72 px tall.
  - Bottom nav (Home active) clears content with `pb-24`-style padding.

---

### 1.2 Login (also Sign-up + Forgot password)

Route: `/login` (`?mode=signup|reset`, `?next=` / `?redirect=`, `?ref=`)
File: `app/login/page.tsx`
Status: **Complete**
Components used: `AppIcon`, `BrandPageLoader` (Suspense fallback + button spinner)
Store used: `authStore` (`hasInitialized`, `isLoggedIn`, `initAuth`)
API routes: none (Supabase Auth directly)
Supabase tables: `auth.users` (signUp / signInWithPassword / OAuth / resetPasswordForEmail); the `handle_new_user()` trigger creates `users`, `gamification`, `user_stats`; the referral apply writes `users.referred_by`, `referrals`, `gamification`, `fk_transactions` (via `lib/referralRewards.ts`)
Design tokens used: page gradient `#F7F7F4 → #EEEDFE`; white card radius 24, padding 40×32, max-width 440, shadow `0 8px 48px rgba(83,74,183,0.12)`; inputs 48 h / radius 12 / border 1.5 `#E8E6F0` → focus `#534AB7`; primary button 52 h radius 14 `#534AB7`; error box `#FCEBEB`/`#791F1F`; success box `#E1F5EE`/`#1D5C3A`
Key functionality:
  - One page with three modes: **login**, **signup**, **reset**. The tab switch (Login | Sign up) shows in non-reset modes.
  - Already logged in / session recovered (`resolveAuthenticated()`) → `router.replace(peekPostLoginPath())`, which honours `next`/`redirect` and pending Split invites.
  - `?ref=CODE` → stored in `localStorage[REFERRAL_PENDING_STORAGE_KEY]` for 7 days.
  - Sign-up → `supabase.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: /auth/callback?next=… } })`. If no session is returned, it shows "Check your email to verify" and switches to login. If there is a session → `initAuth()` → apply referral → redirect.
  - Login → `signInWithPassword` → `initAuth()` → redirect. "Invalid" errors map to "Wrong email or password. Try again."
  - Reset → `resetPasswordForEmail(email, { redirectTo: /auth/callback?type=recovery })`.
  - Google → `signInWithOAuth({ provider: 'google', redirectTo: /auth/callback?next=…, queryParams: { access_type: 'offline', prompt: 'consent' } })`.
Interactions:
  - Tabs: Login / Sign up (38 h segmented control).
  - Fields: **Your name** (`text`, signup only, `autoComplete=name`); **Email address** (`email`, `autoComplete=email`); **Password** (`password`/`text` toggle, `autoComplete=current-password|new-password`, Enter submits).
  - Buttons: Show/Hide password; "Forgot password?" (login mode) → reset mode; primary submit ("Log in" / "Create my account" / "Send reset link"); "Back to login" (reset); "Continue with Google".
  - Validation: email required ("Please enter your email"); password required; password ≥ 6 chars; name required on signup.
  - Links: Terms `/legal/terms`, Privacy `/legal/privacy` (new tab).
Mobile specific:
  - Inputs declare an inline 15 px font, but `app/globals.css` forces `font-size: 16px !important` on inputs at ≤ 768 px, so phones get 16 px (no iOS focus zoom). Desktop (≥ 768 px) uses 15 px.
  - Full-screen centred card with a 16 px outer padding; no bottom sheet.
  - Touch targets 44–52 px.

---

### 1.3 Sign-up (requested `/signup`)

Route: `/signup` — **Not found**. Sign-up is `/login?mode=signup` (see 1.2).
Status: **Not found (by design)**
Notes: the mobile app has a dedicated `mobile/app/(auth)/signup.tsx`.

---

### 1.4 Auth callback

Route: `/auth/callback` (`?code`, `?type=recovery`, `?next`)
File: `app/auth/callback/page.tsx`
Status: **Complete**
Components used: `BrandPageLoader` ("Completing login…")
Store used: `authStore.initAuth`
API routes: none
Supabase tables: `auth` (PKCE `exchangeCodeForSession`), plus `referralRewards` writes
Key functionality:
  - `code` → `exchangeCodeForSession(code)`. On error → `/login?error=auth_failed`.
  - `initAuth()` → `getSession()`. No session → `/login?error=auth_failed`.
  - `type=recovery` → `/auth/update-password`.
  - Else `applyPendingReferralRewards()` → `router.replace(next ?? peekPostLoginPath())`. The default is `/analyse`, or a pending Split join URL.
Interactions: none (spinner only).
Mobile specific: full-screen loader.

Related routes:
- **`/auth/reset-password`** (`app/auth/reset-password/page.tsx`) — **Complete**. One email field (`email`, 15 px) plus "Send reset link →", which calls `resetPasswordForEmail` with the recovery redirect. The success state reads "Check your email". Validation: "Enter your email".
- **`/auth/update-password`** (`app/auth/update-password/page.tsx`) — **Complete**. Needs a recovery session (else `/login?error=session`). Fields: password + confirm. Validation: ≥ 6 chars and the two must match. Calls `auth.updateUser({ password })`.

---

### 1.5 Analyse — health-check form

Route: `/analyse`
Files: `app/analyse/page.tsx` → `AnalyseEntryClient.tsx` → (logged out) `components/landing/AnalyseMarketingLanding.tsx` | (logged in) `AnalyseAppClient.tsx` → `ConsentModal` + `components/forms/analyse-onboarding-form.tsx`; `app/analyse/layout.tsx` (metadata + WebApplication/FAQ JSON-LD)
Status: **Complete**
Components used: `AnalyseMarketingLanding`, `ConsentModal`, `AnalyseOnboardingForm`, `AnalyseAdvisorModal`, `MoneyInput`, `NumberInput`, `PrivateAmount`, `DayOfMonthPicker` / `PremiumDueFields` (`forms/ObligationDateFields.tsx`), `Button`, `BrandPageLoader`, local `ToggleButtons`, `RadioCards`, `PremiumField`, `SectionTitle`, `Note`, `TextInput`, `AgeNumberInput`
Store used: `authStore`, `financialStore` (`setAnalysis`, `setFullAnalysis`, `setAiPlan`, `setCurrentStep`, `resetStore`), `obligationStore.syncFromHealthCheck`
API routes: `POST /api/ai/analyse` (inside `getAIFixPlan`), `POST /api/financial-data` (encrypted copy)
Supabase tables: `users` (consent read/update: `data_consent_given`, `data_consent_at`, `data_consent_version='v2'`), `user_analyse_snapshots` (upsert payload), `financial_obligations` (upsert) + RPC `generate_monthly_checklist`, `user_financial_data` (via API)
Design tokens used: labels 14 px `#5F5E5A`; inputs 48 h radius 10 border 1.5 `#E8E6F0`, font 15 px, focus ring `rgba(83,74,183,0.1)`; section titles 11 px uppercase `#534AB7`; helper 12 px `#9B9A94`; error 13 px `#791F1F`
Key functionality:
  - The consent gate reads a per-user cache `localStorage['finkoin_analyse_consent_v2_<uid>']` and falls back to `users.data_consent_given`. Accept writes both; Decline → `/`.
  - GA `health_check_started` fires once after consent.
  - 7 steps (`STEPS`): Personal profile · Income · Fixed obligations · Living expenses · Insurance coverage · Assets and savings · Goals. Each step is validated by `stepNSchema.safeParse` (Zod) before Next.
  - The draft autosaves to `financialStore.analysis` (persisted, per-user key `finkoin-financial:<uid>`), and the draft is merged with the last profile (`mergeAnalyseDraftWithProfile`).
  - "Start fresh" wipes the RHF form, `finkoin-financial*`, `finkoin_ai_cache`, and resets the store.
  - Live computed hints: total monthly income (`PrivateAmount`), a debt warning when obligations exceed 50 % of income, and housing notes (rent + EMI + second property).
  - Submit pipeline (`handleFinalSubmit`): `step7Schema` → `coalesceInsuranceToggles` → `normalizeAnalyseFormValues` → `setFullAnalysis` (runs `analyseFinances`) → `getAIFixPlan` → `setAiPlan`. Then fire-and-forget: `upsertUserAnalyseSnapshot`, `syncFromHealthCheck`, and `POST /api/financial-data`. Then `router.push('/analyse/result')`.
Interactions (every form field):
  - **Step 1 — Profile**: `lifeStage` radio cards (Single/bachelor, Married no kids, Married with kids, Pre-retirement 50+); `selfAge` number (18–80, required); `spouseAge` number (married/kids, optional, ≥ 0); `numberOfKids` number (kids, 1–6); `kidsAges[i]` number (required per kid); `kidsGenders[i]` Boy/Girl toggle (required per kid); `cityTier` radio (Metro / Tier 2 / Tier 3).
  - **Step 2 — Income**: `monthlySalary` MoneyInput (required > 0); `spouseIncome` (hidden for bachelor); `otherIncome`.
  - **Step 3 — Fixed obligations**: `rentAmount`; `rentMaintenanceMonthly` (if rent > 0); **My loans** field-array `unifiedLoans[]` with add/remove rows — `loanType` select (Home, Personal, Car, Two-wheeler, Education, PF/EPF, Overdraft, Gold, Business, Credit card, Other), `lenderName` text, `monthlyEMI` money (required per row), `emiDay` day-of-month picker (optional), `outstandingAmount` money, `interestRate` %, `remainingMonths`, OD-only `odLimit`/`odUsed`/`odInterestOnlyYears`; `creditCardBillMonthly` money + `creditCardBillDay` picker.
  - **Step 4 — Living expenses**: `foodTotal`, `transportTotal`, `utilityTotal`, `domesticHelpTotal`, `lifestyleTotal`; kids: `kidsSchoolFees`, `kidsActivities`; `parentsSupport`; if > 0: `parentsCity` select, parents health insurance toggle + `parentsHealthInsuranceSumInsured`, `parentsEmergencyCash`.
  - **Step 5 — Insurance**: `hasHealthInsurance` Yes/No → `healthInsuranceSumInsured` + premium (`PremiumField`: amount + Monthly/Yearly toggle) + renewal month/day (`PremiumDueFields`); `hasTermInsurance` → sum assured, premium, frequency, `termInsurancePremiumTillYear`, renewal; vehicle toggle → car/bike premium + frequency + renewal; `hasOtherInsurance` → rows `otherInsurancePremiums[]` (policyName, premiumAmount, frequency, maturityAmount, maturityYear) with add/remove.
  - **Step 6 — Assets**: `fdValue` (+ `fdRate`, `fdTenureYears`, `fdMaturityYear`); `savingsAccountBalance`; `liquidMFValue` (info toggle explains liquid funds); `otherLiquidSavings`; `bereavementFund`; `ppfBalance`, `npsBalance`, `epfBalance`; `monthlySIP` + `sipAutoDebitDay`; `ppfDepositDay`; `totalEquityValue`; `customInvestments[]` (≤ 5: label, currentValue, monthlyContribution, type); `ownsHome` → `homeMarketValue`, `homeLoanOutstanding`, home-loan EMI + debit day; `ownsCar` → `carMarketValue`, `carLoanOutstanding`; `goldValue`; `otherAssets` + `otherAssetLabel`; `monthlyRD`, `monthlyPPFContribution`, `monthlyNPSContribution`, `monthlyEPFContribution`; `ssy` (only with a girl child under 10); Post-office schemes Yes/No → `postOfficeSchemes[]` (≤ 8; scheme select: Savings, RD, TD, NSC, KVP, MIS, SCSS, MSSC, Other; holding amount; maturity year).
  - **Step 7 — Goals**: `primaryGoal` cards (Buy a home, Clear all debt, Retire early, Grow wealth, Kids education fund, Build emergency fund, Insurance premium reserve, Buy a car; defaults to `grow_wealth`); conditional: `homePurchaseTarget`/`homePurchaseYear` (renters), `retirementTargetCorpus`/`retirementAge`, `kidsEducationFundTarget` (required for kids), `emergencyFundTarget`, `carPurchaseTarget`/`carPurchaseYear` (no car).
  - Buttons: Back arrow (→ `/`), "Ask advisor" (opens `AnalyseAdvisorModal` with step context), "Start fresh", step-pill chips (jump to a step), Back / Next ("forceNext"), final "Get my score" (shows `BrandPageLoader` "Analysing your finances…").
  - Validation rules (from `lib/analyse-form-schema.ts`): money ≥ 0 ("Cannot be negative"); `selfAge` 18–80; kids 1–6; per-kid age + gender required; health/term sum + premium required when toggled; ≥ 1 other-insurance row when toggled; home/car market value + outstanding required when owned; kids education target required for the kids stage; `primaryGoal` required; array caps: obligations 6, unified loans 6, custom investments 5, PO schemes 8; whole numbers are rounded (months).
Mobile specific:
  - A single column on phones; the step chip bar scrolls horizontally.
  - Inputs are 48 px tall; the 15 px class is overridden to 16 px on phones by `app/globals.css` (`!important`, ≤ 768 px).
  - The advisor opens as a modal overlay (not a bottom sheet).
  - The sticky footer has Back/Next buttons.

---

### 1.6 Analyse — Result

Route: `/analyse/result`
File: `app/analyse/result/page.tsx` (+ `layout.tsx` metadata)
Status: **Complete** (with debug logging, F8)
Components used: `AnalyseResultErrorBoundary`, `PaywallModal`, `SpeedoMeter` (×2), `PrivateAmount`, `FeedbackWidget`, `AppIcon`, `BrandPageLoader`, `Link`
Store used: `financialStore` (`lastSubmission`, `result`, `hasHydrated`, `hydrateFromSnapshot`), `authStore` (`user.subscriptionTier`)
API routes: (via `PaywallModal`) `GET /api/razorpay/checkout-config`, `POST /api/razorpay/create-order`, `POST /api/razorpay/verify-payment`; `POST /api/feedback`
Supabase tables: `user_analyse_snapshots` (restore on reload when the store is empty)
Design tokens used: page `#F7F7F4`, cards white radius 16 border `slate-200`; score badge Critical `#FDEDED/#991B1B` (< 40), Warning `#FFF4E5/#92400E` (< 70), Good `#DCFCE7/#166534`; hero card purple gradient with label `#D5D0FA`
Key functionality:
  - Waits for `hasHydrated`. If the store is empty, it restores from `user_analyse_snapshots`. If there's still no data, the empty state says "No analysis found" with "Start analysis →" → `/analyse`.
  - Re-derives analysis with `analyseFinances(profile)`, plus `buildPriorityPlan`, `getUniversalBucketActuals`, and `getBucketBreakdown`.
  - Sections: health hero (score / 100 + label + total income masked); net worth summary (assets, liabilities, net worth); **5-bucket table** (Needs 30 %, Wants 5 %, Insurance premiums 5 %, Loans 40 %, Investment 20 %) with expandable rows showing line-item breakdowns and status; health gauges (`SpeedoMeter` + `buildSpeedoMeterProps`); **"Your financial safety net"** (emergency fund, medical fund, term cover missing/partial/complete, health cover, SSY/other checklist); fix-plan preview (top priority + monthly cash-flow waterfall: Income − Needs − EMIs − Wants − Insurance+Investment = Surplus); unlock CTA; feedback widget; "Keep going" links.
  - GA: `report_viewed`, `health_check_completed` (score), `paywall_viewed`.
  - Unlock: if `NEXT_PUBLIC_SKIP_PAYMENT==='true'` or tier is pro/promax → `/analyse/fixplan`; else it opens `PaywallModal` (₹99).
Interactions:
  - Back button → `/analyse`.
  - Bucket row tap → expand/collapse breakdown (`toggleRow`).
  - Privacy eyes on income amounts (`PrivateAmount`).
  - "Get my complete financial plan →" → unlock flow; the paywall opens Razorpay checkout.
  - Link to the learn article `term-insurance-vs-endowment-why-most-indians-buy-wrong`.
  - Feedback: 1–5 stars + optional message → `POST /api/feedback` (+50 FK when logged in); dismissible.
  - Links: `/calculators/tax-regime-2026`, `/tracker`, `/learn`.
Mobile specific:
  - Cards stack vertically with `px-4`; the bucket table collapses into expandable rows.
  - The paywall is a centred modal on desktop and full-width at the bottom on mobile.
  - No form inputs apart from the feedback textarea.

---

### 1.7 Analyse — Fix plan

Route: `/analyse/fixplan`
File: `app/analyse/fixplan/page.tsx`
Status: **Complete**
Components used: `PrivateAmount`, `AppIcon`, `BrandPageLoader` (rotating messages), `Link`
Store used: `financialStore` (`lastSubmission`, `result`, `setAiPlan`), `authStore`
API routes: `POST /api/ai/analyse` (cache miss)
Supabase tables: `user_analysis` (update `ai_fix_plan`, `ai_generated_at`); read via `lib/payment.ts#canAccessFixPlan`
Design tokens used: white cards radius 16; priority rank chips `#EEEDFE/#534AB7`; urgency colours red/amber/green
Key functionality:
  - Gate: waits for `hasInitialized`. Not logged in → login (`loginHrefPreserveRef`). No profile → `/analyse/result`.
  - Loading messages rotate: "Reading your profile...", "Calculating insurance gaps...", "Building debt strategy...", "Generating 12-month roadmap...", "Almost ready...".
  - Cache: `hashProfile(profile)` → `getCachedPlan` (`localStorage['finkoin_ai_cache']`, 30 days). On a hit, it merges the engine `buildPriorityPlan` numbers with cached AI text.
  - On a miss it calls `POST /api/ai/analyse {profile, analysis}`, then merges (the engine numbers stay authoritative and the AI only adds title/instrument/whyThisMatters), then `setCachedPlan` and updates `user_analysis`. There's an in-flight de-dupe map.
  - Sections: greeting/summary card with monthly income (masked); ranked **priority cards** (emergency fund, medical fund, term, health, start SIP, SSY per girl) showing gap, monthly contribution, months to complete, this-week action, and why it matters; surplus waterfall ("Your surplus" → Step N → "Remaining buffer"); **Debt strategy** table (lender display names, outstanding, rate, payoff); **Goal plan**; **FD opportunity**; this-week action + encouragement; AI/fallback indicator + retry.
  - GA `fix_plan_viewed`.
Interactions:
  - Back → `/analyse/result`.
  - "Download PDF" → `downloadOptimizerPDF()` (jsPDF multi-page) with a downloading state.
  - Retry / refresh AI when `isFallback`.
  - Privacy eye on income.
Mobile specific: single-column cards; the PDF download uses a browser download (works in PWA standalone on Android; iOS opens a viewer).

---

### 1.8 Tracker

Route: `/tracker`
File: `app/tracker/page.tsx` (+ `layout.tsx`)
Status: **Complete**
Components used: `ProtectedGate`, `TrackerConsent`, `AddExpenseModal`, `MonthSafetyPulse`, `CreditCardBillReminder`, `ObligationsChecklist` (+ `AddObligationForm`), `FeedbackWidget`, `TrackerIcon`/`TrackerIconBadge`, `AppIcon`, `BrandPageLoader`; `PurpleCashAudit` is imported but commented out
Store used: `authStore`, `financialStore` (analyse completed + profile income), `obligationStore`
API routes: none (direct Supabase)
Supabase tables: `tracker_consent`, `expense_transactions` (select current / previous / previous-2 months, insert/update/delete), `user_credit_cards`, `financial_obligations`, `obligation_checklist` (+ RPC `generate_monthly_checklist`), `user_analysis` / `user_analyse_snapshots` (profile salary fallback via `lib/trackerProfileIncome.ts`)
Design tokens used: purple summary card (`#534AB7` gradient, white text, 10 px uppercase labels at 70 % opacity); progress bar colours `#6BCB77` (≤ 70 %), `#FFD93D` (≤ 90 %), `#FF6B6B` (> 90 %); bucket accents `#534AB7`, `#6B63C9`, `#7A72D4`, `#5B54B0`, `#4F48A8`; container `max-w-[920px] px-4 pb-20`
Key functionality:
  - **Consent gate**: `localStorage['finkoin_tracker_consent']==='v2'` fast path, else a `tracker_consent` row. `TrackerConsent` upserts `{consent_given:true, consent_at, consent_version:'v2'}`.
  - **Month navigation**: back to the consent month / first-transaction month; forward only up to `trackerForwardLimit()`. The next month unlocks on or after the **last Friday** of the current month, and an over-limit selection snaps back. A midnight timer (`msUntilNextLocalMidnight`) refreshes "today".
  - **Summary card** (flips 180° when revealing): INCOME · tap to edit / SPENT / LEFT (shows "over" when negative), "On cards this month", "Cash budget used %" bar. Card-as-payment charges are excluded from cash spend (`sumCashSpend`, `sumOnCardsSpend`).
  - **Show all / Hide all** master privacy pill (controls the summary, income, buckets, and pulse). Each section also has its own eye.
  - **Income section**: logged income rows (salary, freelance, rental, dividend, bonus, other, "Saving from last month" carry-forward), with a fallback to the profile salary; edit/delete per row. `planMonthIncomeFromPrior` / `planAutoIncomeCleanup` auto-carry income.
  - **Bucket sections**: Needs (30 %), Wants (5 %), Habit expenses (0 % cap), Loans & Credit (40 %), Investments (20 %) — each expandable, with a list of transactions (icon, description, date, amount, "Paid by credit card" badge, edit ✎, delete ✕).
  - **Month Safety Pulse** (`computeMonthSafetyPulse`): Safe/Tight/Over, headline, reasons, one action, MoM delta vs the previous month, top movers, bucket health, daily safe spend + days left (current month only). Nested inside: `CreditCardBillReminder` (when cards / card txns exist) and `ObligationsChecklist`.
  - **Obligation learning**: expense text matching EMI/SIP/insurance/rent → "Add to obligations?" suggestion (`decideObligationLearn`). Deleting an expense that ticked an obligation un-ticks it.
  - Soft refetch on `visibilitychange` / focus and while the modal is open (PWA tap-lock workaround).
  - GA `expense_added` (bucket).
Interactions:
  - ← / → month arrows (aria "Previous month"/"Next month").
  - Eye toggle on the summary (flip), "Show all" pill, per-section eyes.
  - Tap INCOME → `AddExpenseModal` with bucket=income.
  - Bucket header tap → expand; "+ Add" inside a bucket → modal with that default bucket.
  - Row edit → modal in edit mode; row delete → `window.confirm("Remove this entry?")` → delete.
  - Credit card: "Pay bill" → modal prefilled (loans / credit_card / amount / description / UPI).
  - Obligations: mark paid, undo, skip, edit, delete (confirm), add obligation (sheet), reset all (confirm), accept/dismiss the learned suggestion.
  - Feedback widget (`pageContext="tracker"`).
Mobile specific:
  - `AddExpenseModal` is a **bottom sheet** (fixed, `zIndex 1000`, radius `20px 20px 0 0`, padding 24, `maxHeight 90vh`).
  - Inputs 16 px (`IOS_DATE_INPUT_STYLE` uses fontSize 16).
  - Card grid is 3 columns (`1fr 1fr 1fr`) with `minWidth: 0` truncation.
  - Bottom nav centre FAB "Track" highlights this route.

Related route — **`/tracker/[month]`** (`app/tracker/[month]/page.tsx`) — **Complete**. `YYYY-MM` param (invalid → `/tracker`), consent gate, loads that month's `expense_transactions`, `MonthSummary` (bucket bars) + `ExpenseTable` (edit/delete rows) + `AddExpenseModal`. `ProtectedGate`.

---

### 1.9 Split — Groups list

Route: `/split`
File: `app/split/page.tsx` (+ `layout.tsx` metadata)
Status: **Complete**
Components used: `SplitMarketingLanding` (logged out), `ProtectedGate`, `InviteLinkShare`, `AppIcon`, `BrandPageLoader`
Store used: `authStore`, `splitStore` (`groups`, `loading`, `fetchGroups`, `createGroup`, `inviteMember`, `deleteGroup`)
API routes: `POST /api/split/groups`, `POST /api/split/invite` (`linkOnly:true`), `DELETE /api/split/groups?groupId=`
Supabase tables: `split_group_members` (my active memberships by email), `split_groups` (active, ordered by `updated_at`); realtime channel `my_groups:<userId>` on `split_group_members`
Design tokens used: page `#F7F7F4`, group rows white radius 16, min-height 64–72, emoji well `#EEEDFE`; create CTA `#534AB7`
Key functionality:
  - Logged out → SSR marketing landing; logged in → app behind `ProtectedGate`.
  - List groups with 2-minute TTL cache; refresh on focus/visibility plus realtime member updates.
  - **Create group (2-step modal)**: details (name + optional emoji) → create → auto `inviteMember({linkOnly:true})` → invite step with `InviteLinkShare` (copy, WhatsApp, URL) → Continue → `/split/<id>`.
  - Creator-only soft delete (confirm).
  - GA `split_group_created`.
Interactions:
  - Back → `/` (`router.replace`).
  - "+ New group" / empty-state CTA → create modal.
  - Group row tap → `/split/[groupId]`; "…" / delete → `window.confirm` → `DELETE`.
  - Create modal fields: **Group name** (text, placeholder "Goa trip / Flat expenses", required); **Emoji** (text, optional). Validation: name required, user id + email required. Buttons: Create, Cancel/backdrop close, Copy link, WhatsApp, Continue.
Mobile specific: the modal is a **bottom sheet** style (body scroll lock via `lib/bodyScrollLock`), inputs 16 px, touch targets ≥ 44 px, `pb-[90px]` bottom clearance.

---

### 1.10 Split — Group detail

Route: `/split/[groupId]`
File: `app/split/[groupId]/page.tsx`
Status: **Complete**
Components used: `ProtectedGate`, `BackHref`, `InviteLinkShare`, `AppIcon`, `BrandPageLoader`
Store used: `splitStore` (`activeGroup`, `expenses`, `settlements`, `netBalances`, `balances`, `fetchGroupDetail`, `inviteMember`, `settleUp`, `deleteExpense`, `deleteGroup`, `leaveGroup`), `authStore`
API routes: `GET /api/split/balances?groupId=`, `POST /api/split/invite`, `POST /api/split/settle`, `DELETE /api/split/expenses/[id]`, `DELETE /api/split/groups?groupId=`, `DELETE /api/split/members?groupId=&email=`
Supabase tables: `split_groups`, `split_group_members` (active|pending), `split_expenses` (+ `split_expense_shares`, `is_deleted=false`), `split_settlements`; realtime channel `split:<groupId>` (expenses insert/update/delete, shares, settlements)
Design tokens used: owe `#E24B4A`, owed/positive `#1D9E75`, tab pills `#EEEDFE/#534AB7`
Key functionality:
  - Header: group emoji/name, "You owe" / "You are owed" / settled net.
  - **Tabs**: expenses | members | settlements.
  - Expenses tab: **Simplified settle-up** edges (`simplifyDebts`) with a settle shortcut; expense list (title, payer, amount, your share); creator Edit (`/add-expense?edit=<id>`) + soft Delete (confirm sheet); empty state "All settled up. Add an expense to start splitting."; refresh.
  - Members tab: per-member net; admin/creator Remove; non-creator Leave (blocked when net ≠ 0).
  - Settlements tab: history.
  - **Invite modal**: auto-generates the open link (`linkOnly`), `InviteLinkShare`, optional email invite (Resend), plus the permanent `invite_code` link `/split/join?code=`.
  - **Settle modal**: to-member select, amount (`number`, `inputMode=decimal`), method UPI / Cash / Bank, UPI note (optional).
  - Group delete (creator) confirm sheet.
  - GA `split_invite_sent`.
Interactions: back (→ `/split`), "…" delete group, Invite, Settle up, "+ Add expense" (→ add-expense), tab switch, expense edit/delete, member remove/leave, invite email field (`email`, "friend@example.com") + Send, settle confirm.
Validation: settle requires a recipient and amount > 0 (the server blocks self-settlement); leave/remove is blocked with a message when the balance is unsettled.
Mobile specific: all modals are bottom sheets with a backdrop tap to close; the amount input is 16 px with a decimal keypad; the header uses `BackHref` (a fixed parent).

---

### 1.11 Split — Add / edit expense

Route: `/split/[groupId]/add-expense` (`?edit=<expenseId>`)
File: `app/split/[groupId]/add-expense/page.tsx`
Status: **Complete**
Components used: `ProtectedGate`, `AppIcon`, `BrandPageLoader`
Store used: `splitStore` (`fetchGroupDetail`, `addExpense`, `editExpense`), `authStore`
API routes: `POST /api/split/expenses`, `PUT /api/split/expenses/[expenseId]`
Supabase tables: (server) `split_expenses`, `split_expense_shares`, `split_group_members`, `split_groups.updated_at`
Design tokens used: calculator-style amount panel (large centred purple amount), chips `#EEEDFE`
Key functionality:
  - Loads the group detail and builds the member list; in edit mode it pre-fills from the expense.
  - Split types: **equal**, **exact**, **percentage**, **shares**, with a live per-person hint.
  - GA `split_expense_added` (create only).
Interactions / fields:
  - Amount (`text`, `inputMode=decimal`, placeholder "0").
  - Title/description (`text`, "Beach shack drinks").
  - Paid by (member chips).
  - Split type segmented (equal/exact/percentage/shares).
  - Include/exclude member toggles.
  - Exact amounts per member (decimal), percentages per member, share counts (`number`, numeric).
  - Category chips: Food, Transport, Hotel, Entertainment, Shopping, Utilities, Medical, Other.
  - Date (`date`, ≤ today).
  - Notes ("Add a note").
  - Save button; back → group expenses.
Validation: amount > 0 ("Enter a valid amount."); title ("Enter a description."); payer ("Choose who paid."); ≥ 1 member ("Select at least one member to split with."); exact must total the amount (± 0.01); percentage must sum to 100; shares > 0; the server re-validates via `computeSplitShares`.
Mobile specific: full page (not a sheet); inputs 16 px; sticky save; `min-h-dvh` scroll (the layout comment warns not to clip).

---

### 1.12 Split — Join

Route: `/split/join?token=…` or `?code=…`
Files: `app/split/join/page.tsx` (Suspense) → `JoinSplitGroupClient.tsx`; global resume `components/SplitInviteResume.tsx`
Status: **Complete**
Components used: `BrandPageLoader`, `AppIcon`
Store used: `authStore` (`hasInitialized`), `splitStore.fetchGroups`
API routes: `POST /api/split/join` (`{token}` or `{code}`)
Supabase tables: (server) `split_invitations`, `split_group_members`, `split_groups`
Key functionality:
  - No token/code → "Invalid invite link".
  - Unauthenticated → persist the invite (`lib/splitAuthRedirect.ts`: localStorage + cookies). On an Android browser (`shouldOfferOpenInApp`) it shows "Open in Finkoin app" (`intent://`) / "Continue in browser"; otherwise → `/login?next=<join url>`.
  - Authenticated → `POST /api/split/join` → success UI → `/split/<groupId>`. On 401 → login with the invite preserved. Other errors show the message.
  - Open-invite semantics: any logged-in user; the invite stays `pending` for reuse. Email invites need a matching email (403 otherwise).
Interactions: Open in app, Continue in browser, Retry, "Go to Split" (→ `/split`).
Mobile specific: iOS never offers "open the PWA" (storage is siloed); the join finishes in-browser.

---

### 1.13 Calculators hub

Route: `/calculators` (`?calc=<id>`, `?from=home`)
Files: `app/calculators/page.tsx`, `layout.tsx`, `CalculatorsClient.tsx`, `calculator-config.ts`, `calculator-seo.ts`
Status: **Complete**
Components used: `CalculatorsClient`, `BottomSheet` (mobile tool sheet), `ShareButton`, `BackLink`, `Breadcrumb`, `CalculatorRelatedLinks`, lazy map `components/calculators/lazy-calculators.tsx`, `AppIcon`
Store used: none (the tax calculator uses `localStorage`)
API routes: none (pure client math)
Supabase tables: none
Design tokens used: category chips `#EEEDFE/#534AB7`, tool cards white radius 16, icon wells `#EEEDFE`
Key functionality:
  - Categories (`CATEGORIES`): **Investment** (sip, swp, ppf, emergency, fire), **Loans** (emi, home, car), **Life decisions** (rentbuy, rentcar, whencar), **Post office** (po hub, po-savings, po-td, po-rd, nsc, po-kvp, po-mis, po-scss, po-ssy), **Tax** (tax-regime).
  - Selecting a tool updates the URL (`/calculators/<id>` or `?calc=`) and fires GA `tool_open`. Mobile opens the tool in a `BottomSheet`; desktop uses a side panel.
  - JSON-LD `WebApplication` when tax is active.
Interactions: back (→ `/`, or home when `from=home`), category chip tap, tool card tap, Share (native `navigator.share` → clipboard fallback), sheet close (drag/backdrop).
Mobile specific: `BottomSheet` with drag-to-close and safe-area padding; list bottom padding for the nav; money inputs capped at ₹99 Cr (`CALCULATOR_MONEY_MAX`); rate fields accept decimals synced with sliders (`lib/calculatorInput.ts`).

#### 1.13.1 Individual calculator routes (`app/calculators/[id]/page.tsx`)

`generateStaticParams(INDEXABLE_CALC_IDS)`; per-id metadata, OG image (`getOgImagePathForCalc`), `Breadcrumb`, `CalculatorsClient initialCalcId`, related links. Unknown id → `notFound()`. `tax-regime` → permanent redirect to `/calculators/tax-regime-2026`.

| Requested route | Actual route | Status | Component | Inputs (slider min–max, step) | Outputs |
|---|---|---|---|---|---|
| `/calculators/sip` | `/calculators/sip` | **Complete** | `SIPCalculator.tsx` | Monthly SIP 500–₹99 Cr (500); return 6–20 % (0.1); period 1–30 y | Maturity value, Invested, Total gain + insight |
| `/calculators/home-loan` | **`/calculators/home`** | Not found → **Complete** at `/home` | `HomeLoanCalculator.tsx` | Property value ≥ 10 L (5 L); down payment 10–50 %; rate 7–12 % (0.05); tenure 5–30 y; loan start date; household take-home ≥ 25 k | Loan amount, EMI, totals, affordability insight, amortisation table (12 rows + "show all") |
| `/calculators/fd-calculator` | **none** | **Not found** | — (closest: `po-td` Post Office TD via `postOffice/schemeCalculators.tsx`) | — | — |
| `/calculators/retirement-calculator` | **none** | **Not found** | — (closest: `/calculators/fire`) | — | — |
| `/calculators/emi-calculator` | **`/calculators/emi`** | Not found → **Complete** at `/emi` | `EMICalculator.tsx` | Loan 1 L–₹99 Cr (50 k); rate 6–18 % (0.1); tenure 12–360 m; start date | Monthly EMI, Total payment, Total interest, amortisation schedule with "today" row highlight |
| `/calculators/emergency-fund` | **`/calculators/emergency`** | Not found → **Complete** at `/emergency` | `EmergencyFundCalculator.tsx` | Monthly must-cover expenses ≥ 15 k; current fund ≥ 0 (25 k); monthly add ≥ 1 k | Target fund, Gap, Months to close gap + tone insight |
| `/calculators/fire-number` | **`/calculators/fire`** | Not found → **Complete** at `/fire` | `FIRECalculator.tsx` (+ `lib/fireCalculator.ts`) | Monthly expenses ex-EMI ≥ 15 k; monthly EMIs; outstanding loans; current corpus; monthly SIP; return 4–18 % | Lifestyle FIRE corpus (25×), Total FIRE target (+ debt), years-to-FIRE |
| — | `/calculators/swp` | **Complete** | `SWPCalculator.tsx` | Corpus ≥ 5 L (50 k); withdrawal ≥ 5 k; return 3–15 % | Corpus lasts, Sustainable monthly (interest-only) |
| — | `/calculators/ppf` | **Complete** | `PPFCalculator.tsx` | Yearly deposit ≥ 500; rate 6–9 % | 15-year maturity, invested, tax-free gain (EEE) |
| — | `/calculators/car` | **Complete** | `CarLoanCalculator.tsx` | Car price, down payment, rate, tenure | EMI, interest, affordability |
| — | `/calculators/rentbuy`, `/rentcar`, `/whencar` | **Complete** | `RentVsBuyCalculator`, `RentVsOwnCarCalculator`, `WhenToBuyCarCalculator` | Scenario sliders | Break-even / recommendation |
| — | `/calculators/po`, `po-savings`, `po-td`, `po-rd`, `nsc`, `po-kvp`, `po-mis`, `po-scss`, `po-ssy` | **Complete** | `PostOfficeCalculator.tsx`, `postOffice/schemeCalculators.tsx`, `NSCCalculator.tsx` (+ `lib/postOfficeSchemes.ts`, Jul–Sep 2026 rates) | Scheme-specific amount/tenure | Maturity, interest, payouts |

---

### 1.14 Tax regime calculator 2026

Route: `/calculators/tax-regime-2026`
Files: `app/calculators/tax-regime-2026/page.tsx`, `TaxExploreMore.tsx`, `components/calculators/TaxRegimeCalculator.tsx` (5,142 lines), `ToggleSection.tsx`, `TaxTeachTooltip.tsx`, `lib/taxRegimeComparisonFY2026.ts`, `lib/taxCalculatorHelpers.ts`, `lib/taxMissedDeductionAlerts.ts`, `lib/taxTeachContent.ts`
Status: **Complete**
Components used: `CalculatorsClient`, `TaxRegimeCalculator`, `ToggleSection`, `TaxTeachTooltip`, `FieldTooltip`, `PaywallModal`, `PrivateAmount`, `Breadcrumb`, `CalculatorRelatedLinks`, `TaxExploreMore`, `ShareButton`
Store used: none (`localStorage['finkoin_tax_calculator']`, schema-versioned `TAX_CALC_SCHEMA_VERSION`)
API routes: Razorpay trio (deep-report paywall ₹99)
Supabase tables: none
Key functionality:
  - FY 2025-26 (AY 2026-27) old vs new comparison: slabs, standard deduction (₹75 k new / ₹50 k old), 87A rebate model, surcharge, 4 % cess, HRA/80GG, meal-voucher exemption (₹50 vs ₹200 cap toggle), capital gains buckets (20 % STCG / 12.5 % LTCG over ₹1.25 L), lottery at 30 %.
  - **Personal CA (guided)** wizard: multi-select "What best describes you?" (salaried/freelancer/business/pensioner/retired) → derived primary employment for hints.
  - Main-form `<details>` steps with `ToggleSection`s: Job switch / Full & Final, HRA, Rent without HRA (80GG), LTA, RSU/ESOP, Gratuity, Leave encashment, Business income (44AD/44ADA/regular), Rental income (NAV worksheet), Pension, Interest income, Dividend income, Capital gains, Agricultural income, Other income, 80C basket & NPS 80CCD(1B), 80D medical, Other Chapter VI-A & 24(b).
  - Sticky LIVE SUMMARY (desktop) / mobile summary; winner banner; monthly take-home diff (masked); mobile 3-column Category | Old | New table.
  - Suggested ITR form (ITR-1/2/3/4 logic), missed-deduction alerts (suppressed when the new regime wins), "What you learned today" recap, FAQ, Reset.
  - Deep report paywall "Unlock tax regime deep report", which redirects back after payment.
Interactions: every toggle section has an on/off switch plus a chevron to expand; money inputs (≤ ₹99 Cr); age bracket (regular/senior/super-senior); metro toggle; employment multi-select chips; Reset (clears storage + reload); Share; unlock.
Mobile specific: Step 5 Results is open by default on mobile; tables collapse to 3 columns; inputs 16 px.

---

### 1.15 Learn hub

Route: `/learn`
File: `app/learn/page.tsx` → `components/learn/learn-hub.tsx`
Status: **Complete**
Components used: `LearnHub`, `Link`
Store used: none
API routes: none; Supabase tables: none (static content `lib/learnContent.ts`)
Key functionality: 41 articles (`learnArticles`) in categories Basics / Tax / Investment / Insurance / Loans / Property, each with a title, subtitle, and read time. Filter chips: All + 6 categories.
Interactions: category chip tap (`setFilter`), article card tap → `/learn/<id>`, footer links `/calculators`, `/analyse`.
Mobile specific: horizontally scrolling chip row; single-column cards.

### 1.16 Learn article

Route: `/learn/[id]` (the audit list says `[slug]`; the actual param is `id`)
File: `app/learn/[id]/page.tsx`
Status: **Complete**
Components used: `ArticleShare` / `ShareButton`, `ArticleTracker` (no-op, F5), `Breadcrumb`, `LearnArticleLayout`, `LearnRichArticleRenderer`, `LearnSimpleArticle`, `LearnFaqAccordion`, custom guides (`SipCroreGuide`, `CompoundInterestGuide`, `EmergencyFundGuide`, `Form16ItrGuide`, `IndexFundGuide`, `TermInsuranceVsEndowmentGuide`, `IncomeTaxGuideFY2526`, `OldVsNewRegimeGuideFY2526`), tool embeds (`HomeLoanPrepayEmbed`, `SipCroreCalculatorEmbed`, `EmergencyFundLearnEmbed`, `TaxRegimeLearnEmbed`, `LearnToolEmbed`), `TaxFaqAccordion`, `TaxRegimeToggle`
Key functionality: SSG via `generateStaticParams`; unknown → `notFound()`; SEO override `lib/learnSeo.ts` + share images; renders a custom guide → rich article (`lib/learnRichArticles.ts`) → simple paragraphs; FAQ JSON-LD from `lib/learnArticleFaqs.ts`.
Interactions: share (native/clipboard), FAQ accordion expand, embedded calculator sliders, tax regime toggle, related links.
Mobile specific: reading width with 16 px gutters; embeds are full-width.

### 1.17 Blog list

Route: `/blog` · File: `app/blog/page.tsx` · Status: **Complete**
Content: `lib/blogContent.ts` (`BLOG_ARTICLES`: know-taxation-in-india, old-vs-new-tax-regime-2026, term-insurance-calculator-india, emergency-fund-calculator-india, 80c-deductions-guide-2026, plus `lib/data/blog-fire-number-india.ts`, `lib/data/blog-old-vs-new-tax-roi-2026.ts`).
Interactions: article title / "Read" links → `/blog/<slug>`; footer links to tax calc, analyse, learn, home. No store/API/tables.

### 1.18 Blog article

Route: `/blog/[slug]` · File: `app/blog/[slug]/page.tsx` · Status: **Complete**
Key functionality: SSG, `notFound()` for unknown slugs, `renderBlogBody()` (`lib/renderBlogBody.tsx`), Article JSON-LD with `image` (`/og/blog/<slug>.png` when the file exists, else the home OG), CTA links to `/analyse`, `/tracker`. No store/API/tables.

### 1.19 Tax — ITR auto-fill (requested `/tax`)

Route: `/tax` — **Not found**. There's no ITR auto-fill, Form-16 upload, or AIS/26AS import anywhere in `app/`. The closest equivalents: `/calculators/tax-regime-2026` (ITR form suggestion), `/learn/form-16-what-to-verify` (`Form16ItrGuide`). The `tax_documents` table exists in the live DB but has no app code path (FINKOIN_SYSTEM §36.2).
Status: **Not found**

### 1.20 Leaderboard

Route: `/leaderboard`
File: `app/leaderboard/page.tsx`
Status: **Complete**
Components used: `ProtectedGate`, `AppIcon`, `BrandPageLoader`
Store used: `authStore`
Supabase tables: `leaderboard_view` (top 50 + my row), realtime channel `leaderboard-updates` on `gamification` (invalidates cache)
Key functionality: `localStorage['finkoin_leaderboard']` cache (5 min TTL); top list with rank, anonymised name, FK/weekly tokens; "your rank" card; last-updated timestamp.
Interactions: Refresh button (force fetch). No forms.

### 1.21 Profile (and the settings panel)

Route: `/profile`
File: `app/profile/page.tsx`
Status: **Partial** (KYC / Aadhaar "Coming soon")
Components used: `ProtectedGate`, `BackLink` (→ `/`), `ProfileAssets`, `AppIcon`
Store used: `authStore`, `financialStore`, `gamificationStore`
Supabase tables: `user_analyse_snapshots` (fallback fetch), writes via `syncProfileAssets` → `user_analyse_snapshots`
Key functionality:
  - Hero: avatar, name, email; Health score tile + FK tokens tile.
  - **ProfileAssets** (IndMoney-style): sections Cash (Bank/savings, Liquid MF, Other liquid), Investments (MF, Equity/RSU, FD, PPF, EPF, NPS, Indian stocks, US stocks, US MF, RSU/ESOP, Other), Physical (Home/property, Car/vehicle, Gold, Other), Liabilities (loans). Each section has a privacy eye, per-row edit, and "+ Add" catalog menus. Every edit goes through `patchScalarAsset` / `upsertUnifiedLoan` / `upsertCustomInvestment` → `syncProfileAssets` (re-runs `analyseFinances` + upserts the snapshot).
  - "Your financial checklist" (from `analyseFinances(submission).securityChecklist`), label left / detail right.
  - KYC verification (PAN mock via `lib/kycVerification.ts`), Aadhaar "Coming soon".
  - Referral card: copy link (GA `share`), WhatsApp share (`wa.me` prefilled), sign out (`logout()` → `/` + refresh).
Interactions: back, asset row tap → edit amount sheet, add menu → catalog item → amount, eyes, copy referral, WhatsApp, Sign out.

Related account routes:
- **`/settings`** (`app/settings/page.tsx`) — **Complete**. Name (text) + Save → `users.name`; avatar upload (file) → Storage bucket `avatars` → `users.avatar_url`; "Send password reset email"; notification preferences (`notification_preferences` upsert: email tips consent, push consent via `lib/webPushClient.ts` → `/api/notifications/push-subscribe`, "Payment & Split alerts"); Export data (JSON download); Delete account (confirm); `FeedbackFormButton`.
- **`/rewards`** — **Complete**: live `gamification` row (balance, total earned, streak, badges). `ProtectedGate`.
- **`/refer`** — **Complete**: referral code/link from `users.referral_code`, copy/WhatsApp share (GA `share`), referred users list.
- **`/investments`** — **Partial**: read-only asset roll-up from `financialStore`; some actions "coming soon".
- **`/goals`** — **Partial (placeholder)**: goal cards; most actions "Coming soon".
- **`/policies`** — **Partial**: `PolicyVaultClient` (924 lines) CRUD on `user_policies`; renew/transfer intents only.
- **`/kyc`** — **Partial**: static "KYC status".

### 1.22 Other routes (not on the requested list, audited for completeness)

| Route | File | Status | Notes |
|---|---|---|---|
| `/optimizer` | `app/optimizer/page.tsx` | Complete | `FinkoinAiPlanView`, `optimizer-full-sections`, `MonthlyAllocationPieChart`; reuses the persisted `aiPlan` else `getAIFixPlan`; income masked; PDF export |
| `/portfolio` | `app/portfolio/page.tsx` | Partial | Sample fund data + verdicts (`portfolioStore`), CAMS/PAN placeholders; no live data |
| `/insurance` | `app/insurance/page.tsx` | Partial | "Compare insurance plans" shell; `insurance_clicks` logging |
| `/plans` | `app/plans/page.tsx` | Partial | Plan cards; `TODO: Replace with Razorpay later` ×2 |
| `/pricing`, `/careers`, `/press` | — | Placeholder | "Coming soon" |
| `/about` | `app/about/page.tsx` | Complete | Founder photo + Person/ProfilePage JSON-LD |
| `/contact` | `app/contact/page.tsx` | Complete | "We are here to help" |
| `/legal/privacy`, `/legal/terms`, `/legal/refund`, `/legal/disclaimer` | `app/legal/*` | Complete | DPDP-aligned policies |
| `/privacy`, `/terms` | redirect | Complete | `redirect()` to `/legal/*` |
| `/offline` | `app/offline/page.tsx` | Complete | Workbox document fallback |
| `/calculator` | `app/calculator/page.tsx` | Complete | Basic arithmetic calculator (legacy) |
| `robots.txt`, `sitemap.xml` | `app/robots.ts`, `app/sitemap.ts` | Complete | Disallows `/api/`, `/analyse/fixplan`, `/auth/` |

---

## 2. COMPONENTS

> Format per component: file · status · props · stores · tables/APIs · behaviour · mobile notes.

### 2.1 BottomNav (inside `components/global-navbar.tsx`)
- Status: **Complete** (not a separate component — F6).
- Items: **Home** `/` · **Report** `/analyse` · centre raised **Track** FAB `/tracker` (−mt-8, 48×48, compacts to 44×44 on scroll) · **Calculators** `/calculators` · **Profile** `/profile`. Split is **not** in the bottom nav (it's reached via the header nav / profile menu / quick tools).
- Active state: `matchBottomNav(path)` + animated `BottomNavActivePill` (framer-motion; respects reduced motion).
- Compacts when `scrollY ≥ 20` (`scale-[0.96]`).
- Safe area: `bottom: max(10px, env(safe-area-inset-bottom))`; analytics `data-track-nav-zone="bottom_nav"`.
- The header part of the same file has desktop links (Analyse, Tracker, FK Split, Calculators, Portfolio, Optimizer, Learn), `NotificationBell`, and an avatar that opens the profile panel (backdrop + body scroll lock + scrollable) with: My Profile, Expense Tracker, FK Split, My Analysis (`/analyse/result`), My Policies, My Goals, My Investments, Leaderboard, Rewards, Refer & Earn, Settings, `FeedbackFormButton`, legal links (Privacy, Terms, Refund, Disclaimer), Sign out.

### 2.2 NotificationBell (`components/NotificationBell.tsx`, 354 lines)
- Status: **Complete**. No props.
- Store: `notificationStore` (`notifications`, `unreadCount`, `fetchNotifications`, `markAllRead`), `authStore`.
- Tables: `user_notifications` (select 20 newest; update `is_read`); realtime channel `notifications:<uid>` INSERT → refetch.
- Behaviour: bell with an unread badge; opening marks all read when unread > 0; dropdown cards (emoji, title, content, relative time); empty state.
- Mobile: full-width dropdown under the header; tap outside closes it.

### 2.3 MorningTipPopup (`components/MorningTipPopup.tsx`, 272 lines)
- Status: **Complete**. No props.
- Store: `notificationStore` (`getTodayUnshownPopup`, `markPopupShown`), `authStore`.
- Tables: `user_notifications` (`shown_as_popup=true, is_read=true`).
- Behaviour: logged in only; shows 06:00–22:59 IST; once per IST day (`localStorage['finkoin_tip_popup_<YYYY-MM-DD>']`); 3 s delay; picks the oldest unshown tip; Close marks shown; "Learn more" → `/learn`.
- Mobile: slide-up card (CSS keyframes translateY 30 px → 0).

### 2.4 FeedbackWidget (`components/FeedbackWidget.tsx`, 305 lines)
- Status: **Complete**. Props: `pageContext: string`, `onClose?: () => void`.
- API: `POST /api/feedback` `{ rating, message, page_context, score_at_time }` (+50 FK server-side when authed; 10/hr rate limit).
- Behaviour: 5 star buttons (hover fill `#EEEDFE`/`#534AB7`), textarea "What did you find most useful? What can we improve?", validation "Please select a star rating"; success "+50 FK tokens added"; for ratings ≥ 4 it optionally shows a Google review link (`GOOGLE_REVIEW_URL`); sets `finkoin_feedback_<context>` suppression.
- Used on: `/analyse/result`, `/tracker`, and inside `FeedbackPopupManager`.

### 2.5 FeedbackPopupManager (`components/FeedbackPopupManager.tsx`, 141 lines)
- Status: **Complete**. No props.
- Behaviour: route prefixes `/calculators`, `/tracker`, `/learn`, `/analyse`, `/portfolio`, `/optimizer`; logged in only; not suppressed (`finkoin_feedback_<pageKey>`; `lib/feedbackPrompt.ts`); a 120 s timer opens the feedback modal/widget.

### 2.6 MonthSafetyPulse (`components/tracker/MonthSafetyPulse.tsx`, 406 lines)
- Status: **Complete**. Props: `pulse: SafetyPulseResult`, `previousMonthLabel?: string | null`, `forceVisible?: boolean`, `children?: ReactNode` (nested CC + obligations panels).
- Behaviour: status chip Safe / Tight / Over (`STATUS_STYLE`), headline, reasons, one action, MoM delta, movers, bucket health, daily safe spend (current month only); its own eye toggle (masked by default), overridden by `forceVisible`.

### 2.7 HealthScoreRing
- **Not present on web** (F6). Web score UI = inline badge + `SpeedoMeter`. Mobile has `mobile/components/ui/HealthScoreRing.tsx` (props `score`, `size=72`, `strokeWidth=6`, react-native-svg), currently only used by the unused `ResultCard`.

### 2.8 PrivateAmount (`components/ui/PrivateAmount.tsx`, 138 lines)
- Status: **Complete**. Props: `value: number`, `children: ReactNode` (revealed content), `masked?` (default `₹••••••`), `valueClassName?`, `valueStyle?`, `eyeColor?`, `eyeSize?`, `gap?`, `label?` (aria), `align?`.
- Behaviour: hidden by default; the eye reveals; **no eye when value is 0 / no data**. Used on result, fixplan, optimizer, AI plan view, onboarding total income, tax calculator take-home.

### 2.9 AddExpenseModal (`components/tracker/AddExpenseModal.tsx`, 1,030 lines)
- Status: **Complete**.
- Props: `onClose`, `onSaved?(payload{amount, category, subcategory, bucket, description, date, isEdit})`, `defaultDate?`, `maxDate?`, `defaultBucket?`, `defaultSubcategory?`, `defaultAmount?`, `defaultDescription?`, `defaultPaymentMethod?`, `editExpense?{id,date,amount,bucket,subcategory,description,payment_method}`.
- Tables: `expense_transactions` insert/update (`user_id, date, amount, category, subcategory, bucket, description, payment_method, month, year`), `user_credit_cards` (via `persistCreditCardToDb`, `deleteCreditCardFromDb`), `financial_obligations` (credit card obligation sync).
- Fields: Amount (big numeric, placeholder "0"); Date (`date`, ≤ `maxDate`, iOS 16 px style); Bucket chips (Needs, Wants, Habits, Loans & Credit, Investments, Income); Type/subcategory grid (`pickerSubcategories`, purple icons); Description ("e.g. Zomato dinner order"); Paid via (UPI, Cash, Net banking, Wallet, Cheque, Credit card); when Credit card: saved-card chips + delete ✕ + "Add card" (nickname, billing day 1–31, due day 1–31 defaulting to billing + 20 d).
- Validation: "Please fill amount, category and type"; "You must be signed in"; "Select a credit card or add a new one"; card name required; billing/due day 1–31. Credit-card bill payments force a non-card rail.
- UI: bottom sheet (see 1.8).

### 2.10 Testimonials (`components/Testimonials.tsx`, 146 lines)
- Status: **Complete**. No props (internal `Testimonial {id, rating, message, …}`).
- API: `GET /api/feedback` (approved + featured, rating ≥ 4). Cache `localStorage['finkoin_testimonials']` 24 h. Used by `HomePageBelowFold`.
- Note: a separate `GET /api/testimonials` route (reads `app_feedback` + `users`) exists but this component calls `/api/feedback`.

### 2.11 ClarityScript (`components/ClarityScript.tsx`, 27 lines)
- Status: **Complete**. Renders `null` unless `NEXT_PUBLIC_CLARITY_ID`; injects the Clarity bootstrap `afterInteractive`.

### 2.12 AppInitializer (`components/AppInitializer.tsx`, 88 lines)
- Status: **Complete**. Props: `children`.
- Behaviour: `applyPersistedAuthBootstrap()` in `useLayoutEffect` → `persist.rehydrate()` → `initAuth()` (single-flight ref). After login: `fetchGamification` → `updateLoginStreak` → `subscribeToRealtime` (unsubscribes on logout). Renders `PWAInstallPrompt`.

### 2.13 Other root-level components

| Component | Lines | Status | Purpose |
|---|---|---|---|
| `AuthSessionSync` | 69 | Complete | `storage` + `visibilitychange` → `refreshUser()` |
| `FinancialStoreAuthSync` | 23 | Complete | Rehydrate the per-user financial store on user switch |
| `ReferralCapture` | 34 | Complete | `?ref=` → sessionStorage |
| `ReferralSuccessToast` | 29 | Complete | One-time referral success toast |
| `SplitInviteResume` | 45 | Complete | Resume a pending `/split/join` after login |
| `PushPermissionPrompt` | 130 | Complete | Post-login "Allow notifications" (2.5 s; 14-day dismiss) |
| `PWAInstallPrompt` | 338 | Complete | Android `beforeinstallprompt` / iOS A2HS guide; hidden on join/login/auth |
| `PwaBootSplash`, `PwaLaunchHandler` | 59 / 38 | Complete | Standalone splash; `launchQueue` consumer |
| `RenewalReminderBanner` | 116 | Complete | Policy renewal banner (dismiss key) |
| `GoogleAnalytics`, `AnalyticsBehavior`, `TrackImpression` | 62 / 57 / 53 | Complete | GA4 page_path, scroll depth, impressions |
| `ScrollToTopOnRouteChange`, `MotionLazyProvider`, `Breadcrumb`, `FeedbackFormButton` | — | Complete | Utilities |
| `global-navbar` | 821 | Complete | Header + profile panel + bottom nav |

### 2.14 `components/tracker/*`

| Component | Status | Props | Notes |
|---|---|---|---|
| `AddExpenseModal` | Complete | see 2.9 | Bottom sheet |
| `AddObligationForm` | Complete | `onSave(payload)`, `onClose`, `initial?`, `submitLabel?` | Fields: title, category (Loan EMI, Life/Health/Vehicle insurance, SIP, PPF, Subscription, Rent, Other), amount, frequency (Monthly, Quarterly, Half-yearly, Yearly, One-time), due day/month/date, remind days, notes |
| `CollapsiblePanel` | Complete | `title, subtitle?, icon, open, onToggle, children, headerRight?, defaultBorder?` | Accordion shell |
| `CreditCardBillReminder` | Complete | `previousTransactions, currentTransactions?, cards?, monthName?, year?, monthlySalary?, onPayBill?, onCardsChange?, defaultOpen?, optimisticPayments?, asOf?` | Statement windows, next due, pay suggestions, hide/dismiss |
| `ExpenseTable` | Complete | `transactions, onChanged, onEdit?` | `/tracker/[month]` rows |
| `MonthSafetyPulse` | Complete | see 2.6 | |
| `MonthSummary` | Complete | `title, bucketTotals, totalSpent` | Bars for month detail |
| `ObligationsChecklist` | Complete | `userId, checklistMonth?, learnedSuggestion?, onDismissLearn?, analyseCompleted?, defaultOpen?` | "Keep this aside" total, paid/undo/skip/delete, add, reset-all confirm, learn suggestion |
| `PurpleCashAudit` | Unused | `transactions, profileMonthlyIncome?` | Commented out on `/tracker` |
| `TrackerConsent` | Complete | `onAccept()` | 4 "what we track" items + Accept → `tracker_consent` upsert |
| `TrackerIcons` | Complete | `TrackerIcon{name,size,color,className}`, `TrackerIconBadge{name,size,iconSize,color,…}` | 50+ purple stroke icons |

### 2.15 `components/forms/*`

| Component | Status | Notes |
|---|---|---|
| `analyse-onboarding-form.tsx` | Complete | 7-step RHF + Zod form (see 1.5) |
| `ObligationDateFields.tsx` | Complete | `PremiumDueFields{month?, day?, onMonth, onDay, hint?, label}`, `DayOfMonthPicker{label, value?, onChange, hint?}` |
| `onboarding-wizard.tsx`, `onboarding-step-basics.tsx`, `onboarding-step-goals.tsx`, `onboarding-step-complete.tsx` | **Unused** (F7) | Legacy wizard; `use-app-store` backs it |

### 2.16 `components/ui/*`

| Component | Status | Props (key) |
|---|---|---|
| `AppIcon` (+ `AppIconBadge`) | Complete | `name, size?, color?, strokeWidth?, className?` / `radius?` |
| `BackLink` / `BackHref` | Complete | `fallbackHref?, label?, className?, forceHref?, replace?` / `href, label?` |
| `BottomSheet` | Complete | `isOpen, onClose, title, children, fullscreen?, closeOnBackdrop?, closeOnDrag?` |
| `BrandPageLoader` | Complete | `fullScreen?, label?, size?, minHeight?, inline?, bare?, className?` |
| `brand-logo` | Complete | `className?, priority?, size?` |
| `button` (`Button`, `ButtonLink`) | Complete | `variant?, size?, className?` |
| `ChipSelector` | Unused | `options, selected[], onChange` |
| `FieldTooltip` | Complete | `text, label?` |
| `GoalCard` | Unused | `id, icon, title, subtitle, selected, onSelect` |
| `LoginSheet` | Unused | `open, onClose` |
| `MoneyInput` | Complete | `id, label, labelAction?, error?, helper?, required?, optional?, hint?, min?, max?` + RHF register; Indian grouping + in-words hint; 16 px |
| `NumberInput` | Complete | `label?, value, onChange, placeholder?, helper?, suffix?, min?, max?, step?, disabled?` |
| `PrivateAmount` | Complete | see 2.8 |
| `RouteChangeLoader` | Complete | Top progress on navigation |
| `ScrollSection`, `SectionToggle` | Unused | — |
| `ShareButton` | Complete | `title, url?, path?, contentType?, contentId?, className?, compact?, text?` |
| `SpeedoMeter` | Complete | Multi-gauge (`needs, wants, loans, investment, kind, amount, income, capFraction, rangeMultiplier, capLabel`) |
| `Toast` | Complete | Global toast |
| `AnimateOnScroll` | Complete | `children, variant?, delay?, className?, aboveFold?` |

### 2.17 Other component folders
- `components/analyse/`: `ConsentModal` (`onAccept`, `onDecline`), `PaywallModal` (`open, onClose, priceLabel?, title?, subtitle?, checkoutDescription?, bulletPoints?, navigateAfterUnlock?`; loads `checkout.razorpay.com/v1/checkout.js`), `AnalyseAdvisorModal` (`open, step, stepTitle, stepCount, onClose, children`), `AnalyseResultErrorBoundary`.
- `components/split/InviteLinkShare.tsx`: `inviteUrl, groupName` → Copy, WhatsApp, visible URL.
- `components/auth/ProtectedGate.tsx`: waits for `hasInitialized`; persisted login renders immediately; otherwise → `/login?redirect=<path>` (preserving `ref`).
- `components/profile/ProfileAssets.tsx` (907 lines): see 1.21.
- `components/feedback/FeedbackModal.tsx` (471 lines): 6-step wizard → `POST /api/feedback`, or opens a Google Form when `NEXT_PUBLIC_FEEDBACK_GOOGLE_FORM_URL` is set.
- `components/finkoin/`: `finkoin-ai-plan-view.tsx`, `optimizer-full-sections.tsx`, `MonthlyAllocationPieChart.tsx` (recharts).
- `components/landing/`: `HomePageClient`, `HomeHeroCarousel`, `HomeMobileQuickTools`, `HomePageBelowFold`, `FeatureCardsCarousel`, `AnalyseMarketingLanding`, `SplitMarketingLanding`, `Footer`.
- `components/learn/`: listed in 1.16.
- `components/policies/PolicyVaultClient.tsx`, `components/seo/CalculatorRelatedLinks.tsx`.
- `components/calculators/`: 16 calculators + `calculator-ui.tsx` (`SliderField`, `ResultStat`, `Insight`, `CALCULATOR_MONEY_MAX`, `todayInputValue`), `ToggleSection`, `TaxTeachTooltip`, `lazy-calculators.tsx`; unused: `compound-interest-calculator`, `spending-trend-chart`.

---

## 3. STORES

### 3.1 authStore (`store/authStore.ts`, 609 lines)
- Persisted: `finkoin-auth` (partialize: `user`, `isLoggedIn` only).
- **State**: `user: User | null` (`id, name, phone, email, photoURL, panVerified, aadhaarVerified, subscriptionTier 'free'|'pro'|'promax', subscriptionExpiry, createdAt, referralCode, referredBy, isAdmin?, fkBalance?`), `isLoggedIn`, `isLoading`, `hasInitialized`, `subscriptionTier`, `userId`.
- **Actions**: `setUser(user)`, `updateUser(patch)`, `setLoading(bool)`, `setSubscription(tier)`, `logout()` (POST `/api/auth/sign-out`, `signOut({scope:'global'})`, clears `finkoin-auth`, `finkoin-financial`, `finkoin_ai_cache`, `finkoin-gamification`), `initAuth()` (getSession → load `users` + `gamification`, creating the gamification row if missing; a single `onAuthStateChange`), `signUpWithEmail(email, password, name)`, `signInWithEmail(email, password)`, `refreshUser({clearOnMissingSession?})` (reads `users.avatar_url`, persists a generated `referral_code`, syncs FK into `gamificationStore`).
- Helper: `applyPersistedAuthBootstrap()`.
- Tables: `users`, `gamification`.

### 3.2 financialStore (`store/financialStore.ts`, 256 lines; alias `store/use-financial-store.ts`)
- Persisted: user-scoped `finkoin-financial:<uid>` via a custom storage.
- **State**: `analysis` (draft form), `lastSubmission` (normalized `FinancialProfile`), `result` (`AnalysisResult`), `profile`, `currentStep`, `aiPlan` (`FinkoinAIPlan`), `hasHydrated`.
- **Actions**: `setAnalysis(patch)`, `setFullAnalysis(profile)` (runs `analyseFinances`), `updateProfile(patch)`, `setResult`, `setAiPlan`, `setCurrentStep(value|fn)`, `hydrateFromSnapshot(profile, result, options)`, `runAnalysis()`, `clearSubmission()`, `resetAll()`, `resetStore()`, `setHasHydrated`.

### 3.3 splitStore (`store/splitStore.ts`, 710 lines)
- Not persisted. `CACHE_TTL` 2 min keyed by user.
- **State**: `groups`, `activeGroup`, `expenses`, `settlements`, `balances` (edges), `netBalances`, `loading`, `lastFetched`.
- **Actions**: `fetchGroups(userId, email, force?)` (Supabase members → groups), `fetchGroupDetail(groupId)` (group, members, expenses + shares, settlements; balances via `GET /api/split/balances`), `createGroup(input)` → `POST /api/split/groups`, `inviteMember({groupId, groupName, invitedEmail?, invitedByName?, invitedById?, linkOnly?})` → `POST /api/split/invite`, `addExpense` → `POST /api/split/expenses`, `editExpense` → `PUT /api/split/expenses/[id]`, `settleUp` → `POST /api/split/settle`, `deleteGroup` → `DELETE /api/split/groups?groupId=`, `deleteExpense` → `DELETE /api/split/expenses/[id]`, `leaveGroup(groupId, targetEmail?)` → `DELETE /api/split/members`, `clearActive()`.
- Helpers: `getMyNetBalance(email, net)`, `getMyBalanceFromEdges(email, edges)`.

### 3.4 gamificationStore (`store/gamificationStore.ts`, 357 lines)
- Persisted: `finkoin-gamification`.
- **State**: `fkBalance`, `totalEarned`, `lastLoginDate`, `badges[]`, `streakDays`, `rank`, `percentile`, `lastFetched`, `earnedActions[]`, `toastMessage`.
- **Actions**: `fetchGamification(userId)` (5 min cache; `gamification`, `users`, `leaderboard_view` rank), `addFK(userId, amount, reason, referenceId?)` (updates `gamification`, `users.fk_balance`, inserts `fk_transactions`), `subscribeToRealtime(userId)` (channel `gamification:<uid>`; returns unsubscribe), `updateLoginStreak(userId)`, `earnTokens(amount, label)` (local), `awardBadge(id)`, `hasEarnedAction(key)`, `markEarnedAction(key)`, `clearToast()`.

### 3.5 notificationStore (`store/notificationStore.ts`, 137 lines)
- Not persisted. **State**: `notifications[]` (`id, title, content, emoji, category, is_read, shown_as_popup, created_at`), `unreadCount`, `loading`.
- **Actions**: `fetchNotifications(userId)` (20 newest), `markAllRead(userId)`, `markPopupShown(notifId)`, `getTodayUnshownPopup()`.

### 3.6 obligationStore (`store/obligationStore.ts`, 702 lines)
- Not persisted. **State**: `obligations[]` (`FinancialObligation`), `checklist[]` (`ChecklistItem` with `status pending|paid|skipped|auto_debit` + joined obligation), `currentMonth`, `loading`, `totalObligated`, `totalPaid`, `totalPending`.
- **Actions**: `fetchObligations(userId)`, `fetchChecklist(userId, month?)` (join `obligation:financial_obligations(*)`), `addObligation(o)`, `updateObligation(id, patch)`, `deleteObligation(id)` (soft `is_active=false`), `markPaid(id, amount)`, `markUnpaid(id)`, `markSkipped(id)`, `resetAllObligations(userId)`, `generateChecklist(userId, month?)` (RPC `generate_monthly_checklist`), `syncFromHealthCheck(userId, submission)` (upserts from premiums/EMIs/SIP/CC/PPF + date fields, `onConflict user_id,title,category`).
- Helper: `monthStartIso(date)`.

### 3.7 Minor stores
- `portfolioStore` (`lastAnalysis`, `setLastAnalysis`) — demo portfolio.
- `use-app-store` (`onboardingStep`, `setOnboardingStep`) — legacy wizard.

---

## 4. API ROUTES (23 route files, 31 handlers)

| Route | Method(s) | Auth | Input | Supabase ops | Returns |
|---|---|---|---|---|---|
| `/api/ai/analyse` | POST | Cookie (`getAuthedUser`), 10/hr | `{ profile, analysis }` | RPC `search_by_keywords` (RAG, `lib/rag/retriever.ts`) | `{ priorityPlan, explanations, knowledgeUsed, isFallback? }`; 503 no key, 400 missing data |
| `/api/auth/sign-out` | POST | Cookie session | — | `auth.signOut` (clears cookies) | `{ ok }` |
| `/api/feedback` | POST | Optional cookie (FK only if authed), 10/hr per user/IP | `{ rating, message, page_context, score_at_time }` | insert `feedback`; if authed: `gamification` +50, `fk_transactions` (`feedback_submitted`) | `{ success, … }` |
| `/api/feedback` | GET | Public | — | select approved+featured `feedback` (rating ≥ 4) | `{ testimonials }` |
| `/api/financial-data` | POST | Cookie + rate limit | `{ submission }` | upsert `user_financial_data` (AES-256-GCM `encrypted_data, iv, auth_tag, encryption_version`, `data_hash`) | `{ success }` |
| `/api/financial-data` | GET | Cookie + rate limit | — | select `user_financial_data` → decrypt | `{ data }` |
| `/api/notifications/deliver-tip` | GET, POST | `Bearer CRON_SECRET` or `x-vercel-cron` | — | `users`, RPC `get_next_tip_for_user`, insert `user_notifications`, `user_tip_history`; web-push via `push_subscriptions` | `{ delivered, … }` |
| `/api/notifications/push-subscribe` | POST | Cookie (`auth.getUser`) | `{ endpoint, keys{p256dh, auth} }` | upsert `push_subscriptions`, `notification_preferences` | `{ ok }` |
| `/api/notifications/push-subscribe` | DELETE | Cookie | `{ endpoint }` | delete `push_subscriptions` | `{ ok }` |
| `/api/notifications/send-daily-tip` | GET, POST | `Bearer CRON_SECRET` | — | `finance_tips`, `notification_preferences`, `users` → Resend email | summary |
| `/api/notifications/send-test-tip` | POST | `Bearer CRON_SECRET` | `{ email? }` | `finance_tips` → Resend | summary |
| `/api/notifications/welcome-tip` | POST | Cookie | — | `finance_tips`, `notification_preferences` → email | `{ ok }` |
| `/api/obligations/reminders` | GET, POST | `Bearer CRON_SECRET` or `x-vercel-cron` | — | scan `financial_obligations`; insert `user_notifications` (`obligation_reminder`) | `{ inserted }` |
| `/api/razorpay/checkout-config` | GET | Public | — | — | `{ keyId }` / 503 |
| `/api/razorpay/create-order` | POST | Cookie, 15/hr | — | — (Razorpay Orders API, ₹99 = 9900 paise) | `{ orderId, amount, currency }` |
| `/api/razorpay/verify-payment` | POST | **Bearer access token** | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` | update `users.subscription_tier='pro'` | `{ ok: true }` |
| `/api/split/balances` | GET | Cookie + membership | `?groupId=` | `split_group_members`, `split_expenses` (+shares), `split_settlements` (admin client) | `{ net, edges }` |
| `/api/split/expenses` | POST | Cookie + membership | `{ groupId, title, amount, category, paidByEmail, paidByName, paidByUserId?, splitType, expenseDate, notes?, includedMembers[], exactAmounts?, percentages?, shareCounts? }` | insert `split_expenses`, `split_expense_shares`; update `split_groups.updated_at`; split notify push | `{ expense, shares }` |
| `/api/split/expenses/[expenseId]` | PUT | Cookie, creator only | same fields as POST (minus groupId) | update expense, replace shares | `{ expense }` |
| `/api/split/expenses/[expenseId]` | DELETE | Cookie, creator only | — | soft delete `is_deleted=true`; bump group | `{ success }` |
| `/api/split/groups` | POST | Cookie | `{ name, emoji?, type?, displayName? }` | insert `split_groups`, creator `split_group_members` (admin/active); rollback on failure | `{ success, groupId }` |
| `/api/split/groups` | DELETE | Cookie, creator | `?groupId=` | soft `is_active=false` | `{ success }` |
| `/api/split/groups/[groupId]` | DELETE | Cookie, active admin | — | hard delete shares, settlements, invitations, expenses, members, group | `{ success }` |
| `/api/split/invite` | POST | Cookie + membership, 30/hr | `{ groupId, groupName?, invitedEmail?, linkOnly? }` | `split_invitations` (reuse open invite), `split_group_members` pending seat (email mode); Resend email | `{ inviteUrl, token, emailSent, emailError?, linkOnly }` |
| `/api/split/join` | POST | Cookie | `{ token }` or `{ code }` | `split_invitations`, `split_groups.invite_code`, upsert/update `split_group_members` | `{ success, groupId, groupName }` |
| `/api/split/members` | DELETE | Cookie; self or admin/creator | `?groupId=&email=` | balance check (`split_expenses`, `split_settlements`); update member `status='left', left_at` | `{ success }` / 409 with amount |
| `/api/split/settle` | POST | Cookie + membership, 60/hr | `{ groupId, toEmail, amount, paymentMethod?, notes? }` | insert `split_settlements` (no self-settle) | settlement row |
| `/api/testimonials` | GET | Public | — | `app_feedback`, `users` | testimonials |

Cron (`vercel.json`): `/api/notifications/deliver-tip` and `/api/obligations/reminders` daily at `0 3 * * *` UTC (08:30 IST).

---

## 5. LIB FILES

### 5.1 `lib/financialEngine.ts` (1,213 lines — pure TS; only dev-gated `console.log`)
Exports:
- Types: `FinancialProfile` (re-export), `IssueSeverity`, `AnalysisIssue`, `AnalysisFlag`, `SecurityItem`, `RealEmergencyFundBreakdown`, `AnalysisResult`.
- `computeRealEmergencyFund(profile)` — weighted corpus: savings 100 %, liquid MF 95 %, FD 70 %, other liquid 50 %, legacy fund 100 %; months covered.
- `isMetroCity(tier)`, `getSavingsTargetPercent(p)`, `getDebtSafeLimitPercent()`.
- `monthlyTotalIncome(p)` (salary + spouse unless bachelor + other), `monthlySavingsContributions(p)`, `monthlyInsuranceTotal(p)`, `monthlyLivingExpenses(p)`, `housingAndEmiTotal(p)`, `monthlyTotalExpenses(p)`.
- `calculateTermNeeded(p)` — 10× annual income + liabilities + ₹20 L × dependents − assets, × age multiplier (1.2/1.0/0.8/0.6), floor ₹50 L, round up to ₹10 L.
- `analyseFinances(p)` → `AnalysisResult` (score = 100 − 15·critical − 7·warning − 2·info, issues, flags, teaser, planSteps, securityChecklist, termInsuranceNeeded, realEmergencyFund, totalAssets, totalLiabilities, netWorth).
- Internal: `n`, `medicalEmergencyTargetLiquid` (metro ₹3 L / tier2 ₹2.5 L / tier3 ₹2 L, +₹50 k at age ≥ 45, +₹50 k for kids), `fmt`, `issuesToFlags`, `goalLabel`, `buildIssues`, `buildPlanSteps`.

### 5.2 `lib/priorityEngine.ts` (890 lines — pure TS)
- Types: `PriorityItem`, `DebtItem`, `GoalItem`, `PriorityPlan`.
- `buildPriorityPlan(profile, analysis)` → priorities in order `emergency_fund`, `medical_fund` (₹2 L target), `term_insurance`, `health_insurance`, `start_sip`, `ssy_girl_age_<n>`; ranked debts (explicit outstanding → `calculateOutstanding` amortisation → EMI-multiple fallback); goals (house/car/FIRE); `monthlyIncome`, `monthlySurplus`, `surplusBreakdown`, `scoreToday`, `scoreAfter12Months`, `topAction`, `fdSuggestion`; `allocationPlan` is currently empty.
- Internal: `normalizeStage` (single → bachelor).

### 5.3 `lib/encryption.ts` (116 lines — **Node-only**, `crypto`)
- `EncryptedData {encryptedData, iv, authTag, version}`.
- `encrypt(obj)` — AES-256-GCM, 16-byte IV, key from `ENCRYPTION_KEY` (64 hex).
- `decrypt(encryptedData, iv, authTag)`.
- `hashData(obj)` — SHA-256 first 16 hex.
- `encryptSensitiveFields(submission)` — picks income, expense totals, liquid/investable balances, loan outstanding, insurance covers → `encrypt`.
- Server-only (used by `/api/financial-data`). **Not portable** to RN; mobile must call the API.

### 5.4 `lib/analytics.ts` (52 lines — web-only `window.gtag` / `window.clarity`)
Events: `health_check_started`, `health_check_completed{score}`, `fix_plan_viewed`, `fix_plan_purchased`, `calculator_used{calculator_type}`, `split_group_created`, `split_expense_added`, `split_invite_sent`, `referral_link_copied`, `feedback_submitted{rating}`, `login_completed{method}`, `paywall_viewed`, `payment_started{value,currency}`, `purchase{value,currency,items}`, `tax_calculator_used`, `expense_added{bucket}`, `report_viewed{score}`, `score_shared{platform}`; wrappers `formStarted`, `formCompleted`. Also `lib/gtag.ts`: `cta_click`, `share`, `element_impression`, `scroll_depth`, `tool_open`, `nav_click`, `carousel_select`, `feedback_open`, `feedback_submit`.

### 5.5 `lib/splitBalances.ts` (178 lines — pure TS)
- Types `BalanceMember`, `BalanceExpenseShare`, `BalanceExpense`, `BalanceSettlement`, `NetBalance`, `SimplifiedEdge`.
- `computeNetBalances(members, expenses, settlements)`, `simplifyDebts(net)` (min cash-flow greedy), `computeGroupBalances(...)` → `{net, edges}`, `netFor(email, net)`.

### 5.6 `lib/tracker-categories.ts` (297 lines — pure TS; imports `isCreditCardCharge`)
Buckets (cap %): **needs** "Needs / mandatory expenses" (30) — rent, groceries, vegetables, milk, electricity, water, gas, internet, mobile, school_fees, medicine, doctor, domestic_help, fuel, cab, auto, metro_bus, transport_essential (legacy, hidden), others · **wants** "Wants / non-mandatory expenses" (5) — dining, coffee, snacks, movies, entertainment, shopping, electronics, beauty, gym, travel_leisure, gifts, subscriptions, online_shopping, others · **habits** "Habit expenses" (0) — cigarettes, alcohol, gutka, gambling, paan, others · **loans** "Loans & Credit" (40) — home_loan_emi, car_loan_emi, personal_loan, credit_card, education_loan, bike_loan, bnpl, other_loan, others · **investment** "Investments" (20) — savings_account, sip, ppf, epf, nps, stocks, fd, gold, insurance_premium, rd, crypto, loan_prepayment (excluded from totals), others · **income** (0) — salary, freelance, rental, dividend, bonus, other_income.
Exports: `TrackerIconName`, `TrackerSubcategory`, `TrackerBucket`, `TRACKER_ICON_COLOR`, `TRACKER_CATEGORIES`, `BucketType`, `TRACKER_TOTAL_EXCLUDED_SUBCATEGORIES`, `countsTowardTrackerTotals(txn)`, `pickerSubcategories(bucket)`, `findSubcategory(bucket, id)`.

### 5.7 `lib/analyse-form-schema.ts` (2,503 lines — pure TS + zod)
- Enums/labels: `LIFE_STAGE_*` (4), `CITY_TIER_*` (3), `PRIMARY_GOAL_*` (8), `PREMIUM_FREQUENCY_VALUES` (monthly/yearly), `KID_GENDER_VALUES`, `POST_OFFICE_SCHEME_*` (9), `ADDITIONAL_OBLIGATION_TYPE_VALUES` (11), `UNIFIED_LOAN_TYPE_VALUES` (11).
- Types: `FinancialProfile` (≈ 150 fields — see 1.5 for every UI field, plus legacy granular expenses, lender names, US/Indian stocks, RSU, date fields), `AdditionalObligation`, `AnalyseFormValues`, `LifeStage`, `CityTier`, `PrimaryGoal`, `PremiumFrequency`, `UnifiedLoanType`, `PostOfficeSchemeId`.
- Schemas: `step1Schema` … `step7Schema`, `fullAnalyseSchema` (rules in 1.5).
- Functions: `newAnalyseRowId`, `parseMoneyInput`, `toMonthlyEquivalent`, `lastSubmissionToFormPartial`, `fillDraftGapsFromProfile`, `mergeAnalyseDraftWithProfile`, `financialProfileToFormValues`, `coalesceInsuranceToggles`, `normalizeAnalyseFormValues` (unifiedLoans → scalar first-of-type + `additionalObligations`, de-duplicated), `analyseDefaultValues`.

### 5.8 Other lib files (portability classification)

| File | Pure TS? | Notes |
|---|---|---|
| `amortisation.ts`, `bucket-breakdown.ts`, `universal-buckets.ts`, `speedo-meter-buckets.ts`, `netWorth.ts`, `finkoinAiPlan.ts`, `analysisSnapshotValidation.ts`, `expense-bucket-recommendations.ts`, `profileAssetsPatch.ts` | Yes | Engine helpers |
| `fireCalculator.ts`, `sipGoal.ts`, `postOfficeSchemes.ts`, `calculatorInput.ts`, `taxRegimeComparisonFY2026.ts`, `taxCalculatorHelpers.ts`, `taxMissedDeductionAlerts.ts`, `taxTeachContent.ts` | Yes | Calculator math |
| `splitShares.ts`, `splitInvite.ts`, `splitBalances.ts` | Yes | Split math |
| `trackerSafetyPulse.ts`, `trackerMonthIncome.ts`, `trackerCashAudit.ts`, `trackerObligationSync.ts`, `obligationLearn.ts`, `obligationReminders.ts`, `localDate.ts` | Yes | Tracker logic |
| `formatters.ts`, `formatINR.ts`, `finance.ts`, `optimizer-format.ts`, `aiProviderMessages.ts`, `cn.ts` (clsx) | Yes | Formatting |
| `learnContent.ts`, `learnRichArticles.ts`, `learnSeo.ts`, `blogContent.ts`, `data/*`, `knowledgeBase/*` | Yes (data) | `learnArticleFaqs.ts` imports a React component (not portable as-is) |
| `trackerCreditCards.ts` | Mostly | Uses `localStorage` + `@/lib/supabase`; mobile copy already patched |
| `financialOptimizer.ts` | Yes | Dev logs only |
| `userAnalyseSnapshot.ts`, `userPolicies.ts`, `syncProfileAssets.ts`, `trackerProfileIncome.ts`, `referralRewards.ts`, `payment.ts`, `cache.ts`, `aiService.ts`, `auth.ts`, `authSession.ts` | Supabase/storage-bound | Port with an RN storage/client swap |
| `supabase.ts`, `supabaseClient.ts`, `supabaseServer.ts`, `apiGuard.ts`, `rag/retriever.ts`, `webPush.ts`, `splitExpenseNotify.ts`, `encryption.ts` | No | Browser SSR / server-only |
| `analytics.ts`, `analyticsContext.ts`, `gtag.ts`, `pwaLaunch.ts`, `bodyScrollLock.ts`, `splitAuthRedirect.ts`, `webPushClient.ts`, `googleFeedbackForm.ts`, `feedbackPrompt.ts`, `seo.ts`, `siteUrl.ts`, `generatePDF.ts` (jsPDF), `exportExcel.ts` (xlsx), `renderBlogBody.tsx` (next/link), `animations.ts` (framer), `kycVerification.ts`, `subscriptionBypass.ts` | No / web | DOM or web SDK |

---

## 6. Supabase tables referenced by app code

`users`, `gamification`, `fk_transactions`, `leaderboard_view` (view), `referrals`, `user_stats`, `user_analysis`, `user_analyse_snapshots`, `user_financial_data`, `expense_transactions`, `tracker_consent`, `user_credit_cards`, `financial_obligations`, `obligation_checklist`, `user_policies`, `notification_preferences`, `push_subscriptions`, `user_notifications`, `user_tip_history`, `finance_tips`, `feedback`, `app_feedback`, `insurance_clicks`, `split_groups`, `split_group_members`, `split_expenses`, `split_expense_shares`, `split_invitations`, `split_settlements`, `finkoin_knowledge` (RAG); Storage bucket `avatars`. RPCs: `generate_monthly_checklist`, `search_by_keywords`, `get_next_tip_for_user`.

---

## 7. Audit totals

| Metric | Count |
|---|---|
| Requested screens audited | 28. Of these, 8 requested paths don't exist: 5 map to a real route (`/signup` → `/login?mode=signup`, `home-loan` → `home`, `emi-calculator` → `emi`, `emergency-fund` → `emergency`, `fire-number` → `fire`) and 3 have no equivalent (`/tax` ITR auto-fill, `fd-calculator`, `retirement-calculator`) |
| Additional routes audited | 42 (3 auth/tracker, 15 extra calculator ids, 7 account pages, 17 marketing/legal/utility routes) |
| Total route entries | 70 |
| Components documented | 127 component files (all of `components/`). The 12 requested components get full entries; every tracker (11), forms (6), ui (20) and root-level (25) file is in a table; the remaining folders (analyse, split, auth, profile, feedback, finkoin, landing, learn, policies, seo, calculators) are listed in 2.17 |
| Stores documented | 8 (6 requested + `portfolioStore`, `use-app-store`) |
| API route files / handlers | 23 / 31 |
| Lib files classified | 84 |
