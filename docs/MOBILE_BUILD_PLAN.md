# Finkoin React Native — Complete Build Plan

> Source of truth: `docs/PWA_COMPLETE_AUDIT.md` (PWA behaviour) + a read of every file in `mobile/` as of `e5d3f3b` (2026-08-07).
> Stack in `mobile/`: Expo SDK 54, expo-router 6 (typed routes), React Native 0.81.5 (New Architecture), React 19.1, zustand 5, zod 3, @supabase/supabase-js 2.112, react-native-svg, reanimated 4, gesture-handler, safe-area-context, expo-secure-store / AsyncStorage, expo-auth-session / expo-web-browser, @react-native-community/slider.
> Per `mobile/AGENTS.md`: read the Expo v54 docs (https://docs.expo.dev/versions/v54.0.0/) before writing code.

---

## SECTION 0 — BLOCKERS AND CROSS-CUTTING DECISIONS (fix these first)

| ID | Problem (found in audit) | Impact | Fix |
|---|---|---|---|
| **B1** | Mobile Report/Form/Tracker read and write **`user_analysis`** (`mobile/app/(tabs)/analyse.tsx:40`, `mobile/app/analyse/form.tsx:210`, `mobile/app/(tabs)/tracker.tsx:93`). The PWA writes the canonical copy to **`user_analyse_snapshots.payload`** (`lib/userAnalyseSnapshot.ts`) and only touches `user_analysis` for `ai_fix_plan`. | A user who did the health check on web sees "Know your financial health" (empty) on mobile, and a mobile check is invisible on web `/analyse/result`. | Port `lib/userAnalyseSnapshot.ts` → `mobile/lib/userAnalyseSnapshot.ts`. **Read** the snapshot first and fall back to `user_analysis.analysis_result`. **Write** the snapshot on submit (same payload shape `{profile, result, submittedAt, version:'1.0', aiPlan?, analysis?}`). Keep the `user_analysis` upsert for backward compatibility. |
| **B2** | Every authed `/api/*` route uses **cookie** auth (`lib/apiGuard.ts#getAuthedUser` → `next/headers` cookies). Only `/api/razorpay/verify-payment` reads `Authorization: Bearer`. | Mobile can't call `/api/ai/analyse` (fix plan), `/api/financial-data`, `/api/feedback` (FK award), `/api/razorpay/create-order`, `/api/split/*`, `/api/notifications/push-subscribe`. | **Backend change (web repo, out of mobile scope):** in `getAuthedUser`, if a `Bearer` header is present, call `createClient(url, anon).auth.getUser(token)`; otherwise fall back to cookies. It's one function, so all callers benefit. Then add `mobile/lib/api.ts` (fetch wrapper: base `EXPO_PUBLIC_SITE_URL`, attaches `session.access_token`). |
| **B3** | Mobile `splitStore` writes `split_*` tables **directly** through Supabase and skips the API guards (membership checks, `computeSplitShares` server validation, rate limits, settle self-check, the leave-with-balance 409, and the split push notify `lib/splitExpenseNotify.ts`). Invites use only `split_groups.invite_code`, not token open invites. `siteBase()` defaults to `https://finkoin.com` (the canonical host is `https://www.finkoin.com`). | Works only while RLS allows these writes; behaviour drifts from web; token invite links from web (`?token=`) can't be joined on mobile. | Short term: keep direct writes (they ship today), fix the `siteBase` default to `www`, and add a `split/join` deep-link screen supporting `?code=` (direct) and `?token=` (via the API once B2 lands). Long term: route mutations through `/api/split/*` with Bearer. |
| **B4** | Mobile tracker bugs: (a) the insert sends a `title` column that isn't in `supabase/manual/expense_tracker.sql` (verify against the live DB — the insert fails if the column is absent); (b) the month query uses `.lte('date', 'YYYY-MM-31')`, which is invalid for 30-day months and February; (c) no consent gate; (d) income from `user_analysis.profile` (B1); (e) `payment_method` is hard-coded `'cash'`; (f) bucket colour map uses `savings`, which isn't a tracker bucket. | Adds can fail, some months return errors, and cash vs card maths diverges from web. | Rebuild the tracker tab on the already-ported libs (`tracker-categories`, `trackerSafetyPulse`, `trackerCreditCards`) and the **unwired** `AddExpenseSheet`, `MonthSafetyPulse`, `TrackerConsent` components. Query by `month` + `year` exactly like web. |
| **B5** | Built but **unwired** mobile components: `components/tracker/AddExpenseSheet.tsx`, `MonthSafetyPulse.tsx` (+ `TrackerNestedPanels`), `TrackerConsent.tsx`, `BucketCard.tsx`, `components/analyse/ResultCard.tsx`, `StepIndicator.tsx`, `components/ui/HealthScoreRing.tsx`, `SegmentControl.tsx`, `Chip.tsx`, `LoadingSpinner.tsx`, `components/home/DailyTip.tsx`, `components/home/QuickTools.tsx`; store `store/financialStore.ts` is unused. | Wasted work; the tracker and report look simpler than the PWA. | Wire them in Sprint 1–2 (below). Delete `components/home/QuickTools.tsx` (superseded by `components/landing/QuickTools.tsx`). |
| **B6** | Navigation bugs: `components/landing/QuickTools.tsx` "Split" routes to `/(tabs)` (Home) instead of `/(tabs)/split`; SIP/SWP/Tax/EMI/Portfolio tiles all open `/(tabs)/calculators` without selecting the tool; `ProfileMenu` opens **web** `/split` though native Split exists; menu items for Policies/Goals/Investments/Leaderboard/Rewards/Refer/Settings are external web links. | Wrong destination / leaves the app. | Add `calculators/[id]` routes and deep-link each tile; point Split to the tab; replace external links as native screens land (P1/P2). |
| **B7** | Payments & push need native modules not in Expo Go: Razorpay (`react-native-razorpay`) and push (`expo-notifications` + FCM). `notification_preferences.push_token` already exists in the DB. | Can't test in Expo Go. | Move to an **EAS development build** in Sprint 3. Push delivery needs a server sender for Expo tokens (backend change to `deliver-tip` / `obligations/reminders`). |
| **B8** | Env gaps: `mobile/.env.example` has only the Supabase URL/key. Code also reads `EXPO_PUBLIC_SITE_URL` (split invites) and the Google client id (`lib/googleAuth.ts#getGoogleWebClientId`). | Wrong invite host; OAuth config unclear. | Add `EXPO_PUBLIC_SITE_URL=https://www.finkoin.com` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=` to `.env.example`. |
| **D1** | Tab bar decision: the PWA bottom nav is **Home · Report · [Track] · Calculators · Profile**; the mobile tab bar (already built) is **Home · Report · [Track] · Split · Profile**, with Calculators as a hidden tab. | Parity question. | **Recommendation:** keep the mobile layout (Split is a high-frequency native use case). Expose Calculators from the Home quick tools, the Home header, and Profile menu. Revisit after analytics. |

---

## SECTION 1 — WHAT ALREADY EXISTS IN `/mobile`

### 1.1 Config / root

| File | What it does | Status |
|---|---|---|
| `package.json` | Expo 54 deps (list in header) | Complete |
| `app.json` | name Finkoin, slug `finkoin`, scheme `finkoin`, portrait, splash `#534AB7`, iOS `com.finkoin.app` (no tablet), Android `com.finkoin.app` + `finkoin://` intent filter, plugins expo-router / secure-store / font, typedRoutes | Complete (no https App Links / universal links for `www.finkoin.com/split/join`) |
| `index.js` | gesture-handler + reanimated + `cryptoPolyfill` + `expo-router/entry` | Complete |
| `babel.config.js` | `babel-preset-expo` + reanimated plugin | Complete |
| `tsconfig.json` | strict, `@/*` alias | Complete |
| `.env.example` | Supabase URL / anon key | Partial (B8) |
| `README.md`, `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json` | OAuth redirect notes; "read Expo v54 docs" | Complete |
| `assets/` | `icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png`, `logo.png` | Complete |
| `constants/theme.ts` | `Colors`, `Spacing` (4–32), `Radius` (8–20, round), `FontSize` (10–32), `Shadow.card/strong`, taglines | Complete |
| `constants/calculator-config.ts` | Mirror of the web `CATEGORIES` + `findCategoryForCalc`, `getItemById` | Complete |

### 1.2 Screens (`mobile/app/`)

| File | What it does | Status |
|---|---|---|
| `_layout.tsx` | Root Stack; `initAuth()` on mount; `WebBrowser.maybeCompleteAuthSession()`; GestureHandler + SafeAreaProvider; `(auth)` presented as a modal | Complete |
| `index.tsx` | `<Redirect href="/(tabs)">` | Complete |
| `(auth)/_layout.tsx` | Auth stack (index, login, signup), slide from right | Complete |
| `(auth)/index.tsx` | Redirect → `/(tabs)` | Complete |
| `(auth)/login.tsx` | Email + password (`Input`), Log in, Google (`signInWithGoogle`), skip → home; `Alert` on error | **Partial** — no "Forgot password", no ≥ 6-char check, no `next` redirect, no sign-up link parity |
| `(auth)/signup.tsx` | Name/email/password, email-confirm alert → login, Google | Complete (no terms/privacy links, no password-length rule) |
| `auth/callback.tsx` | OAuth deep-link landing (`exp://…/--/auth/callback`, `finkoin://auth/callback`); `createSessionFromUrl`; dismiss browser | Complete (no `type=recovery` branch) |
| `(tabs)/_layout.tsx` | Tabs with the custom `FinkoinTabBar`: Home, Report, Track, Split, Profile; Calculators hidden (`href:null`) | Complete |
| `(tabs)/index.tsx` | Landing: `AppHeader`, tagline H1/H2, `HeroCarousel`, `QuickTools`, `TopPicks`, logged-out signup/login footer | Complete (B6 routing bugs) |
| `(tabs)/analyse.tsx` | Report: reads `user_analysis.analysis_result`; score/100 + label, "What needs attention" issue cards, fix-plan CTA, empty state → form | **Partial** (B1; no buckets, safety net, net worth, gauges, paywall, feedback) |
| `analyse/form.tsx` | 7-step form (local state, 35 fields), `normalizeAnalyseFormValues` + `analyseFinances`, upsert `user_analysis` | **Partial** — no consent, no Zod step validation, no unified loans / other insurance / custom investments / PO schemes / date fields / goals targets, no snapshot, no obligations sync, no AI plan |
| `analyse/fixplan.tsx` | "Ships in the next mobile release" placeholder | **Placeholder** |
| `(tabs)/tracker.tsx` | Month list from `expense_transactions`, income from `user_analysis.profile`, eye toggle, pull-to-refresh, FAB → inline simple add modal (title, amount, bucket) | **Partial** (B4, B5) |
| `(tabs)/split.tsx` | Groups list, pull-to-refresh, create (name + emoji) → invite step (`Share.share`), join-by-code modal, creator delete (Alert confirm) | Complete (no realtime) |
| `split/[groupId]/index.tsx` | Detail: header net, tabs expenses/members/settlements, simplified edges, settle modal (UPI/Cash/Bank), invite share, edit/delete expense, leave/remove, delete group | Complete (no realtime, no email invite) |
| `split/[groupId]/add-expense.tsx` | Amount, title, paid-by, split type equal/exact/percentage/shares, include members, per-member inputs, category chips, date (text `YYYY-MM-DD`), notes, edit mode | Complete (date is a text field, not a picker) |
| `(tabs)/calculators.tsx` | In-screen hub with category chips; tools: SIP, SWP, PPF, EMI/Home/Car (variant), Tax (simple `compareTaxRegimesSimple`), FIRE, Emergency, Rent-vs-buy, Rent-vs-own-car, When-to-buy-car, PO savings/lump-sum (TD/NSC/KVP/SCSS/SSY)/RD/MIS | **Partial** — functional but not deep-linkable; tax is a 5-input simplification of the 5k-line web tool; no share, no amortisation table |
| `(tabs)/profile.tsx` | Login gate; card with name/email/plan/FK; sign out | **Placeholder** (no assets, checklist, referral, settings) |

### 1.3 Components (`mobile/components/`)

| File | What it does | Status |
|---|---|---|
| `AppHeader.tsx` | Logo (→ home), `NotificationBell`, avatar → `ProfileMenu` / login | Complete |
| `NotificationBell.tsx` | Bell + unread badge, `Modal` list, mark all read (`notificationStore`) | Complete (no realtime channel) |
| `ProfileMenu.tsx` | Sheet menu mirroring the web profile panel; many items open the web (B6); sign out | Partial |
| `navigation/FinkoinTabBar.tsx` | Floating glass tab bar, raised centre Track button, safe-area bottom pad `max(insets.bottom, 10)` | Complete |
| `landing/HeroCarousel.tsx` | 3–4 slides → analyse / calculators / tracker (login-gated) | Complete |
| `landing/QuickTools.tsx` | SIP, SWP, Split, Tax, EMI, Portfolio, Analyse tiles | Partial (B6) |
| `landing/TopPicks.tsx` | Feature cards → analyse / calculators / tracker / home | Complete |
| `landing/LandingHeader.tsx` | Re-export of `AppHeader` | Complete |
| `home/QuickTools.tsx`, `home/DailyTip.tsx` | Older home widgets | Unused |
| `analyse/ResultCard.tsx`, `analyse/StepIndicator.tsx` | Score card with ring; step dots | Unused |
| `tracker/AddExpenseSheet.tsx` | Full add/edit sheet (bucket, subcategory, payment method, date, edit) — mirrors web `AddExpenseModal` | Built, **unwired** |
| `tracker/MonthSafetyPulse.tsx` (+ `TrackerNestedPanels`) | Safe/Tight/Over card with an eye | Built, **unwired** |
| `tracker/TrackerConsent.tsx` | Consent screen → `tracker_consent` | Built, **unwired** |
| `tracker/BucketCard.tsx` | Simple bucket progress card | Built, unwired |
| `ui/AppIcon.tsx` | SVG icon set (subset of web) | Complete |
| `ui/BrandLogo.tsx`, `ui/Button.tsx`, `ui/Card.tsx`, `ui/Input.tsx` (16 px), `ui/MoneyInput.tsx` (52 h), `ui/SliderField.tsx`, `ui/ResultStat.tsx` | Primitives | Complete |
| `ui/Chip.tsx`, `ui/SegmentControl.tsx`, `ui/LoadingSpinner.tsx`, `ui/HealthScoreRing.tsx`, `ui/PrivacyEye.tsx` (`EyeIcon`, `SectionPrivacyEye`) | Primitives | Complete but mostly unused |

### 1.4 Stores (`mobile/store/`)

| File | What it does | Status |
|---|---|---|
| `authStore.ts` | Persist `finkoin-auth-mobile` (AsyncStorage/SecureStore via `appStorage`); `initAuth`, `signIn`, `signUp`, `signInWithGoogle`, `handleIncomingAuthUrl`, `signOut`, `refreshUser`; exports `createSessionFromUrl`; reads `users` (+ `fk_balance`) | Complete (no `resetPassword`, no gamification sync, no referral apply) |
| `financialStore.ts` | Port of the web store with user-scoped storage | Built, **unused** |
| `splitStore.ts` | Direct-Supabase port: `fetchGroups`, `fetchGroupDetail`, `createGroup`, `inviteLink` (invite_code), `addExpense`, `editExpense`, `settleUp`, `deleteGroup`, `deleteExpense`, `leaveGroup`, `joinByCode`, `clearActive` | Complete (B3) |
| `notificationStore.ts` | `fetchNotifications`, `markAllRead` | Partial (no `markPopupShown`, `getTodayUnshownPopup`) |
| — | `gamificationStore`, `obligationStore` | **Missing** |

### 1.5 Lib (`mobile/lib/`)

| File | Origin | Status |
|---|---|---|
| `amortisation.ts`, `analyse-form-schema.ts`, `financialEngine.ts`, `formatters.ts`, `splitBalances.ts`, `splitInvite.ts`, `splitShares.ts`, `tracker-categories.ts`, `trackerSafetyPulse.ts`, `universal-buckets.ts` | **Byte-identical** to web `lib/` | Complete |
| `priorityEngine.ts` | Web copy, prettier-reformatted only (logic identical) | Complete |
| `trackerCreditCards.ts` | Web copy with the `localStorage` consent helpers guarded for RN (27 lines differ) | Complete (the other `localStorage` uses still no-op on RN → move to `appStorage`) |
| `calcEngines.ts` | Mobile-only simplified calculators (SIP, SWP, EMI, simple tax, FIRE, emergency, compound, rent-vs-buy) | Complete (replace with the web engines in Sprint 3) |
| `supabase.ts` | RN client: `appStorage`, `detectSessionInUrl:false`, no-op lock, `getSupabase`, `isSupabaseConfigured` | Complete |
| `storage.ts` | `appStorage` (SecureStore with AsyncStorage fallback / chunking) | Complete |
| `googleAuth.ts` | Native + browser Google flows, redirect helpers | Complete |
| `cryptoPolyfill.ts` | WebCrypto SHA-256 for PKCE via expo-crypto | Complete |

---

## SECTION 2 — SHARED CODE (portable pure TypeScript)

### 2.1 Already in `mobile/lib/` (keep in sync — copy on every web change)
`amortisation.ts`, `analyse-form-schema.ts`, `financialEngine.ts`, `formatters.ts`, `priorityEngine.ts`, `splitBalances.ts`, `splitInvite.ts`, `splitShares.ts`, `tracker-categories.ts`, `trackerSafetyPulse.ts`, `universal-buckets.ts`, `trackerCreditCards.ts` (patched).

### 2.2 Copy as-is (pure TS, no DOM / Next / Node imports — verified by import scan)

| File | Needs | Used by (mobile) |
|---|---|---|
| `lib/bucket-breakdown.ts` | analyse-form-schema, universal-buckets | Result bucket rows |
| `lib/speedo-meter-buckets.ts` | analyse-form-schema, financialEngine, universal-buckets | Result gauges |
| `lib/netWorth.ts` | analyse-form-schema | Result / Profile |
| `lib/finkoinAiPlan.ts` | analyse-form-schema, financialEngine, netWorth, universal-buckets | Fix plan / optimizer |
| `lib/analysisSnapshotValidation.ts` | financialEngine | Snapshot restore |
| `lib/expense-bucket-recommendations.ts` | analyse-form-schema, universal-buckets | Result |
| `lib/profileAssetsPatch.ts` | analyse-form-schema | Profile assets |
| `lib/financialOptimizer.ts` | engine libs (dev-gated logs only) | Optimizer |
| `lib/fireCalculator.ts`, `lib/sipGoal.ts`, `lib/postOfficeSchemes.ts`, `lib/calculatorInput.ts` | none | Calculators |
| `lib/taxRegimeComparisonFY2026.ts`, `lib/taxCalculatorHelpers.ts`, `lib/taxMissedDeductionAlerts.ts`, `lib/taxTeachContent.ts` | none / each other | Full tax calculator |
| `lib/trackerMonthIncome.ts`, `lib/trackerCashAudit.ts`, `lib/trackerObligationSync.ts`, `lib/obligationLearn.ts`, `lib/obligationReminders.ts`, `lib/localDate.ts` | tracker libs | Tracker |
| `lib/formatINR.ts`, `lib/finance.ts`, `lib/optimizer-format.ts`, `lib/aiProviderMessages.ts` | none | Formatting |
| `lib/learnContent.ts`, `lib/learnRichArticles.ts`, `lib/learnSeo.ts`, `lib/blogContent.ts`, `lib/data/blog-fire-number-india.ts`, `lib/data/blog-old-vs-new-tax-roi-2026.ts` | none (data) | Learn / blog |
| `lib/knowledgeBase/{entries,retriever,index}.ts` | schema, engine | Offline AI fallback (optional) |

### 2.3 Copy with adaptation

| File | Change for RN |
|---|---|
| `lib/userAnalyseSnapshot.ts` | Swap `@/lib/supabaseClient` → `@/lib/supabase` (**B1**) |
| `lib/syncProfileAssets.ts` | Uses `useFinancialStore` + snapshot → works once the mobile `financialStore` is wired |
| `lib/trackerProfileIncome.ts` | Replace the `localStorage` cache with `appStorage`; read the snapshot first |
| `lib/aiService.ts` | `fetch('/api/ai/analyse')` → `mobile/lib/api.ts` (Bearer, **B2**); keep `generateFallbackPlan` |
| `lib/cache.ts` | `localStorage` → `appStorage` (async) for `finkoin_ai_cache` |
| `lib/payment.ts` | `process.env.NEXT_PUBLIC_SKIP_PAYMENT` → `EXPO_PUBLIC_SKIP_PAYMENT` |
| `lib/userPolicies.ts` | Supabase client swap |
| `lib/referralRewards.ts` | Uses `localStorage` + stores → `appStorage`; apply after sign-up |
| `lib/learnArticleFaqs.ts` | Imports a web React component — extract the data only |
| `lib/splitAuthRedirect.ts` | Replace localStorage/cookies with `appStorage` for the pending-invite resume |

### 2.4 Not portable (web / server only)
`supabase.ts` (web SSR client), `supabaseServer.ts`, `apiGuard.ts`, `encryption.ts` (Node `crypto` — call `/api/financial-data` instead), `rag/retriever.ts`, `webPush.ts`, `webPushClient.ts`, `splitExpenseNotify.ts`, `analytics.ts`, `analyticsContext.ts`, `gtag.ts`, `pwaLaunch.ts`, `bodyScrollLock.ts`, `seo.ts`, `siteUrl.ts`, `generatePDF.ts` (jsPDF → use `expo-print` HTML → PDF), `exportExcel.ts`, `renderBlogBody.tsx`, `animations.ts`, `googleFeedbackForm.ts`, `feedbackPrompt.ts` (re-implement with `appStorage`), `kycVerification.ts` (mock; trivial to port if needed), `subscriptionBypass.ts`.

---

## SECTION 3 — SCREEN-BY-SCREEN BUILD PLAN

Conventions for every screen:
- Wrap in `SafeAreaView` (`edges={['top']}` on tab screens; the tab bar handles the bottom) and give scroll content `paddingBottom: 120` to clear the floating tab bar (as in `(tabs)/index.tsx`).
- Background `Colors.background` (`#F7F7F4`), cards `Colors.card` radius `Radius.xl` (16), padding `Spacing.lg` (16), border `Colors.border`.
- Inputs: `Input` / `MoneyInput` with **fontSize 16**, height 48–52, radius 12, border 1.5 `#E8E6F0`, focus `#534AB7`.
- Touch targets ≥ 44×44 (`hitSlop` on icon buttons).
- Sheets: `Modal` with `animationType="slide"` + `presentationStyle` / a bottom-anchored container, radius `20 20 0 0`, padding 24, `maxHeight: '90%'`, plus a bottom inset. Where the PWA uses a centred modal, use a bottom sheet on mobile anyway.
- Loading: `LoadingSpinner` (or a skeleton). Empty: icon + title + one CTA. Error: inline `#FCEBEB` box with `#791F1F` text + Retry.

---

### Screen: Login
PWA route: `/login`
RN file: `mobile/app/(auth)/login.tsx` (exists — finish)
Priority: P0
Dependencies: none
Shared logic: none (Supabase Auth)
API calls: direct Supabase `auth.signInWithPassword`, `auth.signInWithOAuth` (via `lib/googleAuth.ts`)
Store: `authStore`

UI Components needed:
- `BrandLogo { size: 80 }`
- `Input { label, value, onChangeText, keyboardType?, secureTextEntry?, autoComplete?, textContentType?, error? }`
- `PasswordInput { value, onChangeText, placeholder }` (new: `Input` + Show/Hide toggle)
- `Button { label, onPress, variant?: 'primary'|'secondary'|'ghost', loading?, disabled? }`
- `FormError { message }` (new)
- `Divider { label: 'or continue with' }` (new)

Navigation:
- Reached from: Home footer "Log in", `AppHeader` avatar (logged out), gated screens ("Log in"), Signup "Log in" link, Join screen.
- Goes to: `router.replace(next ?? '/(tabs)')` on success; `/(auth)/signup`; `/(auth)/forgot-password`; skip → `/(tabs)`.

Data:
- On load: if `authStore.isLoggedIn` → `router.replace(next ?? '/(tabs)')`.
- Loading: button spinner "Please wait…". Empty: n/a. Error: inline box + no Alert duplication.

Interactions:
- Email (`email-address` keyboard), Password (secure, Show/Hide).
- "Forgot password?" → forgot-password screen (**missing today**).
- Log in → validate (email required; password ≥ 6: "Password must be at least 6 characters") → `signIn`; map "Invalid" errors to "Wrong email or password. Try again.".
- Continue with Google.
- "New here? Create account" → signup.
- Accept a `next` search param (for split join / gated redirects).

Design match: card radius 24 on `#F7F7F4 → #EEEDFE` gradient (`expo-linear-gradient` or solid `#F7F7F4`); primary button 52 h radius 14 `#534AB7`; title 22/800 `#111110`; subtitle 13 `#9B9A94`; footer "256-bit encrypted · Secured by Supabase" 11 px with a lock icon. Full screen (the `(auth)` group is a modal stack). `KeyboardAvoidingView` (`padding` on iOS).

---

### Screen: Sign up
PWA route: `/login?mode=signup`
RN file: `mobile/app/(auth)/signup.tsx` (exists — polish)
Priority: P0 · Dependencies: Login · Shared logic: `lib/referralRewards.ts` (adapted) · API: Supabase `auth.signUp({ options:{ data:{ name }, emailRedirectTo: 'finkoin://auth/callback' } })` · Store: `authStore`
UI Components: `Input` ×2, `PasswordInput`, `Button` ×2, `LegalConsentText { termsUrl, privacyUrl }` (new, opens `WebBrowser.openBrowserAsync`)
Navigation: from Login / Home footer → on a session: `/(tabs)`; on email-confirm: Alert then `/(auth)/login`.
Data: none on load; error inline.
Interactions: name (required: "Please enter your name"), email, password (≥ 6); Create my account; Google; "Already have an account? Log in"; Terms / Privacy links; apply the pending referral (`?ref=` from the deep link) after the session exists.
Design match: as Login; copy "Join Indians taking control of finances." and "We collect only financial numbers. No PAN or Aadhaar ever."

---

### Screen: Forgot password
PWA route: `/login?mode=reset`, `/auth/reset-password`
RN file: `mobile/app/(auth)/forgot-password.tsx` (**new**)
Priority: P0 · Dependencies: Login · API: Supabase `auth.resetPasswordForEmail(email, { redirectTo: 'finkoin://auth/callback?type=recovery' })` (add the redirect in Supabase URL config) · Store: `authStore.resetPassword` (new action)
UI Components: `Input`, `Button`, `SuccessState { icon:'mail', title:'Check your email', body }`
Navigation: from Login → back to Login.
Data: none. Error inline ("Enter your email").
Interactions: email field; "Send reset link"; "Back to login".
Design match: same card; success state centred with an `AppIcon mail 44`.

---

### Screen: Update password (recovery)
PWA route: `/auth/update-password`
RN file: `mobile/app/auth/update-password.tsx` (**new**)
Priority: P1 · Dependencies: Auth callback (`type=recovery` branch) · API: `auth.updateUser({ password })` · Store: `authStore`
UI: `PasswordInput` ×2, `Button`. Validation: ≥ 6 chars, must match. On success → `/(tabs)`. No session → `/(auth)/login`.

---

### Screen: Auth callback
PWA route: `/auth/callback`
RN file: `mobile/app/auth/callback.tsx` (exists)
Priority: P0 · Store: `authStore.createSessionFromUrl`
Changes: add the `type=recovery` → `/auth/update-password` branch; honour `next`; apply the pending referral.

---

### Screen: Home
PWA route: `/`
RN file: `mobile/app/(tabs)/index.tsx` (exists)
Priority: P0 · Dependencies: none · Shared logic: none · API: none (optional: testimonials `GET /api/feedback` — public, works without B2) · Store: `authStore`
UI Components: `AppHeader { homeOnLogo? }`, `HeroCarousel`, `QuickTools`, `TopPicks`, `Testimonials` (new, P2), `Footer CTA`
Navigation: tab 1. Tiles → **SIP `/calculators/sip`, SWP `/calculators/swp`, Split `/(tabs)/split`, Tax `/calculators/tax-regime`, EMI `/calculators/emi`, Portfolio `/portfolio` (P3; until then `/calculators`), Analyse `/(tabs)/analyse`** (fix B6).
Data: none; loading n/a.
Interactions: carousel swipe + CTA; tile tap (login-gated where the web requires auth); "Create free account" / "Log in" (logged out).
Design match: hero background `rgba(224,231,255,0.65)` with orbs; H1 sub 28/800 `#534AB7`, main `#111110`; H2 13–14 `#5F5E5A`; 4-column tool grid; `paddingBottom 120`.

---

### Screen: Report (analysis summary)
PWA route: `/analyse` (logged-in entry) + summary of `/analyse/result`
RN file: `mobile/app/(tabs)/analyse.tsx` (exists — rebuild data layer)
Priority: P0 · Dependencies: Analyse form, B1 · Shared logic: `userAnalyseSnapshot.ts` (port), `financialEngine.ts`, `analysisSnapshotValidation.ts` · API: direct Supabase · Store: `financialStore` (wire it), `authStore`
UI Components: `ResultCard { score, title?, subtitle? }` (exists, uses `HealthScoreRing`), `IssueCard { severity, title, description }`, `Card`, `Button`
Navigation: tab 2. "Retake →" / empty CTA → `/analyse/consent` (first time) or `/analyse/form`; "See full report" → `/analyse/result`; fix-plan CTA → `/analyse/fixplan`.
Data:
- Load: `financialStore` (persisted); if empty → `fetchUserAnalyseSnapshot(uid)` → `hydrateFromSnapshot`; fallback `user_analysis.analysis_result`.
- Loading: `LoadingSpinner`. Empty: "Know your financial health" + 3 stats + "Start health check". Error: retry.
Interactions: pull-to-refresh (re-fetch the snapshot); issue card tap → result section anchor.
Design match: score colours — Critical < 40 `#FDEDED/#991B1B`, Warning < 70 `#FFF4E5/#92400E`, Good `#DCFCE7/#166534`.

---

### Screen: Analyse consent
PWA route: `/analyse` (ConsentModal gate)
RN file: `mobile/app/analyse/consent.tsx` (**new**, `presentation: 'modal'`)
Priority: P0 · Dependencies: Login · API: Supabase `users` select/update (`data_consent_given`, `data_consent_at`, `data_consent_version:'v2'`) · Store: `authStore`
UI: `ConsentSheet { onAccept, onDecline }` — copy from `components/analyse/ConsentModal.tsx` (what we collect, no PAN/Aadhaar, DPDP rights, links).
Data: check `appStorage['finkoin_analyse_consent_v2_<uid>']` → else `users.data_consent_given`; if true, skip straight to the form.
Interactions: Accept → cache + update `users` → `router.replace('/analyse/form')`; Decline → back to the Report tab.
Design: bottom sheet, radius 20, primary Accept, ghost Decline.

---

### Screen: Analyse form (health check)
PWA route: `/analyse`
RN file: `mobile/app/analyse/form.tsx` (exists — rebuild to parity)
Priority: P0 · Dependencies: Consent, `financialStore`, `obligationStore` (new) · Shared logic: `analyse-form-schema.ts` (step schemas, `normalizeAnalyseFormValues`, `mergeAnalyseDraftWithProfile`, `coalesceInsuranceToggles`, labels/enums), `financialEngine.ts`, `userAnalyseSnapshot.ts`, `aiService.ts` (adapted) · API: Supabase (`user_analyse_snapshots`, `financial_obligations` upsert, RPC `generate_monthly_checklist`); `/api/ai/analyse` and `/api/financial-data` once B2 lands (fire-and-forget; skip gracefully if 401) · Store: `financialStore`, `obligationStore`, `authStore`

UI Components needed:
- `StepHeader { step, total, title, onBack, onStartFresh }` + `StepIndicator { current, total, labels }` (exists)
- `RadioCards<T> { options:{value,label,description?}[], value, onChange }`
- `ToggleButtons<T> { options, value, onChange }` (Yes/No, Monthly/Yearly)
- `MoneyInput { label, value, onChangeValue, helper?, error?, optional? }` (exists; add in-words helper via `formatInWords`)
- `NumberInput { label, value, onChange, suffix?, min?, max? }` (new)
- `SelectSheet<T> { label, value, options, onChange }` (new; loan type, parents city, PO scheme, custom investment type)
- `DayOfMonthPicker { label, value?, onChange, hint? }` and `PremiumDueFields { label, month?, day?, onMonth, onDay }` (new — port `ObligationDateFields`)
- `PremiumField { amountValue, frequency, onAmount, onFrequency, label }`
- `FieldArray` rows: `LoanRow`, `OtherInsuranceRow`, `CustomInvestmentRow`, `PostOfficeRow` (add/remove)
- `PrivateAmount { value, label }` (new RN port) for the live total income
- `Note { tone: 'info'|'yellow'|'red', children }`
- `AdvisorSheet { step, stepTitle, onClose, children }` (port of `AnalyseAdvisorModal`)

Navigation: from Consent / Report "Retake" → on submit `router.replace('/analyse/result')`; back on step 1 → `router.back()`.

Data:
- Load: draft from `financialStore.analysis` merged with `lastSubmission` (`mergeAnalyseDraftWithProfile`); resume `currentStep`.
- Loading: submit overlay "Analysing your finances…". Error: "Analysis failed. Please try again." / "Something went wrong. Please try again."

Interactions: **every field from PWA audit §1.5** (Steps 1–7), same labels, same conditional visibility, same Zod validation per step (`stepNSchema.safeParse` → map field errors → scroll to the first error). Next / Back / step-chip jump; "Start fresh" (confirm Alert → wipe the store + `finkoin_ai_cache`); Advisor button; final "Get my score".
Submit pipeline (identical order): `coalesceInsuranceToggles` → `normalizeAnalyseFormValues` → `financialStore.setFullAnalysis` → `getAIFixPlan` (with fallback) → `setAiPlan` → `upsertUserAnalyseSnapshot` → `obligationStore.syncFromHealthCheck` → `POST /api/financial-data` (if B2) → keep the `user_analysis` upsert → navigate.

Design match: labels 14/500 `#5F5E5A`; section titles 11/700 uppercase `#534AB7`; helper 12 `#9B9A94`; inputs 16 px; sticky footer (Back ghost / Next primary) above the bottom inset; `KeyboardAvoidingView` + `ScrollView keyboardShouldPersistTaps="handled"`.

---

### Screen: Analyse result
PWA route: `/analyse/result`
RN file: `mobile/app/analyse/result.tsx` (**new**)
Priority: P0 · Dependencies: Analyse form, Report · Shared logic: `financialEngine.ts` (`analyseFinances`, `monthlyTotalIncome`), `universal-buckets.ts`, `bucket-breakdown.ts`, `speedo-meter-buckets.ts`, `priorityEngine.ts`, `netWorth.ts` · API: Supabase snapshot; feedback `POST /api/feedback` (public path works; FK only after B2); paywall (Sprint 3) · Store: `financialStore`, `authStore`

UI Components needed:
- `ScoreHero { score, label, incomeMasked }` (uses `HealthScoreRing`)
- `NetWorthSummary { assets, liabilities, netWorth }`
- `BucketTable { rows: {key,label,capPercent,actual,capAmount,details,status,items[]}[], expanded:string[], onToggle }`
- `GaugeRow` (RN SVG port of `SpeedoMeter`, simplified: 4 arcs + cap marker)
- `SafetyNetList { items: {id,title,current,target,isOk,icon}[] }`
- `CashFlowWaterfall { income, needs, emis, wants, insuranceInvest, surplus }`
- `UnlockCard { title, subText, onPress }`
- `FeedbackCard { pageContext:'result' }`
- `PrivateAmount`

Navigation: from the form submit / Report "See full report" → `/analyse/fixplan` (unlock), links to `/calculators/tax-regime`, `/(tabs)/tracker`, `/learn`.
Data: `financialStore.lastSubmission/result`; fallback snapshot. Empty: "No analysis found" + "Start analysis →". Error boundary.
Interactions: bucket row expand; eye toggles; unlock (skip-payment env / pro → fixplan; else paywall sheet); feedback stars + message; pull-to-refresh.
Design match: bucket caps Needs 30 %, Wants 5 %, Insurance premiums 5 %, Loans 40 %, Investment 20 %; status good ≤ cap, warning ≤ 1.15×, critical > 1.15×.

---

### Screen: Fix plan
PWA route: `/analyse/fixplan`
RN file: `mobile/app/analyse/fixplan.tsx` (exists — placeholder → build)
Priority: P1 · Dependencies: Result, **B2**, paywall · Shared logic: `priorityEngine.ts`, `cache.ts` (adapted), `finkoinAiPlan.ts`, `payment.ts` (adapted) · API: `POST /api/ai/analyse` (Bearer); Supabase `user_analysis` update `ai_fix_plan` · Store: `financialStore`, `authStore`
UI Components: `RotatingLoader { messages[] }`, `GreetingCard`, `PriorityCard { rank, title, gap, monthlyContribution, monthsToComplete, actionThisWeek, whyThisMatters, status }`, `SurplusSteps`, `DebtTable { debts[] }`, `GoalPlan`, `FdOpportunity`, `ThisWeekCard`, `FallbackBanner { onRetry }`, `Button 'Download PDF'`
Navigation: from Result unlock → back to Result.
Data: `hashProfile` → `appStorage` cache (30 d) → else the API; merge engine numbers (authoritative) with AI text exactly like `app/analyse/fixplan/page.tsx`. Loading: the 5 rotating messages. Error: fallback plan (`generateFallbackPlan`) + retry.
Interactions: Retry AI; Download PDF (`expo-print` `printToFileAsync` + `expo-sharing`); eye on income.
Design match: rank chips `#EEEDFE/#534AB7`; urgency colours.

---

### Screen: Tracker
PWA route: `/tracker`
RN file: `mobile/app/(tabs)/tracker.tsx` (exists — rebuild on the ported libs)
Priority: P0 · Dependencies: B4, `obligationStore` · Shared logic: `tracker-categories.ts`, `trackerSafetyPulse.ts`, `trackerCreditCards.ts`, `trackerMonthIncome.ts`, `trackerObligationSync.ts`, `obligationLearn.ts`, `trackerProfileIncome.ts` (adapted), `localDate.ts` · API: direct Supabase · Store: `authStore`, `financialStore`, `obligationStore`

UI Components needed:
- `TrackerConsent { onAccept }` (exists, wire it)
- `MonthSwitcher { label, canPrev, canNext, onPrev, onNext }`
- `SummaryCard { income, spent, left, onCards, cashUsedPct, visible, onToggleVisible, onEditIncome }` (flip or fade on reveal)
- `ShowAllPill { visible, onToggle }`
- `IncomeSection { txns, fallbackIncome, visible, onToggleEye, onAdd, onEdit, onDelete }`
- `BucketSection { bucket, label, capPercent, spent, capAmount, txns, expanded, visible, onToggle, onAdd, onEdit, onDelete }`
- `TxnRow { icon, description, date, amount, isCard, onEdit, onDelete }` with swipe actions
- `MonthSafetyPulse { pulse, previousMonthLabel, forceVisible, children }` (exists)
- `CreditCardBillReminder` (RN port; props as web)
- `ObligationsChecklist` (RN port; props as web) + `AddObligationSheet`
- `AddExpenseSheet { visible, onClose, onSaved, defaultDate, maxDate, defaultBucket?, defaultSubcategory?, defaultAmount?, defaultDescription?, defaultPaymentMethod?, editExpense? }` (exists, wire it)
- `FAB { onPress }`

Navigation: tab 3 (centre). Header "History" → `/tracker/[month]`.
Data:
- Load: consent (`appStorage['finkoin_tracker_consent']==='v2'` → else `tracker_consent`); `expense_transactions` for the current, previous, and previous-2 months **by `month` + `year`**; `user_credit_cards`; `obligation_checklist` for the month; profile income fallback from the snapshot.
- Loading: inline "Updating…". Empty: bucket sections show "No expenses yet — tap + to add". Error: inline retry.
Interactions: prev/next month (forward limit `trackerForwardLimit()` — the last-Friday unlock); summary eye + Show all; tap Income to edit; bucket expand; "+ Add" per bucket; row edit; row delete (Alert "Remove this entry?") also un-ticks a covered obligation; swipe-left row → Edit / Delete; pull-to-refresh; `AppState` 'active' → soft refetch; midnight rollover timer; CC "Pay bill" → sheet prefilled; obligations: paid / undo / skip / edit / delete / add / reset; learned-obligation suggestion accept/dismiss.
Design match: summary card `#534AB7` with white 10 px uppercase labels (70 % opacity); 3-column grid; progress `#6BCB77` ≤ 70 %, `#FFD93D` ≤ 90 %, `#FF6B6B` above; bucket accents from `TRACKER_CATEGORIES[bucket].color`; the add sheet is a bottom sheet (radius 20, maxHeight 90 %).

---

### Screen: Tracker month history
PWA route: `/tracker/[month]`
RN file: `mobile/app/tracker/[month].tsx` (**new**)
Priority: P1 · Dependencies: Tracker · Shared: `tracker-categories.ts` (`countsTowardTrackerTotals`) · API: Supabase `expense_transactions` (month/year) · Store: `authStore`
UI: `MonthSummary { title, bucketTotals, totalSpent }`, `ExpenseList { transactions, onEdit, onDelete }`, `AddExpenseSheet`.
Navigation: from Tracker header / month title → back. Invalid `YYYY-MM` → `router.replace('/(tabs)/tracker')`.
Data/states: loading spinner; empty "No entries this month"; error retry. Interactions: edit/delete rows, add.

---

### Screen: Split — groups
PWA route: `/split`
RN file: `mobile/app/(tabs)/split.tsx` (exists)
Priority: P0 · Dependencies: B3 · Shared: `splitInvite.ts` · API: direct Supabase (today) → `/api/split/groups`, `/api/split/invite` (after B2) · Store: `splitStore`, `authStore`
UI: `GroupRow { emoji, name, updatedAt, isCreator, onPress, onDelete }`, `CreateGroupSheet { step, name, emoji, inviteUrl, onCreate, onContinue }`, `InviteLinkShare { inviteUrl, groupName }` (RN: Copy via `expo-clipboard`, WhatsApp via `Linking.openURL('whatsapp://send?text=')`, system Share), `JoinByCodeSheet`, empty state.
Navigation: tab 4 → `/split/[groupId]`; join sheet → group.
Data: `fetchGroups(uid, email, force)`; add a **realtime** channel `my_groups:<uid>` on `split_group_members` (parity). Loading spinner; empty "No groups yet — create one"; error retry.
Interactions: pull-to-refresh; create (name required); copy/WhatsApp/share link; Continue; long-press/… delete (creator, Alert confirm); join by code (8 chars, uppercase).
Design match: rows min-height 64–72, emoji well `#EEEDFE`, primary CTA `#534AB7`.

---

### Screen: Split — group detail
PWA route: `/split/[groupId]`
RN file: `mobile/app/split/[groupId]/index.tsx` (exists)
Priority: P0 · Shared: `splitBalances.ts` · API: direct Supabase · Store: `splitStore`
Remaining work: realtime channel `split:<groupId>` (expenses/shares/settlements); email invite field (needs B2 → `/api/split/invite`); the `www` invite host (B3); swipe-to-delete on expense rows (creator); `hitSlop` on icon buttons.
UI (exists): header net ("You owe" `#E24B4A` / "You are owed" `#1D9E75`), `SegmentControl` tabs, `SimplifiedEdgeRow`, `ExpenseRow`, `MemberRow`, `SettleSheet { members, amount, method: 'upi'|'cash'|'bank', note }`, `InviteSheet`.

---

### Screen: Split — add / edit expense
PWA route: `/split/[groupId]/add-expense`
RN file: `mobile/app/split/[groupId]/add-expense.tsx` (exists)
Priority: P0 · Shared: `splitShares.ts` · Store: `splitStore`
Remaining work: replace the date text field with `@react-native-community/datetimepicker` (max = today); align the error copy with web ("Enter a valid amount.", "Enter a description.", "Choose who paid.", "Select at least one member to split with.", exact/percentage/share messages); category labels Food, Transport, Hotel, Entertainment, Shopping, Utilities, Medical, Other.

---

### Screen: Split — join (deep link)
PWA route: `/split/join?token=|code=`
RN file: `mobile/app/split/join.tsx` (**new**)
Priority: P0 · Dependencies: B2 (token), B3 · Shared: `splitInvite.ts`, `splitAuthRedirect.ts` (adapted) · API: `joinByCode` (Supabase) for `code`; `POST /api/split/join {token}` (Bearer) for `token` · Store: `splitStore`, `authStore`
UI: `JoinStatus { status: 'checking'|'joining'|'success'|'error', groupName?, message? }`, buttons Retry / Go to Split.
Navigation: deep link `finkoin://split/join?code=…` and `https://www.finkoin.com/split/join?…` (Android App Links / iOS Universal Links — add `intentFilters` with `autoVerify` + `associatedDomains`). Logged out → save the pending invite in `appStorage` → `/(auth)/login?next=/split/join?...`; resume after login.
Data states: checking spinner → success ("Joined {group}") → `router.replace('/split/<id>')`; error ("Invalid invite link", API message).

---

### Screen: Calculators hub
PWA route: `/calculators`
RN file: `mobile/app/(tabs)/calculators.tsx` (exists — convert to a hub list)
Priority: P1 · Shared: `constants/calculator-config.ts` · Store: none
UI: `CategoryChips { categories, value, onChange }`, `CalcCard { id, title, blurb, icon, onPress }`.
Navigation: hidden tab reached from Home tiles / header / profile menu → `router.push('/calculators/<id>')`.
Interactions: chip tap, card tap, back.

### Screen: Calculator detail
PWA route: `/calculators/[id]` (sip, swp, ppf, emergency, fire, emi, home, car, rentbuy, rentcar, whencar, po, po-savings, po-td, po-rd, nsc, po-kvp, po-mis, po-scss, po-ssy)
RN file: `mobile/app/calculators/[id].tsx` (**new**; move each tool out of `(tabs)/calculators.tsx` into `mobile/components/calculators/<Name>Calculator.tsx`)
Priority: P1 · Shared: `fireCalculator.ts`, `sipGoal.ts`, `postOfficeSchemes.ts`, `calculatorInput.ts`, `amortisation.ts` (replace `calcEngines.ts` maths with the web engines for identical numbers) · Store: none
UI: `SliderField { label, value, min, max, step, onChange, format }` (exists; add a tap-to-type money input capped at `CALCULATOR_MONEY_MAX` ₹99 Cr), `ResultStat { label, value, hint?, accent? }`, `Insight { tone:'good'|'warn'|'bad', children }`, `AmortisationTable { rows, showAll, onToggle }` (EMI/home), `ShareButton { title, url }` (RN `Share.share` with `https://www.finkoin.com/calculators/<id>`).
Slider ranges must match PWA audit §1.13.1 exactly.
Navigation: unknown id → Alert + `router.back()`.

### Screen: Tax regime calculator
PWA route: `/calculators/tax-regime-2026`
RN file: `mobile/app/calculators/tax-regime.tsx` (**new**)
Priority: P1 (basic parity) → P2 (full Personal CA)
Shared: `taxRegimeComparisonFY2026.ts`, `taxCalculatorHelpers.ts`, `taxMissedDeductionAlerts.ts`, `taxTeachContent.ts` · Store: local + `appStorage['finkoin_tax_calculator']` (same schema version)
UI: `ToggleSection { title, subtitle, enabled, onToggle, expanded, onExpand, children }`, `ComparisonTable { rows: {category, old, new}[] }` (3 columns), `WinnerBanner`, `LiveSummaryBar` (sticky bottom), `EmploymentChips` (multi-select), `ItrSuggestion`, `MissedDeductionAlerts`, `TeachTooltip`.
Sections: every `ToggleSection` from PWA audit §1.14 (Job switch, HRA, 80GG, LTA, RSU/ESOP, Gratuity, Leave encashment, Business, Rental, Pension, Interest, Dividend, Capital gains, Agricultural, Other income, 80C + NPS, 80D, Other VI-A & 24(b)).
Interactions: toggles, money inputs, age bracket, metro, Reset (Alert), Share; paywall deep report in Sprint 3.

---

### Screen: Profile
PWA route: `/profile`
RN file: `mobile/app/(tabs)/profile.tsx` (exists — build out)
Priority: P0 (core) / P1 (assets edit)
Shared: `profileAssetsPatch.ts`, `syncProfileAssets.ts`, `financialEngine.ts`, `netWorth.ts` · API: Supabase snapshot + `users` · Store: `authStore`, `financialStore`, `gamificationStore` (new)
UI: `ProfileHero { avatarUrl, name, email }`, `StatTiles { score, fk }`, `AssetsSection { section:'cash'|'investments'|'physical'|'liabilities', rows, visible, onToggleEye, onEdit, onAdd }`, `EditAmountSheet`, `AddAssetSheet { catalog }`, `ChecklistList { items }`, `ReferralCard { link, onCopy, onWhatsApp }`, `MenuList` (Settings, Leaderboard, Rewards, Refer, Policies, Goals, Investments, Legal), `SignOutButton`.
Navigation: tab 5; menu → native screens (P1/P2) or `WebBrowser` for not-yet-built ones.
Data: snapshot → store; gamification row. Logged out: gate card (exists). Empty assets: "Complete your health check to see assets" → form.
Interactions: eye per section; tap row → edit sheet → `syncProfileAssets`; add menu; copy referral (`expo-clipboard`); WhatsApp share; Sign out (Alert confirm).

---

### Screen: Settings
PWA route: `/settings`
RN file: `mobile/app/settings.tsx` (**new**)
Priority: P1 · API: Supabase `users` (name, avatar_url), Storage `avatars`, `notification_preferences` upsert, `auth.resetPasswordForEmail` · Store: `authStore`
UI: `AvatarPicker` (`expo-image-picker` → upload), `Input name` + Save, `Button 'Send password reset email'`, `SwitchRow { label, value, onChange }` (Email tips, Push notifications, Payment & Split alerts), `Button 'Export my data'` (JSON via `expo-sharing`), `DangerButton 'Delete account'` (Alert confirm), `FeedbackRow`.
Push toggle: `expo-notifications` permission → store the Expo push token in `notification_preferences.push_token` (B7).

---

### Screen: Notifications inbox
PWA route: bell dropdown (no route)
RN file: `mobile/components/NotificationBell.tsx` (exists) — optional full screen `mobile/app/notifications.tsx` (P2)
Priority: P1 · Store: `notificationStore` (add `markPopupShown`, `getTodayUnshownPopup`, realtime `notifications:<uid>`)
Plus: **MorningTipSheet** (`mobile/components/MorningTipSheet.tsx`, P1): 06:00–22:59 IST, once per IST day (`appStorage['finkoin_tip_popup_<date>']`), 3 s delay, "Learn more" → `/learn`.

---

### Screen: Learn hub
PWA route: `/learn`
RN file: `mobile/app/learn/index.tsx` (**new**)
Priority: P2 · Shared: `learnContent.ts` · Store: none
UI: `CategoryChips` (All + Basics/Tax/Investment/Insurance/Loans/Property), `ArticleCard { title, subtitle, category, readTime }`.
Navigation: from Home TopPicks / MorningTip / Result links → `/learn/[id]`.

### Screen: Learn article
PWA route: `/learn/[id]`
RN file: `mobile/app/learn/[id].tsx` (**new**)
Priority: P2 · Shared: `learnContent.ts`, `learnRichArticles.ts`, FAQ data from `learnArticleFaqs.ts` (data only)
UI: `ArticleHeader`, `RichArticleRenderer` (RN renderer for the rich block types), `FaqAccordion`, `ShareButton`. The custom React guides (SipCrore, CompoundInterest, EmergencyFund, Form16Itr, IndexFund, TermVsEndowment, IncomeTaxFY2526, OldVsNewFY2526) → open the web URL in `WebBrowser` in P2, port in P3.

### Screen: Blog list / Blog article
PWA route: `/blog`, `/blog/[slug]`
RN files: `mobile/app/blog/index.tsx`, `mobile/app/blog/[slug].tsx` (**new**)
Priority: P3 · Shared: `blogContent.ts`, `lib/data/*` · UI: `ArticleCard`, a simple markdown-ish renderer (port `renderBlogBody` without next/link).

### Screen: Leaderboard
PWA route: `/leaderboard`
RN file: `mobile/app/leaderboard.tsx` (**new**)
Priority: P2 · API: Supabase `leaderboard_view` (limit 50 + my row); realtime `gamification` invalidation · Cache: `appStorage['finkoin_leaderboard']` 5 min
UI: `RankRow { rank, name, tokens, isMe }`, `MyRankCard`, Refresh button + pull-to-refresh.

### Screen: Rewards
PWA route: `/rewards` · RN file: `mobile/app/rewards.tsx` (**new**) · Priority: P2 · API: `gamification` · Store: `gamificationStore` · UI: balance, total earned, streak, badges grid.

### Screen: Refer & earn
PWA route: `/refer` · RN file: `mobile/app/refer.tsx` (**new**) · Priority: P2 · API: `users.referral_code`, `users` where `referred_by = uid` (count + names) · UI: code card, Copy, WhatsApp, Share, referred list.

### Screen: Investments
PWA route: `/investments` · RN file: `mobile/app/investments.tsx` (**new**) · Priority: P2 · Store: `financialStore` · UI: read-only roll-up cards.

### Screen: Optimizer
PWA route: `/optimizer` · RN file: `mobile/app/optimizer.tsx` (**new**) · Priority: P2 · Shared: `finkoinAiPlan.ts`, `financialOptimizer.ts`, `priorityEngine.ts`, `universal-buckets.ts`, `optimizer-format.ts` · API: `/api/ai/analyse` (B2) · UI: AI plan sections + allocation pie (`react-native-svg` arcs) + PDF.

### Screen: Policies
PWA route: `/policies` · RN file: `mobile/app/policies/index.tsx` + `mobile/app/policies/[id].tsx` (**new**) · Priority: P2 · Shared: `userPolicies.ts` (adapted) · API: `user_policies` CRUD · UI: policy list, add/edit sheet (type, insurer, policy number, cover, premium, frequency, renewal date, nominee, notes), renew/transfer intents.

### Screen: Goals
PWA route: `/goals` · RN file: `mobile/app/goals.tsx` (**new**) · Priority: P3 · UI: goal cards ("Coming soon" parity).

### Screen: Portfolio (demo)
PWA route: `/portfolio` · RN file: `mobile/app/portfolio.tsx` (**new**) · Priority: P3 · Store: `portfolioStore` (port) · UI: sample fund verdicts.

### Screen: Insurance / KYC / Plans / Pricing
PWA routes: `/insurance`, `/kyc`, `/plans`, `/pricing` · RN files: `mobile/app/insurance.tsx`, `kyc.tsx`, `plans.tsx` (**new**) · Priority: P3 · Mostly static; KYC uses the PAN format mock (`kycVerification.ts`).

### Screen: Legal & About (in-app browser)
PWA routes: `/legal/privacy|terms|refund|disclaimer`, `/about`, `/contact`
RN file: `mobile/app/legal/[doc].tsx` (**new**, opens `WebBrowser.openBrowserAsync('https://www.finkoin.com/legal/<doc>')` or a `react-native-webview`)
Priority: P1 (Play Store needs a privacy policy link in-app).

---

## SECTION 4 — COMPONENT LIBRARY NEEDED (`mobile/components/`)

Legend: ✅ exists · 🔧 exists, needs work · 🆕 to build

```ts
// ui/ ------------------------------------------------------------
Button        ✅ { label: string; onPress: () => void; variant?: 'primary'|'secondary'|'ghost'|'danger'; loading?: boolean; disabled?: boolean; style?: ViewStyle; icon?: AppIconName }
Card          ✅ { children: ReactNode; style?: ViewStyle; onPress?: () => void }
Input         ✅ { label?: string; value: string; onChangeText: (t: string) => void; error?: string; helper?: string } & TextInputProps   // fontSize 16
PasswordInput 🆕 { label?: string; value: string; onChangeText: (t: string) => void; placeholder?: string; autoComplete?: 'password'|'new-password' }
MoneyInput    🔧 { label?: string; value?: number|string|null; onChangeValue?: (n: number|null) => void; helper?: string; error?: string; optional?: boolean; max?: number; showInWords?: boolean }
NumberInput   🆕 { label?: string; value?: number; onChange: (n: number|undefined) => void; suffix?: string; min?: number; max?: number; step?: number; helper?: string; error?: string; integer?: boolean }
SliderField   🔧 { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string; editable?: boolean }
ResultStat    ✅ { label: string; value: string; hint?: string; accent?: boolean }
Insight       🆕 { tone: 'good'|'warn'|'bad'; children: ReactNode }
Chip          ✅ { label: string; selected?: boolean; onPress: () => void; style?: ViewStyle }
SegmentControl✅ { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }
ToggleButtons 🆕 <T extends string>{ options: { value: T; label: string }[]; value: T|undefined; onChange: (v: T) => void }
RadioCards    🆕 <T extends string>{ options: { value: T; label: string; description?: string; icon?: AppIconName }[]; value?: T; onChange: (v: T) => void }
SelectSheet   🆕 <T extends string>{ label: string; value?: T; options: { value: T; label: string }[]; onChange: (v: T) => void; placeholder?: string }
BottomSheet   🆕 { visible: boolean; onClose: () => void; title?: string; children: ReactNode; maxHeight?: DimensionValue; dismissOnBackdrop?: boolean }
ConfirmSheet  🆕 { visible: boolean; title: string; message?: string; confirmLabel: string; destructive?: boolean; onConfirm: () => void; onCancel: () => void }
PrivateAmount 🆕 { value: number; children: ReactNode; masked?: string; label?: string; eyeColor?: string; visible?: boolean; onToggle?: () => void }
PrivacyEye    ✅ EyeIcon{ open: boolean; size?; color? } · SectionPrivacyEye{ visible: boolean; onToggle: () => void; label?: string }
HealthScoreRing ✅ { score: number; size?: number; strokeWidth?: number }
Gauge         🆕 { segments: { value: number; color: string }[]; capFraction: number; label: string; amount: number; income: number }   // SpeedoMeter port
LoadingSpinner✅ { full?: boolean }
EmptyState    🆕 { icon: AppIconName; title: string; body?: string; ctaLabel?: string; onCta?: () => void }
ErrorBox      🆕 { message: string; onRetry?: () => void }
AppIcon       🔧 { name: AppIconName; size?: number; color?: string; strokeWidth?: number }   // add missing icons: mail, lock, trophy, gift, settings, notebook, target…
TrackerIcon   🆕 { name: TrackerIconName; size?: number; color?: string } · TrackerIconBadge{ name; size?; iconSize?; color? }
ShareButton   🆕 { title: string; url: string; message?: string; compact?: boolean }
FormError     🆕 { message?: string|null }
BrandLogo     ✅ { size?: number; withWordmark?: boolean; style?: ViewStyle }

// navigation / shell ---------------------------------------------
FinkoinTabBar ✅ BottomTabBarProps
AppHeader     ✅ { homeOnLogo?: boolean }
ProfileMenu   🔧 { visible: boolean; onClose: () => void }
NotificationBell 🔧 (no props) — add realtime
MorningTipSheet 🆕 (no props)
PushPermissionPrompt 🆕 (no props) — expo-notifications

// analyse --------------------------------------------------------
ConsentSheet  🆕 { onAccept: () => void; onDecline: () => void }
StepIndicator ✅ { current: number; total: number; labels?: string[] }
StepHeader    🆕 { step: number; total: number; title: string; onBack: () => void; onStartFresh: () => void; onAdvisor: () => void }
PremiumField  🆕 { label: string; amount?: number; frequency: 'monthly'|'yearly'; onAmount: (n?: number) => void; onFrequency: (f: 'monthly'|'yearly') => void; error?: string }
DayOfMonthPicker 🆕 { label: string; value?: number; onChange: (d?: number) => void; hint?: string }
PremiumDueFields 🆕 { label: string; month?: number; day?: number; onMonth: (m?: number) => void; onDay: (d?: number) => void; hint?: string }
LoanRow / OtherInsuranceRow / CustomInvestmentRow / PostOfficeRow 🆕 { index: number; value: T; onChange: (v: T) => void; onRemove: () => void; errors?: Record<string,string> }
ResultCard    ✅ { score: number; title?: string; subtitle?: string }
BucketTable   🆕 { rows: BucketRow[]; expanded: string[]; onToggle: (key: string) => void; income: number }
SafetyNetList 🆕 { items: { id: string; title: string; current: number; target: number; isOk: boolean; icon: AppIconName }[] }
CashFlowWaterfall 🆕 { income: number; needs: number; emis: number; wants: number; insuranceInvest: number }
PaywallSheet  🆕 { visible: boolean; onClose: () => void; priceLabel?: string; title?: string; bulletPoints?: string[]; onUnlocked: () => void }
PriorityCard  🆕 { item: PriorityItem; index: number }
DebtTable     🆕 { debts: DebtItem[] }
FeedbackCard  🆕 { pageContext: string; onClose?: () => void }

// tracker --------------------------------------------------------
TrackerConsent ✅ { onAccept: () => void }
AddExpenseSheet ✅ { visible; onClose; onSaved; defaultDate; maxDate; defaultBucket?; defaultSubcategory?; defaultAmount?; defaultDescription?; defaultPaymentMethod?; editExpense? }
MonthSafetyPulse ✅ { pulse: SafetyPulseResult; previousMonthLabel?: string|null; forceVisible?: boolean; children?: ReactNode }
MonthSwitcher 🆕 { label: string; canPrev: boolean; canNext: boolean; onPrev: () => void; onNext: () => void }
SummaryCard   🆕 { income: number; spent: number; left: number; onCards: number; cashUsedPct: number; visible: boolean; onToggleVisible: () => void; onEditIncome: () => void }
BucketSection 🆕 { bucket: BucketType; txns: Txn[]; income: number; expanded: boolean; visible: boolean; onToggle; onToggleEye; onAdd; onEdit; onDelete }
TxnRow        🆕 { txn: Txn; visible: boolean; onEdit: () => void; onDelete: () => void }   // swipeable
CreditCardBillReminder 🆕 (props as web)
ObligationsChecklist 🆕 { userId: string; checklistMonth?: Date; learnedSuggestion?; onDismissLearn?; analyseCompleted?: boolean; defaultOpen?: boolean }
AddObligationSheet 🆕 { visible; onSave(payload); onClose; initial?; submitLabel? }
MonthSummary  🆕 { title: string; bucketTotals: Record<string, number>; totalSpent: number }

// split ----------------------------------------------------------
InviteLinkShare 🆕 { inviteUrl: string; groupName: string }   // extract from split screens
GroupRow, ExpenseRow, MemberRow, SimplifiedEdgeRow, SettleSheet 🔧 (extract from existing screens)

// profile / misc -------------------------------------------------
AssetsSection, EditAmountSheet, AddAssetSheet, ChecklistList, ReferralCard 🆕
ArticleCard, RichArticleRenderer, FaqAccordion 🆕
RankRow, MyRankCard 🆕
```

---

## SECTION 5 — NAVIGATION STRUCTURE

### 5.1 Expo Router file tree (target)

```
mobile/app/
├── _layout.tsx                    Root <Stack> (headerShown:false) + providers + initAuth + notification listeners
├── index.tsx                      <Redirect href="/(tabs)" />
├── +not-found.tsx                 🆕 fallback
├── (auth)/                        presentation: 'modal'
│   ├── _layout.tsx
│   ├── index.tsx                  → /(tabs)
│   ├── login.tsx
│   ├── signup.tsx
│   └── forgot-password.tsx        🆕
├── auth/
│   ├── callback.tsx               deep link finkoin://auth/callback
│   └── update-password.tsx        🆕
├── (tabs)/
│   ├── _layout.tsx                FinkoinTabBar: Home · Report · [Track] · Split · Profile
│   ├── index.tsx                  Home
│   ├── analyse.tsx                Report
│   ├── tracker.tsx                Track (centre)
│   ├── split.tsx                  Split
│   ├── profile.tsx                Profile
│   └── calculators.tsx            hidden (href:null) — Calculators hub
├── analyse/
│   ├── consent.tsx                🆕 presentation: 'modal'
│   ├── form.tsx
│   ├── result.tsx                 🆕
│   └── fixplan.tsx
├── tracker/
│   └── [month].tsx                🆕
├── split/
│   ├── join.tsx                   🆕 deep link
│   └── [groupId]/
│       ├── index.tsx
│       └── add-expense.tsx        (?edit=<expenseId>)
├── calculators/
│   ├── [id].tsx                   🆕
│   └── tax-regime.tsx             🆕
├── learn/
│   ├── index.tsx                  🆕
│   └── [id].tsx                   🆕
├── blog/
│   ├── index.tsx                  🆕
│   └── [slug].tsx                 🆕
├── settings.tsx                   🆕
├── notifications.tsx              🆕 (optional)
├── leaderboard.tsx                🆕
├── rewards.tsx                    🆕
├── refer.tsx                      🆕
├── investments.tsx                🆕
├── optimizer.tsx                  🆕
├── policies/
│   ├── index.tsx                  🆕
│   └── [id].tsx                   🆕
├── goals.tsx                      🆕
├── portfolio.tsx                  🆕
├── insurance.tsx                  🆕
├── kyc.tsx                        🆕
├── plans.tsx                      🆕
└── legal/
    └── [doc].tsx                  🆕 privacy | terms | refund | disclaimer
```

### 5.2 Tab navigator configuration

```tsx
<Tabs tabBar={(p) => <FinkoinTabBar {...p} />} screenOptions={{ headerShown: false }}>
  <Tabs.Screen name="index"       options={{ title: 'Home' }} />
  <Tabs.Screen name="analyse"     options={{ title: 'Report' }} />
  <Tabs.Screen name="tracker"     options={{ title: 'Track' }} />      // raised centre button
  <Tabs.Screen name="split"       options={{ title: 'Split' }} />
  <Tabs.Screen name="profile"     options={{ title: 'Profile' }} />
  <Tabs.Screen name="calculators" options={{ title: 'Calculators', href: null }} />
</Tabs>
```
Auth-gated tabs (Report data, Track, Split, Profile) render an in-screen login gate rather than redirecting (matches the existing Profile/Split pattern and PWA `ProtectedGate` behaviour).

### 5.3 Stack screens (root)
`analyse/form`, `analyse/result`, `analyse/fixplan`, `tracker/[month]`, `split/[groupId]/index`, `split/[groupId]/add-expense`, `split/join`, `calculators/[id]`, `calculators/tax-regime`, `learn/*`, `blog/*`, `settings`, `leaderboard`, `rewards`, `refer`, `investments`, `optimizer`, `policies/*`, `goals`, `portfolio`, `insurance`, `kyc`, `plans`, `legal/[doc]` — all `headerShown:false` with a shared `ScreenHeader { title, onBack }` component, `animation: 'slide_from_right'`.

### 5.4 Modal screens
`(auth)` group (`presentation:'modal'`), `analyse/consent` (`'modal'`). Everything else that's a PWA modal (add expense, settle, invite, create group, paywall, obligation form, asset edit, confirm) is an **in-screen `BottomSheet` component**, not a route.

### 5.5 Deep links

| Link | Target | Notes |
|---|---|---|
| `finkoin://auth/callback?code=…` / `exp://…/--/auth/callback` | `auth/callback` | Exists |
| `finkoin://auth/callback?type=recovery` | `auth/update-password` | 🆕 add to Supabase redirect URLs |
| `finkoin://split/join?code=XXXX` | `split/join` | 🆕 |
| `https://www.finkoin.com/split/join?token=…|code=…` | `split/join` | 🆕 Android `intentFilters` (`autoVerify`, host `www.finkoin.com`, pathPrefix `/split/join`) + iOS `associatedDomains: ['applinks:www.finkoin.com']`; host `/.well-known/assetlinks.json` + `apple-app-site-association` on web |
| `finkoin://calculators/<id>` | `calculators/[id]` | 🆕 used by push/tips |
| `finkoin://tracker`, `finkoin://analyse/result`, `finkoin://learn/<id>` | respective | 🆕 notification taps (`expo-notifications` response listener → `router.push`) |

---

## SECTION 6 — SUPABASE QUERIES NEEDED IN MOBILE

All run with the user's session (RLS). Copied from the web implementation (file references in brackets).

### 6.1 Auth / profile
```ts
// [store/authStore.ts initAuth/refreshUser]
supabase.from('users').select('*').eq('id', uid).maybeSingle();
supabase.from('gamification').select('*').eq('user_id', uid).maybeSingle();
supabase.from('gamification').insert({ user_id: uid, fk_balance: 0 /* trigger seeds 50 */ });   // if missing
supabase.from('users').update({ referral_code }).eq('id', uid);                                    // if missing
// [app/analyse/AnalyseAppClient.tsx]
supabase.from('users').select('data_consent_given').eq('id', uid).maybeSingle();
supabase.from('users').update({ data_consent_given: true, data_consent_at: nowIso, data_consent_version: 'v2' }).eq('id', uid);
// [app/settings/page.tsx]
supabase.from('users').update({ name }).eq('id', uid);
supabase.storage.from('avatars').upload(`${uid}/${Date.now()}.jpg`, blob, { upsert: true });
supabase.storage.from('avatars').getPublicUrl(path);
supabase.from('users').update({ avatar_url }).eq('id', uid);
supabase.from('notification_preferences').select('*').eq('user_id', uid).maybeSingle();
supabase.from('notification_preferences').upsert({ user_id: uid, /* email_tips, push_enabled, push_token */ }, { onConflict: 'user_id' });
```

### 6.2 Analyse
```ts
// [lib/userAnalyseSnapshot.ts]
supabase.from('user_analyse_snapshots').select('payload').eq('user_id', uid).maybeSingle();
supabase.from('user_analyse_snapshots').upsert({ user_id: uid, payload, updated_at: nowIso }, { onConflict: 'user_id' });
// legacy fallback / mobile back-compat
supabase.from('user_analysis').select('analysis_result, profile, ai_fix_plan, updated_at').eq('user_id', uid).maybeSingle();
supabase.from('user_analysis').upsert({ user_id: uid, profile, analysis_result, updated_at: nowIso }, { onConflict: 'user_id' });
// [app/analyse/fixplan/page.tsx]
supabase.from('user_analysis').update({ ai_fix_plan: combinedPlan, ai_generated_at: nowIso }).eq('user_id', uid);
```

### 6.3 Tracker
```ts
// [app/tracker/page.tsx]
supabase.from('tracker_consent').select('consent_given, consent_at, consent_version').eq('user_id', uid).maybeSingle();
supabase.from('tracker_consent').upsert({ user_id: uid, consent_given: true, consent_at: nowIso, consent_version: 'v2' });
supabase.from('expense_transactions').select('*').eq('user_id', uid).eq('month', monthName).eq('year', year).order('date', { ascending: false });
supabase.from('expense_transactions').select('date, month, year').eq('user_id', uid).order('date', { ascending: true }).limit(1).maybeSingle();
// [components/tracker/AddExpenseModal.tsx]
supabase.from('expense_transactions').insert({ user_id, date, amount, category, subcategory, bucket, description, payment_method, month, year });
supabase.from('expense_transactions').update(payload).eq('id', id).eq('user_id', uid);
supabase.from('expense_transactions').delete().eq('id', id).eq('user_id', uid);
// [lib/trackerCreditCards.ts]
supabase.from('user_credit_cards').select('id, nickname, last4, billing_day, due_day, created_at').eq('user_id', uid).order('created_at', { ascending: true });
supabase.from('user_credit_cards').upsert({ id, user_id, nickname, last4, billing_day, due_day, created_at, updated_at });
supabase.from('user_credit_cards').delete().eq('id', cardId).eq('user_id', uid);
```

### 6.4 Obligations (`store/obligationStore.ts` — port whole store)
```ts
supabase.from('financial_obligations').select('*').eq('user_id', uid).eq('is_active', true).order('category');
supabase.from('obligation_checklist').select('*, obligation:financial_obligations(*)').eq('user_id', uid).eq('checklist_month', monthStartIso).order('created_at');
supabase.rpc('generate_monthly_checklist', { p_user_id: uid, p_month: monthStartIso });
supabase.from('financial_obligations').insert({...}).select().single();
supabase.from('financial_obligations').update({...}).eq('id', id);
supabase.from('financial_obligations').update({ is_active: false }).eq('id', id);                    // soft delete
supabase.from('obligation_checklist').update({ status: 'paid', paid_at: nowIso, paid_amount }).eq('id', id);
supabase.from('obligation_checklist').update({ status: 'pending', paid_at: null, paid_amount: null }).eq('id', id);
supabase.from('obligation_checklist').update({ status: 'skipped' }).eq('id', id);
supabase.from('financial_obligations').upsert(rows, { onConflict: 'user_id,title,category' });      // syncFromHealthCheck
```

### 6.5 Split (mobile `store/splitStore.ts` — already implemented)
```ts
supabase.from('split_group_members').select('group_id').eq('email', email).eq('status', 'active');
supabase.from('split_groups').select('*').in('id', groupIds).eq('is_active', true).order('updated_at', { ascending: false });
supabase.from('split_groups').select('*').eq('id', groupId).single();
supabase.from('split_group_members').select('*').eq('group_id', groupId).in('status', ['active', 'pending']);
supabase.from('split_expenses').select('*, shares:split_expense_shares(*)').eq('group_id', groupId).or('is_deleted.eq.false,is_deleted.is.null').order('expense_date', { ascending: false }).order('created_at', { ascending: false }).limit(100);
supabase.from('split_settlements').select('*').eq('group_id', groupId).eq('status', 'completed').order('completed_at', { ascending: false }).limit(50);
// writes: split_groups insert/update(invite_code, is_active), split_group_members insert/upsert/update(status:'left'),
//         split_expenses insert/update(is_deleted), split_expense_shares insert/delete, split_settlements insert
// realtime (add):
supabase.channel(`my_groups:${uid}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'split_group_members' }, refetch).subscribe();
supabase.channel(`split:${groupId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'split_expenses', filter: `group_id=eq.${groupId}` }, refetch)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'split_settlements', filter: `group_id=eq.${groupId}` }, refetch).subscribe();
```

### 6.6 Notifications / gamification / social
```ts
// [store/notificationStore.ts]
supabase.from('user_notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(20);
supabase.from('user_notifications').update({ is_read: true }).eq('user_id', uid).eq('is_read', false);
supabase.from('user_notifications').update({ shown_as_popup: true, is_read: true }).eq('id', notifId);
supabase.channel(`notifications:${uid}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${uid}` }, refetch).subscribe();
// [store/gamificationStore.ts]
supabase.from('gamification').select('*').eq('user_id', uid).maybeSingle();
supabase.from('gamification').upsert({ user_id: uid, streak_days, last_login }, { onConflict: 'user_id' });
supabase.from('fk_transactions').insert({ user_id: uid, amount, reason, reference_id });
supabase.channel(`gamification:${uid}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'gamification', filter: `user_id=eq.${uid}` }, apply).subscribe();
// [app/leaderboard/page.tsx]
supabase.from('leaderboard_view').select('*').limit(50);
supabase.from('leaderboard_view').select('*').eq('user_id', uid).maybeSingle();
// [app/refer/page.tsx], [app/rewards/page.tsx]
supabase.from('users').select('referral_code').eq('id', uid).single();
supabase.from('users').select('*', { count: 'exact', head: true }).eq('referred_by', uid);   // referral count
supabase.from('users').select('name').eq('referred_by', uid).limit(25);                     // referred list
// [lib/userPolicies.ts]
supabase.from('user_policies').select('*').eq('user_id', uid).order('renewal_date');
supabase.from('user_policies').insert(row) / .update(patch).eq('id', id) / .delete().eq('id', id);
```

### 6.7 Server-only (call via API with Bearer after B2 — never from the client)
`user_financial_data` (encryption), `feedback` + FK award, `split_invitations` token flow, `search_by_keywords` (RAG), Razorpay order/verify, `push_subscriptions`.

---

## SECTION 7 — SPRINT PLAN

Assumes 1 RN developer, 2-week sprints. Backend items (B2, Expo push sender, app-links files) are flagged **[web]** and need a web-repo PR.

### Sprint 1 (Week 1–2) — Data parity + tracker core (P0)
Create / modify **in this order**:
1. `mobile/.env.example` — add `EXPO_PUBLIC_SITE_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_SKIP_PAYMENT` (B8)
2. `mobile/lib/localDate.ts`, `trackerMonthIncome.ts`, `trackerObligationSync.ts`, `obligationLearn.ts`, `trackerCashAudit.ts`, `bucket-breakdown.ts`, `speedo-meter-buckets.ts`, `netWorth.ts`, `analysisSnapshotValidation.ts`, `finkoinAiPlan.ts`, `expense-bucket-recommendations.ts` — copy as-is
3. `mobile/lib/userAnalyseSnapshot.ts` — port (B1)
4. `mobile/lib/trackerProfileIncome.ts` — port with `appStorage`
5. `mobile/store/financialStore.ts` — wire hydration from the snapshot (`hydrateFromSnapshot`)
6. `mobile/store/obligationStore.ts` — port the web store
7. `mobile/components/ui/BottomSheet.tsx`, `ConfirmSheet.tsx`, `EmptyState.tsx`, `ErrorBox.tsx`, `PrivateAmount.tsx`, `FormError.tsx`
8. `mobile/components/tracker/TrackerIcons.tsx` (TrackerIcon / TrackerIconBadge)
9. `mobile/components/tracker/MonthSwitcher.tsx`, `SummaryCard.tsx`, `BucketSection.tsx`, `TxnRow.tsx`
10. `mobile/app/(tabs)/tracker.tsx` — rebuild: consent gate (`TrackerConsent`), month/year queries, `AddExpenseSheet`, `MonthSafetyPulse`, forward limit, eyes, pull-to-refresh, `AppState` refetch (B4, B5)
11. `mobile/app/(tabs)/analyse.tsx` — read the snapshot → store (B1)
12. `mobile/app/analyse/form.tsx` — write the snapshot + keep `user_analysis`; add `syncFromHealthCheck`
13. `mobile/components/landing/QuickTools.tsx`, `ProfileMenu.tsx` — fix routes (B6); `mobile/store/splitStore.ts` — `siteBase` www (B3)
14. `mobile/app/(auth)/forgot-password.tsx`, `authStore.resetPassword`, `login.tsx` (link + ≥ 6 rule + `next`)
15. **[web]** `lib/apiGuard.ts` Bearer support (B2) — raise the PR in parallel
Exit criteria: a web user logs in on mobile and sees their score; tracker add/edit/delete matches web totals for the same month.

### Sprint 2 (Week 3–4) — Health check parity + result + split join (P0)
1. `mobile/components/ui/NumberInput.tsx`, `ToggleButtons.tsx`, `RadioCards.tsx`, `SelectSheet.tsx`, `Insight.tsx`
2. `mobile/components/analyse/DayOfMonthPicker.tsx`, `PremiumDueFields.tsx`, `PremiumField.tsx`, `StepHeader.tsx`, `LoanRow.tsx`, `OtherInsuranceRow.tsx`, `CustomInvestmentRow.tsx`, `PostOfficeRow.tsx`, `AdvisorSheet.tsx`, `ConsentSheet.tsx`
3. `mobile/app/analyse/consent.tsx`
4. `mobile/app/analyse/form.tsx` — full 7-step parity with Zod step schemas and draft persistence
5. `mobile/components/analyse/ScoreHero.tsx`, `NetWorthSummary.tsx`, `BucketTable.tsx`, `Gauge.tsx`, `SafetyNetList.tsx`, `CashFlowWaterfall.tsx`, `UnlockCard.tsx`, `FeedbackCard.tsx`
6. `mobile/app/analyse/result.tsx`
7. `mobile/components/tracker/ObligationsChecklist.tsx`, `AddObligationSheet.tsx`, `CreditCardBillReminder.tsx` → mount inside `MonthSafetyPulse` on the tracker
8. `mobile/components/split/InviteLinkShare.tsx` (expo-clipboard + WhatsApp + Share); refactor the split screens to use it
9. `mobile/app/split/join.tsx` + `app.json` deep-link config (`finkoin://split/join`); pending-invite resume in `mobile/lib/splitAuthRedirect.ts`
10. Split realtime channels in `(tabs)/split.tsx` and `split/[groupId]/index.tsx`; date picker in `add-expense.tsx`
11. `mobile/app/tracker/[month].tsx` + `components/tracker/MonthSummary.tsx`
Exit criteria: submitting on mobile produces the same score/buckets as web for the same inputs (compare with `lib/financialEngine.test.ts` fixtures); join-by-code deep link works logged-out → login → group.

