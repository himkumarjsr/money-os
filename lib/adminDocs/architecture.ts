import type { DocSection } from "./types";

export const hldSection: DocSection = {
  id: "hld",
  title: "High-level design (HLD)",
  group: "Architecture",
  summary:
    "The major building blocks, how they talk, and how one request flows end to end.",
  blocks: [
    { kind: "h", text: "Building blocks" },
    {
      kind: "table",
      head: ["Block", "Responsibility", "Lives in"],
      rows: [
        [
          "Presentation",
          "Pages, navigation, forms, charts, theming (light / dark / premium)",
          "`app/**/page.tsx`, `components/**`",
        ],
        [
          "Client state",
          "Session, analysis draft + result, Split, gamification, notifications, obligations",
          "`store/*.ts` (Zustand, persisted per user)",
        ],
        [
          "Domain engines",
          "All money maths: score, buckets, priority plan, goals, net worth, tracker pulse, split shares/balances, tax",
          "`lib/*.ts` (pure, unit-tested)",
        ],
        [
          "Edge middleware",
          "Refresh the Supabase session cookie on navigation (skips `/`)",
          "`middleware.ts`",
        ],
        [
          "API layer",
          "Secrets, cross-user writes, payments, AI, cron jobs, PDF, account deletion, admin console",
          "`app/api/**/route.ts`",
        ],
        [
          "Database",
          "Tables, RLS, triggers (points, FK, privileged-column guards), RPCs, views",
          "Supabase Postgres (`supabase/migrations`, `supabase/manual`)",
        ],
        [
          "Async jobs",
          "Daily tip delivery, bill / EMI / planned-investment reminders, monthly leaderboard prizes",
          "Vercel Cron (03:00 UTC) → `/api/notifications/deliver-tip`, `/api/obligations/reminders`; prizes are paid by `pay_monthly_prizes`, which `record_daily_visit` runs on the first visit after a month ends",
        ],
        [
          "Third parties",
          "Groq (AI), Razorpay (payments), Resend (email), Web Push / Expo (device notifications), GA4 / Clarity (analytics)",
          "Called only from server routes (analytics from the client, after consent)",
        ],
      ],
    },
    {
      kind: "diagram",
      title: "Layered view",
      code: `┌──────────────────────────────────────────────────────────────────┐
│ UI: app/ pages · components/ · ProtectedGate · GlobalNavbar      │
├──────────────────────────────────────────────────────────────────┤
│ State: authStore · financialStore · splitStore · gamification…   │
├──────────────────────────────────────────────────────────────────┤
│ Engines (pure): financialEngine · priorityEngine · splitShares · │
│ splitBalances · trackerSafetyPulse · netWorth · tax helpers      │
├───────────────┬──────────────────────────────────────────────────┤
│ supabase-js   │ fetch / apiFetch → /api/* (cookie or Bearer)     │
│ (RLS reads +  ├──────────────────────────────────────────────────┤
│  own writes)  │ Route handlers: apiGuard (auth + rate limit),    │
│               │ service-role client, Groq/Razorpay/Resend/Push   │
├───────────────┴──────────────────────────────────────────────────┤
│ Supabase: Auth · Postgres (RLS, triggers, RPC) · Storage · RT    │
└──────────────────────────────────────────────────────────────────┘`,
    },
    { kind: "h", text: "End-to-end example: generating a fix plan" },
    {
      kind: "diagram",
      title: "Sequence",
      code: `User        Browser (Next.js)          /api/ai/analyse          Supabase           Groq
 │ submit form │                              │                      │                 │
 │────────────►│ analyseFinances(profile)     │                      │                 │
 │             │ (score, buckets, checklist)  │                      │                 │
 │             │── upsert snapshot ──────────────────────────────────►│ (RLS own row)   │
 │ open plan   │ cache hit? (profile hash) ── yes → render cached plan                  │
 │             │── POST {profile, analysis} ─►│ getAuthedUser()      │                 │
 │             │                              │ rateLimit(40/hr)     │                 │
 │             │                              │ buildPriorityPlan()  │                 │
 │             │                              │── search_by_keywords ►│                 │
 │             │                              │◄─ knowledge chunks ───│                 │
 │             │                              │── chat.completions ─────────────────────►│
 │             │                              │◄─ JSON explanations ─────────────────────│
 │             │◄── {priorityPlan, explanations, knowledgeUsed} (or isFallback: true)    │
 │◄── plan ────│ cache + save AI plan on snapshot                                        │`,
    },
    { kind: "h", text: "Key design decisions" },
    {
      kind: "list",
      items: [
        "Code computes, AI explains. The LLM never produces a number that isn't in the priority plan; if it fails, the user still gets a complete plan built from the engine.",
        "RLS-first data access. Most screens read and write their own rows directly, so there is no API to keep in sync for simple CRUD and the native app reuses the same access path.",
        "Server routes only where trust is needed: secrets (Groq, Razorpay, Resend, VAPID), other people's rows (Split), money and rewards, and anything a user could abuse by calling directly.",
        "Database-enforced rewards. Points and FK are awarded by triggers and SECURITY DEFINER functions with idempotency keys, so replaying a request can't double-pay.",
        "Client-side route guard, server-side data guard. `ProtectedGate` handles UX; RLS and route checks are the real boundary. The admin console is the exception: its page is rendered on the server only for admins.",
        "One backend for web, PWA and native. The server client accepts cookies or a Bearer token.",
      ],
    },
  ],
};

