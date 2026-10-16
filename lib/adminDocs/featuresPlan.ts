import type { DocSection } from "./types";

export const analyseSection: DocSection = {
  id: "health-check",
  title: "Health check (Analyse)",
  group: "Features",
  summary:
    "The 7-step money profile, the 0–100 score, bucket caps and the security checklist.",
  blocks: [
    {
      kind: "p",
      text: "The user fills a 7-step form once. Everything is computed in the browser by deterministic engines, saved to their snapshot, and shown as a free report. No API call is needed to get a score.",
    },
    { kind: "h", text: "Flow" },
    {
      kind: "list",
      ordered: true,
      items: [
        "`/analyse`: login enforced; a user who already has a report (in the store or `user_analyse_snapshots`) goes straight to `/analyse/result`, whose Retake button opens the form at `/analyse?retake=1`. Otherwise the consent modal (`ConsentModal`), optional risk quiz and form.",
        "Form (`components/forms/analyse-onboarding-form.tsx`, React Hook Form + Zod schema `lib/analyse-form-schema.ts`): Personal profile → Income → Fixed obligations (unified loans) → Living expenses → Insurance coverage → Assets and savings → Goals.",
        "Submit → normalise to `FinancialProfile` → `financialStore.setFullAnalysis()` → `analyseFinances(profile)`.",
        "`upsertUserAnalyseSnapshot(userId, { profile, result, submittedAt, version, analysis })` writes `user_analyse_snapshots` (RLS own row). Saving the result to `user_analysis` fires `points_on_analyse` (+20 points, once a week).",
        "Loans entered here are synced to Tracker bills/EMIs (`lib/loanObligationSync.ts`) and policies are offered for import into the policy vault (`lib/analysePolicyImport.ts`).",
        "`/analyse/result`: free report (score, issues, buckets, checklist, net worth, life map, trajectory) with the paywall for the Fix Plan.",
      ],
    },
    { kind: "h", text: "Business rules" },
    {
      kind: "table",
      head: ["Rule", "Value"],
      rows: [
        [
          "Score",
          "`100 − 15 × critical − 7 × warning` issues, clamped 0–100. Every rule is on the Health score page",
        ],
        [
          "Bucket caps (% of income)",
          "By life stage, then adjusted for income band, parents, home loan and age (see Health score). Single / married: Needs 30%, Wants 5%, Insurance 10%, Loans 30%, Investment 25%",
        ],
        ["Bucket status", "good ≤ cap; warning ≤ cap × 1.15; critical above"],
        [
          "Emergency corpus weighting",
          "Savings 100%, liquid MF 95%, FD 70%, other liquid 50%",
        ],
        [
          "Emergency months",
          "Single 6 (9 if supporting parents), married 9, with kids or senior 12; otherwise 6, or 12 from age 50",
        ],
        [
          "Term cover needed",
          "max(₹50L, (10 × annual income + home/car loans + ₹20L × dependants − investments) × age factor), rounded up to ₹10L; age factor 1.2 / 1.0 / 0.8 / 0.6 for <30 / <40 / <50 / 50+",
        ],
        [
          "Term checklist",
          "critical with no term cover; ok at ≥ ₹1Cr or the adequacy floor; else warning",
        ],
        [
          "Insurance reserve",
          "ok with ≥ 12 months of premiums in liquid reserve",
        ],
      ],
    },
    { kind: "h", text: "Data and APIs" },
    {
      kind: "api",
      api: {
        method: "SQL",
        path: "user_analyse_snapshots (upsert, own row)",
        summary: "Latest profile, result and AI plan for cross-device restore.",
        auth: "RLS: `auth.uid() = user_id`",
        request: `{
  "user_id": "uuid",
  "payload": {
    "profile": { "selfAge": 32, "lifeStage": "married_kids", "monthlySalary": 120000, "...": "FinancialProfile" },
    "result": { "overallScore": 64, "issues": [], "buckets": {}, "...": "AnalysisResult" },
    "analysis": { "...": "raw form values" },
    "aiPlan": null,
    "submittedAt": "2026-10-15T08:00:00.000Z",
    "version": "v2"
  },
  "updated_at": "2026-10-15T08:00:00.000Z"
}`,
        callers:
          "`lib/userAnalyseSnapshot.ts` (queued writes per user), `FinancialStoreAuthSync`, `useRestoreAnalyseSnapshot`",
      },
    },
    {
      kind: "api",
      api: {
        method: "GET/POST",
        path: "/api/financial-data",
        summary:
          "Optional AES-256-GCM vault of the raw submission. The snapshot stays the source of truth.",
        auth: "Session (cookie or Bearer)",
        rateLimit: "POST 30/hr, GET 60/hr per user",
        request: `POST { "submission": { "...": "form values" } }`,
        response: `POST 200 { "success": true }
POST 200 { "success": true, "skipped": true, "reason": "encryption_unavailable" }   // no ENCRYPTION_KEY
GET  200 { "data": { "...": "decrypted submission" } }  |  { "data": null }`,
        errors: [
          ["400", "Missing submission"],
          ["401", "Not authenticated"],
          ["429", "Rate limited"],
          ["500", "Save / load failed"],
        ],
      },
    },
  ],
};

