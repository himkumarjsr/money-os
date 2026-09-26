# Mobile App Progress Tracker

> Generated 2026-09-26 from a file-by-file read of `mobile/` at commit `e5d3f3b` ("split functinality").
> Target list = the screens / components / stores / integrations defined in `docs/MOBILE_BUILD_PLAN.md`.
> Legend: ✅ Complete (built, wired, parity-acceptable) · ⚠️ Partial / placeholder / built-but-unwired · ❌ Not built
> Update this file at the end of every sprint.

## Overall Progress

| Area | Complete | Partial | Not built | Total | % complete |
|---|---|---|---|---|---|
| Screens | 7 | 9 | 26 | 42 | 17 % |
| Components | 9 | 24 | 55 | 88 | 10 % |
| Stores | 1 | 3 | 3 | 7 | 14 % |
| API / data integrations | 5 | 3 | 17 | 25 | 20 % |

Screens: 7/42 complete
Components: 9/88 complete
Stores: 1/7 complete
API integration: 5/25 complete

**Top blockers** (details in `MOBILE_BUILD_PLAN.md §0`): B1 wrong analyse table (`user_analysis` vs `user_analyse_snapshots`), B2 API routes are cookie-only (no Bearer), B4 tracker insert/query bugs, B5 built components not wired.

## Screen Status

| Screen | File | Status | Notes |
|---|---|---|---|
| Login | `app/(auth)/login.tsx` | ⚠️ Partial | Email + Google work; missing Forgot password, ≥ 6-char rule, `next` redirect |
| Sign up | `app/(auth)/signup.tsx` | ✅ Complete | Add Terms/Privacy links + referral apply (polish) |
| Forgot password | `app/(auth)/forgot-password.tsx` | ❌ Not built | P0 |
| Auth callback | `app/auth/callback.tsx` | ✅ Complete | Needs `type=recovery` branch later |
| Update password | `app/auth/update-password.tsx` | ❌ Not built | P1 |
| Home | `app/(tabs)/index.tsx` | ✅ Complete | QuickTools routing bugs (B6) are in the component |
| Report (Analyse tab) | `app/(tabs)/analyse.tsx` | ⚠️ Partial | Reads `user_analysis` only (B1); score + issues only |
| Analyse consent | `app/analyse/consent.tsx` | ❌ Not built | P0 — `users.data_consent_*` |
| Analyse form | `app/analyse/form.tsx` | ⚠️ Partial | 35 of ~100 fields, no Zod step validation, no loans/other-insurance/PO/date fields, writes `user_analysis` only |
| Analyse result | `app/analyse/result.tsx` | ❌ Not built | P0 — buckets, safety net, net worth, gauges, unlock |
| Fix plan | `app/analyse/fixplan.tsx` | ⚠️ Placeholder | "Ships in next mobile release" text only; needs B2 |
| Tracker | `app/(tabs)/tracker.tsx` | ⚠️ Partial | Simple list + inline add; no consent, month nav, pulse, CC, obligations; `title` column + `-31` date bugs (B4) |
| Tracker month history | `app/tracker/[month].tsx` | ❌ Not built | P1 |
| Split | `app/(tabs)/split.tsx` | ✅ Complete | Create, invite (invite_code share), join by code, delete; no realtime |
| Group Detail | `app/split/[groupId]/index.tsx` | ✅ Complete | Tabs, balances, settle, invite, leave/remove, delete; no realtime / email invite |
| Add Expense | `app/split/[groupId]/add-expense.tsx` | ✅ Complete | 4 split types + edit; date is a text field |
| Split join (deep link) | `app/split/join.tsx` | ❌ Not built | P0 — `?code=` / `?token=` links from WhatsApp |
| Calculators | `app/(tabs)/calculators.tsx` | ⚠️ Partial | All 20 tools work inline (hidden tab); not deep-linkable; simplified engines |
| Calculator detail | `app/calculators/[id].tsx` | ❌ Not built | P1 — one route per calc id |
| Tax Calculator | `app/calculators/tax-regime.tsx` | ⚠️ Partial | Only a 5-input simplified compare inside the Calculators tab; full FY26 engine not ported |
| SIP Calculator | `app/calculators/[id].tsx` (`sip`) | ⚠️ Partial | Works inline in the Calculators tab (`SipTool`); no standalone route |
| Profile | `app/(tabs)/profile.tsx` | ⚠️ Placeholder | Name/email/plan/FK card + sign out only |
| Settings | `app/settings.tsx` | ❌ Not built | P1 (currently an external web link) |
| Notifications inbox | `components/NotificationBell.tsx` (modal) | ✅ Complete | No realtime channel yet |
| Morning tip popup | `components/MorningTipSheet.tsx` | ❌ Not built | P1 |
| Legal (privacy/terms/refund/disclaimer) | `app/legal/[doc].tsx` | ❌ Not built | P1 — needed for Play Store |
| Learn hub | `app/learn/index.tsx` | ❌ Not built | P2 |
| Learn article | `app/learn/[id].tsx` | ❌ Not built | P2 |
| Blog list | `app/blog/index.tsx` | ❌ Not built | P3 |
| Blog article | `app/blog/[slug].tsx` | ❌ Not built | P3 |
| Leaderboard | `app/leaderboard.tsx` | ❌ Not built | P2 (external link today) |
| Rewards | `app/rewards.tsx` | ❌ Not built | P2 (external link today) |
| Refer & earn | `app/refer.tsx` | ❌ Not built | P2 (external link today) |
| Investments | `app/investments.tsx` | ❌ Not built | P2 (external link today) |
| Optimizer | `app/optimizer.tsx` | ❌ Not built | P2 |
| Policies list | `app/policies/index.tsx` | ❌ Not built | P2 (external link today) |
| Policy detail/edit | `app/policies/[id].tsx` | ❌ Not built | P2 |
| Goals | `app/goals.tsx` | ❌ Not built | P3 (web is "Coming soon") |
| Portfolio | `app/portfolio.tsx` | ❌ Not built | P3 (web is demo data) |
| Insurance | `app/insurance.tsx` | ❌ Not built | P3 |
| KYC | `app/kyc.tsx` | ❌ Not built | P3 |
| Plans / Pricing | `app/plans.tsx` | ❌ Not built | P3 |

