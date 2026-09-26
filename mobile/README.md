# Finkoin mobile (Expo SDK 57)

## Google OAuth return-to-app

Expo Go redirects to an **`exp://…`** URL, not only `finkoin://`.  
If Google stays on the account picker dialog, Supabase blocked/mismatched the redirect.

### Supabase → Authentication → URL configuration → Redirect URLs

Add **all** of these:

```
exp://**
finkoin://**
finkoin://auth/callback
```

Also the exact URI from Metro logs (`[oauth] redirectTo = …`) after tapping Google.

### After changing redirects

1. Save in Supabase
2. Reload the app
3. Try **Continue with Google** again

On success the in-app browser closes and you land on Home.

### Run

```bash
cd mobile && npx expo start --lan --clear
```
