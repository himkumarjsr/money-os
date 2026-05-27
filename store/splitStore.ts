"use client";

import { create } from "zustand";
import { getSupabase } from "@/lib/supabase";

export type SplitGroup = {
  id: string;
  name: string;
  description?: string | null;
  emoji: string | null;
  group_type: string | null;
  created_by: string | null;
  invite_code: string | null;
  is_active: boolean | null;
  currency: string | null;
  created_at?: string;
  updated_at?: string;
  members?: SplitGroupMember[];
};

export type SplitGroupMember = {
  id: string;
  group_id: string;
  user_id: string | null;
  email: string;
  display_name: string;
  role: "admin" | "member" | string;
  status: "pending" | "active" | "left" | string;
  invited_by?: string | null;
  joined_at?: string | null;
  created_at?: string;
};

export type SplitExpenseShare = {
  id: string;
  expense_id: string;
  group_id: string;
  user_id: string | null;
  email: string;
  display_name: string;
  share_amount: number;
  share_percentage?: number | null;
  is_settled: boolean;
  settled_at?: string | null;
  created_at?: string;
};

export type SplitExpense = {
  id: string;
  group_id: string;
  title: string;
  amount: number;
  currency: string | null;
  category: string | null;
  paid_by_user_id: string | null;
  paid_by_email: string;
  paid_by_name: string;
  split_type: "equal" | "percentage" | "exact" | "shares" | string;
  expense_date: string;
  notes?: string | null;
  receipt_url?: string | null;
  is_settlement: boolean;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
  shares?: SplitExpenseShare[];
};

export type SplitBalanceEdge = {
  from_email: string;
  from_name: string;
  to_email: string;
  to_name: string;
  amount: number;
};

type SplitType = "equal" | "exact" | "percentage";

type CreateGroupInput = {
  name: string;
  emoji: string;
  type: string;
  userId: string;
  userEmail: string;
  userName: string;
};

type AddExpenseInput = {
  groupId: string;
  title: string;
  amount: number;
  category: string;
  paidByEmail: string;
  paidByName: string;
  paidByUserId?: string | null;
  splitType: SplitType;
  expenseDate: string; // YYYY-MM-DD
  notes?: string;
  includedMembers: Array<Pick<SplitGroupMember, "email" | "display_name" | "user_id">>;
  exactAmounts?: Record<string, number>; // email -> amount
  percentages?: Record<string, number>; // email -> pct
  createdBy: string;
};

type SplitStore = {
  groups: SplitGroup[];
  activeGroup: SplitGroup | null;
  expenses: SplitExpense[];
  balances: SplitBalanceEdge[];
  loading: boolean;
  lastFetched: Record<string, number>;

  fetchGroups: (userEmail: string) => Promise<void>;
  fetchGroupDetail: (groupId: string) => Promise<void>;
  createGroup: (input: CreateGroupInput) => Promise<{ groupId: string | null; error?: string }>;
  inviteMember: (input: {
    groupId: string;
    groupName: string;
    invitedEmail: string;
    invitedByName: string;
    invitedById: string;
  }) => Promise<{ inviteUrl?: string; error?: string }>;
  addExpense: (input: AddExpenseInput) => Promise<{ error?: string }>;
  settleUp: (input: {
    groupId: string;
    toEmail: string;
    amount: number;
    userId: string;
    userEmail: string;
  }) => Promise<{ error?: string }>;
  clearActive: () => void;
};

