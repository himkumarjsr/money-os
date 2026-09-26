# Finkoin Mobile — Current State Report

> Date: 2026-09-26 · Report only, no code changed.
> Read: `FINKOIN_SYSTEM.md`, `docs/PWA_COMPLETE_AUDIT.md`, `docs/MOBILE_BUILD_PLAN.md`, every file in `mobile/` on `mobile-app` (HEAD `62c0ed2`), and `app/`, `components/`, `lib/`, `store/` on `origin/main` (HEAD `e42852c`).
> Verification is by static reading only. `mobile/node_modules` isn't installed in this environment, so the app wasn't built, type-checked or run.

---

## 0. Branch situation (read this first)

| | `mobile-app` | `main` |
|---|---|---|
| HEAD | `62c0ed2` (docs) ← `e5d3f3b` "split functinality" | `e42852c` "marked closed-v1" |
| Has `mobile/`? | **Yes** (87 files) | **No.** Commit `950748f` "revert native app code" (2026-08-06) deleted all of `mobile/` from main (84 files, −28,702 lines) |
| Commits not on the other branch | 2 | 17 (2026-08-06 → 2026-09-26) |
| Common ancestor | `86446b4` (RN Phase 1) | |

**Consequences:**
1. The mobile app exists **only** on `mobile-app`. Merging `main` into `mobile-app` would delete `mobile/` unless the revert is handled.
2. The PWA on `main` has moved on since `mobile-app` branched: 66 files changed in `app/ components/ lib/ store/` (+6,992 / −3,417). Notable changes:
   - Health-check form rework: `analyse-onboarding-form.tsx` (4,900 lines changed) and `lib/analyse-form-schema.ts` (new `emiMonth`, `homeLoanEMIMonth`, `clearLegacyLoanScalars()`).
   - Engine changes: `lib/financialEngine.ts` (+176) and `lib/priorityEngine.ts` (+766), including the medical fund gap fix.
   - Fix-plan cache rewrite (`lib/cache.ts`).
   - Password-recovery deep links: new `lib/authRecovery.ts`, `components/AuthRecoveryRedirect.tsx`, and an `/auth/update-password` rewrite.
   - New `/notifications` page (`components/notifications/NotificationsClient.tsx`).
   - Obligations and tracker fixes (`store/obligationStore.ts`, `ObligationsChecklist.tsx`, `trackerObligationSync.ts`).
   - Tax (80D), SIP, SWP and EMI calculator fixes; push-notification open-app fix.
   - `lib/apiGuard.ts` is **unchanged**, so the API is still cookie-only.
3. **Shared-lib drift.** The mobile copies of these files no longer match `main`:

| `mobile/lib/` file | vs `main:lib/` |
|---|---|
| `analyse-form-schema.ts` | **Stale** (277 diff lines) |
| `financialEngine.ts` | **Stale** (176) |
| `priorityEngine.ts` | **Stale** (logic differs, not just formatting) |
| `universal-buckets.ts` | **Stale** (29) |
| `formatters.ts` | **Stale** (9) |
| `trackerCreditCards.ts` | Intentional RN patch (27) |
| `amortisation.ts`, `splitBalances.ts`, `splitInvite.ts`, `splitShares.ts`, `tracker-categories.ts`, `trackerSafetyPulse.ts` | Identical |

So scores computed on mobile today can differ from the live PWA for the same inputs.

---

## QUESTION 1 — Every file in `mobile/` with status

Status key: **complete** = works and is wired · **partial** = works with gaps · **placeholder** = stub · **broken** = a core path fails or is very likely to fail · **unused** = built but not mounted anywhere.

### Config / root (12)
| File | Status | Notes |
|---|---|---|
| `package.json` | complete | Expo 54 (see Q2) |
| `package-lock.json` | complete | |
| `app.json` | partial | scheme `finkoin`, bundle/package `com.finkoin.app`, `finkoin://` intent filter; no https App Links / universal links, no `extra`, no EAS config |
| `index.js` | complete | gesture-handler, reanimated, crypto polyfill, `expo-router/entry` |
| `babel.config.js` | complete | reanimated plugin |
| `tsconfig.json` | complete | strict, `@/*` alias |
| `.env.example` | partial | only `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY`; code also reads `EXPO_PUBLIC_SITE_URL` and a Google client id |
| `.gitignore` | complete | |
| `README.md` | complete | Google OAuth redirect setup (`exp://**`, `finkoin://**`) |
| `AGENTS.md`, `CLAUDE.md` | complete | "Read the Expo v54 docs" |
| `.claude/settings.json` | complete | enables the expo plugin |

