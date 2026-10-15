import type { DocSection } from "./types";

export const beforeLoginSection: DocSection = {
  id: "before-login",
  title: "Before login",
  group: "User journeys",
  summary:
    "Everything a visitor can do without an account, and exactly how sign-up and sign-in work.",
  blocks: [
    { kind: "h", text: "What a visitor can use" },
    {
      kind: "table",
      head: ["Area", "Routes", "Data"],
      rows: [
        [
          "Landing",
          "`/`, `/features`, `/about`, `/contact`, `/pricing`, `/plans`",
          "Static / server-rendered; `GET /api/testimonials`",
        ],
        [
          "Calculators",
          "`/calculators`, `/calculators/[id]`, `/calculators/tax-regime-2026`, `/calculator`",
          "Runs fully in the browser; inputs in localStorage",
        ],
        [
          "Learning",
          "`/learn`, `/learn/[id]`, `/blog`, `/blog/[slug]`",
          "Static content modules",
        ],
        [
          "Legal",
          "`/legal/*`, `/privacy`, `/terms`, `/legal/delete-account`",
          "Static",
        ],
        [
          "Feedback",
          "Feedback widget",
          "`POST /api/feedback` without a session (no FK reward)",
        ],
        [
          "Split invite link",
          "`/split/join?token=…`",
          "Shows the invite; joining needs login, the token is kept through login",
        ],
        [
          "Referral link",
          "`/?ref=CODE`",
          "`ReferralCapture` stores the code in sessionStorage until sign-up",
        ],
      ],
    },
    {
      kind: "callout",
      tone: "info",
      text: "Visiting a signed-in page (for example `/tracker`) sends the visitor to `/login?redirect=/tracker` once `ProtectedGate` knows there is no session. The middleware never redirects; it only refreshes cookies.",
    },
    { kind: "h", text: "Sign up (email + password)" },
    {
      kind: "list",
      ordered: true,
      items: [
        "`/login` → Sign up tab → `authStore.signUpWithEmail(email, password, name)` → `supabase.auth.signUp` with `emailRedirectTo = {origin}/auth/callback`.",
        "If email confirmation is on, no session is returned and the UI asks the user to confirm their email.",
        "Confirmation link → `/auth/callback` → `completeAuthSessionFromUrl` exchanges the PKCE code for a session.",
        "Postgres trigger `handle_new_user()` creates `users`, `gamification` and `user_stats` rows and credits the 50 FK welcome bonus.",
        "`initAuth()` loads the profile, the pending referral (if any) is applied (`POST /api/referrals/apply`), then the user lands on `?next=` or `/analyse`.",
      ],
    },
    { kind: "h", text: "Sign in" },
    {
      kind: "table",
      head: ["Method", "Web", "Native app"],
      rows: [
        [
          "Email + password",
          "`signInWithPassword` → `initAuth()` → redirect",
          "Same, via supabase-js in the app",
        ],
        [
          "Google",
          "`signInWithOAuth({ provider: 'google', redirectTo: /auth/callback?next=… })` → PKCE exchange in `/auth/callback`",
          "`mobile/lib/googleAuth.ts`; Supabase redirects to `/auth/mobile-bridge?app=<deep link>` which bounces the code back to the app (the verifier lives in the app)",
        ],
        ["Apple", "—", "`mobile/lib/appleAuth.ts` (Sign in with Apple)"],
        [
          "Forgot password",
          "`resetPasswordForEmail` → `/auth/callback?type=recovery` → `/auth/update-password` → `updateUser({ password })`",
          "Opens the same web flow",
        ],
      ],
    },
    {
      kind: "diagram",
      title: "Web sign-in sequence",
      code: `Visitor        /login               Supabase Auth          /auth/callback        App
  │ email+pwd ─►│ signInWithPassword ─►│                       │                    │
  │             │◄──── session (cookies via @supabase/ssr) ────│                    │
  │             │ initAuth(): getSession → users + gamification │                    │
  │             │ router.push(redirect ?? /analyse) ────────────────────────────────►│
  │ Google ────►│ signInWithOAuth ────►│ consent screen         │                    │
  │             │                      │── ?code=… ────────────►│ exchangeCodeFor-   │
  │             │                      │                        │ Session, initAuth, │
  │             │                      │                        │ apply referral ───►│ next`,
    },
    { kind: "h", text: "Session lifecycle" },
    {
      kind: "list",
      items: [
        "Browser client: `createBrowserClient` (cookie storage) in `lib/supabase.ts`.",
        "Middleware: `auth.getUser()` validates the JWT and rotates the refresh cookie on every matched navigation.",
        "`AppInitializer` waits for the persisted auth store to rehydrate, then calls `initAuth()` so stale local state is never trusted.",
        "`AuthSessionSync` refreshes the user when the tab becomes visible again or another tab signs in/out.",
        "Logout: `POST /api/auth/sign-out` (clears server cookies) + `signOut({ scope: 'global' })` + clears `finkoin-auth`, `finkoin-financial*`, `finkoin_ai_cache`, `finkoin-gamification`.",
      ],
    },
  ],
};

