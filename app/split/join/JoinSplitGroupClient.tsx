"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resolveAuthenticated } from "@/lib/authSession";
import {
  clearSplitInviteRedirect,
  saveSplitInviteRedirect,
  saveSplitInviteToken,
} from "@/lib/splitAuthRedirect";
import {
  hasPwaOpenAttempted,
  isAndroidUserAgent,
  markPwaOpenAttempted,
  shouldOfferOpenInApp,
  tryOpenHttpsInAndroidApp,
} from "@/lib/pwaLaunch";
import {
  hasNativeOpenAttempted,
  markNativeOpenAttempted,
  nativeAppStoreUrl,
  openNativeApp,
  shouldTryNativeApp,
} from "@/lib/nativeAppLaunch";
import { useAuthStore } from "@/store/authStore";
import { useSplitStore } from "@/store/splitStore";
import { AppIcon } from "@/components/ui/AppIcon";
import BrandPageLoader from "@/components/ui/BrandPageLoader";

type JoinStatus = "checking" | "joining" | "open_app" | "success" | "error";

const JOIN_TIMEOUT_MS = 20_000;

async function joinWithRetry(
  payload: { token?: string; code?: string },
  attempts = 3,
) {
  let lastError = "Could not join group";
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), JOIN_TIMEOUT_MS);
    try {
      const response = await fetch("/api/split/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const result = (await response.json()) as {
        success?: boolean;
        groupId?: string;
        groupName?: string;
        error?: string;
      };

      if (response.ok && result.success && result.groupId) {
        return result;
      }

      lastError = result.error ?? lastError;
      if (response.status === 401 && i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 400 * (i + 1)));
        continue;
      }
      const err = new Error(lastError) as Error & { status?: number };
      err.status = response.status;
      throw err;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        throw new Error("Join timed out. Check your connection and try again.");
      }
      throw e;
    } finally {
      window.clearTimeout(timer);
    }
  }
  throw new Error(lastError);
}

function joinPath(token: string | null, code: string | null): string {
  if (typeof window !== "undefined") {
    return window.location.pathname + window.location.search;
  }
  if (token) return `/split/join?token=${encodeURIComponent(token)}`;
  return `/split/join?code=${encodeURIComponent(code!)}`;
}

/** This page with `app=0`, so returning from a failed app hand-off stays in the browser. */
function browserFallbackUrl(): string {
  const u = new URL(window.location.href);
  u.searchParams.set("app", "0");
  return u.toString();
}

/** Invite path without the browser-only `app` flag, for the native app. */
function nativeJoinPath(token: string | null, code: string | null): string {
  if (token) return `/split/join?token=${encodeURIComponent(token)}`;
  return `/split/join?code=${encodeURIComponent(code ?? "")}`;
}

function persistInvite(token: string | null, code: string | null) {
  if (token) saveSplitInviteToken(token);
  saveSplitInviteRedirect(joinPath(token, code));
}