export const lldSection: DocSection = {
  id: "lld",
  title: "Low-level design (LLD)",
  group: "Architecture",
  summary:
    "Modules, stores, request pipeline, every API route at a glance, database functions and caching.",
  blocks: [
    { kind: "h", text: "Request pipeline for an API route" },
    {
      kind: "list",
      ordered: true,
      items: [
        "`middleware.ts` runs `supabase.auth.getUser()` with the request cookies and writes refreshed cookies onto the response (skipped for `/` and static assets).",
        "The handler calls `getAuthedUser()` (`lib/apiGuard.ts`) which uses `createSupabaseServerClient()` (`lib/supabaseServer.ts`): Bearer token if present, otherwise cookies.",
        "`rateLimit(key, limit, windowMs, cost)` checks a per-instance fixed window; over the limit returns 429 with `Retry-After`.",
        "Input is validated (Zod in some routes, manual checks in others) → 400 with `{ error }`.",
        "Reads/writes use either the caller's client (RLS applies) or `getSupabaseAdmin()` (service role, server only) when the route must touch other users' rows.",
        "Response is JSON (`NextResponse.json`) except the PDF route, which streams `application/pdf`.",
      ],
    },
    { kind: "h", text: "Client stores (`store/`)" },
    {
      kind: "table",
      head: ["Store", "State", "Persistence", "Notes"],
      rows: [
        [
          "`authStore`",
          "user, userId, isLoggedIn, subscriptionTier, hasInitialized",
          "`finkoin-auth`",
          "`initAuth()` validates the session then loads `users` + `gamification`; one `onAuthStateChange` listener; `logout()` clears server cookies and local caches.",
        ],
        [
          "`financialStore`",
          "analyse draft, lastSubmission, result, AI plan",
          "`finkoin-financial:<userId>`",
          "Per-user key so accounts never see each other's data on a shared device.",
        ],
        [
          "`splitStore`",
          "groups, members, expenses, net balances, edges",
          "memory + TTL ~2 min",
          "Writes call `/api/split/*`; reads use RLS client.",
        ],
        [
          "`gamificationStore`",
          "fkBalance, streak, badges",
          "`finkoin-gamification`",
          "Synced from `gamification`; daily visit via `/api/gamification/daily-login`.",
        ],
        [
          "`notificationStore`",
          "inbox, unread count, popup state",
          "memory",
          "Reads `user_notifications`; realtime in `NotificationBell`.",
        ],
        [
          "`obligationStore`",
          "bills/EMIs, monthly checklist",
          "memory",
          "`financial_obligations` + `obligation_checklist`, RPC `generate_monthly_checklist`.",
        ],
        [
          "`portfolioStore`",
          "demo portfolio analysis",
          "memory",
          "Sample data only.",
        ],
      ],
    },
    { kind: "h", text: "Engine modules (`lib/`)" },
    {
      kind: "table",
      head: ["Module", "Input → output"],
      rows: [
        [
          "`financialEngine.analyseFinances`",
          "FinancialProfile → AnalysisResult (overallScore, issues, bucket statuses, security checklist, net worth)",
        ],
        [
          "`universal-buckets`",
          "profile → bucket caps and actuals (needs, wants, security, loans, investment)",
        ],
        [
          "`priorityEngine.buildPriorityPlan`",
          "profile + analysis → PriorityPlan (priorities, debts ranking, goals, monthly plan, score projection)",
        ],
        [
          "`ai/goalAdvisor`",
          "funded goals → per-goal AI advice (parallel model calls)",
        ],
        [
          "`rag/retriever`",
          "profile + analysis → keywords → `search_by_keywords` → KnowledgeChunk[]",
        ],
        [
          "`generatePDF` + `fixPlanPdfData`",
          "plan + explanations → jsPDF document",
        ],
        [
          "`netWorth` / `netWorthBreakup`",
          "profile → assets, liabilities, net worth and per-item breakup",
        ],
        [
          "`trackerSafetyPulse`",
          "month transactions + income → Safe / Tight / Over with bucket health",
        ],
        [
          "`trackerCreditCards` / `trackerCardLedger`",
          "card spends and refunds → statement bills and reminders",
        ],
        [
          "`obligationReminders`",
          "obligation + today → should remind? copy, due date",
        ],
        [
          "`plannedInvestments`",
          "fix-plan consent → planned rows and reminder copy",
        ],
        [
          "`splitShares.computeSplitShares`",
          "amount + members + split type → share rows (equal / exact / percentage / shares)",
        ],
        [
          "`splitBalances`",
          "members + expenses + settlements → net per person and simplified edges",
        ],
        [
          "`taxRegimeComparisonFY2026` / `taxCalculatorHelpers`",
          "income + deductions → old vs new regime tax",
        ],
        [
          "`subscriptionBypass`",
          "users row + email → hasProAccess / canBypassProPaywall",
        ],
        [
          "`encryption`",
          "AES-256-GCM for the optional encrypted financial vault",
        ],
      ],
    },
    { kind: "h", text: "API catalogue" },
    {
      kind: "table",
      head: ["Method", "Path", "Auth", "Limit", "Purpose"],
      rows: [
        [
          "POST",
          "/api/ai/analyse",
          "Session",
          "40 model calls/hr",
          "Priority plan + AI explanations",
        ],
        ["POST", "/api/analyse/pdf", "Session", "20/hr", "Fix Plan PDF"],
        [
          "GET/POST",
          "/api/financial-data",
          "Session",
          "60 / 30 per hr",
          "Encrypted vault read / write",
        ],
        ["POST", "/api/auth/sign-out", "Cookies", "-", "Clear server cookies"],
        [
          "POST",
          "/api/account/delete",
          "Session or Bearer",
          "3/min",
          "Delete account and owned data",
        ],
        [
          "GET",
          "/api/razorpay/checkout-config",
          "Public",
          "-",
          "Razorpay key id",
        ],
        ["POST", "/api/razorpay/create-order", "Session", "15/hr", "₹99 order"],
        [
          "POST",
          "/api/razorpay/verify-payment",
          "Bearer",
          "-",
          "Verify and upgrade to Pro",
        ],
        ["POST", "/api/split/groups", "Session", "-", "Create group"],
        [
          "DELETE",
          "/api/split/groups?groupId=",
          "Creator",
          "-",
          "Soft-close group",
        ],
        [
          "DELETE",
          "/api/split/groups/[groupId]",
          "Group admin",
          "-",
          "Hard delete (unused by UI)",
        ],
        [
          "POST",
          "/api/split/invite",
          "Active member",
          "30/hr",
          "Open link or email invite",
        ],
        ["POST", "/api/split/join", "Session", "-", "Join by token or code"],
        [
          "DELETE",
          "/api/split/members?groupId=&email=",
          "Self or admin",
          "-",
          "Leave / remove",
        ],
        [
          "GET",
          "/api/split/balances?groupId=",
          "Member",
          "-",
          "Net balances and edges",
        ],
        ["POST", "/api/split/expenses", "Member", "-", "Add expense"],
        [
          "PUT/DELETE",
          "/api/split/expenses/[expenseId]",
          "Creator",
          "-",
          "Edit / soft-delete expense",
        ],
        ["POST", "/api/split/settle", "Member", "60/hr", "Record a settlement"],
        [
          "POST",
          "/api/gamification/daily-login",
          "Session",
          "-",
          "Streak + daily points",
        ],
        ["POST", "/api/referrals/apply", "Session", "-", "Link referral code"],
        [
          "POST",
          "/api/feedback",
          "Optional session",
          "10/hr",
          "Submit feedback (+50 FK once)",
        ],
        [
          "GET",
          "/api/feedback",
          "Public",
          "-",
          "Approved featured testimonials",
        ],
        ["GET", "/api/testimonials", "Public", "-", "Landing testimonials"],
        [
          "POST/DELETE",
          "/api/notifications/push-subscribe",
          "Session",
          "-",
          "Web Push subscription",
        ],
        [
          "GET/POST",
          "/api/notifications/deliver-tip",
          "CRON_SECRET",
          "-",
          "Daily tip + push",
        ],
        [
          "GET/POST",
          "/api/notifications/send-daily-tip",
          "CRON_SECRET",
          "-",
          "Daily tip email",
        ],
        [
          "POST",
          "/api/notifications/welcome-tip",
          "Session",
          "-",
          "Welcome tip email",
        ],
        [
          "POST",
          "/api/notifications/send-test-tip",
          "CRON_SECRET",
          "-",
          "Test tip email",
        ],
        [
          "GET/POST",
          "/api/obligations/reminders",
          "CRON_SECRET",
          "-",
          "Bill / EMI / planned-investment reminders",
        ],
        [
          "GET",
          "/.well-known/assetlinks.json, /.well-known/apple-app-site-association",
          "Public",
          "-",
          "Native deep links",
        ],
        [
          "GET/POST/DELETE",
          "/api/admin/admins",
          "Console admin",
          "30/hr writes",
          "List / invite / remove admins",
        ],
      ],
    },
    { kind: "h", text: "Database functions and triggers" },
    {
      kind: "table",
      head: ["Object", "Kind", "What it does"],
      rows: [
        [
          "`handle_new_user()`",
          "trigger on auth.users",
          "Creates `users`, `gamification`, `user_stats` rows and records the welcome bonus (049)",
        ],
        [
          "`protect_privileged_user_columns()`",
          "trigger on users",
          "Blocks anon/authenticated from changing `subscription_tier`, `is_admin`, FK fields (043/045)",
        ],
        [
          "`award_fk(user, amount, reason, ref)`",
          "function",
          "Idempotent FK credit with ledger row in `fk_transactions`",
        ],
        [
          "`private.award_points(...)`",
          "function",
          "Idempotent points with optional daily cap per reason",
        ],
        [
          "`points_on_expense / split / portfolio / analyse`",
          "triggers",
          "Award points when the apps write the underlying rows",
        ],
        [
          "`record_daily_visit(user, today)`",
          "function",
          "Login streak, daily points, 7/30-day streak rewards",
        ],
        [
          "`check_referral_activation(user)`",
          "function",
          "Pays referrer and referee once the new user adds a first expense",
        ],
        [
          "`private.pay_monthly_prizes(today)`",
          "function",
          "Top 3 of the previous month get 500 / 250 / 100 FK (run from `record_daily_visit`, once per month)",
        ],
        [
          "`leaderboard_view`, `leaderboard_all_view`",
          "invoker views over private functions",
          "Monthly and all-time points ranking",
        ],
        [
          "`generate_monthly_checklist(user, month)`",
          "function (invoker)",
          "Creates checklist rows for active obligations",
        ],
        [
          "`get_split_balances(group)`",
          "function (invoker)",
          "Server-side balances for a member",
        ],
        ["`get_next_tip_for_user`", "function", "Picks the next unseen tip"],
        [
          "`search_by_keywords(keywords, n)`",
          "function",
          "RAG retrieval over `finkoin_knowledge`",
        ],
        [
          "`admin_fk_summary()`",
          "invoker wrapper",
          "FK in circulation (users.is_admin only)",
        ],
        [
          "`admin_console_is_admin / list / grant / revoke`",
          "invoker wrappers over private functions",
          "Admin console access (053)",
        ],
      ],
    },
    { kind: "h", text: "Caching" },
    {
      kind: "table",
      head: ["Data", "Where", "Lifetime"],
      rows: [
        [
          "Session",
          "Supabase cookies + `finkoin-auth`",
          "JWT ~1h, refresh-token rotation",
        ],
        [
          "Analyse draft and result",
          "`finkoin-financial:<userId>` + `user_analyse_snapshots`",
          "Until reset; snapshot restores on a new device",
        ],
        [
          "AI plan",
          "`finkoin_ai_cache` (profile hash) + snapshot",
          "~30 days or until the profile changes",
        ],
        [
          "Split lists",
          "`splitStore`",
          "~2 min TTL, refresh on focus, realtime",
        ],
        ["Leaderboard / testimonials", "localStorage", "5 min / 24 h"],
        ["Static assets", "CDN + service worker", "Immutable, 1 year"],
      ],
    },
  ],
};

