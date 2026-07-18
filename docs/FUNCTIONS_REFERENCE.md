# Finkoin Functions Reference

Generated from the live codebase. Prefer this over invented helper names. Not every `lib/` file is listed — see [DATA_AND_STORES.md](./DATA_AND_STORES.md) for the full domain map.

---

## lib/financialEngine.ts

### `analyseFinances`

**Type:** calculation  
**Params:** `data: FinancialProfile`  
**Returns:** `AnalysisResult` — score, issues, flags, checklist, buckets, net worth, term need, emergency fund breakdown

```ts
const result = analyseFinances(profile);
```

**Edge cases:** Zero income still returns a score ≥ 0; bachelor ignores spouse income; weighted emergency fund never divides by zero (`monthsCovered = 0` when needs = 0).

### `computeRealEmergencyFund`

**Params:** `FinancialProfile`  
**Returns:** Weighted liquid corpus (`savings` 100%, liquid MF 95%, FD 70%, other liquid 50%, legacy EF 100%) + `monthsCovered`.

### `calculateTermNeeded`

**Params:** `FinancialProfile`  
**Returns:** Suggested term cover (₹).

### Income / expense helpers

| Function                      | Returns                                   |
| ----------------------------- | ----------------------------------------- |
| `monthlyTotalIncome`          | Salary + spouse (if not bachelor) + other |
| `monthlySavingsContributions` | Investment-bucket actual                  |
| `monthlyInsuranceTotal`       | Sum of monthly premiums                   |
| `monthlyLivingExpenses`       | needs + wants + security                  |
| `housingAndEmiTotal`          | Rent + housing EMI + loans bucket         |
| `monthlyTotalExpenses`        | needs + wants + security + loans          |
| `getSavingsTargetPercent`     | Investment cap %                          |
| `getDebtSafeLimitPercent`     | Loans safe %                              |
| `isMetroCity`                 | `cityTier === "metro"`                    |

---

## lib/netWorth.ts

### `buildNetWorth`

**Params:** `Partial<AnalyseFormValues>`  
**Returns:** `{ assets, liabilities, netWorth }`

### `getNetWorthStanding`

Age-band peer copy string or `null`.

---

## lib/priorityEngine.ts

### `buildPriorityPlan`

**Params:** `(profile, analysis)` — **profile first**, then analysis result  
**Returns:** `PriorityPlan` with `priorities[]` (`rank` starting at 1), `debts`, `goals`, `monthlySurplus`, `allocationPlan`, scores

```ts
const plan = buildPriorityPlan(profile, analyseFinances(profile));
```

**Edge cases:** Tight surplus still returns a plan; allocations are surplus-derived.

---

## lib/trackerSafetyPulse.ts

### `computeMonthSafetyPulse`

**Params:** month transactions + income context  
**Returns:** Safe / Tight / Over pulse for tracker UI (`MonthSafetyPulse`).

---

## lib/trackerCreditCards.ts

Helpers to encode/decode `payment_method` as `credit_card::{id}::{label}`, persist saved cards (localStorage), and support bill-reminder → loan payment prefill.

---

## lib/tracker-categories.ts

Bucket labels and category catalogs for Needs / Wants / Habit / investment / Others (including `savings_account`).

---

## lib/splitBalances.ts

| Function                                              | Purpose             |
| ----------------------------------------------------- | ------------------- |
| `computeNetBalances(members, expenses, settlements?)` | Per-member net      |
| `simplifyDebts(balances)`                             | Min cash-flow edges |
| `computeGroupBalances(...)`                           | `{ net, edges }`    |
| `netFor(email, balances)`                             | One member’s net    |

Settlements reduce nets by exact amount. Nets should sum ~0.

---

## lib/splitShares.ts

### `computeSplitShares`

**Params:** amount, members, split type (`equal` \| `exact` \| `percentage`), maps  
**Returns:** `{ shares, error }` — validates exact sum and % = 100.

Note: `shares` type may appear in types but is **not** implemented here.

---

## lib/splitInvite.ts

| Export                     | Purpose                   |
| -------------------------- | ------------------------- |
| `OPEN_SPLIT_INVITE_EMAIL`  | `__open__@finkoin.invite` |
| `isOpenSplitInvite(email)` | Open-link detection       |

---

## lib/splitAuthRedirect.ts

Peek/consume helpers for post-login Split join (`localStorage` token + `?next=`). Used by login, OAuth callback, and `SplitInviteResume`.

---

## lib/profileAssetsPatch.ts

| Function                                            | Purpose       |
| --------------------------------------------------- | ------------- |
| `catalogForSection(section)`                        | Add menus     |
| `getScalarAssetValue` / `patchScalarAsset`          | Scalar fields |
| `upsertUnifiedLoan` / `removeUnifiedLoan`           | Liabilities   |
| `upsertCustomInvestment` / `removeCustomInvestment` | Custom rows   |

---

## lib/syncProfileAssets.ts

| Function                | Purpose                                        |
| ----------------------- | ---------------------------------------------- |
| `ensureEditableProfile` | Defaults if null                               |
| `syncProfileAssets`     | `setFullAnalysis` + optional Supabase snapshot |

---

## lib/apiGuard.ts

| Function                           | Purpose                |
| ---------------------------------- | ---------------------- |
| `getAuthedUser`                    | Cookie session user    |
| `unauthorized` / `tooManyRequests` | JSON errors            |
| `rateLimit(key, limit, windowMs)`  | In-memory fixed window |
| `clientKeyFromHeaders`             | IP key                 |

---

## lib/fireCalculator.ts / amortisation.ts / finance.ts

Calculator math isolated from UI: FIRE numbers, amortisation schedules, generic finance helpers. Tax: `taxCalculatorHelpers.ts`, `taxRegimeComparisonFY2026.ts`.

---

## lib/referralRewards.ts / subscriptionBypass.ts / payment.ts

FK referral rewards, skip-payment / admin unlock, Razorpay client helpers.

---

## lib/analytics.ts — `Analytics.*`

Notable helpers: `healthCheckStarted`, `healthCheckCompleted`, `splitGroupCreated`, `splitExpenseAdded`, `splitInviteSent`, `feedbackSubmitted`, `loginCompleted`, plus compatibility wrappers.

---

## Zustand stores

### `useAuthStore`

`initAuth`, `refreshUser`, `logout`, `signInWithEmail`, `signUpWithEmail`, `setUser`, `updateUser`, `setSubscription`

### `useFinancialStore`

`setFullAnalysis`, `setAnalysis`, `hydrateFromSnapshot`, `runAnalysis`, `setAiPlan`, `resetAll`

### `useSplitStore`

`fetchGroups`, `fetchGroupDetail`, `createGroup`, `inviteMember` (`linkOnly`), `addExpense`, `settleUp`, `deleteGroup`, `deleteExpense`  
Helpers: `getMyNetBalance`, `getMyBalanceFromEdges`

### `useGamificationStore`

`fetchGamification`, `addFK`, `earnTokens`, `updateLoginStreak`, `subscribeToRealtime`, badges/toasts

### `useNotificationStore`

`fetchNotifications`, `markAllRead`, `markPopupShown`, `getTodayUnshownPopup`

### `usePortfolioStore`

Demo portfolio load / analysis state for `/portfolio`.

### `useAppStore`

Onboarding step only.
