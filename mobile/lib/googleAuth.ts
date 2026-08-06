import { makeRedirectUri, AuthRequest, ResponseType } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

const isExpoGo = Constants.appOwnership === "expo";

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

/** Force Supabase authorize URL → native deep link (never the marketing site). */
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
 * Fallback: Supabase browser OAuth with forced deep-link redirect_to.
 */
export async function signInWithGoogleSupabaseBrowser(): Promise<{
  ok: boolean;
  error?: string;
  authUrl?: string;
}> {
  const nativeCallback = getNativeAppCallbackUri();
  console.log("[oauth/browser] redirectTo =", nativeCallback);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: nativeCallback,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: "select_account",
      },
    },
  });
  if (error) return { ok: false, error: error.message };
  if (!data?.url) return { ok: false, error: "No OAuth URL returned" };

  const authorizeUrl = forceOAuthRedirectTo(data.url, nativeCallback);
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

  // Match on the full deep-link so https://finkoin.com does NOT close the session as "success"
  const result = await WebBrowser.openAuthSessionAsync(
    authorizeUrl,
    nativeCallback,
    {
      showInRecents: false,
      preferEphemeralSession: false,
      createTask: Platform.OS === "android" ? false : undefined,
    } as WebBrowser.AuthSessionOpenOptions,
  );

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
        "Add this Redirect URL in Supabase → Auth → URL configuration:",
        nativeCallback,
        "",
        "Also add: exp://**  and  finkoin://**",
        "",
        "Recommended: set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID so Google stays in-app.",
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
        "Add this exact Redirect URL in Supabase:",
        nativeCallback,
      ].join("\n"),
    };
  }

  return { ok: true, authUrl: result.url };
}
