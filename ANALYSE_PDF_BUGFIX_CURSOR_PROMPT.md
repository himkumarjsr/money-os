# Cursor prompt — fix 4 PDF rendering bugs found in a real generated report

I generated an actual PDF from the live app (`Finkoin-Report-User-2026-10-06.pdf`, 11 pages) and reviewed every page image. The ₹ symbol and checkmark font fix from the last round landed correctly — every rupee figure and every ✓ across all 11 pages renders cleanly now, no further work needed there.

Reviewing the real output surfaced 4 new, concrete bugs. Since PDF generation is now server-side and shared by both the web download button and the mobile share-sheet (per the last build), fixing these in the shared PDF-generation code fixes both platforms' PDFs in one place — do not fix this twice.

Fix all 4 below.

---

## Bug 1 — "Cap%" column shows raw fractions instead of percentages

Page 2, "Monthly Budget Allocation" table. It currently prints:

| Category | Cap% | Cap₹ |
|---|---|---|
| Needs | 0.3% | ₹1,27,038 |
| Wants | 0.05% | ₹21,173 |
| Security | 0.05% | ₹21,173 |
| Loans | 0.4% | ₹1,69,384 |
| Investment | 0.2% | ₹84,692 |

The Cap₹ values are correct (e.g. ₹1,27,038 ÷ ₹4,23,460 monthly income = 0.30 = **30%**, not 0.3%). The underlying `capPercent` field is stored as a fraction (0.3, 0.05, 0.4, 0.2 — matching the shared engine's needs/wants/security/loans/investment caps), and the PDF code is printing that fraction directly with a `%` suffix instead of multiplying by 100 first.

**Fix:** find wherever this table's Cap% cell is built in the PDF-generation code and change it to `capPercent * 100` (formatted with no more than 1 decimal, e.g. "30%", "5%", "40%", "20%") before appending the `%` sign. This is a real, user-facing correctness bug — as shown today it makes every spending cap look 100x smaller than it actually is, which could make a user think they're wildly over-budget (or under, depending on the actual-vs-cap comparison) when they aren't.

Double check: this same `capPercent` value is also used elsewhere in the PDF (and in the on-screen web/mobile bucket gauges) — confirm those other call sites already multiply by 100 correctly (they appeared fine in earlier testing) and that you're only fixing the one broken call site in the PDF table, not introducing a double-multiplication elsewhere.

## Bug 2 — Text gets cut off mid-word / mid-sentence, no wrap or ellipsis

Several tables/sections clip text at a fixed column width with no wrapping and no "...", producing garbled, unfinished sentences and labels:

- Page 4, priority card #3 "This week" callout: *"From month 7, add a top-up for ~₹4.0 crore only (you already have ₹1.0Cr). Keep the old policy —"* — stops mid-sentence (the full text, per the on-screen version, continues "...income proof limits often block a second full policy at today's salary").
- Page 9, "Your 12-month checklist" Action column: row 3 reads *"From month 7, add a top-up for"* (cut off), row 4 reads *"From month 8, start ₹1,59,329/"* (cut off mid-number, should be "...₹1,59,329/month SIP for early retirement").
- Page 10, "Monthly Allocation" bar-chart row labels: *"Medical emergency fu"* and *"Term top-up (keep ex"* — both clipped.

**Fix:** for every one of these call sites, either (a) use the PDF library's text-wrapping helper (the codebase already has `addText`/`splitTextToSize`-style wrapping used elsewhere in the report — reuse that instead of a fixed-width unwrapped `text()` call), or (b) where the layout genuinely can't fit more than one line (like the bar-chart labels), truncate to the available width and append "…" rather than silently clipping mid-word. Prefer (a) wherever there's room to grow the row height; only use (b) for genuinely fixed single-line layouts like the bar-chart labels.

## Bug 3 — Goal enum shown raw instead of its readable label

Page 8, "Goals & Score Projection" table, Goal column shows the literal string `retire_early` instead of "Retire early."

Notably the cover page (page 1) gets this right — it shows "Goal: Retire early" — so the enum-to-label lookup (`PRIMARY_GOAL_LABELS`, already defined in `lib/analyse-form-schema.ts`) exists and is used in at least one place in the PDF, just not this one.

**Fix:** route the Goals table's goal-name cell through the same `PRIMARY_GOAL_LABELS` lookup already used on the cover page, instead of printing the raw `goalType`/`primaryGoal` value. While in this code, grep the rest of the PDF-generation file for any other spot that prints an enum value (`lifeStage`, `cityTier`, loan `type`, insurance `frequency`, etc.) directly rather than through its label map, and fix those too — this was clearly meant to be handled consistently and one spot was missed.

## Bug 4 — Stale "why this matters" copy on a completed priority

Page 4, priority card #1 (Emergency fund). The card correctly shows `Gap: ₹0 · Monthly: ₹0 · 0 months` and the "This week" line correctly says "Maintain this completed bucket and continue monitoring monthly" — but the explanatory paragraph directly above it still reads:

> "If your income stops tomorrow you need 9 months to recover. (gap ₹0, ₹0/mo from surplus)"

This directly contradicts the ₹0 gap shown right next to it — a leftover "months to recover" figure from before the bucket was completed. The merge logic elsewhere in the app (`mergeEnginePriorityPlan`) already has a rule that swaps `whyThisMatters` to a generic "this bucket is already on track, keep it funded" message once a priority is complete — but the PDF's copy for this section isn't going through that same check.

**Fix:** find where the PDF builds each priority's explanatory paragraph and apply the same `isComplete` check used by `mergeEnginePriorityPlan` — when `gap<=0 || monthlyContribution<=0 || status==="complete"`, use the generic "this bucket is already on track" text (matching the on-screen/mobile wording) instead of the stale "if your income stops tomorrow you need N months to recover" template, which only makes sense for a bucket that's still open.

---

## After fixing

Re-generate a test PDF for a profile that has at least one completed priority (to verify bug 4), at least one long "this week"/checklist action string (to verify bug 2's wrapping), and a non-default goal (to verify bug 3), and visually check all 11 pages again before calling this done — these are exactly the kind of formatting bugs that don't show up in a type-check or unit test, only in the actual rendered output.
