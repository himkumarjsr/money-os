# Finkoin (money-os)

Finkoin is a Next.js personal finance app focused on Indian users.  
It includes:

- a 7-step financial health analysis flow
- detailed result report with actionable insights
- multiple calculators (SIP, EMI, SWP, PPF, loans, rent/buy, etc.)
- profile/auth shell with rewards, referrals, and KYC placeholders
- gamification (FK tokens, badges, streaks)

## Tech Stack

- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS
- Zustand (state + persistence)
- React Hook Form + Zod
- Recharts (calculator charts)
- Framer Motion (animations)
- XLSX (amortisation export)
- Supabase JS client (auth integration scaffold)

## Project Structure

- `app/` – routes and pages
  - `app/page.tsx` – landing page
  - `app/analyse/` – analysis flow + result
  - `app/calculators/` – calculators directory + UI
  - `app/profile/` – user profile dashboard
- `components/`
  - `components/forms/` – analysis onboarding form and steps
  - `components/calculators/` – calculator components
  - `components/ui/` – shared UI (navbar, login sheet, money input, bottom sheet, etc.)
- `store/` – Zustand stores (`authStore`, `financialStore`, `gamificationStore`)
- `lib/` – helpers (`financialEngine`, `auth`, `kycVerification`, formatters, animation variants)
- `supabase/migrations/` – SQL migrations (initial schema scaffold)

## Main Features

### 1) Financial Health Analysis

- 7-step input flow in `components/forms/analyse-onboarding-form.tsx`
- persisted draft state with Zustand
- result generated via `lib/financialEngine.ts`
- result page includes metrics, checklist, plan steps, and score visualization

### 2) Calculators

- Investment and loan calculators with live sliders/manual input
- Indian number formatting + words display for money fields
- charts powered by Recharts
- amortisation schedule + Excel download for relevant loan calculators

> Note: calculator math logic is intentionally isolated in individual calculator components and engine helpers.

### 3) Auth + Profile (Scaffolded)

- persisted auth state in `store/authStore.ts`
- login bottom sheet in `components/ui/LoginSheet.tsx`
  - Google sign-in flow hook
  - phone OTP flow hook
- profile dropdown in navbar and `/profile` dashboard page
- PAN verification mock in `lib/kycVerification.ts`

## Environment Variables

Create `.env.local` in project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

If these are not set, auth helpers fail gracefully with configuration errors.

## Installation

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Then open:

- `http://localhost:3000` (or next available port)

## Production Build

```bash
npm run build
npm start
```

## Supabase Migration

Migration scaffold is available at:

- `supabase/migrations/001_initial.sql`

Apply it in your Supabase SQL editor or migration workflow.

## Scripts

- `npm run dev` – start dev server
- `npm run build` – production build + type checks
- `npm run start` – run built app
- `npm run lint` – lint checks
- `npm run test` – run tests

## Notes

- Current auth/KYC is a hybrid scaffold: UI and store are ready, backend verification and secure persistence should be finalized before production.
- PAN verification currently uses mock validation logic and must be replaced with compliant production APIs.
- Never store full PAN permanently; only store verification status and masked form.