### Assets (5)
`assets/icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png`, `logo.png` — complete.

### Constants (2)
| File | Status | Notes |
|---|---|---|
| `constants/theme.ts` | complete | Colors, Spacing, Radius, FontSize, Shadow, taglines — matches the PWA palette |
| `constants/calculator-config.ts` | complete | Mirrors the web calculator categories |

### Screens — `mobile/app/` (18)
| File | Status | Notes |
|---|---|---|
| `_layout.tsx` | complete | Root Stack, providers, `initAuth()`, `WebBrowser.maybeCompleteAuthSession()` |
| `index.tsx` | complete | Redirect → `/(tabs)` |
| `(auth)/_layout.tsx` | complete | Auth stack |
| `(auth)/index.tsx` | complete | Redirect → `/(tabs)` |
| `(auth)/login.tsx` | partial | Email/password + Google work; no Forgot password, no ≥ 6-char check, no `next` redirect |
| `(auth)/signup.tsx` | complete | Name/email/password, email-confirm alert, Google; no Terms/Privacy links |
| `auth/callback.tsx` | complete | OAuth code/token deep link; no password-recovery branch (main now has one on web) |
| `(tabs)/_layout.tsx` | complete | Home · Report · Track · Split · Profile; Calculators hidden |
| `(tabs)/index.tsx` | complete | Landing: header, tagline, hero carousel, quick tools, top picks, logged-out CTA |
| `(tabs)/analyse.tsx` | partial | Reads `user_analysis.analysis_result` only (web writes `user_analyse_snapshots`), so web users see an empty Report; score + issues only |
| `analyse/form.tsx` | partial | 7 steps but only 35 fields, no Zod step validation, writes `user_analysis` only, no AI plan / obligations sync; uses the stale schema/engine |
| `analyse/fixplan.tsx` | placeholder | "Ships in the next mobile release" |
| `(tabs)/tracker.tsx` | **broken** (likely) | Insert sends a `title` column not in `supabase/manual/expense_tracker.sql`; month query `.lte('date','YYYY-MM-31')` is an invalid date for 30-day months and Feb; no consent/month nav/pulse; income from `user_analysis` |
| `(tabs)/split.tsx` | complete | List, create + invite share, join by code, creator delete; no realtime |
| `split/[groupId]/index.tsx` | complete | Tabs, balances, settle, invite, edit/delete expense, leave/remove, delete group; no realtime |
| `split/[groupId]/add-expense.tsx` | complete | equal/exact/percentage/shares, edit mode; date is a plain text field |
| `(tabs)/calculators.tsx` | partial | 20 tools work inline; not deep-linkable; simplified tax; mobile-only engines (`calcEngines.ts`) |
| `(tabs)/profile.tsx` | placeholder | Login gate or name/email/plan/FK card + sign out |

### Components — `mobile/components/` (29)
| File | Status | Notes |
|---|---|---|
| `AppHeader.tsx` | complete | Logo, bell, avatar → ProfileMenu/login |
| `NotificationBell.tsx` | complete | Modal inbox, unread badge, mark all read; no realtime |
| `ProfileMenu.tsx` | partial | Split/Policies/Goals/Investments/Leaderboard/Rewards/Refer/Settings open the **website** |
| `navigation/FinkoinTabBar.tsx` | complete | Floating bar, raised Track, safe-area |
| `landing/HeroCarousel.tsx` | complete | 4 slides (advisor, tax, portfolio, tracker) |
| `landing/QuickTools.tsx` | partial | "Split" routes to Home; calculator tiles don't select a tool |
| `landing/TopPicks.tsx` | complete | |
| `landing/LandingHeader.tsx` | complete | Re-export of AppHeader |
| `home/QuickTools.tsx` | unused | Superseded |
| `home/DailyTip.tsx` | unused | |
| `analyse/ResultCard.tsx` | unused | |
| `analyse/StepIndicator.tsx` | unused | |
| `tracker/AddExpenseSheet.tsx` | unused | Full web-parity add/edit sheet, not mounted |
| `tracker/MonthSafetyPulse.tsx` | unused | Includes `TrackerNestedPanels` |
| `tracker/TrackerConsent.tsx` | unused | |
| `tracker/BucketCard.tsx` | unused | |
| `ui/AppIcon.tsx` | complete | Subset of the web icons |
| `ui/BrandLogo.tsx`, `ui/Button.tsx`, `ui/Card.tsx`, `ui/Input.tsx`, `ui/ResultStat.tsx` | complete | Input uses 16 px |
| `ui/MoneyInput.tsx`, `ui/SliderField.tsx` | complete | Used by the form/calculators |
| `ui/Chip.tsx`, `ui/SegmentControl.tsx`, `ui/LoadingSpinner.tsx`, `ui/HealthScoreRing.tsx`, `ui/PrivacyEye.tsx` | unused | Built, not mounted by any screen |

