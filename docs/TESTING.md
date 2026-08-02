# Testing

Full guide: [`tests/TESTING.md`](../tests/TESTING.md).

## Layout

| Kind     | Location                          | Command                 |
| -------- | --------------------------------- | ----------------------- |
| Unit     | `lib/**/*.test.ts`, `tests/unit/` | `npm test`              |
| Coverage | business `lib/` (≥90% lines gate) | `npm run test:coverage` |
| E2E      | `tests/e2e/*.spec.ts`             | `npm run test:e2e`      |

## E2E specs (current)

- `navigation.spec.ts` — main nav links
- `health-check.spec.ts` — analyse smoke
- `responsive.spec.ts` — overflow / bottom nav
- `calculators.spec.ts` — calculator inputs, SIP decimal rate/slider sync, ₹99cr money clamp, Post Office pages
- `protected.spec.ts` — auth-gated pages (needs `E2E_USER_*`)
- `split.spec.ts` — Split logged-out + invite redirect smoke

Authenticated e2e **skips** if `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` are unset.

Helper: `tests/e2e/helpers/auth.ts`.
