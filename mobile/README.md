# Finkoin mobile (Expo SDK 54)

Do not modify web code. This app lives only under `mobile/`.

## Run

```bash
cd mobile
npm start
```

Expo Go **54** · same Wi‑Fi · scan QR. Prefer LAN over `--tunnel`.

## Env

Copy from web `.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=…   # same as NEXT_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=…  # same as NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## V1

- Auth (email) + home dashboard
- Tabs: Health / Tools / Track / Profile (placeholders deepen next)
- Shared engines copied into `mobile/lib/`
