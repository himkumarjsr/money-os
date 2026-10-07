# Cursor prompt — fix all flagged Analyse issues, web + mobile

Paste everything below into Cursor as one prompt. These are the issues flagged after the mobile Analyse build (commit `ea1e5d0`). For every judgment call, I've decided the behavior I want — implement these exactly, don't re-ask. The guiding principle for every call below: **give the user the most accurate, most honest, most complete picture of their finances** — never hide a real gap, never show a fabricated number, never let stale validation let bad data through.

Fix each of these **on both web and mobile** unless a line says otherwise. Where the underlying code is already shared (`lib/*.ts`), fixing it once in the shared file fixes both platforms — do that, don't duplicate the fix.

---

## Decision: hidden Fix Plan priorities (the big one)

Web's Fix Plan hides 10 priority types from the card list — emergency fund, medical fund, term cover, and 7 goal/debt items — under the theory that they have "dedicated UI elsewhere." They don't; that dedicated UI doesn't exist. The practical effect is that a user's most urgent safety-net gaps (emergency fund, medical fund, term insurance) can silently disappear from their own fix plan.

**Decision: show every open priority as a card, on both platforms. Remove the exclusion filter entirely — stop hiding anything.** A user should never have to guess why their top financial risk isn't showing up in their own roadmap.

- **Web** (`app/analyse/fixplan/page.tsx`): delete the `visiblePriorities` exclusion-id filter. Every priority with `gap > 0 || monthlyContribution > 0` renders as a card, including emergency/medical/term/health and every goal/debt item. The dead JSX branches that special-case `term_insurance`/`health_insurance` inside the `.map` should now actually be reachable — keep them (they add the "why this matters" partial-cover copy and the educational guide links), just make sure they render correctly now that those ids can reach the loop.
- **Mobile**: already shows all open priorities — this is correct, don't change it. Just make sure the card rendering (urgency color, rank badge, gap/monthly/timeline grid, "why this matters", "this week" callout) matches what web now renders for every priority type, including the term/health special-case copy.

---

## Fix Plan — other issues

