"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { getSupabase } from "@/lib/supabase";
import { formatIndian } from "@/lib/formatters";
import { useAuthStore } from "@/store/authStore";
import { getMyBalanceFromEdges, useSplitStore } from "@/store/splitStore";

export default function SplitGroupPage() {
  return (
    <ProtectedGate>
      <SplitGroupInner />
    </ProtectedGate>
  );
}

function SplitGroupInner() {
  const params = useParams<{ groupId: string }>();
  const groupId = params?.groupId;
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const userId = useAuthStore((s) => s.userId);
  const myEmail = (user?.email ?? "").toLowerCase();

  const loading = useSplitStore((s) => s.loading);
  const group = useSplitStore((s) => s.activeGroup);
  const expenses = useSplitStore((s) => s.expenses);
  const balances = useSplitStore((s) => s.balances);
  const fetchGroupDetail = useSplitStore((s) => s.fetchGroupDetail);
  const inviteMember = useSplitStore((s) => s.inviteMember);
  const settleUp = useSplitStore((s) => s.settleUp);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    void fetchGroupDetail(groupId);
  }, [fetchGroupDetail, groupId]);

  useEffect(() => {
    if (!groupId) return;
    const supabase = getSupabase();
    const sub = supabase
      .channel(`split:${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "split_expenses", filter: `group_id=eq.${groupId}` },
        () => {
          void fetchGroupDetail(groupId);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(sub);
    };
  }, [fetchGroupDetail, groupId]);

  const myNet = useMemo(() => getMyBalanceFromEdges(myEmail, balances), [balances, myEmail]);

  const headerTotals = useMemo(() => {
    const youOwe = balances
      .filter((b) => b.from_email?.toLowerCase() === myEmail)
      .reduce((s, b) => s + Number(b.amount ?? 0), 0);
    const youAreOwed = balances
      .filter((b) => b.to_email?.toLowerCase() === myEmail)
      .reduce((s, b) => s + Number(b.amount ?? 0), 0);
    return { youOwe, youAreOwed };
  }, [balances, myEmail]);

  const openInviteModal = () => {
    setInviteEmail("");
    setInviteLink("");
    setInviteMsg("");
    setInviteOpen(true);
  };

  const handleSendInvite = async () => {
    const actorId = user?.id ?? userId;
    const email = inviteEmail.trim();
    if (!groupId || !group?.name || !actorId) return;
    if (!email) {
      setInviteMsg("Enter an email address.");
      return;
    }

    setInviteBusy(true);
    setInviteLink("");
    setInviteMsg("");

    const res = await inviteMember({
      groupId,
      groupName: group.name,
      invitedEmail: email,
      invitedByName: user?.name || user?.email?.split("@")[0] || "Finkoin user",
      invitedById: actorId,
    });
    setInviteBusy(false);

    if (res.error) {
      setInviteMsg(res.error);
      return;
    }

    if (res.emailSent) {
      setInviteMsg(`Invite sent to ${email} ✓`);
      setInviteEmail("");
      setInviteLink("");
    } else if (res.inviteUrl) {
      setInviteLink(res.inviteUrl);
      setInviteMsg(
        res.emailError
          ? `${res.emailError} Share this link manually:`
          : "Email not configured. Share this link manually:",
      );
    } else {
      setInviteMsg("Invite created.");
    }

    void fetchGroupDetail(groupId);
  };

  const handleSettle = async () => {
    const actorId = user?.id ?? userId;
    if (!groupId || !actorId || !myEmail) return;
    const toEmail = window.prompt("Settle up to (email)");
    if (!toEmail) return;
    const amountRaw = window.prompt("Amount (₹)");
    const amount = Number(amountRaw ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert("Enter a valid amount.");
      return;
    }
    const res = await settleUp({ groupId, toEmail, amount, userId: actorId, userEmail: myEmail });
    if (res.error) window.alert(res.error);
  };

  const tone = myNet > 0 ? "owed" : myNet < 0 ? "owe" : "settled";
  const netLabel = tone === "owed" ? "You are owed" : tone === "owe" ? "You owe" : "All settled";
  const netColor = tone === "owed" ? "#1D9E75" : tone === "owe" ? "#E24B4A" : "#9B9A94";

  return (
    <main className="min-h-dvh bg-[#F7F7F4] px-4 py-8 pb-28 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl bg-[#534AB7] px-6 py-6 text-white shadow-[0_14px_50px_rgba(83,74,183,0.25)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Link href="/split" className="text-xs font-bold text-white/80 hover:text-white">
                ← Back
              </Link>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-xl ring-1 ring-white/20">
                  {group?.emoji || "💰"}
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-extrabold">{group?.name || "Group"}</h1>
                  <div className="mt-0.5 text-xs text-white/80">
                    {group?.members?.length ?? 0} members · INR
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={openInviteModal}
              className="shrink-0 rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/25 hover:bg-white/20"
            >
              Invite
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <div className="text-[11px] font-semibold text-white/75">You owe</div>
              <div className="mt-1 text-lg font-extrabold">₹{formatIndian(Math.round(headerTotals.youOwe))}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <div className="text-[11px] font-semibold text-white/75">You are owed</div>
              <div className="mt-1 text-lg font-extrabold">₹{formatIndian(Math.round(headerTotals.youAreOwed))}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <div className="text-[11px] font-semibold text-white/75">{netLabel}</div>
              <div className="mt-1 text-lg font-extrabold" style={{ color: netColor }}>
                ₹{formatIndian(Math.round(Math.abs(myNet)))}
              </div>
            </div>
          </div>
        </div>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#9B9A94]">Who owes whom</h2>
            <button
              type="button"
              onClick={() => groupId && void fetchGroupDetail(groupId)}
              className="text-xs font-bold text-[#534AB7]"
            >
              Refresh
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {loading ? (
              <div className="rounded-2xl border border-[#E8E6F0] bg-white p-5 text-sm text-slate-600">Loading…</div>
            ) : null}

            {!loading && balances.length === 0 ? (
              <div className="rounded-2xl border border-[#E8E6F0] bg-white p-6 text-sm text-[#5F5E5A]">
                No pending balances. Add an expense to start splitting.
              </div>
            ) : null}

            {balances.map((b, idx) => (
              <div key={`${b.from_email}-${b.to_email}-${idx}`} className="rounded-2xl border border-[#E8E6F0] bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-[#111110]">
                      {b.from_name} <span className="text-slate-400">→</span> {b.to_name}
                    </div>
                    <div className="mt-1 text-xs text-[#9B9A94]">
                      {b.from_email} pays {b.to_email}
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-extrabold text-[#111110]">₹{formatIndian(Math.round(Number(b.amount ?? 0)))}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#9B9A94]">Expenses</h2>
          <div className="mt-3 space-y-2">
            {expenses.length === 0 && !loading ? (
              <div className="rounded-2xl border border-[#E8E6F0] bg-white p-6 text-sm text-[#5F5E5A]">
                No expenses yet.
              </div>
            ) : null}

            {expenses.map((e) => {
              const myShare = (e.shares ?? [])
                .filter((s) => s.email?.toLowerCase() === myEmail)
                .reduce((sum, s) => sum + Number(s.share_amount ?? 0), 0);
              return (
                <div key={e.id} className="rounded-2xl border border-[#E8E6F0] bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-base font-bold text-[#111110]">{e.title}</div>
                      <div className="mt-1 text-xs text-[#9B9A94]">
                        Paid by <span className="font-semibold text-[#5F5E5A]">{e.paid_by_name}</span> · {e.expense_date}
                      </div>
                      <div className="mt-2 text-xs text-[#9B9A94]">
                        Your share: <span className="font-bold text-[#111110]">₹{formatIndian(Math.round(myShare))}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-extrabold text-[#111110]">₹{formatIndian(Math.round(Number(e.amount ?? 0)))}</div>
                      <div className="mt-1 text-[11px] font-semibold text-[#9B9A94] uppercase tracking-wide">
                        {e.category || "general"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {inviteOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setInviteOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-member-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div id="invite-member-title" className="text-base font-extrabold text-[#111110]">
                  Invite member
                </div>
                <div className="mt-1 text-xs text-[#9B9A94]">They can join via email or invite link.</div>
              </div>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="rounded-xl bg-[#F7F7F4] px-3 py-2 text-sm font-bold text-[#111110]"
              >
                ✕
              </button>
            </div>

            <div className="mt-5">
              <label className="text-xs font-semibold text-[#5F5E5A]">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="friend@example.com"
                className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] px-3 text-sm outline-none focus:border-[#534AB7]"
              />
            </div>

            {inviteMsg ? (
              <p className="mt-3 text-sm font-medium text-[#5F5E5A]">{inviteMsg}</p>
            ) : null}

            {inviteLink ? (
              <div
                style={{
                  background: "#F7F7F4",
                  borderRadius: 10,
                  padding: "10px 12px",
                  marginTop: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    fontSize: 11,
                    color: "#534AB7",
                    wordBreak: "break-all",
                    fontFamily: "monospace",
                  }}
                >
                  {inviteLink}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(inviteLink);
                    setInviteMsg("Link copied!");
                    setInviteLink("");
                  }}
                  style={{
                    background: "#534AB7",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Copy
                </button>
              </div>
            ) : null}

            <button
              type="button"
              disabled={inviteBusy || !inviteEmail.trim()}
              onClick={() => void handleSendInvite()}
              className="mt-5 w-full rounded-xl bg-[#534AB7] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
            >
              {inviteBusy ? "Sending…" : "Send invite"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="fixed bottom-0 left-0 right-0 z-[55] border-t border-[#E8E6F0] bg-white pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 shadow-[0_-4px_24px_rgba(30,30,60,0.06)]">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => void handleSettle()}
            className="h-12 flex-1 rounded-2xl border border-[#E8E6F0] bg-[#F7F7F4] text-sm font-extrabold text-[#111110]"
          >
            Settle up
          </button>
          <button
            type="button"
            onClick={() => router.push(`/split/${groupId}/add-expense`)}
            className="h-12 flex-1 rounded-2xl bg-[#534AB7] text-sm font-extrabold text-white shadow-[0_10px_30px_rgba(83,74,183,0.25)]"
          >
            + Add expense
          </button>
        </div>
      </div>
    </main>
  );
}

