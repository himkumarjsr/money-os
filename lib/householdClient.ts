/**
 * Calls for linking two accounts as one household (migration 059). Takes the
 * caller's Supabase client so web and the app share it (mobile keeps a
 * byte-identical copy). Every call acts as the signed-in user only.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinancialProfile } from "@/lib/analyse-form-schema";

export type HouseholdShare = { profile: boolean; tracker: boolean };

export type HouseholdStatus = {
  status: "none" | "pending" | "active";
  /** Only while waiting for the partner to accept. */
  invite_code?: string | null;
  linked_at?: string | null;
  partner_name?: string | null;
  my_share?: HouseholdShare;
  partner_share?: HouseholdShare | null;
};

export type PartnerTransaction = {
  id: string;
  date: string;
  amount: number;
  category: string;
  subcategory: string | null;
  description: string | null;
  bucket: string;
  payment_method: string | null;
};

/** The database's own message (e.g. "This invite code is not valid…"). */
function fail(error: { message?: string } | null): never {
  throw new Error(error?.message || "Something went wrong. Try again.");
}

export async function householdStatus(
  supabase: SupabaseClient,
): Promise<HouseholdStatus> {
  const { data, error } = await supabase.rpc("household_status");
  if (error) fail(error);
  return (data as HouseholdStatus) ?? { status: "none" };
}

export async function createHouseholdInvite(
  supabase: SupabaseClient,
): Promise<string> {
  const { data, error } = await supabase.rpc("household_create_invite");
  if (error) fail(error);
  return String(data);
}

export async function acceptHouseholdInvite(
  supabase: SupabaseClient,
  code: string,
): Promise<HouseholdStatus> {
  const { data, error } = await supabase.rpc("household_accept_invite", {
    p_code: normaliseInviteCode(code),
  });
  if (error) fail(error);
  return data as HouseholdStatus;
}

export async function unlinkHousehold(supabase: SupabaseClient) {
  const { error } = await supabase.rpc("household_unlink");
  if (error) fail(error);
}

export async function setHouseholdShare(
  supabase: SupabaseClient,
  share: HouseholdShare,
): Promise<HouseholdStatus> {
  const { data, error } = await supabase.rpc("household_set_share", {
    p_profile: share.profile,
    p_tracker: share.tracker,
  });
  if (error) fail(error);
  return data as HouseholdStatus;
}

/** The partner's profile, or null when they haven't shared it. */
export async function partnerProfile(
  supabase: SupabaseClient,
): Promise<FinancialProfile | null> {
  const { data, error } = await supabase.rpc("household_partner_profile");
  if (error) fail(error);
  return data && typeof data === "object" && Object.keys(data).length > 0
    ? (data as FinancialProfile)
    : null;
}

/** The partner's tracker spends between two dates (YYYY-MM-DD), newest first. */
export async function partnerTransactions(
  supabase: SupabaseClient,
  from: string,
  to: string,
): Promise<PartnerTransaction[]> {
  const { data, error } = await supabase.rpc("household_partner_transactions", {
    p_from: from,
    p_to: to,
  });
  if (error) fail(error);
  return ((data as PartnerTransaction[]) ?? []).map((t) => ({
    ...t,
    amount: Number(t.amount) || 0,
  }));
}

/** Upper case, letters and digits only: "abcd-2345" → "ABCD2345". */
export function normaliseInviteCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function householdInviteUrl(code: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/household?code=${encodeURIComponent(code)}`;
}

/** First and last day of the month `d` falls in, as YYYY-MM-DD. */
export function monthRange(d: Date = new Date()): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const last = new Date(y, m, 0).getDate();
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(last)}` };
}

/** Spend per bucket (needs, wants, …) and in all. */
export function spendByBucket(rows: PartnerTransaction[]) {
  const byBucket = new Map<string, number>();
  for (const r of rows)
    byBucket.set(r.bucket, (byBucket.get(r.bucket) ?? 0) + r.amount);
  return {
    total: rows.reduce((s, r) => s + r.amount, 0),
    buckets: [...byBucket.entries()].sort((a, b) => b[1] - a[1]),
  };
}