### Sprint 3 (Week 5–6) — Fix plan, calculators, profile, settings (P1) + dev build
1. EAS: `eas.json`, development build profile; add `expo-notifications`, `expo-clipboard`, `expo-print`, `expo-sharing`, `expo-image-picker`, `@react-native-community/datetimepicker`, `react-native-razorpay`
2. `mobile/lib/api.ts` (Bearer fetch), `mobile/lib/aiService.ts`, `mobile/lib/cache.ts`, `mobile/lib/payment.ts` (adapted)
3. `mobile/components/analyse/PriorityCard.tsx`, `DebtTable.tsx`, `RotatingLoader.tsx`, `PaywallSheet.tsx` (Razorpay RN SDK → `/api/razorpay/create-order` + `/verify-payment`)
4. `mobile/app/analyse/fixplan.tsx` — full build + PDF via `expo-print`
5. `mobile/lib/fireCalculator.ts`, `sipGoal.ts`, `postOfficeSchemes.ts`, `calculatorInput.ts`, `taxRegimeComparisonFY2026.ts`, `taxCalculatorHelpers.ts`, `taxMissedDeductionAlerts.ts`, `taxTeachContent.ts`
6. `mobile/components/calculators/*Calculator.tsx` (extract from `(tabs)/calculators.tsx`; switch to the web engines), `AmortisationTable.tsx`, `ShareButton.tsx`
7. `mobile/app/calculators/[id].tsx`, `mobile/app/(tabs)/calculators.tsx` (hub list), deep-link the Home tiles
8. `mobile/components/calculators/ToggleSection.tsx`, `ComparisonTable.tsx` → `mobile/app/calculators/tax-regime.tsx` (core sections: salary, HRA, 80C/NPS, 80D, 24(b), other income, results)
9. `mobile/lib/profileAssetsPatch.ts`, `syncProfileAssets.ts` → `mobile/components/profile/*` → `mobile/app/(tabs)/profile.tsx`
10. `mobile/store/gamificationStore.ts` (fetch, streak, realtime), `mobile/store/notificationStore.ts` (popup + realtime), `mobile/components/MorningTipSheet.tsx`, `PushPermissionPrompt.tsx`
11. `mobile/app/settings.tsx`, `mobile/app/legal/[doc].tsx`, `mobile/app/auth/update-password.tsx` (+ callback recovery branch)
12. **[web]** Expo push sender in `/api/notifications/deliver-tip` + `/api/obligations/reminders` using `notification_preferences.push_token`
Exit criteria: pro unlock works end-to-end on a dev build (test keys); all 20 calculator ids open by deep link with numbers identical to web.

