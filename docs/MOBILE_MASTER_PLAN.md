# Finkoin Mobile — Master Build Plan (for Cursor)

> **Purpose:** hand this single file to Cursor and it should be able to build every mobile screen without opening the PWA source, except where a screen's own entry below explicitly says "read the exact file first" (a handful of very large/complex ones).
>
> **Source of truth used to write this:** the PWA was read file-by-file (`FINKOIN_SYSTEM.md`, every file in `app/`, `components/`, `lib/`, `store/`, `public/manifest.json`) and `mobile/` was read file-by-file, across this session. `mobile-app` is synced to `main`/`production` (identical trees) as of commit `d33a499`, and this plan additionally reflects the autonomous fix pass committed `acf5ac9..64546f4` on top of that (5 shared libs re-synced, the analyse-snapshot data bug fixed, two tracker bugs fixed, two navigation bugs fixed, forgot-password added). If you're reading this later than 2026-09-26, diff `git log --oneline <the-commit-above>..HEAD -- app components lib store` on `main` first — if it's empty, everything below is still accurate.
>
> **Companion docs** (more detail than fits here): `docs/PWA_COMPLETE_AUDIT.md` (every UI element/interaction, line-referenced), `docs/MOBILE_BUILD_PLAN.md` (component prop signatures, navigation tree, sprint plan), `docs/MOBILE_CURRENT_STATE.md`, `docs/MOBILE_PROGRESS.md` (file-level status table), `.claude/project-context.md` (dense one-line-per-item index), `FINKOIN_SYSTEM.md` (business rules — bucket caps, term-insurance formula, emergency-fund formula, life-stage rules).
>
> **Design tokens, once, here** (same values everywhere below — `Colors` in `mobile/constants/theme.ts` already has all of these; do not re-derive them from screenshots):
> Primary `#534AB7` · Primary dark `#3C3489` · Primary light `#EEEDFE` · Primary medium `#AFA9EC` · Success `#1D9E75` (light `#E1F5EE`) · Warning `#BA7517` (light `#FFF3E0`) · Error `#E24B4A` (light `#FCEBEB`) · Background `#F7F7F4` · Card `#FFFFFF` with border `#E8E6F0` · Border light `#F0EFF8` · Text primary `#111110` · Text secondary `#5F5E5A` · Text muted `#9B9A94`. Radius: inputs 10–12, cards 14–16, sheets 20 (top corners only). Spacing unit 4px (8/12/16/20/24/32 common). Minimum input font size **16px** (iOS zooms below that). Minimum touch target **44×44**. Every screen: `SafeAreaView`. Every form screen: `KeyboardAvoidingView` (`behavior="padding"` iOS / `"height"` Android). Every PWA modal → a **bottom sheet** on mobile, not a centered modal.

---

## WHAT ALREADY EXISTS IN MOBILE

`mobile/` only exists on the `mobile-app` branch (it was reverted out of `main`/`production` long ago). Everything below is the state of that branch right now.

### Config / root
| File | Status |
|---|---|
| `package.json` | DONE — Expo ~54.0.35, expo-router ~6.0.24, RN 0.81.5, React 19.1, @supabase/supabase-js ^2.112, zustand ^5, zod ^3.25, react-native-svg, reanimated ~4.1, gesture-handler, safe-area-context, expo-secure-store, expo-auth-session/web-browser, @react-native-community/slider |
| `app.json` | PARTIAL — scheme `finkoin://`, bundle/package `com.finkoin.app`, Android intent filter for `finkoin://`; no https App Links/Universal Links, no `eas.json`, no push config yet |
| `index.js`, `babel.config.js`, `tsconfig.json` | DONE |
| `.env.example` | PARTIAL — only `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY`; code also reads `EXPO_PUBLIC_SITE_URL` (unset → wrong default host) and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — add both |
| `constants/theme.ts` | DONE — `Colors`, `Spacing`, `Radius`, `FontSize`, `Shadow`, taglines. Use this file, never hardcode a hex again |
| `constants/calculator-config.ts` | DONE — mirrors web `CATEGORIES` |

### Screens (`mobile/app/`)
| Route file | Status |
|---|---|
| `_layout.tsx` | DONE — root Stack, `initAuth()` on mount |
| `index.tsx` | DONE — redirect → `(tabs)` |
| `(auth)/_layout.tsx`, `(auth)/index.tsx` | DONE |
| `(auth)/login.tsx` | DONE — email/password + Google + forgot-password link + ≥6-char rule (fixed 2026-09-26); missing `next`/`redirect` deep-link preservation |
| `(auth)/signup.tsx` | DONE (missing Terms/Privacy links) |
| `(auth)/forgot-password.tsx` | DONE (added 2026-09-26) — sends the reset email; **the loop is incomplete**, see its own entry below |
| `auth/callback.tsx` | PARTIAL — handles OAuth code exchange; no `type=recovery` branch |
| `(tabs)/_layout.tsx` | DONE — Home · Report · [Track] · Split · Profile, Calculators hidden |
| `(tabs)/index.tsx` (Home) | DONE — quick-tool routing bugs fixed 2026-09-26 |
| `(tabs)/analyse.tsx` (Report) | PARTIAL — now reads `user_analyse_snapshots` first, falls back to `user_analysis` (fixed 2026-09-26); still score+issues only, no buckets/net-worth/safety-net/gauges |
| `analyse/form.tsx` | PARTIAL — 7 steps exist but only ~35 of ~100 web fields, no per-step Zod validation, no consent gate; now also writes the canonical snapshot (fixed 2026-09-26) |
| `analyse/fixplan.tsx` | NOT STARTED — literally a placeholder screen |
| `(tabs)/tracker.tsx` | PARTIAL — insert/query bugs fixed 2026-09-26 (was likely broken before); still no consent gate, no Safety Pulse, no obligations, no credit-card reminders, no month-forward-limit |
| `(tabs)/split.tsx` | DONE — list, create+invite, join-by-code, delete (no realtime) |
| `split/[groupId]/index.tsx` | DONE — tabs, balances, settle, invite, leave/remove (no realtime) |
| `split/[groupId]/add-expense.tsx` | DONE — 4 split types (date is a text field, not a picker) |
| `(tabs)/calculators.tsx` | PARTIAL — Home-tile deep-linking fixed 2026-09-26; still one screen with all 20 tools inline, simplified engines (`lib/calcEngines.ts`, not the real web engines) |
| `(tabs)/profile.tsx` | NOT STARTED (placeholder) — name/email/plan/FK card + sign out only |

### Components (`mobile/components/`)
DONE and wired: `AppHeader`, `NotificationBell` (no realtime), `ProfileMenu` (many items open the *website*), `FinkoinTabBar`, `HeroCarousel`, `QuickTools` (fixed 2026-09-26), `TopPicks`, all of `components/ui/` that's actually used (`AppIcon`, `BrandLogo`, `Button`, `Card`, `Input`, `MoneyInput`, `ResultStat`, `SliderField`).
**Built but NOT wired into any screen** (exists, compiles, just never imported by a screen — wire these before writing new ones): `components/tracker/AddExpenseSheet.tsx`, `components/tracker/MonthSafetyPulse.tsx`, `components/tracker/TrackerConsent.tsx`, `components/tracker/BucketCard.tsx`, `components/analyse/ResultCard.tsx`, `components/analyse/StepIndicator.tsx`, `components/ui/HealthScoreRing.tsx`, `components/ui/Chip.tsx`, `components/ui/SegmentControl.tsx`, `components/ui/LoadingSpinner.tsx`, `components/ui/PrivacyEye.tsx`. Unused/superseded: `components/home/QuickTools.tsx`, `components/home/DailyTip.tsx` — delete these two, don't build on them.

