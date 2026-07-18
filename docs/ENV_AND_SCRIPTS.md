# Environment variables & scripts

Copy [`.env.example`](../.env.example) → `.env.local`. Never commit secrets.

## Environment keys

### Required for core auth + DB

| Variable                        | Scope           | Purpose                    |
| ------------------------------- | --------------- | -------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | public          | Supabase project URL       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public          | Anon key (RLS)             |
| `SUPABASE_SERVICE_ROLE_KEY`     | **server only** | Admin client in API routes |

### AI

| Variable       | Scope           | Purpose           |
| -------------- | --------------- | ----------------- |
| `GROQ_API_KEY` | **server only** | `/api/ai/analyse` |

### App URLs

| Variable               | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`  | Local / deploy app origin (invites, redirects)       |
| `NEXT_PUBLIC_SITE_URL` | Canonical public site (e.g. https://www.finkoin.com) |
| `NEXT_PUBLIC_APP_NAME` | Display name                                         |

### Payments (Razorpay)

| Variable                                          | Scope           | Purpose                    |
| ------------------------------------------------- | --------------- | -------------------------- |
| `RAZORPAY_KEY_ID` / `NEXT_PUBLIC_RAZORPAY_KEY_ID` | public ID       | Checkout                   |
| `RAZORPAY_KEY_SECRET`                             | **server only** | create-order + HMAC verify |

### Optional product flags

| Variable                         | Purpose            |
| -------------------------------- | ------------------ |
| `NEXT_PUBLIC_SKIP_PAYMENT`       | Dev unlock bypass  |
| `NEXT_PUBLIC_ADMIN_EMAIL`        | Admin privileges   |
| `NEXT_PUBLIC_DEBUG_AI`           | AI debug           |
| `NEXT_PUBLIC_AI_TIMEOUT_MS`      | AI timeout         |
| `NEXT_PUBLIC_FINKOIN_AGENT_CODE` | Agent / promo code |

### Analytics / PWA

| Variable                                | Purpose            |
| --------------------------------------- | ------------------ |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`         | GA4                |
| `NEXT_PUBLIC_CLARITY_ID`                | Microsoft Clarity  |
| `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` | Web push (if used) |

### Email / cron

| Variable         | Purpose                    |
| ---------------- | -------------------------- |
| `RESEND_API_KEY` | Split invites + tip emails |
| `EMAIL_FROM`     | From address               |
| `CRON_SECRET`    | Protect tip cron routes    |

### Feedback (optional)

See comments in `.env.example` for Google Form URLs / entry IDs.

### E2E (optional, never commit passwords)

| Variable                               | Purpose                        |
| -------------------------------------- | ------------------------------ |
| `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` | Playwright authenticated specs |

---

## npm scripts

| Script                                      | What it does                                               |
| ------------------------------------------- | ---------------------------------------------------------- |
| `dev` / `build` / `start`                   | Next.js lifecycle                                          |
| `lint` / `lint:fix`                         | ESLint (max-warnings 0)                                    |
| `type-check`                                | `tsc --noEmit`                                             |
| `test` / `test:watch` / `test:coverage`     | Vitest unit tests                                          |
| `test:e2e`                                  | Playwright Chromium + Mobile Chrome                        |
| `test:e2e:ui` / `test:e2e:webkit`           | Playwright UI / WebKit                                     |
| `test:all`                                  | unit + e2e                                                 |
| `docs:update`                               | Refresh `FINKOIN_SYSTEM.md` TEST STATUS + tsc/eslint smoke |
| `check:secrets`                             | Fail if server secrets imported from client paths          |
| `pwa:icons` / `pwa:splashes` / `pwa:assets` | Generate PWA assets                                        |
| `og:placeholders`                           | OG image placeholders                                      |
| `prepare`                                   | Husky git hooks                                            |

## Stack (runtime)

Next.js 14 App Router · React 18 · TypeScript · Tailwind · Zustand · RHF+Zod · Supabase SSR/JS · Razorpay · Groq · Resend · Recharts · Framer Motion · jspdf · xlsx · next-pwa · Vitest · Playwright.
