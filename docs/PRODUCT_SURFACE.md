# Product surface (app routes)

Inventory of `app/**/page.tsx` by feature. Status is from code behavior, not marketing copy.

**Legend:** shipped = usable MVP · partial = UI + limited backend · placeholder = coming-soon shell

---

## Landing & marketing

| Route                            | Status      | Notes                                                                            |
| -------------------------------- | ----------- | -------------------------------------------------------------------------------- |
| `/`                              | shipped     | Hero, health-check CTA, mobile quick tools. Middleware skips Supabase round-trip |
| `/about`, `/contact`             | shipped     | Marketing pages                                                                  |
| `/careers`, `/press`, `/pricing` | placeholder | Coming-soon shells                                                               |
| `/plans`                         | partial     | Plan UI; Razorpay TODOs remain in page                                           |

## Analyse / health check

| Route              | Status  | Notes                                                      |
| ------------------ | ------- | ---------------------------------------------------------- |
| `/analyse`         | shipped | 7-step RHF+Zod form; login enforced in page; consent modal |
| `/analyse/result`  | shipped | Free report + paywall                                      |
| `/analyse/fixplan` | shipped | Unlocked AI/priority plan + PDF                            |
| `/optimizer`       | shipped | Related optimizer / plan UI                                |

## Calculators

| Route                          | Status  | Notes                                             |
| ------------------------------ | ------- | ------------------------------------------------- |
| `/calculators`                 | shipped | Hub (SIP, SWP, EMI, FIRE, tax, etc.)              |
| `/calculators/[id]`            | shipped | Per-calculator pages                              |
| `/calculators/tax-regime-2026` | shipped | FY2026 regime comparison                          |
| `/calculator`                  | shipped | **Basic arithmetic keypad** — not the finance hub |

Hub IDs commonly used: `sip`, `swp`, `ppf`, `nsc`, `emergency`, `fire`, `emi`, `home`, `car`, `rentbuy`, `rentcar`, `whencar`, `po`, `tax-regime`. Deep link: `/calculators?calc=sip|swp|emi`.

## Tracker

| Route              | Status  | Notes                                                                              |
| ------------------ | ------- | ---------------------------------------------------------------------------------- |
| `/tracker`         | shipped | `ProtectedGate`; monthly spend, buckets, Month Safety Pulse, credit-card reminders |
| `/tracker/[month]` | shipped | Month detail                                                                       |

Labels (code): Needs / mandatory · Wants / non-mandatory · Habit expenses · investment / savings types including `savings_account` and Others.

## FK Split

| Route                          | Status  | Notes                                                                                                 |
| ------------------------------ | ------- | ----------------------------------------------------------------------------------------------------- |
| `/split`                       | shipped | Group list, create, soft-close (creator)                                                              |
| `/split/[groupId]`             | shipped | Balances, expenses, invite, settle                                                                    |
| `/split/[groupId]/add-expense` | shipped | equal / exact / %                                                                                     |
| `/split/join`                  | shipped | `?token=` open or email invite; join-after-login via `lib/splitAuthRedirect.ts` + `SplitInviteResume` |

**MVP complete in app code.** Not built: member remove/leave UI, edit expense, receipts, settlement history, UPI rails, `shares` split type. Split SQL is **remote** (see [DATA_AND_STORES.md](./DATA_AND_STORES.md)).

## Auth

| Route                                           | Status  | Notes                                                |
| ----------------------------------------------- | ------- | ---------------------------------------------------- |
| `/login`                                        | shipped | Email + Google; preserves `?next=` / invite redirect |
| `/auth/callback`                                | shipped | OAuth PKCE                                           |
| `/auth/reset-password`, `/auth/update-password` | shipped | Password recovery                                    |

Middleware refreshes JWT cookies only — **does not** redirect to login. Client: `ProtectedGate` → `/login?redirect=`.

## Account & engagement

| Route                                | Status  | Notes                                                       |
| ------------------------------------ | ------- | ----------------------------------------------------------- |
| `/profile`                           | shipped | Dashboard + editable assets (`ProfileAssets`)               |
| `/settings`                          | shipped | Settings shell                                              |
| `/rewards`, `/leaderboard`, `/refer` | shipped | FK gamification / referral                                  |
| `/kyc`                               | partial | PAN mock in `lib/kycVerification.ts`; Aadhaar “coming soon” |

## Money extras

| Route          | Status      | Notes                                                        |
| -------------- | ----------- | ------------------------------------------------------------ |
| `/investments` | shipped     | Asset editing (synced with analyse profile)                  |
| `/goals`       | placeholder | Coming soon                                                  |
| `/portfolio`   | partial     | Demo / sample fund data                                      |
| `/policies`    | partial     | Policy vault client (**no** `ProtectedGate` wrapper on page) |
| `/insurance`   | partial     | Marketplace shell; comparison engine incomplete              |

## Content & legal

| Route                                                                  | Status  | Notes                |
| ---------------------------------------------------------------------- | ------- | -------------------- |
| `/learn`, `/learn/[id]`                                                | shipped | Guides               |
| `/blog`, `/blog/[slug]`                                                | shipped | SEO content          |
| `/legal/privacy`, `/legal/terms`, `/legal/refund`, `/legal/disclaimer` | shipped | Canonical legal      |
| `/privacy`, `/terms`                                                   | shipped | Aliases → `/legal/*` |

## PWA

| Route      | Status  | Notes            |
| ---------- | ------- | ---------------- |
| `/offline` | shipped | Offline fallback |

---

## Entry points (chrome)

- Desktop + mobile nav: `components/global-navbar.tsx`
- Landing quick tools: `components/landing/` + `HomeMobileQuickTools`
- Boot: `AppInitializer`, `AuthSessionSync`, `FinancialStoreAuthSync`, `SplitInviteResume` (root layout)
- Loaders: `app/loading.tsx`, `BrandPageLoader`, `RouteChangeLoader`
