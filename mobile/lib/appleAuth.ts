import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

/** Sign in with Apple is offered on iOS only (App Store guideline 4.8). */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Native Sign in with Apple → supabase.signInWithIdToken.
 * Apple gets the SHA-256 of the nonce; Supabase gets the raw nonce to check it.
 * Supabase → Auth → Apple must list the bundle ID (com.finkoin.app) as a client ID.
 */
export async function signInWithAppleIdToken(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e) {
    if ((e as { code?: string })?.code === "ERR_REQUEST_CANCELED") {
      return { ok: false, error: "Apple sign-in was cancelled" };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Apple sign-in failed",
    };
  }

  if (!credential.identityToken) {
    return { ok: false, error: "Apple did not return an identity token" };
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) return { ok: false, error: error.message };

  // Apple shares the name only on the first sign-in and it isn't in the token.
  const name = credential.fullName
    ? AppleAuthentication.formatFullName(credential.fullName).trim()
    : "";
  if (name) {
    try {
      const { data } = await supabase.auth.updateUser({
        data: { full_name: name, name },
      });
      if (data.user) {
        await supabase.from("users").update({ name }).eq("id", data.user.id);
      }
    } catch {
      /* name is optional */
    }
  }
  return { ok: true };
}
