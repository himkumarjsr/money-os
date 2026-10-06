/**
 * FK Split store — mobile parity with PWA store/splitStore.ts.
 * Reads via Supabase with the user session; writes go through the web
 * /api/split/* routes (server checks + notifications), falling back to direct
 * Supabase writes only when the server can't take the request.
 */
import { create } from "zustand";
import { getSupabase } from "@/lib/supabase";
import { siteBase, splitApi } from "@/lib/splitApi";
import {
  computeGroupBalances,
  type NetBalance,
  type SimplifiedEdge,
} from "@/lib/splitBalances";
import { computeSplitShares } from "@/lib/splitShares";

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
  left_at?: string | null;
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
  is_deleted?: boolean;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
  shares?: SplitExpenseShare[];
};

export type SplitSettlement = {
  id: string;
  group_id: string;
  from_email: string;
  from_name?: string | null;
  to_email: string;
  to_name?: string | null;
  amount: number;
  payment_method?: string | null;
  status: string;
  completed_at?: string | null;
  created_at?: string;
};

export type SplitBalanceEdge = SimplifiedEdge;

type SplitType = "equal" | "exact" | "percentage" | "shares";

const CACHE_TTL = 2 * 60 * 1000;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function makeInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 8 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join("");
}

export function groupCodeLink(inviteCode: string | null | undefined) {
  if (!inviteCode) return "";
  return `${siteBase()}/split/join?code=${encodeURIComponent(inviteCode)}`;
}

function pickSplitMaps(input: {
  splitType: SplitType;
  exactAmounts?: Record<string, number>;
  percentages?: Record<string, number>;
  shareCounts?: Record<string, number>;
}) {
  return {
    exactAmounts: input.splitType === "exact" ? input.exactAmounts : undefined,
    percentages:
      input.splitType === "percentage" ? input.percentages : undefined,
    shareCounts: input.splitType === "shares" ? input.shareCounts : undefined,
  };
}

type SplitStore = {
  groups: SplitGroup[];
  activeGroup: SplitGroup | null;
  expenses: SplitExpense[];
  settlements: SplitSettlement[];
  balances: SplitBalanceEdge[];
  netBalances: NetBalance[];
  loading: boolean;
  lastFetched: Record<string, number>;

  fetchGroups: (
    userId: string,
    userEmail: string,
    forceRefresh?: boolean,
  ) => Promise<void>;
  fetchGroupDetail: (groupId: string) => Promise<void>;
  createGroup: (input: {
    name: string;
    emoji: string;
    type: string;
    userId: string;
    userEmail: string;
    userName: string;
  }) => Promise<{ groupId: string | null; error?: string }>;
  inviteLink: (
    groupId: string,
    groupName?: string,
  ) => Promise<{ inviteUrl?: string; error?: string }>;
  inviteByEmail: (input: {
    groupId: string;
    groupName: string;
    email: string;
  }) => Promise<{
    inviteUrl?: string;
    emailSent?: boolean;
    emailError?: string | null;
    error?: string;
  }>;
  joinInvite: (input: {
    token?: string;
    code?: string;
    userId: string;
    userEmail: string;
    userName: string;
  }) => Promise<{
    groupId?: string;
    groupName?: string;
    error?: string;
    status?: number;
  }>;
  addExpense: (input: {
    groupId: string;
    title: string;
    amount: number;
    category: string;
    paidByEmail: string;
    paidByName: string;
    paidByUserId?: string | null;
    splitType: SplitType;
    expenseDate: string;
    notes?: string;
    includedMembers: Array<
      Pick<SplitGroupMember, "email" | "display_name" | "user_id">
    >;
    exactAmounts?: Record<string, number>;
    percentages?: Record<string, number>;
    shareCounts?: Record<string, number>;
    createdBy: string;
  }) => Promise<{ error?: string }>;
  editExpense: (input: {
    expenseId: string;
    groupId: string;
    title: string;
    amount: number;
    category: string;
    expenseDate: string;
    notes?: string | null;
    splitType: SplitType;
    paidByEmail: string;
    paidByName: string;
    paidByUserId?: string | null;
    includedMembers: Array<
      Pick<SplitGroupMember, "email" | "display_name" | "user_id">
    >;
    exactAmounts?: Record<string, number>;
    percentages?: Record<string, number>;
    shareCounts?: Record<string, number>;
  }) => Promise<{ error?: string }>;
  settleUp: (input: {
    groupId: string;
    toEmail: string;
    amount: number;
    userId: string;
    userEmail: string;
    userName?: string;
    paymentMethod?: string;
    notes?: string;
  }) => Promise<{ error?: string }>;
  deleteGroup: (groupId: string) => Promise<boolean>;
  deleteExpense: (
    groupId: string,
    expenseId: string,
  ) => Promise<{ error?: string }>;
  leaveGroup: (
    groupId: string,
    userEmail: string,
    targetEmail?: string,
  ) => Promise<{ success: boolean; error?: string; amount?: number }>;
  joinByCode: (input: {
    code: string;
    userId: string;
    userEmail: string;
    userName: string;
  }) => Promise<{ groupId?: string; groupName?: string; error?: string }>;
  clearActive: () => void;
};

