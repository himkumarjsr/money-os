"use client";

import { create } from "zustand";
import { getSupabase } from "@/lib/supabase";
import type { NetBalance, SimplifiedEdge } from "@/lib/splitBalances";

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
  includedMembers: Array<
    Pick<SplitGroupMember, "email" | "display_name" | "user_id">
  >;
  exactAmounts?: Record<string, number>; // email -> amount
  percentages?: Record<string, number>; // email -> pct
  createdBy: string;
};

type SplitStore = {
  groups: SplitGroup[];
  activeGroup: SplitGroup | null;
  expenses: SplitExpense[];
  /** Minimal settle-up transfers (debt-simplified). */
  balances: SplitBalanceEdge[];
  /** Per-member net balance (+ owed to them, − they owe). */
  netBalances: NetBalance[];
  loading: boolean;
  lastFetched: Record<string, number>;

  fetchGroups: (
    userId: string,
    userEmail: string,
    forceRefresh?: boolean,
  ) => Promise<void>;
  fetchGroupDetail: (groupId: string) => Promise<void>;
  createGroup: (
    input: CreateGroupInput,
  ) => Promise<{ groupId: string | null; error?: string }>;
  inviteMember: (input: {
    groupId: string;
    groupName: string;
    invitedEmail: string;
    invitedByName: string;
    invitedById: string;
  }) => Promise<{
    inviteUrl?: string;
    emailSent?: boolean;
    emailError?: string;
    error?: string;
  }>;
  addExpense: (input: AddExpenseInput) => Promise<{ error?: string }>;
  settleUp: (input: {
    groupId: string;
    toEmail: string;
    amount: number;
    userId: string;
    userEmail: string;
  }) => Promise<{ error?: string }>;
  deleteGroup: (groupId: string) => Promise<boolean>;
  deleteExpense: (
    groupId: string,
    expenseId: string,
  ) => Promise<{ error?: string }>;
  clearActive: () => void;
};

const CACHE_TTL = 2 * 60 * 1000;

