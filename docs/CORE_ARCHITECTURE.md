# Finkoin Core Architecture

Overview layer. Deep rules/runbooks: [`FINKOIN_SYSTEM.md`](../FINKOIN_SYSTEM.md). Route catalog: [PRODUCT_SURFACE.md](./PRODUCT_SURFACE.md). APIs: [API_REFERENCE.md](./API_REFERENCE.md). Data: [DATA_AND_STORES.md](./DATA_AND_STORES.md).

## System Overview

```
Browser (Next.js App Router + Zustand + PWA)
    │
    ├─ Supabase Auth (cookie session) ── middleware refreshes JWT (no login redirect)
    ├─ Deterministic engines (financialEngine, priorityEngine, splitBalances, trackerSafetyPulse)
    ├─ API routes (auth-gated + rate-limited where sensitive)
    │     ├─ Groq + RAG  → /api/ai/analyse
    │     ├─ Razorpay    → create-order / verify-payment
    │     ├─ Split       → groups / invite / join / expenses / balances / settle
    │     └─ Tips cron   → /api/notifications/deliver-tip
    └─ Supabase DB + RLS
          ├─ In-repo migrations + supabase/manual/*
          └─ Split + tip tables often remote/manual (see DATA_AND_STORES.md)
```

## Data Flow

### Health Check Flow

1. User opens `/analyse` (must be logged in; consent modal)
2. 7-step RHF + Zod form (`analyse-onboarding-form`)
3. Submit → normalize → `financialStore.setFullAnalysis` → `analyseFinances`
4. Optional AI → `POST /api/ai/analyse` (**auth** + 10/hr) → `buildPriorityPlan` + RAG + Groq
5. Snapshot → `user_analyse_snapshots` when logged in
6. `/analyse/result` free report + paywall
7. Unlock (Razorpay ₹99 / FK / skip env / admin) → `/analyse/fixplan` + PDF

### Auth Flow

1. Middleware: `getUser()` refresh cookies; **homepage skipped**; **no server redirect to login**
2. Client: `ProtectedGate` waits for `hasInitialized`, then redirects to `/login?redirect=`
3. Email / Google OAuth → `/auth/callback` PKCE
4. `initAuth` loads `users` + `gamification`
5. Logout: `POST /api/auth/sign-out` + client clear
6. Split invite resume: `lib/splitAuthRedirect.ts` + `SplitInviteResume` preserves join token through login

### Split Flow

1. Create group → `POST /api/split/groups` (creator = admin)
2. Open invite (`linkOnly`) → marker email `__open__@finkoin.invite` → reusable token URL
3. Email invite → pending member + optional Resend email
4. Join → `POST /api/split/join` (open: any logged-in user; email: must match)
5. Add expense → `computeSplitShares` → `POST /api/split/expenses`
6. Balances → `GET /api/split/balances` → `computeNetBalances` + `simplifyDebts`
7. Settle → `POST /api/split/settle` (amount-accurate via `split_settlements`; does **not** flip share `is_settled`)
8. Soft-close → `DELETE /api/split/groups?groupId=` (creator; `is_active=false`)

### Tracker Flow

1. Consent → month view `/tracker` / `/tracker/[month]`
2. Add expense / savings → buckets (`tracker-categories`) + optional credit card encoding
3. Month Safety Pulse → `computeMonthSafetyPulse` → Safe / Tight / Over (`MonthSafetyPulse`)
4. Credit card bill reminder → next-month prompt → Loans / `credit_card` payment prefill

### Notification Flow

1. Vercel cron → `/api/notifications/deliver-tip` (`CRON_SECRET` / Vercel cron header)
2. RPC `get_next_tip_for_user` → insert `user_notifications` (+ history)
3. If VAPID configured: Web Push to `push_subscriptions` (device OS alert)
4. Client: `NotificationBell` + `MorningTipPopup` (IST once/day); `PushPermissionPrompt` / Settings to subscribe
5. Optional email: `/api/notifications/send-daily-tip` via Resend

### Payment Flow

1. `GET /api/razorpay/checkout-config` → public key
2. Authed `POST /api/razorpay/create-order` → ₹99 order (15/hr)
3. Checkout → `POST /api/razorpay/verify-payment` HMAC + Bearer → `users.subscription_tier = pro`

## State Management

| Store               | Owns                           |
| ------------------- | ------------------------------ |
| `authStore`         | User, session flags, tier      |
| `financialStore`    | Analyse draft, result, AI plan |
| `splitStore`        | Groups, expenses, net balances |
| `gamificationStore` | FK balance, streaks, badges    |
| `notificationStore` | Inbox + popup state            |
| `portfolioStore`    | Demo portfolio analysis        |
| `useAppStore`       | Onboarding step only           |

## Caching Strategy

| Data                       | Where                        | TTL / note                         |
| -------------------------- | ---------------------------- | ---------------------------------- |
| Auth                       | cookies + `finkoin-auth`     | Session lifecycle                  |
| Financial draft            | `finkoin-financial:<userId>` | Until reset                        |
| AI plan                    | `finkoin_ai_cache` + DB      | ~30 days / hash match              |
| Split groups list          | store TTL ~2 min             | Force refresh on focus (debounced) |
| Tax calculator inputs      | `finkoin_tax_calculator`     | Device local                       |
| Leaderboard / testimonials | localStorage                 | 5 min / 24 h                       |

## Security Model

- Supabase RLS on user-owned tables
- Service role only in server routes (`check:secrets`)
- API auth + rate limits via `apiGuard` on AI, invite, settle, feedback, create-order
- Razorpay signature verification server-side
- Open split invites intentionally reusable; email invites are identity-bound

## API Architecture (summary)

| Route family              | Role                                             |
| ------------------------- | ------------------------------------------------ |
| `POST /api/ai/analyse`    | Groq fix plan (auth)                             |
| `POST /api/auth/sign-out` | Cookie sign-out                                  |
| `POST/GET /api/feedback`  | Feedback                                         |
| `GET /api/testimonials`   | Landing testimonials                             |
| `*/api/razorpay/*`        | Checkout / order / verify                        |
| `*/api/split/*`           | Groups, invite, join, expenses, balances, settle |
| `*/api/notifications/*`   | Tip delivery + email helpers                     |

Full table: [API_REFERENCE.md](./API_REFERENCE.md).

See also: `FINKOIN_SYSTEM.md` §§10, 13, 14, 30–35.
