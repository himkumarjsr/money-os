"use client";

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { BackHref } from "@/components/ui/BackLink";
import { Analytics } from "@/lib/analytics";
import { formatIndian } from "@/lib/formatters";
import { computeSplitShares } from "@/lib/splitShares";
import { useAuthStore } from "@/store/authStore";
import { useSplitStore, type SplitGroupMember } from "@/store/splitStore";
import { TrackerIcon } from "@/components/tracker/TrackerIcons";
import type { TrackerIconName } from "@/lib/tracker-categories";

type SplitType = "equal" | "exact" | "percentage" | "shares";

const CATEGORY_OPTIONS: {
  key: string;
  label: string;
  icon: TrackerIconName;
}[] = [
  { key: "food", label: "Food", icon: "utensils" },
  { key: "transport", label: "Transport", icon: "cab" },
  { key: "accommodation", label: "Hotel", icon: "building" },
  { key: "entertainment", label: "Entertainment", icon: "party" },
  { key: "shopping", label: "Shopping", icon: "cart" },
  { key: "utilities", label: "Utilities", icon: "bolt" },
  { key: "medical", label: "Medical", icon: "pill" },
  { key: "other", label: "Other", icon: "package" },
];

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
      <Suspense
        fallback={
          <div className="bg-[#F7F7F4] px-4 py-8">
            <p className="text-sm text-[#9B9A94]">Loading…</p>
          </div>
        }
      >
        <AddSplitExpenseInner />
      </Suspense>
    </ProtectedGate>
  );
}

