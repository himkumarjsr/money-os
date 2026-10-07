# Finkoin Analyse — Wealth Advisory Vision & Spec

*Saved 2026-10-07 — mirrored from the Claude Doc so Cursor can read it locally without needing a claude.ai login.*

## Executive summary

Finkoin's Analyse already does something no competitor does well: it runs real financial math (emergency fund, insurance, debt payoff) before any advice is written, then has AI only explain it in plain language. The next step is extending that same discipline into full portfolio diversification and multi-goal planning, so a user doesn't just learn they have a gap, they learn exactly which instruments to put their surplus into, over what horizon, for every goal they actually have — not just the one they picked from a dropdown. Paired with syncing the plan into Tracker as trackable, consent-gated reminders, this turns a one-time PDF into a living plan the app can show real progress against.

**The USP:** Finkoin is the only app that shows someone's whole financial life as one connected, honest story — every goal funded in parallel with the real math shown, a forward net-worth trajectory, and recommendations that are structurally unbiased because Finkoin doesn't sell what it recommends.

## The prioritization order

The original doc has a 4-stage diagram here (Safety net → Debt → Goals → Diversification, following directly from the sections below). The safety-net steps already built (emergency fund, insurance) follow this order; extending it to full multi-goal funding and instrument diversification is the next layer on top of that same sequence, not a new philosophy. Nothing moves into "diversify across instruments" territory until the safety net and any high-interest debt are handled first (see "Where each instrument belongs" and "Funding several goals at once" below).

## Where each instrument belongs

Money gets bucketed by when it's needed, not by which product looks exciting — and every bucket spreads across more than one instrument so a bad year in one product doesn't matter. Gold sits outside this table: a constant 5–10% hedge across every horizon, never its own goal. Arbitrage funds are a trap below a ~3-year hold (tax-inefficient) — they belong in the 1–3 year row, not the 0–1 year one.

| Horizon | Typical goals | Instruments | Why |
|---|---|---|---|
| 0–1 year | Emergency fund, near-term bills | Savings account, liquid mutual fund, sweep-in FD | Capital safety and same-day access matter more than returns |
| 1–3 years | Car, a wedding 1–2 years out, medium obligations | Bank FD, corporate FD, certificates of deposit, short-duration debt funds, arbitrage funds | Locks in a known return; arbitrage funds turn tax-efficient past ~3 years |
| 3–7 years | Home downpayment, a child's near-term school fees | Hybrid/balanced mutual funds, government and corporate bonds | Blends growth with reduced volatility as the deadline approaches |
| 7+ years | Retirement/FIRE, a young child's education or marriage, long-run wealth | Equity mutual funds (index first, then flexicap), PPF/EPF/NPS, real estate once liquid net worth clears a threshold | Time in the market absorbs volatility; compounding does the work |

Real estate is never a first recommendation — it's illiquid and lumpy, and suggesting it before someone has closed their emergency-fund or insurance gap would be irresponsible.

## Finding every goal, without a longer form

The 7-step health check stays exactly as fast as it is today — it's the conversion moment, not the place to ask about wedding funds. Most goals are **implied**: inferred straight from data already collected, shown as editable goal cards with no new question. Only the genuinely unknowable ones are **prompted**, and only to the person they apply to, after they already have their score — framed as optional enrichment, never a gate.

| Condition (from existing data) | Candidate goal | How it's surfaced |
|---|---|---|
| `lifeStage = bachelor` | Wedding fund | Prompted — one toggle after the report: "Planning to get married?" |
| `lifeStage = married`, `numberOfKids` is 0/undefined | Baby / childbirth fund | Prompted — one toggle: "Planning a baby?" |
| `numberOfKids > 0`, each kid's age known | Per-kid education fund **and** per-kid marriage fund | Implied — one row per child, sized by that child's actual age (a 2-year-old and a 15-year-old need very different monthly SIPs for the same target) |
| Renting (`!ownsHome`) | Home-purchase fund | Implied |
| `!ownsCar` | Vehicle-purchase fund | Implied |
| `hasLoans = true` | Debt-free goal | Implied |
| `parentsSupport > 0` | Parents eldercare fund | Implied — already a safety-net checklist item, promoted to a funded goal too |
| Always | Retirement / FIRE | Implied — runs in the background for everyone, regardless of what else is active |