export const afterLoginSection: DocSection = {
  id: "after-login",
  title: "After login",
  group: "User journeys",
  summary:
    "What a signed-in user sees, the main loops they go through, and what is free vs Pro.",
  blocks: [
    { kind: "h", text: "Signed-in surfaces" },
    {
      kind: "table",
      head: ["Area", "Routes", "Guard"],
      rows: [
        [
          "Health check",
          "`/analyse` → `/analyse/result` → `/analyse/fixplan`, `/optimizer`",
          "Login check in page; Fix Plan needs `canAccessFixPlan` (Pro tier, `users.is_admin`, or a plan already saved in `user_analysis`)",
        ],
        [
          "Tracker",
          "`/tracker`, `/tracker/[month]`",
          "`ProtectedGate` + tracker consent",
        ],
        [
          "Split",
          "`/split`, `/split/[groupId]`, `/split/[groupId]/add-expense`, `/split/join`",
          "`ProtectedGate`; group membership in API + RLS",
        ],
        [
          "Profile and assets",
          "`/profile`, `/investments`, `/goals`, `/portfolio`, `/kyc`",
          "`ProtectedGate`",
        ],
        [
          "Policies",
          "`/policies`, `/insurance`",
          "Session required for data (RLS)",
        ],
        ["Rewards", "`/rewards`, `/leaderboard`, `/refer`", "`ProtectedGate`"],
        [
          "Inbox and settings",
          "`/notifications`, `/settings`",
          "`ProtectedGate`",
        ],
        [
          "Admin console (web only)",
          "`/admin`",
          "Server-side console admin check",
        ],
      ],
    },
    { kind: "h", text: "Boot sequence on every app load" },
    {
      kind: "list",
      ordered: true,
      items: [
        "Root layout mounts `AppInitializer`, `AuthSessionSync`, `FinancialStoreAuthSync`, `SplitInviteResume`, `ReferralCapture`, `PwaLaunchHandler`, theme sync, tip popup and push prompt.",
        "`initAuth()` resolves the session and loads `users` + `gamification`.",
        "`FinancialStoreAuthSync` switches the financial store to `finkoin-financial:<userId>` and restores the latest `user_analyse_snapshots` row if the device has none.",
        "`POST /api/gamification/daily-login` records the visit (streak, +5 points, monthly prizes).",
        "`SplitInviteResume` finishes a join that was interrupted by login.",
        "`MorningTipPopup` shows today's tip once per IST day; `PushPermissionPrompt` may offer device notifications.",
      ],
    },
    { kind: "h", text: "Core loops" },
    {
      kind: "diagram",
      title: "From first check to habit",
      code: `Health check ─► Score + free report ─► Unlock Fix Plan (₹99 Pro)        
      ▲                                        │
      │                                        ▼
 Edit assets in Profile ◄── Net worth ◄── Start plan: planned investments
      │                                        │
      ▼                                        ▼
 Re-analyse (+20 pts/week)         Tracker: expenses, bills, EMIs, cards
                                               │
                                               ▼
                           Reminders (in-app, Web Push, Expo) + daily tips
                                               │
                                               ▼
                     Points → monthly leaderboard → FK prizes → discount`,
    },
    { kind: "h", text: "Free vs Pro" },
    {
      kind: "table",
      head: ["Capability", "Free", "Pro (₹99) or paywall bypass"],
      rows: [
        ["Health score, buckets, checklist, free report", "Yes", "Yes"],
        [
          "Fix Plan (priority plan + AI explanations + goal plans)",
          "Paywalled on web",
          "Yes",
        ],
        ["Fix Plan PDF (`/api/analyse/pdf`)", "With Fix Plan access", "Yes"],
        ["Money Map in Tracker", "—", "Yes (`canViewMoneyMap`)"],
        [
          "Premium (24k) theme",
          "Earned: top 10 on the leaderboard, or a report + 90-day streak",
          "Same rule (not sold)",
        ],
        ["Tracker, Split, policies, calculators, learning", "Yes", "Yes"],
      ],
    },
    {
      kind: "callout",
      tone: "warn",
      text: "`/api/ai/analyse` only refuses free users when `AI_PLAN_REQUIRES_PRO=true`, because the native app still opens the Fix Plan for free until mobile billing ships.",
    },
  ],
};
