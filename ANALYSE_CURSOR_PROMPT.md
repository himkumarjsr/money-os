# Cursor prompt — build mobile Analyse (Financial Health Check) to web parity

Paste everything below into Cursor/Claude Code as one prompt. Attach `ANALYSE_FUNCTIONALITY_SPEC.md` (in the repo root) alongside it — the prompt below references it by section number throughout.

---

I need you to bring the mobile app's "Analyse" (Financial Health Check) feature up to full parity with the web (PWA) implementation. I've already done a complete line-by-line audit of both sides and written it up in `ANALYSE_FUNCTIONALITY_SPEC.md` at the repo root — **read that file in full before writing any code.** It documents every field, every conditional rule, every screen section, and exactly what mobile currently has vs. what's missing, with file paths and line-level detail on both platforms.

## Ground truth you can rely on without re-verifying

The entire business/calculation layer is already correctly ported and **byte-identical** between `lib/*.ts` (web) and `mobile/lib/*.ts`: `analyse-form-schema.ts` (types, Zod schemas, normalizers, defaults), `financialEngine.ts` (the scoring engine), `priorityEngine.ts` (the fix-plan math engine), `userAnalyseSnapshot.ts` (cloud snapshot read/write, adapter-only diff). **Do not rewrite, "fix", or duplicate any of this logic — import and use it directly on mobile exactly as it exists.** `lib/financialOptimizer.ts` has zero importers even on web — it's dead code, ignore it entirely, it is not a mobile gap.

Two web lib files have **no mobile port yet** and need one: `lib/cache.ts` (AI-plan caching) and `lib/generatePDF.ts` (PDF export) — see tasks 5 and 7 below.

Everything else needed is **UI work**: the 7-step form needs validation/resume/autosave and 4 missing field-arrays; the Result screen is an intentional "Sprint 1" placeholder that needs the bucket/net-worth/safety-net sections; the Fix Plan screen is a non-functional stub that needs to be built from scratch; there's no paywall on mobile at all.

## Task 1 — Form engine: validation, resumability, autosave (do this first — everything else builds on it)

File: `mobile/app/analyse/form.tsx` (currently 902 lines, flat `useState`, no `react-hook-form`, no Zod validation, no resumability, no autosave — see spec §4).

- Replace the flat `useState<FormState>` with `useForm<AnalyseFormValues>` from `react-hook-form`, using `analyseDefaultValues` from `@/lib/analyse-form-schema` (already on mobile, byte-identical to web) as defaults.
- On the "Next" button for each step, validate with that step's `stepNSchema` (`step1Schema`...`step7Schema`, already exported from `analyse-form-schema.ts`) via `safeParse`. On failure, map Zod field errors onto RHF's `setError` and show a step-level error banner. On success, advance.
- Final submit (step 7) validates **only `step7Schema`**, not the full form — replicate this exact (lenient) web behavior, don't "improve" it without checking with product first.
- Add a `watch()` subscription that pushes `getValues()` into the Zustand `useFinancialStore`'s `setAnalysis` action on every field change (not just on Next) — this is what makes the form resumable mid-step.
- Port `detectLastStep(profile)` from `components/forms/analyse-onboarding-form.tsx` (web) — inspect which fields are populated to determine the furthest-completed step, and add a "Continue where you left off" resume banner (Resume / Start Fresh) exactly like web's.
- "Start Fresh" should wipe local draft caches, reset the Zustand store, and reset the form to `analyseDefaultValues`.
- Reuse the existing `MoneyInput` component's focus/blur UX (clear-to-empty on focus if zero, snap-back-to-zero on blur if left empty) — this already exists on mobile, just make sure every new money field uses it.

## Task 2 — Close the 4 missing field-arrays + goals detail fields (spec §3)

All four use `useFieldArray` from `react-hook-form` once Task 1 is in place. Row shapes and exact behaviors are fully specified in spec §3 — follow them precisely, these drive what gets saved to the user's profile:

1. **Step 3 — `unifiedLoans`** (replace the 3 hardcoded loan fields currently in `Step3Loans`): add/edit/remove multiple loans, each with `loanType` (11-option picker, values in `UNIFIED_LOAN_TYPE_VALUES`), `lenderName` (force-uppercase as typed), `monthlyEMI`, `outstandingAmount`, `interestRate`, `remainingMonths`, and — only when `loanType==="overdraft"` — `odLimit`/`odUsed`/`odInterestOnlyYears`. Add the "Save this loan" collapse-to-summary-card pattern (disabled until `monthlyEMI>0`).
2. **Step 5 — `otherInsurancePremiums`**: policy name, premium amount + monthly/yearly frequency toggle, maturity amount/year. Auto-append one blank row when `hasOtherInsurance` is first turned on. Also: **add the missing premium-frequency toggle for health and term insurance** — `healthInsurancePremiumFrequency`/`termInsurancePremiumFrequency` already exist in the shared schema/state but currently have no UI control on mobile at all (confirmed gap, spec §3 step 5).
3. **Step 6 — `postOfficeSchemes`**: scheme picker (9 options in `POST_OFFICE_SCHEME_VALUES`), amount, maturity year. Also **`customInvestments`**: label, current value, monthly contribution, type (equity/debt/real_estate/other).
4. **Step 7 — Goals**: replace the single enum-only picker with the full conditional detail fields per goal (target amount + year/age for buy_home, retire_early, kids_education, build_emergency_fund, buy_car — see spec §3 step 7 for exact field names and the auto-suggest behavior on `emergencyFundTarget`).

## Task 3 — Result screen rebuild (spec §6)