function AddSplitExpenseInner() {
  const params = useParams<{ groupId: string }>();
  const searchParams = useSearchParams();
  const groupId = params?.groupId;
  const editExpenseId = searchParams?.get("edit") ?? null;
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const userId = useAuthStore((s) => s.userId);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const createdBy = userId ?? user?.id ?? "";

  const activeGroup = useSplitStore((s) => s.activeGroup);
  const expenses = useSplitStore((s) => s.expenses);
  const fetchGroupDetail = useSplitStore((s) => s.fetchGroupDetail);
  const addExpense = useSplitStore((s) => s.addExpense);
  const editExpense = useSplitStore((s) => s.editExpense);
  const storeLoading = useSplitStore((s) => s.loading);
  const [detailReady, setDetailReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const hydratedEdit = useRef<string | null>(null);

  const groupLoaded = detailReady && activeGroup?.id === groupId;
  const members = (
    groupLoaded ? (activeGroup?.members ?? []) : []
  ) as SplitGroupMember[];
  const splittableMembers = members.filter(
    (m) => m.status?.toLowerCase() === "active",
  );
  const memberKey = splittableMembers
    .map((m) => m.email.toLowerCase())
    .sort()
    .join("|");

  const [amountRaw, setAmountRaw] = useState<number>(0);
  const [title, setTitle] = useState("");
  const [paidByEmail, setPaidByEmail] = useState("");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [category, setCategory] = useState<string>("food");
  const [expenseDate, setExpenseDate] = useState(todayISODate());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const [includedEmails, setIncludedEmails] = useState<Record<string, boolean>>(
    {},
  );
  const [exactMap, setExactMap] = useState<Record<string, number>>({});
  const [pctMap, setPctMap] = useState<Record<string, number>>({});
  const [shareCounts, setShareCounts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!groupId) return;
    setDetailReady(false);
    setLoadError("");
    hydratedEdit.current = null;
    void fetchGroupDetail(groupId)
      .then(() => {
        const loaded = useSplitStore.getState().activeGroup;
        if (!loaded || loaded.id !== groupId) {
          setLoadError("Could not load this group. Go back and try again.");
        }
      })
      .catch(() => {
        setLoadError("Could not load this group. Go back and try again.");
      })
      .finally(() => setDetailReady(true));
  }, [fetchGroupDetail, groupId]);

  useEffect(() => {
    if (!memberKey) return;
    if (editExpenseId && hydratedEdit.current === editExpenseId) return;
    const init: Record<string, boolean> = {};
    for (const m of splittableMembers) init[m.email.toLowerCase()] = true;
    setIncludedEmails(init);

    const me = (user?.email ?? "").toLowerCase();
    const defaultPaid =
      splittableMembers.find((m) => m.email.toLowerCase() === me)?.email ??
      splittableMembers[0]?.email ??
      "";
    setPaidByEmail(defaultPaid);
  }, [memberKey, splittableMembers, user?.email, editExpenseId]);

  useEffect(() => {
    if (!editExpenseId || !detailReady) return;
    if (hydratedEdit.current === editExpenseId) return;
    const expense = expenses.find((e) => e.id === editExpenseId);
    if (!expense) return;
    hydratedEdit.current = editExpenseId;
    setAmountRaw(Number(expense.amount) || 0);
    setTitle(expense.title || "");
    setPaidByEmail(expense.paid_by_email || "");
    setCategory(expense.category || "food");
    setExpenseDate(expense.expense_date || todayISODate());
    setNotes(expense.notes || "");
    const st = expense.split_type;
    if (
      st === "equal" ||
      st === "exact" ||
      st === "percentage" ||
      st === "shares"
    ) {
      setSplitType(st);
    }
    const included: Record<string, boolean> = {};
    const exact: Record<string, number> = {};
    const pct: Record<string, number> = {};
    const shares: Record<string, string> = {};
    for (const m of splittableMembers) {
      included[m.email.toLowerCase()] = false;
    }
    for (const s of expense.shares ?? []) {
      const key = s.email.toLowerCase();
      included[key] = true;
      exact[key] = Number(s.share_amount) || 0;
      pct[key] = Number(s.share_percentage) || 0;
      shares[key] = String(
        Math.max(1, Math.round(Number(s.share_percentage) || 1)),
      );
    }
    setIncludedEmails(included);
    setExactMap(exact);
    setPctMap(pct);
    setShareCounts(shares);
  }, [editExpenseId, detailReady, expenses, splittableMembers]);

  const backHref = groupId ? `/split/${groupId}` : "/split";

  const includedMembers = useMemo(() => {
    return splittableMembers
      .filter((m) => includedEmails[m.email.toLowerCase()])
      .map((m) => ({
        email: m.email,
        display_name: m.display_name,
        user_id: m.user_id,
      }));
  }, [includedEmails, splittableMembers]);

  /** Live share preview — same engine as the API (esp. equal). */
  const previewShares = useMemo(() => {
    if (!amountRaw || amountRaw <= 0 || includedMembers.length === 0) {
      return null;
    }
    const shareCountNums: Record<string, number> = {};
    for (const m of includedMembers) {
      const key = m.email.toLowerCase();
      shareCountNums[key] = parseFloat(shareCounts[key] || "1") || 1;
    }
    return computeSplitShares({
      amount: amountRaw,
      splitType,
      includedMembers,
      exactAmounts: splitType === "exact" ? exactMap : undefined,
      percentages: splitType === "percentage" ? pctMap : undefined,
      shareCounts: splitType === "shares" ? shareCountNums : undefined,
    });
  }, [amountRaw, exactMap, includedMembers, pctMap, shareCounts, splitType]);

  const paidBy = useMemo(() => {
    const e = paidByEmail.toLowerCase();
    return splittableMembers.find((m) => m.email.toLowerCase() === e) ?? null;
  }, [splittableMembers, paidByEmail]);

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
    setIncludedEmails((prev) => {
      const nextOn = !prev[key];
      // Keep at least one person in the split.
      if (!nextOn) {
        const othersOn = Object.entries(prev).some(
          ([k, on]) => k !== key && on,
        );
        if (!othersOn) return prev;
      }
      return { ...prev, [key]: nextOn };
    });
  };

  const handleSubmit = async () => {
    setFormError("");
    if (!groupId) return;
    if (!isLoggedIn || !createdBy) {
      setFormError("Sign in again to add expenses.");
      return;
    }
    if (!title.trim()) {
      setFormError("Enter a description.");
      return;
    }
    if (!paidByEmail) {
      setFormError("Choose who paid.");
      return;
    }
    if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
      setFormError("Enter a valid amount.");
      return;
    }
    if (includedMembers.length === 0) {
      setFormError("Select at least one member to split with.");
      return;
    }
    if (splitType === "exact") {
      const total = includedMembers.reduce(
        (s, m) => s + Number(exactMap[m.email.toLowerCase()] ?? 0),
        0,
      );
      const diff = Math.abs(total - Number(amountRaw || 0));
      if (diff > 0.01) {
        setFormError(
          `Exact amounts must add up to ₹${formatIndian(Math.round(amountRaw))}. Current total: ₹${formatIndian(Math.round(total))}`,
        );
        return;
      }
    }
    if (splitType === "percentage") {
      const totalPct = includedMembers.reduce(
        (s, m) => s + Number(pctMap[m.email.toLowerCase()] ?? 0),
        0,
      );
      if (Math.abs(totalPct - 100) > 0.01) {
        setFormError(
          `Percentages must add up to 100%. Current total: ${totalPct}%`,
        );
        return;
      }
    }
    if (splitType === "shares") {
      const totalShares = includedMembers.reduce(
        (s, m) =>
          s + (parseFloat(shareCounts[m.email.toLowerCase()] || "1") || 0),
        0,
      );
      if (totalShares <= 0) {
        setFormError("Enter a positive share count for at least one member.");
        return;
      }
    }

    const shareCountNums: Record<string, number> = {};
    for (const m of includedMembers) {
      const key = m.email.toLowerCase();
      shareCountNums[key] = parseFloat(shareCounts[key] || "1") || 1;
    }

    setBusy(true);
    const payload = {
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
      shareCounts: splitType === "shares" ? shareCountNums : undefined,
      createdBy,
    };

    const res = editExpenseId
      ? await editExpense({
          expenseId: editExpenseId,
          groupId,
          title: payload.title,
          amount: payload.amount,
          category: payload.category,
          expenseDate: payload.expenseDate,
          notes: payload.notes ?? null,
          splitType: payload.splitType,
          includedMembers: payload.includedMembers,
          exactAmounts: payload.exactAmounts,
          percentages: payload.percentages,
          shareCounts: payload.shareCounts,
        })
      : await addExpense(payload);
    setBusy(false);

    if (res.error) {
      setFormError(res.error);
      return;
    }
    if (!editExpenseId) Analytics.splitExpenseAdded();
    router.push(`/split/${groupId}`);
  };

  const canSubmit =
    !busy &&
    groupLoaded &&
    Boolean(groupId) &&
    isLoggedIn &&
    splittableMembers.length > 0 &&
    includedMembers.length > 0;

  // Clear leftover modal scroll-locks so the document can scroll this long form.
  useEffect(() => {
    const unlock = () => {
      document.body.style.removeProperty("overflow");
      document.documentElement.style.removeProperty("overflow");
    };
    unlock();
    const t = window.setTimeout(unlock, 0);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="w-full bg-[#F7F7F4] px-4 py-8 pb-[calc(env(safe-area-inset-bottom)+9rem)] sm:px-6 md:pb-28">
      <div className="mx-auto max-w-2xl">
        <div className="relative z-10 rounded-3xl bg-[#534AB7] px-6 py-5 text-white shadow-[0_14px_50px_rgba(83,74,183,0.25)]">
          <div className="flex items-center justify-between gap-4">
            <BackHref
              href={backHref}
              label="Back"
              className="min-h-[44px] text-white [&_span:first-child]:bg-white/15 [&_span:last-child]:text-white/90"
            />
            <div className="text-xs font-semibold text-white/75">
              {editExpenseId ? "Edit expense" : "Add expense"}
            </div>
          </div>
          <div className="mt-3 text-lg font-extrabold">
            {editExpenseId ? "Update expense" : "New expense"}
          </div>
          <div className="mt-0.5 text-sm text-white/80">
            Split among selected members.
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-[#E8E6F0] bg-white p-6 shadow-sm">
          {!groupLoaded || storeLoading ? (
            <p className="mt-4 text-sm text-[#9B9A94]">
              Loading group members…
            </p>
          ) : null}
          {loadError ? (
            <p className="mt-4 rounded-xl border border-[#F5D0D0] bg-[#FDEDED] px-3 py-2 text-sm text-[#991B1B]">
              {loadError}
            </p>
          ) : null}
          {groupLoaded && !loadError && splittableMembers.length === 0 ? (
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
            {previewShares?.shares?.length && !previewShares.error ? (
              <div className="mt-3 space-y-1 text-left">
                {splitType === "equal" ? (
                  <div className="mb-1 text-center text-xs font-semibold text-[#534AB7]">
                    {`Equal split · ${includedMembers.length} people · sums to ₹${formatIndian(Math.round(amountRaw))}`}
                  </div>
                ) : null}
                {previewShares.shares.map((s) => (
                  <div
                    key={s.email}
                    className="flex items-center justify-between text-xs font-semibold text-[#534AB7]"
                  >
                    <span className="truncate opacity-80">
                      {s.display_name}
                    </span>
                    <span>
                      {`₹${s.share_amount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : previewShares?.error ? (
              <div className="mt-2 text-center text-xs font-semibold text-[#E24B4A]">
                {previewShares.error}
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
                {splittableMembers.map((m) => (
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
              <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(["equal", "exact", "percentage", "shares"] as const).map(
                  (t) => (
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
                          : t === "percentage"
                            ? "Percent"
                            : "Shares"}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-[#5F5E5A]">
              Split among
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {splittableMembers.map((m) => {
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

          {splitType === "shares" ? (
            <div className="mt-5 rounded-2xl border border-[#E8E6F0] bg-[#FAFAFE] p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-[#9B9A94]">
                Share counts
              </div>
              <p className="mt-1 text-[11px] text-[#9B9A94]">
                Enter number of shares per person. Amount is divided
                proportionally.
              </p>
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
                      type="number"
                      inputMode="numeric"
                      value={shareCounts[m.email.toLowerCase()] ?? "1"}
                      onChange={(e) =>
                        setShareCounts((prev) => ({
                          ...prev,
                          [m.email.toLowerCase()]: e.target.value,
                        }))
                      }
                      className="h-11 w-[80px] rounded-xl border border-[#E8E6F0] bg-white px-3 text-right text-base font-bold text-[#534AB7] outline-none focus:border-[#534AB7]"
                    />
                  </div>
                ))}
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
                  className={`flex h-11 min-h-[44px] items-center justify-center gap-1.5 rounded-xl border text-xs font-extrabold ${
                    category === c.key
                      ? "border-[#534AB7] bg-[#EEEDFE] text-[#534AB7]"
                      : "border-[#E8E6F0] bg-white text-[#111110]"
                  }`}
                >
                  <TrackerIcon
                    name={c.icon}
                    size={16}
                    color={category === c.key ? "#534AB7" : "#111110"}
                  />
                  {c.label}
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

          {formError ? (
            <p className="mt-4 rounded-xl border border-[#F5D0D0] bg-[#FDEDED] px-3 py-2 text-sm text-[#991B1B]">
              {formError}
            </p>
          ) : null}
        </div>
      </div>

      {/* Fixed sticky CTA — sits above mobile bottom nav (z-[55]). */}
      <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-[#E8E6F0] bg-white/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+5.25rem)] shadow-[0_-8px_24px_rgba(30,30,60,0.08)] backdrop-blur-md sm:px-6 md:pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            className="min-h-[48px] w-full rounded-2xl bg-[#534AB7] px-4 py-3 text-sm font-extrabold text-white shadow-[0_10px_30px_rgba(83,74,183,0.25)] disabled:opacity-50"
          >
            {busy
              ? editExpenseId
                ? "Saving…"
                : "Adding…"
              : editExpenseId
                ? "Save changes"
                : "Add expense"}
          </button>
        </div>
      </div>
    </div>
  );
}
