import { makeRedirectUri, AuthRequest, ResponseType } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

const isExpoGo = Constants.appOwnership === "expo";

function siteBase(): string {
  const raw = (process.env.EXPO_PUBLIC_SITE_URL || "https://www.finkoin.com")
    .trim()
    .replace(/\/$/, "");
  return raw || "https://www.finkoin.com";
}

/**
 * Deep link that MUST close the auth browser and hand control back to Expo.
 * Expo Go → exp://HOST:PORT/--/auth/callback
 * Standalone → finkoin://auth/callback
 */
export function getNativeAppCallbackUri(): string {
  if (!isExpoGo) {
    return makeRedirectUri({
      scheme: "finkoin",
      path: "auth/callback",
    });
  }
  return makeRedirectUri({ path: "auth/callback" });
}

/**
 * HTTPS redirect allowlisted in Supabase, then bounces to the native deep link.
 * Static HTML (no React) so it works as soon as this file is on www.finkoin.com.
 * Avoids requiring every changing exp://IP:port in the Supabase allow list.
 */
export function getOAuthBridgeRedirectUri(nativeCallback: string): string {
  const u = new URL(`${siteBase()}/oauth-app-return.html`);
  u.searchParams.set("app", nativeCallback);
  return u.toString();
}

/** Prefix for openAuthSessionAsync matching (scheme/host). */
export function getAuthSessionReturnUrl(nativeCallback: string): string {
  try {
    if (nativeCallback.startsWith("finkoin:")) return "finkoin://";
    if (
      nativeCallback.startsWith("exp:") ||
      nativeCallback.startsWith("exps:")
    ) {
      const m = nativeCallback.match(/^(exps?:\/\/[^/]+)/);
      if (m) return m[1];
    }
  } catch {
    /* ignore */
  }
  return nativeCallback;
}

/**
 * Google OAuth Web client ID from Google Cloud Console.
 * Required for ID-token flow (recommended). Same client ID as Supabase Google provider.
 */
export function getGoogleWebClientId(): string {
  return (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "").trim();
}

/** Force Supabase authorize URL → our redirect_to (bridge or native). */
export function forceOAuthRedirectTo(
  authorizeUrl: string,
  redirectTo: string,
): string {
  try {
    const u = new URL(authorizeUrl);
    u.searchParams.set("redirect_to", redirectTo);
    return u.toString();
  } catch {
    return authorizeUrl;
  }
}

/**
 * Preferred: Google returns ID token into Expo → supabase.signInWithIdToken.
 * Never opens finkoin.com.
 */
export async function signInWithGoogleIdToken(): Promise<{
  ok: boolean;
  error?: string;
  skipped?: boolean;
}> {
  const webClientId = getGoogleWebClientId();
  if (!webClientId) {
    return { ok: false, skipped: true, error: "no web client id" };
  }

  const redirectUri = getNativeAppCallbackUri();
  console.log("[oauth/idtoken] redirectUri =", redirectUri);

  const request = new AuthRequest({
    clientId: webClientId,
    redirectUri,
    responseType: ResponseType.IdToken,
    scopes: ["openid", "profile", "email"],
    extraParams: {
      prompt: "select_account",
    },
    usePKCE: false,
  });

  const discovery = {
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    revocationEndpoint: "https://oauth2.googleapis.com/revoke",
  };

  await request.makeAuthUrlAsync(discovery);

  const result = await request.promptAsync(discovery, {
    showInRecents: false,
    preferEphemeralSession: false,
    createTask: Platform.OS === "android" ? false : undefined,
  } as never);

  if (result.type === "cancel" || result.type === "dismiss") {
    return { ok: false, error: "Google sign-in was cancelled" };
  }
  if (result.type !== "success") {
    return { ok: false, error: `Google sign-in failed (${result.type})` };
  }

  let idToken = (result.params as { id_token?: string }).id_token;
  if (!idToken && "url" in result && result.url) {
    const { params } = QueryParams.getQueryParams(result.url);
    idToken = params.id_token as string | undefined;
  }

  if (!idToken) {
    return {
      ok: false,
      error:
        "Google did not return an ID token. Use a Google “Web application” OAuth client ID in EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (same as Supabase → Auth → Google).",
    };
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Fallback: Supabase browser OAuth → HTTPS mobile-bridge → native deep link.
 */
export async function signInWithGoogleSupabaseBrowser(): Promise<{
  ok: boolean;
  error?: string;
  authUrl?: string;
}> {
  const nativeCallback = getNativeAppCallbackUri();
  const redirectTo = getOAuthBridgeRedirectUri(nativeCallback);
  const returnUrl = getAuthSessionReturnUrl(nativeCallback);

  console.log("[oauth/browser] nativeCallback =", nativeCallback);
  console.log("[oauth/browser] redirectTo (bridge) =", redirectTo);
  console.log("[oauth/browser] returnUrl matcher =", returnUrl);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: "select_account",
      },
    },
  });
  if (error) return { ok: false, error: error.message };
  if (!data?.url) return { ok: false, error: "No OAuth URL returned" };

  const authorizeUrl = forceOAuthRedirectTo(data.url, redirectTo);
  console.log(
    "[oauth/browser] redirect_to param =",
    (() => {
      try {
        return new URL(authorizeUrl).searchParams.get("redirect_to");
      } catch {
        return "?";
      }
    })(),
  );

  try {
    await WebBrowser.warmUpAsync();
  } catch {
    /* optional */
  }

  // Match on the native scheme/host so the session closes when the bridge
  // bounces to exp://… or finkoin://… (not when landing on finkoin.com).
  const result = await WebBrowser.openAuthSessionAsync(
    authorizeUrl,
    returnUrl,
    {
      showInRecents: false,
      preferEphemeralSession: false,
      createTask: Platform.OS === "android" ? false : undefined,
    } as WebBrowser.AuthSessionOpenOptions,
  );

  console.log("[oauth/browser] result.type =", result.type);
  if (result.type === "success" && "url" in result) {
    console.log("[oauth/browser] result.url =", result.url?.slice(0, 120));
  }

  try {
    await WebBrowser.coolDownAsync();
  } catch {
    /* optional */
  }
  try {
    WebBrowser.dismissAuthSession();
  } catch {
    try {
      await WebBrowser.dismissBrowser();
    } catch {
      /* ignore */
    }
  }

  if (result.type === "cancel" || result.type === "dismiss") {
    return { ok: false, error: "Google sign-in was cancelled" };
  }

  if (result.type !== "success" || !("url" in result) || !result.url) {
    return {
      ok: false,
      error: [
        "Did not return to the Expo app after Google.",
        "",
        "In Supabase → Authentication → URL configuration, add:",
        "https://www.finkoin.com/oauth-app-return.html**",
        "https://www.finkoin.com/**",
        "exp://**",
        "finkoin://**",
        "",
        `Bridge redirect in use:`,
        redirectTo.split("&code=")[0],
      ].join("\n"),
    };
  }

  if (
    /^https?:\/\//i.test(result.url) &&
    /finkoin\.com/i.test(result.url) &&
    !result.url.includes("code=") &&
    !result.url.includes("access_token")
  ) {
    return {
      ok: false,
      error: [
        "Google opened the website instead of the app.",
        "Add this Redirect URL in Supabase → Auth → URL configuration:",
        "https://www.finkoin.com/oauth-app-return.html**",
        "exp://**",
      ].join("\n"),
    };
  }

  return { ok: true, authUrl: result.url };
}
