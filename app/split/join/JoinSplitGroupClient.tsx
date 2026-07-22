"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resolveAuthenticated } from "@/lib/authSession";
import {
  clearSplitInviteRedirect,
  saveSplitInviteRedirect,
  saveSplitInviteToken,
} from "@/lib/splitAuthRedirect";
import { useAuthStore } from "@/store/authStore";
import { useSplitStore } from "@/store/splitStore";
import { AppIcon } from "@/components/ui/AppIcon";
import BrandPageLoader from "@/components/ui/BrandPageLoader";

type JoinStatus = "loading" | "success" | "error";

async function joinWithRetry(
  payload: { token?: string; code?: string },
  attempts = 3,
) {
  let lastError = "Could not join group";
  for (let i = 0; i < attempts; i++) {
    const response = await fetch("/api/split/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
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
    throw new Error(lastError);
  }
  throw new Error(lastError);
}

export default function JoinSplitGroupClient() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params?.get("token") ?? null;
  const code = params?.get("code") ?? null;
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [status, setStatus] = useState<JoinStatus>("loading");
  const [message, setMessage] = useState("");
  const [groupName, setGroupName] = useState("");
  const joinInFlight = useRef(false);
  const joinedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!hasInitialized) return;
    if (!token && !code) {
      setStatus("error");
      setMessage("Invalid invite link");
      return;
    }

    const joinKey = token ? `token:${token}` : `code:${code}`;
    if (joinedKey.current === joinKey || joinInFlight.current) return;

    const process = async () => {
      const authenticated = await resolveAuthenticated();
      if (!authenticated) {
        if (token) saveSplitInviteToken(token);
        const currentUrl =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : token
              ? `/split/join?token=${encodeURIComponent(token)}`
              : `/split/join?code=${encodeURIComponent(code!)}`;
        saveSplitInviteRedirect(currentUrl);
        router.replace(`/login?next=${encodeURIComponent(currentUrl)}`);
        return;
      }

      joinInFlight.current = true;
      setStatus("loading");

      try {
        const result = await joinWithRetry(token ? { token } : { code: code! });
        joinedKey.current = joinKey;
        setGroupName(result.groupName ?? "group");

        const authUser = useAuthStore.getState().user;
        const userEmail = (authUser?.email ?? "").toLowerCase();
        if (authUser?.id && userEmail) {
          await useSplitStore
            .getState()
            .fetchGroups(authUser.id, userEmail, true);
        }

        clearSplitInviteRedirect();
        setStatus("success");
        setTimeout(() => router.replace(`/split/${result.groupId}`), 1200);
      } catch (err: unknown) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Could not join group");
      } finally {
        joinInFlight.current = false;
      }
    };

    void process();
  }, [hasInitialized, isLoggedIn, router, token, code]);

  return (
    <div className="min-h-dvh bg-[#F7F7F4] px-6 py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-[#E8E6F0] bg-white p-8 text-center shadow-sm">
        {status === "loading" ? (
          <BrandPageLoader
            fullScreen={false}
            size="sm"
            minHeight={160}
            label="Joining group…"
          />
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
              onClick={() => router.push("/split")}
              className="mt-6 w-full rounded-xl bg-[#534AB7] px-4 py-3 text-sm font-bold text-white"
            >
              Go to Split
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
