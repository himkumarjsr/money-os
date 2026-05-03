---
⚡ HOW TO USE THIS FILE WITH CURSOR:

At the start of any new Cursor conversation paste:
"Read FINKOIN_SYSTEM.md first. 
Use it as complete context for all changes.
Do not break existing functionality.
Check section 27 before making any change."

This file is auto-generated from the codebase.
Update it after every significant change by running
the documentation generation prompt again.
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

# FINKOIN SYSTEM DOCUMENTATION
Last updated: 2026-05-03
Generated from: actual codebase

---

## 1. PRODUCT OVERVIEW

Finkoin is a Next.js web app for Indian personal finance planning, analysis, and guided action.  
It is built for Indian users who want structured budgeting, insurance and debt checks, portfolio/goals tracking, and a personalized AI “fix plan.”  
The core value proposition is: collect profile + money data once, run deterministic finance logic in code, and optionally augment it with RAG-grounded AI explanations.

---

## 2. TECH STACK

| Package | Version | Purpose |
|---------|---------|---------|
| @hookform/resolvers | ^3.9.1 | Zod integration with react-hook-form |
| @supabase/supabase-js | ^2.103.0 | Supabase auth + database client |
| @supabase/ssr | ^0.10.2 | Cookie-aligned browser/server Supabase clients + middleware session refresh |
| clsx | ^2.1.1 | Conditional class names |
| framer-motion | ^11.18.2 | Animations/transitions |
| groq-sdk | ^1.1.2 | Groq API client for AI route |
| jspdf | ^4.2.1 | Client-side PDF report generation |
| next | ^14.2.35 | Framework (App Router) |
| react | ^18.3.1 | UI library |
| react-dom | ^18.3.1 | DOM renderer |
| react-hook-form | ^7.53.2 | Form state/validation flow |
| recharts | ^2.13.3 | Chart rendering |
| xlsx | ^0.18.5 | Excel export utilities |
| zod | ^3.23.8 | Schema validation/types |
| zustand | ^5.0.1 | Client state stores |
| @eslint/eslintrc | ^3.2.0 | ESLint config helpers |
| @types/node | ^20 | TS Node types |
| @types/react | ^18 | TS React types |
| @types/react-dom | ^18 | TS React DOM types |
| eslint | ^9.21.0 | Linting |
| eslint-config-next | ^15.2.4 | Next lint rules |
| postcss | ^8 | CSS processing |
| tailwindcss | ^3.4.1 | Utility CSS |
| typescript | ^5 | Type checking |
| vitest | ^4.1.2 | Unit tests |
| next-pwa | (see package.json) | Service worker + Workbox; installable PWA in production builds |
| sharp | (dev) | Generates `public/icons/` and `public/splash/` assets via `scripts/generate-icons.mjs` and `scripts/generate-splashes.mjs` |

---

## 3. ENVIRONMENT VARIABLES

| Variable | Required | Purpose | Where to get |
|----------|----------|---------|--------------|
| NEXT_PUBLIC_SUPABASE_URL | Yes | Public Supabase URL for browser + server clients | Supabase project settings |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Yes | Public anon key for browser auth/db calls | Supabase project settings |
| SUPABASE_SERVICE_ROLE_KEY | Yes (server features) | Server/admin Supabase operations (`supabaseServer`) | Supabase project settings |
| GROQ_API_KEY | Yes (AI plan) | Groq API key used by `/api/ai/analyse` | Groq console |
| NEXT_PUBLIC_APP_URL | Recommended | App URL used in UI/runtime references | Deployment URL |
| NEXT_PUBLIC_APP_NAME | Optional | Branding name string | Internal config |
| NEXT_PUBLIC_SKIP_PAYMENT | Optional | Payment bypass for dev/test access logic | Internal config |
| NEXT_PUBLIC_ADMIN_EMAIL | Optional | Admin email marker | Internal config |
| RAZORPAY_KEY_ID | Yes (Razorpay API route) | Razorpay order creation ID | Razorpay dashboard |
| RAZORPAY_KEY_SECRET | Yes (Razorpay API route) | Razorpay order creation secret | Razorpay dashboard |
| NEXT_PUBLIC_RAZORPAY_KEY_ID | Yes (client payment UI) | Client-side Razorpay key for checkout | Razorpay dashboard |
| NEXT_PUBLIC_FINKOIN_AGENT_CODE | Optional | Agent code used in policy transfer links | Internal config |
| NEXT_PUBLIC_SITE_URL | Recommended | Metadata/sitemap/robots canonical URL | Deployment URL |
| NEXT_PUBLIC_DEBUG_AI | Optional | AI debug logging in client service | Internal config |
| NEXT_PUBLIC_AI_TIMEOUT_MS | Optional | Client-side AI timeout override | Internal config |

---

## 4. FOLDER STRUCTURE

Complete inventory with one-line purpose per file:

