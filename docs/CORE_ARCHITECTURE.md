# Finkoin Core Architecture

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
    └─ Supabase DB + RLS (snapshots, gamification, tracker, split tables, notifications)
```

## Data Flow

### Health Check Flow

1. User opens `/analyse` (must be logged in; consent modal)
2. 7-step RHF + Zod form (`analyse-onboarding-form`)
3. Submit → normalize → `financialStore.setFullAnalysis` → `analyseFinances`
4. Optional AI → `POST /api/ai/analyse` (auth + 10/hr) → `buildPriorityPlan` + RAG + Groq
5. Snapshot → `user_analyse_snapshots` when logged in
6. `/analyse/result` free report + paywall
7. Unlock (Razorpay ₹99 / FK / skip env / admin) → `/analyse/fixplan` + PDF

### Auth Flow

1. Middleware: `getUser()` refresh cookies; **homepage skipped**; **no server redirect to login**
2. Client: `ProtectedGate` waits for `hasInitialized`, then redirects to `/login?redirect=`
3. Email / Google OAuth → `/auth/callback` PKCE
4. `initAuth` loads `users` + `gamification`
5. Logout: `POST /api/auth/sign-out` + client clear

### Split Flow

1. Create group → `POST /api/split/groups` (creator = admin)
2. Open invite (`linkOnly`) → marker email `__open__@finkoin.invite` → reusable token URL
3. Email invite → pending member + optional Resend email
4. Join → `POST /api/split/join` (open: any logged-in user; email: must match)
5. Add expense → `computeSplitShares` → `POST /api/split/expenses`
6. Balances → `GET /api/split/balances` → `computeNetBalances` + `simplifyDebts`
7. Settle → `POST /api/split/settle` (amount-accurate)

### Notification Flow

1. Vercel cron `0 3 * * *` → `/api/notifications/deliver-tip` (`CRON_SECRET` / Vercel cron header)
2. RPC `get_next_tip_for_user` → insert `user_notifications`
3. Client: `NotificationBell` + `MorningTipPopup` (IST once/day)
4. Optional email path: `/api/notifications/send-daily-tip` via Resend

### Payment Flow

1. `GET /api/razorpay/checkout-config` → public key
2. Authed `POST /api/razorpay/create-order` → ₹99 order
3. Checkout → `POST /api/razorpay/verify-payment` HMAC → `users.subscription_tier = pro`

### Tracker Safety Pulse

Month transactions → `computeMonthSafetyPulse` → Safe / Tight / Over UI (`MonthSafetyPulse`) with privacy eyes.

## State Management

| Store               | Owns                           |
| ------------------- | ------------------------------ |
| `authStore`         | User, session flags, tier      |
| `financialStore`    | Analyse draft, result, AI plan |
| `splitStore`        | Groups, expenses, net balances |
| `gamificationStore` | FK balance, streaks, badges    |
| `notificationStore` | Inbox + popup state            |
| `portfolioStore`    | Demo portfolio analysis        |

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

## API Architecture

| Route                     | Role                                             |
| ------------------------- | ------------------------------------------------ |
| `POST /api/ai/analyse`    | Groq fix plan                                    |
| `POST /api/auth/sign-out` | Cookie sign-out                                  |
| `POST /api/feedback`      | Feedback (+ optional FK)                         |
| `GET /api/testimonials`   | Landing testimonials                             |
| `*/api/razorpay/*`        | Checkout / order / verify                        |
| `*/api/split/*`           | Groups, invite, join, expenses, balances, settle |
| `*/api/notifications/*`   | Tip delivery + email helpers                     |

See also: `FINKOIN_SYSTEM.md` §§10, 13, 14, 30–35.
