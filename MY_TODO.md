# My to-do list: mobile push notifications and Split

Tick each box (`[x]`) as you finish it. Do everything on **UAT first**, then production.

---

## 1. Database

- [ ] Apply migration `supabase/migrations/038_expo_push_tokens.sql` on **UAT** Supabase.
- [ ] Apply the same migration on **production** Supabase after UAT testing.

## 2. Deploy the website (Vercel)

The website must go live before the mobile app depends on it. It handles split server checks, the member-added notification, phone push sending, and the "open in app" join page.

- [ ] Deploy branch `mobile-app` to **UAT** and check `/split` and `/split/join?code=TEST` still load.
- [ ] Deploy to **production** after testing.
- [ ] In `mobile/.env`, make sure `EXPO_PUBLIC_SITE_URL` points to the site you're testing against (UAT URL for testing, `https://www.finkoin.com` for release).

## 3. Website environment variables (Vercel)

| Variable                         | What it's for                                         | Where to get it                                         |
| -------------------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| `RESEND_API_KEY`                 | Sends "you were added to a group" emails              | Resend dashboard                                        |
| `EMAIL_FROM`                     | Sender address for those emails                       | Your verified Resend domain                             |
| `EXPO_ACCESS_TOKEN` _(optional)_ | Secures phone push sending                            | expo.dev → Account settings → Access tokens             |
| `NEXT_PUBLIC_PLAY_STORE_URL`     | Sends Android users without the app to the Play Store | Your Play Store listing URL (once the app is published) |
| `NEXT_PUBLIC_APP_STORE_URL`      | Sends iPhone users without the app to the App Store   | Your App Store listing URL (once the app is published)  |
| `ANDROID_APP_CERT_SHA256`        | Lets invite links open the Android app directly       | `eas credentials` → Android → SHA-256 fingerprint       |
| `APPLE_TEAM_ID`                  | Lets invite links open the iPhone app directly        | Apple Developer account → Membership → Team ID          |

- [ ] Set `RESEND_API_KEY` and `EMAIL_FROM`.
- [ ] (Optional) Set `EXPO_ACCESS_TOKEN`.
- [ ] Set `NEXT_PUBLIC_PLAY_STORE_URL` once the Android app is live.
- [ ] Set `NEXT_PUBLIC_APP_STORE_URL` once the iPhone app is live.
- [ ] Set `ANDROID_APP_CERT_SHA256`, then confirm `https://www.finkoin.com/.well-known/assetlinks.json` returns JSON (not 404).
- [ ] Set `APPLE_TEAM_ID`, then confirm `https://www.finkoin.com/.well-known/apple-app-site-association` returns JSON (not 404).

## 4. Push notification credentials (EAS / Firebase / Apple)

- [ ] **Android:** create a Firebase project for `com.finkoin.app` and download `google-services.json`.
- [ ] **Android:** upload the FCM V1 service-account key to EAS (`eas credentials` → Android → Push Notifications).
- [ ] **iOS:** let EAS create or upload the APNs key (`eas credentials` → iOS → Push Notifications).

## 5. New app build

A new build is required because these updates add native modules: notifications, clipboard, invite-link settings, app icon, and PDF sharing (expo-sharing).

- [ ] Run a new EAS build for Android (`eas build -p android`).
- [ ] Run a new EAS build for iOS (`eas build -p ios`).

## 6. Test on a real phone (UAT)

**Notifications**

- [ ] Fresh install → the app asks **Allow / Don't allow** for notifications.
- [ ] Allow → sign in → the morning tip push arrives (or trigger `/api/notifications/deliver-tip`).
- [ ] Tapping a push opens the Notifications screen with that message highlighted.
- [ ] Bell icon updates live, and "Finance Tips" opens the Notifications screen.
- [ ] Sign out → the phone stops getting pushes for that account.

**Split**

- [ ] Create a group, then Copy the invite link and share it on WhatsApp.
- [ ] Add an expense on mobile → the other member gets a push.
- [ ] Edit and delete an expense (only the creator can) and change who paid.
- [ ] Settle up (UPI with note, cash, bank).
- [ ] Invite by email → the invitee gets the email, plus an in-app and push notification if they have an account.
- [ ] Open an invite link on a phone **with** the app → it opens the app's join screen.
- [ ] Open an invite link on a phone **without** the app → it goes to the store (once store URLs are set) or continues in the browser.
- [ ] Leave and remove members, then close the group.
- [ ] Check the same flows still work on the **PWA**.

**Analyse (Financial Health Check)**

- [ ] Deploy the website first; the app's "Download PDF" button calls the new `/api/analyse/pdf` route.
- [ ] Fill all 7 steps, close the app mid-way, reopen → the "Continue where you left off" banner appears.
- [ ] Add and remove loans, other insurance, post office schemes, custom investments, and up to 6 kids.
- [ ] Result screen → tap unlock → the pay button passes straight through (payments are off for now).
- [ ] Fix Plan loads, then download the PDF → the share sheet opens and the PDF looks like the web one.
- [ ] Do the same flow on the **PWA** and download its PDF to confirm nothing changed.
- [ ] Review the "flags for product" list from Cursor and decide on each one.

## 7. Known issues to look at later

- [ ] Existing e2e failure: `tests/e2e/split-complete.spec.ts` › "split nav link is reachable from home" on **Mobile Safari** (fails on old code too).
- [ ] Existing e2e flaky test: `tests/e2e/navigation.spec.ts` › "browser forward button works" on **Mobile Chrome**.
- [ ] If a user taps **Don't allow** for notifications, they must turn them on in phone Settings, because there's no in-app button for that yet. Decide if you want one added.

## 8. Release

- [ ] Turn on Fix Plan payments when ready: set `PAYMENTS_ENABLED = true` in `mobile/lib/analyseEntitlement.ts` and wire up the real payment.
- [ ] Decide when to merge `mobile-app` into `main`.
- [ ] Submit the builds to Play Store and App Store.