File: `mobile/app/analyse/result.tsx` (currently 222 lines, explicitly self-described in-code as a Sprint-1 placeholder).

Add, in this order: a monthly summary card (income/outflow/left-in-hand), a net worth card (assets/liabilities/net worth), the 5-bucket "category caps vs actual" breakdown (needs/wants/insurance/loans/investment vs their caps, with status), and the 5-item "financial safety net" checklist (emergency fund, medical emergency fund, term cover, health insurance, investing regularly — ✓/⚠/✕ status + "N of 5" progress). All of this data already exists in the `AnalysisResult` object returned by the already-ported `financialEngine.ts` — this is purely a rendering task, no new calculation needed. Also wrap the whole screen in a React error boundary mirroring web's `AnalyseResultErrorBoundary` (console-log the error, show a "Something went wrong / Start again" fallback card) — mobile currently has none.

Before building further, verify `@/components/ui/HealthScoreRing` (imported by `ResultCard.tsx`) actually exists and renders — it wasn't found anywhere in the repo during the audit and may be a broken import.

## Task 4 — Paywall (spec §5, §7.6 — currently zero implementation on mobile)

Build a mobile unlock flow gating access to the Fix Plan screen, mirroring web's `components/analyse/paywall-modal.tsx`: ₹99 one-time price, bullets (complete priority plan / debt clearance strategy / 12-month roadmap / PDF / insurance recs), the same FK-disclaimer copy. Use whatever payment rail is appropriate for the mobile platform (Razorpay's mobile SDK if available, or confirm with product whether this should be an in-app purchase instead — don't assume Razorpay web-checkout works as-is on a native app). On successful purchase, set the same `subscriptionTier="pro"` flag the web app uses so entitlement stays consistent across platforms. Wire this into the Result screen's "View fix plan" CTA so it opens the paywall unless the user already has `pro`/`promax`/admin tier (mobile currently navigates to Fix Plan completely unconditionally — remove that).

## Task 5 — AI-plan cache (spec §7.3 — port `lib/cache.ts`, no mobile equivalent exists)

Port `getCachedPlan`/`setCachedPlan`/`hashProfile`/`enginePlanFingerprint`/`isCachedAiStale`/`clearCache` to use AsyncStorage (or MMKV if already in the mobile stack) instead of `localStorage` — keep the exact same single-slot-cache, 30-day-TTL, dual-hash-invalidation logic (profile hash AND engine fingerprint must both match for a cache hit). Full algorithm detail in spec §7.3.

## Task 6 — Fix Plan screen (spec §7 — the biggest single gap; currently a static "coming soon" placeholder)

File: `mobile/app/analyse/fixplan.tsx` (51 lines today, needs to become the full screen).

- Call `POST /api/ai/analyse` with `{ profile, analysis }` — this is the real contract (confirmed by reading the route handler directly, see spec §7.1). It returns `{ priorityPlan, explanations: { greeting, overallSummary, debtStrategy, goalAdvice, thisWeekAction, in12Months, encouragement, disclaimer, priorityExplanations: {[id]: string} }, knowledgeUsed, isFallback? }`. Do **not** build around `lib/finkoinAiPlan.ts`'s shape — that file targets a different/legacy surface (see spec §8) and does not match what this screen needs.
- Port `mergeEnginePriorityPlan` and `reconcileExplanations` from `app/analyse/fixplan/page.tsx` verbatim (exact logic in spec §7.2) — the engine's own locally-computed numbers always win over anything from the API/cache; only title/instrument/whyThisMatters may come from the AI response, and only while an item is still open.
- Use Task 5's cache before calling the API; show a full-screen loader with the rotating cosmetic messages only on the very first-ever load, silent background refresh after that.
- Build the screen layout per spec §7.5: hero summary, surplus breakdown, priority cards (rank/urgency/gap/monthly/timeline/instrument/why/this-week-action), surplus allocation summary, 12-month table, debt payoff cards (avalanche order + extra-EMI savings), goal progress card, score-projection (today → 12mo), optional FD-switch suggestion, "do this first" + encouragement callouts, PDF download button (see Task 7), disclaimer footer.
- Gate the whole screen behind the subscription-tier check from Task 4 (unauthenticated → login; not pro/promax/admin → back to Result screen where the paywall lives).
- Decide explicitly whether to replicate or fix the web quirk where term/health-insurance priority cards never actually render due to a filter bug (spec §7.5) — flag this decision back rather than silently copying the bug.

## Task 7 — PDF export (spec §9 — needs a platform decision before coding)

`doc.save()` (web's trigger) has no RN equivalent. Before writing code, confirm with me/product which approach: (a) port the jsPDF content logic using a React-Native-compatible PDF library + share sheet, or (b) move PDF generation server-side and have mobile just download/share the result (recommended in the spec given the effort delta — 904 lines of hand-drawn jsPDF layout is a lot to replicate natively). Either way this is a separate ticket from the rest of this prompt — don't block Tasks 1–6 on it.

## General rules for all tasks

- Every field name, enum value, and validation rule must match `lib/analyse-form-schema.ts` exactly — that file is the single source of truth and is already correctly shared between platforms. If something in the spec seems to disagree with that file, the file wins.
- Keep mobile's existing route-per-screen architecture (Expo Router screens) rather than copying web's single-giant-component-with-a-modal-overlay pattern — the spec explicitly recommends this (§1).
- When a web behavior looks like a bug or an inconsistency (dead fields, the term/health card filter issue, the AI-overlay fields that get silently discarded), flag it back to me instead of silently "fixing" it or silently copying it — I'll make the call.
- Work through tasks in order (1 → 7); later tasks assume earlier ones are done.