The detection rule itself stays deterministic — the same field-inspection pattern `detectLastStep()` already uses — never an AI guess at whether someone wants a baby fund.

> **Open question (flagged in the doc, not yet answered by the user):** should the wedding/baby-fund prompted toggles appear immediately after the score screen, or be deferred to a later visit? Decide this before building Task 2 of the Cursor prompt.

## Funding several goals at once

The safety-net steps (emergency fund, insurance) are genuinely sequential — one must close before the next gets a rupee. Goals are different, and a strict waterfall is the wrong model for them: a near-term goal with a hard deadline can't benefit from delay, but a long-horizon goal loses real value if it's deferred to zero while the near-term one is being funded, because the whole point of starting early is compounding runway. So once several goals are active, the goal-surplus pool is split as a **weighted parallel allocation** — weighted by urgency, with a floor so a long-horizon goal is never zeroed out — and the user sees the breakdown, not just whichever single goal happened to be picked as "primary."

**Example** — a married user with an 18-month wedding-adjacent goal, a 2-year-old, and standard retirement planning:

| Goal | Time left | Share of goal-surplus | Why |
|---|---|---|---|
| Wedding fund | 18 months | 60% | Hard deadline — can't benefit from delay |
| Child's education | 14 years | 25% | Early start matters most here; funded now, not deferred |
| Retirement | 30 years | 15% | Long runway, but never reduced to zero — every year not contributed is a year of compounding lost |

## Keeping the AI honest, per goal

The existing boundary — the engine computes every number, the AI only explains — stays hard. Where agentic reasoning earns its keep is the next step: a wedding fund, a child's education fund, and retirement each need genuinely different reference material and trade-offs, so one giant prompt covering all of them produces exactly the shallow, generic advice every other app already gives. Instead, run one focused retrieval-and-generation pass per active goal type, each grounded in that goal's own slice of the knowledge base, then assemble the results.

| Stage | What runs | Output |
|---|---|---|
| 1. Goal detection | Deterministic rule table (§ Finding every goal) | List of active goals for this user |
| 2. The numbers | Engine — a new `portfolioAllocation` module alongside `priorityEngine.ts` | Horizon bucket, target amount, monthly contribution, instrument-category split per goal; no AI involved |
| 3. Per-goal reasoning | One RAG + LLM call per active goal, grounded in that goal type's reference material | A specific, personalized "why" and instrument rationale for that one goal |
| 4. Assembly | Orchestrator merges every per-goal narrative with the engine's numbers | The unified Fix Plan report |

One real gap to close first: there's no risk-tolerance input anywhere in the form today. Age and horizon alone don't decide an equity/debt split — two people the same age can have very different risk appetites. A short 2–3 question risk profile (e.g. "if your portfolio dropped 20% in a bad month, would you sell, hold, or buy more") needs to be added, most naturally folded into the Goals step.

## Turning advice into a tracked habit

Most finance apps die exactly here: advice is given once and never checked again. The Fix Plan screen gets a "Start this plan" action; tapping it opens a consent popup that's explicit about what will and won't happen — a reminder and a Tracker line item will be created, nothing will ever be auto-invested or moved. On consent:

1. New `planned_investment` obligation rows are written into the existing obligation store — instrument category, suggested amount, start month, linked back to the priority item it came from.
2. They appear in Tracker's existing obligations UI alongside EMIs and bills, not as a new screen.
3. A notification fires near the start month, reusing whatever plumbing already drives the credit-card due-date reminders.
4. When the user marks it done, that feeds back into the Fix Plan so a step can show real "✓ started" — tracked, not just time elapsed.