export const securitySection: DocSection = {
  id: "security",
  title: "Security model",
  group: "Architecture",
  summary:
    "Trust boundaries, what each role can do, and the controls behind them.",
  blocks: [
    {
      kind: "table",
      head: ["Actor", "Can", "Cannot"],
      rows: [
        [
          "Visitor (anon)",
          "Public pages, calculators, `checkout-config`, testimonials, anonymous feedback",
          "Any user table (RLS), any authed route",
        ],
        [
          "Signed-in user",
          "Own rows via RLS; authed routes within rate limits",
          "Other users' rows; set own tier/admin/FK; call cron or admin routes",
        ],
        [
          "Split member",
          "Read group rows; add/edit own expenses; settle; invite",
          "Edit others' expenses; delete group unless creator/admin",
        ],
        [
          "Console admin",
          "This console; list/invite/remove console admins",
          "Remove own access (always ≥1 admin)",
        ],
        [
          "Server (service role)",
          "Everything; used only inside route handlers",
          "Never shipped to the client (`check:secrets`)",
        ],
        [
          "Vercel Cron",
          "Tip and reminder jobs",
          "Anything else (`CRON_SECRET` bearer only; `x-vercel-cron` is not trusted)",
        ],
      ],
    },
    {
      kind: "list",
      items: [
        "Row Level Security on every user table, with `(select auth.uid())` for cached evaluation (047).",
        "Privileged columns guarded by trigger; rewards only through definer functions with idempotency keys.",
        "Security-definer helpers moved to the `private` schema and exposed through invoker wrappers so Supabase's advisor stays clean (048, 051, 053).",
        "Razorpay: HMAC signature check with `timingSafeEqual`, then the order must belong to the caller (`notes.user_id`), and the payment id is unique.",
        "Account deletion deletes the auth user first, so a failure never leaves a half-deleted account.",
        "Optional AES-256-GCM vault for submitted financial data when `ENCRYPTION_KEY` is set.",
        "CSP and security headers from `next.config.mjs`; analytics only after consent.",
        "RLS review fixes (056): members can only edit their own split membership row to leave, settlements can't be edited from the client, clients may change only name, phone, avatar and consent fields on `users`, and `user_stats` is read-only for its owner.",
        "`analyse_logs` (057) is insert-only for users; only console admins read it, through `admin_console_analyse_logs()`.",
        "Admin console: page rendered on the server only for verified admin emails, `noindex`, disallowed in robots, API returns 404 to non-admins, refused inside the installed PWA.",
      ],
    },
  ],
};
