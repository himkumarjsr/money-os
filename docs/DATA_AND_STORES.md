# Data, stores, and database

## Zustand stores (`store/`)

| File                     | Export                 | Owns                                                 |
| ------------------------ | ---------------------- | ---------------------------------------------------- |
| `authStore.ts`           | `useAuthStore`         | User, session flags, subscription tier, login/logout |
| `financialStore.ts`      | `useFinancialStore`    | Analyse draft, result, AI plan (user-scoped persist) |
| `use-financial-store.ts` | re-export              | Alias → `financialStore`                             |
| `splitStore.ts`          | `useSplitStore`        | Groups, expenses, net balances, edges                |
| `gamificationStore.ts`   | `useGamificationStore` | FK balance, streaks, badges                          |
| `notificationStore.ts`   | `useNotificationStore` | Inbox + morning tip popup                            |
| `portfolioStore.ts`      | `usePortfolioStore`    | Demo portfolio analysis                              |
| `use-app-store.ts`       | `useAppStore`          | Onboarding step only                                 |

## Domain engines (`lib/`)

| Domain      | Key modules                                                                                                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Analyse     | `financialEngine.ts`, `priorityEngine.ts`, `analyse-form-schema.ts`, `netWorth.ts`, `universal-buckets.ts`, `bucket-breakdown.ts`, `userAnalyseSnapshot.ts`, `finkoinAiPlan.ts`, `financialOptimizer.ts` |
| AI / RAG    | `rag/retriever.ts`, `knowledgeBase/*`, `aiService.ts`, `aiProviderMessages.ts`                                                                                                                           |
| Tracker     | `tracker-categories.ts`, `trackerSafetyPulse.ts`, `trackerCreditCards.ts`, `trackerProfileIncome.ts`, `expense-bucket-recommendations.ts`                                                                |
| Split       | `splitBalances.ts`, `splitShares.ts`, `splitInvite.ts`, `splitAuthRedirect.ts`                                                                                                                           |
| Auth / API  | `auth.ts`, `authSession.ts`, `apiGuard.ts`, `supabase*.ts`                                                                                                                                               |
| Payments    | `payment.ts`, `subscriptionBypass.ts`                                                                                                                                                                    |
| Tax / calcs | `fireCalculator.ts`, `amortisation.ts`, `finance.ts`, `taxCalculatorHelpers.ts`, `taxRegimeComparisonFY2026.ts`, `exportExcel.ts`                                                                        |
| Profile     | `profileAssetsPatch.ts`, `syncProfileAssets.ts`, `userPolicies.ts`, `kycVerification.ts`                                                                                                                 |
| Content     | `learnContent.ts`, `blogContent.ts`, `seo.ts`, `siteUrl.ts`                                                                                                                                              |
| Misc        | `analytics.ts`, `cache.ts`, `formatters.ts`, `generatePDF.ts`, `referralRewards.ts`                                                                                                                      |

Pure calculation engines (portable): `financialEngine`, `priorityEngine`, `splitBalances`, `splitShares`, `trackerSafetyPulse`, most tax helpers. Browser/Next-coupled: Supabase clients, `apiGuard`, PDF, analytics.

---

## Database: what is in this repo

### Migrations (`supabase/migrations/`)

| File                                           | Creates / alters                                                                              |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `001_initial.sql`                              | Early `users`, `referrals`, `user_stats` scaffold                                             |
| `002_user_analyse_snapshots.sql`               | `user_analyse_snapshots` + RLS                                                                |
| `003_complete_setup.sql`                       | `users`, `user_analysis`, `finkoin_knowledge`, `gamification`, `insurance_clicks`, vector ext |
| `003_user_policies.sql`                        | `user_policies` + RLS                                                                         |
| `004_user_policies_add_status.sql`             | `status` column                                                                               |
| `005_fix_snapshots.sql`                        | Idempotent snapshot / `user_analysis` fixes                                                   |
| `006_app_feedback.sql` / `007_*`               | `app_feedback` (+ answers/recommend)                                                          |
| `008_notification_preferences.sql`             | `notification_preferences`, `finance_tips`                                                    |
| `009_notification_preferences_declined_at.sql` | `declined_at`                                                                                 |

### Manual SQL (`supabase/manual/`) — apply in SQL editor

| File                        | Purpose                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `expense_tracker.sql`       | `expense_transactions`, `tracker_consent`                                                |
| `tracker_credit_cards.sql`  | `user_credit_cards` (+ expense card columns); app also uses localStorage for saved cards |
| `referral_code_avatars.sql` | `users.avatar_url`, avatars bucket notes                                                 |

### Remote / not checked into migrations (app uses them)

Documented in `FINKOIN_SYSTEM.md` §34. Must exist in the live Supabase project:

**Split**

- `split_groups`, `split_group_members`
- `split_expenses`, `split_expense_shares`
- `split_invitations`, `split_settlements`

**Tips / inbox**

- `user_notifications`, `user_tip_history`
- RPC `get_next_tip_for_user` (and related tip plumbing)

Writes for Split often use the **service-role** admin client in API routes. Reads in the store use the **user** client → RLS must allow member reads or the UI breaks.

---

## Caching (client)

| Data                       | Where                        | Note                   |
| -------------------------- | ---------------------------- | ---------------------- |
| Auth                       | cookies + `finkoin-auth`     | Session lifecycle      |
| Financial draft            | `finkoin-financial:<userId>` | Until reset            |
| AI plan                    | `finkoin_ai_cache` + DB      | ~30 days / hash match  |
| Split groups               | `splitStore` TTL ~2 min      | Force refresh on focus |
| Tax calculator             | `finkoin_tax_calculator`     | Device local           |
| Leaderboard / testimonials | localStorage                 | Short TTLs             |