Routing-only files (not counted): `app/_layout.tsx` ✅, `app/index.tsx` ✅, `app/(auth)/_layout.tsx` ✅, `app/(auth)/index.tsx` ✅, `app/(tabs)/_layout.tsx` ✅, `app/+not-found.tsx` ❌.

## Component Status

| Component | File | Status | Notes |
|---|---|---|---|
| Button | `components/ui/Button.tsx` | ✅ Complete | |
| Card | `components/ui/Card.tsx` | ✅ Complete | |
| Input | `components/ui/Input.tsx` | ✅ Complete | 16 px text |
| ResultStat | `components/ui/ResultStat.tsx` | ✅ Complete | |
| BrandLogo | `components/ui/BrandLogo.tsx` | ✅ Complete | |
| MoneyInput | `components/ui/MoneyInput.tsx` | ⚠️ Partial | Add max cap + in-words helper |
| SliderField | `components/ui/SliderField.tsx` | ⚠️ Partial | Add tap-to-type value |
| AppIcon | `components/ui/AppIcon.tsx` | ⚠️ Partial | Subset of web icons |
| Chip | `components/ui/Chip.tsx` | ⚠️ Built, unwired | |
| SegmentControl | `components/ui/SegmentControl.tsx` | ⚠️ Built, unwired | |
| PrivacyEye | `components/ui/PrivacyEye.tsx` | ⚠️ Built, unwired | Used only by the unwired MonthSafetyPulse |
| HealthScoreRing | `components/ui/HealthScoreRing.tsx` | ⚠️ Built, unwired | Used only by the unwired ResultCard |
| LoadingSpinner | `components/ui/LoadingSpinner.tsx` | ⚠️ Built, unwired | |
| PasswordInput | `components/ui/PasswordInput.tsx` | ❌ Not built | |
| NumberInput | `components/ui/NumberInput.tsx` | ❌ Not built | |
| Insight | `components/ui/Insight.tsx` | ❌ Not built | |
| ToggleButtons | `components/ui/ToggleButtons.tsx` | ❌ Not built | |
| RadioCards | `components/ui/RadioCards.tsx` | ❌ Not built | |
| SelectSheet | `components/ui/SelectSheet.tsx` | ❌ Not built | |
| BottomSheet | `components/ui/BottomSheet.tsx` | ❌ Not built | Sheets are ad-hoc `Modal`s today |
| ConfirmSheet | `components/ui/ConfirmSheet.tsx` | ❌ Not built | `Alert` used today |
| PrivateAmount | `components/ui/PrivateAmount.tsx` | ❌ Not built | |
| Gauge (SpeedoMeter port) | `components/ui/Gauge.tsx` | ❌ Not built | |
| EmptyState | `components/ui/EmptyState.tsx` | ❌ Not built | |
| ErrorBox | `components/ui/ErrorBox.tsx` | ❌ Not built | |
| TrackerIcon / TrackerIconBadge | `components/tracker/TrackerIcons.tsx` | ❌ Not built | |
| ShareButton | `components/ui/ShareButton.tsx` | ❌ Not built | |
| FormError | `components/ui/FormError.tsx` | ❌ Not built | |
| FinkoinTabBar | `components/navigation/FinkoinTabBar.tsx` | ✅ Complete | Safe-area aware |
| AppHeader | `components/AppHeader.tsx` | ✅ Complete | |
| ProfileMenu | `components/ProfileMenu.tsx` | ⚠️ Partial | Split/Policies/Goals/etc. open the web (B6) |
| NotificationBell | `components/NotificationBell.tsx` | ⚠️ Partial | No realtime |
| MorningTipSheet | `components/MorningTipSheet.tsx` | ❌ Not built | |
| PushPermissionPrompt | `components/PushPermissionPrompt.tsx` | ❌ Not built | Needs dev build |
| HeroCarousel | `components/landing/HeroCarousel.tsx` | ✅ Complete | |
| TopPicks | `components/landing/TopPicks.tsx` | ✅ Complete | |
| QuickTools | `components/landing/QuickTools.tsx` | ⚠️ Partial | Split → Home bug; calculators not deep-linked |
| Testimonials | `components/landing/Testimonials.tsx` | ❌ Not built | P2 |
| StepIndicator | `components/analyse/StepIndicator.tsx` | ⚠️ Built, unwired | |
| ResultCard | `components/analyse/ResultCard.tsx` | ⚠️ Built, unwired | |
| ConsentSheet | `components/analyse/ConsentSheet.tsx` | ❌ Not built | |
| StepHeader | `components/analyse/StepHeader.tsx` | ❌ Not built | |
| PremiumField | `components/analyse/PremiumField.tsx` | ❌ Not built | |
| DayOfMonthPicker | `components/analyse/DayOfMonthPicker.tsx` | ❌ Not built | |
| PremiumDueFields | `components/analyse/PremiumDueFields.tsx` | ❌ Not built | |
| LoanRow | `components/analyse/LoanRow.tsx` | ❌ Not built | |
| OtherInsuranceRow | `components/analyse/OtherInsuranceRow.tsx` | ❌ Not built | |
| CustomInvestmentRow | `components/analyse/CustomInvestmentRow.tsx` | ❌ Not built | |
| PostOfficeRow | `components/analyse/PostOfficeRow.tsx` | ❌ Not built | |
| AdvisorSheet | `components/analyse/AdvisorSheet.tsx` | ❌ Not built | |
| BucketTable | `components/analyse/BucketTable.tsx` | ❌ Not built | |
| SafetyNetList | `components/analyse/SafetyNetList.tsx` | ❌ Not built | |
| CashFlowWaterfall | `components/analyse/CashFlowWaterfall.tsx` | ❌ Not built | |
| PaywallSheet | `components/analyse/PaywallSheet.tsx` | ❌ Not built | Needs Razorpay RN SDK |
| PriorityCard | `components/analyse/PriorityCard.tsx` | ❌ Not built | |
| DebtTable | `components/analyse/DebtTable.tsx` | ❌ Not built | |
| FeedbackCard | `components/analyse/FeedbackCard.tsx` | ❌ Not built | |
| TrackerConsent | `components/tracker/TrackerConsent.tsx` | ⚠️ Built, unwired | |
| AddExpenseSheet | `components/tracker/AddExpenseSheet.tsx` | ⚠️ Built, unwired | Full web-parity sheet already written |
| MonthSafetyPulse | `components/tracker/MonthSafetyPulse.tsx` | ⚠️ Built, unwired | Includes `TrackerNestedPanels` |
| BucketCard | `components/tracker/BucketCard.tsx` | ⚠️ Built, unwired | Superseded by BucketSection |
| MonthSwitcher | `components/tracker/MonthSwitcher.tsx` | ❌ Not built | |
| SummaryCard | `components/tracker/SummaryCard.tsx` | ❌ Not built | |
| BucketSection | `components/tracker/BucketSection.tsx` | ❌ Not built | |
| TxnRow | `components/tracker/TxnRow.tsx` | ❌ Not built | Swipe actions |
| CreditCardBillReminder | `components/tracker/CreditCardBillReminder.tsx` | ❌ Not built | lib already ported |
| ObligationsChecklist | `components/tracker/ObligationsChecklist.tsx` | ❌ Not built | |
| AddObligationSheet | `components/tracker/AddObligationSheet.tsx` | ❌ Not built | |
| MonthSummary | `components/tracker/MonthSummary.tsx` | ❌ Not built | |
| InviteLinkShare | `components/split/InviteLinkShare.tsx` | ⚠️ Inline | Share logic is inline in split screens — extract |
| GroupRow | inline in `app/(tabs)/split.tsx` | ⚠️ Inline | Extract |
| ExpenseRow | inline in `app/split/[groupId]/index.tsx` | ⚠️ Inline | Extract |
| MemberRow | inline in `app/split/[groupId]/index.tsx` | ⚠️ Inline | Extract |
| SimplifiedEdgeRow | inline in `app/split/[groupId]/index.tsx` | ⚠️ Inline | Extract |
| SettleSheet | inline in `app/split/[groupId]/index.tsx` | ⚠️ Inline | Extract into BottomSheet |
| Calculator tools (SIP, SWP, PPF, EMI/Home/Car, Tax, FIRE, Emergency, Rent-buy, Rent-car, When-car, PO ×4) | inline in `app/(tabs)/calculators.tsx` | ⚠️ Inline | Extract to `components/calculators/*` |
| AmortisationTable | `components/calculators/AmortisationTable.tsx` | ❌ Not built | |
| ToggleSection | `components/calculators/ToggleSection.tsx` | ❌ Not built | Tax calc |
| ComparisonTable | `components/calculators/ComparisonTable.tsx` | ❌ Not built | Tax calc |
| AssetsSection | `components/profile/AssetsSection.tsx` | ❌ Not built | |
| EditAmountSheet | `components/profile/EditAmountSheet.tsx` | ❌ Not built | |
| AddAssetSheet | `components/profile/AddAssetSheet.tsx` | ❌ Not built | |
| ChecklistList | `components/profile/ChecklistList.tsx` | ❌ Not built | |
| ReferralCard | `components/profile/ReferralCard.tsx` | ❌ Not built | |
| ArticleCard | `components/learn/ArticleCard.tsx` | ❌ Not built | |
| RichArticleRenderer | `components/learn/RichArticleRenderer.tsx` | ❌ Not built | |
| FaqAccordion | `components/learn/FaqAccordion.tsx` | ❌ Not built | |
| RankRow | `components/social/RankRow.tsx` | ❌ Not built | |