const CACHE_TTL = 2 * 60 * 1000;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function computeShares(input: AddExpenseInput) {
  const members = input.includedMembers;
  if (!members.length) return { shares: [], error: "Select at least 1 member to split among." };

  const total = round2(Math.max(0, input.amount));
  if (!Number.isFinite(total) || total <= 0) return { shares: [], error: "Enter a valid amount." };

  if (input.splitType === "equal") {
    const per = round2(total / members.length);
    // Adjust last share to ensure exact sum = total (avoid rounding drift).
    const shares = members.map((m, idx) => ({
      user_id: m.user_id ?? null,
      email: m.email.toLowerCase(),
      display_name: m.display_name,
      share_amount: idx === members.length - 1 ? round2(total - per * (members.length - 1)) : per,
      share_percentage: null as number | null,
      is_settled: false,
    }));
    return { shares, error: null as string | null };
  }

  if (input.splitType === "exact") {
    const exact = input.exactAmounts ?? {};
    const shares = members.map((m) => {
      const v = Number(exact[m.email.toLowerCase()] ?? exact[m.email] ?? 0);
      return {
        user_id: m.user_id ?? null,
        email: m.email.toLowerCase(),
        display_name: m.display_name,
        share_amount: round2(Math.max(0, v)),
        share_percentage: null as number | null,
        is_settled: false,
      };
    });
    const sum = round2(shares.reduce((s, x) => s + x.share_amount, 0));
    if (sum !== total) {
      return { shares: [], error: `Exact split must total ₹${total.toFixed(2)} (currently ₹${sum.toFixed(2)}).` };
    }
    return { shares, error: null as string | null };
  }

  if (input.splitType === "percentage") {
    const pctMap = input.percentages ?? {};
    const pcts = members.map((m) => Number(pctMap[m.email.toLowerCase()] ?? pctMap[m.email] ?? 0));
    const pctSum = round2(pcts.reduce((s, x) => s + x, 0));
    if (pctSum !== 100) {
      return { shares: [], error: `Percentages must add to 100 (currently ${pctSum}).` };
    }
    const shares = members.map((m, idx) => {
      const pct = Number(pcts[idx] ?? 0);
      const amt = idx === members.length - 1
        ? round2(total - members.slice(0, -1).reduce((s, mm, ii) => s + round2(total * (Number(pcts[ii] ?? 0) / 100)), 0))
        : round2(total * (pct / 100));
      return {
        user_id: m.user_id ?? null,
        email: m.email.toLowerCase(),
        display_name: m.display_name,
        share_amount: amt,
        share_percentage: pct,
        is_settled: false,
      };
    });
    return { shares, error: null as string | null };
  }

  return { shares: [], error: "Unsupported split type." };
}

function inferMyNetBalance(myEmail: string, balances: SplitBalanceEdge[]) {
  const me = myEmail.toLowerCase();
  let net = 0;
  for (const b of balances) {
    const amt = Number(b.amount ?? 0);
    if (!Number.isFinite(amt) || amt <= 0) continue;
    if (b.to_email?.toLowerCase() === me) net += amt; // others owe me
    if (b.from_email?.toLowerCase() === me) net -= amt; // I owe others
  }
  return round2(net);
}

