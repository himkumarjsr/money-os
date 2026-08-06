import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { appStorage } from "@/lib/storage";
import {
  getNativeAppCallbackUri,
  getGoogleWebClientId,
  signInWithGoogleIdToken,
  signInWithGoogleSupabaseBrowser,
} from "@/lib/googleAuth";

// Re-export for login alerts / debug
export { getNativeAppCallbackUri };
export function getOAuthRedirectUri(): string {
  return getNativeAppCallbackUri();
}

// Required so the auth browser can close after OAuth.
WebBrowser.maybeCompleteAuthSession();

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  subscriptionTier: string;
  fkBalance: number;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  hasInitialized: boolean;
  lastRedirectUri: string | null;
  initAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  handleIncomingAuthUrl: (url: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

let authListenerStarted = false;

export async function createSessionFromUrl(url: string): Promise<void> {
  // Official Supabase + Expo pattern (params can be in query or hash).
  const { params, errorCode } = QueryParams.getQueryParams(url);
  console.log("[oauth] createSessionFromUrl keys", Object.keys(params || {}));

  if (errorCode) {
    throw new Error(String(errorCode));
  }

  const error =
    (params.error as string | undefined) ||
    (params.error_description as string | undefined);
  if (error) throw new Error(error);

  const code = params.code as string | undefined;
  if (code) {
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.warn("[oauth] exchangeCodeForSession failed", exchangeError);
      throw exchangeError;
    }
    if (!data.session) {
      throw new Error("No session returned after code exchange");
    }
    return;
  }

  const access_token = params.access_token as string | undefined;
  const refresh_token = (params.refresh_token as string | undefined) ?? "";
  if (access_token) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (sessionError) throw sessionError;
    return;
  }

  throw new Error(
    "No code or access_token in redirect URL. Close the browser and try Google sign-in again.",
  );
}

function waitForAuthDeepLink(timeoutMs = 8000): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (url: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      sub.remove();
      resolve(url);
    };

    const sub = Linking.addEventListener("url", ({ url }) => {
      if (
        url.includes("code=") ||
        url.includes("access_token") ||
        url.includes("auth/callback") ||
        url.startsWith("finkoin://")
      ) {
        finish(url);
      }
    });

    const timer = setTimeout(() => finish(null), timeoutMs);
  });
}

function mapAuthUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): User {
  const meta = user.user_metadata ?? {};
  const name =
    (meta.name as string | undefined) ||
    (meta.full_name as string | undefined) ||
    user.email?.split("@")[0] ||
    null;
  return {
    id: user.id,
    name,
    email: user.email || null,
    subscriptionTier: "free",
    fkBalance: 0,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoggedIn: false,
      isLoading: true,
      hasInitialized: false,
      lastRedirectUri: null,

      initAuth: async () => {
        set({ isLoading: true });
        try {
          if (!isSupabaseConfigured()) {
            set({
              user: null,
              isLoggedIn: false,
              isLoading: false,
              hasInitialized: true,
            });
            return;
          }

          const initial = await Linking.getInitialURL();
          if (
            initial &&
            (initial.includes("access_token") ||
              initial.includes("code=") ||
              initial.includes("auth/callback"))
          ) {
            try {
              await createSessionFromUrl(initial);
            } catch (e) {
              console.warn("initial OAuth url:", e);
            }
          }

          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();
          if (error) console.warn("getSession:", error.message);

          if (session?.user) {
            // Apply session first so UI unlocks; profile fetch is best-effort.
            set({
              user: mapAuthUser(session.user),
              isLoggedIn: true,
              isLoading: false,
              hasInitialized: true,
            });
            void get().refreshUser();
          } else {
            set({
              user: null,
              isLoggedIn: false,
              isLoading: false,
              hasInitialized: true,
            });
          }

          if (!authListenerStarted) {
            authListenerStarted = true;
            // Never await supabase.auth.* inside this callback (deadlock on RN).
            supabase.auth.onAuthStateChange((event, session) => {
              if (__DEV__) console.log("[auth] state change", event);
              setTimeout(() => {
                if (session?.user) {
                  set({
                    user: mapAuthUser(session.user),
                    isLoggedIn: true,
                    isLoading: false,
                    hasInitialized: true,
                  });
                  // Deferred profile enrichment — outside the auth lock
                  void get().refreshUser();
                } else if (event === "SIGNED_OUT") {
                  set({
                    user: null,
                    isLoggedIn: false,
                    isLoading: false,
                    hasInitialized: true,
                  });
                }
              }, 0);
            });

            Linking.addEventListener("url", ({ url }) => {
              if (
                url.includes("access_token") ||
                url.includes("code=") ||
                url.includes("auth/callback") ||
                url.startsWith("finkoin://")
              ) {
                void get().handleIncomingAuthUrl(url);
              }
            });
          }
        } catch (err) {
          console.warn("initAuth:", err);
          set({
            user: null,
            isLoggedIn: false,
            isLoading: false,
            hasInitialized: true,
          });
        }
      },

      handleIncomingAuthUrl: async (url: string) => {
        try {
          await createSessionFromUrl(url);
          await get().refreshUser();
          return {};
        } catch (e) {
          return {
            error:
              e instanceof Error
                ? e.message
                : "Could not finish Google sign-in",
          };
        }
      },

      refreshUser: async () => {
        try {
          // Prefer getSession (local, no network) then soft-validate with getUser
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const sessionUser = session?.user;
          if (!sessionUser) {
            set({
              user: null,
              isLoggedIn: false,
              isLoading: false,
              hasInitialized: true,
            });
            return;
          }

          // Baseline from session so login never blocks on profile network
          let next = mapAuthUser(sessionUser);

          try {
            const { data: profile } = await supabase
              .from("users")
              .select("name, subscription_tier, fk_balance")
              .eq("id", sessionUser.id)
              .maybeSingle();
            if (profile?.name) next = { ...next, name: profile.name };
            if (profile?.subscription_tier) {
              next = {
                ...next,
                subscriptionTier: profile.subscription_tier,
              };
            }
            if (typeof profile?.fk_balance === "number") {
              next = { ...next, fkBalance: profile.fk_balance };
            }
          } catch {
            /* profile optional */
          }

          set({
            user: next,
            isLoggedIn: true,
            isLoading: false,
            hasInitialized: true,
          });
        } catch (e) {
          console.warn("refreshUser:", e);
          set({ isLoading: false, hasInitialized: true });
        }
      },

      signIn: async (email, password) => {
        if (!isSupabaseConfigured()) {
          return { error: "Supabase is not configured. Check mobile/.env" };
        }
        try {
          const cleaned = email.trim().toLowerCase();
          if (__DEV__) console.log("[auth] signInWithPassword…", cleaned);
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleaned,
            password,
          });
          if (error) {
            console.warn("[auth] signIn error", error.message);
            return { error: error.message };
          }
          if (!data.session?.user) {
            return {
              error:
                "Login succeeded but no session returned. Check email confirmation in Supabase.",
            };
          }

          // Apply immediately — do not wait on refreshUser network or auth lock
          set({
            user: mapAuthUser(data.session.user),
            isLoggedIn: true,
            isLoading: false,
            hasInitialized: true,
          });
          void get().refreshUser();
          if (__DEV__) console.log("[auth] signIn OK", data.session.user.id);
          return {};
        } catch (e) {
          console.warn("[auth] signIn throw", e);
          return {
            error: e instanceof Error ? e.message : "Sign in failed",
          };
        }
      },

      signUp: async (name, email, password) => {
        if (!isSupabaseConfigured()) {
          return { error: "Supabase is not configured. Check mobile/.env" };
        }
        try {
          const cleaned = email.trim().toLowerCase();
          const { data, error } = await supabase.auth.signUp({
            email: cleaned,
            password,
            options: { data: { name } },
          });
          if (error) return { error: error.message };

          // If email confirmation is off, session is returned immediately
          if (data.session?.user) {
            set({
              user: mapAuthUser(data.session.user),
              isLoggedIn: true,
              isLoading: false,
              hasInitialized: true,
            });
            void get().refreshUser();
            return {};
          }

          return {
            error:
              "Check your email to confirm the account, then log in. (Or disable email confirm in Supabase → Auth → Providers for local testing.)",
          };
        } catch (e) {
          return {
            error: e instanceof Error ? e.message : "Sign up failed",
          };
        }
      },

      signInWithGoogle: async () => {
        if (!isSupabaseConfigured()) {
          return { error: "Supabase is not configured. Check mobile/.env" };
        }
        try {
          const nativeCallback = getNativeAppCallbackUri();
          set({ lastRedirectUri: nativeCallback });
          console.log("[oauth] nativeCallback =", nativeCallback);
          console.log(
            "[oauth] has Google web client id =",
            Boolean(getGoogleWebClientId()),
          );

          // 1) Preferred — Google ID token stays inside Expo (no finkoin.com)
          const idTokenAttempt = await signInWithGoogleIdToken();
          if (!idTokenAttempt.skipped) {
            if (!idTokenAttempt.ok) {
              return { error: idTokenAttempt.error || "Google sign-in failed" };
            }
            await get().refreshUser();
            if (!get().isLoggedIn) {
              const {
                data: { session },
              } = await supabase.auth.getSession();
              if (session?.user) {
                set({
                  user: mapAuthUser(session.user),
                  isLoggedIn: true,
                  isLoading: false,
                  hasInitialized: true,
                });
              }
            }
            if (!get().isLoggedIn) {
              return { error: "Google ID token sign-in returned no session" };
            }
            return {};
          }

          // 2) Fallback — Supabase OAuth with forced exp:// / finkoin:// return
          const deepLinkPromise = waitForAuthDeepLink(12_000);
          const browser = await signInWithGoogleSupabaseBrowser();

          if (!browser.ok) {
            // Maybe deep link still arrived after dismiss
            const late = await Promise.race([
              deepLinkPromise,
              new Promise<string | null>((r) =>
                setTimeout(() => r(null), 2500),
              ),
            ]);
            if (late) {
              await createSessionFromUrl(late);
              await get().refreshUser();
              if (get().isLoggedIn) return {};
            }
            return {
              error:
                browser.error ||
                "Google could not return to the app. Add the exp:// redirect in Supabase.",
            };
          }

          if (browser.authUrl) {
            await createSessionFromUrl(browser.authUrl);
          }
          await get().refreshUser();
          if (!get().isLoggedIn) {
            const late = await deepLinkPromise;
            if (late) {
              await createSessionFromUrl(late);
              await get().refreshUser();
            }
          }
          if (!get().isLoggedIn) {
            return { error: "Signed in with Google but session was empty" };
          }
          return {};
        } catch (e) {
          console.warn("[oauth] error", e);
          try {
            WebBrowser.dismissAuthSession();
          } catch {
            /* ignore */
          }
          return {
            error: e instanceof Error ? e.message : "Google sign-in failed",
          };
        }
      },

      signOut: async () => {
        try {
          await supabase.auth.signOut();
        } catch {
          /* ignore */
        }
        set({ user: null, isLoggedIn: false });
      },
    }),
    {
      name: "finkoin-auth-mobile",
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
      }),
    },
  ),
);
