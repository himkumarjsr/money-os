# Finkoin (money-os)

Next.js personal finance app for Indian users — health check, trackers, calculators, FK Split, rewards, and an AI fix plan.

**App version:** 0.4.0 · **Canonical site:** https://www.finkoin.com

## Product (shipped)

- **Analyse** — 7-step financial health check → score, checklist, buckets, AI fix plan (₹99 / FK unlock)
- **Tracker** — monthly expenses, Month Safety Pulse, credit-card reminders
- **FK Split** — groups, open/email invites, expenses, balances, settle-up
- **Calculators** — SIP, SWP, EMI, FIRE, tax regime 2026, and more
- **Profile / rewards** — assets sync, FK tokens, streaks, referrals, leaderboard
- **Learn / blog / legal** — education + SEO + DPDP-oriented legal pages
- **PWA** — installable production build (`next-pwa`)

Placeholders / partial: goals, pricing/plans polish, KYC (PAN mock), insurance comparison, live portfolio feeds.

## Docs

| Start here                                             |                                                      |
| ------------------------------------------------------ | ---------------------------------------------------- |
| [`docs/README.md`](./docs/README.md)                   | Docs index                                           |
| [`FINKOIN_SYSTEM.md`](./FINKOIN_SYSTEM.md)             | **System source of truth** (rules, schema, runbooks) |
| [`docs/PRODUCT_SURFACE.md`](./docs/PRODUCT_SURFACE.md) | All routes                                           |
| [`docs/API_REFERENCE.md`](./docs/API_REFERENCE.md)     | All APIs                                             |
| [`docs/ENV_AND_SCRIPTS.md`](./docs/ENV_AND_SCRIPTS.md) | Env keys + npm scripts                               |
| [`tests/TESTING.md`](./tests/TESTING.md)               | Unit + e2e                                           |

## Tech stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind · Zustand · React Hook Form + Zod · Supabase Auth/DB · Razorpay · Groq · Resend · Recharts · Framer Motion · Vitest · Playwright · next-pwa

## Project structure

```
app/           # Routes + API handlers
components/    # UI by domain (forms, tracker, split, landing, …)
store/         # Zustand (auth, financial, split, gamification, notifications, …)
lib/           # Engines + helpers (finance, split, tracker, tax, …)
supabase/      # migrations/ + manual/ SQL
docs/          # Maintained overview docs
tests/         # Playwright e2e + unit helpers
FINKOIN_SYSTEM.md
```

## Setup

```bash
npm install
cp .env.example .env.local   # fill Supabase (+ optional Razorpay/Groq/Resend)
npm run dev
```

Open `http://localhost:3000`. Full env catalog: [docs/ENV_AND_SCRIPTS.md](./docs/ENV_AND_SCRIPTS.md).

## Scripts

```bash
npm run dev
npm run build && npm start
npm run lint
npm test
npm run test:coverage
npm run test:e2e
npm run docs:update
```

## Database

- Apply `supabase/migrations/*` in order (or via your Supabase workflow).
- Apply `supabase/manual/*` for tracker / credit cards / avatars as needed.
- **Split tables** and tip RPCs are documented in `FINKOIN_SYSTEM.md` §34 — they may live only on the remote project until checked into repo SQL.

## Notes

- Auth is production cookie session (Supabase SSR) + client `ProtectedGate` — not a demo scaffold.
- PAN verification in `lib/kycVerification.ts` is still mock; do not store full PAN.
- Server-only secrets must never use `NEXT_PUBLIC_` (`npm run check:secrets`).
