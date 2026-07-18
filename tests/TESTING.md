# Testing guide

## Unit tests (no login)

```bash
npm test
npm run test:coverage   # HTML report under coverage/
npm run lint
```

**Coverage gate (Vitest):** ≥90% lines/statements on business-logic `lib/` modules  
(infra like Supabase clients, AI/PDF, and large form schemas are excluded — see `vitest.config.ts`).

Covers pure logic in `lib/**` (finance, split, tracker, tax helpers, formatters, auth redirects, etc.).

## Authenticated e2e (login required)

1. Confirm a test user email in Supabase (or use Google — password e2e needs email/password).
2. Copy `.env.example` → `.env.local` and set:

```bash
E2E_USER_EMAIL=your-test@maildrop.cc
E2E_USER_PASSWORD=your-password
```

3. Run:

```bash
npm run test:e2e -- tests/e2e/protected.spec.ts
```

Protected specs **skip** automatically if credentials are missing (so CI without secrets stays green).

**Do not commit passwords.** `.env.local` is gitignored.

## Reality check

Line-by-line coverage of every React page + every API route is not practical in one pass. Priority order:

1. Pure `lib/` business logic (current focus)
2. Authenticated Playwright smoke for Split / Tracker / Profile
3. API route tests with mocked Supabase (next)