| Path | Purpose |
|---|---|
| `README.md` | Project overview, setup, and known constraints |
| `package.json` | Scripts and dependency manifest |
| `package-lock.json` | NPM lockfile |
| `.gitignore` | Git ignore rules |
| `next-env.d.ts` | Next.js TypeScript ambient types |
| `next.config.mjs` | Next runtime/build configuration |
| `tsconfig.json` | TypeScript compiler settings |
| `tailwind.config.ts` | Tailwind theme/content setup |
| `postcss.config.mjs` | PostCSS plugin setup |
| `eslint.config.mjs` | ESLint configuration |
| `vitest.config.ts` | Vitest configuration |
| `middleware.ts` | Supabase session refresh + protected-route gate |
| `FINKOIN_SYSTEM.md` | This documentation file |
| `.expo/settings.json` | Local editor/tooling settings |
| `public/logo.png` | Public logo asset |
| `public/manifest.json` | Web app manifest (name, icons, shortcuts, display) for PWA install |
| `public/icons/` | PWA / Apple touch icons (`icon-{size}x{size}.png`), generated from logo |
| `public/splash/` | Apple launch images (`apple-splash-*.png`), generated |
| `public/screenshots/` | Manifest store screenshots (e.g. `home.png`) |
| `scripts/generate-icons.mjs` | Resize logo (or fallback) into manifest icon set + optional screenshot |
| `scripts/generate-splashes.mjs` | Generate iOS splash PNGs |
| `public/assets/brand/finkoin-icon-1024.svg` | Brand icon used in metadata |
| `app/layout.tsx` | Root layout + global wrappers/navbar |
| `app/page.tsx` | Landing page |
| `app/globals.css` | Global CSS styles |
| `app/robots.ts` | Robots metadata endpoint |
| `app/sitemap.ts` | Sitemap metadata endpoint |
| `app/analyse/page.tsx` | Analyse route wrapper for onboarding form |
| `app/analyse/result/page.tsx` | Analysis result/paywall flow |
| `app/analyse/fixplan/page.tsx` | Full AI fix-plan page with cache/access gating |
| `app/login/page.tsx` | Email login/signup + Google OAuth entry |
| `app/auth/callback/page.tsx` | OAuth / email-link callback (PKCE code exchange) |
| `app/auth/reset-password/page.tsx` | Request password reset email |
| `app/auth/update-password/page.tsx` | Set new password after recovery link |
| `components/AppInitializer.tsx` | Client gate: Zustand persist rehydrate then `initAuth()` before app shell |
| `app/optimizer/page.tsx` | Optimizer page |
| `app/insurance/page.tsx` | Insurance marketplace placeholder/comparison entry |
| `app/policies/page.tsx` | Policy vault page wrapper |
| `app/profile/page.tsx` | User profile page |
| `app/portfolio/page.tsx` | Portfolio analysis page |
| `app/investments/page.tsx` | Investments placeholder page |
| `app/goals/page.tsx` | Goals placeholder page |
| `app/kyc/page.tsx` | KYC status page |
| `app/refer/page.tsx` | Referral page |
| `app/rewards/page.tsx` | Rewards page |
| `app/leaderboard/page.tsx` | Leaderboard page |
| `app/learn/page.tsx` | Learn hub listing page |
| `app/learn/[id]/page.tsx` | Individual article page |
| `app/calculators/page.tsx` | Calculators index page |
| `app/calculators/layout.tsx` | Calculators layout wrapper |
| `app/calculators/CalculatorsClient.tsx` | Client calculator index rendering |
| `app/calculators/calculator-config.ts` | Calculator metadata config |
| `app/calculators/[id]/page.tsx` | Dynamic calculator page |
| `app/plans/page.tsx` | Subscription plans page (contains TODO Razorpay note) |
| `app/pricing/page.tsx` | Pricing placeholder page |
| `app/privacy/page.tsx` | Redirects to `/legal/privacy` |
| `app/terms/page.tsx` | Redirects to `/legal/terms` |
| `app/legal/privacy/page.tsx` | Privacy Policy (India / DPDP 2023–aligned content) |
| `app/legal/terms/page.tsx` | Terms of Service |
| `app/legal/refund/page.tsx` | Refund Policy (Razorpay / digital goods) |
| `app/legal/disclaimer/page.tsx` | Legal disclaimer page |
| `app/api/ai/analyse/route.ts` | AI analysis API route |
| `app/api/razorpay/checkout-config/route.ts` | Razorpay Key ID for Standard Checkout (server → frontend) |
| `app/api/razorpay/create-order/route.ts` | Razorpay order API route |
| `app/api/razorpay/verify-payment/route.ts` | Razorpay payment signature verification + pro tier |
| `components/global-navbar.tsx` | Main header/navbar + profile dropdown (backdrop, scroll lock) |
| `components/auth/ProtectedGate.tsx` | Client gate: wait **`hasInitialized`** then enforce **`isLoggedIn`** |
| `components/ReferralCapture.tsx` | Captures **`?ref=`** into **`sessionStorage`** for post-login attribution |
| `lib/referralRewards.ts` | Applies pending referral + FK bumps after successful **`/auth/callback`** |
| `components/AuthSessionSync.tsx` | Sync Supabase session into auth store |
| `components/FinancialStoreAuthSync.tsx` | Rehydrate financial store on auth user switch |
| `components/ScrollToTopOnRouteChange.tsx` | Scroll reset on route change |
| `components/RenewalReminderBanner.tsx` | Renewal reminder banner |
| `components/analyse/analyse-result-error-boundary.tsx` | Result page error boundary |
| `components/analyse/paywall-modal.tsx` | Unlock confirmation modal for fix-plan access |
| `components/forms/analyse-onboarding-form.tsx` | Core 7-step intake form logic/UI |
| `components/forms/onboarding-wizard.tsx` | Onboarding wizard component |
| `components/forms/onboarding-step-basics.tsx` | Onboarding basics step |
| `components/forms/onboarding-step-goals.tsx` | Onboarding goals step |
| `components/forms/onboarding-step-complete.tsx` | Onboarding completion step |
| `components/finkoin/finkoin-ai-plan-view.tsx` | Render AI plan sections |
| `components/finkoin/optimizer-full-sections.tsx` | Full optimizer section components |
| `components/finkoin/MonthlyAllocationPieChart.tsx` | Monthly allocation pie chart |
| `components/policies/PolicyVaultClient.tsx` | Policy CRUD, renewal, transfer workflows |
| `components/learn/learn-hub.tsx` | Learn hub UI |
| `components/learn/article-tracker.tsx` | Tracks article reads and rewards |
| `components/learn/article-share.tsx` | Article share helper |
| `components/learn/share-button.tsx` | Share button UI |
| `components/landing/Footer.tsx` | Landing footer |
| `components/landing/FeatureCardsCarousel.tsx` | Landing feature carousel |
| `components/ui/button.tsx` | Button primitives |
| `components/ui/MoneyInput.tsx` | Currency input with Indian formatting |
| `components/ui/NumberInput.tsx` | Reusable number input matching MoneyInput style with optional suffix |
| `components/ui/SpeedoMeter.tsx` | Multi-gauge speedometer component |
| `components/ui/BottomSheet.tsx` | Bottom sheet UI |
| `components/ui/Toast.tsx` | Toast UI |
| `components/ui/LoginSheet.tsx` | Login bottom sheet (optional; primary auth is **`/login`**) |
| `components/ui/brand-logo.tsx` | Brand logo UI |
| `components/ui/ScrollSection.tsx` | Scroll section wrapper |
| `components/ui/AnimateOnScroll.tsx` | Scroll animation wrapper |
| `components/ui/SectionToggle.tsx` | Toggleable section wrapper |
| `components/ui/ChipSelector.tsx` | Chip selector UI |
| `components/ui/GoalCard.tsx` | Goal card UI |
| `components/calculators/calculator-ui.tsx` | Shared calculator UI primitives |
| `components/calculators/lazy-calculators.tsx` | Lazy-loaded calculator map |
| `components/calculators/SIPCalculator.tsx` | SIP calculator |
| `components/calculators/EMICalculator.tsx` | EMI calculator |
| `components/calculators/HomeLoanCalculator.tsx` | Home loan calculator |
| `components/calculators/CarLoanCalculator.tsx` | Car loan calculator |
| `components/calculators/RentVsBuyCalculator.tsx` | Rent vs buy calculator |
| `components/calculators/RentVsOwnCarCalculator.tsx` | Rent vs own car calculator |
| `components/calculators/WhenToBuyCarCalculator.tsx` | Car purchase timing calculator |
| `components/calculators/PostOfficeCalculator.tsx` | Post-office scheme calculator |
| `components/calculators/PPFCalculator.tsx` | PPF calculator |
| `components/calculators/NSCCalculator.tsx` | NSC calculator |
| `components/calculators/SWPCalculator.tsx` | SWP calculator |
| `components/calculators/EmergencyFundCalculator.tsx` | Emergency fund calculator |
| `components/calculators/TaxRegimeCalculator.tsx` | Old vs new regime comparison UI (toggles, autosave `finkoin_tax_calculator`, live summary) |
| `components/calculators/ToggleSection.tsx` | Expand/collapse income/deduction section shell with pill toggle |
| `lib/taxCalculatorHelpers.ts` | Illustrative gratuity / leave / LTA / rental / business / pension / RSU helpers for tax UI |
| `lib/taxRegimeComparisonFY2026.ts` | Pure tax comparison helpers (slabs, HRA exemption, 80GG illustrative, surcharge, cess, 87A model) |
| `lib/taxMissedDeductionAlerts.ts` | Plain-language “missed deduction” nudges for tax regime calculator |
| `components/calculators/compound-interest-calculator.tsx` | Compound interest calculator |
| `components/calculators/spending-trend-chart.tsx` | Spending chart component |
| `lib/analyse-form-schema.ts` | Form schema, normalization, shared model types |
| `lib/analyse-form-schema.test.ts` | Schema/unit tests |
| `lib/financialEngine.ts` | Deterministic analysis engine |
| `lib/financialEngine.test.ts` | Financial engine tests |
| `lib/priorityEngine.ts` | Priority-plan engine for fix plan |
| `lib/universal-buckets.ts` | Bucket caps/actuals/status logic |
| `lib/bucket-breakdown.ts` | Breakdown helpers for bucket display |
| `lib/speedo-meter-buckets.ts` | Speedometer input-builder helpers |
| `lib/financialOptimizer.ts` | Optimizer logic |
| `lib/optimizer-format.ts` | Optimizer formatting helpers |
| `lib/finkoinAiPlan.ts` | AI plan type schema/validation helpers |
| `lib/aiService.ts` | Client AI orchestration |
| `lib/aiProviderMessages.ts` | AI/provider message helpers |
| `lib/cache.ts` | Profile hash + local/supabase AI cache |
| `lib/generatePDF.ts` | Multi-page optimizer/fix-plan PDF report generator |
| `lib/payment.ts` | Access check + FK redemption logic |
| `lib/auth.ts` | Auth helper methods |
| `lib/supabase.ts` | Browser `createBrowserClient` singleton (`getSupabase`) + lazy `supabase` proxy |
| `lib/supabaseClient.ts` | Re-exports browser helpers |
| `lib/supabaseServer.ts` | `createSupabaseServerClient()` (cookies) + lazy service-role admin proxy |
| `lib/userAnalyseSnapshot.ts` | Snapshot fetch/upsert helpers |
| `lib/userPolicies.ts` | Policy types and Supabase operations |
| `lib/kycVerification.ts` | PAN verification mock logic |
| `lib/finance.ts` | Financial formatting/math helpers |
| `lib/formatters.ts` | Indian number/string format helpers |
| `lib/formatINR.ts` | INR formatting helper |
| `lib/exportExcel.ts` | Export utilities |
| `lib/netWorth.ts` | Net-worth computation helpers |
| `lib/subscriptionBypass.ts` | Subscription bypass checks |
| `lib/analysisSnapshotValidation.ts` | Validation for persisted analysis snapshots |
| `lib/amortisation.ts` | Loan amortisation helpers |
| `lib/animations.ts` | Animation variants |
| `lib/cn.ts` | Classname utility |
| `lib/expense-bucket-recommendations.ts` | Bucket recommendation text |
| `lib/learnContent.ts` | Learn article content metadata |
| `lib/knowledgeBase/index.ts` | Local KB entrypoint |
| `lib/knowledgeBase/entries.ts` | Local KB entries |
| `lib/knowledgeBase/retriever.ts` | Local KB retrieval logic |
| `lib/rag/retriever.ts` | Supabase RAG retrieval logic |
| `store/authStore.ts` | Auth Zustand store |
| `store/financialStore.ts` | Financial Zustand store |
| `store/gamificationStore.ts` | Gamification Zustand store |
| `store/portfolioStore.ts` | Portfolio Zustand store |
| `store/use-app-store.ts` | App onboarding store |
| `store/use-financial-store.ts` | Legacy financial store alias/compat |
| `supabase/migrations/001_initial.sql` | Initial DB schema/migrations |
| `supabase/migrations/002_user_analyse_snapshots.sql` | Snapshot table migration |
| `supabase/migrations/003_user_policies.sql` | User policy schema migration |
| `supabase/migrations/003_complete_setup.sql` | Complete setup + RAG + policies |
| `supabase/migrations/004_user_policies_add_status.sql` | Adds policy status column |
| `supabase/migrations/005_fix_snapshots.sql` | Creates snapshots/analysis tables + RLS |

