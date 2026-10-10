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

## Release to Google Play

```bash
cd mobile
npx eas-cli build --platform android --profile production   # signed .aab, versionCode auto-increments on EAS
npx eas-cli submit --platform android --profile production  # uploads to the internal track as a draft
```

- EAS generates and keeps the upload keystore (`eas credentials` shows it). Keep Play App Signing on.
- Production builds read env from the EAS **production** environment, not `.env`:
  set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_SITE_URL`
  (and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` if used) with `eas env:create --environment production`.
  Never set `EXPO_PUBLIC_SKIP_PAYMENT` there.
- `eas submit` needs a Play service-account key at `mobile/play-service-account.json` (gitignored).
  The very first `.aab` has to be uploaded by hand in Play Console.
- After Play App Signing is on, copy the **app signing key** SHA-256 from Play Console → App integrity
  into the web app's `ANDROID_APP_CERT_SHA256` (comma-separated with the upload key's) so
  `/.well-known/assetlinks.json` verifies the `/split/join` links.
- Android picks profile photos through the system photo picker, so camera and media-storage
  permissions are blocked in `app.json` (Play's photo/video permissions policy).
- In-app payments for the Fix Plan must go through Play Billing (or India user-choice billing),
  not Razorpay, before `PAYMENTS_ENABLED` is turned on in `lib/analyseEntitlement.ts`.
