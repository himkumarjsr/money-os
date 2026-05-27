"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getSupabase } from "@/lib/supabase";

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
      if (!isLoggedIn) {
        localStorage.setItem("finkoin_split_join_token", token);
        router.push(`/login?redirect=${encodeURIComponent(`/split/join?token=${encodeURIComponent(token)}`)}`);
        return;
      }

      try {
        const supabase = getSupabase();

        const { data: invite, error } = await supabase
          .from("split_invitations")
          .select("*")
          .eq("token", token)
          .eq("status", "pending")
          .single();

        if (error || !invite) {
          setStatus("error");
          setMessage("Invite not found or expired");
          return;
        }

        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
          setStatus("error");
          setMessage("This invite has expired");
          return;
        }

        setGroupName(invite.group_name ?? "group");

        await supabase.from("split_invitations").update({ status: "accepted" }).eq("id", invite.id);

        await supabase
          .from("split_group_members")
          .update({
            user_id: user!.id,
            display_name: user!.name || user!.email?.split("@")[0] || "Member",
            status: "active",
            joined_at: new Date().toISOString(),
          })
          .eq("group_id", invite.group_id)
          .eq("email", (user!.email ?? "").toLowerCase());

        setStatus("success");
        setTimeout(() => router.push(`/split/${invite.group_id}`), 1200);
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
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#EEEDFE] text-2xl">
              ⏳
            </div>
            <div className="text-lg font-bold text-[#111110]">Joining group…</div>
            <div className="mt-2 text-sm text-[#9B9A94]">Please wait.</div>
          </>
        ) : null}

        {status === "success" ? (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#E1F5EE] text-2xl">
              ✓
            </div>
            <div className="text-lg font-bold text-[#111110]">Joined “{groupName}”</div>
            <div className="mt-2 text-sm text-[#9B9A94]">Taking you to the group…</div>
          </>
        ) : null}

        {status === "error" ? (
          <>
            <div className="mb-4 text-4xl">❌</div>
            <div className="text-base font-bold text-[#111110]">Could not join group</div>
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
