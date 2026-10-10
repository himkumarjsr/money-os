"use client";

import {
  fetchUpcomingRenewals,
  formatRenewalDayMonth,
  getSupabaseAuthUserId,
} from "@/lib/userPolicies";
import { useAuthStore } from "@/store/authStore";
import { AppIcon } from "@/components/ui/AppIcon";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "finkoin_renewal_banner_dismissed_until";

function endOfLocalTodayIso(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function isDismissedActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const until = localStorage.getItem(STORAGE_KEY);
    if (!until) return false;
    return Date.now() < new Date(until).getTime();
  } catch {
    return false;
  }
}

export function RenewalReminderBanner() {
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  /** Re-check renewals after AuthSessionSync aligns id with Supabase session */
  const authUserId = useAuthStore((s) => s.user?.id);
  const [show, setShow] = useState(false);
  const [count, setCount] = useState(0);
  const [sampleName, setSampleName] = useState("");
  const [sampleDate, setSampleDate] = useState("");

  const check = useCallback(async () => {
    if (!isLoggedIn) {
      setShow(false);
      return;
    }
    const uid = await getSupabaseAuthUserId();
    if (!uid) {
      setShow(false);
      return;
    }
    if (isDismissedActive()) {
      setShow(false);
      return;
    }
    const { policies, error } = await fetchUpcomingRenewals(uid, 30);
    if (error || policies.length === 0) {
      setShow(false);
      return;
    }
    const first = policies[0];
    setCount(policies.length);
    setSampleName(
      first.planName?.trim() ||
        `${first.insurerName || "Policy"} (${first.policyType.replace(/_/g, " ")})`,
    );
    setSampleDate(formatRenewalDayMonth(first.renewalDate ?? ""));
    setShow(true);
  }, [hasInitialized, isLoggedIn]);

  useEffect(() => {
    void check();
  }, [check, authUserId]);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, endOfLocalTodayIso());
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/policies" className="flex-1 hover:opacity-90">
          <p className="inline-flex items-center gap-1.5 font-semibold">
            <AppIcon name="alert" size={16} color="#534AB7" />
            {count} policy renewal{count === 1 ? "" : "s"} coming up
          </p>
          <p className="text-xs text-amber-900/90">
            {sampleName} renews on {sampleDate}. Click to view options.
          </p>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/policies"
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-amber-700"
          >
            View policies
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg px-2 py-1 text-xs font-medium text-amber-900/80 hover:bg-amber-100"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