### Sprint 4 (Week 7–8) — Hardening, testing, Play Store submission
1. `mobile/app/+not-found.tsx`, a global error boundary, offline banner (`@react-native-community/netinfo`)
2. Unit tests (jest-expo): shared lib parity tests reusing the web `lib/*.test.ts` fixtures (financialEngine, priorityEngine, splitShares, splitBalances, trackerSafetyPulse, trackerMonthIncome, analyse-form-schema)
3. E2E smoke with Maestro (`mobile/.maestro/*.yaml`): login, health check submit, tracker add/delete, split create → add expense → settle, calculator deep link
4. Accessibility pass: `accessibilityLabel` on icon buttons, 44 pt targets, dynamic type caps
5. Performance: `FlashList` for tracker/split lists, memoised selectors, image caching
6. Android release: `app.json` `versionCode`, adaptive icon check, `android.permissions` (POST_NOTIFICATIONS only), App Links (`autoVerify`) + **[web]** `/.well-known/assetlinks.json`
7. EAS production build (`eas build -p android --profile production`), internal testing track → closed testing
8. Play Console: Data safety form (financial info, email, name; encrypted in transit; deletion via Settings), privacy policy URL `https://www.finkoin.com/legal/privacy`, content rating, target audience 18+, financial features declaration ("personal finance tools; no loans/lending"), store listing + 390×844 screenshots
9. `eas submit -p android` → production rollout 10 % → 100 %

### Sprint 5 (Week 9–10, optional) — P2/P3 parity
`mobile/app/learn/index.tsx`, `learn/[id].tsx` (+ `RichArticleRenderer`, `FaqAccordion`), `leaderboard.tsx`, `rewards.tsx`, `refer.tsx`, `investments.tsx`, `optimizer.tsx`, `policies/index.tsx`, `policies/[id].tsx`, `blog/index.tsx`, `blog/[slug].tsx`, `goals.tsx`, `portfolio.tsx`, `insurance.tsx`, `kyc.tsx`, `plans.tsx`; full Personal CA tax wizard; iOS App Store submission (universal links, `ITSAppUsesNonExemptEncryption`, Sign in with Apple if Google sign-in stays).
