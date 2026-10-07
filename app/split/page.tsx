"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import SplitMarketingLanding from "@/components/landing/SplitMarketingLanding";
import InviteLinkShare from "@/components/split/InviteLinkShare";
import { AppIcon } from "@/components/ui/AppIcon";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import { Analytics } from "@/lib/analytics";
import { clearBodyScrollLocks, lockBodyScroll } from "@/lib/bodyScrollLock";
import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useSplitStore } from "@/store/splitStore";
import { uniqueChannelName } from "@/lib/realtimeChannel";

/**
 * Logged-out / crawlers: public marketing landing (SSR HTML).
 * Logged-in: Split app behind ProtectedGate.
 */
export default function SplitHomePage() {
  return (
    <SplitEntryClient>
      <SplitMarketingLanding />
    </SplitEntryClient>
  );
}

function SplitEntryClient({ children }: { children: ReactNode }) {
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);

  if (isLoggedIn && user?.id) {
    return (
      <ProtectedGate>
        <SplitHomeInner />
      </ProtectedGate>
    );
  }

  if (!hasInitialized || !isLoggedIn || !user?.id) {
    return <>{children}</>;
  }

  return <BrandPageLoader fullScreen={false} label="Loading…" />;
}

function SplitHomeInner() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const userId = user?.id ?? "";
  const email = (user?.email ?? "").toLowerCase();
  const name = user?.name ?? user?.email?.split("@")[0] ?? "You";

  const groups = useSplitStore((s) => s.groups);
  const loading = useSplitStore((s) => s.loading);
  const fetchGroups = useSplitStore((s) => s.fetchGroups);
  const createGroup = useSplitStore((s) => s.createGroup);
  const deleteGroup = useSplitStore((s) => s.deleteGroup);
  const inviteMember = useSplitStore((s) => s.inviteMember);

  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<"details" | "invite">("details");
  const [gName, setGName] = useState("");
  const [gEmoji, setGEmoji] = useState("");
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    if (!isLoggedIn || !userId || !email) return;

    void fetchGroups(userId, email, true);

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void fetchGroups(userId, email, true);
      }, 500);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) scheduleRefresh();
    };

    const handleFocus = () => {
      scheduleRefresh();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [email, fetchGroups, isLoggedIn, userId]);

  useEffect(() => {
    clearBodyScrollLocks();
  }, []);

  useEffect(() => {
    if (!createOpen) return;
    return lockBodyScroll();
  }, [createOpen]);

  useEffect(() => {
    if (!isLoggedIn || !userId || !email) return;

    const supabase = getSupabase();

    const channel = supabase
      .channel(uniqueChannelName(`my_groups:${userId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "split_group_members",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void fetchGroups(userId, email, true);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [email, fetchGroups, isLoggedIn, userId]);

  const headerStats = useMemo(() => {
    // Lightweight placeholder: balances are computed per-group page via RPC.
    // Keep header simple to avoid N+1 RPC calls.
    return {
      groups: groups.length,
    };
  }, [groups.length]);

  const resetCreateModal = () => {
    setCreateOpen(false);
    setCreateStep("details");
    setCreateError("");
    setGName("");
    setGEmoji("");
    setCreatedGroupId(null);
    setInviteLink("");
  };

  const openCreateModal = () => {
    setCreateError("");
    setCreateStep("details");
    setCreatedGroupId(null);
    setInviteLink("");
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!gName.trim() || !email || !user?.id) {
      setCreateError("Please enter a name.");
      return;
    }
    setBusy(true);
    setCreateError("");
    const { groupId, error } = await createGroup({
      name: gName.trim(),
      emoji: gEmoji.trim(),
      type: "general",
      userId: user.id,
      userEmail: email,
      userName: name,
    });
    if (error || !groupId) {
      setBusy(false);
      setCreateError(error ?? "Could not create. Please try again.");
      return;
    }

    Analytics.splitGroupCreated();
    setCreatedGroupId(groupId);

    const inviteRes = await inviteMember({
      groupId,
      groupName: gName.trim(),
      linkOnly: true,
    });
    setBusy(false);

    if (inviteRes.inviteUrl) {
      setInviteLink(inviteRes.inviteUrl);
      setCreateStep("invite");
      return;
    }

    setCreateError(
      inviteRes.error
        ? `Created, but invite link failed: ${inviteRes.error}`
        : "Created, but invite link could not be generated.",
    );
    setCreateStep("invite");
  };

  const finishCreate = () => {
    const id = createdGroupId;
    resetCreateModal();
    if (id) router.push(`/split/${id}`);
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    const ok = window.confirm(
      `Close "${groupName}"?\n\nThis closes the group for everyone. Only the group creator can do this. Your expense history is kept.`,
    );
    if (!ok) return;
    const okDelete = await deleteGroup(groupId);
    if (!okDelete) {
      window.alert(
        "Could not close group. Only the group creator can close it.",
      );
      return;
    }
  };

  return (
    <div className="min-h-dvh bg-[#F7F7F4] px-4 py-8 pb-[calc(env(safe-area-inset-bottom)+7.5rem)] sm:px-6">
      <div className="mx-auto max-w-3xl min-w-0">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => router.replace("/")}
            aria-label="Back"
            className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-[#534AB7]"
          >
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#EEEDFE] text-base font-bold leading-none"
              aria-hidden
            >
              ←
            </span>
            <span>Back</span>
          </button>
        </div>
        <div className="rounded-3xl bg-[#534AB7] px-6 py-6 text-white shadow-[0_14px_50px_rgba(83,74,183,0.25)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
                Finkoin Split
              </p>
              <h1 className="mt-2 text-2xl font-extrabold leading-tight">
                Split expenses with friends
              </h1>
              <p className="mt-2 text-sm text-white/80">
                ₹ first. No ads. Free forever.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="shrink-0 rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/25 hover:bg-white/20 min-h-[44px]"
            >
              + New group
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <div className="text-xs font-semibold text-white/75">Groups</div>
              <div className="mt-1 text-xl font-extrabold">
                {headerStats.groups}
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <div className="text-xs font-semibold text-white/75">
                Quick tip
              </div>
              <div className="mt-1 text-sm font-semibold">
                Add an expense → balances update instantly
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#9B9A94]">
            Your groups
          </h2>
          <Link href="/split" className="text-xs font-bold text-[#534AB7]">
            Refresh
          </Link>
        </div>

        <div className="mt-3 space-y-3">
          {loading ? (
            <div className="overflow-hidden rounded-2xl border border-[#E8E6F0] bg-white">
              <BrandPageLoader
                fullScreen={false}
                size="sm"
                minHeight={140}
                label="Loading…"
              />
            </div>
          ) : null}

          {!loading && groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E8E6F0] bg-white p-7 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEEDFE]">
                <AppIcon name="users" size={26} color="#534AB7" />
              </div>
              <div className="text-base font-bold text-[#111110]">
                No groups yet
              </div>
              <div className="mt-2 text-sm text-[#9B9A94]">
                Create a group for a trip, flat, office, or event.
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-5 rounded-xl bg-[#534AB7] px-5 py-3 text-sm font-bold text-white min-h-[44px]"
              >
                Create your first group
              </button>
            </div>
          ) : null}

          {!loading &&
            groups.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#E8E6F0] bg-white px-4 py-4 shadow-sm min-h-[72px]"
              >
                <button
                  type="button"
                  onClick={() => router.push(`/split/${g.id}`)}
                  className="flex min-w-0 flex-1 items-center gap-4 text-left min-h-[44px]"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEEDFE] text-2xl">
                    {g.emoji ? (
                      g.emoji
                    ) : (
                      <AppIcon name="users" size={22} color="#534AB7" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-base font-bold text-[#111110]">
                      {g.name}
                    </div>
                    <div className="mt-0.5 text-xs text-[#9B9A94]">INR</div>
                  </div>
                </button>

                <div className="flex shrink-0 items-center gap-2">
                  {g.created_by && g.created_by === (user?.id ?? userId) ? (
                    <button
                      type="button"
                      onClick={() => void handleDeleteGroup(g.id, g.name)}
                      className="rounded-lg border border-[#F5D0D0] px-2.5 py-1.5 text-xs font-bold text-[#C0392B] hover:bg-[#FFF4F4] min-h-[44px] min-w-[44px]"
                      title="Delete group"
                    >
                      Delete
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => router.push(`/split/${g.id}`)}
                    className="text-sm font-bold text-slate-400 min-h-[44px] min-w-[44px]"
                    aria-label={`Open ${g.name}`}
                  >
                    →
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {createOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            if (createStep === "invite") finishCreate();
            else resetCreateModal();
          }}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-group-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div
                  id="create-group-title"
                  className="text-base font-extrabold text-[#111110]"
                >
                  {createStep === "invite" ? "Invite friends" : "Create"}
                </div>
                <div className="mt-1 text-xs text-[#9B9A94]">
                  {createStep === "invite"
                    ? "Share this link on WhatsApp or copy it."
                    : "You’ll be added as admin."}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (createStep === "invite") finishCreate();
                  else resetCreateModal();
                }}
                className="rounded-xl bg-[#F7F7F4] px-3 py-2 text-sm font-bold text-[#534AB7]"
                aria-label="Close"
              >
                <AppIcon name="close" size={16} color="#534AB7" />
              </button>
            </div>

            {createStep === "details" ? (
              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#5F5E5A]">
                    Name
                  </label>
                  <input
                    value={gName}
                    onChange={(e) => setGName(e.target.value)}
                    placeholder="Goa trip / Flat expenses"
                    className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] px-3 text-base outline-none focus:border-[#534AB7]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#5F5E5A]">
                    Icon (optional)
                  </label>
                  <input
                    value={gEmoji}
                    onChange={(e) => setGEmoji(e.target.value)}
                    placeholder="Optional emoji"
                    className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] px-3 text-base outline-none focus:border-[#534AB7]"
                  />
                </div>

                {createError ? (
                  <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                    {createError}
                  </p>
                ) : null}

                <button
                  type="button"
                  disabled={busy || !gName.trim()}
                  onClick={() => void handleCreate()}
                  className="mt-2 min-h-[44px] w-full rounded-xl bg-[#534AB7] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
                >
                  {busy ? "Creating…" : "Create & get invite link"}
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <p className="text-sm font-semibold text-[#111110]">
                  “{gName.trim()}” is ready
                </p>
                {inviteLink ? (
                  <InviteLinkShare
                    inviteUrl={inviteLink}
                    groupName={gName.trim() || "Split"}
                  />
                ) : (
                  <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {createError ||
                      "Invite link unavailable. Open the split and tap Invite."}
                  </p>
                )}
                <button
                  type="button"
                  onClick={finishCreate}
                  className="min-h-[44px] w-full rounded-xl bg-[#534AB7] px-4 py-3 text-sm font-extrabold text-white"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