export const useSplitStore = create<SplitStore>((set, get) => ({
  groups: [],
  activeGroup: null,
  expenses: [],
  balances: [],
  loading: false,
  lastFetched: {},

  clearActive: () => set({ activeGroup: null, expenses: [], balances: [] }),

  fetchGroups: async (userEmail) => {
    const email = (userEmail ?? "").toLowerCase().trim();
    if (!email) return;

    const { lastFetched } = get();
    const cacheKey = `split_groups_${email}`;
    if (lastFetched[cacheKey] && Date.now() - lastFetched[cacheKey] < CACHE_TTL) return;

    set({ loading: true });
    try {
      const supabase = getSupabase();
      const { data: memberships, error: memErr } = await supabase
        .from("split_group_members")
        .select("group_id")
        .eq("email", email)
        .eq("status", "active");
      if (memErr) throw memErr;

      if (!memberships?.length) {
        set({ groups: [], loading: false, lastFetched: { ...lastFetched, [cacheKey]: Date.now() } });
        return;
      }

      const groupIds = memberships.map((m) => m.group_id);
      const { data: groups, error: gErr } = await supabase
        .from("split_groups")
        .select("*")
        .in("id", groupIds)
        .eq("is_active", true)
        .order("updated_at", { ascending: false });
      if (gErr) throw gErr;

      set({
        groups: (groups as SplitGroup[]) ?? [],
        loading: false,
        lastFetched: { ...lastFetched, [cacheKey]: Date.now() },
      });
    } catch (err) {
      console.error("fetchGroups error:", err);
      set({ loading: false });
    }
  },

  fetchGroupDetail: async (groupId) => {
    if (!groupId) return;
    set({ loading: true });
    try {
      const supabase = getSupabase();
      const [groupRes, membersRes, expensesRes, balancesRes] = await Promise.all([
        supabase.from("split_groups").select("*").eq("id", groupId).single(),
        supabase.from("split_group_members").select("*").eq("group_id", groupId).eq("status", "active"),
        supabase
          .from("split_expenses")
          .select(`*, shares:split_expense_shares(*)`)
          .eq("group_id", groupId)
          .order("expense_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.rpc("get_split_balances", { p_group_id: groupId }),
      ]);

      if (groupRes.error) throw groupRes.error;
      if (membersRes.error) throw membersRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (balancesRes.error) {
        // Non-fatal: still show group + expenses.
        console.warn("get_split_balances RPC error:", balancesRes.error);
      }

      const group = groupRes.data as SplitGroup;
      const members = (membersRes.data as SplitGroupMember[]) ?? [];
      const expenses = (expensesRes.data as SplitExpense[]) ?? [];
      const balances = ((balancesRes.data as unknown) as SplitBalanceEdge[]) ?? [];

      set({
        activeGroup: { ...group, members },
        expenses,
        balances,
        loading: false,
      });
    } catch (err) {
      console.error("fetchGroupDetail error:", err);
      set({ loading: false });
    }
  },

  createGroup: async (input) => {
    try {
      const res = await fetch("/api/split/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name,
          emoji: input.emoji,
          type: input.type,
          displayName: input.userName,
        }),
      });

      const json = (await res.json()) as { groupId?: string; error?: string };
      if (!res.ok) {
        return { groupId: null, error: json.error ?? "Could not create group" };
      }

      set({ lastFetched: {} });
      return { groupId: json.groupId ?? null };
    } catch (err) {
      console.error("createGroup error:", err);
      return {
        groupId: null,
        error: err instanceof Error ? err.message : "Could not create group",
      };
    }
  },

  inviteMember: async (input) => {
    try {
      const res = await fetch("/api/split/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = (await res.json()) as { success?: boolean; inviteUrl?: string; error?: string };
      if (!res.ok) return { error: json.error ?? "Invite failed" };
      return { inviteUrl: json.inviteUrl };
    } catch (err) {
      console.error("inviteMember error:", err);
      return { error: "Invite failed" };
    }
  },

  addExpense: async (input) => {
    try {
      const { shares, error: shareErr } = computeShares(input);
      if (shareErr) return { error: shareErr };

      const supabase = getSupabase();

      const { data: newExpense, error } = await supabase
        .from("split_expenses")
        .insert({
          group_id: input.groupId,
          title: input.title,
          amount: input.amount,
          currency: "INR",
          category: input.category,
          paid_by_user_id: input.paidByUserId ?? null,
          paid_by_email: input.paidByEmail.toLowerCase(),
          paid_by_name: input.paidByName,
          split_type: input.splitType,
          expense_date: input.expenseDate,
          notes: input.notes ?? null,
          is_settlement: false,
          created_by: input.createdBy,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;

      const sharesWithExpense = shares.map((s) => ({
        ...s,
        expense_id: newExpense.id,
        group_id: input.groupId,
      }));

      const { error: shareInsertErr } = await supabase.from("split_expense_shares").insert(sharesWithExpense);
      if (shareInsertErr) throw shareInsertErr;

      await supabase.from("split_groups").update({ updated_at: new Date().toISOString() }).eq("id", input.groupId);

      set({ lastFetched: {} });
      // Refresh group detail to pick up RPC balances + new expense shares.
      await get().fetchGroupDetail(input.groupId);

      return {};
    } catch (err: any) {
      console.error("addExpense error:", err);
      return { error: err?.message ?? "Could not add expense" };
    }
  },

  settleUp: async (input) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("split_settlements").insert({
        group_id: input.groupId,
        from_user_id: input.userId,
        from_email: input.userEmail.toLowerCase(),
        to_email: input.toEmail.toLowerCase(),
        amount: input.amount,
        status: "completed",
        completed_at: new Date().toISOString(),
      });
      if (error) throw error;

      await supabase
        .from("split_expense_shares")
        .update({ is_settled: true, settled_at: new Date().toISOString() })
        .eq("group_id", input.groupId)
        .eq("email", input.userEmail.toLowerCase());

      set({ lastFetched: {} });
      await get().fetchGroupDetail(input.groupId);

      return {};
    } catch (err: any) {
      console.error("settleUp error:", err);
      return { error: err?.message ?? "Could not settle up" };
    }
  },
}));

export function getMyBalanceFromEdges(myEmail: string, edges: SplitBalanceEdge[]) {
  return inferMyNetBalance(myEmail, edges);
}