export const fixPlanSection: DocSection = {
  id: "fix-plan",
  title: "Fix Plan and AI",
  group: "Features",
  summary:
    "Priority engine, RAG + Groq explanations, per-goal advice, caching, fallback and the PDF.",
  blocks: [
    { kind: "h", text: "Flow" },
    {
      kind: "list",
      ordered: true,
      items: [
        "`/analyse/fixplan` checks `canAccessFixPlan` (Pro tier, `users.is_admin`, `NEXT_PUBLIC_SKIP_PAYMENT`, or a plan already in `user_analysis`).",
        "`hashProfile(profile)` → cached plan in `finkoin_ai_cache` (≤ 30 days) or on the snapshot → render without a call.",
        "Otherwise `POST /api/ai/analyse` with `{ profile, analysis }`.",
        "Server: `buildPriorityPlan` → `fundedGoals` → rate-limit by model calls → `adviseGoals` in parallel → RAG `search_by_keywords` → Groq chat completion (temperature 0.25, max 3000 tokens) → strict JSON.",
        "If Groq or parsing fails the route returns the same shape built from the engine with `isFallback: true`.",
        'Client caches by hash, saves `aiPlan` onto the snapshot, renders priorities, debts, goals and the monthly plan. "Start plan" can create planned investments (Tracker).',
      ],
    },
    {
      kind: "api",
      api: {
        method: "POST",
        path: "/api/ai/analyse",
        summary: "Build the priority plan and get AI explanations for it.",
        auth: "Session. When `AI_PLAN_REQUIRES_PRO=true` (and payments aren't skipped) also requires Pro (`hasProAccess`).",
        rateLimit:
          "40 model calls per user per hour; one report costs 1 + one per funded goal (2–9)",
        request: `{
  "profile":  { "...": "FinancialProfile" },
  "analysis": { "overallScore": 64, "...": "AnalysisResult" }
}`,
        response: `{
  "priorityPlan": {
    "priorities": [{ "id": "emergency_fund", "title": "...", "gap": 240000, "monthlyContribution": 12000, "status": "gap" }],
    "debts": [{ "type": "personal", "outstanding": 300000, "rate": 14, "emi": 9800, "extraEMIRecommended": 3000, "monthsToClearWithExtra": 24 }],
    "goals": [{ "goalId": "kid_education:0", "monthlyAllocated": 8000, "...": "" }],
    "monthlyIncome": 150000, "monthlySurplus": 32000,
    "surplusBreakdown": { "totalIncome": 150000, "needsActual": 52000, "netSurplus": 32000, "...": "" },
    "monthlyPlan": [{ "emergency": 12000, "medical": 4000, "termYearly": 0, "sip": 10000, "extraDebt": 3000 }],
    "scoreToday": 64, "scoreAfter12Months": 81, "topAction": "..."
  },
  "explanations": {
    "greeting": "...", "overallSummary": "...",
    "priorityExplanations": { "emergency_fund": "..." },
    "debtStrategy": "...", "thisWeekAction": "...", "in12Months": "...",
    "encouragement": "...", "disclaimer": "Educational only. Not SEBI registered investment advice.",
    "goalPlans": [], "goalAdvice": []
  },
  "knowledgeUsed": ["Emergency fund benchmarks", "..."],
  "isFallback": true   // only when the engine fallback was used
}`,
        errors: [
          ["400", "Missing data / could not build plan"],
          ["401", "Not authenticated"],
          ["402", "Fix Plan needs Pro"],
          ["429", "Hourly AI budget used"],
          ["503", "AI not configured (no GROQ_API_KEY)"],
          ["500", "Unexpected error with no plan"],
        ],
        callers:
          "`lib/aiService.ts` from the Fix Plan page; native app with Bearer",
      },
    },
    {
      kind: "api",
      api: {
        method: "POST",
        path: "/api/analyse/pdf",
        summary:
          "Server-rendered Fix Plan PDF (web download and native share sheet).",
        auth: "Session (cookie or Bearer)",
        rateLimit: "20/hr per user; body ≤ 1 MB",
        request: `{
  "profile": { "...": "FinancialProfile" },
  "result": { "...": "AnalysisResult" },
  "priorityPlan": { "priorities": [], "...": "PriorityPlan" },
  "explanations": { "...": "optional AI explanations" },
  "timeZone": "Asia/Kolkata",
  "dataAsOf": "2026-10-15T08:00:00.000Z"
}`,
        response: `200 application/pdf
Content-Disposition: attachment; filename="Finkoin-Fix-Plan-....pdf"
Cache-Control: no-store`,
        errors: [
          [
            "400",
            "Invalid JSON / missing profile, result or priority plan / payload too large",
          ],
          ["401", "Not authenticated"],
          ["429", "Rate limited"],
          ["500", "Could not generate the PDF"],
        ],
        notes:
          "The route also reads the user's active loan EMIs from `financial_obligations` and lists any drift from the profile in the PDF.",
      },
    },
    { kind: "h", text: "Priority engine order" },
    {
      kind: "list",
      ordered: true,
      items: [
        "Emergency fund: target = needs × months; current = 0.5 × savings + 0.95 × liquid MF + 0.7 × FD; monthly = min(40% of surplus, gap / 12).",
        "Medical fund: target ₹2,00,000; monthly = min(20% of surplus, gap / 6).",
        "Term insurance (when gap > 0).",
        "Health insurance (when gap > 0).",
        "Sukanya Samriddhi for each eligible girl child under 10.",
        "Debts ranked with extra-EMI recommendation; goals funded in parallel from what is left.",
      ],
    },
    {
      kind: "callout",
      tone: "info",
      text: "RAG knowledge lives in `finkoin_knowledge` (category, title, content, keywords[], is_active). Editing a row changes the AI's facts immediately, with no deploy.",
    },
  ],
};