### Stores — `mobile/store/` (4)
| File | Status | Notes |
|---|---|---|
| `authStore.ts` | partial | `initAuth`, `signIn`, `signUp`, `signInWithGoogle`, `handleIncomingAuthUrl`, `signOut`, `refreshUser`, `createSessionFromUrl`; persisted `finkoin-auth-mobile`; no password reset, referral or gamification |
| `financialStore.ts` | unused | Web-store port, never imported by a screen |
| `splitStore.ts` | complete | Direct Supabase writes (bypasses `/api/split/*`); invites via `invite_code` only; invite host defaults to `https://finkoin.com` (not www) |
| `notificationStore.ts` | partial | fetch + markAllRead only |

### Lib — `mobile/lib/` (17)
| File | Status | Notes |
|---|---|---|
| `supabase.ts` | complete | RN client, `appStorage`, no URL session detection |
| `storage.ts` | complete | SecureStore + AsyncStorage adapter |
| `googleAuth.ts` | complete | Native + browser Google flows |
| `cryptoPolyfill.ts` | complete | SHA-256 for PKCE |
| `calcEngines.ts` | complete | Mobile-only simplified calculator maths |
| `amortisation.ts`, `splitBalances.ts`, `splitInvite.ts`, `splitShares.ts`, `tracker-categories.ts`, `trackerSafetyPulse.ts` | complete | Identical to main |
| `trackerCreditCards.ts` | complete | RN-patched copy |
| `analyse-form-schema.ts`, `financialEngine.ts`, `priorityEngine.ts`, `universal-buckets.ts`, `formatters.ts` | **partial (stale)** | Behind `main` (section 0) |

**Totals:** 87 files (12 config, 5 assets, 2 constants, 18 screen/route files, 29 components, 4 stores, 17 lib). Among the 18 screen files: 11 complete (6 of them routing/layout), 4 partial, 2 placeholder, 1 likely broken.

---

## QUESTION 2 — Installed Expo packages (`mobile/package.json`, exact)

```json
{
  "name": "finkoin-mobile",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "expo start --lan",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "@expo/vector-icons": "^15.0.3",
    "@react-native-async-storage/async-storage": "^2.2.0",
    "@react-native-community/slider": "5.0.1",
    "@supabase/supabase-js": "^2.112.0",
    "babel-preset-expo": "~54.0.10",
    "expo": "~54.0.35",
    "expo-auth-session": "~7.0.11",
    "expo-constants": "~18.0.13",
    "expo-crypto": "~15.0.9",
    "expo-font": "~14.0.12",
    "expo-linking": "~8.0.12",
    "expo-router": "~6.0.24",
    "expo-secure-store": "~15.0.8",
    "expo-status-bar": "~3.0.9",
    "expo-web-browser": "~15.0.11",
    "react": "19.1.0",
    "react-native": "0.81.5",
    "react-native-gesture-handler": "~2.28.0",
    "react-native-get-random-values": "~1.11.0",
    "react-native-reanimated": "~4.1.1",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0",
    "react-native-svg": "15.12.1",
    "react-native-url-polyfill": "^4.0.0",
    "react-native-worklets": "0.5.1",
    "zod": "^3.25.76",
    "zustand": "^5.0.14"
  },
  "devDependencies": {
    "@types/react": "~19.1.0",
    "typescript": "~5.9.2"
  },
  "private": true
}
```

**Expo modules:** `expo`, `expo-router`, `expo-auth-session`, `expo-constants`, `expo-crypto`, `expo-font`, `expo-linking`, `expo-secure-store`, `expo-status-bar`, `expo-web-browser`, `@expo/vector-icons`, `babel-preset-expo`. `app.json` sets `newArchEnabled: true`, `typedRoutes: true`, plugins `expo-router`, `expo-secure-store`, `expo-font`.

**Not installed yet** (needed per the build plan): `expo-notifications`, `expo-clipboard`, `expo-sharing`, `expo-print`, `expo-image-picker`, `expo-linear-gradient`, `@react-native-community/datetimepicker`, `@react-native-community/netinfo`, `react-native-razorpay`, `jest-expo` (no test setup), and no `eas.json`.