export default function JoinSplitGroupClient() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params?.get("token") ?? null;
  const code = params?.get("code") ?? null;
  const stayInBrowser = params?.get("app") === "0";
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [status, setStatus] = useState<JoinStatus>("checking");
  const [message, setMessage] = useState("");
  const [groupName, setGroupName] = useState("");
  const attemptRef = useRef(0);
  const finishedKey = useRef<string | null>(null);

  const storeUrl = typeof window !== "undefined" ? nativeAppStoreUrl() : null;

  const continueInBrowser = () => {
    persistInvite(token, code);
    if (useAuthStore.getState().isLoggedIn) {
      window.location.replace(browserFallbackUrl());
      return;
    }
    const currentUrl = joinPath(token, code);
    router.replace(`/login?next=${encodeURIComponent(currentUrl)}`);
  };

  const openInApp = () => {
    persistInvite(token, code);
    if (typeof window === "undefined") return;
    if (shouldTryNativeApp()) {
      void openNativeApp(nativeJoinPath(token, code), browserFallbackUrl());
      return;
    }
    if (isAndroidUserAgent()) {
      tryOpenHttpsInAndroidApp(window.location.href);
      return;
    }
    setStatus("open_app");
  };

  useEffect(() => {
    if (!hasInitialized) return;
    if (!token && !code) {
      setStatus("error");
      setMessage("Invalid invite link");
      return;
    }

    const joinKey = token ? `token:${token}` : `code:${code}`;
    if (finishedKey.current === joinKey) return;

    const attempt = ++attemptRef.current;

    const process = async () => {
      setStatus("checking");

      const nativeKey = `native:${joinKey}`;
      if (
        !stayInBrowser &&
        shouldTryNativeApp() &&
        !hasNativeOpenAttempted(nativeKey)
      ) {
        markNativeOpenAttempted(nativeKey);
        const opened = await openNativeApp(
          nativeJoinPath(token, code),
          browserFallbackUrl(),
        );
        if (attempt !== attemptRef.current) return;
        if (opened) {
          setStatus("open_app");
          return;
        }
      }

      let authenticated = false;
      try {
        authenticated = await resolveAuthenticated();
      } catch {
        authenticated = useAuthStore.getState().isLoggedIn;
      }
      if (attempt !== attemptRef.current) return;

      if (!authenticated) {
        persistInvite(token, code);

        if (shouldOfferOpenInApp()) {
          if (
            isAndroidUserAgent() &&
            !hasPwaOpenAttempted(joinKey) &&
            typeof window !== "undefined"
          ) {
            markPwaOpenAttempted(joinKey);
            tryOpenHttpsInAndroidApp(window.location.href);
          }
          setStatus("open_app");
          return;
        }

        const currentUrl = joinPath(token, code);
        router.replace(`/login?next=${encodeURIComponent(currentUrl)}`);
        return;
      }

      setStatus("joining");

      try {
        const result = await joinWithRetry(token ? { token } : { code: code! });
        if (attempt !== attemptRef.current) return;

        finishedKey.current = joinKey;
        setGroupName(result.groupName ?? "group");
        clearSplitInviteRedirect();
        setStatus("success");

        // Refresh groups in the background — don't block leaving the join screen.
        const authUser = useAuthStore.getState().user;
        const userEmail = (authUser?.email ?? "").toLowerCase();
        if (authUser?.id && userEmail) {
          void useSplitStore
            .getState()
            .fetchGroups(authUser.id, userEmail, true);
        }

        window.setTimeout(() => {
          router.replace(`/split/${result.groupId}`);
        }, 800);
      } catch (err: unknown) {
        if (attempt !== attemptRef.current) return;
        const statusCode =
          err && typeof err === "object" && "status" in err
            ? Number((err as { status?: number }).status)
            : 0;
        if (statusCode === 401) {
          persistInvite(token, code);
          const currentUrl = joinPath(token, code);
          router.replace(`/login?next=${encodeURIComponent(currentUrl)}`);
          return;
        }
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Could not join group");
      }
    };

    void process();
  }, [hasInitialized, isLoggedIn, router, token, code, stayInBrowser]);

  const showLoader = status === "checking" || status === "joining";

  return (
    <div className="min-h-dvh bg-[#F7F7F4] px-6 py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-[#E8E6F0] bg-white p-8 text-center shadow-sm">
        {showLoader ? (
          <BrandPageLoader
            fullScreen={false}
            size="sm"
            minHeight={160}
            label={status === "joining" ? "Joining group…" : "Checking invite…"}
          />
        ) : null}

        {status === "open_app" ? (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#EEEDFE]">
              <AppIcon name="users" size={28} color="#534AB7" />
            </div>
            <div className="text-lg font-bold text-[#111110]">
              Open Finkoin to join
            </div>
            <div className="mt-2 text-sm leading-relaxed text-[#5F5E5A]">
              If you already use Finkoin on this phone, open the app to join
              with your existing login. New here? Continue in the browser —
              after you join, the group shows up in the app too.
            </div>
            <button
              type="button"
              onClick={openInApp}
              className="mt-6 w-full rounded-xl bg-[#534AB7] px-4 py-3 text-sm font-bold text-white"
            >
              Open in Finkoin app
            </button>
            {storeUrl ? (
              <a
                href={storeUrl}
                className="mt-3 block w-full rounded-xl border border-[#534AB7] bg-white px-4 py-3 text-sm font-bold text-[#534AB7]"
              >
                Get the Finkoin app
              </a>
            ) : null}
            <button
              type="button"
              onClick={continueInBrowser}
              className="mt-3 w-full rounded-xl border border-[#E8E6F0] bg-white px-4 py-3 text-sm font-bold text-[#534AB7]"
            >
              Continue in browser
            </button>
          </>
        ) : null}

        {status === "success" ? (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#EEEDFE]">
              <AppIcon name="checkCircle" size={28} color="#534AB7" />
            </div>
            <div className="text-lg font-bold text-[#111110]">
              Joined “{groupName}”
            </div>
            <div className="mt-2 text-sm text-[#9B9A94]">
              Taking you to the group…
            </div>
          </>
        ) : null}

        {status === "error" ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#EEEDFE]">
              <AppIcon name="alert" size={28} color="#534AB7" />
            </div>
            <div className="text-base font-bold text-[#111110]">
              Could not join group
            </div>
            <div className="mt-2 text-sm text-[#9B9A94]">{message}</div>
            <button
              type="button"
              onClick={() => {
                finishedKey.current = null;
                setMessage("");
                setStatus("checking");
                // Bump attempt + isLoggedIn dependency via a fresh process kick
                void (async () => {
                  attemptRef.current += 1;
                  const attempt = attemptRef.current;
                  const joinKey = token ? `token:${token}` : `code:${code}`;
                  setStatus("joining");
                  try {
                    const result = await joinWithRetry(
                      token ? { token } : { code: code! },
                    );
                    if (attempt !== attemptRef.current) return;
                    finishedKey.current = joinKey;
                    setGroupName(result.groupName ?? "group");
                    clearSplitInviteRedirect();
                    setStatus("success");
                    window.setTimeout(() => {
                      router.replace(`/split/${result.groupId}`);
                    }, 800);
                  } catch (err: unknown) {
                    if (attempt !== attemptRef.current) return;
                    setStatus("error");
                    setMessage(
                      err instanceof Error
                        ? err.message
                        : "Could not join group",
                    );
                  }
                })();
              }}
              className="mt-6 w-full rounded-xl bg-[#534AB7] px-4 py-3 text-sm font-bold text-white"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => router.push("/split")}
              className="mt-3 w-full rounded-xl border border-[#E8E6F0] bg-white px-4 py-3 text-sm font-bold text-[#534AB7]"
            >
              Go to Split
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
