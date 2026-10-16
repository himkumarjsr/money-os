import type { DocSection } from "./types";

export const overviewSection: DocSection = {
  id: "overview",
  title: "Overview",
  group: "Start here",
  summary:
    "What Finkoin is, who it serves, the surfaces it ships on and how this document is organised.",
  blocks: [
    {
      kind: "p",
      text: "Finkoin is a personal-finance app for Indian households. A user enters their money once (income, loans, expenses, insurance, assets, goals), deterministic engines in code score their financial health and build a prioritised fix plan, and an LLM (Groq, grounded by a small RAG knowledge base) explains that plan in plain language. Around that core sit an expense tracker, a bill-splitting product (FK Split), a policy vault, 65+ calculators, learning content and a rewards loop (FK coins and leaderboard points).",
    },
    {
      kind: "table",
      head: ["Surface", "Tech", "Where", "Notes"],
      rows: [
        [
          "Website",
          "Next.js 15 App Router",
          "finkoin.com",
          "SEO pages, calculators, the full app when signed in. This admin console lives only here.",
        ],
        [
          "PWA",
          "Same Next.js build + Workbox service worker",
          "Installed from the site",
          "Standalone display mode, offline fallback, Web Push. The admin console refuses to render here.",
        ],
        [
          "Native app",
          "Expo / React Native (`mobile/`)",
          "Play Store / App Store",
          "Talks to the same Supabase project and the same `/api/*` routes with a Bearer token. Has no admin screens.",
        ],
        [
          "Backend",
          "Supabase (Postgres + Auth + Storage + Realtime) and Next.js route handlers on Vercel",
          "—",
          "Row Level Security on every user table; privileged writes only in server routes or SECURITY DEFINER functions.",
        ],
      ],
    },
    { kind: "h", text: "Product pillars" },
    {
      kind: "list",
      items: [
        "Health check (`/analyse`): a 7-step form, a 0–100 score, bucket caps and a security checklist.",
        "Fix plan (`/analyse/fixplan`): priority engine + AI explanations + per-goal SIP plans + PDF export.",
        "Tracker (`/tracker`): monthly spend by bucket, Month Safety Pulse, credit-card bills, bills & EMIs checklist, planned investments.",
        "FK Split (`/split`): groups, open or email invites, four split types, simplified debts, settle-up.",
        "Profile & net worth (`/profile`, `/investments`): editable assets and liabilities that flow back into the analysis.",
        "Policy vault (`/policies`): insurance policies with renewal reminders, imported from the analysis.",
        "Calculators & learning (`/calculators`, `/learn`, `/blog`): public, SEO-driven acquisition.",
        "Engagement: daily tips (in-app + Web Push + Expo push), FK coins, points, monthly leaderboard, referrals.",
        "Monetisation: ₹99 Pro unlock through Razorpay; FK works as a discount (10 FK = ₹1).",
      ],
    },
    { kind: "h", text: "How to read this document" },
    {
      kind: "list",
      ordered: true,
      items: [
        "Tech stack and RADIO: why each technology was chosen and the system design in the RADIO format (Requirements, Architecture, Data model, Interface, Optimisations).",
        "Business plan: mission and vision, why users need it, the phase-wise roadmap, competitors, growth and revenue.",
        "HLD and LLD: the big boxes and how a request moves through them, then module-level detail.",
        "Before login and After login: what a visitor and a signed-in user can do, and the exact auth flow.",
        "Features: one page per feature with its routes, modules, tables, every API with payload and response, and the business rules.",
        "Admin access: who can open this console and how to add or remove admins.",
      ],
    },
    {
      kind: "callout",
      tone: "info",
      text: "Everything here is written from the code in this repository (web app, `mobile/`, `supabase/migrations`). Where production has tables that were created by hand in the Supabase SQL editor (Split, tips), that is called out.",
    },
  ],
};