---

## 5. DATABASE SCHEMA

### Table: users
Purpose: App-level user profile extending Supabase auth user.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK, references `auth.users(id)` |
| name | text | Display name |
| phone | text | Phone number |
| email | text | Email |
| is_admin | boolean | Admin flag |
| referral_code | text | Unique referral code |
| referred_by | text | Referrer code |
| subscription_tier | text | free/pro/promax |
| subscription_expiry | timestamptz | Subscription end |
| fk_balance | integer | FK token balance |
| created_at | timestamptz | Created time |
| updated_at | timestamptz | Updated time |

RLS: `users_own` (auth.uid() == id)  
Trigger: populated by `handle_new_user()` on signup.

Trigger details (`handle_new_user()`):
- Creates `users`, `gamification`, and `user_stats` rows for each new auth signup.
- Seeds initial FK balance at `50`.

### Table: user_analysis
Purpose: Stores submitted profile, deterministic analysis output, and cached AI plan.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | Unique per user, references auth.users |
| profile_hash | text | Hash for cache invalidation |
| profile | jsonb | Full profile payload |
| analysis_result | jsonb | Engine output |
| ai_fix_plan | jsonb | AI plan payload |
| projection | jsonb | Optional projection |
| ai_generated_at | timestamptz | Last AI generation time |
| last_step_completed | integer | Intake completion marker |
| updated_at | timestamptz | Updated time |
| created_at | timestamptz | Created time |