### Stores (`mobile/store/`)
| Store | Status |
|---|---|
| `authStore.ts` | PARTIAL — sign in/up/out, Google, session restore, `resetPassword` (added 2026-09-26); missing referral apply, gamification sync |
| `financialStore.ts` | Built, **never imported by any screen** — wire it into `analyse.tsx`/`form.tsx` |
| `splitStore.ts` | DONE — writes `split_*` tables directly (bypasses the web's `/api/split/*` validation — acceptable short-term, see Split entries below) |
| `notificationStore.ts` | PARTIAL — fetch + markAllRead only |
| `obligationStore.ts`, `gamificationStore.ts`, `portfolioStore.ts` | **DO NOT EXIST** — port from `store/obligationStore.ts` / `store/gamificationStore.ts` / `store/portfolioStore.ts` |

### Lib (`mobile/lib/`)
Byte-identical to the web `lib/` (safe, up to date, do not touch unless the web file changes): `amortisation.ts`, `splitBalances.ts`, `splitInvite.ts`, `splitShares.ts`, `tracker-categories.ts`, `trackerSafetyPulse.ts`. Re-synced 2026-09-26 (now current): `analyse-form-schema.ts`, `financialEngine.ts`, `priorityEngine.ts`, `universal-buckets.ts`, `formatters.ts`. RN-patched intentionally, current: `trackerCreditCards.ts`. Ported 2026-09-26: `userAnalyseSnapshot.ts` (Supabase client swapped), `finkoinAiPlan.ts`, `netWorth.ts` (its type deps, both pure, unmodified). Mobile-only (keep, don't replace): `supabase.ts`, `storage.ts`, `googleAuth.ts`, `cryptoPolyfill.ts`, `calcEngines.ts` (simplified calculator math — replace with the real engines when you build the Calculators feature properly).

---

## BUILD ORDER

Build in this order. Do not start a P1 item before every P0 item in front of it is DONE; don't start P2 before P1.

### P0 (app is broken/unusable without these)
1. **Analyse consent gate** (`app/analyse/consent.tsx` — does not exist yet) — blocks the form legally; do this first.
2. **Analyse form full parity** (`app/analyse/form.tsx`) — port the remaining ~65 fields, per-step Zod validation, `syncFromHealthCheck` obligations sync.
3. **Analyse result screen** (`app/analyse/result.tsx` — does not exist) — score hero, net worth, 5 buckets, safety net, paywall CTA.
4. **Tracker consent gate + rebuild** — wire in the already-built `TrackerConsent`, `AddExpenseSheet`, `MonthSafetyPulse`; add month navigation with the forward-limit rule.
5. **`obligationStore.ts`** (port) — needed by both #2 and #4.
6. **Complete the password-recovery loop** — `lib/authRecovery.ts` port + `app/auth/update-password.tsx` + recovery branch in `app/auth/callback.tsx` (forgot-password currently sends an email that goes nowhere useful).
7. **`split/join.tsx`** — deep-link screen for `?code=`/`?token=` invite links; currently no route exists, so a shared invite link can't be opened on mobile at all.

### P1 (core value, ship-blocking for a "real" v1)
8. **Analyse fix plan** (`app/analyse/fixplan.tsx`) — needs the web API to accept a Bearer token first (see "Backend prerequisite" note in that screen's entry).
9. **Calculators**: extract each tool to its own route (`app/calculators/[id].tsx`), replace `calcEngines.ts` with the real ported engines.
10. **Tax regime calculator**: full engine port (`lib/taxRegimeComparisonFY2026.ts` + helpers), at least the core sections (salary, HRA, 80C, 80D, results) even if the full Personal-CA wizard waits for P2.
11. **Profile screen**: assets editor, checklist, referral card (currently a placeholder).
12. **Settings screen** (does not exist).
13. **`gamificationStore.ts`** (port) — needed by Profile/Rewards/Leaderboard.
14. **Notifications full-page inbox** (`app/notifications.tsx`) — new on the PWA since the last full audit; OS push taps need somewhere to land.
15. **Realtime channels** for Split (group members, expenses, settlements) — currently pull-to-refresh only.

### P2 (enhancement, do last)
16. Leaderboard, Rewards, Refer screens (`gamificationStore` dependents).
17. Learn hub + article screen.
18. Policy vault.
19. Investments, Goals, Portfolio (all placeholders/demo data on the web too — low urgency).
20. Blog, legal pages, About/Contact/Careers/Press (mostly static; can be `WebView`/`expo-web-browser` links to the live site instead of native ports).
21. Play Store / TestFlight packaging (`eas.json`, signing, store listing) — do this last, after P0+P1 are real and tested on a device.

---

## SHARED FILES TO COPY (pure TypeScript, zero browser/Next.js/React dependency — copy as-is, no adaptation)

Verified: none of these import `window`, `document`, `localStorage`, `next/*`, or React. Safe to `cp lib/X.ts mobile/lib/X.ts` directly.

```
lib/amortisation.ts
lib/analyse-form-schema.ts        (already copied — keep in sync)
lib/analysisSnapshotValidation.ts
lib/analyseUserScenarioFixture.ts
lib/blogContent.ts                 (+ lib/data/blog-fire-number-india.ts, lib/data/blog-old-vs-new-tax-roi-2026.ts)
lib/bucket-breakdown.ts
lib/calculatorInput.ts
lib/cn.ts
lib/expense-bucket-recommendations.ts
lib/finance.ts
lib/financialEngine.ts             (already copied — keep in sync)
lib/finkoinAiPlan.ts               (already copied)
lib/fireCalculator.ts
lib/formatINR.ts
lib/formatters.ts                  (already copied — keep in sync)
lib/knowledgeBase/entries.ts
lib/knowledgeBase/index.ts
lib/knowledgeBase/retriever.ts
lib/learnArticleFaqs.ts            (data only — it imports a web component too, strip that import when copying)
lib/learnContent.ts
lib/learnRichArticles.ts
lib/learnSeo.ts
lib/localDate.ts
lib/netWorth.ts                    (already copied)
lib/obligationLearn.ts
lib/obligationReminders.ts
lib/optimizer-format.ts
lib/postOfficeSchemes.ts
lib/priorityEngine.ts              (already copied — keep in sync)
lib/profileAssetsPatch.ts
lib/sipGoal.ts
lib/splitBalances.ts               (already copied)
lib/splitInvite.ts                 (already copied)
lib/splitShares.ts                 (already copied)
lib/subscriptionBypass.ts
lib/taxCalculatorHelpers.ts
lib/taxMissedDeductionAlerts.ts
lib/taxRegimeComparisonFY2026.ts
lib/taxTeachContent.ts
lib/tracker-categories.ts          (already copied)
lib/trackerCashAudit.ts
lib/trackerMonthIncome.ts
lib/trackerObligationSync.ts
lib/trackerSafetyPulse.ts          (already copied)
lib/universal-buckets.ts           (already copied — keep in sync)
```

**Needs a one-line Supabase-client-import swap, otherwise pure** (`@/lib/supabaseClient` or `@/lib/supabase` → `@/lib/supabase` — the RN client at `mobile/lib/supabase.ts` — same pattern already used for `userAnalyseSnapshot.ts`):
```
lib/userAnalyseSnapshot.ts   (already ported)
lib/userPolicies.ts
lib/syncProfileAssets.ts     (also imports @/store/financialStore — fine, that store already exists on mobile)
lib/trackerProfileIncome.ts
lib/cache.ts                 (localStorage → mobile/lib/storage.ts's appStorage; also make it async)
lib/aiService.ts             (fetch('/api/ai/analyse') → an authenticated fetch wrapper, see Fix Plan entry)
lib/payment.ts               (process.env.NEXT_PUBLIC_SKIP_PAYMENT → process.env.EXPO_PUBLIC_SKIP_PAYMENT)
lib/splitAuthRedirect.ts     (localStorage/cookies → appStorage)
lib/authRecovery.ts          (takes a supabase client as a parameter already — just import from mobile's client)
```

**Never port — browser/Next.js/Node-server only, has no RN equivalent, call the web API instead if you need the behavior**: `lib/supabaseServer.ts`, `lib/apiGuard.ts`, `lib/encryption.ts` (Node `crypto`), `lib/rag/retriever.ts`, `lib/webPush.ts`, `lib/splitExpenseNotify.ts`, `lib/analytics.ts`, `lib/analyticsContext.ts`, `lib/gtag.ts`, `lib/pwaLaunch.ts`, `lib/bodyScrollLock.ts`, `lib/seo.ts`, `lib/siteUrl.ts`, `lib/generatePDF.ts` (jsPDF — use `expo-print` instead), `lib/exportExcel.ts`, `lib/renderBlogBody.tsx` (uses `next/link`), `lib/animations.ts` (framer-motion), `lib/googleFeedbackForm.ts`, `lib/feedbackPrompt.ts`, `lib/kycVerification.ts` (trivial — fine to port too if needed, it's actually pure; listed here only because it's low-value).

---
---

# SCREEN-BY-SCREEN SPECS

---

## FEATURE: Login
Priority: P0
PWA Location: `app/login/page.tsx`
Mobile Location: `mobile/app/(auth)/login.tsx`
Status: PARTIAL (missing `next`/`redirect` deep-link preservation only — everything else is DONE)

### What this screen shows
A centered logo + tagline, then a form: email, password (with show/hide), a primary "Log in" button, a "Forgot password?" link, a divider, "Continue with Google", and links to sign up / back to home. Below the form: "No PAN. No Aadhaar. Free forever."

### Every UI element
- Logo: `BrandLogo` size 80 + tagline text "Know it. Fix it. Grow it."
  Label: n/a · Action: none
- Input: Email
  Label: "Email" · placeholder "you@email.com" · keyboardType email-address, autoCapitalize none · Action: updates `email` state
- Input: Password
  Label: "Password" · placeholder "Enter password" · secureTextEntry · Action: updates `password` state
- Button: "Log in" (primary, full width)
  Action: validates non-empty + password ≥ 6 chars → `authStore.signIn(email, password)` → on success `router.replace("/(tabs)")`; on error shows inline red text + `Alert.alert`
- Link: "Forgot password?"
  Action: `router.push("/(auth)/forgot-password")`
- Divider: "or"
- Button: "Continue with Google" (secondary)
  Action: `authStore.signInWithGoogle()` → on success `router.replace("/(tabs)")`
- Link: "← Back to home"
  Action: `router.replace("/(tabs)")`
- Link: "Need an account? Sign up"
  Action: `router.push("/(auth)/signup")`

### Every state
- Loading: button shows "Please wait…" with a spinner, disabled
- Empty: n/a (form is always visible)
- Error: red text above the button + a native `Alert.alert("Login failed", message)`
- Success: `router.replace("/(tabs)")`

### Data
- Fetches: none
- Saves: `supabase.auth.signInWithPassword({ email, password })` / `supabase.auth.signInWithOAuth({ provider: 'google' })` (via `signInWithGoogleIdToken`/`signInWithGoogleSupabaseBrowser` in `lib/googleAuth.ts`)
- Store: `authStore` (`signIn`, `signInWithGoogle`)

### Navigation
- User comes from: app open (logged out), any protected screen redirecting to login, Sign up screen's "Log in" link
- User goes to: `(tabs)` home on success, `(auth)/signup`, `(auth)/forgot-password`

### Shared code from web
None needed — this screen is pure Supabase Auth calls, no shared business logic.

### Mobile-specific notes
- Still TODO: preserve a `next`/`redirect` param through login the way the web does (`?redirect=<path>`) so a screen that force-redirects to login can send the user back to where they were. Not built yet — when you build protected-route redirects for new screens, add a `next` query param to the login push and read it here after success.
- Password ≥ 6 chars, `KeyboardAvoidingView`, `SafeAreaView` — all already correct, don't touch.

---

## FEATURE: Sign Up
Priority: P0
PWA Location: `app/login/page.tsx` (mode=signup)
Mobile Location: `mobile/app/(auth)/signup.tsx`
Status: DONE (missing Terms/Privacy links only)

### What this screen shows
Same shell as Login: logo, then name/email/password fields, "Create my account" button, Google button, "Already have an account? Log in".

### Every UI element
- Input: Name — Label "Your name" · Action: updates `name`
- Input: Email — same as Login
- Input: Password — placeholder "Min 6 characters"
- Button: "Create my account" (primary)
  Action: validates all fields present → `authStore.signUp(name, email, password)`. If Supabase returns a user but no session (email confirmation required): `Alert.alert(...)` then `router.replace("/(auth)/login")`. If a session exists immediately: `router.replace("/(tabs)")`.
- Button: "Continue with Google" — same as Login
- Link: "Already have an account? Log in" → `router.replace("/(auth)/login")`

### Every state
- Loading: button spinner, disabled
- Error: `Alert.alert("Sign up failed", message)`
- Success (session immediate): navigate to tabs
- Success (email confirm required): alert + navigate to login

### Data
- Saves: `supabase.auth.signUp({ email, password, options: { data: { name } } })`
- Store: `authStore.signUp`

### Navigation
- Comes from: Login screen's "Sign up" link
- Goes to: `(tabs)` or `(auth)/login`

### Shared code from web
None.

### Mobile-specific notes
- Add Terms/Privacy links (web has them, `<a href="/legal/terms">`/`/legal/privacy`) — open with `expo-web-browser`'s `openBrowserAsync` to `https://www.finkoin.com/legal/terms` etc., don't try to port the legal pages natively.

---

## FEATURE: Forgot Password
Priority: P0
PWA Location: `app/login/page.tsx` (mode=reset), `app/auth/reset-password/page.tsx`
Mobile Location: `mobile/app/(auth)/forgot-password.tsx`
Status: PARTIAL (screen is DONE, but the overall recovery *loop* is NOT STARTED — see below)

### What this screen shows
Two states: the form (email input + "Send reset link →" button + back link), and after sending, a confirmation card (icon, "Check your email", body text, "Back to login" link).

### Every UI element
- Back arrow "← Back" → `router.back()`
- Input: Email — Label "Email" · Action: updates `email`
- Button: "Send reset link →"
  Action: `authStore.resetPassword(email)` → on success shows the confirmation state
- (confirmation state) Link: "Back to login" → `router.replace("/(auth)/login")`

### Every state
- Loading: button shows "Sending…"
- Error: red inline text ("Enter your email" if empty, or the Supabase error message)
- Success: replaces the whole screen with the "Check your email" confirmation card

### Data
- Saves: nothing directly here — calls `authStore.resetPassword` → `supabase.auth.resetPasswordForEmail(email, { redirectTo: getNativeAppCallbackUri() + "?type=recovery" })`
- Store: `authStore.resetPassword` (added 2026-09-26)

### Navigation
- Comes from: Login screen's "Forgot password?" link
- Goes to: back to Login (either via the back arrow or after seeing the confirmation)

### Shared code from web
None directly, but **the loop this screen starts is incomplete** — see the next paragraph.

### Mobile-specific notes
- **This screen alone does not let a user actually reset their password yet.** The email sends correctly, but tapping the link in the email re-opens the app at `mobile/app/auth/callback.tsx`, which has no `type=recovery` handling and no screen to change the password. To finish this feature:
  1. Port `lib/authRecovery.ts` (`isRecoveryAuthUrl`, `completeAuthSessionFromUrl`) into `mobile/lib/authRecovery.ts` — it already takes a Supabase client as a parameter, so this is a near-verbatim copy.
  2. Read the exact web files first (they're small): `app/auth/callback/page.tsx` and `app/auth/update-password/page.tsx` — port their logic into `mobile/app/auth/callback.tsx` (add the recovery branch) and a new `mobile/app/auth/update-password.tsx` (password + confirm fields, ≥6 chars, must match, `supabase.auth.updateUser({ password })`).
  3. Register the new screen in `mobile/app/_layout.tsx`'s `<Stack>`.

---

## FEATURE: Auth Callback
Priority: P0 (as part of the recovery loop above; OAuth part already works)
PWA Location: `app/auth/callback/page.tsx`
Mobile Location: `mobile/app/auth/callback.tsx`
Status: PARTIAL

### What this screen shows
Spinner only — no visible UI besides a loading indicator.

### Every UI element
None interactive.

### Every state
- Loading: spinner while resolving the deep link
- Error: (web) redirects to `/login?error=auth_failed`; (mobile) currently just proceeds regardless

### Data
- Fetches/saves: `createSessionFromUrl(url)` (in `mobile/store/authStore.ts`) parses the OAuth deep link and calls `supabase.auth` internally.

### Navigation
- Comes from: OAuth deep link (`finkoin://auth/callback?code=…` or `exp://…/--/auth/callback`), and (once built) the password-recovery email link
- Goes to: `(tabs)` on success; should go to `auth/update-password` when `type=recovery` is present (**not built yet**)

### Shared code from web
`lib/authRecovery.ts` (port — see Forgot Password entry above).

### Mobile-specific notes
Read the exact PWA file (`app/auth/callback/page.tsx`) before touching this — it now uses `completeAuthSessionFromUrl` for both PKCE `code` and OTP `token_hash`, with a retry loop for hash-based sessions. Match that exactly; don't just add an `if (type === 'recovery')` check without the retry logic, or the recovery link will intermittently fail to establish a session before redirecting.

---

## FEATURE: Home / Landing
Priority: P0
PWA Location: `app/page.tsx` + `components/landing/HomePageClient.tsx`
Mobile Location: `mobile/app/(tabs)/index.tsx`
Status: DONE (quick-tool bugs fixed 2026-09-26); Testimonials/below-fold marketing content not ported (low value on mobile, skip)

### What this screen shows
Header (logo, notification bell, avatar/login), hero section with H1 "Your complete money life." / H2 "Know it. Fix it. Grow it.", a 4-slide carousel, a quick-tools grid (SIP/SWP/Split/Tax/EMI/Portfolio/Analyse), a "top picks" feature card row, and (logged out) a footer CTA "Create free account" / "Already have an account? Log in".

### Every UI element
- Hero carousel: 4 slides, each `{title, subtitle, route, cta}` — swipe or tap CTA → `router.push(route)` (Analyse needs auth → login if logged out)
- Quick tools grid: 7 tiles (SIP → `calculators?tool=sip`, SWP → `?tool=swp`, Split → `(tabs)/split`, Tax → `?tool=tax-regime`, EMI → `?tool=emi`, Portfolio → `(tabs)/calculators`, Analyse → `(tabs)/analyse`, auth-gated)
  Action per tile: tap → `router.push` (fixed 2026-09-26: calculator tiles now actually pass the `tool` param instead of opening an empty hub)
- Top picks cards: feature highlights → `(tabs)/analyse`, `(tabs)/calculators`, `(tabs)/tracker`
- (logged out) "Create free account" button → `(auth)/signup`; "Log in" link → `(auth)/login`

### Every state
- Logged-in vs logged-out variant (footer CTA only shown logged-out)
- No loading/empty/error states — this screen renders immediately, no network fetch

### Data
None required (public screen).

### Navigation
- Comes from: app launch, tab bar
- Goes to: analyse, calculators (with `tool` param), tracker, split, login, signup

### Shared code from web
None (pure layout/copy).

### Mobile-specific notes
Already matches the PWA closely. Do not add the web's Testimonials/below-fold section — low value for a mobile home tab that's meant to be fast.

---

## FEATURE: Analyse Consent Gate
Priority: P0
PWA Location: `components/analyse/ConsentModal.tsx` (shown inside `app/analyse/page.tsx` before the form)
Mobile Location: `mobile/app/analyse/consent.tsx` — **DOES NOT EXIST, build this**
Status: NOT STARTED

### What this screen shows
A modal/sheet explaining what data is collected ("we collect only financial numbers, no PAN or Aadhaar"), a DPDP-rights summary, Accept and Decline buttons. Must be shown once per user before the form is ever reachable.

### Every UI element
- Body copy: what's collected, why, no PAN/Aadhaar note, links to privacy policy
- Button: "Accept" (primary) → records consent, proceeds to the form
- Button: "Decline" → returns to the Report tab without opening the form

### Every state
- Shown: only when consent hasn't been recorded yet for this user
- Loading: brief check against local cache + `users.data_consent_given` before deciding whether to show at all

### Data
- Fetches: `supabase.from('users').select('data_consent_given').eq('id', uid).maybeSingle()` — only if a local cache miss (see below)
- Saves: `supabase.from('users').update({ data_consent_given: true, data_consent_at: new Date().toISOString(), data_consent_version: 'v2' }).eq('id', uid)`
- Store: none directly; gate the `analyse/form.tsx` route on this

### Navigation
- Comes from: tapping "Start health check" / "Retake" on the Report tab, before the form ever mounts
- Goes to: `analyse/form.tsx` on Accept, back to `(tabs)/analyse` on Decline

### Shared code from web
None — this is UI + two Supabase calls.

### Mobile-specific notes
- Match the web's local-cache-first pattern to avoid a DB round-trip on every open: check `appStorage` (mobile's SecureStore/AsyncStorage wrapper, `mobile/lib/storage.ts`) for a key like `finkoin_analyse_consent_v2_<uid>` first; only hit Supabase on a cache miss; write the cache key on Accept.
- Present as a full-screen modal (`presentation: 'modal'` in the route's Stack.Screen options), not a bottom sheet — this is a one-time legal gate, not a quick action.

---

## FEATURE: Analyse — 7-Step Health Check Form
Priority: P0
PWA Location: `app/analyse/page.tsx` → `components/forms/analyse-onboarding-form.tsx` (very large file — **read it directly before extending this screen further**, do not rely on this summary alone for field-level work)
Mobile Location: `mobile/app/analyse/form.tsx`
Status: PARTIAL — steps 1-2 essentially match, steps 3-7 are a reduced subset (~35 of ~100 web fields); snapshot write fixed 2026-09-26

### What this screen shows
A progress bar at the top, a step title, the current step's fields, and Back/Next buttons (final step's button reads "Get my score →"). 7 steps: Personal profile · Income · Fixed obligations · Living expenses · Insurance coverage · Assets and savings · Goals.

### Every UI element (by step — mobile's CURRENT fields; web has more, see "Data" below for the gap)
- **Step 1**: life-stage cards (bachelor/married/kids/senior), age input, city-tier select
- **Step 2**: monthly salary, spouse income, other income (money inputs)
- **Step 3**: home/car/personal loan EMI, rent amount, credit card bill (money inputs)
- **Step 4**: food/transport/utility/lifestyle totals (money inputs)
- **Step 5**: health insurance toggle → sum insured + premium; term insurance toggle → sum assured + premium
- **Step 6**: savings balance, FD value, liquid MF, total equity, PPF, EPF, monthly SIP
- **Step 7**: primary goal cards
- Progress bar, Back button, Next/"Get my score →" button

### Every state
- Loading: final submit shows a full-screen "Analysing your finances…" overlay
- Error: `Alert.alert("Error", message)` on submit failure; "Sign in required" alert if not logged in
- Success: `router.replace("/(tabs)/analyse")`

### Data
- Fetches: none (form starts blank each time — web restores an in-progress draft from `financialStore`, mobile doesn't yet)
- Saves (on final submit): `normalizeAnalyseFormValues()` → `analyseFinances()` (both from `lib/analyse-form-schema.ts`/`lib/financialEngine.ts`, already re-synced 2026-09-26) → **`upsertUserAnalyseSnapshot(uid, {profile, result, submittedAt, version:'1.0'})`** (canonical, fixed 2026-09-26) → also `supabase.from('user_analysis').upsert({user_id, profile, analysis_result, updated_at})` (kept for back-compat)
- Store: none yet — should use `financialStore` (built, unused) the way the web does, so a Report-tab visit mid-form doesn't lose the draft

### Navigation
- Comes from: Consent screen's Accept, Report tab's "Start health check"/"Retake →"
- Goes to: `(tabs)/analyse` on submit

### Field gap vs the PWA (build these next, in this order, per `docs/MOBILE_BUILD_PLAN.md`'s field table)
1. **Loans**: replace the 3 flat EMI inputs with the web's `unifiedLoans[]` field array (add/remove rows: loan type select, lender name, monthly EMI, EMI day-of-month + month picker, outstanding amount, interest rate, remaining months, OD-only sub-fields).
2. **Insurance**: premium frequency toggle (monthly/yearly) + renewal date, vehicle insurance, "other insurance" rows.
3. **Assets**: FD rate/tenure/maturity, PPF/SIP debit-day pickers, custom investments array (≤5), post-office schemes array (≤8).
4. **Goals**: conditional target/year fields (home purchase, retirement, kids education, car purchase) instead of just the goal card.
5. **Per-step Zod validation**: import `step1Schema`...`step7Schema` from `mobile/lib/analyse-form-schema.ts` (already there) and call `.safeParse()` before allowing Next, exactly like the web does.
6. **Obligations sync**: after the snapshot save, call `obligationStore.syncFromHealthCheck(uid, savedProfile)` (once `obligationStore` is ported — see Build Order #5).

### Shared code from web
`mobile/lib/analyse-form-schema.ts` (already current — has every field type/enum/schema you need, including `unifiedLoanSchema`, `otherInsurancePremiumSchema`, `postOfficeSchemeSchema`, `customInvestmentSchema` — you're not missing any types, just UI for them), `mobile/lib/financialEngine.ts`, `mobile/lib/userAnalyseSnapshot.ts` — all already ported/current.

### Mobile-specific notes
- **Read `components/forms/analyse-onboarding-form.tsx` directly** when building steps 3-7 — it's ~4,100 lines and this summary cannot substitute for it at the field-interaction level (conditional visibility rules, helper text, exact validation messages).
- Loan rows, other-insurance rows, custom-investment rows, PO-scheme rows → build as a reusable `FieldArrayRow` pattern with add/remove, not one bespoke component per array.
- Date/month pickers → native `@react-native-community/datetimepicker` restricted to day-of-month (and month where needed), not a full calendar.

---

## FEATURE: Analyse — Result Screen
Priority: P0
PWA Location: `app/analyse/result/page.tsx`
Mobile Location: `mobile/app/analyse/result.tsx` — **DOES NOT EXIST, build this**
Status: NOT STARTED

### What this screen shows
Score hero (0-100, colour-coded), masked total income with an eye toggle, a net-worth summary, 5 expandable bucket rows (Needs/Wants/Insurance/Loans/Investment), health gauges, a 5-item safety-net checklist, a cash-flow waterfall (income − needs − EMIs − wants − insurance/investment = surplus), an unlock CTA, and a feedback widget.

### Every UI element
- Score hero card: big number 0-100, label (Critical <40 / Warning <70 / Good ≥70), colour per band
- Masked amount: "Total income" — tap the eye icon to reveal/hide
- Net worth summary: assets, liabilities, net worth
- 5 bucket rows: label, cap %, actual vs cap amount, status colour (good/warning/critical), tap to expand → line-item breakdown
- Safety-net checklist: 5 items (emergency fund, medical fund, term cover, health cover, SSY/other) each with a status icon
- Cash-flow waterfall: Income → − Needs → − EMIs → − Wants → − Insurance+Investment → = Surplus
- Button: "Get my complete financial plan →" (or "View fix plan → ₹99")
  Action: if `EXPO_PUBLIC_SKIP_PAYMENT==='true'` or user is pro/promax → `router.push('/analyse/fixplan')`; else open a paywall sheet (₹99 Razorpay)
- Feedback widget: 5 stars + optional message → save

### Every state
- Loading: brief spinner while reading the store/snapshot
- Empty: "No analysis found" + "Start analysis →" button → `analyse/form.tsx` (should not normally be reachable once the Report tab gates correctly, but keep this as a safety net)
- Error: none specific — falls through to empty state
- Success: full result rendered

### Data
- Fetches: `financialStore.lastSubmission`/`result` if already hydrated this session; else `fetchUserAnalyseSnapshot(uid)` (already ported, `mobile/lib/userAnalyseSnapshot.ts`) and hydrate the store from it
- Re-derives locally: `analyseFinances(profile)`, `getUniversalBucketActuals(profile)`, `buildPriorityPlan(profile, result)` — all already-ported pure functions, call them client-side, don't refetch from a server
- Saves: nothing on this screen itself (feedback widget POSTs, see Mobile-specific notes)
- Store: `financialStore` (needs wiring — currently unused on mobile)

### Navigation
- Comes from: form submit, Report tab's "See full report"/retake
- Goes to: `analyse/fixplan` (unlock), `(tabs)/calculators`, `(tabs)/tracker`

### Shared code from web
`lib/bucket-breakdown.ts`, `lib/speedo-meter-buckets.ts`, `lib/netWorth.ts` (already ported) — all pure, copy `bucket-breakdown.ts` and `speedo-meter-buckets.ts` too (listed in Shared Files section above).

### Mobile-specific notes
- Build a `Gauge` component (arcs via `react-native-svg`) as a simplified port of the web's `SpeedoMeter` — don't try to match it pixel-for-pixel, match the data it shows (bucket vs cap).
- The feedback widget's `POST /api/feedback` needs Bearer auth to award FK tokens — until the backend accepts a Bearer token (see Fix Plan entry's "Backend prerequisite"), either skip FK-awarding on mobile feedback or call the endpoint unauthenticated and accept it won't award tokens yet.
- Paywall: build as a bottom sheet, Razorpay checkout via `react-native-razorpay` (needs an EAS dev build, won't run in Expo Go) — see Fix Plan entry for the full payment flow.

---

## FEATURE: Analyse — Fix Plan (AI Plan + Paywall)
Priority: P1
PWA Location: `app/analyse/fixplan/page.tsx`
Mobile Location: `mobile/app/analyse/fixplan.tsx`
Status: NOT STARTED (currently a placeholder screen)

### What this screen shows
Rotating loading messages while the AI plan generates/loads from cache, then: a greeting card, ranked priority cards (each with gap, monthly contribution, months-to-complete, this-week action), a surplus waterfall, a debt-strategy table, a goal plan, a this-week action card, a "Download PDF" button, and a fallback/retry banner if the AI call failed.

### Every UI element
- Loading: rotating text through 5 messages ("Reading your profile...", "Calculating insurance gaps...", "Building debt strategy...", "Generating 12-month roadmap...", "Almost ready...")
- Greeting card: personalised summary text
- Priority cards (one per item from `buildPriorityPlan`): rank, title, gap amount, monthly contribution, months to complete, "this week" action text, "why this matters" text
- Debt strategy table: lender, outstanding, rate, months-to-payoff, interest-saved
- Goal plan section
- Button: "Download PDF"
- Fallback banner (only if AI failed): message + "Retry" button

### Every state
- Loading: rotating messages (first load only; silent retries keep the existing plan visible)
- Error/fallback: deterministic fallback plan (`generateFallbackPlan` in `lib/aiService.ts`) shown with a visible "using fallback" banner + retry
- Success: full plan rendered

### Data
- Fetches: local cache first (`hashProfile(profile, result)` → cached plan, 30-day TTL, staleness also checked via `enginePlanFingerprint`/`isCachedAiStale` — both in `lib/cache.ts`); on a cache miss, `POST /api/ai/analyse { profile, analysis }`
- Saves: cache write (`setCachedPlan`), plus `supabase.from('user_analysis').update({ ai_fix_plan, ai_generated_at })`
- Store: `financialStore`

### Navigation
- Comes from: Result screen's unlock button
- Goes to: back to Result

### Shared code from web
`lib/finkoinAiPlan.ts` (already ported), `lib/cache.ts` (needs the `localStorage`→`appStorage` swap + made async, see Shared Files section).

### Mobile-specific notes
**Backend prerequisite — do this first, it's a web-repo change, not a mobile one**: every authed `/api/*` route (`lib/apiGuard.ts#getAuthedUser`) currently only accepts a browser session cookie. Mobile has no cookies. Add Bearer-token support: in `getAuthedUser`, if an `Authorization: Bearer <token>` header is present, validate it with `createClient(url, anonKey).auth.getUser(token)`; otherwise fall back to the existing cookie path. This one change unblocks: this screen's `/api/ai/analyse` call, Razorpay payment verification, `/api/financial-data`, `/api/feedback`'s FK award, and `/api/split/join`'s token-based invite links. Build a small `mobile/lib/api.ts` fetch wrapper that attaches `session.access_token` as a Bearer header to every call to the web API.
- PDF download: use `expo-print`'s `printToFileAsync` + `expo-sharing`, not `jsPDF` (web-only).

---

## FEATURE: Expense Tracker
Priority: P0
PWA Location: `app/tracker/page.tsx`
Mobile Location: `mobile/app/(tabs)/tracker.tsx`
Status: PARTIAL — data bugs fixed 2026-09-26 (insert/query), consent gate and most sub-features still missing

### What this screen shows
A consent gate (once), a month switcher, a purple summary card (Income/Spent/Left with an eye toggle and a cash-used progress bar), 5 bucket sections (Needs/Wants/Habits/Loans/Investment) each with a cap-vs-actual progress bar and its transactions, a credit-card bill reminder (if applicable), an obligations checklist, a Month Safety Pulse card (Safe/Tight/Over), and a floating "+" button to add an expense.

### Every UI element
- Consent gate (first-time only): 4 "what we track" bullet items + Accept button
- Month switcher: ← / → arrows (forward is limited — see Data below)
- Summary card: INCOME (tap to edit) / SPENT / LEFT, eye toggle, "on cards this month" line, cash-used % progress bar (green ≤70%, yellow ≤90%, red above)
- Bucket sections (×5): header (label, cap %, spent vs cap, eye toggle, expand/collapse), transaction rows (icon, description, date, amount, "paid by card" badge, edit/delete)
- Credit card bill reminder: next due date, "Pay bill" button (prefills the add-expense sheet)
- Obligations checklist: this-month items, mark paid/skip/close/delete, "+ Add obligation"
- Month Safety Pulse: status chip (Safe/Tight/Over), headline, MoM delta, top movers, one recommended action, daily safe-spend (current month only)
- FAB "+" → opens the add-expense bottom sheet

### Every state
- Loading: inline "Updating…" (soft refetch, doesn't block the screen)
- Empty: bucket sections show "No expenses yet" when a bucket has none
- Error: none specific yet (add proper error handling when you build the consent gate + real data flow)
- Success: full tracker rendered

### Data
- Fetches: `supabase.from('expense_transactions').select('*').eq('user_id', uid).eq('month', monthOnly).eq('year', year).order('date', {ascending:false})` (fixed 2026-09-26 — was an invalid date-range query before)
- Saves (add expense): `supabase.from('expense_transactions').insert({ user_id, description, amount, category, subcategory, bucket, date, month: monthOnly, year, payment_method })` (fixed 2026-09-26 — was inserting a non-existent `title` column before)
- Store: none yet (should use `obligationStore` once ported, for the obligations section)

### Navigation
- Comes from: tab bar (centre raised button)
- Goes to: month-history route (build `mobile/app/tracker/[month].tsx`), the add-expense sheet

### Shared code from web
`lib/tracker-categories.ts`, `lib/trackerSafetyPulse.ts`, `lib/trackerCreditCards.ts` (all already on mobile, current) — plus, to build the rest: `lib/trackerMonthIncome.ts` (month-forward-unlock rule + income helpers), `lib/trackerObligationSync.ts`, `lib/obligationLearn.ts`, `lib/localDate.ts` (all pure, copy from the Shared Files list).

### Mobile-specific notes
- **Wire in the already-built-but-unused components** instead of writing new ones: `components/tracker/AddExpenseSheet.tsx` (full add/edit sheet, bottom-sheet already correct), `components/tracker/MonthSafetyPulse.tsx` (+ its nested `TrackerNestedPanels` for credit-card/obligations), `components/tracker/TrackerConsent.tsx`.
- Month forward-limit rule (port from `lib/trackerMonthIncome.ts`): next calendar month unlocks only on/after the last Friday of the current month — do not let the user page past that.
- `obligationStore` doesn't exist on mobile yet — port it (`store/obligationStore.ts`) before wiring the obligations checklist section; it needs `fetchObligations`, `fetchChecklist`, `addObligation`, `updateObligation`, `closeObligation` (marks `is_active=false`, current month stays struck-through, future months stop), `deleteObligation` (separate hard remove), `markPaid`/`markUnpaid`/`markSkipped`, `generateChecklist` (RPC `generate_monthly_checklist`), `syncFromHealthCheck`.

---

## FEATURE: Tracker — Month History
Priority: P1
PWA Location: `app/tracker/[month]/page.tsx`
Mobile Location: `mobile/app/tracker/[month].tsx` — **DOES NOT EXIST, build this**
Status: NOT STARTED

### What this screen shows
A read-only-ish view of a past month: bucket summary bars + a full expense table for that month, with edit/delete still available.

### Every UI element
- Month title (e.g. "August 2026")
- Bucket summary bars (5, same caps as the main tracker)
- Expense table: rows with date/description/amount/bucket, edit/delete per row
- "+ Add" (still allowed for past months)

### Every state
- Loading: spinner
- Empty: "No entries this month"
- Invalid month param (`YYYY-MM` malformed): redirect back to `(tabs)/tracker`

### Data
- Fetches: `expense_transactions` filtered by the month/year parsed from the route param (same pattern as the main tracker query)
- Saves/edits: same insert/update/delete as the main tracker

### Navigation
- Comes from: main Tracker screen's month header / history link
- Goes to: back to `(tabs)/tracker`

### Shared code from web
Same as the main Tracker feature.

### Mobile-specific notes
Build after the main Tracker rebuild is done — this is the same components (bucket bars, expense rows, add sheet) reused with a fixed month instead of "current month".

---

## FEATURE: FK Split — Groups List
Priority: P0
PWA Location: `app/split/page.tsx`
Mobile Location: `mobile/app/(tabs)/split.tsx`
Status: DONE (no realtime — P1 follow-up)

### What this screen shows
A list of the user's groups (emoji, name, net balance), an empty state, a "+ New group" button, and a 2-step create flow (details → invite link).

### Every UI element
- Group row: emoji + name + net balance → tap opens group detail; "…" menu → delete (creator only, confirm)
- "+ New group" button → opens create sheet
- Create sheet step 1: name input (required), emoji input (optional), "Create" button
- Create sheet step 2 (after create): invite link with Copy / WhatsApp share buttons, "Continue" → group detail
- "Join by code" entry point: code input (8-char) → join

### Every state
- Loading: spinner on first load
- Empty: "No groups yet — create one" + CTA
- Error: inline retry

### Data
- Fetches: `supabase.from('split_group_members').select('group_id').eq('email', email).eq('status','active')` → `supabase.from('split_groups').select('*').in('id', groupIds).eq('is_active', true).order('updated_at', {ascending:false})`
- Saves (create): direct insert to `split_groups` + `split_group_members` (creator as admin) — mobile writes these tables directly rather than through `/api/split/groups`
- Saves (invite): generates/reuses `split_groups.invite_code`
- Store: `splitStore` (`fetchGroups`, `createGroup`, `inviteLink`, `joinByCode`, `deleteGroup`)

### Navigation
- Comes from: tab bar
- Goes to: `split/[groupId]/index.tsx`

### Shared code from web
`lib/splitBalances.ts`, `lib/splitShares.ts`, `lib/splitInvite.ts` (all already on mobile, current).

### Mobile-specific notes
- Add a realtime channel (`my_groups:<uid>` on `split_group_members` UPDATE) to match the web's live refresh — currently pull-to-refresh only.
- `siteBase()` in `splitStore.ts` should default to `https://www.finkoin.com` (canonical host), not `https://finkoin.com`.

---

## FEATURE: FK Split — Group Detail
Priority: P0
PWA Location: `app/split/[groupId]/page.tsx`
Mobile Location: `mobile/app/split/[groupId]/index.tsx`
Status: DONE (no realtime, no email invite — P1 follow-ups)

### What this screen shows
Header (name/emoji + your net: "You owe"/"You are owed"), 3 tabs (Expenses/Members/Settlements), simplified settle-up edges, a settle sheet (UPI/Cash/Bank), an invite sheet, and per-expense edit/delete (creator only) / leave-or-remove (members tab).

### Every UI element
- Header: back arrow, group name, "…" menu (delete, creator only), Invite button, net balance banner
- Tabs: Expenses / Members / Settlements
- Expenses tab: simplified settle-up rows, expense list (title, payer, amount, your share), edit/delete (creator)
- Members tab: member rows with balance, Leave (non-creator, blocked if unsettled), Remove (admin, blocked if unsettled)
- Settlements tab: history list
- Settle sheet: recipient select, amount, method (UPI/Cash/Bank), optional note, "Settle" button
- Invite sheet: link + Copy/WhatsApp buttons
- FAB "+" → add-expense screen

### Every state
- Loading: spinner
- Empty: "All settled up. Add an expense to start splitting."
- Error: inline retry

### Data
- Fetches: parallel `split_groups`/`split_group_members`/`split_expenses`(+shares)/`split_settlements` selects, balances via `lib/splitBalances.ts`'s `computeGroupBalances`
- Saves: settle → insert `split_settlements`; leave/remove → update member `status`; delete expense → soft `is_deleted=true`
- Store: `splitStore`

### Navigation
- Comes from: Groups list
- Goes to: Add Expense screen, back to Groups list

### Shared code from web
`lib/splitBalances.ts` (already current).

### Mobile-specific notes
- Add realtime (`split:<groupId>` channel on `split_expenses`/`split_settlements`).
- Add email-based invite (currently link/code-only) — needs the Bearer-auth backend fix first if you want to route it through `/api/split/invite`'s Resend email path, or write `split_invitations` directly with `invited_email` set.

---

## FEATURE: FK Split — Add / Edit Expense
Priority: P0
PWA Location: `app/split/[groupId]/add-expense/page.tsx`
Mobile Location: `mobile/app/split/[groupId]/add-expense.tsx`
Status: DONE (date is a plain text field, not a native picker — minor polish item)

### What this screen shows
A large centered amount input, title, "paid by" chips, a split-type segmented control (equal/exact/percentage/shares), member include-toggles with per-type inputs, category chips, a date field, notes, and Save.

### Every UI element
- Amount input (large, `inputMode="decimal"`)
- Title input
- Paid-by: member chips (single-select)
- Split type: segmented control (Equal / Exact / Percentage / Shares)
- Member toggles: include/exclude each member; for Exact → per-member ₹ input; Percentage → per-member % input; Shares → per-member share-count input
- Category chips: Food, Transport, Hotel, Entertainment, Shopping, Utilities, Medical, Other
- Date field (text today, should be a native picker)
- Notes input
- Save button

### Every state
- Create vs edit mode (edit pre-fills from `?edit=<expenseId>`)
- Validation error per field (amount>0, title required, payer required, ≥1 member, exact-sum-matches-amount, percentages-sum-100, shares>0)

### Data
- Saves: insert/update `split_expenses` + `split_expense_shares` (computed via `lib/splitShares.ts#computeSplitShares`)
- Store: `splitStore` (`addExpense`, `editExpense`)

### Navigation
- Comes from: Group detail's FAB / an expense row's edit action
- Goes to: back to Group detail

### Shared code from web
`lib/splitShares.ts` (already current).

### Mobile-specific notes
Replace the date text field with `@react-native-community/datetimepicker` (max = today) — the only remaining polish item on this screen.

---

## FEATURE: FK Split — Join (invite deep link)
Priority: P0
PWA Location: `app/split/join/page.tsx`
Mobile Location: `mobile/app/split/join.tsx` — **DOES NOT EXIST, build this**
Status: NOT STARTED

### What this screen shows
A status screen: checking → success ("Joined {group name}") → redirect, or an error state with Retry / "Go to Split".

### Every UI element
- Checking: spinner
- Success: checkmark + group name + auto-redirect after ~1s
- Error: message + "Retry" + "Go to Split" buttons

### Every state
- Checking, joining, success, error (invalid link / already-a-member idempotent-success / network error)

### Data
- `?code=` (permanent group invite code): direct `splitStore.joinByCode({ code })` — already implemented in `splitStore.ts`, just needs a screen
- `?token=` (one-time/open invite token, what web-shared links actually use): needs `POST /api/split/join { token }` with a Bearer token — **blocked on the backend Bearer-auth fix** (see Fix Plan entry). Until then, only `?code=` links work on mobile.

### Navigation
- Comes from: a shared invite link opened on the phone (deep link `finkoin://split/join?code=…` or the web link if Universal Links/App Links are set up — not yet, see `app.json` status above)
- Goes to: `split/[groupId]/index.tsx` on success

### Shared code from web
`lib/splitInvite.ts` (already current, has `isOpenSplitInvite`).

### Mobile-specific notes
- Register the deep link in `app.json`'s Android `intentFilters` (add a second filter for `split/join`) and, later, real Universal Links (`https://www.finkoin.com/split/join?...`) once you're ready to configure `assetlinks.json`/`apple-app-site-association` on the web host.
- If the user isn't logged in when the link opens: persist the pending code/token (mobile equivalent of `lib/splitAuthRedirect.ts` — swap its `localStorage` for `appStorage`) and resume after login.

---

## FEATURE: Calculators Hub
Priority: P1
PWA Location: `app/calculators/page.tsx` + `app/calculators/CalculatorsClient.tsx`
Mobile Location: `mobile/app/(tabs)/calculators.tsx`
Status: PARTIAL — deep-linking fixed 2026-09-26; still one screen, all tools inline, simplified engines

### What this screen shows
Category chips (Investment/Loans/Life decisions/Post office/Tax) and a grid of tool cards; tapping a card (or arriving via a `?tool=` deep link) shows that tool's sliders + result stats in place.

### Every UI element
- Category chips → filter the grid
- Tool card → tap → `setToolId(id)`, shows that tool inline with a back arrow
- Each tool: `SliderField`s (label, value, min/max/step) + `ResultStat`s (computed output) + an insight banner

### Every state
- No tool selected: grid view
- Tool selected: that tool's inputs/outputs

### Data
None (pure client-side math via `mobile/lib/calcEngines.ts` — see Mobile-specific notes for why this needs replacing).

### Navigation
- Comes from: Home quick tools (now passes `?tool=`, fixed 2026-09-26), hidden tab
- Goes to: n/a (stays on this screen)

### Shared code from web
Eventually: `lib/fireCalculator.ts`, `lib/postOfficeSchemes.ts`, `lib/calculatorInput.ts`, `lib/amortisation.ts`, `lib/sipGoal.ts` (all pure, listed in Shared Files).

### Mobile-specific notes
**Priority 9 in Build Order.** Two things to do, in order:
1. Extract each inline tool (`SipTool`, `SwpTool`, `PpfTool`, `EmergencyTool`, `FireTool`, EMI/Home/Car, `TaxTool`, rent/car decision tools, 8 post-office tools) into its own file under `mobile/components/calculators/`, and give each its own route `mobile/app/calculators/[id].tsx` (`CalcRouter`'s existing `if (id === "sip") ...` chain tells you every valid id).
2. Replace `mobile/lib/calcEngines.ts`'s simplified math with the real ported engines from the Shared Files list — the numbers currently shown do **not** match the web calculators exactly.

---

## FEATURE: Tax Regime Calculator
Priority: P1
PWA Location: `app/calculators/tax-regime-2026/page.tsx` + `components/calculators/TaxRegimeCalculator.tsx` (**~5,200 lines — read the exact file before building this, this summary is not sufficient on its own**)
Mobile Location: `mobile/app/calculators/tax-regime.tsx` — **DOES NOT EXIST** (currently a 5-input simplification inline in the Calculators hub)
Status: NOT STARTED (as a real port)

### What this screen shows
Old-vs-new FY2025-26 regime comparison: a "Personal CA" guided wizard, many collapsible toggle sections (HRA, 80GG, LTA, RSU/ESOP, gratuity, leave encashment, business income, rental, pension, interest, dividend, capital gains, agricultural, other income, 80C+NPS, 80D, other Chapter VI-A/24b), a sticky live summary, a winner banner, a comparison table, ITR-form suggestion, and a ₹99 "deep report" paywall.

### Every UI element
Each toggle section: an on/off switch + expand/collapse chevron + its own money/percent inputs when expanded. Full field-by-field list is in `docs/PWA_COMPLETE_AUDIT.md` §1.14 — read that plus the actual component file before building; this is too large to fully re-derive here.

### Every state
- Sections collapsed/expanded independently
- Live-updating summary as any input changes
- Unlock state for the paywalled deep report

### Data
- Saves: `localStorage['finkoin_tax_calculator']` (autosave) → mobile equivalent is `appStorage`, same schema-version-guarded restore-on-mount pattern
- No Supabase calls — pure client math

### Navigation
- Comes from: Calculators hub, Home quick tool
- Goes to: n/a

### Shared code from web
`lib/taxRegimeComparisonFY2026.ts`, `lib/taxCalculatorHelpers.ts`, `lib/taxMissedDeductionAlerts.ts`, `lib/taxTeachContent.ts` (all pure, listed in Shared Files) — copy these first, they're the actual tax law/math, unmodified.

### Mobile-specific notes
Build the **core** sections first (salary, HRA, 80C, 80D, 24(b), results) as P1; treat the full Personal-CA wizard + every optional-income toggle section as P2 — the web's own audit treats "basic parity" and "full Personal CA" as separate milestones, do the same here.

---

## FEATURE: Notifications (Bell + Full Inbox Page)
Priority: P1
PWA Location: `components/NotificationBell.tsx` (dropdown), `app/notifications/page.tsx` + `components/notifications/NotificationsClient.tsx` (full page — new since the last full audit pass)
Mobile Location: `mobile/components/NotificationBell.tsx` (exists), `mobile/app/notifications.tsx` — **full page does not exist, build this**
Status: PARTIAL (bell dropdown DONE, no realtime; full page NOT STARTED)

### What this screen shows (full page)
A chronological list of all notifications (not just the last 20 like the bell), each with a "mark read" action, and support for a `?id=` deep link that highlights/loads one specific row even before the list finishes loading (used when the user taps an OS push notification).

### Every UI element
- List rows: emoji/icon, title, content, relative time, read/unread indicator
- "Mark all read" button
- (deep-linked) the specific row, loaded directly if not yet in the cached list

### Every state
- Loading, empty ("No notifications yet"), success

### Data
- Fetches: `supabase.from('user_notifications').select('*').eq('user_id', uid).order('created_at', {ascending:false})` (full list, no `.limit(20)` the way the bell dropdown has)
- Saves: `.update({ is_read: true })` per row or all
- Store: `notificationStore` (needs `getById`, realtime — currently missing on mobile)

### Navigation
- Comes from: OS push notification tap (deep link `finkoin://notifications?id=<row id>`), bell dropdown's "see all"
- Goes to: whatever the notification's category implies (e.g. `learn`, `tracker`)

### Shared code from web
None (Supabase queries only).

### Mobile-specific notes
This is the destination `expo-notifications`' response listener should route to once push is set up (needs an EAS dev build, not Expo Go). Add `markPopupShown`/`getTodayUnshownPopup`/`getById` to `mobile/store/notificationStore.ts` and a realtime channel (`notifications:<uid>` INSERT) to match the web.

---

## FEATURE: Morning Tip Popup
Priority: P2
PWA Location: `components/MorningTipPopup.tsx`
Mobile Location: `mobile/components/MorningTipSheet.tsx` — **DOES NOT EXIST, build this**
Status: NOT STARTED

### What this screen shows
A once-per-day popup (06:00-22:59 IST only) showing the oldest unshown tip, with "Learn more" and a dismiss.

### Every UI element
- Tip card: emoji, title, content, "Learn more" button, close button

### Every state
- Shown once per IST calendar day, only if there's an unshown tip and the time-of-day window is open

### Data
- Fetches: from `notificationStore`'s already-loaded list, pick the oldest with `shown_as_popup=false`
- Saves: mark that row `shown_as_popup=true, is_read=true`

### Navigation
- Comes from: app open (mounted globally, like the web's root-layout mount)
- Goes to: `(tabs)`/learn equivalent (once that screen exists) or dismiss

### Shared code from web
None directly (uses `notificationStore` + `appStorage` for the daily suppression key, IST-date logic can be copied verbatim from the web component — it's pure date math).

### Mobile-specific notes
Mount it once, globally, in `mobile/app/_layout.tsx` (or the `(tabs)/_layout.tsx`) the way the web mounts it in the root layout — not per-screen.

---

## FEATURE: Profile
Priority: P1
PWA Location: `app/profile/page.tsx` + `components/profile/ProfileAssets.tsx`
Mobile Location: `mobile/app/(tabs)/profile.tsx`
Status: NOT STARTED as a real screen (currently a placeholder: name/email/plan/FK card + sign out)

### What this screen shows
Hero (avatar, name, email), health-score + FK-balance tiles, an editable assets section (Cash/Investments/Physical/Liabilities, each row editable, "+ Add" catalog menus, privacy eye), a financial checklist, a referral card (code + copy/WhatsApp), and a KYC row.

### Every UI element
- Hero: avatar, name, email
- Stat tiles: health score, FK balance
- Assets sections (×4): per-row edit (tap → amount-edit sheet), "+ Add" → catalog picker → amount sheet, section-level privacy eye
- Checklist: label left / status right, from `analyseFinances(profile).securityChecklist`
- Referral card: code, Copy button, WhatsApp share button
- KYC row: PAN format-check (mock), Aadhaar "coming soon"
- Sign out button

### Every state
- Logged-out gate: "Log in" / "Create account" buttons instead of the profile content
- Loading, empty (no health check done yet → assets section prompts to complete one)

### Data
- Fetches: `fetchUserAnalyseSnapshot(uid)` → hydrate `financialStore`
- Saves (asset edit): `patchScalarAsset`/`upsertUnifiedLoan`/`upsertCustomInvestment` (from `lib/profileAssetsPatch.ts`) → `syncProfileAssets` → re-run `analyseFinances` → `upsertUserAnalyseSnapshot`
- Store: `financialStore`, `authStore`, `gamificationStore` (needs porting)

### Navigation
- Comes from: tab bar
- Goes to: Settings (needs building), and (P2) Leaderboard/Rewards/Refer/Policies once those screens exist

### Shared code from web
`lib/profileAssetsPatch.ts` (pure, listed in Shared Files), `lib/syncProfileAssets.ts` (needs the Supabase-client swap, listed in Shared Files).

### Mobile-specific notes
Build asset-edit and add-asset as bottom sheets. Port `gamificationStore` (Build Order #13) before wiring the FK-balance tile to live data — right now it can only read `users.fk_balance` directly as a stopgap.

---

## FEATURE: Settings
Priority: P1
PWA Location: `app/settings/page.tsx`
Mobile Location: `mobile/app/settings.tsx` — **DOES NOT EXIST, build this**
Status: NOT STARTED

### What this screen shows
Name field + Save, avatar upload, "Send password reset email" button, notification-preference toggles, "Export my data", "Delete account".

### Every UI element
- Name input + Save button
- Avatar: tap to pick (`expo-image-picker`) → upload
- Button: "Send password reset email" → reuses `authStore.resetPassword`
- Toggles: email tips, push notifications, payment/split alerts
- Button: "Export my data" (JSON, share via `expo-sharing`)
- Button: "Delete account" (destructive, confirm)

### Every state
- Saving indicators per action

### Data
- Saves: `users.update({ name })`, Storage bucket `avatars` upload → `users.update({ avatar_url })`, `notification_preferences.upsert(...)`
- Store: `authStore`

### Navigation
- Comes from: Profile screen
- Goes to: back to Profile

### Shared code from web
None directly — straightforward Supabase calls.

### Mobile-specific notes
Push toggle needs `expo-notifications` (EAS dev build required) — store the Expo push token in `notification_preferences.push_token`.

---

## FEATURE: Leaderboard / Rewards / Refer
Priority: P2
PWA Location: `app/leaderboard/page.tsx`, `app/rewards/page.tsx`, `app/refer/page.tsx`
Mobile Location: `mobile/app/leaderboard.tsx`, `mobile/app/rewards.tsx`, `mobile/app/refer.tsx` — **NONE EXIST, build these**
Status: NOT STARTED (all three currently open the website from `ProfileMenu`)

### What each shows
- **Leaderboard**: top-50 rank rows + "your rank" card, 5-min cache, realtime invalidation on `gamification` changes.
- **Rewards**: FK balance, total earned, streak, badges grid.
- **Refer**: referral code, Copy/WhatsApp share, list of people you've referred.

### Data
- Leaderboard: `supabase.from('leaderboard_view').select('*').limit(50)` + `.eq('user_id', uid).maybeSingle()` for "your rank"
- Rewards: `gamification` row
- Refer: `users.referral_code`; referred count/list via `users` where `referred_by = uid`

### Navigation
- Comes from: Profile menu (currently opens the website — replace with these native screens once built)

### Shared code from web
None (Supabase queries only). All three need `gamificationStore` ported first (Build Order #13).

### Mobile-specific notes
Low priority — build after every P1 item.

---

## FEATURE: Learn Hub + Article
Priority: P2
PWA Location: `app/learn/page.tsx`, `app/learn/[id]/page.tsx`
Mobile Location: `mobile/app/learn/index.tsx`, `mobile/app/learn/[id].tsx` — **NEITHER EXISTS**
Status: NOT STARTED

### What each shows
- **Hub**: category chips (All/Basics/Tax/Investment/Insurance/Loans/Property) + article cards.
- **Article**: rich content renderer, FAQ accordion, share button, related articles.

### Data
Static content only — no Supabase calls. `lib/learnContent.ts`/`lib/learnRichArticles.ts` are the entire data source (pure, listed in Shared Files).

### Navigation
- Comes from: Home top-picks, Morning Tip Popup's "Learn more", Result screen's related links

### Mobile-specific notes
The web's custom-React-component guides (SipCrore, CompoundInterest, etc.) are P2-of-P2 — for the first pass, render the generic `LearnRichArticleRenderer` content type only and skip the bespoke guide components; link out to the web article via `expo-web-browser` for anything using a custom guide component.

---

## FEATURE: Policy Vault
Priority: P2
PWA Location: `app/policies/page.tsx` + `components/policies/PolicyVaultClient.tsx`
Mobile Location: `mobile/app/policies/index.tsx`, `mobile/app/policies/[id].tsx` — **NEITHER EXISTS**
Status: NOT STARTED

### What this shows
Policy list (type/insurer/cover/premium/renewal), add/edit sheet, renewal/transfer intent actions.

### Data
`user_policies` CRUD, via `lib/userPolicies.ts` (needs the Supabase-client swap, listed in Shared Files).

### Navigation
Comes from Profile menu.

### Mobile-specific notes
Low priority; build after P1 is done.

---

## FEATURE: Investments / Goals / Portfolio / Insurance / KYC / Plans
Priority: P2
PWA Location: `app/investments/page.tsx`, `app/goals/page.tsx`, `app/portfolio/page.tsx`, `app/insurance/page.tsx`, `app/kyc/page.tsx`, `app/plans/page.tsx`
Mobile Location: `mobile/app/investments.tsx`, `goals.tsx`, `portfolio.tsx`, `insurance.tsx`, `kyc.tsx`, `plans.tsx` — **NONE EXIST**
Status: NOT STARTED

### What each shows
These are all **partial/placeholder on the PWA itself** — Investments is a read-only asset rollup, Goals is mostly "Coming soon", Portfolio uses sample fund data (not live CAMS), Insurance is a compare-shell, KYC is a mock PAN check, Plans has known Razorpay TODOs. Match that same "not fully built" bar on mobile — don't over-invest here.

### Mobile-specific notes
Build these last, and keep them simple/placeholder-equivalent to match the web's own current state.

---

## FEATURE: Blog, Legal Pages, About/Contact/Careers/Press
Priority: P2
PWA Location: `app/blog/page.tsx`, `app/blog/[slug]/page.tsx`, `app/legal/*`, `app/about/page.tsx`, `app/contact/page.tsx`, `app/careers/page.tsx`, `app/press/page.tsx`
Mobile Location: `mobile/app/legal/[doc].tsx` (recommended single dynamic route)
Status: NOT STARTED

### What this shows
Mostly static marketing/legal content with no meaningful interactivity.

### Mobile-specific notes
**Do not port these natively.** Open them with `expo-web-browser`'s `openBrowserAsync('https://www.finkoin.com/<path>')` instead — a native rebuild of static marketing copy is not worth the maintenance cost. The one exception: you need at least a working link to `/legal/privacy` from Settings/Profile for Play Store's Data Safety form requirement — a `WebBrowser` link satisfies that.

---

## FEATURE: Play Store / TestFlight Packaging
Priority: P2 (do last)
PWA Location: n/a
Mobile Location: `mobile/eas.json` (does not exist), app store listings
Status: NOT STARTED

### What's needed
- `eas.json` with a development + production build profile
- App icon at all required sizes, splash screen (assets already exist in `mobile/assets/`, verify sizes)
- Android: `versionCode`, signing key, Play Console Data Safety form (financial info + email + name, mention encryption in transit, deletion via Settings), privacy policy URL
- iOS: Apple Developer account, TestFlight build, `ITSAppUsesNonExemptEncryption` entry
- Push notification server: needs a sender for Expo push tokens added to `notification_preferences.push_token` (web-repo change to `/api/notifications/deliver-tip` and `/api/obligations/reminders`)

### Mobile-specific notes
Do this only once P0+P1 are built and tested on a real device/simulator — packaging before the app works is wasted effort.
