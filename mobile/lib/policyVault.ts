/**
 * Native port of web `lib/userPolicies.ts` (policy vault on `user_policies`).
 * Not a byte-identical mirror: the web file imports `@/lib/supabaseClient` and
 * reads a `NEXT_PUBLIC_*` env var, neither of which exists in the Expo bundle.
 */
import { supabase } from "@/lib/supabase";

/** Use this for RLS-backed tables — must match `auth.uid()`, not a client-generated id. */
export async function getSupabaseAuthUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) return null;
  return data.user.id;
}

export const POLICY_TYPES = [
  "term_life",
  "health",
  "car",
  "bike",
  "travel",
  "other",
] as const;

export type PolicyType = (typeof POLICY_TYPES)[number];

export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
  term_life: "Term life",
  health: "Health",
  car: "Car",
  bike: "Bike",
  travel: "Travel",
  other: "Other",
};

export type PremiumFrequency = "monthly" | "yearly";

export type PolicyStatus = "active" | "expired" | "transferred_to_finkoin";

export type UserPolicy = {
  id: string;
  userId: string;
  policyType: PolicyType;
  insurerName: string;
  policyNumber: string | null;
  planName: string | null;
  coverAmount: number;
  premiumAmount: number;
  premiumFrequency: PremiumFrequency;
  /** YYYY-MM-DD; null for a policy imported from Analyse without one. */
  renewalDate: string | null;
  purchaseDate: string | null;
  nomineeName: string | null;
  status: PolicyStatus;
  createdAt: string;
  updatedAt: string;
};

