# Finkoin Tracker — Complete Functionality & Design Spec (Web → Mobile Parity)

Generated: October 2026
Source: `money-os` web app (`app/tracker/`, `components/tracker/`, `lib/tracker*.ts`, `store/obligationStore.ts`)
Purpose: a line-by-line reference of everything the web Expense Tracker does — screens, data flow, business rules, CTAs, state machines, and design — so the React Native mobile app can be brought to full parity (or deliberately deviate, knowingly).

> How to use this doc with Cursor: paste "Read TRACKER_FUNCTIONALITY_SPEC.md first. Match this exactly unless told otherwise." at the top of any prompt that touches `mobile/app/(tabs)/tracker.tsx` or `mobile/components/tracker/*`.

---

## 0. TL;DR — Mobile Parity Status (read this first)

The mobile app already has a real port of the tracker's _core_ — not a stub. Comparing file-for-file:

| Piece                                    | Web file                                                                          | Mobile file                                                             | Status                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Category taxonomy                        | `lib/tracker-categories.ts` (302 ln)                                              | `mobile/lib/tracker-categories.ts` (302 ln)                             | ✅ Ported 1:1                                                                   |
| Credit card engine                       | `lib/trackerCreditCards.ts` (1156 ln)                                             | `mobile/lib/trackerCreditCards.ts` (1161 ln)                            | ✅ Ported                                                                       |
| Cash audit (debug)                       | `lib/trackerCashAudit.ts` (206 ln)                                                | `mobile/lib/trackerCashAudit.ts` (206 ln)                               | ✅ Ported                                                                       |
| Month income carry-forward               | `lib/trackerMonthIncome.ts` (327 ln)                                              | `mobile/lib/trackerMonthIncome.ts` (327 ln)                             | ✅ Ported                                                                       |
| Obligation↔expense sync                  | `lib/trackerObligationSync.ts` (258 ln)                                           | `mobile/lib/trackerObligationSync.ts` (225 ln)                          | ⚠️ Smaller — diff before trusting                                               |
| Obligation auto-learn                    | `lib/obligationLearn.ts` (89 ln)                                                  | `mobile/lib/obligationLearn.ts` (88 ln)                                 | ✅ **Confirmed byte-identical** (`diff` clean) — fully documented in §6.7 below |
| Profile income cache                     | `lib/trackerProfileIncome.ts` (86 ln)                                             | `mobile/lib/trackerProfileIncome.ts` (98 ln)                            | ✅ Ported                                                                       |
| Safety Pulse engine                      | `lib/trackerSafetyPulse.ts` (431 ln)                                              | `mobile/lib/trackerSafetyPulse.ts` (431 ln)                             | ✅ Ported 1:1                                                                   |
| Consent gate                             | `components/tracker/TrackerConsent.tsx`                                           | `mobile/components/tracker/TrackerConsent.tsx`                          | ✅ Ported                                                                       |
| Tracker icon set                         | `components/tracker/TrackerIcons.tsx` (376 ln, SVG)                               | `mobile/components/tracker/TrackerIcons.tsx` (277 ln)                   | ⚠️ Needs an RN SVG equivalent check                                             |
| Add expense modal                        | `components/tracker/AddExpenseModal.tsx` (1030 ln)                                | `mobile/components/tracker/AddExpenseSheet.tsx` (524 ln)                | ⚠️ Half the size — verify every field (card picker, add-card flow) is present   |
| Bucket accordion row                     | inline in `page.tsx`                                                              | `mobile/components/tracker/BucketCard.tsx` (72 ln)                      | ✅ Extracted as its own component on mobile (cleaner than web)                  |
| Safety Pulse card                        | `components/tracker/MonthSafetyPulse.tsx`                                         | `mobile/components/tracker/MonthSafetyPulse.tsx`                        | ✅ Ported 1:1 by line count                                                     |
| Main screen                              | `app/tracker/page.tsx` (2452 ln)                                                  | `mobile/app/(tabs)/tracker.tsx` (1403 ln)                               | ⚠️ Smaller — see gaps below                                                     |
| **Credit card dues panel**               | `components/tracker/CreditCardBillReminder.tsx` (592 ln)                          | **— none found —**                                                      | ❌ **Missing on mobile**                                                        |
| **Obligations checklist panel**          | `components/tracker/ObligationsChecklist.tsx` (562 ln)                            | **— none found —** (mobile only reads `checklist.length` for a counter) | ❌ **Missing UI on mobile**                                                     |
| **Add/edit obligation form**             | `components/tracker/AddObligationForm.tsx` (270 ln)                               | **— none found —**                                                      | ❌ **Missing on mobile**                                                        |
| **Collapsible accordion shell**          | `components/tracker/CollapsiblePanel.tsx` (117 ln)                                | **— none found —**                                                      | ❌ **Missing on mobile**                                                        |
| **Month detail / all-transactions page** | `app/tracker/[month]/page.tsx` + `ExpenseTable.tsx` + `MonthSummary.tsx`          | **— none found —**                                                      | ❌ **Missing on mobile**                                                        |
| Purple cash-audit debug drawer           | `components/tracker/PurpleCashAudit.tsx` (currently **commented out** on web too) | —                                                                       | ➖ Not needed (web has it disabled)                                             |

**Bottom line:** the money math, category rules, and the "add/edit an expense → Safety Pulse" loop are already ported faithfully. What's genuinely missing on mobile is the **Credit Card Dues panel**, the **Obligations checklist UI** (add/edit/skip/close obligations — mobile only shows a count today), and the **"view all transactions for a month" drill-down screen**. Sections 6, 7, and 9 below give you everything needed to build those three.

---

## 1. What the Tracker Is

A monthly cash-flow tracker ("Know it") sitting at `/tracker`. One user, one calendar month at a time. Every row is a single transaction (income or expense) in Supabase table `expense_transactions`, bucketed into 6 top-level groups (`income`, `needs`, `wants`, `habits`, `loans`, `investment`), each with ~10–20 subcategories. On top of raw transactions, three derived systems run automatically:

1. **Safety Pulse** — a rules-based (no AI) verdict: `safe` / `tight` / `over` / `unknown`, with a one-line headline, up to 2 reasons, and one recommended action.
2. **Credit Card Dues** — tracks what's charged vs paid per saved card, independent of the Obligations system, shown as its own mini-panel.
3. **Obligations Checklist** — recurring bills (EMIs, SIPs, insurance, rent) that auto-tick "paid" when a matching expense is logged, and can also be learned automatically from spending patterns.

Everything is **optimistic and soft-reloading**: the UI never blanks on a background refetch; only the first ever load shows a full-screen loader.

---

## 2. Screens & Routes

### 2.1 `/tracker` — `app/tracker/page.tsx` (2452 lines) — THE main screen

