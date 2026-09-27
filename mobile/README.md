# Finkoin mobile (Expo SDK 57)

## Setup (required before Google / login)

1. Copy env and fill values from the web app (same Supabase project):

```bash
cp mobile/.env.example mobile/.env
```

Set at least:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ…
EXPO_PUBLIC_SITE_URL=https://www.finkoin.com
```

Optional (smoother Google, stays in-app):

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=….apps.googleusercontent.com
```

Use the **Web** OAuth client ID from Google Cloud (same one as Supabase → Auth → Providers → Google).

2. Restart Expo so env loads:

```bash
cd mobile && npx expo start --lan --clear
```

## Google OAuth return-to-app

After you pick a Google account, Supabase must bounce back into Expo via a
stable HTTPS bridge (so changing LAN IPs do not break login).

### Supabase → Authentication → URL configuration → Redirect URLs

Add **all** of these:

```
https://www.finkoin.com/oauth-app-return.html**
https://www.finkoin.com/**
exp://**
finkoin://**
finkoin://auth/callback
```

Save, then try **Continue with Google** again.

Flow: Google → Supabase → `finkoin.com/oauth-app-return.html?app=exp://…` → app deep link with `code` → app exchanges the code.

**Deploy required:** ship `public/oauth-app-return.html` to production (and the auth/callback bounce) before testing Google on a physical device.

Optional (smoother, in-app Google): set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to the
Web client ID from Google Cloud (same as Supabase → Auth → Google).

### After changing redirects

1. Save in Supabase
2. Reload the app (`npx expo start --lan --clear`)
3. Try **Continue with Google** again

On success the in-app browser closes and you land on Home.

### Run

```bash
cd mobile && npx expo start --lan --clear
```
