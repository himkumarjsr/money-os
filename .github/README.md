# GitHub Actions

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `pr-checks.yml` | Pull requests to `main` or `production` | TypeScript, build, secret scan |
| `deploy-uat.yml` | Push to `main` | Validate build before UAT deploy |
| `deploy-prod.yml` | Push to `production` | Strict checks before production deploy |

## Required repository secrets

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Add under **Settings → Secrets and variables → Actions**.