Legacy / to delete: `components/home/QuickTools.tsx`, `components/home/DailyTip.tsx` (unused, superseded).

## Store Status

| Store | File | Status | Notes |
|---|---|---|---|
| authStore | `store/authStore.ts` | ⚠️ Partial | Sign in/up, Google, sign out, refresh work; add `resetPassword`, referral apply, gamification sync |
| financialStore | `store/financialStore.ts` | ⚠️ Built, unused | Wire + hydrate from `user_analyse_snapshots` |
| splitStore | `store/splitStore.ts` | ✅ Complete | Direct Supabase; `siteBase` should default to `www` |
| notificationStore | `store/notificationStore.ts` | ⚠️ Partial | Add `markPopupShown`, `getTodayUnshownPopup`, realtime |
| obligationStore | `store/obligationStore.ts` | ❌ Not built | Port the web store |
| gamificationStore | `store/gamificationStore.ts` | ❌ Not built | Port the web store |
| portfolioStore | `store/portfolioStore.ts` | ❌ Not built | P3 |

## API / Data Integration Status

| Integration | Status | Notes |
|---|---|---|
| Supabase Auth — email/password | ✅ | |
| Supabase Auth — Google OAuth (deep link) | ✅ | Needs `exp://**`, `finkoin://**` redirect URLs |
| Supabase Auth — password reset + recovery | ❌ | |
| `user_analysis` read/write (back-compat) | ✅ | |
| `user_analyse_snapshots` read/write | ❌ | **B1** |
| `users` consent fields | ❌ | |
| `expense_transactions` CRUD | ⚠️ | Select + insert only; `title` column / `-31` date bugs |
| `tracker_consent` | ⚠️ | Component writes it but isn't mounted |
| `user_credit_cards` | ❌ | lib ported, no UI |
| `financial_obligations` / `obligation_checklist` / RPC `generate_monthly_checklist` | ❌ | |
| `split_*` tables (direct) | ✅ | |
| Split realtime channels | ❌ | |
| `/api/split/join` (token invites) | ❌ | Needs B2 |
| `user_notifications` fetch / mark read | ✅ | |
| Notifications realtime | ❌ | |
| `gamification` / FK balance | ⚠️ | Balance read via `users.fk_balance` only |
| `leaderboard_view` | ❌ | |
| `/api/ai/analyse` (fix plan) | ❌ | Needs B2 |
| `/api/financial-data` (encrypted copy) | ❌ | Needs B2 |
| `/api/feedback` (+50 FK) | ❌ | Public POST works; FK needs B2 |
| Razorpay (create-order / verify) | ❌ | Needs dev build + B2 |
| Push token (`notification_preferences.push_token`) | ❌ | Needs dev build + server sender |
| Storage `avatars` | ❌ | |
| `notification_preferences` | ❌ | |
| `user_policies` | ❌ | |