type UserPolicyRow = {
  id: string;
  user_id: string;
  policy_type: string;
  insurer_name: string;
  policy_number: string | null;
  plan_name: string | null;
  cover_amount: string | number | null;
  premium_amount: string | number | null;
  premium_frequency: string | null;
  renewal_date: string | null;
  purchase_date: string | null;
  nominee_name: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

function n(v: string | number | null | undefined): number {
  if (v == null || v === "") return 0;
  const x = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(x) ? x : 0;
}

function mapPolicyType(raw: string): PolicyType {
  if (POLICY_TYPES.includes(raw as PolicyType)) return raw as PolicyType;
  return "other";
}

function mapFrequency(raw: string | null | undefined): PremiumFrequency {
  return raw === "yearly" ? "yearly" : "monthly";
}

function mapStatus(raw: string | null | undefined): PolicyStatus {
  if (raw === "transferred_to_finkoin") return "transferred_to_finkoin";
  if (raw === "expired") return "expired";
  return "active";
}

export function fromUserPolicyRow(row: UserPolicyRow): UserPolicy {
  return {
    id: row.id,
    userId: row.user_id,
    policyType: mapPolicyType(row.policy_type),
    insurerName: row.insurer_name ?? "",
    policyNumber: row.policy_number,
    planName: row.plan_name,
    coverAmount: n(row.cover_amount),
    premiumAmount: n(row.premium_amount),
    premiumFrequency: mapFrequency(row.premium_frequency),
    renewalDate: row.renewal_date,
    purchaseDate: row.purchase_date,
    nomineeName: row.nominee_name,
    status: mapStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const INSURER_SUGGESTIONS = [
  "LIC",
  "HDFC Life",
  "ICICI Pru",
  "Max Life",
  "SBI Life",
  "Star Health",
  "Niva Bupa",
  "HDFC ERGO",
  "New India",
  "United India",
  "Other",
] as const;

const INSURER_WEBSITES: Record<string, string> = {
  LIC: "https://www.licindia.in/",
  "HDFC Life": "https://www.hdfclife.com/",
  "ICICI Pru": "https://www.iciciprulife.com/",
  "Max Life": "https://www.maxlifeinsurance.com/",
  "SBI Life": "https://www.sbilife.co.in/",
  "Star Health": "https://www.starhealth.in/",
  "Niva Bupa": "https://www.nivabupa.com/",
  "HDFC ERGO": "https://www.hdfcergo.com/",
  "New India": "https://www.newindia.co.in/",
  "United India": "https://uiic.co.in/",
  Other: "https://www.google.com/search?q=insurance+renewal+online",
};

export function insurerRenewalWebsite(insurerName: string): string {
  const key = insurerName.trim();
  if (INSURER_WEBSITES[key]) return INSURER_WEBSITES[key];
  const lower = key.toLowerCase();
  for (const [k, url] of Object.entries(INSURER_WEBSITES)) {
    if (k.toLowerCase() === lower) return url;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(key + " insurance renewal")}`;
}

export function insurerFormDownloadUrl(insurerName: string): string {
  return insurerRenewalWebsite(insurerName);
}

/** Human-readable cover (lakh / crore) for cards. */
export function formatPolicyCover(rupees: number): string {
  if (!Number.isFinite(rupees) || rupees <= 0) return "—";
  const cr = 1_00_00_000;
  const lk = 1_00_000;
  if (rupees >= cr) {
    const v = rupees / cr;
    const s = v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "");
    return `₹${s} crore`;
  }
  if (rupees >= lk) {
    const v = rupees / lk;
    const s = v >= 100 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "");
    return `₹${s} lakh`;
  }
  return `₹${Math.round(rupees).toLocaleString("en-IN")}`;
}

export type PolicyFormInput = {
  policyType: PolicyType;
  insurerName: string;
  policyNumber: string;
  planName: string;
  coverAmount: number;
  premiumAmount: number;
  premiumFrequency: PremiumFrequency;
  renewalDate: string;
  purchaseDate: string;
  nomineeName: string;
  status: PolicyStatus;
};

export function emptyPolicyForm(): PolicyFormInput {
  return {
    policyType: "term_life",
    insurerName: "",
    policyNumber: "",
    planName: "",
    coverAmount: 0,
    premiumAmount: 0,
    premiumFrequency: "monthly",
    renewalDate: "",
    purchaseDate: "",
    nomineeName: "",
    status: "active",
  };
}

export function policyToForm(p: UserPolicy): PolicyFormInput {
  return {
    policyType: p.policyType,
    insurerName: p.insurerName,
    policyNumber: p.policyNumber ?? "",
    planName: p.planName ?? "",
    coverAmount: p.coverAmount,
    premiumAmount: p.premiumAmount,
    premiumFrequency: p.premiumFrequency,
    renewalDate: p.renewalDate ?? "",
    purchaseDate: p.purchaseDate ?? "",
    nomineeName: p.nomineeName ?? "",
    status: p.status,
  };
}

export async function fetchUserPolicies(userId: string): Promise<{
  policies: UserPolicy[];
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("user_policies")
    .select("*")
    .eq("user_id", userId)
    .order("renewal_date", { ascending: true });
  if (error) {
    return { policies: [], error: new Error(error.message) };
  }
  const rows = (data ?? []) as UserPolicyRow[];
  return { policies: rows.map(fromUserPolicyRow), error: null };
}

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, day] = yyyyMmDd.split("-").map((x) => Number(x));
  return new Date(y, (m ?? 1) - 1, day ?? 1);
}

export function daysUntilRenewal(renewalDateYmd: string): number {
  const renewal = startOfLocalDay(parseLocalDate(renewalDateYmd));
  const today = startOfLocalDay(new Date());
  return Math.round((renewal.getTime() - today.getTime()) / 86_400_000);
}

export function formatRenewalDayMonth(renewalDateYmd: string): string {
  const d = parseLocalDate(renewalDateYmd);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function looksLikeMissingStatusColumn(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("status") &&
    (m.includes("column") ||
      m.includes("schema") ||
      m.includes("could not find"))
  );
}

export async function insertUserPolicy(
  userId: string,
  input: PolicyFormInput,
): Promise<{ policy: UserPolicy | null; error: Error | null }> {
  const row = {
    user_id: userId,
    policy_type: input.policyType,
    insurer_name: input.insurerName.trim(),
    policy_number: input.policyNumber.trim() || null,
    plan_name: input.planName.trim() || null,
    cover_amount: input.coverAmount,
    premium_amount: input.premiumAmount,
    premium_frequency: input.premiumFrequency,
    renewal_date: input.renewalDate,
    purchase_date: input.purchaseDate.trim() || null,
    nominee_name: input.nomineeName.trim() || null,
    status: input.status,
    updated_at: new Date().toISOString(),
  };
  let { data, error } = await supabase
    .from("user_policies")
    .insert(row)
    .select("*")
    .single();
  if (error && looksLikeMissingStatusColumn(error.message)) {
    const { status: _omit, ...withoutStatus } = row;
    const retry = await supabase
      .from("user_policies")
      .insert(withoutStatus)
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }
  if (error) return { policy: null, error: new Error(error.message) };
  return { policy: fromUserPolicyRow(data as UserPolicyRow), error: null };
}

export async function updateUserPolicy(
  policyId: string,
  input: Partial<PolicyFormInput> & { status?: PolicyStatus },
): Promise<{ policy: UserPolicy | null; error: Error | null }> {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.policyType != null) patch.policy_type = input.policyType;
  if (input.insurerName != null) patch.insurer_name = input.insurerName.trim();
  if (input.policyNumber != null)
    patch.policy_number = input.policyNumber.trim() || null;
  if (input.planName != null) patch.plan_name = input.planName.trim() || null;
  if (input.coverAmount != null) patch.cover_amount = input.coverAmount;
  if (input.premiumAmount != null) patch.premium_amount = input.premiumAmount;
  if (input.premiumFrequency != null)
    patch.premium_frequency = input.premiumFrequency;
  if (input.renewalDate != null) patch.renewal_date = input.renewalDate;
  if (input.purchaseDate != null)
    patch.purchase_date = input.purchaseDate.trim() || null;
  if (input.nomineeName != null)
    patch.nominee_name = input.nomineeName.trim() || null;
  if (input.status != null) patch.status = input.status;

  const { data, error } = await supabase
    .from("user_policies")
    .update(patch)
    .eq("id", policyId)
    .select("*")
    .single();
  if (error) return { policy: null, error: new Error(error.message) };
  return { policy: fromUserPolicyRow(data as UserPolicyRow), error: null };
}

export async function deleteUserPolicy(
  policyId: string,
): Promise<{ error: Error | null }> {
  // A policy imported from Analyse (web) would be imported again on the next
  // visit; remember the deletion so it stays gone. Best effort.
  try {
    const { data } = await supabase
      .from("user_policies")
      .select("*")
      .eq("id", policyId)
      .maybeSingle();
    const row = data as {
      user_id?: string;
      analyse_source_key?: string | null;
    } | null;
    if (row?.user_id && row.analyse_source_key) {
      await supabase
        .from("user_policy_import_dismissals")
        .upsert(
          { user_id: row.user_id, analyse_source_key: row.analyse_source_key },
          { onConflict: "user_id,analyse_source_key", ignoreDuplicates: true },
        );
    }
  } catch {
    /* ignore */
  }
  const { error } = await supabase
    .from("user_policies")
    .delete()
    .eq("id", policyId);
  return { error: error ? new Error(error.message) : null };
}

export const FINKOIN_AGENT_CODE =
  process.env.EXPO_PUBLIC_FINKOIN_AGENT_CODE ?? "FK-AGENT-PLACEHOLDER";
