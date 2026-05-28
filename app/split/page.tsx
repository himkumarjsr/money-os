"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { useAuthStore } from "@/store/authStore";
import { useSplitStore } from "@/store/splitStore";

export default function SplitHomePage() {
  return (
    <ProtectedGate>
      <SplitHomeInner />
    </ProtectedGate>
  );
}

function SplitHomeInner() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const email = (user?.email ?? "").toLowerCase();
  const name = user?.name ?? user?.email?.split("@")[0] ?? "You";

  const groups = useSplitStore((s) => s.groups);
  const loading = useSplitStore((s) => s.loading);
  const fetchGroups = useSplitStore((s) => s.fetchGroups);
  const createGroup = useSplitStore((s) => s.createGroup);

  const [createOpen, setCreateOpen] = useState(false);
  const [gName, setGName] = useState("");
  const [gEmoji, setGEmoji] = useState("👥");
  const [gType, setGType] = useState("general");
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    if (!email) return;
    void fetchGroups(email);
  }, [email, fetchGroups]);

  const headerStats = useMemo(() => {
    // Lightweight placeholder: balances are computed per-group page via RPC.
    // Keep header simple to avoid N+1 RPC calls.
    return {
      groups: groups.length,
    };
  }, [groups.length]);

  const openCreateModal = () => {
    setCreateError("");
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!gName.trim() || !email || !user?.id) {
      setCreateError("Please enter a group name.");
      return;
    }
    setBusy(true);
    setCreateError("");
    const { groupId, error } = await createGroup({
      name: gName.trim(),
      emoji: gEmoji.trim() || "👥",
      type: gType,
      userId: user.id,
      userEmail: email,
      userName: name,
    });
    setBusy(false);
    if (error) {
      setCreateError(error);
      return;
    }
    if (groupId) {
      setCreateOpen(false);
      setGName("");
      router.push(`/split/${groupId}`);
    } else {
      setCreateError("Could not create group. Please try again.");
    }
  };

  return (
    <main className="min-h-dvh bg-[#F7F7F4] px-4 py-8 pb-24 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl bg-[#534AB7] px-6 py-6 text-white shadow-[0_14px_50px_rgba(83,74,183,0.25)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Finkoin Split</p>
              <h1 className="mt-2 text-2xl font-extrabold leading-tight">Split expenses with friends</h1>
              <p className="mt-2 text-sm text-white/80">₹ first. No ads. Free forever.</p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="shrink-0 rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/25 hover:bg-white/20"
            >
              + New group
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <div className="text-xs font-semibold text-white/75">Groups</div>
              <div className="mt-1 text-xl font-extrabold">{headerStats.groups}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <div className="text-xs font-semibold text-white/75">Quick tip</div>
              <div className="mt-1 text-sm font-semibold">Add an expense → balances update instantly</div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#9B9A94]">Your groups</h2>
          <Link href="/split" className="text-xs font-bold text-[#534AB7]">
            Refresh
          </Link>
        </div>

        <div className="mt-3 space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-[#E8E6F0] bg-white p-5 text-sm text-slate-600">Loading…</div>
          ) : null}

          {!loading && groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E8E6F0] bg-white p-7 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEEDFE] text-2xl">
                👥
              </div>
              <div className="text-base font-bold text-[#111110]">No groups yet</div>
              <div className="mt-2 text-sm text-[#9B9A94]">Create a group for a trip, flat, office, or event.</div>
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-5 rounded-xl bg-[#534AB7] px-5 py-3 text-sm font-bold text-white"
              >
                Create your first group
              </button>
            </div>
          ) : null}

          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/split/${g.id}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-[#E8E6F0] bg-white px-5 py-4 shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEEDFE] text-xl">
                  {g.emoji || "💰"}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-bold text-[#111110]">{g.name}</div>
                  <div className="mt-0.5 text-xs text-[#9B9A94]">{(g.group_type || "general").toUpperCase()} · ₹ INR</div>
                </div>
              </div>
              <div className="text-sm font-bold text-slate-400">→</div>
            </Link>
          ))}
        </div>
      </div>

      {createOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setCreateOpen(false)}
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
                <div id="create-group-title" className="text-base font-extrabold text-[#111110]">
                  Create a group
                </div>
                <div className="mt-1 text-xs text-[#9B9A94]">You’ll be added as admin.</div>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl bg-[#F7F7F4] px-3 py-2 text-sm font-bold text-[#111110]"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#5F5E5A]">Group name</label>
                <input
                  value={gName}
                  onChange={(e) => setGName(e.target.value)}
                  placeholder="Test Trip"
                  className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] px-3 text-sm outline-none focus:border-[#534AB7]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#5F5E5A]">Emoji</label>
                  <input
                    value={gEmoji}
                    onChange={(e) => setGEmoji(e.target.value)}
                    placeholder="🏖️"
                    className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] px-3 text-sm outline-none focus:border-[#534AB7]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#5F5E5A]">Type</label>
                  <select
                    value={gType}
                    onChange={(e) => setGType(e.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] bg-white px-3 text-sm outline-none focus:border-[#534AB7]"
                  >
                    <option value="general">General</option>
                    <option value="trip">Trip</option>
                    <option value="flat">Flat</option>
                    <option value="office">Office</option>
                    <option value="event">Event</option>
                  </select>
                </div>
              </div>

              {createError ? (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{createError}</p>
              ) : null}

              <button
                type="button"
                disabled={busy || !gName.trim()}
                onClick={() => void handleCreate()}
                className="mt-2 w-full rounded-xl bg-[#534AB7] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
              >
                {busy ? "Creating…" : "Create group"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

