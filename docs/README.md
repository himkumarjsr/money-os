# Finkoin docs

Living overview of the money-os / Finkoin codebase. Synced to app **v0.4.0+** (2026-08-04).

## Source of truth

| Document                                                                      | Role                                                                                               |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [`FINKOIN_SYSTEM.md`](../FINKOIN_SYSTEM.md) (repo root)                       | **Deep source of truth** — rules, runbooks, schema §§5/34/36, APIs §37, SEO/PWA §38, sync §39      |
| `docs/*` (this folder)                                                        | **Maintained overview** — product map, APIs, data, env, functions, design. Must not contradict SoT |
| [`README.md`](../README.md)                                                   | Quick start only                                                                                   |
| [`tests/TESTING.md`](../tests/TESTING.md)                                     | How to run unit + e2e tests                                                                        |
| [`supabase/USER_DATA_AUDIT_NOTES.sql`](../supabase/USER_DATA_AUDIT_NOTES.sql) | Read-only SQL notes for per-user DB audits                                                         |

When code and docs disagree, **trust the code**, then update SoT + this folder.

## Index

| File                                               | Contents                                                             |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| [PRODUCT_SURFACE.md](./PRODUCT_SURFACE.md)         | All app routes by feature + status (shipped / partial / placeholder) |
| [API_REFERENCE.md](./API_REFERENCE.md)             | Every `/api/*` route: method, auth, rate limits                      |
| [CORE_ARCHITECTURE.md](./CORE_ARCHITECTURE.md)     | System diagram, major flows, security, caching                       |
| [DATA_AND_STORES.md](./DATA_AND_STORES.md)         | Zustand stores, engines map, migrations vs manual vs remote SQL      |
| [FUNCTIONS_REFERENCE.md](./FUNCTIONS_REFERENCE.md) | Key `lib/` + store APIs                                              |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)             | Brand tokens, chrome, domain components                              |
| [ENV_AND_SCRIPTS.md](./ENV_AND_SCRIPTS.md)         | `.env.example` keys + `package.json` scripts                         |
| [TESTING.md](./TESTING.md)                         | Test layout + pointers                                               |

## What was wrong / incomplete before this pass

- `docs/` had only three thin files — missing tracker, split completeness, full API list, DB map, env, tests.
- Root `README.md` still described an early auth/calculator scaffold (omitted Split, Tracker, Razorpay, tips, PWA).
- `FINKOIN_SYSTEM.md` §10 incorrectly said AI analyse and Razorpay create-order need no auth (code requires cookie session + rate limits).

## Refresh

```bash
npm run docs:update   # refreshes FINKOIN_SYSTEM.md TEST STATUS (+ tsc/eslint check)
```

After significant product changes, update `FINKOIN_SYSTEM.md` and the relevant `docs/` file in the same PR.
