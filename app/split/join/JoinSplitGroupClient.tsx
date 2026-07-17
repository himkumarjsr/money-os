"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resolveAuthenticated } from "@/lib/authSession";
import {
  saveSplitInviteRedirect,
  saveSplitInviteToken,
} from "@/lib/splitAuthRedirect";
import { useAuthStore } from "@/store/authStore";
import { useSplitStore } from "@/store/splitStore";
import { AppIcon } from "@/components/ui/AppIcon";

type JoinStatus = "loading" | "success" | "error";

export default function JoinSplitGroupClient() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params?.get("token") ?? null;
  const { user, isLoggedIn, hasInitialized } = useAuthStore();
  const [status, setStatus] = useState<JoinStatus>("loading");
  const [message, setMessage] = useState("");
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    if (!hasInitialized) return;
    if (!token) {
      setStatus("error");
      setMessage("Invalid invite link");
      return;
    }

    const process = async () => {
      const authenticated = await resolveAuthenticated();
      if (!authenticated) {
        saveSplitInviteToken(token);
        const currentUrl =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : `/split/join?token=${encodeURIComponent(token)}`;
        saveSplitInviteRedirect(currentUrl);
        router.replace(`/login?next=${encodeURIComponent(currentUrl)}`);
        return;
      }

      try {
        const response = await fetch("/api/split/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token }),
        });
        const result = (await response.json()) as {
          success?: boolean;
          groupId?: string;
          groupName?: string;
          error?: string;
        };

        if (!response.ok || !result.success || !result.groupId) {
          setStatus("error");
          setMessage(result.error ?? "Invite not found");
          return;
        }

        const userEmail = (user?.email ?? "").toLowerCase();
        setGroupName(result.groupName ?? "group");

        if (user?.id && userEmail) {
          await useSplitStore.getState().fetchGroups(user.id, userEmail, true);
        }

        setStatus("success");
        setTimeout(() => router.replace(`/split/${result.groupId}`), 1500);
      } catch (err: unknown) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Could not join group");
      }
    };

    void process();
  }, [hasInitialized, isLoggedIn, router, token, user]);

  return (
    <div className="min-h-dvh bg-[#F7F7F4] px-6 py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-[#E8E6F0] bg-white p-8 text-center shadow-sm">
        {status === "loading" ? (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#EEEDFE]">
              <AppIcon name="users" size={28} color="#534AB7" />
            </div>
            <div className="text-lg font-bold text-[#111110]">
              Joining group…
            </div>
            <div className="mt-2 text-sm text-[#9B9A94]">Please wait.</div>
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
