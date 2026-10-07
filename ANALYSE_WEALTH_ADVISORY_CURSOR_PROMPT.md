# Cursor prompt — multi-goal wealth advisory system (web + mobile)

Full rationale, the instrument map, the goal-detection rules, and the phased roadmap live in `ANALYSE_WEALTH_ADVISORY_SPEC.md` in this repo root — **read that first**, this prompt is the execution plan built on top of it. Every task below applies to **both web (`money-os`) and mobile (`money-os/mobile`)** unless marked "shared engine," in which case one fix in `lib/*.ts` covers both automatically — don't duplicate shared-engine fixes into platform-specific copies.

---

## Read this section first — security is the priority, not an afterthought

This feature set stores and transmits a person's exact salary, loan balances, insurance cover, net worth, and now their future investment intentions. Treat every item below as a requirement, not a suggestion, and don't ship any task below until its data is covered by these:

- **Every new and changed table gets Row Level Security scoped to `auth.uid() = user_id`, no exceptions** — the same pattern already used in `tracker_consent`, `user_credit_cards`, `expense_transactions`. A new table shipped without RLS is a data breach waiting to happen; verify this before any migration is considered done.
- **Mobile's local cache for financial data must not be plain AsyncStorage.** The AI-plan cache built in the earlier mobile work (and any new goal/portfolio data cached locally for Task 6 below) needs to move to encrypted on-device storage — `expo-secure-store` or `react-native-encrypted-storage` — not AsyncStorage, which is unencrypted plaintext on the device's filesystem. Audit what's in AsyncStorage today for this feature and migrate it.
- **Web's localStorage caches (the AI plan cache, the draft profile persistence) are currently plaintext in the browser.** Either encrypt before writing (Web Crypto API, a key derived from the session) or reduce what's cached client-side at all for the most sensitive fields (exact salary, exact loan outstanding, exact insurance sum assured) — caching less is often simpler and safer than encrypting more.
- **Confirm session/auth tokens use httpOnly cookies on web and SecureStore on mobile**, not localStorage/AsyncStorage — if this isn't already true, it's a prerequisite fix, not part of this feature, but flag it if found during this work since it affects everything else here.
- **The generated PDF report is one of the most sensitive artifacts in the app** (it contains literally every number: salary, every loan, every policy, net worth). Confirm the `/api/analyse/pdf` route stays auth-gated (401 without a valid session — already verified working per the last build). Add: no server-side logging or caching of generated PDF content, and on mobile, the temp file created for the share-sheet gets deleted after the share completes rather than left on-device indefinitely.
- **The AI route sends the full, exact financial profile to Groq (a third-party LLM) in the prompt**, and Task 4 below multiplies this by making one call per active goal instead of one call per report. Before building Task 4: confirm Groq's data-retention and training-use policy for API traffic covers this use case, and raise to product (don't silently decide) whether every field needs to go out at full precision or whether some fields (e.g., exact salary) could go out as a rounded band without degrading advice quality — this is a real precision-vs-exposure tradeoff, not a default to pick alone.
- **Rate limiting needs updating for cost, not just call count.** `/api/ai/analyse` is currently capped at 10 requests/hour/user, sized for one call per report. Task 4's agentic fan-out makes N calls per report (one per active goal), so a user with 4 active goals burns through the hourly cap in 2-3 report views instead of 10. Update the limiter to count per-report cost (e.g., weight by number of goals) rather than raw call count.
- **The new `user_planned_investments` data (Task 6) reveals a user's intended future financial moves** — treat it with the same sensitivity as account balances. Same RLS pattern, no exceptions, no analytics export without explicit anonymization.

---

## Database changes

Some of this is confirmed from the schema already read; some genuinely needs verification before you migrate anything — these are marked separately. Don't guess on the unverified ones; read the actual current schema first.

**Confirmed: new fields in the `AnalyseFormValues`/`FinancialProfile` JSON shape.** These are stored as JSONB inside `user_analyse_snapshots` (and mirrored into the legacy `user_analysis` table) — not a column migration, but every field below needs the stored snapshot's `version` field bumped (it already carries `version: "1.0"` today) so older snapshots don't break when a newer app version reads them with a different expected shape:
- `kidsEducationFundTargets: number[]` and `kidsMarriageFundTargets: number[]` — per-kid arrays, replacing the single blended `kidsEducationFundTarget` and the currently-dead `kidsMarriageFundTarget` field.
- `planningMarriage: boolean`, `marriageFundTarget`, `marriageFundYear` — the bachelor-only prompted goal.
- `planningBaby: boolean`, `babyFundTarget`, `babyFundYear` — the married-no-kids prompted goal.
- `riskTolerance` — conservative/moderate/aggressive, or a numeric score from the new 2-3 question risk quiz (§ below).
- Recommended: persist the computed per-goal portfolio-allocation split alongside the existing `aiPlan` object, so Task 6's Tracker-sync can reference exact figures without recomputing them from scratch every time.

**Confirmed: a new table, `user_planned_investments`.** One row per synced investment reminder: `user_id`, a reference to the priority/goal it came from, instrument category, suggested monthly amount, start month, `consent_given_at`, status (`pending`/`started`/`done`), `created_at`/`updated_at`. RLS: `auth.uid() = user_id`. **Do not overload the existing obligations table with this** — a planned-investment row's lifecycle (consent → reminder → user confirms → feeds back into the Fix Plan's progress display) is genuinely different from a bill or EMI row's lifecycle, and conflating them will make both harder to query correctly later.