export const techStackSection: DocSection = {
  id: "tech-stack",
  title: "Tech stack and why",
  group: "Start here",
  summary:
    "Every major library and service, what it does in Finkoin and why it was picked over the alternatives.",
  blocks: [
    { kind: "h", text: "Frontend (web + PWA)" },
    {
      kind: "table",
      head: ["Technology", "Version", "Used for", "Why this one"],
      rows: [
        [
          "Next.js App Router",
          "^15.5",
          "Pages, layouts, route handlers (`app/api/**`), metadata/SEO, server components",
          "One codebase serves SEO marketing pages (server-rendered, fast LCP), the signed-in app and the backend API. Deploys to Vercel with zero infra.",
        ],
        [
          "React",
          "^19.3",
          "UI",
          "Ecosystem, shared mental model with React Native for the mobile app.",
        ],
        [
          "TypeScript",
          "^5",
          "Everything",
          "Money maths and DB payloads are easy to get subtly wrong; types catch shape drift between engine, store and API.",
        ],
        [
          "Tailwind CSS",
          "^3.4",
          "Styling",
          "Fast iteration, no CSS-in-JS runtime cost. Dark and Premium themes are generated as class overrides (`npm run theme:css`).",
        ],
        [
          "Zustand (+ persist)",
          "^5",
          "Client state: auth, financial draft, split, gamification, notifications, obligations",
          "Tiny, no provider tree, easy per-user persistence to localStorage so the analysis survives reloads and offline.",
        ],
        [
          "React Hook Form + Zod",
          "^7 / ^3",
          "The 7-step analyse form, settings forms; request validation in some routes",
          "Uncontrolled inputs keep a 100-field form fast; one Zod schema gives both validation and the TypeScript type.",
        ],
        [
          "Framer Motion",
          "^11",
          "Transitions, sheets, carousels",
          "Declarative animation; loaded lazily (`MotionLazyProvider`) to keep first paint small.",
        ],
        [
          "Recharts",
          "^2.13",
          "Spend trends, allocation pies, net-worth trajectory",
          "Composable SVG charts that work in React without canvas setup.",
        ],
        [
          "jsPDF",
          "^4.2",
          "Fix Plan PDF (server route `/api/analyse/pdf`)",
          "Pure JS, runs in a Node route with embedded Noto Sans fonts for ₹ glyphs; same output for web and native.",
        ],
        [
          "xlsx",
          "^0.18",
          "Excel amortisation schedules in the EMI, home-loan and car-loan calculators",
          "Client-side export without a server round trip.",
        ],
        [
          "@ducanh2912/next-pwa (Workbox)",
          "^10.2",
          "Service worker, runtime caching, offline page, push handlers (`worker/index.js`)",
          "Maintained next-pwa fork that supports the App Router.",
        ],
      ],
    },
    { kind: "h", text: "Backend and data" },
    {
      kind: "table",
      head: ["Technology", "Used for", "Why this one"],
      rows: [
        [
          "Supabase Postgres",
          "All user data, gamification ledgers, Split, notifications, RAG knowledge",
          "Relational data with strong constraints (money!), SQL functions/triggers for rules that must not be bypassed, and Row Level Security so the browser can query its own rows directly without a bespoke API for every read.",
        ],
        [
          "Supabase Auth",
          "Email + password, Google OAuth (web), Google/Apple (native), password recovery",
          "Issues JWTs that Postgres RLS understands (`auth.uid()`), PKCE flows, cookie sessions via `@supabase/ssr`.",
        ],
        [
          "@supabase/ssr",
          "Cookie-backed browser client, middleware session refresh, server client in route handlers",
          "Same session readable by the browser, middleware and server components.",
        ],
        [
          "Supabase Storage",
          "Avatars bucket",
          "Signed URLs and RLS-style policies alongside the DB.",
        ],
        [
          "Supabase Realtime",
          "Live Split groups/expenses, the notification bell, FK balance and leaderboard (`lib/realtimeChannel.ts`)",
          "Live updates without running a socket server.",
        ],
        [
          "Next.js route handlers on Vercel",
          "Anything that needs a secret or must not be trusted to the client: AI, payments, Split writes, cron, account deletion, PDF",
          "Serverless, scales to zero, colocated with the frontend; Vercel Cron triggers the daily jobs.",
        ],
        [
          "Groq (`groq-sdk`)",
          "Fix-plan explanations and per-goal advice (`/api/ai/analyse`)",
          "Very low latency and cost for an open-weights model (`openai/gpt-oss-20b` by default, `GROQ_MODEL` overrides). Numbers come from code; the model only explains them.",
        ],
        [
          "RAG (`finkoin_knowledge` + `search_by_keywords` RPC)",
          "Grounds the AI in current Indian rates and rules",
          "Keyword retrieval in Postgres is enough for a few hundred curated chunks and needs no vector infra; rows update without a deploy.",
        ],
        [
          "Razorpay",
          "₹99 Pro unlock",
          "Standard Indian payment rails (UPI, cards, netbanking) with server-side order + HMAC verification.",
        ],
        [
          "Resend",
          "Split invite emails, daily tip emails",
          "Simple transactional email API.",
        ],
        [
          "web-push (VAPID)",
          "Device notifications for the web/PWA",
          "Standards-based push to browsers without a third-party push vendor.",
        ],
        [
          "Expo push",
          "Device notifications for the native app (`lib/expoPush.ts`)",
          "One API for Android and iOS tokens.",
        ],
        [
          "GA4 + Microsoft Clarity",
          "Analytics, behind consent (`AnalyticsConsent`)",
          "Free, widely understood; loaded only after consent.",
        ],
      ],
    },
    { kind: "h", text: "Native app" },
    {
      kind: "table",
      head: ["Technology", "Why"],
      rows: [
        [
          "Expo SDK 57 + expo-router",
          "File-based routing that mirrors the web `app/` tree, EAS builds and OTA updates.",
        ],
        [
          "React Native 0.86",
          "Native performance and store distribution; shares engines in spirit with the web (`lib/` logic is ported/parity-tested).",
        ],
        [
          "Same Supabase project + same `/api/*`",
          "One backend. The native app sends `Authorization: Bearer <access_token>`; `createSupabaseServerClient` accepts it alongside cookies.",
        ],
      ],
    },
    { kind: "h", text: "Quality and tooling" },
    {
      kind: "table",
      head: ["Tool", "Purpose"],
      rows: [
        [
          "Vitest + Testing Library",
          "Unit tests for the pure engines in `lib/` (finance, priority, split, tracker) with a coverage gate.",
        ],
        ["Playwright", "E2E on Chromium and mobile Chrome (`tests/`)."],
        [
          "ESLint (max-warnings 0) + Prettier + Husky/lint-staged",
          "Every commit is linted and formatted.",
        ],
        [
          "`npm run check:secrets`",
          "Fails if a server-only secret is referenced from client code.",
        ],
      ],
    },
  ],
};