### "Action this week" never uses the AI's version
`mergeEnginePriorityPlan` reads every other overlay field (`title`, `instrument`, `whyThisMatters`) from the AI response when a priority is still open, but `actionThisWeek` is hardcoded to always use the engine's own text — the AI's `match.actionThisWeek` is computed by the model (per the system prompt's "every field must cite a specific rupee amount") and then silently discarded.

**Decision: use the AI's `actionThisWeek` when the priority is open, same as `title`/`instrument`/`whyThisMatters` — keep the hardcoded "maintain this completed bucket" text only when the priority is complete.** This is pure upside: the AI's version is more specific/personalized and is still constrained by the system prompt to cite the engine's real numbers, so correctness isn't at risk. Fix in the shared merge function (whichever file both platforms build from, or fix in both the web page and the mobile port if they're separate copies) — same change in both places since this logic got duplicated during the mobile build.

### "Interest saved" uses a rough formula
Currently `extraEMI × monthsToClearWithExtra × 0.35` — a flat heuristic, not a real calculation.

**Decision: replace with an actual amortization-based calculation** — compute total interest paid over the loan's life two ways (at the current EMI only, vs. with the extra payment applied) using the same amortization math already used elsewhere in `priorityEngine.ts` for `monthsToClearWithExtra`, and report the real difference. This is a shared-lib fix (`lib/priorityEngine.ts`), so fixing it once fixes both platforms and both the on-screen debt cards and the PDF.

### "+N pts" always shows, even when there's nothing to fix
When `scoreGainIfFixed` is 0 (everything's already on track), the UI still shows a "+0 pts" projection arrow, which reads as broken/pointless.

**Decision: when the projected gain is 0, replace the "+N pts in 12 months" arrow with a simple affirming state** — e.g. "Your score is already strong — keep it up" — and don't show a numeric delta of zero. Apply to both platforms' score-projection card.

### Cache holds only one plan per device
A single-slot cache means a second profile on the same device (family member, or someone who resets/redoes their health check) silently evicts the first person's cached plan, forcing an unnecessary AI call and burning their rate limit.

**Decision: key the cache by `profileHash` and store multiple entries (small LRU, cap at ~5 entries, evict oldest on overflow)** instead of one slot. Fix `lib/cache.ts` (web, localStorage) and its mobile AsyncStorage port identically — same LRU logic, same cap, same 30-day TTL per entry.

### Pull-to-refresh burns the AI rate limit
Pull-to-refresh forces a cache bypass, which means a user who refreshes a few times can hit the 10-requests/hour-per-user server limit and get a hard failure.

**Decision: throttle forced refreshes client-side** — don't let pull-to-refresh (or any manual "regenerate" action) call the API more than once per, e.g., 2 minutes; if the user pulls again within that window, just re-show the cached plan with a brief "already up to date" toast instead of hitting the network. If a forced refresh does get a 429 from the server, show a friendly "You've hit today's refresh limit, your current plan is still accurate" message rather than a raw error. Apply on mobile (where pull-to-refresh exists); check whether web has an equivalent manual-refresh affordance and apply the same throttle there if so.

---

## Form — validation & state fixes

### Validation that never actually fires
Three rules are currently dead because a default value of `0` or a blank field satisfies "is defined":
- `kidsEducationFundTarget` required if `lifeStage==="kids"` — passes because it defaults to `0`.
- Other-insurance "at least one row needs a premium amount" — passes because `premiumAmount` defaults to `0`.
- Kid age fields — a blank input is read as `0`, which passes an "is a number" check.

**Decision: change these required-field checks from "is defined" to "is a meaningful positive value" (or, for ages, "is a real entered number, not blank-defaulted-to-zero").** Specifically: `kidsEducationFundTarget` must be `> 0` when required; other-insurance rows must have `premiumAmount > 0` to count toward "at least one"; kid age inputs must track "has the user actually typed something" (e.g. use `undefined` as the untouched default, not `0`) so a blank field fails validation instead of silently passing as zero. Fix in the shared Zod schemas (`lib/analyse-form-schema.ts`) so both platforms inherit the fix automatically.

### Final submit only validates step 7 — a salary of 0 can be submitted
**Decision: final submit should validate the full cross-field schema (`formSchema`/`fullAnalyseSchema`), not just `step7Schema`.** If any earlier step now fails that full validation (e.g. salary is 0), block submission, jump the user back to the first failing step, and show that step's error — don't let an incomplete profile reach the scoring engine. This is a behavior change on web too (it currently has the exact same lenient-only-step-7 bug) — fix both.

### Loan field-array state bugs
Three related bugs:
- **Draft loans hidden when resuming** — the `unifiedLoans` field array isn't being correctly rehydrated from the saved draft on mount, so a user who left mid-form and comes back sees an empty loans section even though the data is still in their draft.
- **Turning loans off doesn't keep them cleared** — toggling "do you have any loans?" to No clears the in-memory array but doesn't immediately push that cleared state into the persisted draft, so a resume (or even a re-render) can bring the old loans back.
- **"Start Fresh" keeps the old loan screen state** — Start Fresh resets the form's field values but leaves loan-related local UI state (e.g. which loan cards are "saved"/collapsed, the `hasLoans` toggle) stuck on the old values.

**Decision:** fix all three as plain correctness bugs — there's no judgment call here, this is just broken state sync:
1. On mount/resume, ensure `unifiedLoans` (and its "saved/collapsed" UI state) is populated from whichever of `draft`/`lastSubmission` actually has rows, using the existing `mergeAnalyseDraftWithProfile` logic — the data path already does the right merge, the bug is in the component not calling `reset()`/`replace()` on the field array with that merged result.
2. When the "do you have loans?" toggle flips to No, immediately call the draft-persist function (`setAnalysis`) with the cleared array in the same tick — don't wait for the next autosave cycle.
3. Start Fresh must explicitly reset every piece of loan-related local state (collapsed/saved ids, the has-loans toggle, the field array itself via `replace([])`), not just the RHF form values.

### Vehicle toggle gets stuck on; turning off "own car" wipes the car-purchase goal
Two issues: (1) the vehicle-insurance toggle (`hasVehicleToggle`) is a separate local boolean that can desync from the derived "do they actually have a car" state and get stuck true; (2) the effect that clears fields when `ownsCar` is turned off is over-aggressive and also wipes `carPurchaseTarget`/`carPurchaseYear` — which are Goals-step fields, unrelated to whether they currently own a car.

**Decision:**
1. Remove the separate `hasVehicleToggle` local state entirely — derive "do they have a vehicle" purely from `carLoanEMI > 0 || carMarketValue > 0 || bikeLoanEMI > 0` (a pure computed value, no local state to desync).
2. The `ownsCar` off-effect should only clear ownership fields (`carMarketValue`, `carLoanOutstanding`) — it must **not** touch `carPurchaseTarget`/`carPurchaseYear`. Someone can stop owning a car and still be saving toward buying one; those are independent concerns and shouldn't be coupled.

### Emergency fund target keeps refilling itself
The auto-suggest effect re-fires every time the field is `<= 0`, which means a user who deliberately clears the field to 0 immediately gets it refilled, and they can never leave it blank/zero.

**Decision: the auto-suggest should fire at most once** — track whether it has already auto-filled this field in this session (a ref, not a re-evaluated condition), and never overwrite a value the user has explicitly changed, even to 0.

### Month dropdowns (credit card bill day, SIP auto-debit day, PPF deposit day) do nothing
**Decision: wire them up** — these should call the same `persistValue`/`setValue` + draft-persist pattern every other field uses. This is a pure bug fix, not a judgment call.

### Debt warning banner shows on the wrong steps
It currently appears on steps 3–5 (Obligations, Expenses, **Insurance**) — showing a debt-ratio warning on the Insurance step doesn't make sense.

**Decision: show it only on the steps where debt load is actually part of what's being entered or directly relevant — Income (2), Obligations (3), Expenses (4). Remove it from step 5 (Insurance).**

### Year fields snap to the allowed range mid-typing
Typing "2" into a year field (meaning to type "2030") immediately clamps to the field's minimum, making it impossible to type a multi-digit year naturally.

**Decision: only clamp/validate year fields on blur, not on every keystroke** — same pattern already used for money fields (which correctly defer coercion to blur). Let the user type freely; validate when they're done.

### `kidsMarriageFundTarget` has no input anywhere
It's a real field in the schema (and gets saved if somehow set), but no UI lets a user enter it.

**Decision: add the missing input.** Render it in Step 7 alongside `kidsEducationFundTarget` whenever `lifeStage==="kids"`, regardless of which `primaryGoal` is selected (it's a kids-related savings target, not tied to one specific primary goal) — same money-field treatment as the other goal-detail fields. Add this on web (where it's missing) and confirm mobile's Step 7 build includes it too.

### Inline vs. banner error display; money-input focus behavior differs slightly
Mobile shows per-field inline errors; web only shows a single step-level banner. Mobile's money input also behaves slightly differently on focus than web's.

**Decision: inline per-field errors are strictly better for the user — they show exactly which field is wrong instead of making the user hunt. Bring web up to mobile's behavior: add inline per-field error text under each input on web, in addition to (not instead of) the existing step-level banner.** For the money-input focus/blur mismatch: make mobile match web's exact convention (clear to empty on focus only when the current value is `0`/empty; on blur, snap back to `0` only if the raw text is empty after stripping separators/currency symbols) — treat web's version as the canonical spec here since it's the original, well-established convention from the Tracker feature too.

### Android hardware back button leaves the form entirely
**Decision: intercept the hardware back button so it goes back one step (same as the in-app Back button) when `step > 1`, and only allow it to leave the screen (with the normal "are you sure, you'll lose progress" consideration) when the user is on step 1.** Mobile-only fix (no Android-back-button concept on web).

---

## Result screen fixes

### Static text that never reflects real data
The CTA title, the "+8 more" line, the step-2/3 teaser lines, and the "62nd percentile" line are all hardcoded strings regardless of the user's actual plan.

**Decision:**
- CTA title, "+8 more", and the step-2/3 teaser lines: **compute these from the real data** — the "+N more" count should be `visiblePriorities.length - 3` (or however many are actually shown free vs. locked, now that the hide-list is gone per the Fix Plan decision above — recompute this number against the new unfiltered priority list), and the teaser lines should summarize the actual next 1–2 hidden priorities' titles, not a generic string.
- The "62nd percentile" line: **this is a fabricated, unverified statistic being shown to users as if it were real — remove it.** Don't show an invented precise number. If there's a real, computed percentile available from aggregated anonymized user data, wire it to that; otherwise replace the line with qualitative framing that doesn't claim false precision (e.g. drop the sentence entirely, or say something honest like "scores like yours typically improve fastest by tackling the top priority first" without a fake percentile). Apply the same decision on both platforms.

### Emergency fund target and its check use different month-counts
The number of months of expenses the "emergency fund target" uses, and the number of months the safety-net checklist's pass/fail check uses, come from two different calculations.

**Decision: there must be exactly one function that decides "how many months of expenses this user's emergency fund should cover" (the existing life-stage-aware 6–12 month logic already in the engine) — use that single function everywhere it's needed:** the Step 6/7 auto-suggest default, the Fix Plan's emergency-fund priority target, and the Result screen's safety-net checklist check. Consolidate into one exported function in `lib/financialEngine.ts` (or wherever the canonical version already lives) and have every other call site import it instead of recomputing its own version. Shared-lib fix — do it once, both platforms inherit it.

### Hero section shows raw enum values instead of labels
E.g. literal `"bachelor"` or `"build_insurance_premium_fund"` instead of their human-readable labels.

**Decision: route every enum value shown to the user through its existing label lookup** (`LIFE_STAGE_LABELS`, `CITY_TIER_LABELS`, `PRIMARY_GOAL_LABELS` — all already defined in `lib/analyse-form-schema.ts`) before rendering. Fix on both platforms' hero/summary sections.

### Safety-net heading references sections that don't exist
**Decision: make the heading text derive its count/content from what's actually rendered** (e.g. "Your financial safety net — N checks" where N is the real rendered item count), not a hardcoded string that can drift out of sync with the actual list. Both platforms.

### Bucket caps typed directly in the summary vs. imported in the gauge
The monthly summary card hardcodes the 30/5/5/40/20% bucket caps as literals; the gauge component imports them from the shared lib. If those caps ever change, the two sections will silently disagree.

**Decision: both the summary card and the gauge must read the bucket caps from the same shared constant** (wherever `universal-buckets.ts`/`financialEngine.ts` already defines them) — remove the hardcoded literals from the summary card. Both platforms.

### Paywall button says "Confirm and unlock" while payments are off
Mobile currently has `PAYMENTS_ENABLED = false` (as instructed) but the button still says "Confirm and unlock," implying a real charge that doesn't happen.

**Decision: drive the button copy off the `PAYMENTS_ENABLED` flag** — when payments are disabled, the button should say something that doesn't imply a charge (e.g. "Continue — payments coming soon" or similar honest copy), and automatically revert to the real "Confirm and unlock ₹99"-style copy once `PAYMENTS_ENABLED` flips back to `true`. Build this as a small shared copy-selection function keyed off the flag so it's correct on both platforms whenever either one has payments toggled off during testing.

### `HealthScoreRing` uses different color cutoffs than web's gauge (75/50 vs. 70/40)
Two users with the same score could see different color signals depending on platform — that's a correctness problem, not just a style nit.

**Decision: there is exactly one correct set of score-band thresholds, and every score visualization on every platform must use it.** Extract the thresholds web already uses (70 = good, 40 = warning, below = critical) into a single shared exported constant (in `lib/financialEngine.ts` or a shared constants file), and point `HealthScoreRing` (mobile) and the web gauge/badge logic both at that same constant. Fix the mobile component's hardcoded 75/50 to match — web's values are the canonical ones since they were defined first and are what the scoring engine's own `overallScore` bands were designed around.

---

## PDF fix

### ₹ and ✓ don't render (same bug on both — now the same code path too)
Default PDF fonts (Helvetica) don't have glyphs for the rupee sign or checkmark.

**Decision: embed a Unicode-capable font (e.g. Noto Sans, which includes ₹) into the PDF generation code so both symbols render correctly, and for checkmarks specifically, draw them as a small vector path (two line segments) instead of depending on a text glyph at all** — that's more robust than hoping any given font has a check-mark character. Since the PDF is now generated server-side and shared by both the web download and the mobile share-sheet (per the last build), this is **one fix in the server PDF-generation code that fixes both platforms simultaneously** — don't fix it twice.

---

## Implementation notes

- Several of these (cache LRU, interest-saved math, action-this-week merge, emergency-fund-months consolidation, bucket-cap constants, score-band thresholds, PDF font) belong in shared `lib/*.ts` files. Fix them once there; do not fork the fix into platform-specific copies, and if the mobile build already forked a copy of merge logic or cache logic that should have stayed shared, re-converge it back to one source of truth now.
- The Zod validation fixes (kids-education target, other-insurance premium, kid-age blank-vs-zero, full-schema final submit) are also shared-schema changes (`lib/analyse-form-schema.ts`) — one fix, both platforms.
- Everything under "Form" that's platform-specific UI (loan state bugs, vehicle toggle, month dropdowns, year-field clamping, inline errors, Android back button) needs a matching fix on **both** `components/forms/analyse-onboarding-form.tsx` (web) and `mobile/app/analyse/form.tsx` (mobile) individually, since those are two separate component trees even though they now share the same validation schema.
- After each fix, re-run the existing test suites (572 unit tests, the 5 web E2E health-check tests) and add new test coverage specifically for: the validation rules that previously never fired, the loan-resume/clear/start-fresh state bugs, and the emergency-fund-months consolidation — these are exactly the kind of regression that's easy to silently reintroduce.
- Don't re-enable payments as part of this pass — keep `PAYMENTS_ENABLED = false` on mobile; just fix the button copy to be honest about that state, as decided above.