## What to Build Next

Ordered list of the next 10 files (Sprint 1, see `MOBILE_BUILD_PLAN.md §7`):

1. `mobile/lib/userAnalyseSnapshot.ts` — port from web (swap to `@/lib/supabase`); fixes B1 read/write.
2. `mobile/app/(tabs)/analyse.tsx` — load `user_analyse_snapshots` → `financialStore.hydrateFromSnapshot`, fall back to `user_analysis`.
3. `mobile/app/analyse/form.tsx` — on submit also upsert the snapshot payload `{profile, result, submittedAt, version:'1.0', analysis}`.
4. `mobile/lib/localDate.ts`, `trackerMonthIncome.ts`, `trackerObligationSync.ts`, `obligationLearn.ts` — copy as-is from web `lib/`.
5. `mobile/store/obligationStore.ts` — port the web store (fetch, checklist, mark paid/skip, RPC, `syncFromHealthCheck`).
6. `mobile/components/ui/BottomSheet.tsx` — shared sheet (radius 20, maxHeight 90 %, bottom inset, backdrop close).
7. `mobile/components/tracker/TrackerIcons.tsx` — `TrackerIcon` / `TrackerIconBadge` (react-native-svg port).
8. `mobile/app/(tabs)/tracker.tsx` — rebuild: `TrackerConsent` gate, month/year queries, `AddExpenseSheet`, `MonthSafetyPulse`, forward-limit month nav, eyes, pull-to-refresh (B4/B5).
9. `mobile/components/landing/QuickTools.tsx` + `mobile/components/ProfileMenu.tsx` — fix Split route and in-app destinations (B6).
10. `mobile/app/(auth)/forgot-password.tsx` (+ `authStore.resetPassword`, link from `login.tsx`).

Parallel web-repo task: add `Authorization: Bearer` support to `lib/apiGuard.ts#getAuthedUser` (B2) — unblocks fix plan, payments, encrypted data, and feedback FK on mobile.
