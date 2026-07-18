# API reference

All handlers under `app/api/**/route.ts` (19 routes). Auth uses cookie session via `getAuthedUser` / `createSupabaseServerClient` unless noted.

---

## AI

| Method | Path              | Auth                        | Rate limit | Role                                                      |
| ------ | ----------------- | --------------------------- | ---------- | --------------------------------------------------------- |
| POST   | `/api/ai/analyse` | **Cookie session required** | 10/hr/user | Groq + RAG fix-plan; deterministic fallback on AI failure |

## Auth

| Method | Path                 | Auth            | Role                         |
| ------ | -------------------- | --------------- | ---------------------------- |
| POST   | `/api/auth/sign-out` | Session cookies | Clears Supabase auth cookies |

## Feedback & social proof

| Method | Path                | Auth             | Rate limit | Role                                                             |
| ------ | ------------------- | ---------------- | ---------- | ---------------------------------------------------------------- |
| POST   | `/api/feedback`     | Optional session | 10/hr      | In-app feedback → `app_feedback` (+ optional Google Form mirror) |
| GET    | `/api/feedback`     | —                | —          | Admin/list helper (see route)                                    |
| GET    | `/api/testimonials` | No               | —          | Landing testimonials                                             |

## Razorpay (₹99 unlock)

| Method | Path                            | Auth                        | Rate limit | Role                                          |
| ------ | ------------------------------- | --------------------------- | ---------- | --------------------------------------------- |
| GET    | `/api/razorpay/checkout-config` | No                          | —          | Public Key ID only                            |
| POST   | `/api/razorpay/create-order`    | **Cookie session required** | 15/hr/user | Create ₹99 INR order                          |
| POST   | `/api/razorpay/verify-payment`  | **Bearer access token**     | —          | HMAC verify → `users.subscription_tier = pro` |

## FK Split

| Method | Path                              | Auth                    | Rate limit | Role                                                                     |
| ------ | --------------------------------- | ----------------------- | ---------- | ------------------------------------------------------------------------ |
| POST   | `/api/split/groups`               | Yes                     | —          | Create group + creator admin member                                      |
| DELETE | `/api/split/groups?groupId=`      | Yes (creator)           | —          | Soft-delete `is_active=false` (used by UI)                               |
| DELETE | `/api/split/groups/[groupId]`     | Yes (admin)             | —          | Hard-delete cascade (**not used by UI**)                                 |
| POST   | `/api/split/invite`               | Yes + active member     | 30/hr      | Open link (`linkOnly`) or email invite (+ optional Resend)               |
| POST   | `/api/split/join`                 | Yes                     | —          | Accept open or email invite                                              |
| GET    | `/api/split/balances?groupId=`    | Yes + member            | —          | `computeGroupBalances` (not RPC)                                         |
| POST   | `/api/split/expenses`             | Yes + member            | —          | Expense + shares via `computeSplitShares`                                |
| DELETE | `/api/split/expenses/[expenseId]` | Creator or active admin | —          | Delete expense + shares                                                  |
| POST   | `/api/split/settle`               | Yes + active member     | 60/hr      | Insert `split_settlements` (amount-accurate; no share `is_settled` flip) |

Open invites use marker email `__open__@finkoin.invite` (`lib/splitInvite.ts`). Same token stays reusable after join.

## Notifications / tips

| Method   | Path                                | Auth                               | Role                                               |
| -------- | ----------------------------------- | ---------------------------------- | -------------------------------------------------- |
| GET/POST | `/api/notifications/deliver-tip`    | Cron (`CRON_SECRET` / Vercel cron) | RPC `get_next_tip_for_user` → `user_notifications` |
| GET/POST | `/api/notifications/send-daily-tip` | Server / Resend path               | Optional email tip                                 |
| POST     | `/api/notifications/welcome-tip`    | Session / server                   | Welcome tip seed                                   |
| POST     | `/api/notifications/send-test-tip`  | Dev/admin helper                   | Test tip delivery                                  |

Vercel cron (see `vercel.json`): typically `0 3 * * *` → deliver-tip.

---

## Client call sites (Split)

`store/splitStore.ts` → create/invite/join/expenses/balances/settle/delete via the routes above. Group list/detail reads often use Supabase user client (RLS) with ~2 min store TTL.