export const profileSection: DocSection = {
  id: "profile-net-worth",
  title: "Profile and net worth",
  group: "Features",
  summary:
    "Editable assets and liabilities, net-worth breakup, avatar and KYC.",
  blocks: [
    {
      kind: "list",
      items: [
        "`/profile` shows the dashboard: net worth, assets/liabilities breakup (tap to expand, pencil to edit), FK, streak, badges.",
        "`/investments` and the assets cards edit the same `FinancialProfile` through `lib/profileAssetsPatch.ts` (scalar assets, unified loans, custom investments).",
        "`syncProfileAssets()` re-runs `analyseFinances` and upserts the snapshot, so the score and Fix Plan stay consistent with what the user edited (a toast says it was re-analysed).",
        "Net worth: `lib/netWorth.ts` (`buildNetWorth`, standing bands) and `lib/netWorthBreakup.ts` (per-item rows).",
        "Avatar uploads go to the `avatars` storage bucket and `users.avatar_url`.",
        "`/kyc`: PAN check is a mock (`lib/kycVerification.ts`); Aadhaar is marked coming soon.",
      ],
    },
    {
      kind: "api",
      api: {
        method: "SQL",
        path: "users (select / update own row)",
        summary:
          "Profile fields the user may edit: name, phone, avatar_url, preferences.",
        auth: "RLS own row; trigger blocks `subscription_tier`, `is_admin`, FK fields",
        request: `update users set name = 'Asha', avatar_url = 'https://…/avatars/<uid>.png' where id = auth.uid()`,
        response: `{ "id": "uuid", "name": "Asha", "email": "...", "subscription_tier": "free", "referral_code": "ASHA42", "is_admin": false }`,
        errors: [["42501", "Tried to change a server-only column"]],
      },
    },
  ],
};