---

## QUESTION 3 — Screens built, PWA design match, work needed

| Screen | Built? | Matches PWA design? | Work needed |
|---|---|---|---|
| Home (`(tabs)/index`) | Yes | **Close match**: same taglines, hero carousel copy, quick-tool order, lavender hero | Fix the Split tile route; deep-link calculator tiles; no testimonials/below-fold |
| Login | Yes | **Partial**: same colours, but logo + tagline layout instead of the PWA's white card with a Login/Sign-up tab switch | Forgot password, ≥ 6-char rule, `next` redirect, card layout |
| Sign up | Yes | Partial (same as login) | Terms/Privacy links, referral apply |
| Auth callback | Yes | n/a (spinner) | Recovery branch (web added this on main) |
| Report (`(tabs)/analyse`) | Yes | **No**: a score number + emoji empty state; the PWA result has a score badge, net worth, 5-bucket table, gauges, safety net, cash-flow waterfall | Read the snapshot table; build the full result screen |
| Analyse form | Yes | **Partial**: 7 steps match, but ~35 of ~100 fields and no conditional sections, loan rows, date pickers or advisor | Full parity with the reworked main form + Zod + snapshot write + consent |
| Fix plan | Placeholder | No | Everything; needs Bearer API support |
| Tracker | Yes | **No**: different bucket colours (orange wants, red loans, a non-existent "savings" bucket) vs the PWA's all-purple buckets; no purple summary card with Income/Spent/Left, no Safety Pulse, obligations or credit cards | Rebuild on the unused `AddExpenseSheet`, `MonthSafetyPulse`, `TrackerConsent`; fix the insert and query bugs |
| Split list | Yes | **Yes**: purple CTA, emoji rows, 2-step create → invite | Realtime, www invite host |
| Group detail | Yes | **Yes**: expenses/members/settlements tabs, simplified settle-up, UPI/Cash/Bank settle | Realtime, email invite, token-invite joins |
| Add expense | Yes | **Yes**: 4 split types, category chips, per-member inputs | Native date picker, align error copy |
| Calculators | Yes (inline) | **Partial**: slider/result-stat style matches; no per-tool routes, no share, no amortisation tables; tax is a 5-input simplification of the web tool | Extract tools to `calculators/[id]`, reuse the web engines |
| Profile | Placeholder | No | Assets editor, checklist, referral, settings links |

**Matches PWA:** Home, Split list, Group detail, Add expense.
**Needs work:** Login, Sign up (minor), Report, Analyse form, Tracker, Calculators, Profile, Fix plan.

---

## QUESTION 4 — Navigation structure (exact Expo Router tree today)

```
mobile/app/
├── _layout.tsx                       Root <Stack headerShown:false>, initialRouteName "(tabs)"
│                                     Declares: (tabs), index, (auth) [presentation:'modal'],
│                                     auth/callback, analyse/form, analyse/fixplan,
│                                     split/[groupId]/index, split/[groupId]/add-expense
├── index.tsx                         <Redirect href="/(tabs)">
├── (auth)/
│   ├── _layout.tsx                   <Stack> slide_from_right, initialRouteName "login"
│   ├── index.tsx                     → router.replace("/(tabs)")
│   ├── login.tsx
│   └── signup.tsx
├── auth/
│   └── callback.tsx                  finkoin://auth/callback  ·  exp://…/--/auth/callback
├── (tabs)/
│   ├── _layout.tsx                   <Tabs tabBar={FinkoinTabBar}>
│   ├── index.tsx                     Tab "Home"
│   ├── analyse.tsx                   Tab "Report"
│   ├── tracker.tsx                   Tab "Track"   (raised centre button)
│   ├── split.tsx                     Tab "Split"
│   ├── profile.tsx                   Tab "Profile"
│   └── calculators.tsx               Tab "Calculators" — href:null (hidden)
├── analyse/
│   ├── form.tsx
│   └── fixplan.tsx                   (placeholder)
└── split/
    └── [groupId]/
        ├── index.tsx
        └── add-expense.tsx
```

- **Deep links:** scheme `finkoin://` (Android intent filter). Only `auth/callback` is handled deliberately. There's no `split/join` route, and no `https://www.finkoin.com` App Links / universal links.
- **Modals:** only the `(auth)` group is a modal route. All other sheets (add expense, create group, settle, invite, join by code, notifications, profile menu) are in-screen RN `Modal`s.
- **Difference from the PWA bottom nav** (Home · Report · Track · Calculators · Profile): mobile shows Split where the PWA has Calculators.

