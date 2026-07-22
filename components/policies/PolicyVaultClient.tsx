"use client";

import BottomSheet from "@/components/ui/BottomSheet";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import MoneyInput from "@/components/ui/MoneyInput";
import { Button, ButtonLink } from "@/components/ui/button";
import { formatIndian, handleMoneyInput } from "@/lib/formatters";
import {
  POLICY_TYPES,
  POLICY_TYPE_LABELS,
  type PolicyFormInput,
  type PolicyType,
  type PremiumFrequency,
  type UserPolicy,
  emptyPolicyForm,
  fetchUserPolicies,
  getSupabaseAuthUserId,
  formatPolicyCover,
  formatRenewalDayMonth,
  daysUntilRenewal,
  FINKOIN_AGENT_CODE,
  insertUserPolicy,
  insurerFormDownloadUrl,
  insurerRenewalWebsite,
  INSURER_SUGGESTIONS,
  parseLocalDate,
  policyToForm,
  startOfLocalDay,
  updateUserPolicy,
} from "@/lib/userPolicies";
import { loginHrefPreserveRef } from "@/lib/referralRewards";
import { resolveAuthenticated } from "@/lib/authSession";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MOCK_COMPARE_COUNT = 12;
const MOCK_ALTS = [
  {
    name: "Niva Bupa ReAssure 2.0",
    blurb: "Higher NCB stack, restore & wellness",
  },
  {
    name: "HDFC ERGO Optima Restore",
    blurb: "Similar cover, multi-year discounts",
  },
];

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function policyBadgeClass(t: PolicyType): string {
  switch (t) {
    case "term_life":
      return "bg-violet-100 text-violet-800";
    case "health":
      return "bg-emerald-100 text-emerald-800";
    case "car":
      return "bg-sky-100 text-sky-800";
    case "bike":
      return "bg-amber-100 text-amber-800";
    case "travel":
      return "bg-cyan-100 text-cyan-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function renewalUi(policy: UserPolicy): {
  line: string;
  lineClass: string;
} {
  if (policy.status === "transferred_to_finkoin") {
    return {
      line: `Renews on ${formatRenewalDayMonth(policy.renewalDate)}`,
      lineClass: "text-slate-500",
    };
  }
  const today = startOfLocalDay(new Date());
  const rd = startOfLocalDay(parseLocalDate(policy.renewalDate));
  if (rd < today) {
    return {
      line: `Expired on ${formatRenewalDayMonth(policy.renewalDate)}`,
      lineClass: "text-red-600 font-medium",
    };
  }
  const d = daysUntilRenewal(policy.renewalDate);
  if (d <= 30)
    return {
      line: `Renews in ${d} day${d === 1 ? "" : "s"}`,
      lineClass: "text-red-600 font-semibold",
    };
  if (d <= 90)
    return {
      line: `Renews in ${d} days`,
      lineClass: "text-amber-700 font-medium",
    };
  return {
    line: `Renews on ${formatRenewalDayMonth(policy.renewalDate)}`,
    lineClass: "text-slate-500",
  };
}

function statusBadge(policy: UserPolicy): { label: string; className: string } {
  if (policy.status === "transferred_to_finkoin") {
    return {
      label: "Transferred to Finkoin",
      className: "bg-violet-100 text-violet-800",
    };
  }
  const today = startOfLocalDay(new Date());
  const rd = startOfLocalDay(parseLocalDate(policy.renewalDate));
  if (rd < today)
    return { label: "Expired", className: "bg-red-100 text-red-700" };
  return { label: "Active", className: "bg-emerald-100 text-emerald-800" };
}

function isLifeCategory(t: PolicyType): boolean {
  return t === "term_life" || t === "travel" || t === "other";
}

function isHealthCategory(t: PolicyType): boolean {
  return t === "health";
}

export default function PolicyVaultClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const authUserId = useAuthStore((s) => s.user?.id);

  const [authChecked, setAuthChecked] = useState(false);
  const [sessionLoggedIn, setSessionLoggedIn] = useState(false);

  useEffect(() => {
    if (!hasInitialized) return;

    let cancelled = false;
    void (async () => {
      const authenticated = await resolveAuthenticated();
      if (cancelled) return;
      setSessionLoggedIn(authenticated);
      setAuthChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [hasInitialized]);

  const canAccessVault = isLoggedIn || sessionLoggedIn;
  const [policies, setPolicies] = useState<UserPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [renewFor, setRenewFor] = useState<UserPolicy | null>(null);
  const [transferFor, setTransferFor] = useState<UserPolicy | null>(null);
  const [form, setForm] = useState<PolicyFormInput>(() => emptyPolicyForm());
  const [formKey, setFormKey] = useState(0);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const premiumInputRef = useRef<HTMLInputElement | null>(null);

  const reload = useCallback(async () => {
    const uid = await getSupabaseAuthUserId();
    if (!uid) {
      setPolicies([]);
      setLoading(false);
      setLoadError(
        isLoggedIn || canAccessVault
          ? "No Supabase session — policies need a real login (Google or email). Phone login must complete OTP so a session exists. Sign out and sign in again if this persists."
          : null,
      );
      return;
    }
    setLoading(true);
    setLoadError(null);
    const { policies: list, error } = await fetchUserPolicies(uid);
    setLoading(false);
    if (error) {
      setLoadError(error.message);
      setPolicies([]);
      return;
    }
    setPolicies(list);
  }, [canAccessVault, hasInitialized]);

  useEffect(() => {
    if (!hasInitialized) return;
    void reload();
  }, [reload, authUserId, hasInitialized]);

  useEffect(() => {
    const add = searchParams?.get("add");
    if (!add || !hasInitialized || !isLoggedIn) return;
    const cover = Number(searchParams?.get("cover")) || 0;
    const premium = Number(searchParams?.get("premium")) || 0;
    const freq = (
      searchParams?.get("freq") === "yearly" ? "yearly" : "monthly"
    ) as PremiumFrequency;
    if (add === "term") {
      setForm((f) => ({
        ...f,
        policyType: "term_life",
        coverAmount: cover || f.coverAmount,
        premiumAmount: premium || f.premiumAmount,
        premiumFrequency: premium ? freq : f.premiumFrequency,
      }));
      setEditId(null);
      setFormKey((k) => k + 1);
      setAddOpen(true);
      router.replace("/policies", { scroll: false });
      return;
    }
    if (add === "health") {
      setForm((f) => ({
        ...f,
        policyType: "health",
        coverAmount: cover || f.coverAmount,
        premiumAmount: premium || f.premiumAmount,
        premiumFrequency: premium ? freq : f.premiumFrequency,
      }));
      setEditId(null);
      setFormKey((k) => k + 1);
      setAddOpen(true);
      router.replace("/policies", { scroll: false });
    }
  }, [searchParams, isLoggedIn, router, hasInitialized]);

  const openNew = () => {
    setForm(emptyPolicyForm());
    setEditId(null);
    setFormError(null);
    setFormKey((k) => k + 1);
    setAddOpen(true);
  };

  const openEdit = (p: UserPolicy) => {
    setForm(policyToForm(p));
    setEditId(p.id);
    setFormError(null);
    setFormKey((k) => k + 1);
    setAddOpen(true);
  };

  const onSave = async () => {
    setFormError(null);
    try {
      const uid = await getSupabaseAuthUserId();
      if (!uid) {
        setFormError(
          "Cannot save: no Supabase session. Sign out and sign in with Google or email (or complete phone OTP).",
        );
        return;
      }
      const c = coverInputRef.current
        ? handleMoneyInput(coverInputRef.current.value)
        : null;
      const pr = premiumInputRef.current
        ? handleMoneyInput(premiumInputRef.current.value)
        : null;
      const nextForm: PolicyFormInput = {
        ...form,
        coverAmount: c !== null && c > 0 ? c : form.coverAmount,
        premiumAmount: pr !== null && pr > 0 ? pr : form.premiumAmount,
      };
      setForm(nextForm);
      if (
        !nextForm.insurerName.trim() ||
        !nextForm.renewalDate ||
        nextForm.coverAmount <= 0 ||
        nextForm.premiumAmount <= 0
      ) {
        if (!nextForm.insurerName.trim()) {
          setFormError(
            "Enter insurer name (company), not only the plan name — scroll up to the Insurer field.",
          );
          document.getElementById("insurer-name")?.focus();
        } else if (!nextForm.renewalDate) setFormError("Select renewal date");
        else if (nextForm.coverAmount <= 0) setFormError("Enter cover amount");
        else if (nextForm.premiumAmount <= 0)
          setFormError("Enter premium amount");
        return;
      }
      setSaving(true);
      let err: Error | null = null;
      if (editId) {
        const r = await updateUserPolicy(editId, nextForm);
        err = r.error;
      } else {
        const r = await insertUserPolicy(uid, nextForm);
        err = r.error;
      }
      setSaving(false);
      if (err) {
        setFormError(err.message);
        return;
      }
      setAddOpen(false);
      void reload();
    } catch (e) {
      setSaving(false);
      setFormError(
        e instanceof Error ? e.message : "Save failed. Please try again.",
      );
      console.error("Policy save error:", e);
    }
  };

  const goCompare = (p: UserPolicy) => {
    try {
      sessionStorage.setItem(
        "finkoin_compare_prefill",
        JSON.stringify({
          insurerName: p.insurerName,
          policyType: p.policyType,
          coverAmount: p.coverAmount,
          premiumAmount: p.premiumAmount,
          premiumFrequency: p.premiumFrequency,
          planName: p.planName,
        }),
      );
    } catch {
      /* ignore */
    }
    setRenewFor(null);
    router.push("/insurance");
  };

  const markTransferred = async (p: UserPolicy) => {
    const { error } = await updateUserPolicy(p.id, {
      status: "transferred_to_finkoin",
    });
    if (!error) {
      setTransferFor(null);
      void reload();
    }
  };

  const premiumLabel = useMemo(() => {
    const sym = `₹${formatIndian(form.premiumAmount)}`;
    return form.premiumFrequency === "yearly" ? `${sym}/year` : `${sym}/month`;
  }, [form.premiumAmount, form.premiumFrequency]);

  if (!hasInitialized || !authChecked) {
    return <BrandPageLoader fullScreen={false} label="Loading…" />;
  }

  return (
    <div className="min-h-dvh bg-[#F7F7F4] pb-16 pt-6">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111110] sm:text-3xl">
              My insurance policies
            </h1>
            <p className="mt-1 text-[15px] text-[#9B9A94]">
              Track all your policies in one place
            </p>
          </div>
          <Button
            type="button"
            className="shrink-0 self-start bg-[#534AB7] text-white hover:opacity-95"
            onClick={() => {
              if (!canAccessVault) {
                router.push(loginHrefPreserveRef("/login?redirect=/policies"));
                return;
              }
              openNew();
            }}
          >
            + Add policy
          </Button>
        </header>

        {loadError ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Could not load policies: {loadError}. If you just added this
            feature, run the Supabase migration for{" "}
            <code className="rounded bg-white/80 px-1">user_policies</code>.
          </div>
        ) : null}

        {!canAccessVault ? (
          <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-[#F0EFF8] bg-white px-6 py-14 text-center shadow-sm">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#EEEDFE] text-[#534AB7]">
              <ShieldIcon className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-bold text-[#111110]">
              Sign in to use your policy vault
            </h2>
            <p className="max-w-sm text-[15px] text-[#9B9A94]">
              Save policies to Supabase, get renewal reminders, and sync across
              devices.
            </p>
            <Link
              href={loginHrefPreserveRef("/login?redirect=/policies")}
              className="rounded-xl bg-[#534AB7] px-8 py-3 text-[15px] font-semibold text-white no-underline"
            >
              Sign in →
            </Link>
          </div>
        ) : loading ? (
          <BrandPageLoader
            fullScreen={false}
            size="sm"
            minHeight={120}
            label="Loading…"
          />
        ) : policies.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-[#F0EFF8] bg-white px-6 py-14 text-center shadow-sm">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#EEEDFE] text-[#534AB7]">
              <ShieldIcon className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-bold text-[#111110]">
              No policies added yet
            </h2>
            <p className="max-w-sm text-[15px] text-[#9B9A94]">
              Add your insurance policies to track premiums and coverage, or
              explore plans on the marketplace.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                type="button"
                className="bg-[#534AB7] text-white"
                onClick={openNew}
              >
                Add first policy →
              </Button>
              <ButtonLink
                href="/insurance"
                variant="secondary"
                className="border-[#E8E6F0]"
              >
                Browse marketplace →
              </ButtonLink>
            </div>
          </div>
        ) : (
          <ul className="space-y-4">
            {policies.map((p) => {
              const renew = renewalUi(p);
              const st = statusBadge(p);
              const prem = `₹${formatIndian(p.premiumAmount)}${p.premiumFrequency === "yearly" ? "/year" : "/month"}`;
              return (
                <li
                  key={p.id}
                  className="rounded-2xl border border-[#F0EFF8] bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${policyBadgeClass(p.policyType)}`}
                      >
                        {POLICY_TYPE_LABELS[p.policyType]}
                      </span>
                      <p className="mt-2 text-lg font-bold text-slate-900">
                        {p.insurerName || "—"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {p.planName?.trim() || "Plan not specified"}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        Cover:{" "}
                        <span className="font-medium text-slate-900">
                          {formatPolicyCover(p.coverAmount)}
                        </span>
                      </p>
                      <p className="text-sm text-slate-700">
                        Premium:{" "}
                        <span className="font-medium text-slate-900">
                          {prem}
                        </span>
                      </p>
                      <p className={`mt-1 text-sm ${renew.lineClass}`}>
                        {renew.line}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${st.className}`}
                    >
                      {st.label}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setRenewFor(p)}
                    >
                      Renew
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setTransferFor(p)}
                    >
                      Transfer to Finkoin
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(p)}
                    >
                      Edit
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <BottomSheet
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title={editId ? "Edit policy" : "Add policy"}
      >
        <div className="space-y-1 pb-4">
          <label
            className="mb-1 block text-sm font-medium text-slate-700"
            htmlFor="policy-type"
          >
            Policy type
          </label>
          <select
            id="policy-type"
            className="mb-4 w-full rounded-xl border border-[#E8E6F0] bg-white px-3 py-2.5 text-sm"
            value={form.policyType}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                policyType: e.target.value as PolicyType,
              }))
            }
          >
            {POLICY_TYPES.map((t) => (
              <option key={t} value={t}>
                {POLICY_TYPE_LABELS[t]}
              </option>
            ))}
          </select>

          <label
            className="mb-1 block text-sm font-medium text-slate-700"
            htmlFor="insurer-name"
          >
            Insurer name <span className="font-normal text-red-600">*</span>
          </label>
          <p className="mb-1.5 text-xs text-slate-500">
            e.g. Max Life, HDFC Life — required (plan name goes below)
          </p>
          <input
            id="insurer-name"
            list="insurer-suggestions"
            className="mb-4 w-full rounded-xl border border-[#E8E6F0] px-3 py-2.5 text-sm"
            placeholder="e.g. Max Life"
            value={form.insurerName}
            onChange={(e) =>
              setForm((f) => ({ ...f, insurerName: e.target.value }))
            }
          />
          <datalist id="insurer-suggestions">
            {INSURER_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>

          <label
            className="mb-1 block text-sm font-medium text-slate-700"
            htmlFor="policy-number"
          >
            Policy number{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="policy-number"
            className="mb-4 w-full rounded-xl border border-[#E8E6F0] px-3 py-2.5 text-sm"
            value={form.policyNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, policyNumber: e.target.value }))
            }
          />

          <label
            className="mb-1 block text-sm font-medium text-slate-700"
            htmlFor="plan-name"
          >
            Plan name{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="plan-name"
            className="mb-4 w-full rounded-xl border border-[#E8E6F0] px-3 py-2.5 text-sm"
            value={form.planName}
            onChange={(e) =>
              setForm((f) => ({ ...f, planName: e.target.value }))
            }
          />

          <MoneyInput
            key={`cover-${formKey}`}
            id="policy-cover"
            label="Cover amount"
            ref={coverInputRef}
            defaultValue={
              form.coverAmount > 0 ? formatIndian(form.coverAmount) : ""
            }
            onBlur={(e) => {
              const v = handleMoneyInput(e.target.value);
              if (v !== null) setForm((f) => ({ ...f, coverAmount: v }));
            }}
          />

          <MoneyInput
            key={`prem-${formKey}`}
            id="policy-premium"
            label="Premium amount"
            ref={premiumInputRef}
            defaultValue={
              form.premiumAmount > 0 ? formatIndian(form.premiumAmount) : ""
            }
            onBlur={(e) => {
              const v = handleMoneyInput(e.target.value);
              if (v !== null) setForm((f) => ({ ...f, premiumAmount: v }));
            }}
          />

          <p className="mb-1 text-xs text-slate-500">Preview: {premiumLabel}</p>

          <label
            className="mb-1 block text-sm font-medium text-slate-700"
            htmlFor="prem-freq"
          >
            Premium frequency
          </label>
          <select
            id="prem-freq"
            className="mb-4 w-full rounded-xl border border-[#E8E6F0] bg-white px-3 py-2.5 text-sm"
            value={form.premiumFrequency}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                premiumFrequency: e.target.value as PremiumFrequency,
              }))
            }
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>

          <label
            className="mb-1 block text-sm font-medium text-slate-700"
            htmlFor="renewal-date"
          >
            Renewal date
          </label>
          <input
            id="renewal-date"
            type="date"
            className="mb-4 w-full rounded-xl border border-[#E8E6F0] px-3 py-2.5 text-sm"
            value={form.renewalDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, renewalDate: e.target.value }))
            }
          />

          <label
            className="mb-1 block text-sm font-medium text-slate-700"
            htmlFor="purchase-date"
          >
            Purchase date{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="purchase-date"
            type="date"
            className="mb-4 w-full rounded-xl border border-[#E8E6F0] px-3 py-2.5 text-sm"
            value={form.purchaseDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, purchaseDate: e.target.value }))
            }
          />

          <label
            className="mb-1 block text-sm font-medium text-slate-700"
            htmlFor="nominee"
          >
            Nominee name{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="nominee"
            className="mb-2 w-full rounded-xl border border-[#E8E6F0] px-3 py-2.5 text-sm"
            value={form.nomineeName}
            onChange={(e) =>
              setForm((f) => ({ ...f, nomineeName: e.target.value }))
            }
          />

          <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-slate-200 bg-white px-4 pb-2 pt-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
            {formError ? (
              <p className="mb-3 text-sm font-medium text-red-600" role="alert">
                {formError}
              </p>
            ) : null}
            <Button
              type="button"
              className="w-full bg-[#534AB7] text-white"
              disabled={saving}
              onClick={() => void onSave()}
            >
              {saving ? "Saving…" : "Save policy"}
            </Button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={!!renewFor}
        onClose={() => setRenewFor(null)}
        title="Renewal options"
      >
        {renewFor ? (
          <div className="space-y-4 pb-8">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Renew same policy
              </p>
              <p className="mt-1 text-xs text-slate-600">
                We will redirect you to {renewFor.insurerName} website
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Commission: None — this is for your convenience
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-3 w-full"
                onClick={() =>
                  window.open(
                    insurerRenewalWebsite(renewFor.insurerName),
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              >
                Go to {renewFor.insurerName} →
              </Button>
            </div>

            <div className="rounded-2xl border-2 border-[#534AB7]/40 bg-gradient-to-b from-[#F4F2FC] to-white p-4 shadow-[0_0_24px_rgba(83,74,183,0.15)]">
              <p className="text-sm font-semibold text-slate-900">
                Compare better plans
              </p>
              <p className="mt-1 text-xs text-slate-600">
                We found {MOCK_COMPARE_COUNT} plans with better features at
                similar or lower premium
              </p>
              <ul className="mt-3 space-y-2 text-xs text-slate-700">
                {MOCK_ALTS.map((a) => (
                  <li
                    key={a.name}
                    className="rounded-lg bg-white/80 px-2 py-1.5"
                  >
                    <span className="font-medium">{a.name}</span> — {a.blurb}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-slate-500">
                Commission: Full first year if they switch
              </p>
              <Button
                type="button"
                className="mt-3 w-full bg-[#534AB7] text-white"
                onClick={() => goCompare(renewFor)}
              >
                Compare plans →
              </Button>
            </div>

            <div className="rounded-2xl border border-teal-200 bg-teal-50/80 p-4">
              <p className="text-sm font-semibold text-teal-900">
                Transfer to Finkoin first
              </p>
              <p className="mt-1 text-xs text-teal-800">
                Transfer this policy to Finkoin. We will remind you every
                renewal. You get free annual policy review.
              </p>
              <Button
                type="button"
                className="mt-3 w-full border-teal-600 bg-teal-600 text-white hover:bg-teal-700"
                onClick={() => {
                  const p = renewFor;
                  setRenewFor(null);
                  setTransferFor(p);
                }}
              >
                Start transfer →
              </Button>
            </div>
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        isOpen={!!transferFor}
        onClose={() => setTransferFor(null)}
        title="Transfer guide"
      >
        {transferFor ? (
          <div className="space-y-5 pb-8 text-sm text-slate-700">
            {isLifeCategory(transferFor.policyType) ? (
              <>
                <p className="font-semibold text-slate-900">Life insurance</p>
                <ol className="list-decimal space-y-3 pl-5">
                  <li>
                    Download <strong>Change of Agent</strong> form from{" "}
                    {transferFor.insurerName} website.
                  </li>
                  <li>
                    Fill: your policy number{" "}
                    <strong>
                      {transferFor.policyNumber || "(add in Edit if missing)"}
                    </strong>
                    , new agent name <strong>Finkoin Financial Services</strong>
                    , new agent code <strong>{FINKOIN_AGENT_CODE}</strong>.
                  </li>
                  <li>Submit at nearest branch OR upload on insurer portal.</li>
                  <li>Processing usually takes 30–60 days.</li>
                </ol>
              </>
            ) : isHealthCategory(transferFor.policyType) ? (
              <>
                <p className="font-semibold text-slate-900">Health insurance</p>
                <ol className="list-decimal space-y-3 pl-5">
                  <li>
                    Download the{" "}
                    <strong>intermediary change / portability support</strong>{" "}
                    form from {transferFor.insurerName} (wording varies by
                    insurer).
                  </li>
                  <li>
                    Fill policy number{" "}
                    <strong>
                      {transferFor.policyNumber || "(add in Edit if missing)"}
                    </strong>
                    , new advisor <strong>Finkoin Financial Services</strong>,
                    code <strong>{FINKOIN_AGENT_CODE}</strong>.
                  </li>
                  <li>
                    Submit via branch, email, or insurer logged-in portal as
                    directed.
                  </li>
                  <li>Allow a few weeks for records to update.</li>
                  <li>
                    After transfer, we handle renewal reminders and optional
                    annual review.
                  </li>
                </ol>
              </>
            ) : (
              <>
                <p className="font-semibold text-slate-900">
                  Motor / other policies
                </p>
                <p>
                  Contact {transferFor.insurerName} support or your RM and
                  request servicing be moved to{" "}
                  <strong>Finkoin Financial Services</strong> (agent code{" "}
                  {FINKOIN_AGENT_CODE}). Steps differ by insurer; we can help
                  over chat once live.
                </p>
              </>
            )}

            <a
              href={insurerFormDownloadUrl(transferFor.insurerName)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-xl border border-[#534AB7] py-2.5 text-sm font-semibold text-[#534AB7] no-underline"
            >
              Open insurer site for forms →
            </a>

            <Button
              type="button"
              className="w-full bg-violet-600 text-white hover:bg-violet-700"
              onClick={() => void markTransferred(transferFor)}
            >
              Mark as transferred to Finkoin
            </Button>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