**No execution, ever.** No brokerage linkage, no auto-debit into funds. This is a reminder-and-tracking layer, not an investment platform — that keeps Finkoin out of broker/RIA licensing territory and is also the right v1 scope.

This also closes a real gap already found in testing: Tracker today only syncs **loans** from the health check (via `syncFromHealthCheck`) — insurance premiums never flow through. Tracker needs a **Security** obligation category mirroring Analyse's own 5-bucket taxonomy (needs / wants / security / loans / investment) exactly, so a user's monthly Tracker view and their health-check report are always describing the same numbers.

## Bugs this work depends on fixing first

Three issues surfaced directly from testing feed straight into the plan above — fixing them is a prerequisite, not a nice-to-have, since the new work builds on these same numbers.

| Bug | Where | Fix |
|---|---|---|
| Bucket totals sum to 95%, not 100% | Report / PDF | The Security (insurance) bucket's 5% is being dropped from whatever total is summed — trace that call site and include it |
| No Security section in Tracker | Tracker | Add a Security obligation category; sync insurance premiums into it the same way loans already sync via `syncFromHealthCheck` (see § Turning advice into a tracked habit) |
| PF/PPF/NPS treated as a static balance | `financialEngine.ts` net worth + retirement goal math | Project each forward at its typical rate (EPF ~8.15%, PPF ~7.1%, NPS market-linked) instead of using today's flat number — needed for both the net-worth trajectory and for sizing an accurate top-up SIP per goal |

## What nobody else is sharing

Most Indian fintech apps (Groww, ET Money, Kuvera, Walnut) do one of two things: a generic calculator with no real personalization, or an AI chat layer with no real financial math underneath — usually with a product or commission conflict baked in, since they profit from whatever they recommend. The USP isn't "AI gives advice" — everyone claims that now. It's four concrete, buildable pieces:

1. **A financial life map.** Every active goal funded in parallel, with the real math shown — not one score or one goal at a time, which is what every competitor ships today.
2. **A forward net-worth trajectory.** Most apps show today's net worth as a static number. Very few project it 5/10/20 years out, including compounding PF/PPF/NPS and planned SIPs — a rare, genuinely shareable visual once built correctly (§ Bugs this work depends on fixing first).
3. **A score that lives, not a PDF that dies.** Tied to real tracked behavior through the Tracker sync, so the report updates as the user actually acts — not a one-time download.
4. **Structurally unbiased advice, said out loud.** Finkoin doesn't sell the funds or insurance it names. "We make nothing if you buy this" is a trust signal almost nobody else in this space can honestly claim, and the report should say it plainly.

A fifth piece is worth flagging for later, not now: an honest peer-benchmarking feature ("you're ahead of X% of people in your life stage and city") built on real, anonymized Finkoin user data once there's enough scale — replacing the fabricated "62nd percentile" line already flagged for removal from the report, with a real, labeled, methodology-backed version.

## Build sequencing

The original doc has a five-phase roadmap diagram here. In prose: Phase 1 is the prerequisite bug fixes (§ Bugs this work depends on fixing first — bucket totals, Tracker Security category, PF/PPF/NPS compounding). Phase 2 is multi-goal detection and the weighted parallel funding model (§ Finding every goal, § Funding several goals at once). Phase 3 is the agentic per-goal RAG/LLM reasoning plus the new portfolio-allocation instrument-split module (§ Keeping the AI honest, per goal). Phase 4 is the Tracker-sync consent-and-notification loop (§ Turning advice into a tracked habit). Phase 5 is surfacing the USP pieces on the report itself (§ What nobody else is sharing).

Each phase assumes the one before it shipped — Phase 2's goal-funding math needs Phase 1's corrected bucket totals and compounding PF/PPF numbers to be trustworthy; Phase 3's agentic reasoning needs Phase 2's goal list; Phase 4 needs Phase 3's plan to actually have something worth syncing.

This maps directly onto Tasks 1–7 in `ANALYSE_WEALTH_ADVISORY_CURSOR_PROMPT.md` in this repo, which is the execution plan built on top of this spec.