Client component wrapped in `<ProtectedGate>` (auth required). Internally one big `TrackerContent()` function component — not broken into subcomponents (unlike mobile's `BucketCard` extraction). Renders, top to bottom:

1. **Flip summary card** (INCOME / SPENT / LEFT, purple gradient, 3-column grid)
2. **"Show all" / "Hide all" pill button** (global privacy toggle)
3. **Income accordion row** (purple, always first, not part of the 5-bucket loop)
4. **5 bucket accordion rows**: Needs → Wants → Habits → Loans & Credit → Investments (fixed order, from `TRACKER_CATEGORIES`)
5. **MonthSafetyPulse card**, which nests inside it (as `children`):
   - **CreditCardBillReminder** (conditionally rendered)
   - **ObligationsChecklist**
6. **FeedbackWidget** (page context `"tracker"`)
7. **AddExpenseModal** (conditionally mounted, bottom-sheet style)

No bottom tab bar logic here (that's the shared app shell) — this is the scrollable body only.

### 2.2 `/tracker/[month]` — `app/tracker/[month]/page.tsx` (399 lines) — month drill-down

URL param `month` must match `^\d{4}-\d{2}$` (e.g. `2026-03`); invalid → `router.replace("/tracker")`. This is a **flat, non-accordion view**: one purple "TOTAL THIS MONTH" hero card, a `MonthSummary` category-breakdown bar list, and a plain `ExpenseTable` (HTML `<table>`) listing every transaction with Edit/Delete per row. Has its own "+ Add income" / "+ Add expense" header buttons and its own `AddExpenseModal` mount. **This is the screen that's completely absent on mobile.** On a phone, the natural analog is a dedicated "All transactions" screen reachable from the main tracker (e.g. a "See all →" link per bucket, or a month-total tap target), using a scrollable list of rows instead of an HTML table.

### 2.3 `app/tracker/layout.tsx` (50 lines)

Pure SEO metadata (title, description, OG/Twitter tags, canonical `/tracker`). No functional/runtime behavior — skip for mobile.

---

## 3. Data Model (Supabase)

### 3.1 `expense_transactions` (one row = one income or expense entry)

```sql
id uuid PK
user_id uuid → auth.users
date date                      -- local calendar date, NOT UTC-shifted
amount numeric(12,2)
category text                  -- legacy; mirrors subcategory
subcategory text
description text               -- user note; may contain internal tokens, see §6.1
bucket text                    -- "income" | "needs" | "wants" | "habits" | "loans" | "investment"
payment_method text             -- "upi" | "cash" | "netbanking" | "wallet" | "credit_card::{id}::{label}"
month text                      -- en-IN long month name e.g. "March" — MUST match locale used on write & read
year integer
created_at timestamptz
payment_card_id uuid → user_credit_cards   -- optional, added by tracker_credit_cards.sql
payment_card_label text
```

RLS: `auth.uid() = user_id` on all ops. **Important gotcha**: rows are fetched by `.eq("month", monthName).eq("year", year)` where `monthName` is produced by `date.toLocaleString("en-IN", { month: "long" })`. If the mobile insert path ever formats month differently (e.g. `"Mar"` or device locale instead of `"en-IN"`), rows silently vanish from the month view. Always derive `month`/`year` columns from the same locale-fixed helper, never from the device's default locale.

### 3.2 `tracker_consent` — one-row-per-user consent gate

```sql
user_id uuid PK → auth.users
consent_given boolean
consent_at timestamptz
consent_version text default 'v1'
```

Current required version is `"v2"` (`TRACKER_CONSENT_VERSION` in `trackerCreditCards.ts`). A `v1` or missing-version row forces re-consent — this was a breaking change when card-storage disclaimer text was added. Local cache: `localStorage["finkoin_tracker_consent"] === "v2"` (`hasTrackerConsentLocal()`), checked before ever hitting the DB, so returning users never see a consent flash.

### 3.3 `user_credit_cards` — saved card metadata (nickname + billing/due day only, never a PAN)

```sql
id uuid PK
user_id uuid
nickname text NOT NULL
last4 text NULL              -- optional, user-entered, last 4 digits only
billing_day integer 1-31 NULL
due_day integer 1-31 NULL
created_at, updated_at timestamptz
```

Mirrored in `localStorage["finkoin_credit_cards_{userId}"]` as a read-through/write-through cache (`loadCreditCardsMerged` — DB is source of truth, local cache fills gaps when offline, see §6.1).

### 3.4 `financial_obligations` + `obligation_checklist` (recurring bills)

```sql
financial_obligations:
  id, user_id, title, category, amount, frequency
  due_day int?, due_month int?, due_date date?
  source text          -- "manual" | "health_check" | "tracker_learned"
  is_active boolean
  remind_days_before int
  notes text?

obligation_checklist:
  id, obligation_id → financial_obligations
  checklist_month date   -- always the 1st of the month, local
  expected_amount numeric
  status text             -- "pending" | "paid" | "skipped" | "auto_debit"
  paid_at timestamptz?
  paid_amount numeric?
```

Checklist rows for a month are generated by **RPC `generate_monthly_checklist(p_user_id, p_month)`** — a Postgres function (not shown in this repo's SQL exports; treat as already deployed) that upserts one `obligation_checklist` row per active obligation for that month (idempotent — `ON CONFLICT DO NOTHING`, which is why the client has to self-heal stale `expected_amount` on read, see §8.4).

Credit card bills are explicitly **excluded** from this system: `category = "credit_card"` obligations are periodically deactivated (`deactivateAllCreditCardObligations`) because CC dues live only in the separate Credit Card Dues panel (§7.2), never in the checklist (§7.3).

---

## 4. State Layers

Three layers, in order of persistence:

1. **Supabase** — the only durable store for transactions, consent, cards (also mirrored to localStorage), obligations, checklist.
2. **Zustand stores**:
   - `useAuthStore` — just `user` (id) is read here.
   - `useFinancialStore` — tracker reads `lastSubmission` + `result` only, to know `analyseCompleted` (gates whether to show the "set up your calendar" empty-state nudge) and to fire `syncFromHealthCheck` once analyse data exists.
   - `useObligationStore` — full CRUD + checklist cache for obligations (detailed in §9).
3. **Component-local `useState`** in `page.tsx` — the bulk of UI state: which bucket is expanded, per-section privacy-eye flags, which month is selected, the add/edit modal's draft defaults, optimistic CC-payment overlay, etc. (full list in §8.1).

There is **no dedicated `trackerStore.ts`** — unlike `obligationStore`/`financialStore`, the tracker's own transaction list is plain component state fetched imperatively via `fetchTransactions()`, not a Zustand slice. If porting to a global store on mobile, this is a legitimate architecture improvement to consider, but note the soft/hard fetch semantics (§8.2) must be preserved exactly or the "silent background refresh" UX breaks.

---

## 5. Category Taxonomy — `lib/tracker-categories.ts`

Six buckets, each with a brand color, an icon, a **budget cap (% of income)**, and a fixed subcategory list. This table is the single source of truth for the Add-Expense category/type pickers, the bucket accordions, and the over-budget math.

| Bucket key   | Label                          | Color     | Cap % of income                      | Icon     |
| ------------ | ------------------------------ | --------- | ------------------------------------ | -------- |
| `income`     | Income                         | `#534AB7` | 0 (no cap)                           | wallet   |
| `needs`      | Needs / mandatory expenses     | `#534AB7` | **30%**                              | home     |
| `wants`      | Wants / non-mandatory expenses | `#6B63C9` | **5%**                               | party    |
| `habits`     | Habit expenses                 | `#7A72D4` | 0 (no cap — tracked, never budgeted) | alert    |
| `loans`      | Loans & Credit                 | `#5B54B0` | **40%**                              | card     |
| `investment` | Investments                    | `#4F48A8` | **20%**                              | trending |

Full subcategory list per bucket (id → label → icon) — reproduce exactly on mobile, including the legacy id kept for backward compatibility:

**needs** (cap 30%): `rent`→Rent, `maintenance`→Maintenance (society/rent), `groceries`→Groceries, `vegetables`→Vegetables & fruits, `milk`→Milk & dairy, `electricity`→Electricity bill, `water`→Water bill, `gas`→Gas/LPG, `internet`→Internet/broadband, `mobile`→Mobile recharge, `school_fees`→School/college fees, `medicine`→Medicine, `doctor`→Doctor/hospital, `domestic_help`→Maid/cook/driver, `fuel`→Fuel/petrol/diesel, `cab`→Cab/taxi, `auto`→Auto rickshaw, `metro_bus`→Metro/bus, `transport_essential`→Transport to work/fuel (**legacy, hidden from the add-expense picker** via `pickerSubcategories()` but still resolved for old rows), `others`→Others.

**wants** (cap 5%): `dining`, `coffee`, `snacks`, `movies`, `entertainment`, `shopping`, `electronics`, `beauty`, `gym`, `travel_leisure`, `gifts`, `subscriptions`, `online_shopping`, `others`.

**habits** (cap 0 — no budget, just visibility): `cigarettes`, `alcohol`, `gutka`, `gambling`, `paan`, `others`.

**loans** (cap 40%): `home_loan_emi`, `car_loan_emi`, `personal_loan`, `credit_card` (⚠️ special — see §6.1, this is a _bill payment_, not a purchase), `education_loan`, `bike_loan`, `bnpl`, `other_loan`, `others`.

**investment** (cap 20%): `savings_account`, `sip`, `ppf`, `epf`, `nps`, `stocks`, `fd`, `gold`, `insurance_premium`, `rd`, `crypto`, `loan_prepayment` (⚠️ special — excluded from _totals/caps_ via `TRACKER_TOTAL_EXCLUDED_SUBCATEGORIES`, but **still** reduces purple LEFT because it's cash leaving the account — see §6.1), `others`.

**income**: `salary`, `freelance`, `rental`, `dividend`, `bonus`, `other_income`.

Two helper rules baked into this module, both must be ported exactly:

- `countsTowardTrackerTotals(txn)` — false if subcategory is in the excluded set (`loan_prepayment`) OR if it's a credit-card _purchase charge_ (`isCreditCardCharge`). Used for bucket totals, caps, and Safety Pulse aggregation.
- `pickerSubcategories(bucket)` — filters out `transport_essential` from the Add-Expense UI only (old rows with that id still display fine elsewhere).

---

## 6. Core Business-Logic Modules (the part most likely to be gotten subtly wrong)

### 6.1 `lib/trackerCreditCards.ts` (1156 lines) — the most complex file in the feature

**Mental model, read this twice:** a credit card purchase is _debt_, not _cash spend_. Paying the card's bill (by UPI/cash/netbanking/wallet) _is_ cash spend. The whole file exists to keep those two flows from ever being double-counted or dropped.

**Payment method encoding.** `payment_method` on a transaction is either a plain rail (`"upi"`, `"cash"`, `"netbanking"`, `"wallet"`) or, for card purchases, an encoded string: `` `credit_card::${cardId}::${label}` ``. Helpers:

- `isCreditCardPaymentMethod(method)` — true for `"card"`, `"credit_card"`, `"creditcard"`, or anything starting with `credit_card::`.
- `parseCreditCardPaymentMethod(method)` → `{ cardId, label }`.
- `encodeCreditCardPaymentMethod(card)` builds the string (label's `|` chars get sanitized to `/` first — the encoding uses `::` as separator so don't let labels contain that).
- `isCreditCardCharge(txn)` — a _purchase_ charge: true only if paid via a card AND it is **not** the special `loans/credit_card` bill-payment subcategory (that one is a cash outflow, see below).

**The one subcategory with two totally different meanings**: `bucket === "loans" && subcategory === "credit_card"` is "pay my card bill." Whether _that_ row counts as cash spend depends entirely on its own `payment_method` — if the user somehow set payment method to another credit card while paying a bill, the modal force-resets `payment_method` back to `"upi"` the moment that combination appears (see `AddExpenseModal` effect in §7.1) because "pay a card bill with a card" makes no sense and would double-debt.

**Cash spend formula** — `countsTowardCashSpend(txn)`:

```
if bucket === "income" → false
if bucket === "loans" && subcategory === "credit_card" → true only if payment_method is a cash rail (not another card)
if payment_method is a credit card → false (debt, not cash — purchases on any OTHER bucket/subcategory)
else → true
```

`sumCashSpend(transactions)` sums `amount` over rows passing this — **this is literally the "SPENT" figure and therefore the "LEFT" figure** on the purple summary card. `sumOnCardsSpend()` is the complementary sum (shown as "On cards this month: ₹X" on the summary card, informational only, never subtracted from LEFT).

**Saved cards**: dual-write pattern. `loadSavedCreditCards(userId)` reads `localStorage["finkoin_credit_cards_{userId}"]`. `loadCreditCardsMerged(userId)` is the one actually used by the UI — it queries `user_credit_cards` in Supabase (source of truth), falls back to local cache on error/offline, migrates any local-only cards up to the DB, and re-writes the merged list back to local cache. `upsertSavedCreditCard()` does local-write-then-fire-and-forget-DB-write (`persistCreditCardToDb`, not awaited) — i.e. **UI updates optimistically before the DB write confirms**. Replicate this exact optimism on mobile or card edits will feel sluggish.

**Due-day suggestion**: `suggestDueDayFromBilling(billingDay, offsetDays = DEFAULT_DUE_OFFSET_DAYS = 20)` — adds 20 days to the billing day (using a fixed reference year 2026 to dodge Feb edge cases), used to auto-fill "Due day" the moment the user types a billing day in the add-card form, if they haven't typed their own due day yet.

**Bill status engine** — `buildCreditCardBillStatuses({ cards, transactions, asOf, previousMonthChargesOnly })` — this is what powers the Credit Card Dues panel (§7.2). For each saved card:

1. `charged` = sum of card-purchase rows matched to that card id (or by label if id missing on legacy rows, or by "sole card" fallback if the user has exactly one card and some rows have no card id at all). When `previousMonthChargesOnly: false` (the tracker page passes this), **the pool is previous + current month transactions**, so a charge made this month shows as due immediately rather than waiting for next month.
2. `paid` = sum of matched "pay bill" cash-rail rows (bucket `loans`/`credit_card` with a cash payment method), matched by the same id/label/sole-card fallback logic, PLUS a fuzzy match on the row's description against `"Pay bill · {label}"` patterns (`parsePayBillLabel`/`billPaymentMatchesCard`).
3. `remaining = max(0, charged − paid)`.
4. `status`: `"due"` if remaining > 0, `"paid"` if remaining is 0 but charged or paid > 0, else `"clear"`.
5. `overdue`: remaining > 0 AND the card's most recent due date (from `dueDay`, defaulting via `suggestDueDayFromBilling` if only `billingDay` is set) is strictly before `asOf`.
6. **Orphan handling**: card purchases with no matching saved card (e.g. deleted card, or never-added) still surface as a due line using the previous-calendar-month-only window as a fallback, so spend is never silently lost from the Dues panel.
7. Final sort: `due` first, then `paid`, then `clear`; within a group, larger `remaining`/`charged` first.

**Optimistic payment overlay**: the tracker page keeps `ccOptimisticPayments: {cardId, amount}[]` in local state, added the instant a "Pay" CTA's save succeeds (before the fresh transaction refetch lands), and passed into `CreditCardBillReminder` to boost `paid` client-side so the UI doesn't flash back to "due" for a second. An effect elsewhere drops entries from this array once a matching real bill-payment transaction is actually seen in `transactions`/`ccBillHistory` (matched by card-id token in description, parsed pay-bill label, or a same-bucket/subcategory + matching-amount loans→credit_card row).

**Hidden due lines / dismissed reminders**: per-user localStorage sets — `finkoin_cc_due_hidden_{userId}` (card ids the user explicitly removed from the Dues panel; past expenses are untouched, only the due _line_ disappears) and `finkoin_cc_bill_dismissed_{year}_{monthName}` (currently unused by the main page but exported for reuse).

**Display helpers**: `displayExpenseDescription(desc)` strips any leftover internal `[#cardId]` tokens before showing a note anywhere in the UI (legacy rows may still have these baked into the stored description; never re-persist them — `handleSave` in the Add Expense modal explicitly re-cleans on every save). `formatCreditCardLabel(card)` → `"{nickname} ****{last4}"` or just nickname/last4/"Credit card" depending on what's set.

### 6.2 `lib/trackerCashAudit.ts` (206 lines) — dev-only explainer, not user-facing by default

Classifies every transaction into one of: `income`, `included` (plain cash spend), `included_loan_emi`, `included_loan_repayment`, `included_cc_bill_pay`, `cc_purchase` (excluded — paid by card), `invalid_amount`. Produces a full line-by-line breakdown (`CashAuditResult`) used by:

- A `console.group`/`console.table` dump that fires on every transaction load **only in `NODE_ENV === "development"`** (see the dev-tools effect in `page.tsx`, §8.1 item "DevTools dump").
- The `PurpleCashAudit` component (§7.6), which is currently **commented out** of the live page but kept in the codebase as a togglable "How is LEFT calculated?" debug drawer.

Not required for mobile parity unless you also want a debug drawer, but worth porting as a dev tool since "why is LEFT wrong" is the single most likely support question for this feature.

### 6.3 `lib/trackerMonthIncome.ts` (327 lines) — auto-seeding next month's income

This is the logic behind "income auto-fills when you open a new month" — one of the more magical-feeling behaviors and easy to get subtly wrong.

**Month unlock gate**: `trackerForwardLimit(today)` — the tracker's month-switcher cannot go past the _current_ calendar month **unless** `isNextTrackerMonthUnlocked(today)` is true, which happens from the **last Friday of the current month onward** (`lastFridayOfMonth`) — salary typically credits around month-end, so the next month unlocks a few days early. Before that Friday, the → arrow on the summary card is disabled (`isAtForwardLimit`).

**One-salary, one-carry-forward invariant.** `planMonthIncomeFromPrior({ previousTxns, currentTxns, profileSalary })`:

1. `salaryAmount` = previous month's **largest** `salary`-subcategory income row (`primarySalaryAmount` — deliberately takes the max, not a sum, to tolerate accidental duplicate salary rows), falling back to the user's profile monthly salary (from the health-check, cached via `trackerProfileIncome.ts`) if there's no prior salary row at all.
2. `savingsAmount` = previous month's leftover **salary pocket** (`salaryPocketTotal` = prior salary + prior carry-forward, NOT including bonuses/freelance) minus that month's cash spend (`computeMonthLeftover`) — i.e. what's left over from last month's main income rolls forward as a dedicated "Saving from last month" row (`SAVINGS_CARRY_FORWARD_DESC = "Saving from last month"`, matched purely by exact description string, case-insensitive).
3. `needsSalaryRow` / `needsSavingsRow` — true only if the _current_ month doesn't already have one.
4. `displayTotal` — what the Income accordion shows even before the DB write lands (so the UI never looks like it's lying about income for a few hundred ms).

**Auto-seed + self-healing cleanup effect** (`page.tsx`, the biggest/most defensive `useEffect` in the file): on/after the 1st of a tracker-started month, if a salary or CF row is missing, it:

1. Computes a cleanup plan (`planAutoIncomeCleanup`) that finds **duplicate** salary rows (keeps the one closest to the target amount, drops the rest) and **duplicate** CF rows (same logic), and corrects the kept CF row's amount if it's drifted from the freshly computed target by ≥ ₹1.
2. Re-reads fresh rows from Supabase right before writing (defends against React Strict Mode double-invoking effects, or two tabs racing) — a `incomeSyncKeyRef` guards against re-running the same plan twice.
3. Deletes extras, updates the kept CF amount, re-plans against the post-cleanup rows, and **only then** inserts whatever salary/CF rows are still missing.
4. Refetches (`soft: true`) if anything changed.

Never auto-seeds a month **before** `trackerStart` (the user's consent date or first-ever transaction month, whichever is earlier — computed in its own effect and used as the back-navigation floor too).

**Obligation category mapping** (`EXPENSE_SUBCATEGORY_TO_OBLIGATION`) also lives in this file (slightly odd home for it, but it's imported by `trackerObligationSync.ts`) — maps expense subcategory ids straight to obligation categories, e.g. `home_loan_emi → loan_emi`, `sip/mutual_fund → investment_sip`, `credit_card → credit_card`, `rent → rent`, `life_insurance/insurance_premium → insurance_life`, etc.

### 6.4 `lib/trackerObligationSync.ts` (258 lines) — ties logged expenses to the obligations checklist

Two independent jobs:

**A) Guess an obligation category from a raw expense** (`obligationCategoryFromExpense`) — tries, in order: (1) direct subcategory→category map from §6.3, (2) bucket-level heuristic (`loans` bucket + non-"others" subcategory → `loan_emi` unless it's specifically `credit_card`; `investment` bucket with empty/`sip` subcategory → `investment_sip`), (3) keyword search in the free-text description against `OBLIGATION_HINTS` (longest keyword wins on ties — e.g. `"health insurance"` beats `"insurance"`).

**B) Match & tick checklist items.** The whole system is **amount-first**: `itemAmountMatches(amount, item)` requires the expense amount to be within ₹1 of either the checklist row's `expected_amount` OR the live obligation's current `amount` (handles the case where the obligation was edited after the checklist row was generated and the RPC's `ON CONFLICT DO NOTHING` left the row stale) OR the row's own `paid_amount`. **Category/title similarity is only a tie-breaker** (`obligationMatchScore`) when multiple pending checklist rows share the same amount — never a gate on its own. CC bill payments are explicitly excluded from ever touching obligations (`isCreditCardObligationExpense`/`isEligibleExpense`).

Two call shapes used by `page.tsx`:

- `findPendingChecklistForExpense(checklist, expense)` — single best match for a just-saved expense (used right after `onSaved` in the Add Expense modal flow, §7.1/§8.3).
- `planObligationExpenseSync({ checklist, expenses })` — bulk reconciliation across _all_ this month's expenses vs _all_ non-skipped checklist items, producing `{ markPaid: [{id, amount}], markUnpaid: [id] }` — this runs on every transaction-list change (an effect keyed by `obligationSyncKeyRef`) so that **deleting** the expense that had satisfied an obligation automatically un-ticks it, and so a manually-added matching expense ticks an obligation without the user doing anything explicit.

### 6.5 `lib/trackerProfileIncome.ts` (86 lines) — cross-feature salary lookup

Fetches the user's monthly salary from the **health-check** data (`user_analysis.profile.monthlySalary`, falling back to `user_analyse_snapshots.payload.profile|lastSubmission.monthlySalary`) — this is what backs the "no income logged yet, but we know your salary from Analyse" fallback used throughout the tracker (purple card display income, income-accordion empty state, month-income auto-seed). Three-tier cache: in-memory `Map` (per tab/session) → `sessionStorage["finkoin_tracker_profile_income_v1:{userId}"]` → Supabase. **No TTL** — only invalidated explicitly via `invalidateProfileMonthlySalaryCache(userId)`, which should be called right after a successful Analyse submission writes a new snapshot (verify this call exists wherever mobile's Analyse-submit flow lives, or stale salary will linger for the whole session).

### 6.6 `lib/trackerSafetyPulse.ts` (431 lines) — the rules engine behind the pulse card

Pure function `computeMonthSafetyPulse({ currentTxns, previousTxns, fallbackIncome, monthIndex, year, asOf })` → `SafetyPulseResult`. No AI call — fully deterministic, which is exactly why it's cheap to port 1:1 (mobile already has, per §0).

Pipeline:

1. `aggregateMonth(txns, fallbackIncome)` — bucket totals (only txns passing `countsTowardTrackerTotals`), income (logged income if any, else fallback), `remaining = income − totalSpent`, `savingsRate = remaining/income`.
2. `buildBucketHealth(current)` — for each of the 5 spend buckets with a cap > 0: `capAmount = income × cap%`, `overBy = max(0, spent − capAmount)`, status `over`/`ok`/`skip` (skip = cap is 0, i.e. `habits`).
3. `buildMovers(current, previous)` — subcategory-level month-over-month deltas ≥ ₹100, top 3 by absolute delta.
4. Day-of-month projections (current calendar month only): `projectedMonthSpend` linearly extrapolates `totalSpent` from `dayOfMonth` to the full month; `dailySafeSpend = max(0, remaining) / daysLeftInMonth`.
5. **Status decision tree** (first match wins, in this exact order — do not reorder, the priorities matter):
   1. No spend data and no income → `unknown`.
   2. Spend but zero income → `tight`, reason "no income logged", action "log this month's income."
   3. `totalSpent > income` → `over`, "already over by ₹X."
   4. On/after day 8 of the month AND projected full-month spend > `income × 1.05` → `over`, "at this pace you'll finish near ₹X."
   5. Any bucket over its cap → `tight`, names the worst offender with its %-of-income vs cap.
   6. Daily safe spend for remaining days < 35% of the month's average daily income → `tight`.
   7. Otherwise (has data or has income) → `safe`.
6. Up to 2 `reasons` total: the primary one from the tree above, then (if room) a MoM total-spend delta ≥ ₹500, then (if still room) the #1 mover if it's a positive (worsening) delta and not in `investment`/`loans`.
7. One `action` string, picked by its own independent priority chain: biggest over-cap bucket (with a specific "trim {leaking subcategory} by ₹X" if a matching mover exists) → "no investment logged, aim ~20%" → "habits took ₹X, redirect it" → "keep near ₹X/day for the rest of the month" → positive reinforcement if a mover improved → generic "stay on plan" / "pause non-mandatory spend" fallbacks.
8. `headline` is one of 6 fixed strings keyed by `{status} × {isCurrentCalendarMonth}` (recoverable framing for the live month, past-tense framing for a historical month).

Every currency figure in `reasons`/`action` is a **plain string with ₹ already baked in** — the component masks these with a regex (`r.replace(/₹[\d,]+/g, "₹••••••")`) when the privacy eye is off, rather than the engine returning separate masked/unmasked variants. Port that masking approach as-is; don't try to re-derive numbers from the string on mobile.

### 6.7 `lib/obligationLearn.ts` (89 lines) — deciding when a logged expense becomes a recurring obligation

**Confirmed already ported byte-for-byte identical on mobile** (`diff lib/obligationLearn.ts mobile/lib/obligationLearn.ts` is clean) — this section exists so the decision logic is documented, not because mobile needs new code here.

This is the piece that drives step 3(b) of §8.3: after a non-income, non-CC-bill expense is saved, should Finkoin silently create a new obligation, surface the "add to your obligations?" nudge (§7.3), or do nothing? Two pure functions, called in sequence:

**`decideObligationLearn({ description, amount, category, existing, priorTransactions })` → `"auto" | "suggest" | "skip"`**

1. Invalid/zero amount → `"skip"` immediately.
2. If an **existing active obligation** already has the same category and an amount within ₹100 → `"skip"` (don't create a near-duplicate).
3. Otherwise, normalize the expense's description (`normalizeDesc`: lowercase, strip any `[#cardId]` token, collapse whitespace) and scan `priorTransactions` (prior months' expenses, not including the one just saved) for a **fuzzy repeat**: an amount within `max(₹100, 15% of amount)` AND a description that shares its first-12-character prefix with the candidate's description (checked both directions — `prev.includes(desc.slice(0,12))` or `desc.includes(prev.slice(0,12))`). If a prior match like that exists → `"auto"` (clearly recurring — e.g. the same "Zomato dinner"-style wording at a similar price two months running). No match → `"suggest"` (looks possibly recurring, but ask first).

**`candidateFromExpense(description, amount, category)` → `{ title, category, amount }`** — trivial builder: title is the trimmed description, or the category with underscores turned to spaces if there's no description at all.

**`shouldLearnObligationFromExpense({ obligationCategory, decision, fromMappedSubcategory })` → `"add" | "suggest" | "skip"`** — the final gate, combining the above with _how confidently_ the category was guessed (`fromMappedSubcategory` = true only when `obligationCategoryFromExpense`, §6.4, matched via the direct subcategory→category table, e.g. `home_loan_emi → loan_emi`, rather than a weaker bucket-heuristic or free-text keyword guess):

- No category guessed at all → `"skip"`.
- Category is `credit_card` → always `"skip"` — **CC bills must never spawn obligation rows**, full stop, regardless of the learn decision (mirrors the hard rule in §6.4/§3.4 that CC bills live only in the Dues panel).
- `decision === "auto"` → `"add"` (silently create it — no user prompt at all).
- `decision === "suggest"` → `"add"` if the category came from a confident subcategory mapping, else `"suggest"` (show the nudge).
- `decision === "skip"` → `"skip"`, unless the category came from a confident subcategory mapping, in which case still `"add"` (a subcategory like `home_loan_emi` is confident enough evidence of recurrence on its own, even the very first time it's logged, that it skips the "does this repeat" check entirely).

Net effect worth internalizing: an expense in a bucket/subcategory the app already strongly associates with recurring bills (loan EMIs, SIPs, insurance, rent) tends to become an obligation on the **first** time it's logged, no repetition needed. An expense that's only loosely matched (free-text keyword hit, or a bucket-level heuristic) needs either a second occurrence (`"auto"` via the fuzzy-repeat check) or an explicit user tap on the suggestion nudge before it becomes a standing obligation. This asymmetry is intentional — it keeps the obligations list from filling up with one-off purchases while still catching real EMIs immediately.

---

## 7. Component-by-Component Breakdown

### 7.1 `AddExpenseModal.tsx` (1030 lines) — the universal add/edit sheet

Bottom-sheet modal (`position: fixed`, slides from bottom, `border-radius: 20px 20px 0 0`, max-width 480, max-height 90vh, backdrop click-to-close via a `role="presentation"` wrapper that stops propagation on the sheet itself). One component handles **add income, add expense, add savings, edit income, edit expense, edit savings** — title and CTA text are derived (`isIncome`/`isSavings`/`editExpense` booleans → 6-way ternary chain for `modalTitle` and `primaryCta`).

**Fields, top to bottom:**

1. **Amount** (`MoneyInput`, label flips to "Income amount (₹)" vs "Expense amount (₹)"), parsed via `handleMoneyInput(value, 0, 1_000_000_000)`.
2. **Date** — native `<input type="date">`, `max` = `dateMax` (the later of `maxDate` prop or today — so future months can still log future-dated rows up to their own month-end, see the `maxDate` passed from `page.tsx`: always `localISODate(new Date(selectedYear, selectedMonth + 1, 0))`, i.e. the last day of whatever month is selected). On fresh "add" (no `editExpense`), the date auto-tracks local midnight rollover via a self-rescheduling `setTimeout` (`msUntilNextLocalMidnight`) — if the sheet is left open across midnight, the default date silently advances, but **only if the user hasn't already touched it** (`prevDate === prevToday ? next : prevDate`).
3. **Category grid** (3-column, only shown if `defaultBucket` prop wasn't forced by the caller — e.g. tapping "+ Add expense" inside an already-expanded bucket skips this step entirely). Selecting a category resets `subcategory` to `""`.
4. **Type / subcategory** — pill list from `pickerSubcategories(bucket)`, only shown once a bucket is chosen.
5. **Note** (optional free text).
6. **Paid via** — only shown when `bucket !== "income"`. Five pills: UPI, Cash, Credit card, Net banking, Wallet — **except** when `bucket === "loans" && subcategory === "credit_card"`, where the Credit card pill itself is filtered out (you can't pay a card bill "with a card") and a one-line purple-highlighted hint explains that paying via UPI/cash/netbanking/wallet reduces Money Left.
   - Selecting "Credit card": if the user has zero saved cards, auto-opens the add-card mini-form; if exactly one card and none selected yet, auto-selects it.
   - Saved-card picker (when `paymentMethod === "credit_card"`): radio-like list of cards (`formatCreditCardLabel`, plus billing/due day subtext), each with its own inline Delete button; "+ Add new card" reveals name/billing-day/due-day inputs (due day auto-suggests from billing day the moment billing day is typed, only if due day is still blank).
7. **Error banner** (red, shows API/validation errors inline, never a toast/alert).
8. **Primary CTA** button — full width, 52px tall, disabled + "Saving..." label while in flight.

**Save flow** (`handleSave`):

1. Validate amount + bucket + subcategory are all set, and user is signed in.
2. If paying by credit card, resolve the actual card object (must exist — re-opens add-card form with an error if not).
3. Parse the date string as a **local** calendar date (`new Date(y, m-1, d)`, never `new Date("yyyy-mm-dd")` which UTC-shifts) to derive the `month`/`year` columns.
4. Clean the description through `displayExpenseDescription` (strip any `[#cardId]` tokens) — with one special-case exception: if this is a loans/credit_card row with a `defaultDescription` prop that matched "Pay bill" phrasing but the user's typed description didn't, prefer the default's "Pay bill" phrasing so the CC Dues panel can still pattern-match it later.
5. Insert or update `expense_transactions`, racing the Supabase call against a 15-second client-side timeout that rejects with a friendly "Save is taking too long" message (prevents an infinite spinner on a dead connection).
6. On success, call `onSaved({ amount, category, subcategory, bucket, description, date, isEdit })` — the **parent** (`page.tsx`) does all the obligation-learning/ticking side effects from this callback (§8.3); the modal itself has zero obligation-system knowledge.

### 7.2 `CreditCardBillReminder.tsx` (592 lines) — "Credit card dues" panel ❌ missing on mobile

Rendered inside `MonthSafetyPulse`'s `children` slot, only when viewing the current month (or the forward-unlocked next month) **and** there's some CC signal (a saved card, a CC payment-method row anywhere in the recent history, or a loans/credit_card row). Wrapped in `CollapsiblePanel` (title "Credit card dues", icon `card`, `defaultBorder={false}`), default collapsed unless `optimisticPayments` is non-empty (auto-opens right after a successful Pay).

Body:

- Contextual helper paragraph (varies by whether anything is due vs all paid vs nothing tracked yet).
- "All caught up" green note if nothing's due but something was paid before.
- **Due list** (`dueStatuses` — status `due` and `remaining > 0`), each row:
  - 26×26 status dot: filled green+check if paid, outlined red if overdue, outlined purple otherwise.
  - Label + due-date subtext (`formatDueLabel`: "Overdue since {date}" / "Pay by {date}" / "Due around day {N}" / "Due from salary this month" as progressively weaker fallbacks) + "· Charged ₹X · Paid ₹Y" when there's partial payment history.
  - **"Pay ₹{remaining}" button** → calls `onPayBill(amount, label, cardId)`, which in `page.tsx` opens the Add Expense modal pre-filled as `bucket: "loans", subcategory: "credit_card", paymentMethod: "upi", description: "Pay bill · {label}"` and remembers `pendingCcPayCardId` so the optimistic-payment overlay (§6.1) activates the instant it saves.
  - Pencil button → inline due-day editor (number input 1–31, Save/Cancel, validates range).
  - Trash button → confirm dialog; if it's a saved card, deletes the card entirely (`deleteSavedCreditCard`, which also soft-deactivates any matching obligation and hides the due line); if it's an orphan (no saved card), just hides that due line (`hideCreditCardDueLine`) without touching any card record.
- One-time cleanup effect on mount: deactivates any stray `credit_card`-category obligations for this user (defensive — CC bills must never live in the Obligations system).

**Design note for the mobile port**: this needs a swipeable or long-press delete affordance instead of hover-visible icon buttons, and the inline due-day editor should probably become a small bottom sheet rather than an inline row — but the underlying data/actions are exactly `buildCreditCardBillStatuses` + the four button handlers above.

### 7.3 `ObligationsChecklist.tsx` (562 lines) + `AddObligationForm.tsx` (270 lines) — ❌ missing UI on mobile (mobile only reads the count)

Also lives inside `MonthSafetyPulse`'s children, below the CC Dues panel. Wrapped in the same `CollapsiblePanel` pattern (title "This month's obligations", icon `calendar`).

**Learned-obligation nudge** (shown above the panel, not inside it): when `learnedSuggestion` is set (passed down from `page.tsx`'s obligation-learning logic, §8.3) and its category isn't `credit_card`, a purple callout: _"Add to your obligations? Looks like '{title}' (₹{amount}) is a recurring payment."_ with "Yes, add it" (inserts the obligation, regenerates the checklist, dismisses) / "Not now" (just dismisses).

> **Already ported on mobile, just not as a separate component.** Confirmed by grep: `mobile/app/(tabs)/tracker.tsx` imports `candidateFromExpense`/`decideObligationLearn`/`shouldLearnObligationFromExpense` directly, keeps its own `learnedObligation` state, and renders this exact nudge inline (around line 1175, with "Add as obligation" / dismiss). So the _nudge_ already exists — what's still missing is everything else in this section: the full checklist list below it (rows, Edit/Skip/Restore/Mark closed, the purple progress strip, the empty states) and the `AddObligationForm` bottom sheet. Don't rebuild the nudge; build the panel around it.

**Empty state**: if there's no obligation data at all AND the health-check hasn't been completed (`!analyseCompleted`), shows a bigger "Set up your financial calendar" nudge with a single "Add first obligation" CTA. If health-check _has_ been completed, this empty nudge is suppressed (the assumption being obligations will auto-populate from `syncFromHealthCheck`, §9).

**Populated state** — purple summary strip ("Keep this aside" total obligated, progress bar of paid/total, "✓ Paid: ₹X" / "Pending: ₹Y" footer) + one row per checklist item:

- Status dot: green+check (paid/auto_debit), grey dash (closed/inactive obligation — struck through), outlined (pending/skipped).
- Category emoji (plain Unicode emoji map — 🛡️ life, 🏥 health, 🚗 vehicle, 🏦 loan EMI, 📈 SIP, 💰 PPF, 🏛️ FD, 💳 credit card [shouldn't appear — filtered out upstream], 📱 subscription, 🏠 rent, 📋 tax, 📌 other).
- Title (struck through if closed), subtext: "Due on {N}th" (monthly) / "Due in {Mon}" (yearly) / raw frequency string, plus "· Paid {date}" or "· Skipped" suffixes.
- Amount (prefers live `obligation.amount`, falls back to the checklist row's `expected_amount`).
- Per-row actions: Edit (pencil, opens `AddObligationForm` pre-filled in a bottom sheet), Skip (pending/not-skipped only — "comes back next month"), Restore (skipped only — unskips), "Mark closed" (confirm dialog; soft-deactivates the obligation, keeps _this_ month's row struck-out, deletes all _future_ checklist rows so it never reappears).
- Footer: "+ Add obligation" button + a status hint ("Updating…" while loading, else "Mark closed = strike this month · hide from next").
- Header-right trash icon → "Reset all obligations?" confirm sheet → **hard-deletes** every obligation + every checklist row for the user (not soft) — a genuinely destructive, no-undo action; keep the double confirmation on mobile.

`AddObligationForm` fields: title (text, autofocus), category (pill chooser — Loan EMI🏦, Life🛡️, Health🏥, Vehicle🚗, SIP📈, PPF💰, Subscription📱, Rent🏠, Other📌), amount (number), frequency (pill: Monthly/Quarterly/Half-yearly/Yearly/One-time), then **conditionally**: a 1–31 day-of-month grid (monthly/quarterly/half-yearly) or a month dropdown (yearly only). Save disabled until title + amount are both present.

### 7.4 `CollapsiblePanel.tsx` (117 lines) — the shared accordion shell

Generic wrapper: icon badge + title + optional subtitle + optional `headerRight` slot + chevron, body animated via `grid-template-rows: 0fr → 1fr` (180ms) rather than height auto — this CSS-grid trick avoids the "animate to auto height" problem and is worth replicating conceptually on mobile with `LayoutAnimation` or a measured-height `Animated.View`, not literally the CSS trick. Used by both CreditCardBillReminder and ObligationsChecklist — build this once on mobile and reuse it, don't duplicate the panel chrome in both new components.

### 7.5 `TrackerConsent.tsx` (290 lines) — the one-time gate screen

Shown instead of the whole tracker when `hasConsent === false` (and a `BrandPageLoader` while `null`, i.e. still checking). Card UI: chart icon, "Start your money tracker" headline, a bulleted "WHAT YOU CAN TRACK" box (8 items, icon + label, mixing `TrackerIcon` and generic `AppIcon`), a purple privacy note ("card nicknames... stay private... sensitive health-check amounts are encrypted... delete anytime"), a required checkbox ("I understand Finkoin will store my expense entries and saved card details... I agree to the Privacy Policy" with a real link), a disabled-until-checked "Start tracking" CTA that upserts `tracker_consent` (`consent_version: "v2"`) and sets the local cache, and a "Maybe later" link that routes to `/`.

### 7.6 `PurpleCashAudit.tsx` (271 lines) — currently disabled, debug-only

Imported but **commented out** in `page.tsx` (lines 9 and 1383–1386: `// import PurpleCashAudit...` / `{/* <PurpleCashAudit .../> */}`). Collapsible "How is LEFT calculated?" drawer that dumps `buildCashAudit()`'s full line-by-line breakdown (income source, every included/excluded line with its reason, console-mirrored). **Do not port this to mobile as a user-facing feature** unless the web team re-enables it first — treat it as an optional internal debug tool at best.

### 7.7 `TrackerIcons.tsx` (376 lines) — the icon registry

44 named line-icons (`home`, `cart`, `leaf`, `milk`, `bolt`, `droplet`, `flame`, `wifi`, `phone`, `graduation`, `pill`, `hospital`, `broom`, `fuel`, `cab`, `auto`, `transit`, `utensils`, `coffee`, `snack`, `film`, `game`, `shirt`, `device`, `sparkle`, `dumbbell`, `plane`, `gift`, `music`, `package`, `cigarette`, `drink`, `herb`, `dice`, `card`, `car`, `wallet`, `bike`, `calendar`, `chart`, `bank`, `shield`, `coin`, `briefcase`, `laptop`, `building`, `trending`, `alert`, `party`, `other`), all hand-drawn 24×24 viewBox strokes (`strokeWidth 1.75`, round caps/joins, brand purple `#534AB7` default via `TRACKER_ICON_COLOR`). `TrackerIcon` renders one; `TrackerIconBadge` wraps it in a rounded-square tinted background (`${color}14` — 8% alpha hex). Mobile's version (277 lines, smaller) should be diffed path-by-path against this file to confirm every icon name used by `tracker-categories.ts` actually resolves — a missing key silently falls back to the 3-dot `other` icon (`paths[name] ?? paths.other`), which is an easy visual regression to miss in a quick glance.

### 7.8 `ExpenseTable.tsx` (247 lines) + `MonthSummary.tsx` (70 lines) — ❌ missing, needed for the month drill-down (§2.2)

`MonthSummary` is a simple bar-list: for each non-income bucket, icon + label + (cap%) + amount, with a thin progress bar (`width = min(100, pct-of-total)%`, red if over the bucket's cap) and a small red "OVER" chip when applicable. Trivial to port as an RN `FlatList`/`View` list.

`ExpenseTable` is an HTML `<table>` — on mobile this becomes a plain row list (date, category icon+label, note, amount with a small "Card" badge if paid by credit card, Edit/Delete). Amount color: green `+` for `investment` bucket, red `−` for `habits`, default black `−` otherwise. Delete flow: `window.confirm` → delete from Supabase → `onChanged()` callback (on mobile, use the platform `Alert.alert` confirm pattern, not a blocking confirm).

---

## 8. Main-Screen Lifecycle (`app/tracker/page.tsx`) — exact order of operations

### 8.1 Full local state inventory (so nothing gets dropped in the port)

`hasConsent` (`boolean | null`, null = still checking), `showAddModal`, `editingExpense`, `transactions`, `previousTransactions`, `ccBillHistory` (prev + prev-prev month, for CC carry-forward only — never used by Safety Pulse), `savedCards`, `loading` (soft, never blanks UI), `expandedBucket` (accordion — only one bucket open at a time, or income), `expandedIncome`, `defaultBucket`, `modalDefaults` (`{subcategory, amount, description, paymentMethod}` for pre-filling), `pendingCcPayCardId`, `ccOptimisticPayments`, `learnedObligation`, `selectedMonth`/`selectedYear`, `trackerStart` (back-nav floor), `profileMonthlyFromDb`, `amountsVisible` (summary-card flip), `sectionAmountsVisible` (per-section eye, keyed `income`/`needs`/`wants`/`habits`/`loans`/`investment`).

Plus four `useRef`s used purely as effect guards/dedup keys: `fetchReqId` (stale-response guard — every fetch increments and only the latest id's result is applied), `hardInFlight` (counts non-soft fetches in flight so the spinner doesn't clear early), `selectedCalRef`/`clockCalRef` (midnight-rollover bookkeeping), `incomeSyncKeyRef`, `obligationSyncKeyRef` (dedup keys so the same auto-seed/auto-sync plan doesn't re-fire every render).

### 8.2 Fetch semantics — "soft" vs "hard" (critical UX detail, do not simplify away)

`fetchTransactions({ soft })` — **soft defaults true**. Soft fetches never flip `loading` true (so navigating back to the tab, or a background visibility-change refresh, never blanks the screen); only an explicit `{ soft: false }` call (which this codebase never actually makes — grep confirms every call site passes `soft: true` or omits it) shows the inline "Updating…" `BrandPageLoader`. A monotonically increasing `fetchReqId` ref means if two fetches race, only the most recently _started_ one's result is applied — stale slow responses are discarded. **On mobile, replicate this exact discard-stale-response + never-blank-on-background-refresh pattern** — it's what makes the tracker feel instant; a naive "set loading true on every fetch" port will feel noticeably worse.

Fetches 3 months in parallel every time (current, previous, previous-2) via `Promise.all` — previous is needed for Safety Pulse MoM and income carry-forward, previous-2 only for CC bill carry-forward history.

### 8.3 What happens after an expense is saved (the `onSaved` callback — the most important wiring in the file)

1. If this was a **new** (not edit) row, fire an analytics event `Analytics.trackerExpenseAdded(bucket)`.
2. If this save was a Pay-bill flow (`pendingCcPayCardId` set) and an amount came back, push to `ccOptimisticPayments` and clear the pending id.
3. If it's a genuinely new (not edit) non-income expense that isn't a CC bill-pay:
   a. Guess its obligation category (§6.4's `obligationCategoryFromExpense`).
   b. If a category was guessed: fetch current obligations, build a candidate (`candidateFromExpense`, §6.7), check if an existing _active_ obligation already matches by amount (±₹1) or by category+title; if not, call `decideObligationLearn` then `shouldLearnObligationFromExpense` (both §6.7, fully documented) to get `"add"` (silently create the obligation) / `"suggest"` (surface the learned-obligation nudge, §7.3) / `"skip"` (do nothing).
   c. Regardless of learning, regenerate + refetch the checklist, then find the single best pending checklist item this expense satisfies (§6.4) and mark it paid.
4. Close the modal, reset all modal-related state, soft-refetch transactions.

`lib/obligationLearn.ts` is confirmed already ported byte-identical on mobile (§6.7) — this whole flow can be wired on mobile using the existing `mobile/lib/obligationLearn.ts` and `mobile/lib/trackerObligationSync.ts` with no new logic files needed, only the UI nudge (§7.3) and the orchestration above.

### 8.4 Background sync effects, in the order they're declared (all keyed so they don't infinite-loop)

1. **Health-check → obligations sync** — once per `(user, analyseCompleted, lastSubmission)` change, calls `useObligationStore.syncFromHealthCheck`.
2. **Midnight/visibility calendar follow** — if the user is viewing "this month" and the device clock rolls to a new month while the tab is open or regains focus, the selection follows forward automatically (but only if they were following the clock, not if they'd manually navigated away).
3. **Forward-limit snap-back** — if `selectedMonth/Year` is ever ahead of `trackerForwardLimit()`, snap back (handles the edge case of the unlock window closing, e.g. the clock crosses into a new month before the "last Friday" condition re-evaluates).
4. **Consent check** — local cache first, then DB (`tracker_consent` table, requires `consent_version === "v2"`), else `hasConsent = false`.
5. **Saved cards load** — re-runs whenever consent, user, or `showAddModal` changes (so a card added inside the modal is reflected immediately on close).
6. **Transactions fetch** — depends on the 3-month parallel fetch in §8.2; keyed off consent + the computed `currentMonth`/`currentYear` labels + selected month/year.
7. **Body-scroll-lock safety reset** — unconditionally clears `document.body.style.overflow` on mount (defends against a modal unmount being interrupted by a PWA going to background mid-animation and leaving scroll permanently locked). _This exact bug class — PWA interrupted mid-modal-close leaving the body unscrollable — is the "known issue #2, tracker hangs on 2nd update iOS" from the project's own bug tracker._ On mobile this class of bug doesn't exist (no `document.body`), but the broader lesson — always have an unconditional safety-reset effect for any global UI lock a modal sets — is worth keeping.
8. **Optimistic-CC-payment cleanup** — drops entries once the real payment is observed in fetched data (§6.1).
9. **DevTools dump** — `development` env only, full transaction table + cash audit to console.
10. **Visibility-based soft refresh** — on tab regaining visibility, soft-refetches (debounced 400ms, throttled to at most once per 8s, and skipped entirely while the Add-Expense modal is open so an in-progress edit never gets yanked out from under the user).
11. **Profile salary fetch** — once per consent+user, via the 3-tier cache in §6.5.
12. **Tracker-start floor computation** — once per consent+user+(transaction count changing from/to zero), reads `tracker_consent.consent_at` and the earliest transaction date/month/year, prefers consent date (so pre-consent seeded junk data is never navigable to).
13. **Back-limit snap-forward** — if selection is ever before `trackerStart`, snap forward.
14. **Income auto-seed + cleanup** (§6.3) — the big one.
15. **Obligation ✓/✗ bulk sync** (§6.4's `planObligationExpenseSync`) — runs on every transaction-list change for the selected month.

That's 15 independent effects coordinating one screen. **When porting to React Native, strongly consider consolidating several of these into a single reducer-driven sync routine** rather than 15 separate `useEffect`s with ref-based dedup guards — the web version's structure is a product of incremental feature addition over time, not a deliberate architecture to copy verbatim. Copy the _behavior_ (every rule in §8.2–§8.4), not necessarily the _effect topology_.

---

## 9. Design Tokens (colors, spacing, type — for pixel-matching)

Base palette used throughout tracker (also Finkoin's app-wide tokens per the project's own system doc):

- Primary purple `#534AB7` / light `#EEEDFE` / dark `#3C3489`
- Success `#1D9E75` / light `#E1F5EE`
- Warning `#BA7517` / light `#FFF3E0`
- Error `#E24B4A` / light `#FCEBEB`
- Background `#F7F7F4`, Card `#FFFFFF`, Border `#E8E6F0`
- Text primary `#111110`, secondary `#5F5E5A`, muted `#9B9A94`

Tracker-specific nuances not in the global token list:

- Safety Pulse status backgrounds are _distinct, softer_ purples/reds, not the global success/warning/error tokens: `safe` bg `#F3F1FC`/border `#D4D2F5`; `tight` bg `#F7F4FF`/border `#C9C2F0`; `over` bg `#FBF5F5`/border `#F0D4D4`; `unknown` bg `#F7F7F4`/border `#E8E6F0`.
- Bucket accent colors are a tightening purple gradient, not arbitrary: `needs #534AB7` → `wants #6B63C9` → `habits #7A72D4` → `loans #5B54B0` → `investment #4F48A8` (all within ~15% of the primary purple — the bucket rows are meant to feel like one family, not color-coded by category the way, say, a budgeting app might use red/green/blue).
- Over-budget progress-bar color ramp: `< 80%` bucket color, `80–99%` `#BA7517` (warning), `≥ 100%` `#E24B4A` (error). Same ramp used for the purple summary card's own spend bar but inverted thresholds (`>90%` red, `>70%` yellow, else green — intentionally different thresholds from the per-bucket bars; don't unify them).
- Border radius: 16px for section cards, 20px for the bottom-sheet modal (top corners only), 12–14px for inner elements, 8–10px for buttons/pills — matches the app-wide 12–16px convention.
- The summary card's flip animation: `perspective: 1000px`, 0.55s `cubic-bezier(0.4, 0, 0.2, 1)` `rotateY`, two faces stacked via CSS grid `gridArea: "1 / 1"` with `backface-visibility: hidden` — this is the one piece of "design" that genuinely needs a native equivalent (`Animated.Value` driving a `rotateY` interpolation + `backfaceVisibility: 'hidden'` on two absolutely-stacked views) rather than a simple fade/cross-dissolve, because the product intent is specifically a coin-flip metaphor for "reveal the money."

---

## 10. Recommended Mobile Build Order

Given §0's gap list, the highest-leverage next steps in priority order:

1. **Diff `mobile/lib/trackerObligationSync.ts` (225 ln) against web's (258 ln)** — close whatever the 33-line gap is before building any UI on top of it; this file is core correctness logic (§6.4), not styling.
2. **Build `CollapsiblePanel` equivalent first** (§7.4) — both missing panels need it, build the shell once.
3. **Build the Credit Card Dues panel** (§7.2) — self-contained, depends only on `trackerCreditCards.ts` (already ported) + the shell from step 2.
4. **Build the Obligations checklist panel + Add/Edit Obligation form** (§7.3) — depends on `useObligationStore` (already exists on mobile, confirmed via the existing `checklist.length` usage) + the same shell.
5. **Wire §8.3's `onSaved` obligation-learning callback** into mobile's `AddExpenseSheet` save flow if it isn't already there (check whether `mobile/app/(tabs)/tracker.tsx`'s own save handler already duplicates this logic inline — it references `useObligationStore` extensively per the earlier grep, so likely yes; verify it matches §8.3 exactly rather than assuming).
6. **Build the month drill-down screen** (§2.2/§7.8) — lowest priority, it's a "view everything" convenience screen, not core to the daily loop.

Everything else (§3 data model, §5 categories, §6.1/6.3/6.5/6.6 business logic, §9 design tokens) is reference material to check existing mobile code against, not new work — per §0, those are already ported.
