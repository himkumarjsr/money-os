# Finkoin PWA Audit Summary (Agent 1)

> This audit was not re-derived from scratch in this pass — the codebase was already read file-by-file in earlier turns of this same session (FINKOIN_SYSTEM.md, `package.json`, `next.config.mjs`, every file in `app/`, `components/`, `lib/`, `store/`, `public/manifest.json`, and every file in `mobile/`), and the findings were committed as `docs/PWA_COMPLETE_AUDIT.md`, `docs/MOBILE_BUILD_PLAN.md`, `docs/MOBILE_CURRENT_STATE.md`, `docs/MOBILE_PROGRESS.md` and `.claude/project-context.md`. Re-reading all ~260 files again here would violate this same prompt's own token-efficiency rule ("do not re-read files you already read"). This summary and `feature-manifest.json` restate those findings in the requested format; `docs/PWA_COMPLETE_AUDIT.md` is the line-by-line source if you need more than the counts below.

## Totals

| Metric | Count |
|---|---|
| Total screens found (PWA `app/**/page.tsx`) | 48 |
| Total components found (`components/**/*.tsx`) | 129 |
| Total stores found | 8 (`authStore`, `financialStore`, `splitStore`, `gamificationStore`, `notificationStore`, `obligationStore`, `portfolioStore`, `use-app-store`) |
| Total API routes found | 23 route files / 31 handlers |
| Total lib functions found | ~342 exported functions across 86 `lib/**/*.ts` files (see `.claude/project-context.md` "Shared Lib Functions") |
| Features captured in this manifest | 14 (grouped; the PWA has more granular sub-screens than 14 — see each feature's `screens[]`) |
| Features already in mobile (`exists`) | 1 (`split`) |
| Features partial in mobile (`partial`) | 8 (`auth`, `home-landing`, `analyse-health-check`, `tracker`, `calculators-hub`, `tax-calculator`, `profile-settings`, `notifications`) |
| Features missing from mobile (`missing`) | 5 (`analyse-result`, `analyse-fixplan`, `gamification`, `learn-blog`, `policies-portfolio-other`) |

## Priority breakdown

- **P0 (app does not work without this):** auth, home-landing, analyse-health-check, analyse-result, tracker, split — 6 features
- **P1 (core value of the app):** analyse-fixplan, calculators-hub, tax-calculator, profile-settings, notifications — 5 features
- **P2 (enhancement):** gamification, learn-blog, policies-portfolio-other — 3 features

## Cross-cutting facts (apply to every feature)

- **Canonical analyse data lives in `user_analyse_snapshots.payload`**, not `user_analysis`. Mobile currently reads/writes only `user_analysis` — this is why a web-completed health check shows as empty on mobile. Fix first (blocks `analyse-health-check` and `analyse-result`).
- **Every authed `/api/*` route is cookie-only** (`lib/apiGuard.ts#getAuthedUser`). Mobile has no session cookies, so `analyse-fixplan`, Razorpay, `/api/split/join` (token invites), `/api/financial-data`, and FK-awarding `/api/feedback` are all unreachable from native code today. Only `/api/razorpay/verify-payment` accepts a Bearer token.
- **5 shared lib files copied into `mobile/lib/` are stale** vs the current `lib/` (`analyse-form-schema.ts`, `financialEngine.ts`, `priorityEngine.ts`, `universal-buckets.ts`, `formatters.ts`) — re-copying these is a prerequisite for `analyse-health-check`/`analyse-result` to produce PWA-identical numbers.
- **Mobile's tracker has two data bugs**: an insert with a `title` column not present in the tracker table's SQL setup, and a month-range query using the literal (invalid) date `YYYY-MM-31`.
- **12 mobile components are already built but not mounted on any screen**: `AddExpenseSheet`, `MonthSafetyPulse`, `TrackerConsent`, `BucketCard`, `ResultCard`, `StepIndicator`, `HealthScoreRing`, `Chip`, `SegmentControl`, `LoadingSpinner`, `PrivacyEye`, `DailyTip`. `financialStore` is built but never imported.
- **Navigation bugs**: the landing "Split" quick-tool tile routes to Home instead of the Split tab; the profile menu opens the *website* for Split/Policies/Goals/Investments/Leaderboard/Rewards/Refer/Settings instead of native screens.

Full detail (every screen's UI elements, interactions, states, data operations, navigation) is in `docs/PWA_COMPLETE_AUDIT.md` and `.agents/output/feature-manifest.json`.