**Needs verification — read these before building, don't assume:**
- The actual obligations table behind `ObligationsChecklist`/`obligationStore` hasn't been read in this work. Confirm whether its category/bucket field is free text (can just take a new `"security"` value) or a constrained enum (needs a migration) before wiring the insurance-premium sync in Task 1.
- Where RAG knowledge chunks currently live (`lib/rag/retriever.ts` calls `retrieveKnowledge` — is this a Postgres table with embeddings, an external vector store, or static files bundled with the app?). Task 4's per-goal reasoning needs new reference content added to whatever this is, and that's either a data migration or a content/file change depending on the answer — find out first.
- The `/api/financial-data` endpoint's existing "encrypted" save (fired from the form's final-submit sequence) — confirm it's doing real encryption today, not just carrying a name that implies it. This is exactly the kind of claim that needs verifying before more sensitive data gets routed through the same pattern.

---

## Task 1 — Fix the data bugs first (this blocks everything else)

Three issues, all prerequisites since later tasks build on these numbers being correct:
1. Bucket totals summing to 95% instead of 100% (Security's 5% dropped from the sum somewhere in the report/PDF) — trace and fix the call site.
2. Tracker has no Security category — insurance premiums never sync the way loans already do via `syncFromHealthCheck`. Add the category (pending the obligations-table verification above) and wire the sync.
3. PF/PPF/NPS are treated as a flat, non-growing balance in both net worth and retirement goal math. Project each forward at its typical rate (EPF ~8.15%, PPF ~7.1%, NPS market-linked) in `lib/financialEngine.ts` — shared engine, fixes both platforms at once.

## Task 2 — Multi-goal detection (web + mobile)

Implement the implied/prompted split from the spec doc's "Finding every goal" section: implied goals (kids' per-child education and marriage funds sized by actual age, home-purchase if renting, vehicle if no car, debt-free if has loans, parents eldercare if supporting them, retirement always) surface automatically as editable goal cards with no new question. Prompted goals (wedding fund for bachelors, baby fund for married-no-kids) are a single toggle shown only to the life stage it applies to, and — per the earlier discussion with the user — **appear after the score/report screen, not in the 7-step onboarding form**, framed as optional enrichment. Keep the detection rule itself deterministic (the same field-inspection style as `detectLastStep()`), never an AI guess.

## Task 3 — Multi-goal funding model (shared engine)

Replace the single-`primaryGoal` waterfall with the weighted-parallel-allocation model from the doc's "Funding several goals at once" section: goal-surplus splits across every active goal, weighted by urgency/time-to-goal with a floor so long-horizon goals are never zeroed out. Build this in `priorityEngine.ts` (or a new sibling module) — shared, both platforms inherit it.

## Task 4 — Agentic RAG per-goal advice (new/extended API route, both clients consume it)

Per the doc's "Keeping the AI honest, per goal" pipeline: goal detection stays deterministic (Task 2), the engine computes every number per goal (Task 3 + the new portfolio-allocation module in Task 5), and only the narrative reasoning fans out — one focused RAG+LLM call per active goal, each grounded in that goal type's own reference content, assembled into the unified report by an orchestrating pass. Extend `/api/ai/analyse` (or a new route) accordingly. Add the short risk-tolerance questionnaire (2-3 questions) this depends on — most naturally folded into the Goals step. Apply the security and rate-limiting requirements above before this ships.

## Task 5 — Instrument map / portfolio allocation module (shared engine)

New `lib/portfolioAllocation.ts`, deterministic: given a goal's horizon bucket, outputs the instrument-category split from the doc's "Where each instrument belongs" table (0-1yr: liquid fund/savings/sweep FD; 1-3yr: FD/corporate FD/CD/short debt funds/arbitrage funds; 3-7yr: hybrid funds/bonds; 7yr+: equity MF/PPF-EPF-NPS/real estate past a net-worth threshold; gold as a constant 5-10% hedge throughout). This is what Task 4's AI layer explains — it never decides the split itself.

## Task 6 — Tracker sync + consent + notifications (web + mobile)

Per the doc's "Turning advice into a tracked habit" section: a "Start this plan" action on the Fix Plan screen opens a consent popup explicit that nothing will be auto-invested or moved — only a reminder and a Tracker line item get created. On consent, write to the new `user_planned_investments` table, surface it in the existing Tracker obligations UI (not a new screen), fire a notification near the start month reusing the existing credit-card-due-reminder plumbing, and feed completion back into the Fix Plan's progress display. **No execution, ever** — no brokerage linkage, no auto-debit.

## Task 7 — USP surfacing (web + mobile)

From the doc's "What nobody else is sharing" section: (1) the financial life map — every active goal shown funded in parallel with the real math, not one at a time; (2) a forward net-worth trajectory (5/10/20 years) using Task 1's corrected PF/PPF/NPS compounding; (3) explicit "we don't sell what we recommend" framing stated on the report itself. The honest peer-benchmarking feature is **out of scope for this build** — it needs real aggregated user data first; don't fake it, and don't build it until there's a real data pipeline for it.

---

## Build order

Task 1 blocks everything (later tasks need correct bucket totals and compounding numbers to be trustworthy). Task 2's goal list feeds Task 3's funding math, which feeds Task 4's reasoning, which needs Task 5's instrument splits to explain. Task 6 needs Task 4's output to actually have something worth syncing. Task 7 can start once Task 1 and Task 3 are done, independent of Tasks 4-6. Re-run the full web + mobile test suites after each task, and don't merge any task that touches a new or changed table without its RLS policy reviewed in the same PR.
