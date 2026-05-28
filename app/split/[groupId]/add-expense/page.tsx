"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { Analytics } from "@/lib/analytics";
import { useAuthStore } from "@/store/authStore";
import { useSplitStore, type SplitGroupMember } from "@/store/splitStore";
import { formatIndian } from "@/lib/formatters";

type SplitType = "equal" | "exact" | "percentage";

const CATEGORY_OPTIONS = [
  { key: "food", label: "Food", emoji: "🍽️" },
  { key: "transport", label: "Transport", emoji: "🚕" },
  { key: "accommodation", label: "Hotel", emoji: "🏨" },
  { key: "entertainment", label: "Entertainment", emoji: "🎉" },
  { key: "shopping", label: "Shopping", emoji: "🛒" },
  { key: "utilities", label: "Utilities", emoji: "⚡" },
  { key: "medical", label: "Medical", emoji: "💊" },
  { key: "other", label: "Other", emoji: "📦" },
] as const;

function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AddSplitExpensePage() {
  return (
    <ProtectedGate>
      <AddSplitExpenseInner />
    </ProtectedGate>
  );
}

function AddSplitExpenseInner() {
  const params = useParams<{ groupId: string }>();
  const groupId = params?.groupId;
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const userId = useAuthStore((s) => s.userId);
  const createdBy = user?.id ?? userId ?? "";

  const activeGroup = useSplitStore((s) => s.activeGroup);
  const fetchGroupDetail = useSplitStore((s) => s.fetchGroupDetail);
  const addExpense = useSplitStore((s) => s.addExpense);
  const storeLoading = useSplitStore((s) => s.loading);
  const [detailReady, setDetailReady] = useState(false);

  const members = (activeGroup?.members ?? []) as SplitGroupMember[];

  const [amountRaw, setAmountRaw] = useState<number>(0);
  const [title, setTitle] = useState("");
  const [paidByEmail, setPaidByEmail] = useState("");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [category, setCategory] = useState<string>("food");
  const [expenseDate, setExpenseDate] = useState(todayISODate());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const [includedEmails, setIncludedEmails] = useState<Record<string, boolean>>(
    {},
  );
  const [exactMap, setExactMap] = useState<Record<string, number>>({});
  const [pctMap, setPctMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!groupId) return;
    setDetailReady(false);
    void fetchGroupDetail(groupId).finally(() => setDetailReady(true));
  }, [fetchGroupDetail, groupId]);

  useEffect(() => {
    if (!members.length) return;
    const init: Record<string, boolean> = {};
    for (const m of members) init[m.email.toLowerCase()] = true;
    setIncludedEmails(init);

    // default paid-by: me, else first member
    const me = (user?.email ?? "").toLowerCase();
    const defaultPaid =
      members.find((m) => m.email.toLowerCase() === me)?.email ??
      members[0]?.email ??
      "";
    setPaidByEmail(defaultPaid);
  }, [members, user?.email]);

  const includedMembers = useMemo(() => {
    return members
      .filter((m) => includedEmails[m.email.toLowerCase()])
      .map((m) => ({
        email: m.email,
        display_name: m.display_name,
        user_id: m.user_id,
      }));
  }, [includedEmails, members]);

  const paidBy = useMemo(() => {
    const e = paidByEmail.toLowerCase();
    return members.find((m) => m.email.toLowerCase() === e) ?? null;
  }, [members, paidByEmail]);

  const exactSum = useMemo(() => {
    return includedMembers.reduce(
      (s, m) => s + Number(exactMap[m.email.toLowerCase()] ?? 0),
      0,
    );
  }, [exactMap, includedMembers]);

  const pctSum = useMemo(() => {
    return includedMembers.reduce(
      (s, m) => s + Number(pctMap[m.email.toLowerCase()] ?? 0),
      0,
    );
  }, [includedMembers, pctMap]);

  const toggleIncluded = (email: string) => {
    const key = email.toLowerCase();
    setIncludedEmails((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    if (!groupId) return;
    if (!createdBy) {
      window.alert("Sign in again to add expenses.");
      return;
    }
    if (!title.trim()) {
      window.alert("Enter a description.");
      return;
    }
    if (!paidByEmail) {
      window.alert("Choose who paid.");
      return;
    }
    if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
      window.alert("Enter a valid amount.");
      return;
    }
    if (includedMembers.length === 0) {
      window.alert("Select at least one member to split with.");
      return;
    }
    if (splitType === "exact") {
      const total = includedMembers.reduce(
        (s, m) => s + Number(exactMap[m.email.toLowerCase()] ?? 0),
        0,
      );
      const diff = Math.abs(total - Number(amountRaw || 0));
      if (diff > 0.01) {
        window.alert(
          `Exact amounts must add up to ₹${formatIndian(Math.round(amountRaw))}. Current total: ₹${formatIndian(Math.round(total))}`,
        );
        return;
      }
    }

    setBusy(true);
    const res = await addExpense({
      groupId,
      title: title.trim(),
      amount: amountRaw,
      category,
      paidByEmail: paidByEmail.toLowerCase(),
      paidByName: paidBy?.display_name ?? paidByEmail.split("@")[0] ?? "Member",
      paidByUserId: paidBy?.user_id ?? null,
      splitType,
      expenseDate,
      notes: notes.trim() ? notes.trim() : undefined,
      includedMembers,
      exactAmounts: splitType === "exact" ? exactMap : undefined,
      percentages: splitType === "percentage" ? pctMap : undefined,
      createdBy,
    });
    setBusy(false);

    if (res.error) {
      window.alert(res.error);
      return;
    }
    Analytics.splitExpenseAdded();
    router.push(`/split/${groupId}`);
  };

  return (
    <main className="min-h-dvh bg-[#F7F7F4] px-4 py-8 pb-[90px] sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <Link
            href={`/split/${groupId}`}
            className="text-sm font-bold text-[#534AB7]"
          >
            ← Back
          </Link>
          <div className="text-xs font-semibold text-[#9B9A94]">
            Add expense
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-[#E8E6F0] bg-white p-6 shadow-sm">
          <div className="text-lg font-extrabold text-[#111110]">
            New expense
          </div>
          <div className="mt-1 text-sm text-[#9B9A94]">
            Split among selected members.
          </div>

          {!detailReady && storeLoading ? (
            <p className="mt-4 text-sm text-[#9B9A94]">
              Loading group members…
            </p>
          ) : null}
          {detailReady && members.length === 0 ? (
            <p className="mt-4 rounded-xl border border-[#F5D0D0] bg-[#FDEDED] px-3 py-2 text-sm text-[#991B1B]">
              No members found for this group. Invite someone from the group
              page, then try again.
            </p>
          ) : null}

          <div
            style={{
              background: "#EEEDFE",
              borderRadius: 16,
              padding: "24px 20px",
              textAlign: "center",
              marginBottom: 16,
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#534AB7",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Total Amount
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#534AB7",
                }}
              >
                ₹
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={amountRaw || ""}
                onChange={(e) => setAmountRaw(Number(e.target.value) || 0)}
                placeholder="0"
                autoFocus
                style={{
                  fontSize: 52,
                  fontWeight: 800,
                  color: "#534AB7",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  textAlign: "center",
                  width: "80%",
                  fontFamily: "inherit",
                  caretColor: "#534AB7",
                }}
              />
            </div>
            {amountRaw > 0 && includedMembers.length > 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: "#534AB7",
                  opacity: 0.7,
                  marginTop: 4,
                }}
              >
                ₹{(amountRaw / includedMembers.length).toFixed(0)} each
              </div>
            ) : null}
          </div>

          <div className="mt-2">
            <label className="text-xs font-semibold text-[#5F5E5A]">
              Description
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Beach shack drinks"
              className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] px-3 text-base outline-none focus:border-[#534AB7]"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-[#5F5E5A]">
                Paid by
              </label>
              <select
                value={paidByEmail}
                onChange={(e) => setPaidByEmail(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] bg-white px-3 text-base outline-none focus:border-[#534AB7]"
              >
                {members.map((m) => (
                  <option key={m.email} value={m.email}>
                    {m.display_name} ({m.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#5F5E5A]">
                Split type
              </label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {(["equal", "exact", "percentage"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSplitType(t)}
                    className={`h-11 min-h-[44px] rounded-xl border text-sm font-bold ${
                      splitType === t
                        ? "border-[#534AB7] bg-[#EEEDFE] text-[#534AB7]"
                        : "border-[#E8E6F0] bg-white text-[#111110]"
                    }`}
                  >
                    {t === "equal"
                      ? "Equal"
                      : t === "exact"
                        ? "Exact"
                        : "Percent"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-[#5F5E5A]">
              Split among
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {members.map((m) => {
                const on = Boolean(includedEmails[m.email.toLowerCase()]);
                return (
                  <button
                    key={m.email}
                    type="button"
                    onClick={() => toggleIncluded(m.email)}
                    className={`rounded-full px-3 py-2 text-xs font-bold min-h-[44px] ${
                      on
                        ? "bg-[#534AB7] text-white"
                        : "bg-[#F7F7F4] text-[#111110] border border-[#E8E6F0]"
                    }`}
                  >
                    {m.display_name}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-xs text-[#9B9A94]">
              {includedMembers.length} selected
            </div>
          </div>

          {splitType === "exact" ? (
            <div className="mt-5 rounded-2xl border border-[#E8E6F0] bg-[#FAFAFE] p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-[#9B9A94]">
                Exact amounts
              </div>
              <div className="mt-3 space-y-2">
                {includedMembers.map((m) => (
                  <div
                    key={m.email}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 text-sm font-semibold text-[#111110]">
                      {m.display_name}
                    </div>
                    <input
                      inputMode="decimal"
                      value={String(exactMap[m.email.toLowerCase()] ?? "")}
                      onChange={(e) =>
                        setExactMap((prev) => ({
                          ...prev,
                          [m.email.toLowerCase()]: Number(e.target.value) || 0,
                        }))
                      }
                      placeholder="0"
                      className="h-11 w-[140px] rounded-xl border border-[#E8E6F0] bg-white px-3 text-right text-base font-bold outline-none focus:border-[#534AB7]"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs font-semibold text-[#5F5E5A]">
                Total: ₹{formatIndian(Math.round(exactSum))} / ₹
                {formatIndian(Math.round(amountRaw || 0))}
              </div>
            </div>
          ) : null}

          {splitType === "percentage" ? (
            <div className="mt-5 rounded-2xl border border-[#E8E6F0] bg-[#FAFAFE] p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-[#9B9A94]">
                Percentages
              </div>
              <div className="mt-3 space-y-2">
                {includedMembers.map((m) => (
                  <div
                    key={m.email}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 text-sm font-semibold text-[#111110]">
                      {m.display_name}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        inputMode="decimal"
                        value={String(pctMap[m.email.toLowerCase()] ?? "")}
                        onChange={(e) =>
                          setPctMap((prev) => ({
                            ...prev,
                            [m.email.toLowerCase()]:
                              Number(e.target.value) || 0,
                          }))
                        }
                        placeholder="0"
                        className="h-11 w-[110px] rounded-xl border border-[#E8E6F0] bg-white px-3 text-right text-base font-bold outline-none focus:border-[#534AB7]"
                      />
                      <span className="text-sm font-bold text-[#9B9A94]">
                        %
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs font-semibold text-[#5F5E5A]">
                Total: {pctSum}% / 100%
              </div>
            </div>
          ) : null}

          <div className="mt-5">
            <label className="text-xs font-semibold text-[#5F5E5A]">
              Category
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CATEGORY_OPTIONS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={`h-11 min-h-[44px] rounded-xl border text-xs font-extrabold ${
                    category === c.key
                      ? "border-[#534AB7] bg-[#EEEDFE] text-[#534AB7]"
                      : "border-[#E8E6F0] bg-white text-[#111110]"
                  }`}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-[#5F5E5A]">
                Date
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] bg-white px-3 text-base outline-none focus:border-[#534AB7]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#5F5E5A]">
                Notes (optional)
              </label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a note"
                className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] px-3 text-base outline-none focus:border-[#534AB7]"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={
              busy ||
              !detailReady ||
              !groupId ||
              !createdBy ||
              members.length === 0
            }
            onClick={() => void handleSubmit()}
            className="mt-6 w-full rounded-2xl bg-[#534AB7] px-4 py-3 text-sm font-extrabold text-white shadow-[0_10px_30px_rgba(83,74,183,0.25)] disabled:opacity-50 min-h-[44px]"
          >
            {busy ? "Adding…" : "Add expense"}
          </button>
        </div>
      </div>
    </main>
  );
}