export const policiesSection: DocSection = {
  id: "policies",
  title: "Policy vault",
  group: "Features",
  summary:
    "Insurance policies with renewal reminders, imported from the health check.",
  blocks: [
    {
      kind: "list",
      items: [
        "`/policies` (`components/policies/PolicyVaultClient.tsx`) lists, adds, edits and deletes policies via `lib/userPolicies.ts`.",
        "After a health check, policies found in the profile are offered for import; dismissed suggestions are remembered in `user_policy_import_dismissals`.",
        "`RenewalReminderBanner` warns about renewals coming up; adding a policy earns points (trigger).",
        "`/insurance` is a marketplace shell (comparison engine not built).",
      ],
    },
    {
      kind: "api",
      api: {
        method: "SQL",
        path: "user_policies (insert / update / delete own rows)",
        summary: "One row per policy.",
        auth: "RLS own rows",
        request: `{
  "user_id": "uuid", "policy_type": "health", "insurer_name": "Star Health",
  "policy_number": "P-123", "plan_name": "Family Floater", "cover_amount": 1000000,
  "premium_amount": 24000, "premium_frequency": "yearly", "renewal_date": "2027-03-01",
  "purchase_date": "2024-03-01", "nominee_name": "Ravi", "status": "active"
}`,
        response: `{ "id": "uuid", "...": "the inserted row" }`,
        notes:
          "If the live table lacks the `status` column the client retries without it.",
      },
    },
  ],
};

export const calculatorsSection: DocSection = {
  id: "calculators-learn",
  title: "Calculators and learning",
  group: "Features",
  summary: "Public SEO tools and content: no login, no backend.",
  blocks: [
    {
      kind: "table",
      head: ["Calculator id", "Component", "Notes"],
      rows: [
        [
          "sip / swp",
          "`SIPCalculator`, `SWPCalculator`",
          "SIP ≤ ₹1 Cr/month; SWP corpus ≤ ₹10 Cr",
        ],
        [
          "emi / home / car",
          "`EMICalculator`, `HomeLoanCalculator`, `CarLoanCalculator`",
          "Amortisation table + Excel export",
        ],
        [
          "ppf / nsc / po",
          "`PPFCalculator`, `NSCCalculator`, `PostOfficeCalculator`",
          "Scheme rates in `lib/postOfficeSchemes.ts`",
        ],
        [
          "fire / emergency",
          "`FIRECalculator`, `EmergencyFundCalculator`",
          "`lib/fireCalculator.ts`",
        ],
        [
          "rentbuy / rentcar / whencar",
          "`RentVsBuyCalculator`, `RentVsOwnCarCalculator`, `WhenToBuyCarCalculator`",
          "Scenario comparisons",
        ],
        [
          "tax-regime",
          "`TaxRegimeCalculator`, `/calculators/tax-regime-2026`",
          "FY 2025-26 old vs new; inputs in `finkoin_tax_calculator`",
        ],
      ],
    },
    {
      kind: "list",
      items: [
        "Default money cap ₹99 Cr per input (`lib/calculatorInput.ts`).",
        "`/learn` and `/blog` render typed content modules (`lib/learnContent.ts`, `lib/learnRichArticles.ts`, `lib/blogContent.ts`) with FAQ schema and embedded calculators.",
        "SEO: `lib/seo.ts`, `app/sitemap.ts`, `app/robots.ts`, per-page metadata and OG images.",
      ],
    },
  ],
};