---

## QUESTION 5 — Supabase integration

**Client** (`mobile/lib/supabase.ts`): `createClient(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY)` with `appStorage` (SecureStore/AsyncStorage), `autoRefreshToken`, `persistSession`, `detectSessionInUrl:false`, and a no-op auth lock. A missing env logs a warning and falls back to a placeholder URL.

**Is auth working?** Yes, for the paths that exist (by code reading; not run here):

| Flow | Status |
|---|---|
| Email + password sign in (`signInWithPassword`) | Implemented |
| Email sign up (`signUp`, confirm-email alert) | Implemented |
| Google OAuth (`lib/googleAuth.ts` + `auth/callback.tsx` + `createSessionFromUrl`) | Implemented; needs the Supabase redirect URLs from the README |
| Session persistence / restore (`initAuth` on root mount, `finkoin-auth-mobile`) | Implemented |
| Profile load (`users` row, `fk_balance`) | Implemented (`refreshUser`) |
| Sign out | Implemented |
| Password reset / recovery | **Missing** |
| Referral apply, gamification row, analyse consent | **Missing** |

**Is data fetching working?**

| Data | Query | Status |
|---|---|---|
| Split groups/members/expenses/shares/settlements (read + all writes) | direct `split_*` tables, balances computed with `lib/splitBalances.ts` | **Working** (depends on RLS allowing client writes; bypasses the server API checks) |
| Notifications | `user_notifications` select 20 / update `is_read` | **Working** |
| User profile | `users` | **Working** |
| Health-check result | `user_analysis.analysis_result` | **Works technically but wrong source**: the PWA saves to `user_analyse_snapshots`, so users who did the check on web see nothing |
| Health-check submit | `user_analysis` upsert | Works, but invisible to the PWA result page |
| Tracker list | `expense_transactions` by `date` range `YYYY-MM-01…YYYY-MM-31` | **Likely failing** for 30-day months and February (invalid date) |
| Tracker add | `expense_transactions` insert incl. `title` | **Likely failing** if the live table has no `title` column |
| Tracker income | `user_analysis.profile` | Wrong source (same as the report) |
| Obligations, credit cards, tracker consent, gamification, leaderboard, policies, notification prefs | — | **Not implemented** |
| Realtime channels | — | **None** in mobile |
| Next.js `/api/*` routes | — | **None called.** They're cookie-only (`lib/apiGuard.ts` unchanged on main), so the AI fix plan, Razorpay, encrypted financial data, feedback FK and token split-join are unavailable to mobile |

---

## QUESTION 6 — Missing compared to the PWA (`main`)

### 6.1 Screens not yet built (26)
| # | PWA route | Planned RN file | Priority |
|---|---|---|---|
| 1 | `/login?mode=reset`, `/auth/reset-password` | `app/(auth)/forgot-password.tsx` | P0 |
| 2 | `/auth/update-password` (reworked on main with `lib/authRecovery.ts`) | `app/auth/update-password.tsx` | P0 |
| 3 | `/analyse` consent gate | `app/analyse/consent.tsx` | P0 |
| 4 | `/analyse/result` | `app/analyse/result.tsx` | P0 |
| 5 | `/split/join?token=|code=` | `app/split/join.tsx` | P0 |
| 6 | `/tracker/[month]` | `app/tracker/[month].tsx` | P1 |
| 7 | `/calculators/[id]` (20 ids) | `app/calculators/[id].tsx` | P1 |
| 8 | `/calculators/tax-regime-2026` (full) | `app/calculators/tax-regime.tsx` | P1 |
| 9 | `/settings` | `app/settings.tsx` | P1 |
| 10 | `/notifications` (**new on main**) | `app/notifications.tsx` | P1 |
| 11 | `/legal/privacy`, `/terms`, `/refund`, `/disclaimer` | `app/legal/[doc].tsx` | P1 |
| 12 | `/learn` | `app/learn/index.tsx` | P2 |
| 13 | `/learn/[id]` | `app/learn/[id].tsx` | P2 |
| 14 | `/leaderboard` | `app/leaderboard.tsx` | P2 |
| 15 | `/rewards` | `app/rewards.tsx` | P2 |
| 16 | `/refer` | `app/refer.tsx` | P2 |
| 17 | `/investments` | `app/investments.tsx` | P2 |
| 18 | `/optimizer` | `app/optimizer.tsx` | P2 |
| 19 | `/policies` | `app/policies/index.tsx` | P2 |
| 20 | policy add/edit | `app/policies/[id].tsx` | P2 |
| 21 | `/blog` | `app/blog/index.tsx` | P3 |
| 22 | `/blog/[slug]` | `app/blog/[slug].tsx` | P3 |
| 23 | `/goals` | `app/goals.tsx` | P3 |
| 24 | `/portfolio` | `app/portfolio.tsx` | P3 |
| 25 | `/insurance` | `app/insurance.tsx` | P3 |
| 26 | `/kyc`, `/plans` / `/pricing` | `app/kyc.tsx`, `app/plans.tsx` | P3 |