export const radioSection: DocSection = {
  id: "radio",
  title: "System design (RADIO)",
  group: "Start here",
  summary:
    "Requirements, Architecture, Data model, Interface definition and Optimisations: the whole system in the RADIO framework.",
  blocks: [
    { kind: "h", text: "R · Requirements" },
    { kind: "p", text: "Functional requirements" },
    {
      kind: "list",
      items: [
        "A visitor can use every calculator and read every guide without an account.",
        "A user can sign up / sign in with email + password or Google (web), and Google or Apple (native).",
        "A signed-in user can complete a health check, see a score and a free report, and unlock a fix plan (₹99 Pro, or a paywall-bypass account).",
        "A user can track monthly spend, bills, EMIs, credit cards and planned investments, and get reminders before due dates.",
        "A user can create Split groups, invite by link or email, add expenses (equal / exact / percentage / shares), see who owes whom and settle up.",
        "A user can keep a policy vault and an editable net-worth breakup that feeds back into the analysis.",
        "A user gets a daily money tip (in-app, Web Push or Expo push), earns FK and points, and can refer friends.",
        "A user can export a PDF fix plan and delete their account in-app (Play / App Store requirement).",
        "Admins (this console) can read the system documentation and invite or remove other admins.",
      ],
    },
    { kind: "p", text: "Non-functional requirements" },
    {
      kind: "table",
      head: ["Concern", "Target / rule", "How it is met"],
      rows: [
        [
          "Privacy",
          "Financial data visible only to its owner",
          "RLS `auth.uid() = user_id` on every user table; service role only in server routes; optional AES-GCM vault (`/api/financial-data`).",
        ],
        [
          "Correctness",
          "Numbers are never invented by the LLM",
          "All maths in deterministic engines with unit tests; the prompt forbids new numbers; a code-built fallback if the model fails.",
        ],
        [
          "Integrity",
          "Users can't grant themselves Pro, FK or admin",
          "Triggers block `subscription_tier`, `is_admin`, `fk_balance` changes from anon/authenticated (043, 045); FK and points only via SECURITY DEFINER functions; console admins in a private table (053).",
        ],
        [
          "Performance",
          "Fast first paint on landing / calculators",
          "Server-rendered marketing pages; middleware skips Supabase on `/`; lazy calculators and motion; static assets immutable-cached.",
        ],
        [
          "Availability",
          "App usable on flaky mobile networks",
          "PWA cache + offline page, persisted Zustand stores, AI fallback plan, store TTLs and retries.",
        ],
        [
          "Cost",
          "Keep per-user AI and email spend bounded",
          "Per-user rate limits (`lib/apiGuard.ts`), AI plan cache by profile hash (~30 days).",
        ],
        [
          "Compliance",
          "Store policies, Indian payments",
          "In-app account deletion; Razorpay HMAC + order-owner check; consent for tracker and analytics.",
        ],
      ],
    },
    { kind: "h", text: "A · Architecture" },
    {
      kind: "diagram",
      title: "Component view",
      code: `            ┌──────────────────────────┐        ┌──────────────────────────┐
            │  Web / PWA (Next.js)     │        │  Native app (Expo)       │
            │  React + Zustand stores  │        │  React Native + stores   │
            └──────┬─────────┬─────────┘        └──────┬─────────┬─────────┘
       cookies     │         │ supabase-js (RLS)      Bearer │    │ supabase-js (RLS)
                   ▼         │                               ▼    │
      ┌────────────────────────────────┐                          │
      │ Vercel: Next.js route handlers │◄─────────────────────────┘
      │  /api/ai  /api/split  /api/... │   (same routes, Bearer token)
      │  middleware: refresh session   │
      └──┬──────────┬──────────┬───────┘
         │service   │          │
         │role      ▼          ▼
         │     ┌────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐
         │     │  Groq  │ │ Razorpay │ │ Resend │ │ Web Push │
         │     └────────┘ └──────────┘ └────────┘ │ / Expo   │
         ▼                                        └──────────┘
   ┌─────────────────────────────────────────────────────────┐
   │ Supabase: Postgres (RLS, triggers, RPCs) · Auth ·       │
   │ Storage (avatars) · Realtime (Split)                    │
   └─────────────────────────────────────────────────────────┘
   Vercel Cron 03:00 UTC → /api/notifications/deliver-tip, /api/obligations/reminders`,
    },
    {
      kind: "list",
      items: [
        "Reads of a user's own data go straight from the client to Supabase under RLS: no API hop, works the same on web and native.",
        "Writes that need a secret, touch other users' rows, or enforce business rules (Split, payments, rewards, AI, account deletion) go through `/api/*` route handlers that use the service role.",
        "Rules that must hold whatever the client does live in Postgres (triggers for points/FK, SECURITY DEFINER functions for referrals, leaderboard, admin console).",
        "Pure engines in `lib/` (financialEngine, priorityEngine, splitBalances, trackerSafetyPulse, …) run in the browser and on the server with the same results.",
      ],
    },
    { kind: "h", text: "D · Data model" },
    {
      kind: "table",
      head: ["Domain", "Tables", "Owner / RLS"],
      rows: [
        [
          "Identity",
          "`auth.users`, `users` (profile, tier, referral code, avatar)",
          "Own row; tier/admin/FK columns server-only",
        ],
        [
          "Analysis",
          "`user_analyse_snapshots` (profile + result + AI plan JSON), `user_analysis`, `user_financial_data` (encrypted)",
          "Own rows",
        ],
        [
          "Tracker",
          "`expense_transactions`, `tracker_consent`, `user_credit_cards`, `financial_obligations`, `obligation_checklist`, `user_planned_investments`",
          "Own rows",
        ],
        [
          "Policies",
          "`user_policies`, `user_policy_import_dismissals`",
          "Own rows",
        ],
        [
          "Split",
          "`split_groups`, `split_group_members`, `split_expenses`, `split_expense_shares`, `split_invitations`, `split_settlements`",
          "Members read; writes via API (service role)",
        ],
        [
          "Rewards",
          "`gamification` (fk_balance, streak), `fk_transactions`, `points_transactions`, `referrals`, views `leaderboard_view` / `leaderboard_all_view`",
          "Own reads; writes only by DB functions",
        ],
        [
          "Notifications",
          "`notification_preferences`, `finance_tips`, `user_notifications`, `user_tip_history`, `push_subscriptions`, `expo_push_tokens`",
          "Own rows; delivery by cron (service role)",
        ],
        [
          "Money",
          "`payments` (Razorpay proof of purchase)",
          "Own reads; server writes",
        ],
        [
          "Feedback & RAG",
          "`feedback`, `app_feedback`, `finkoin_knowledge`",
          "Server writes / public read via API",
        ],
        [
          "Admin",
          "`private.console_admins`",
          "Not exposed over REST; only via `admin_console_*` functions",
        ],
      ],
    },
    { kind: "h", text: "I · Interface definition" },
    {
      kind: "list",
      items: [
        "REST-ish JSON route handlers under `/api/*` (full list with payloads under Features → each feature, and in the LLD).",
        "Supabase PostgREST for own-row CRUD under RLS (`supabase.from(table)`), and RPCs (`generate_monthly_checklist`, `get_split_balances`, `admin_fk_summary`, `admin_console_*`).",
        "Auth: cookies (web) or `Authorization: Bearer <supabase access token>` (native, and `apiFetch` on web as a fallback).",
        "Cron: `Authorization: Bearer $CRON_SECRET` from Vercel Cron.",
        'Errors are `{ "error": string }` with 400 (bad input), 401 (no session), 402 (needs Pro), 403 (not allowed), 404, 409 (conflict), 429 (rate limited, `Retry-After`), 500/502/503.',
      ],
    },
    { kind: "h", text: "O · Optimisations and trade-offs" },
    {
      kind: "table",
      head: ["Area", "Optimisation", "Trade-off"],
      rows: [
        [
          "Landing LCP",
          "Middleware returns early for `/`; hero/server components; lazy calculators",
          "Auth cookie refresh happens on the next navigation instead",
        ],
        [
          "Auth UX",
          "Client-side `ProtectedGate` trusts the persisted session and verifies in the background",
          "Pages are guarded on the client; sensitive data is still protected by RLS/API checks",
        ],
        [
          "AI cost",
          "Profile-hash cache (localStorage + snapshot), per-user model-call budget (40/hr), deterministic fallback",
          "A changed profile always costs a new call",
        ],
        [
          "Rate limiting",
          "In-memory fixed window per warm instance",
          "Not global across instances; swap for Redis if abuse appears",
        ],
        [
          "Split reads",
          "Store TTL (~2 min) + Realtime + refresh on focus",
          "Brief staleness between devices",
        ],
        ["DB policies", "`(select auth.uid())` caching, FK indexes (047)", "—"],
        [
          "Offline",
          "Workbox runtime caching + persisted stores + offline route",
          "Writes made offline are not queued; the user retries",
        ],
        [
          "Security",
          "Privileged helpers moved to `private` schema behind invoker wrappers (048, 051, 053)",
          "More SQL to maintain",
        ],
      ],
    },
  ],
};
