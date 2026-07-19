"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import InviteLinkShare from "@/components/split/InviteLinkShare";
import { TrackerIcon } from "@/components/tracker/TrackerIcons";
import { AppIcon } from "@/components/ui/AppIcon";
import { BackHref } from "@/components/ui/BackLink";
import { Analytics } from "@/lib/analytics";
import { clearBodyScrollLocks, lockBodyScroll } from "@/lib/bodyScrollLock";
import { formatIndian } from "@/lib/formatters";
import { getSupabase } from "@/lib/supabase";
import type { TrackerIconName } from "@/lib/tracker-categories";
import { useAuthStore } from "@/store/authStore";
import { getMyNetBalance, useSplitStore } from "@/store/splitStore";

const SPLIT_CATEGORY_ICON: Record<string, TrackerIconName> = {
  food: "utensils",
  transport: "cab",
  accommodation: "building",
  entertainment: "party",
  shopping: "cart",
  utilities: "bolt",
  medical: "pill",
  other: "package",
  general: "package",
};

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
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const loading = useSplitStore((s) => s.loading);
  const group = useSplitStore((s) => s.activeGroup);
  const expenses = useSplitStore((s) => s.expenses);
  const settlements = useSplitStore((s) => s.settlements);
  const balances = useSplitStore((s) => s.balances);
  const netBalances = useSplitStore((s) => s.netBalances);
  const fetchGroupDetail = useSplitStore((s) => s.fetchGroupDetail);
  const inviteMember = useSplitStore((s) => s.inviteMember);
  const settleUp = useSplitStore((s) => s.settleUp);
  const deleteExpense = useSplitStore((s) => s.deleteExpense);
  const deleteGroup = useSplitStore((s) => s.deleteGroup);
  const leaveGroup = useSplitStore((s) => s.leaveGroup);

  const [activeTab, setActiveTab] = useState<
    "expenses" | "members" | "settlements"
  >("expenses");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(
    null,
  );
  const [deletingExpenseBusy, setDeletingExpenseBusy] = useState(false);

  const [settleOpen, setSettleOpen] = useState(false);
  const [settleToEmail, setSettleToEmail] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleBusy, setSettleBusy] = useState(false);
  const [settleMsg, setSettleMsg] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "upi" | "cash" | "bank" | "other"
  >("upi");
  const [upiNote, setUpiNote] = useState("");

  useEffect(() => {
    if (!groupId) return;
    void fetchGroupDetail(groupId);
  }, [fetchGroupDetail, groupId]);

  useEffect(() => {
    if (!groupId || !isLoggedIn) return;
    const supabase = getSupabase();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      // Debounce realtime storms — rapid INSERT/UPDATE bursts freeze PWA scroll.
      refreshTimer = setTimeout(() => {
        void fetchGroupDetail(groupId);
      }, 400);
    };
    const sub = supabase
      .channel(`split:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "split_expenses",
          filter: `group_id=eq.${groupId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "split_expense_shares",
          filter: `group_id=eq.${groupId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "split_settlements",
          filter: `group_id=eq.${groupId}`,
        },
        refresh,
      )
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(sub);
    };
  }, [fetchGroupDetail, groupId, isLoggedIn]);

  // Ensure document scroll works on enter (clears stuck modal locks).
  useEffect(() => {
    clearBodyScrollLocks();
  }, []);

  // Lock page scroll while modals are open (critical for iOS PWA).
  useEffect(() => {
    const locked =
      inviteOpen ||
      settleOpen ||
      showDeleteConfirm ||
      Boolean(deletingExpenseId);
    if (!locked) return;
    return lockBodyScroll();
  }, [inviteOpen, settleOpen, showDeleteConfirm, deletingExpenseId]);

  const siteUrl =
    (typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL) ||
    "https://www.finkoin.com";
  const groupInviteLink = group?.invite_code
    ? `${siteUrl}/split/join?code=${encodeURIComponent(group.invite_code)}`
    : "";

  const myNet = useMemo(
    () => getMyNetBalance(myEmail, netBalances),
    [netBalances, myEmail],
  );

  const headerTotals = useMemo(() => {
    const youOwe = balances
      .filter((b) => b.from_email?.toLowerCase() === myEmail)
      .reduce((s, b) => s + Number(b.amount ?? 0), 0);
    const youAreOwed = balances
      .filter((b) => b.to_email?.toLowerCase() === myEmail)
      .reduce((s, b) => s + Number(b.amount ?? 0), 0);
    return { youOwe, youAreOwed };
  }, [balances, myEmail]);

  const myOwedEdges = useMemo(
    () => balances.filter((b) => b.from_email?.toLowerCase() === myEmail),
    [balances, myEmail],
  );

  const openInviteModal = () => {
    setInviteEmail("");
    setInviteLink("");
    setInviteMsg("");
    setInviteOpen(true);
    if (!groupId || !group?.name) return;
    setInviteBusy(true);
    void inviteMember({
      groupId,
      groupName: group.name,
      linkOnly: true,
    }).then((res) => {
      setInviteBusy(false);
      if (res.error) {
        setInviteMsg(res.error);
        return;
      }
      if (res.inviteUrl) {
        setInviteLink(res.inviteUrl);
        Analytics.splitInviteSent();
      }
    });
  };

  const handleSendInvite = async () => {
    const email = inviteEmail.trim();
    if (!groupId || !group?.name) return;
    if (!email) {
      setInviteMsg("Enter an email address.");
      return;
    }

    setInviteBusy(true);
    setInviteMsg("");

    const res = await inviteMember({
      groupId,
      groupName: group.name,
      invitedEmail: email,
      invitedByName: user?.name || user?.email?.split("@")[0] || "Finkoin user",
      invitedById: user?.id ?? userId ?? undefined,
    });
    setInviteBusy(false);

    if (res.error) {
      setInviteMsg(res.error);
      return;
    }

    if (res.emailSent) {
      Analytics.splitInviteSent();
      setInviteMsg(`Invite sent to ${email} ✓`);
      setInviteEmail("");
    } else if (res.inviteUrl) {
      setInviteLink(res.inviteUrl);
      setInviteMsg(
        res.emailError
          ? `${res.emailError} Share the link below instead:`
          : "Email not sent — share the link below:",
      );
    } else {
      setInviteMsg("Invite created.");
    }

    void fetchGroupDetail(groupId);
  };

  const openSettle = (toEmail?: string, amount?: number) => {
    setSettleMsg("");
    setSettleBusy(false);
    setPaymentMethod("upi");
    setUpiNote("");
    const firstOwed = myOwedEdges[0];
    setSettleToEmail(toEmail ?? firstOwed?.to_email ?? "");
    setSettleAmount(
      amount != null
        ? String(Math.round(amount))
        : firstOwed
          ? String(Math.round(Number(firstOwed.amount ?? 0)))
          : "",
    );
    setSettleOpen(true);
  };

  const handleConfirmSettle = async () => {
    const actorId = user?.id ?? userId;
    if (!groupId || !actorId || !myEmail) return;
    const toEmail = settleToEmail.trim().toLowerCase();
    const amount = Number(settleAmount);
    if (!toEmail) {
      setSettleMsg("Choose who you paid.");
      return;
    }
    if (toEmail === myEmail) {
      setSettleMsg("You cannot settle up with yourself.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setSettleMsg("Enter a valid amount.");
      return;
    }
    setSettleBusy(true);
    const res = await settleUp({
      groupId,
      toEmail,
      amount,
      userId: actorId,
      userEmail: myEmail,
      paymentMethod,
      notes:
        paymentMethod === "upi" && upiNote.trim() ? upiNote.trim() : undefined,
    });
    setSettleBusy(false);
    if (res.error) {
      setSettleMsg(res.error);
      return;
    }
    setSettleOpen(false);
    setActiveTab("settlements");
  };

  const otherMembers = useMemo(
    () =>
      (group?.members ?? []).filter((m) => m.email?.toLowerCase() !== myEmail),
    [group?.members, myEmail],
  );

  const isCreator =
    Boolean(group?.created_by) && group?.created_by === (user?.id ?? userId);

  const handleConfirmDeleteExpense = async () => {
    if (!groupId || !deletingExpenseId) return;
    setDeletingExpenseBusy(true);
    const res = await deleteExpense(groupId, deletingExpenseId);
    setDeletingExpenseBusy(false);
    if (res.error) {
      window.alert(res.error);
      return;
    }
    setDeletingExpenseId(null);
  };

  const handleLeaveOrRemove = async (email?: string) => {
    if (!groupId) return;
    const res = await leaveGroup(groupId, email);
    if (!res.success) {
      const amt =
        res.amount != null
          ? ` (≈ ₹${formatIndian(Math.round(res.amount))})`
          : "";
      window.alert((res.error || "Could not update member") + amt);
      return;
    }
    if (!email) {
      router.push("/split");
      return;
    }
    void fetchGroupDetail(groupId);
  };

  const handleDeleteGroup = async () => {
    if (!groupId || !group?.name) return;
    setDeleting(true);
    const ok = await deleteGroup(groupId);
    setDeleting(false);
    if (!ok) {
      window.alert("Could not delete group.");
      return;
    }
    setShowDeleteConfirm(false);
    router.push("/split");
  };

  const tone = myNet > 0 ? "owed" : myNet < 0 ? "owe" : "settled";
  const netLabel =
    tone === "owed"
      ? "You are owed"
      : tone === "owe"
        ? "You owe"
        : "All settled";
  const netColor =
    tone === "owed" ? "#1D9E75" : tone === "owe" ? "#E24B4A" : "#9B9A94";

  return (
    <div className="min-h-dvh bg-[#F7F7F4] px-4 py-8 pb-[calc(env(safe-area-inset-bottom)+7.5rem)] sm:px-6">
      <div className="mx-auto max-w-3xl min-w-0">
        <div className="rounded-3xl bg-[#534AB7] px-4 py-6 text-white shadow-[0_14px_50px_rgba(83,74,183,0.25)] sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <BackHref
                href="/split"
                label="Back"
                className="text-white [&_span:first-child]:bg-white/15 [&_span:last-child]:text-white/90"
              />
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-xl ring-1 ring-white/20">
                  {group?.emoji ? (
                    group.emoji
                  ) : (
                    <AppIcon name="users" size={22} color="#FFFFFF" />
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-extrabold">
                    {group?.name || "Group"}
                  </h1>
                  <div className="mt-0.5 text-xs text-white/80">
                    {group?.members?.length ?? 0} members · INR
                  </div>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {isCreator ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex h-[44px] w-[44px] items-center justify-center rounded-xl bg-white/15 text-lg font-bold text-white ring-1 ring-white/20 hover:bg-white/15"
                >
                  ...
                </button>
              ) : null}
              <button
                type="button"
                onClick={openInviteModal}
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/25 hover:bg-white/20 min-h-[44px]"
              >
                Invite
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <div className="text-[11px] font-semibold text-white/75">
                You owe
              </div>
              <div className="mt-1 text-lg font-extrabold">
                ₹{formatIndian(Math.round(headerTotals.youOwe))}
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <div className="text-[11px] font-semibold text-white/75">
                You are owed
              </div>
              <div className="mt-1 text-lg font-extrabold">
                ₹{formatIndian(Math.round(headerTotals.youAreOwed))}
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <div className="text-[11px] font-semibold text-white/75">
                {netLabel}
              </div>
              <div
                className="mt-1 text-lg font-extrabold"
                style={{ color: netColor }}
              >
                ₹{formatIndian(Math.round(Math.abs(myNet)))}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => openSettle()}
              className="h-12 rounded-2xl border border-white/25 bg-white/15 text-sm font-extrabold text-white ring-1 ring-white/20 hover:bg-white/20 min-h-[44px]"
            >
              Settle up
            </button>
            {groupId ? (
              <Link
                href={`/split/${groupId}/add-expense`}
                data-testid="add-expense-link"
                className="flex h-12 min-h-[44px] items-center justify-center rounded-2xl bg-white text-sm font-extrabold text-[#534AB7] shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
              >
                + Add expense
              </Link>
            ) : (
              <span className="flex h-12 min-h-[44px] items-center justify-center rounded-2xl bg-white/70 text-sm font-extrabold text-[#534AB7]">
                + Add expense
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex rounded-2xl border border-[#E8E6F0] bg-white">
          {(["expenses", "members", "settlements"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="h-11 flex-1 border-b-2 text-sm font-semibold capitalize"
              style={{
                color: activeTab === tab ? "#534AB7" : "#9B9A94",
                borderBottomColor:
                  activeTab === tab ? "#534AB7" : "transparent",
                background: "transparent",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "expenses" ? (
          <>
            <section className="mt-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-[#9B9A94]">
                    Simplified settle-up
                  </h2>
                  <p className="mt-1 text-xs text-[#9B9A94]">
                    Fewest payments to clear everyone.
                  </p>
                </div>
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
                  <div className="rounded-2xl border border-[#E8E6F0] bg-white p-5 text-sm text-slate-600">
                    Loading…
                  </div>
                ) : null}

                {!loading && balances.length === 0 ? (
                  <div className="rounded-2xl border border-[#E8E6F0] bg-white p-6 text-sm text-[#5F5E5A]">
                    All settled up. Add an expense to start splitting.
                  </div>
                ) : null}

                {balances.map((b, idx) => {
                  const iPay = b.from_email?.toLowerCase() === myEmail;
                  return (
                    <div
                      key={`${b.from_email}-${b.to_email}-${idx}`}
                      className="rounded-2xl border border-[#E8E6F0] bg-white p-5 min-h-[64px]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-[#111110]">
                            {iPay ? "You" : b.from_name}{" "}
                            <span className="text-slate-400">→</span>{" "}
                            {b.to_name}
                          </div>
                          <div className="mt-1 text-xs text-[#9B9A94]">
                            {iPay ? "You pay" : `${b.from_name} pays`}{" "}
                            {b.to_name}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <div className="text-sm font-extrabold text-[#111110]">
                            ₹{formatIndian(Math.round(Number(b.amount ?? 0)))}
                          </div>
                          {iPay ? (
                            <button
                              type="button"
                              onClick={() =>
                                openSettle(b.to_email, Number(b.amount ?? 0))
                              }
                              className="rounded-xl bg-[#534AB7] px-3 py-2 text-xs font-extrabold text-white min-h-[44px]"
                            >
                              Settle
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {netBalances.some((n) => Math.abs(n.net) > 0.5) ? (
              <section className="mt-8">
                <h2 className="text-sm font-bold uppercase tracking-wide text-[#9B9A94]">
                  Balances
                </h2>
                <div className="mt-3 space-y-2">
                  {netBalances
                    .filter((n) => Math.abs(n.net) > 0.5)
                    .map((n) => {
                      const isMe = n.email === myEmail;
                      const owed = n.net > 0;
                      return (
                        <div
                          key={n.email}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-[#E8E6F0] bg-white px-5 py-4"
                        >
                          <div className="min-w-0 truncate text-sm font-bold text-[#111110]">
                            {isMe ? "You" : n.name}
                          </div>
                          <div
                            className="shrink-0 text-sm font-extrabold"
                            style={{ color: owed ? "#1D9E75" : "#E24B4A" }}
                          >
                            {owed ? "gets back" : "owes"} ₹
                            {formatIndian(Math.round(Math.abs(n.net)))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </section>
            ) : null}

            <section className="mt-8">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#9B9A94]">
                Expenses
              </h2>
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
                  const isExpenseCreator = Boolean(
                    (user?.id ?? userId) &&
                    e.created_by === (user?.id ?? userId),
                  );
                  return (
                    <div
                      key={e.id}
                      className="rounded-2xl border border-[#E8E6F0] bg-white p-5 min-h-[64px]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate text-base font-bold text-[#111110]">
                            {e.title}
                          </div>
                          <div className="mt-1 text-xs text-[#9B9A94]">
                            Paid by{" "}
                            <span className="font-semibold text-[#5F5E5A]">
                              {e.paid_by_name}
                            </span>{" "}
                            · {e.expense_date}
                          </div>
                          <div className="mt-2 text-xs text-[#9B9A94]">
                            Your share:{" "}
                            <span className="font-bold text-[#111110]">
                              ₹{formatIndian(Math.round(myShare))}
                            </span>
                          </div>
                          {isExpenseCreator && groupId ? (
                            <div className="mt-2 flex gap-1.5">
                              <Link
                                href={`/split/${groupId}/add-expense?edit=${e.id}`}
                                className="rounded-md bg-[#EEEDFE] px-2 py-1 text-[11px] font-bold text-[#534AB7]"
                              >
                                Edit
                              </Link>
                              <button
                                type="button"
                                onClick={() => setDeletingExpenseId(e.id)}
                                className="rounded-md bg-[#FCEBEB] px-2 py-1 text-[11px] font-bold text-[#E24B4A]"
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-extrabold text-[#111110]">
                            ₹{formatIndian(Math.round(Number(e.amount ?? 0)))}
                          </div>
                          <div className="mt-1 flex items-center justify-end gap-1 text-[11px] font-semibold text-[#9B9A94] uppercase tracking-wide">
                            <TrackerIcon
                              name={
                                SPLIT_CATEGORY_ICON[e.category ?? "general"] ??
                                "package"
                              }
                              size={13}
                              color="#9B9A94"
                            />
                            {e.category || "general"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        ) : null}

        {activeTab === "members" ? (
          <section className="mt-6">
            <div className="overflow-hidden rounded-2xl border border-[#E8E6F0] bg-white">
              {(group?.members ?? []).map((member, i, arr) => {
                const email = member.email.toLowerCase();
                const isMe = email === myEmail;
                const initials = (member.display_name || email)
                  .substring(0, 2)
                  .toUpperCase();
                return (
                  <div
                    key={member.id || email}
                    className="flex items-center gap-3 px-4 py-3.5"
                    style={{
                      borderBottom:
                        i < arr.length - 1 ? "1px solid #F7F7F4" : "none",
                    }}
                  >
                    <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#EEEDFE] text-[13px] font-bold text-[#534AB7]">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-[#111110]">
                        {isMe
                          ? `${member.display_name} (You)`
                          : member.display_name}
                      </div>
                      <div className="truncate text-[11px] text-[#9B9A94]">
                        {member.role} · {member.email}
                      </div>
                    </div>
                    {member.role !== "admin" && isCreator && !isMe ? (
                      <button
                        type="button"
                        onClick={() => void handleLeaveOrRemove(member.email)}
                        className="rounded-md bg-[#FCEBEB] px-2.5 py-1 text-[11px] font-bold text-[#E24B4A]"
                      >
                        Remove
                      </button>
                    ) : null}
                    {isMe && !isCreator ? (
                      <button
                        type="button"
                        onClick={() => void handleLeaveOrRemove()}
                        className="rounded-md bg-[#FCEBEB] px-2.5 py-1 text-[11px] font-bold text-[#E24B4A]"
                      >
                        Leave
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {activeTab === "settlements" ? (
          <section className="mt-6">
            {settlements.length === 0 ? (
              <div className="rounded-2xl border border-[#E8E6F0] bg-white px-6 py-10 text-center text-sm text-[#9B9A94]">
                No settlements yet
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#E8E6F0] bg-white">
                {settlements.map((s, i) => {
                  const isFromMe = s.from_email?.toLowerCase() === myEmail;
                  const isToMe = s.to_email?.toLowerCase() === myEmail;
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 px-4 py-3.5"
                      style={{
                        borderBottom:
                          i < settlements.length - 1
                            ? "1px solid #F7F7F4"
                            : "none",
                      }}
                    >
                      <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#E1F5EE] text-[18px] text-[#1D9E75]">
                        ✓
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-[#111110]">
                          {isFromMe ? "You" : s.from_email?.split("@")[0]} paid{" "}
                          {isToMe ? "you" : s.to_email?.split("@")[0]}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[#9B9A94]">
                          {s.completed_at
                            ? new Date(s.completed_at).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )
                            : ""}
                          {s.payment_method
                            ? ` · ${s.payment_method.toUpperCase()}`
                            : ""}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-[#1D9E75]">
                        ₹{formatIndian(Math.round(Number(s.amount ?? 0)))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}
      </div>

      {inviteOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40"
          onClick={() => setInviteOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-member-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div
                  id="invite-member-title"
                  className="text-base font-extrabold text-[#111110]"
                >
                  Invite friends
                </div>
                <div className="mt-1 text-xs text-[#9B9A94]">
                  Share a link, or email someone directly.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="rounded-xl bg-[#F7F7F4] px-3 py-2 text-sm font-bold text-[#534AB7]"
                aria-label="Close"
              >
                <AppIcon name="close" size={16} color="#534AB7" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {inviteBusy && !inviteLink ? (
                <p className="text-sm text-[#9B9A94]">
                  Generating invite link…
                </p>
              ) : null}

              {inviteLink ? (
                <InviteLinkShare
                  inviteUrl={inviteLink}
                  groupName={group?.name ?? "Split"}
                />
              ) : null}

              {groupInviteLink ? (
                <div className="border-t border-[#F7F7F4] pt-4">
                  <div className="mb-2 text-xs font-semibold uppercase text-[#9B9A94]">
                    Or share group link
                  </div>
                  <div className="flex items-center gap-2 rounded-[10px] bg-[#F7F7F4] px-3 py-2.5">
                    <div className="min-w-0 flex-1 break-all font-mono text-xs text-[#534AB7]">
                      {groupInviteLink}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(groupInviteLink);
                        setInviteMsg("Link copied!");
                      }}
                      className="shrink-0 rounded-lg bg-[#534AB7] px-3 py-1.5 text-xs font-bold text-white"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="mt-1.5 text-[11px] text-[#9B9A94]">
                    Anyone with this link can join the group
                  </div>
                </div>
              ) : null}

              <div>
                <label className="text-xs font-semibold text-[#5F5E5A]">
                  Or invite by email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] px-3 text-base outline-none focus:border-[#534AB7]"
                />
              </div>

              {inviteMsg ? (
                <p className="text-sm font-medium text-[#5F5E5A]">
                  {inviteMsg}
                </p>
              ) : null}

              <button
                type="button"
                disabled={inviteBusy || !inviteEmail.trim()}
                onClick={() => void handleSendInvite()}
                className="min-h-[44px] w-full rounded-xl bg-[#534AB7] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
              >
                {inviteBusy ? "Sending…" : "Send email invite"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {settleOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40"
          onClick={() => setSettleOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settle-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div
                  id="settle-title"
                  className="text-base font-extrabold text-[#111110]"
                >
                  Record a payment
                </div>
                <div className="mt-1 text-xs text-[#9B9A94]">
                  Log money you paid to a group member.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettleOpen(false)}
                className="rounded-xl bg-[#F7F7F4] px-3 py-2 text-sm font-bold text-[#534AB7]"
                aria-label="Close"
              >
                <AppIcon name="close" size={16} color="#534AB7" />
              </button>
            </div>

            <div className="mt-5">
              <label className="text-xs font-semibold text-[#5F5E5A]">
                You paid
              </label>
              <select
                value={settleToEmail}
                onChange={(e) => setSettleToEmail(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] bg-white px-3 text-base outline-none focus:border-[#534AB7]"
              >
                <option value="">Select member…</option>
                {otherMembers.map((m) => (
                  <option key={m.email} value={m.email}>
                    {m.display_name} ({m.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-[#5F5E5A]">
                Amount (₹)
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                placeholder="0"
                className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] px-3 text-base outline-none focus:border-[#534AB7]"
              />
            </div>

            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold uppercase text-[#9B9A94]">
                Payment method
              </div>
              <div className="flex gap-2">
                {(["upi", "cash", "bank"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className="h-10 flex-1 rounded-[10px] text-xs font-semibold uppercase"
                    style={{
                      border: `1.5px solid ${
                        paymentMethod === method ? "#534AB7" : "#E8E6F0"
                      }`,
                      background:
                        paymentMethod === method ? "#EEEDFE" : "white",
                      color: paymentMethod === method ? "#534AB7" : "#9B9A94",
                    }}
                  >
                    {method === "upi"
                      ? "UPI"
                      : method === "bank"
                        ? "Bank"
                        : "Cash"}
                  </button>
                ))}
              </div>
              {paymentMethod === "upi" ? (
                <input
                  value={upiNote}
                  onChange={(e) => setUpiNote(e.target.value)}
                  placeholder="UPI reference / note (optional)"
                  className="mt-2.5 h-11 w-full rounded-[10px] border border-[#E8E6F0] px-3.5 text-[13px] outline-none"
                />
              ) : null}
            </div>

            {settleMsg ? (
              <p className="mt-3 text-sm font-medium text-[#C0392B]">
                {settleMsg}
              </p>
            ) : null}

            <button
              type="button"
              disabled={settleBusy || !settleToEmail || !settleAmount}
              onClick={() => void handleConfirmSettle()}
              className="mt-5 w-full rounded-xl bg-[#534AB7] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50 min-h-[44px]"
            >
              {settleBusy ? "Saving…" : "Record payment"}
            </button>
          </div>
        </div>
      ) : null}

      {deletingExpenseId ? (
        <div
          className="fixed inset-0 z-[990] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDeletingExpenseId(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white px-5 py-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-expense-title"
          >
            <div className="mb-5 text-center">
              <div className="mb-3 text-4xl" aria-hidden>
                🗑️
              </div>
              <div
                id="delete-expense-title"
                className="mb-2 text-[17px] font-extrabold text-[#111110]"
              >
                Delete this expense?
              </div>
              <div className="text-[13px] text-[#9B9A94]">
                This cannot be undone. Balances will be updated.
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                disabled={deletingExpenseBusy}
                onClick={() => void handleConfirmDeleteExpense()}
                className="h-[50px] w-full rounded-[13px] bg-[#E24B4A] text-[15px] font-bold text-white disabled:opacity-50"
              >
                {deletingExpenseBusy ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                type="button"
                onClick={() => setDeletingExpenseId(null)}
                className="h-[50px] w-full rounded-[13px] bg-[#F7F7F4] text-[15px] text-[#5F5E5A]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteConfirm ? (
        <div
          className="fixed inset-0 z-[990] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowDeleteConfirm(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white px-5 py-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-group-title"
          >
            <div className="mb-5 text-center">
              <div className="mb-3 flex justify-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FDEDED]">
                  <AppIcon name="trash" size={26} color="#E24B4A" />
                </span>
              </div>
              <div
                id="delete-group-title"
                className="mb-2 text-[18px] font-extrabold text-[#111110]"
              >
                {`Delete "${group?.name}"?`}
              </div>
              <div className="text-sm leading-6 text-[#9B9A94]">
                This will remove the group for all members. Expense history will
                be saved but the group will be closed. This cannot be undone.
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => void handleDeleteGroup()}
                disabled={deleting}
                className="h-[50px] w-full rounded-[13px] border-none bg-[#E24B4A] text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:bg-[#9B9A94]"
              >
                {deleting ? "Deleting..." : "Yes, delete group"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="h-[50px] w-full rounded-[13px] border-none bg-[#F7F7F4] text-[15px] font-semibold text-[#5F5E5A]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