RLS: `analysis_own` (auth.uid() == user_id)  
Trigger: none.

Note: `profile`/`analysis_result`/`ai_fix_plan` are `jsonb`, so new fields like `unifiedLoans[]` and mapped `additionalObligations[]` persist without column changes.

### Table: user_analyse_snapshots
Purpose: Persisted analyse snapshots from client for restore/hydration.

| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid | PK, references auth.users |
| payload | jsonb | Snapshot blob |
| updated_at | timestamptz | Updated timestamp |

RLS: own-row policies (from migrations).

Note: `payload` is `jsonb` and stores the full snapshot blob; loan schema changes are backward compatible without table column changes.

### Table: user_policies
Purpose: Policy vault (health/term/car/bike/life/etc), renewals, transfer status.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | Owner |
| policy_type | text | Type |
| policy_name | text | Product/provider |
| insurer | text | Insurer name |
| premium_amount | numeric | Premium |
| premium_frequency | text | monthly/yearly |
| cover_amount | numeric | Sum insured/assured |
| renewal_date | date | Renewal date |
| status | text | active/lapsed/renewed/transferred |
| ... | ... | Additional transfer/metadata columns per migrations |

RLS: own-row access policies.

### Table: finkoin_knowledge
Purpose: RAG knowledge base rows used by keyword retrieval.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| category | text | High-level category |
| subcategory | text | Subcategory |
| title | text | Rule title |
| content | text | Rule content |
| keywords | text[] | Search keywords |
| applies_when | text | Applicability condition |
| priority_context | text[] | Priority tags |
| embedding | vector(384) | Embedding column |
| is_active | boolean | Active flag |
| last_updated | date | Last update date |
| source | text | Source note |
| created_at | timestamptz | Created time |

RLS: `knowledge_read` (public select true).

### Table: gamification
Purpose: FK balances, badges, streak tracking.

| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid | PK, owner |
| fk_balance | integer | FK tokens |
| badges | jsonb | Badge list |
| streak_days | integer | Login streak |
| last_login | date | Last login |
| total_earned | integer | Aggregate earned tokens |
| created_at | timestamptz | Created time |

RLS: `gamification_own`.

### Table: financial_profiles
Purpose: Legacy profile table.

Status:
- Legacy table — deprecated.
- Use `user_analysis` instead.
- Will be dropped after verification.

### Table: insurance_clicks
Purpose: Insurance click and revenue tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | User |
| insurance_type | text | Type clicked |
| insurer_name | text | Insurer |
| recommended_cover | numeric | Recommended cover |
| monthly_premium | numeric | Premium |
| user_age | integer | Age at click |
| city | text | City |
| fk_tokens_used | integer | FK spent |
| clicked_at | timestamptz | Click timestamp |

RLS: `clicks_own` insert check (auth.uid() == user_id).

### Extra tables from initial schema
- `referrals`: referral tracking.
- `user_stats`: per-user stats/metrics.

---

## 6. DATA MODELS

### FinancialProfile
Location: `lib/analyse-form-schema.ts`