export const useSplitStore = create<SplitStore>((set, get) => ({
  groups: [],
  activeGroup: null,
  expenses: [],
  settlements: [],
  balances: [],
  netBalances: [],
  loading: false,
  lastFetched: {},

  clearActive: () =>
    set({
      activeGroup: null,
      expenses: [],
      settlements: [],
      balances: [],
      netBalances: [],
    }),

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
        ? {
            activeGroup: null,
            expenses: [],
            settlements: [],
            balances: [],
            netBalances: [],
          }
        : {}),
    });
    try {
      const supabase = getSupabase();
      const [groupRes, membersRes, expensesRes, settlementsRes] =
        await Promise.all([
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
            .or("is_deleted.eq.false,is_deleted.is.null")
            .order("expense_date", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("split_settlements")
            .select("*")
            .eq("group_id", groupId)
            .eq("status", "completed")
            .order("completed_at", { ascending: false })
            .limit(50),
        ]);

      if (groupRes.error) throw groupRes.error;
      if (membersRes.error) throw membersRes.error;
      if (expensesRes.error) throw expensesRes.error;

      const group = groupRes.data as SplitGroup;
      const members = ((membersRes.data as SplitGroupMember[]) ?? []).filter(
        (m) => m.status !== "left",
      );
      const expenses = (expensesRes.data as SplitExpense[]) ?? [];
      const settlements = (settlementsRes.data as SplitSettlement[]) ?? [];

      const balanceMembers = members.map((m) => ({
          email: m.email,
          display_name: m.display_name,
        }));

      const { net, edges } = computeGroupBalances(
        balanceMembers,
        expenses.map((e) => ({
          amount: e.amount,
          paid_by_email: e.paid_by_email,
          paid_by_name: e.paid_by_name,
          shares: e.shares,
        })),
        settlements.map((s) => ({
          from_email: s.from_email,
          from_name: s.from_name,
          to_email: s.to_email,
          to_name: s.to_name,
          amount: s.amount,
        })),
      );

      set({
        activeGroup: { ...group, members },
        expenses,
        settlements,
        balances: edges,
        netBalances: net,
        loading: false,
      });
    } catch (err) {
      console.error("fetchGroupDetail error:", err);
      set({ loading: false });
    }
  },

  createGroup: async (input) => {
    const api = await splitApi<{ groupId?: string }>("/api/split/groups", {
      method: "POST",
      body: {
        name: input.name.trim(),
        emoji: input.emoji?.trim() || "",
        type: input.type || "general",
        displayName: input.userName,
      },
    });
    if (api.ok && api.data.groupId) {
      set({ lastFetched: {} });
      return { groupId: api.data.groupId };
    }
    if (!api.ok && !api.unavailable) {
      return { groupId: null, error: api.error };
    }

    try {
      const supabase = getSupabase();
      const email = input.userEmail.toLowerCase().trim();
      const inviteCode = makeInviteCode();
      const { data: group, error: groupError } = await supabase
        .from("split_groups")
        .insert({
          name: input.name.trim(),
          emoji: input.emoji?.trim() || "💰",
          group_type: input.type || "general",
          created_by: input.userId,
          invite_code: inviteCode,
          is_active: true,
          currency: "INR",
        })
        .select("*")
        .single();

      if (groupError || !group) {
        return {
          groupId: null,
          error: groupError?.message ?? "Could not create group",
        };
      }

      const { error: memberError } = await supabase
        .from("split_group_members")
        .insert({
          group_id: group.id,
          user_id: input.userId,
          email,
          display_name:
            input.userName?.trim() || email.split("@")[0] || "Admin",
          role: "admin",
          status: "active",
          joined_at: new Date().toISOString(),
        });

      if (memberError) {
        await supabase.from("split_groups").delete().eq("id", group.id);
        return { groupId: null, error: memberError.message };
      }

      set({ lastFetched: {} });
      return { groupId: group.id as string };
    } catch (err) {
      return {
        groupId: null,
        error: err instanceof Error ? err.message : "Could not create group",
      };
    }
  },

  inviteLink: async (groupId, groupName) => {
    const api = await splitApi<{ inviteUrl?: string }>("/api/split/invite", {
      method: "POST",
      body: {
        groupId,
        groupName: groupName ?? get().activeGroup?.name ?? "",
        linkOnly: true,
      },
    });
    if (api.ok && api.data.inviteUrl) return { inviteUrl: api.data.inviteUrl };
    if (!api.ok && !api.unavailable) return { error: api.error };

    try {
      const supabase = getSupabase();
      const { data: group, error } = await supabase
        .from("split_groups")
        .select("invite_code, name")
        .eq("id", groupId)
        .single();
      if (error) throw error;

      let code = group?.invite_code;
      if (!code) {
        code = makeInviteCode();
        await supabase
          .from("split_groups")
          .update({ invite_code: code })
          .eq("id", groupId);
      }

      return { inviteUrl: groupCodeLink(code) };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Could not create invite",
      };
    }
  },

  inviteByEmail: async (input) => {
    const api = await splitApi<{
      inviteUrl?: string;
      emailSent?: boolean;
      emailError?: string | null;
    }>("/api/split/invite", {
      method: "POST",
      body: {
        groupId: input.groupId,
        groupName: input.groupName,
        invitedEmail: input.email.trim().toLowerCase(),
        linkOnly: false,
      },
    });
    if (!api.ok) return { error: api.error };
    void get().fetchGroupDetail(input.groupId);
    return {
      inviteUrl: api.data.inviteUrl,
      emailSent: Boolean(api.data.emailSent),
      emailError: api.data.emailError ?? null,
    };
  },

  addExpense: async (input) => {
    const api = await splitApi("/api/split/expenses", {
      method: "POST",
      body: {
        groupId: input.groupId,
        title: input.title.trim(),
        amount: round2(input.amount),
        category: input.category,
        paidByEmail: input.paidByEmail.toLowerCase().trim(),
        paidByName: input.paidByName,
        paidByUserId: input.paidByUserId ?? null,
        splitType: input.splitType,
        expenseDate: input.expenseDate,
        notes: input.notes?.trim() || "",
        includedMembers: input.includedMembers,
        ...pickSplitMaps(input),
      },
    });
    if (api.ok) {
      set({ lastFetched: {} });
      void get().fetchGroupDetail(input.groupId);
      return {};
    }
    if (!api.unavailable) return { error: api.error };

    try {
      const { shares, error: shareErr } = computeSplitShares({
        amount: input.amount,
        splitType: input.splitType,
        includedMembers: input.includedMembers,
        exactAmounts: input.exactAmounts,
        percentages: input.percentages,
        shareCounts: input.shareCounts,
      });
      if (shareErr) return { error: shareErr };

      const supabase = getSupabase();
      const { data: expense, error: expErr } = await supabase
        .from("split_expenses")
        .insert({
          group_id: input.groupId,
          title: input.title.trim(),
          amount: round2(input.amount),
          currency: "INR",
          category: input.category || "other",
          paid_by_user_id: input.paidByUserId ?? null,
          paid_by_email: input.paidByEmail.toLowerCase().trim(),
          paid_by_name: input.paidByName,
          split_type: input.splitType,
          expense_date: input.expenseDate,
          notes: input.notes?.trim() || null,
          is_settlement: false,
          is_deleted: false,
          created_by: input.createdBy,
        })
        .select("*")
        .single();

      if (expErr || !expense) {
        return { error: expErr?.message ?? "Could not add expense" };
      }

      const shareRows = shares.map((s) => ({
        expense_id: expense.id,
        group_id: input.groupId,
        user_id: s.user_id,
        email: s.email,
        display_name: s.display_name,
        share_amount: s.share_amount,
        share_percentage: s.share_percentage,
        is_settled: false,
      }));

      const { error: shareInsertErr } = await supabase
        .from("split_expense_shares")
        .insert(shareRows);
      if (shareInsertErr) {
        await supabase.from("split_expenses").delete().eq("id", expense.id);
        return { error: shareInsertErr.message };
      }

      await supabase
        .from("split_groups")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", input.groupId);

      set({ lastFetched: {} });
      void get().fetchGroupDetail(input.groupId);
      return {};
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Could not add expense",
      };
    }
  },

  editExpense: async (input) => {
    const api = await splitApi(`/api/split/expenses/${input.expenseId}`, {
      method: "PUT",
      body: {
        title: input.title.trim(),
        amount: round2(input.amount),
        category: input.category,
        expenseDate: input.expenseDate,
        notes: input.notes ?? null,
        splitType: input.splitType,
        includedMembers: input.includedMembers,
        ...pickSplitMaps(input),
        paidByEmail: input.paidByEmail.toLowerCase().trim(),
        paidByName: input.paidByName,
        paidByUserId: input.paidByUserId ?? null,
      },
    });
    if (api.ok) {
      set({ lastFetched: {} });
      await get().fetchGroupDetail(input.groupId);
      return {};
    }
    if (!api.unavailable) return { error: api.error };

    try {
      const { shares, error: shareErr } = computeSplitShares({
        amount: input.amount,
        splitType: input.splitType,
        includedMembers: input.includedMembers,
        exactAmounts: input.exactAmounts,
        percentages: input.percentages,
        shareCounts: input.shareCounts,
      });
      if (shareErr) return { error: shareErr };

      const supabase = getSupabase();
      const { error: expErr } = await supabase
        .from("split_expenses")
        .update({
          title: input.title.trim(),
          amount: round2(input.amount),
          category: input.category || "other",
          paid_by_user_id: input.paidByUserId ?? null,
          paid_by_email: input.paidByEmail.toLowerCase().trim(),
          paid_by_name: input.paidByName,
          split_type: input.splitType,
          expense_date: input.expenseDate,
          notes: input.notes?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.expenseId);

      if (expErr) return { error: expErr.message };

      await supabase
        .from("split_expense_shares")
        .delete()
        .eq("expense_id", input.expenseId);

      const shareRows = shares.map((s) => ({
        expense_id: input.expenseId,
        group_id: input.groupId,
        user_id: s.user_id,
        email: s.email,
        display_name: s.display_name,
        share_amount: s.share_amount,
        share_percentage: s.share_percentage,
        is_settled: false,
      }));

      const { error: shareInsertErr } = await supabase
        .from("split_expense_shares")
        .insert(shareRows);
      if (shareInsertErr) return { error: shareInsertErr.message };

      set({ lastFetched: {} });
      await get().fetchGroupDetail(input.groupId);
      return {};
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Could not update expense",
      };
    }
  },

  settleUp: async (input) => {
    const api = await splitApi("/api/split/settle", {
      method: "POST",
      body: {
        groupId: input.groupId,
        toEmail: input.toEmail.toLowerCase().trim(),
        amount: round2(input.amount),
        paymentMethod: input.paymentMethod,
        notes: input.notes,
      },
    });
    if (api.ok) {
      set({ lastFetched: {} });
      await get().fetchGroupDetail(input.groupId);
      return {};
    }
    if (!api.unavailable) return { error: api.error };

    try {
      const supabase = getSupabase();
      const fromEmail = input.userEmail.toLowerCase().trim();
      const toEmail = input.toEmail.toLowerCase().trim();
      if (fromEmail === toEmail) {
        return { error: "You cannot settle up with yourself" };
      }

      const group = get().activeGroup;
      const toMember = group?.members?.find(
        (m) => m.email.toLowerCase() === toEmail,
      );

      const { error } = await supabase.from("split_settlements").insert({
        group_id: input.groupId,
        from_user_id: input.userId,
        from_email: fromEmail,
        to_user_id: toMember?.user_id || null,
        to_email: toEmail,
        amount: round2(input.amount),
        payment_method: input.paymentMethod || "upi",
        status: "completed",
        completed_at: new Date().toISOString(),
      });

      if (error) return { error: error.message };

      set({ lastFetched: {} });
      await get().fetchGroupDetail(input.groupId);
      return {};
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Could not settle up",
      };
    }
  },

  deleteGroup: async (groupId) => {
    try {
      const api = await splitApi("/api/split/groups", {
        method: "DELETE",
        query: { groupId },
      });
      if (!api.ok && !api.unavailable) return false;
      if (!api.ok) {
        const { error } = await getSupabase()
          .from("split_groups")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", groupId);
        if (error) return false;
      }

      set((state) => ({
        groups: state.groups.filter((g) => g.id !== groupId),
        activeGroup:
          state.activeGroup?.id === groupId ? null : state.activeGroup,
        expenses: state.activeGroup?.id === groupId ? [] : state.expenses,
        settlements: state.activeGroup?.id === groupId ? [] : state.settlements,
        balances: state.activeGroup?.id === groupId ? [] : state.balances,
        netBalances: state.activeGroup?.id === groupId ? [] : state.netBalances,
        lastFetched: {},
      }));
      return true;
    } catch {
      return false;
    }
  },

  deleteExpense: async (groupId, expenseId) => {
    try {
      const api = await splitApi(`/api/split/expenses/${expenseId}`, {
        method: "DELETE",
      });
      if (!api.ok && !api.unavailable) return { error: api.error };
      if (!api.ok) {
        const { error } = await getSupabase()
          .from("split_expenses")
          .update({ is_deleted: true })
          .eq("id", expenseId);
        if (error) return { error: error.message };
      }

      set({ lastFetched: {} });
      await get().fetchGroupDetail(groupId);
      return {};
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Could not delete expense",
      };
    }
  },

  leaveGroup: async (groupId, userEmail, targetEmail) => {
    try {
      const me = userEmail.toLowerCase().trim();
      const target = (targetEmail ?? me).toLowerCase().trim();

      const api = await splitApi("/api/split/members", {
        method: "DELETE",
        query: {
          groupId,
          email: targetEmail && target !== me ? target : undefined,
        },
      });
      if (!api.ok && !api.unavailable) {
        const amount = Number(api.data.amount);
        return {
          success: false,
          error: api.error,
          amount: Number.isFinite(amount) ? amount : undefined,
        };
      }

      if (!api.ok) {
        const net =
          get().netBalances.find((n) => n.email === target)?.net ?? 0;
        if (Math.abs(net) > 0.01) {
          return {
            success: false,
            error: "Unsettled balances exist",
            amount: Math.abs(net),
          };
        }
        const { error } = await getSupabase()
          .from("split_group_members")
          .update({
            status: "left",
            left_at: new Date().toISOString(),
          })
          .eq("group_id", groupId)
          .eq("email", target);
        if (error) return { success: false, error: error.message };
      }

      set({ lastFetched: {} });
      if (target === me) {
        set((s) => ({
          groups: s.groups.filter((g) => g.id !== groupId),
        }));
      } else {
        await get().fetchGroupDetail(groupId);
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Could not leave group",
      };
    }
  },

  joinInvite: async (input) => {
    const token = input.token?.trim();
    const code = input.code?.trim().toUpperCase();
    if (!token && !code) return { error: "Invalid invite link" };

    const api = await splitApi<{ groupId?: string; groupName?: string }>(
      "/api/split/join",
      { method: "POST", body: token ? { token } : { code } },
    );
    if (api.ok && api.data.groupId) {
      set({ lastFetched: {} });
      return { groupId: api.data.groupId, groupName: api.data.groupName };
    }
    if (!api.ok && !api.unavailable) {
      return { error: api.error, status: api.status };
    }
    if (!code) {
      return { error: api.ok ? "Could not join group" : api.error };
    }
    return get().joinByCode({ ...input, code });
  },

  joinByCode: async (input) => {
    try {
      const code = input.code.trim().toUpperCase();
      if (!code) return { error: "Enter an invite code" };

      const supabase = getSupabase();
      const { data: group, error: gErr } = await supabase
        .from("split_groups")
        .select("id, name, is_active")
        .eq("invite_code", code)
        .maybeSingle();

      if (gErr) return { error: gErr.message };
      if (!group || group.is_active === false) {
        return { error: "Group not found for this invite code" };
      }

      const email = input.userEmail.toLowerCase().trim();
      const { error: mErr } = await supabase.from("split_group_members").upsert(
        {
          group_id: group.id,
          user_id: input.userId,
          email,
          display_name:
            input.userName?.trim() || email.split("@")[0] || "Member",
          status: "active",
          role: "member",
          joined_at: new Date().toISOString(),
          left_at: null,
        },
        { onConflict: "group_id,email" },
      );

      if (mErr) return { error: mErr.message };

      set({ lastFetched: {} });
      return { groupId: group.id, groupName: group.name };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Could not join group",
      };
    }
  },
}));

export function getMyBalanceFromEdges(
  myEmail: string,
  edges: SplitBalanceEdge[],
) {
  const me = myEmail.toLowerCase();
  let net = 0;
  for (const b of edges) {
    const amt = Number(b.amount ?? 0);
    if (!Number.isFinite(amt) || amt <= 0) continue;
    if (b.to_email?.toLowerCase() === me) net += amt;
    if (b.from_email?.toLowerCase() === me) net -= amt;
  }
  return round2(net);
}

export function getMyNetBalance(myEmail: string, net: NetBalance[]) {
  const me = (myEmail ?? "").toLowerCase();
  const found = net.find((n) => n.email === me);
  return found ? found.net : 0;
}

export function formatSplitRupee(amount: number) {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatSplitRupeeExact(amount: number) {
  const n = round2(amount);
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