Plus 8 built-but-incomplete screens: Login, Report, Analyse form, Fix plan (placeholder), Tracker, Calculators, Tax calculator (inline simplified), Profile (placeholder).

### 6.2 Components not yet built (55)
- **UI primitives (15):** PasswordInput, NumberInput, Insight, ToggleButtons, RadioCards, SelectSheet, BottomSheet, ConfirmSheet, PrivateAmount, Gauge (SpeedoMeter port), EmptyState, ErrorBox, TrackerIcon/TrackerIconBadge, ShareButton, FormError.
- **Shell (2):** MorningTipSheet, PushPermissionPrompt.
- **Landing (1):** Testimonials.
- **Analyse (17):** ConsentSheet, StepHeader, PremiumField, DayOfMonthPicker, PremiumDueFields, LoanRow, OtherInsuranceRow, CustomInvestmentRow, PostOfficeRow, AdvisorSheet, BucketTable, SafetyNetList, CashFlowWaterfall, PaywallSheet, PriorityCard, DebtTable, FeedbackCard.
- **Tracker (8):** MonthSwitcher, SummaryCard, BucketSection, TxnRow (swipe), CreditCardBillReminder, ObligationsChecklist, AddObligationSheet, MonthSummary.
- **Calculators (3):** AmortisationTable, ToggleSection, ComparisonTable.
- **Profile / learn / social (9):** AssetsSection, EditAmountSheet, AddAssetSheet, ChecklistList, ReferralCard, ArticleCard, RichArticleRenderer, FaqAccordion, RankRow.

Built but not wired (12): AddExpenseSheet, MonthSafetyPulse, TrackerConsent, BucketCard, ResultCard, StepIndicator, HealthScoreRing, Chip, SegmentControl, LoadingSpinner, PrivacyEye, DailyTip. Inline in screens and needing extraction (7): InviteLinkShare, GroupRow, ExpenseRow, MemberRow, SimplifiedEdgeRow, SettleSheet, and the calculator tools.

### 6.3 Stores / libs missing
- **Stores:** `obligationStore`, `gamificationStore`, `portfolioStore`. Also `financialStore` needs wiring and `notificationStore` needs popup + realtime.
- **Libs to port** (not in `mobile/lib/`): `userAnalyseSnapshot`, `bucket-breakdown`, `speedo-meter-buckets`, `netWorth`, `finkoinAiPlan`, `analysisSnapshotValidation`, `profileAssetsPatch`, `syncProfileAssets`, `trackerMonthIncome`, `trackerObligationSync`, `obligationLearn`, `trackerCashAudit`, `trackerProfileIncome`, `localDate`, `fireCalculator`, `postOfficeSchemes`, `calculatorInput`, `taxRegimeComparisonFY2026`, `taxCalculatorHelpers`, `taxMissedDeductionAlerts`, `taxTeachContent`, `learnContent`, `learnRichArticles`, `blogContent`, `cache`, `aiService`, `payment`, `authRecovery` (new on main), and an `api.ts` Bearer client.
- **Re-sync from main:** `analyse-form-schema`, `financialEngine`, `priorityEngine`, `universal-buckets`, `formatters`.

### 6.4 Backend prerequisites (outside `mobile/`)
`lib/apiGuard.ts` needs Bearer-token auth (still cookie-only on main). There's no Expo push-token sender, and no `assetlinks.json` / `apple-app-site-association` for https deep links.

---

## Suggested first step (for the next task, not done here)

Decide the branch strategy before writing mobile code. Options: (a) merge `main` into `mobile-app`, keeping `mobile/` against the `950748f` revert, then re-copy the 5 stale libs; or (b) re-apply `mobile/` onto a fresh branch from `main`. Either way, new mobile work then builds against the current PWA behaviour.