Core fields include life stage, demographics, income, loan obligations, monthly expenses, insurance cover/premium fields, assets, savings, investment contributions, and goals.

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| lifeStage | `"bachelor" \| "married" \| "kids" \| "senior"` | User life stage | `"bachelor"` |
| selfAge | number | User age | 0 |
| cityTier | `"metro" \| "tier2" \| "tier3"` | City category | `"metro"` |
| monthlySalary | number | Main monthly take-home salary | 0 |
| spouseIncome | number? | Spouse monthly income | 0 |
| otherIncome | number? | Other monthly income | 0 |
| homeLoanEMI/carLoanEMI/bikeEMI/personalLoanEMI/... | number? | Loan EMIs | 0 |
| vegetables/grocery/electricity/... | number | Expense subfields | 0 |
| hasHealthInsurance/hasTermInsurance | boolean | Insurance toggles | false |
| healthInsuranceSumInsured/termInsuranceSumAssured | number? | Cover values | 0 |
| *PremiumInput/*PremiumFrequency/*PremiumMonthly | number/text | Premium input + normalized monthly | varies |
| savingsAccountBalance/fdValue/liquidMFValue | number | Liquid assets | 0 |
| mfValue/ppfBalance/npsBalance/epfBalance | number? | Investments and retirement balances | 0 |
| monthlySIP/monthlyRD/monthlyPPFContribution/... | number | Ongoing investments | 0 |
| primaryGoal | string | Goal key | `"grow_wealth"` |

### AnalysisResult
Location: `lib/financialEngine.ts`

| Field | Type | Description |
|---|---|---|
| overallScore | number | Computed health score from issue severities |
| criticalIssueCount | number | Count of critical issues |
| warningIssueCount | number | Count of warning issues |
| scores | object | savingsRate, debtRatio, untrackedCash, emergencyFundGap |
| flags | AnalysisFlag[] | Highlight flags |
| issues | AnalysisIssue[] | Detailed issues with severities |
| teaser | string | Headline message |
| planSteps | string[] | Action steps |
| securityChecklist | SecurityItem[] | Safety checklist rows |

### PriorityPlan
Location: `lib/priorityEngine.ts`

| Field | Type | Description |
|---|---|---|
| priorities | PriorityItem[] | Ranked items |
| debts | DebtItem[] | Debt list |
| goals | GoalItem[] | Goal list |
| monthlyIncome | number | Calculated total income |
| monthlySurplus | number | Calculated surplus |
| allocationPlan | array | Suggested monthly allocation |
| scoreToday | number | Current score |
| scoreAfter12Months | number | Projected score |
| topAction | string | Immediate top action |

### User
Location: `store/authStore.ts`

| Field | Type | Description |
|---|---|---|
| id | string | Auth user ID |
| name/email/phone | string \| null | Basic identity |
| subscriptionTier | free/pro/promax | Plan tier |
| isAdmin | boolean? | Admin marker |
| fkBalance | number? | FK token balance |

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
- `warning`: actual <= cap * 1.15
- `critical`: actual > cap * 1.15

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
1. annual income = monthly total income * 12  
2. base = annual income * 10  
3. liabilities = homeLoanOutstanding + carLoanOutstanding  
4. existing assets = mf + indianStocks + ppf + epf + fd  
5. dependent buffer = dependentCount * 20,00,000  
6. age multiplier: <30 => 1.2, <40 => 1.0, <50 => 0.8, >=50 => 0.6  
7. term needed = max(50,00,000, (base + liabilities + dependentBuffer - existingAssets) * ageMultiplier)  
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
Auth required: No (expects profile+analysis payload)

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
Auth required: No

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

| Data | Where | When saved | When cleared |
|------|-------|-----------|--------------|
| Form/profile draft | Zustand persisted localStorage | During form updates | reset/clear actions |
| Tax regime calculator inputs | localStorage `finkoin_tax_calculator` | On any field/toggle change (TaxRegimeCalculator) | Reset button or manual clear |
| Analysis result | Zustand + optional Supabase snapshot | On submit/runAnalysis | reset/clear |
| AI fix plan | localStorage (`finkoin_ai_cache`) + optional `user_analysis.ai_fix_plan` | After AI call in fixplan page | hash change / expiry / clearCache |
| Cross-device profile | user_analyse_snapshots (Supabase) | After every form submit (if logged in) | Never auto-cleared — user must reset |

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

2. **Middleware** (`middleware.ts`): **`createServerClient`** from `@supabase/ssr` reads request cookies, runs **`auth.getUser()`** (validates JWT + refreshes / rotates refresh token when needed), writes updated cookies on the response via **`setAll`** (including forwarded **`headers`** per `@supabase/ssr`). If env vars are missing, middleware no-ops. Redirects to login **merge cookies** from the refreshed response onto the redirect so rotated tokens are not dropped.

3. **Protected routes** (middleware): `/analyse/fixplan`, `/profile`, `/policies`, `/rewards`, `/goals`, `/investments`, `/leaderboard`, `/refer`, `/settings` — unauthenticated users are redirected to **`/login?redirect=<path>`**. Client pages also wrap with **`components/auth/ProtectedGate.tsx`**, which waits for **`hasInitialized`** before treating **`isLoggedIn`** as authoritative (avoids false redirects while auth hydrates).

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

### `/analyse` (7-step form)
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
6. Navigate to `/analyse/result`

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
- `lib/kycVerification.ts`: PAN verification is mock logic
- `app/insurance/page.tsx`: full comparison engine not complete

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

| Code field | Label shown in UI | Type | Required | Stored in `FinancialProfile` |
|---|---|---|---|---|
| `lifeStage` | Life stage | card select | Required | `lifeStage` |
| `selfAge` | Your age | number input | Required | `selfAge` |
| `spouseAge` | Spouse age | number input | Required for `married`/`kids`; hidden otherwise | `spouseAge` |
| `numberOfKids` | Number of kids | number input | Required when `lifeStage = kids` | `numberOfKids` |
| `kidsAges[i]` | Kid N age | number input | Required for each kid when `lifeStage = kids` | `kidsAges[]` |
| `kidsGenders[i]` | Kid N gender | card/radio select | Required for each kid when `lifeStage = kids` | `kidsGenders[]` |
| `cityTier` | City tier | select | Required | `cityTier` |

### Step 2 — Income

| Code field | Label shown in UI | Type | Required | Stored in `FinancialProfile` |
|---|---|---|---|---|
| `monthlySalary` | Monthly take-home salary | `MoneyInput` | Required (>0) | `monthlySalary` |
| `spouseIncome` | Spouse monthly income | `MoneyInput` | Optional (hidden for bachelor) | `spouseIncome` |
| `otherIncome` | Other income — freelance, rental, business | `MoneyInput` | Optional | `otherIncome` |

### Step 3 — Loans/Obligations

| Code field | Label shown in UI | Type | Required | Stored in `FinancialProfile` |
|---|---|---|---|---|
| `rentAmount` | Rent you pay monthly | `MoneyInput` | Optional | `rentAmount` |
| `rentMaintenanceMonthly` | Rent flat maintenance (society / maintenance) | `MoneyInput` | Optional (shown only if rent > 0) | `rentMaintenanceMonthly` |
| `homeLoanEMI` | Home loan EMI (if any) | `MoneyInput` | Optional | `homeLoanEMI` |
| `secondPropertyEMI` | Second property loan EMI (if any) | `MoneyInput` | Optional | `secondPropertyEMI` |
| `carLoanEMI` | Car loan EMI | `MoneyInput` | Optional | `carLoanEMI` |
| `bikeEMI` | Two-wheeler loan EMI | `MoneyInput` | Optional | `bikeEMI` |
| `personalLoanEMI` | Personal loan EMI | `MoneyInput` | Optional | `personalLoanEMI` |
| `personalLoanOutstanding` | Personal loan outstanding (optional) | `MoneyInput` | Optional | `personalLoanOutstanding` |
| `personalLoanRate` | Personal loan interest rate % | number input | Optional | `personalLoanRate` |
| `personalLoanRemainingMonths` | Personal loan remaining months | number input | Optional | `personalLoanRemainingMonths` |
| `homeLoanRate` | Home loan interest rate % | number input | Optional | `homeLoanRate` |
| `homeLoanRemainingMonths` | Home loan remaining months | number input | Optional | `homeLoanRemainingMonths` |
| `carLoanRate` | Car loan interest rate % | number input | Optional | `carLoanRate` |
| `carLoanRemainingMonths` | Car loan remaining months | number input | Optional | `carLoanRemainingMonths` |
| `bikeLoanRate` | Bike loan interest rate % | number input | Optional | `bikeLoanRate` |
| `bikeLoanRemainingMonths` | Bike loan remaining months | number input | Optional | `bikeLoanRemainingMonths` |
| `creditCardBillMonthly` | Credit card — typical monthly payment | `MoneyInput` | Optional | `creditCardBillMonthly` |
| `unifiedLoans[i].loanType` | Loan type | select | Required per row | `unifiedLoans[].loanType` |
| `unifiedLoans[i].lenderName` | Lender name | text input | Optional | `unifiedLoans[].lenderName` |
| `unifiedLoans[i].monthlyEMI` | Monthly EMI | `MoneyInput` | Required per row | `unifiedLoans[].monthlyEMI` |
| `unifiedLoans[i].outstandingAmount` | Outstanding amount | `MoneyInput` | Optional | `unifiedLoans[].outstandingAmount` |
| `unifiedLoans[i].interestRate` | Interest rate % | number input | Optional | `unifiedLoans[].interestRate` |
| `unifiedLoans[i].remainingMonths` | Remaining months | number input | Optional | `unifiedLoans[].remainingMonths` |
| `unifiedLoans[i].odLimit` | OD limit | `MoneyInput` | Optional (OD rows only) | `unifiedLoans[].odLimit` |
| `unifiedLoans[i].odUsed` | OD used | `MoneyInput` | Optional (OD rows only) | `unifiedLoans[].odUsed` |
| `unifiedLoans[i].odInterestOnlyYears` | OD interest-only years | number input | Optional (OD rows only) | `unifiedLoans[].odInterestOnlyYears` |
| `additionalObligations[i].type` | Obligation type | select | Required if row added | `additionalObligations[].type` |
| `additionalObligations[i].lenderName` | Lender name | text input | Optional | `additionalObligations[].lenderName` |
| `additionalObligations[i].monthlyAmount` | Monthly payment amount | `MoneyInput` | Required positive if row added | `additionalObligations[].monthlyAmount` |
| `odLimit` | OD limit | `MoneyInput` | Optional (shown when obligation type = Overdraft) | `odLimit` |
| `odUsed` | Amount currently used in OD | `MoneyInput` | Optional (shown when obligation type = Overdraft) | `odUsed` |
| `odInterestRate` | OD interest rate % | number input | Optional (shown when obligation type = Overdraft) | `odInterestRate` |
| `odInterestOnlyYears` | OD interest-only period (years) | number input | Optional (shown when obligation type = Overdraft) | `odInterestOnlyYears` |
| `odEMIStartYear` | OD EMI start year | number input | Optional (shown when obligation type = Overdraft) | `odEMIStartYear` |

Step 3 UI now uses a single `My Loans` field-array (`unifiedLoans`) for data entry. Legacy scalar loan fields and `additionalObligations` are still kept in schema/model for backward compatibility and downstream engine compatibility.

### Step 4 — Expenses

| Code field | Label shown in UI | Type | Required | Stored in `FinancialProfile` |
|---|---|---|---|---|
| `foodTotal` | Food and daily essentials | `MoneyInput` | Optional | `foodTotal` |
| `transportTotal` | Transport | `MoneyInput` | Optional | `transportTotal` |
| `utilityTotal` | Utilities | `MoneyInput` | Optional | `utilityTotal` |
| `domesticHelpTotal` | Domestic help | `MoneyInput` | Optional | `domesticHelpTotal` |
| `lifestyleTotal` | Lifestyle and personal | `MoneyInput` | Optional | `lifestyleTotal` |
| `kidsSchoolFees` | Kids school fees and tuition | `MoneyInput` | Optional (shown for `kids`) | `kidsSchoolFees` |
| `kidsActivities` | Kids activities — sports, hobby classes | `MoneyInput` | Optional (shown for `kids`) | `kidsActivities` |
| `parentsSupport` | Parents / in-laws support | `MoneyInput` | Optional | `parentsSupport` |
| `parentsCity` | Where do your parents reside? | select | Optional (shown when parentsSupport > 0) | `parentsCity` |
| `parentsHealthInsuranceSumInsured` | Sum insured (₹) | `MoneyInput` + toggle gate | Optional | `parentsHealthInsuranceSumInsured` |
| `parentsEmergencyCash` | Liquid cash set aside specifically for parents medical needs (₹) | `MoneyInput` | Optional (shown when parentsSupport > 0) | `parentsEmergencyCash` |

Legacy granular expense fields (`vegetables`, `grocery`, `medicine`, `fuel`, `cabMetro`, `electricity`, `internet`, `gas`, `water`, `houseHelpMonthly`, `cookHelpMonthly`, `entertainment`, `shopping`, `personalCare`) are kept in schema/normalizer for backward compatibility but are no longer primary UI inputs.

### Step 5 — Insurance

| Code field | Label shown in UI | Type | Required | Stored in `FinancialProfile` |
|---|---|---|---|---|
| `hasHealthInsurance` | Do you have health insurance? | toggle | Optional | `hasHealthInsurance` |
| `healthInsuranceSumInsured` | Sum insured | `MoneyInput` | Required if `hasHealthInsurance = true` | `healthInsuranceSumInsured` |
| `healthInsurancePremiumInput` | Premium amount | `MoneyInput` | Required if `hasHealthInsurance = true` | `healthInsurancePremiumInput` |
| `healthInsurancePremiumFrequency` | Monthly / Yearly | toggle | Optional | `healthInsurancePremiumFrequency` |
| `hasTermInsurance` | Do you have term insurance? | toggle | Optional | `hasTermInsurance` |
| `termInsuranceSumAssured` | Sum assured | `MoneyInput` | Required if `hasTermInsurance = true` | `termInsuranceSumAssured` |
| `termInsurancePremiumInput` | Premium amount | `MoneyInput` | Required if `hasTermInsurance = true` | `termInsurancePremiumInput` |
| `termInsurancePremiumFrequency` | Monthly / Yearly | toggle | Optional | `termInsurancePremiumFrequency` |
| `termInsurancePremiumTillYear` | Premium paying till year | number input | Optional | `termInsurancePremiumTillYear` |
| `carInsurancePremiumInput` | Car insurance premium | `MoneyInput` | Optional | `carInsurancePremiumInput` |
| `carInsurancePremiumFrequency` | Monthly / Yearly | toggle | Optional | `carInsurancePremiumFrequency` |
| `bikeInsurancePremiumInput` | Two-wheeler insurance premium | `MoneyInput` | Optional | `bikeInsurancePremiumInput` |
| `bikeInsurancePremiumFrequency` | Monthly / Yearly | toggle | Optional | `bikeInsurancePremiumFrequency` |
| `hasOtherInsurance` | Any other insurance premium? | toggle | Optional | `hasOtherInsurance` |
| `otherInsurancePremiums[i].policyName` | Policy name | text input | Optional | `otherInsurancePremiums[].policyName` |
| `otherInsurancePremiums[i].premiumAmount` | Premium amount | `MoneyInput` | Required per row when `hasOtherInsurance = true` | `otherInsurancePremiums[].premiumAmount` |
| `otherInsurancePremiums[i].frequency` | Monthly / Yearly | toggle | Optional | `otherInsurancePremiums[].frequency` |
| `lifeInsuranceMaturityAmount` | Maturity amount (if any) | `MoneyInput` | Optional (shown with other insurance section) | `lifeInsuranceMaturityAmount` |
| `lifeInsuranceMaturityYear` | Maturity year (if any) | number input | Optional (shown with other insurance section) | `lifeInsuranceMaturityYear` |

### Step 6 — Assets/Savings

| Code field | Label shown in UI | Type | Required | Stored in `FinancialProfile` |
|---|---|---|---|---|
| `fdValue` | Fixed Deposit total value | `MoneyInput` | Optional | `fdValue` |
| `fdRate` | FD interest rate % | number input | Optional | `fdRate` |
| `fdTenureYears` | FD tenure in years | number input | Optional | `fdTenureYears` |
| `fdMaturityYear` | FD maturity year | number input | Optional | `fdMaturityYear` |
| `savingsAccountBalance` | Savings account (instantly available) | `MoneyInput` | Optional | `savingsAccountBalance` |
| `liquidMFValue` | Liquid mutual funds | `MoneyInput` | Optional | `liquidMFValue` |
| `otherLiquidSavings` | Other liquid savings | `MoneyInput` | Optional | `otherLiquidSavings` |
| `bereavementFund` | Amount set aside (savings / FD you can break quickly) | `MoneyInput` | Optional | `bereavementFund` |
| `totalEquityValue` | Total equity investments (MF + stocks + RSU/ESOP) | `MoneyInput` | Optional | `totalEquityValue` |
| `ppfBalance` | PPF current balance | `MoneyInput` | Optional | `ppfBalance` |
| `npsBalance` | NPS current balance | `MoneyInput` | Optional | `npsBalance` |
| `epfBalance` | EPF / PF current balance | `MoneyInput` | Optional | `epfBalance` |
| `ownsHome` | Do you own a home? | toggle | Optional | `ownsHome` |
| `homeMarketValue` | Current market value | `MoneyInput` | Required if `ownsHome = true` | `homeMarketValue` |
| `homeLoanOutstanding` | Outstanding home loan | `MoneyInput` | Required if `ownsHome = true` | `homeLoanOutstanding` |
| `ownsCar` | Do you own a car? | toggle | Optional | `ownsCar` |
| `carMarketValue` | Current market value | `MoneyInput` | Required if `ownsCar = true` | `carMarketValue` |
| `carLoanOutstanding` | Outstanding car loan | `MoneyInput` | Required if `ownsCar = true` | `carLoanOutstanding` |
| `goldValue` | Gold and jewellery estimated value | `MoneyInput` | Optional | `goldValue` |
| `otherAssets` | Any other property or asset | `MoneyInput` | Optional | `otherAssets` |
| `otherAssetLabel` | What is the other asset? | text input | Optional | `otherAssetLabel` |
| `monthlySIP` | Monthly SIP amount currently running | `MoneyInput` | Optional | `monthlySIP` |
| `monthlyRD` | Monthly RD amount currently running | `MoneyInput` | Optional | `monthlyRD` |
| `monthlyPPFContribution` | Monthly PPF contribution | `MoneyInput` | Optional | `monthlyPPFContribution` |
| `monthlyNPSContribution` | Monthly NPS contribution | `MoneyInput` | Optional | `monthlyNPSContribution` |
| `monthlyEPFContribution` | Monthly EPF contribution — employee side only | `MoneyInput` | Optional | `monthlyEPFContribution` |
| `ssy` | Monthly SSY deposit (girl child under 10) | `MoneyInput` | Optional (shown only when eligible girl child exists) | `ssy` |
| `investsInNsc` | I hold NSC (National Savings Certificate) | checkbox toggle | Optional | `investsInNsc` |
| `nscDepositAmount` | NSC amount (one-time / current holding) | `MoneyInput` | Optional (shown when NSC checked) | `nscDepositAmount` |
| `nscMaturityYear` | NSC maturity year | number input | Optional (shown when NSC checked) | `nscMaturityYear` |
| `customInvestments[i].label` | Custom investment name | text input | Optional (max 5 rows) | `customInvestments[].label` |
| `customInvestments[i].currentValue` | Custom investment current value | `MoneyInput` | Optional (max 5 rows) | `customInvestments[].currentValue` |
| `customInvestments[i].monthlyContribution` | Custom investment monthly contribution | `MoneyInput` | Optional (max 5 rows) | `customInvestments[].monthlyContribution` |
| `customInvestments[i].type` | Custom investment type (equity/debt/real_estate/other) | select | Optional (max 5 rows) | `customInvestments[].type` |

### Step 7 — Goals

| Code field | Label shown in UI | Type | Required | Stored in `FinancialProfile` |
|---|---|---|---|---|
| `primaryGoal` | Primary goal | card select | Required | `primaryGoal` |
| `retirementTargetCorpus` | Retirement target corpus | `MoneyInput` | Optional | `retirementTargetCorpus` |
| `retirementAge` | Target retirement age | number input | Optional | `retirementAge` |
| `kidsEducationFundTarget` | Kids education fund target (₹ per child) | `MoneyInput` | Required for `lifeStage = kids` | `kidsEducationFundTarget` |
| `kidsMarriageFundTarget` | Kids marriage fund target (₹ per child) | `MoneyInput` | Optional | `kidsMarriageFundTarget` |
| `emergencyFundTarget` | Emergency fund target | `MoneyInput` | Optional | `emergencyFundTarget` |
| `medicalEmergencyFund` | Medical emergency fund | `MoneyInput` | Optional | `medicalEmergencyFund` |
| `homePurchaseTarget` | Home purchase target | `MoneyInput` | Optional (shown when user pays rent) | `homePurchaseTarget` |
| `homePurchaseYear` | Target year | number input | Optional (shown when user pays rent) | `homePurchaseYear` |
| `carPurchaseTarget` | Car purchase target | `MoneyInput` | Optional (shown when user does not own car) | `carPurchaseTarget` |
| `carPurchaseYear` | Target year | number input | Optional (shown when user does not own car) | `carPurchaseYear` |

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
  "priorityPlan": { },
  "explanations": { },
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
- Groq key: `.env.local` (`GROQ_API_KEY`)
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
- Consent acceptance now persists in localStorage (`finkoin_analyse_consent_v1`); returning users with prior acceptance skip the modal automatically.

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

| Item | Location / behavior |
|------|---------------------|
| Web manifest | `public/manifest.json` |
| Icons | `public/icons/` (`icon-72x72.png` … `icon-512x512.png`; regenerate with `npm run pwa:icons`) |
| Splash screens | `public/splash/` (`apple-splash-*.png`; regenerate with `npm run pwa:splashes`) |
| Service worker | Auto-generated by **next-pwa** into `public/` at build time (`sw.js`, `workbox-*.js`); listed in `.gitignore` — do not commit |
| Offline page | Route **`/offline`** (`app/offline/page.tsx`); used as **`fallbacks.document`** in Workbox |
| Install prompt UI | `components/PWAInstallPrompt.tsx` (mounted from `AppInitializer`) |
| **iOS** | Users install via **Safari → Share → Add to Home Screen** (no programmatic install API) |
| **Android** | Chrome may fire **`beforeinstallprompt`**; the in-app banner uses the deferred prompt when available |

**Local PWA check:** run `npm run build` then `npm run start` (not `npm run dev`), open DevTools → Application → Service Workers / Manifest / Cache Storage.

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
  When saved: On signup, on profile update
  Read by: authStore.initAuth()

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
     + Supabase for 30 days

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