function round2(n: number) {
  return Math.round(n * 100) / 100;
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
  netBalances: [],
  loading: false,
  lastFetched: {},

  clearActive: () =>
    set({ activeGroup: null, expenses: [], balances: [], netBalances: [] }),

  fetchGroups: async (userId, userEmail, forceRefresh = false) => {
    const email = (userEmail ?? "").toLowerCase().trim();
    if (!userId || !email) return;

    const { lastFetched } = get();
    const cacheKey = `groups_${userId}`;
    if (
      !forceRefresh &&
      lastFetched[cacheKey] &&
      Date.now() - lastFetched[cacheKey] < CACHE_TTL
    ) {
      return;
    }

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
        set({
          groups: [],
          loading: false,
          lastFetched: { ...lastFetched, [cacheKey]: Date.now() },
        });
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
    const prev = get().activeGroup;
    set({
      loading: true,
      ...(prev?.id !== groupId
        ? { activeGroup: null, expenses: [], balances: [], netBalances: [] }
        : {}),
    });
    try {
      const supabase = getSupabase();
      const [groupRes, membersRes, expensesRes] = await Promise.all([
        supabase.from("split_groups").select("*").eq("id", groupId).single(),
        supabase
          .from("split_group_members")
          .select("*")
          .eq("group_id", groupId)
          .in("status", ["active", "pending"]),
        supabase
          .from("split_expenses")
          .select(`*, shares:split_expense_shares(*)`)
          .eq("group_id", groupId)
          .order("expense_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (groupRes.error) throw groupRes.error;
      if (membersRes.error) throw membersRes.error;
      if (expensesRes.error) throw expensesRes.error;

      const group = groupRes.data as SplitGroup;
      const members = (membersRes.data as SplitGroupMember[]) ?? [];
      const expenses = (expensesRes.data as SplitExpense[]) ?? [];

      let balancesData: SplitBalanceEdge[] = [];
      let netData: NetBalance[] = [];
      try {
        const res = await fetch(
          `/api/split/balances?groupId=${encodeURIComponent(groupId)}`,
          { credentials: "include" },
        );
        if (res.ok) {
          const json = (await res.json()) as {
            net?: NetBalance[];
            edges?: SimplifiedEdge[];
          };
          netData = json.net ?? [];
          balancesData = (json.edges as SplitBalanceEdge[]) ?? [];
        } else {
          console.warn("Balances API error:", res.status);
        }
      } catch (err) {
        console.warn("Balances API error:", err);
      }

      set({
        activeGroup: { ...group, members },
        expenses,
        balances: balancesData,
        netBalances: netData,
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
        credentials: "include",
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
        credentials: "include",
        body: JSON.stringify(input),
      });
      const json = (await res.json()) as {
        success?: boolean;
        inviteUrl?: string;
        emailSent?: boolean;
        emailError?: string;
        error?: string;
      };
      if (!res.ok) return { error: json.error ?? "Invite failed" };
      return {
        inviteUrl: json.inviteUrl,
        emailSent: json.emailSent,
        emailError: json.emailError,
      };
    } catch (err) {
      console.error("inviteMember error:", err);
      return { error: "Invite failed" };
    }
  },

  addExpense: async (input) => {
    try {
      const res = await fetch("/api/split/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          groupId: input.groupId,
          title: input.title,
          amount: input.amount,
          category: input.category,
          paidByEmail: input.paidByEmail,
          paidByName: input.paidByName,
          paidByUserId: input.paidByUserId,
          splitType: input.splitType,
          expenseDate: input.expenseDate,
          notes: input.notes,
          includedMembers: input.includedMembers,
          exactAmounts: input.exactAmounts,
          percentages: input.percentages,
        }),
      });

      const json = (await res.json()) as {
        expense?: SplitExpense;
        error?: string;
      };
      if (!res.ok) return { error: json.error ?? "Could not add expense" };

      if (json.expense?.id) {
        set((state) => ({
          expenses: [json.expense as SplitExpense, ...state.expenses],
          lastFetched: {},
        }));
      } else {
        set({ lastFetched: {} });
      }
      await get().fetchGroupDetail(input.groupId);

      return {};
    } catch (err: unknown) {
      console.error("addExpense error:", err);
      return {
        error: err instanceof Error ? err.message : "Could not add expense",
      };
    }
  },

  settleUp: async (input) => {
    try {
      const res = await fetch("/api/split/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          groupId: input.groupId,
          toEmail: input.toEmail,
          amount: input.amount,
          paymentMethod: "other",
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) return { error: json.error ?? "Could not settle up" };

      set({ lastFetched: {} });
      await get().fetchGroupDetail(input.groupId);
      return {};
    } catch (err: unknown) {
      console.error("settleUp error:", err);
      return {
        error: err instanceof Error ? err.message : "Could not settle up",
      };
    }
  },

  deleteGroup: async (groupId) => {
    try {
      const res = await fetch(`/api/split/groups?groupId=${groupId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        console.error("deleteGroup error:", data.error);
        return false;
      }

      set((state) => ({
        groups: state.groups.filter((g) => g.id !== groupId),
        activeGroup:
          state.activeGroup?.id === groupId ? null : state.activeGroup,
        expenses: state.activeGroup?.id === groupId ? [] : state.expenses,
        balances: state.activeGroup?.id === groupId ? [] : state.balances,
        netBalances: state.activeGroup?.id === groupId ? [] : state.netBalances,
        lastFetched: {},
      }));
      return true;
    } catch (err) {
      console.error("deleteGroup:", err);
      return false;
    }
  },

  deleteExpense: async (groupId, expenseId) => {
    try {
      const res = await fetch(`/api/split/expenses/${expenseId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) return { error: json.error ?? "Could not delete expense" };

      set((state) => ({
        expenses: state.expenses.filter((e) => e.id !== expenseId),
        lastFetched: {},
      }));
      await get().fetchGroupDetail(groupId);
      return {};
    } catch (err: unknown) {
      console.error("deleteExpense error:", err);
      return {
        error: err instanceof Error ? err.message : "Could not delete expense",
      };
    }
  },
}));

export function getMyBalanceFromEdges(
  myEmail: string,
  edges: SplitBalanceEdge[],
) {
  return inferMyNetBalance(myEmail, edges);
}

/** Precise net for a member from server-computed net balances. */
export function getMyNetBalance(myEmail: string, net: NetBalance[]) {
  const me = (myEmail ?? "").toLowerCase();
  const found = net.find((n) => n.email === me);
  return found ? found.net : 0;
}
