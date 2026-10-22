"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import {
  PLAN_REVIEW_MIN_MONTHS,
  applyPlanReview,
  buildPlanReview,
  monthsSincePlanReview,
  planReviewDue,
  type PlanReview,
} from "@/lib/planReview";
import { saveAnalyseProfile } from "@/lib/saveAnalyseProfile";
import { getSupabase } from "@/lib/supabase";
import { fetchNatureRows } from "@/lib/trackerNatureFetch";
import { buildNatureReport } from "@/lib/trackerNatureReport";

/**
 * Once a year: what the Tracker shows against the plan, and a one-tap update
 * of the plan's numbers.
 */
export default function PlanReviewCard({
  profile,
  userId,
}: {
  profile: FinancialProfile;
  userId?: string | null;
}) {
  const due = planReviewDue(profile);
  const [review, setReview] = useState<PlanReview | null | undefined>(
    undefined,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!due || !userId) return;
    let cancelled = false;
    const now = new Date();
    void fetchNatureRows(
      getSupabase(),
      userId,
      now.getFullYear(),
      now.getMonth(),
    )
      .then((res) => {
        if (cancelled) return;
        const report = res.ok
          ? buildNatureReport({
              rows: res.rows,
              emiSources: res.emiSources,
              profileSalary: profile.monthlySalary,
            })
          : null;
        setReview(buildPlanReview(profile, report, now));
      })
      .catch(() => {
        if (!cancelled) setReview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [due, userId, profile]);

  if (!due || review === undefined) return null;

  const months = monthsSincePlanReview(profile) ?? 0;
  const hasChanges = !!review && Object.keys(review.patch).length > 0;
  const finish = async (withChanges: boolean) => {
    setSaving(true);
    setError(null);
    const res = await saveAnalyseProfile(
      userId,
      applyPlanReview(profile, withChanges ? review : null),
    );
    setSaving(false);
    if (res.error) setError("Couldn't save - try again in a moment.");
  };

  return (
    <section className="rounded-2xl border border-[#DCD8F4] bg-[#F7F6FE] p-5">
      <h2 className="text-base font-semibold text-[#111110]">
        Time for your yearly check
      </h2>
      <p className="mt-1 text-sm text-[#454442]">
        Your plan is {months} months old. A planner would check it against real
        life once a year.
        {review
          ? ` Here's what your Tracker shows over the last ${review.basedOnMonths} months:`
          : ""}
      </p>
      {review ? (
        <ul className="mt-3 space-y-1.5 text-sm text-[#111110]">
          {review.lines.map((l) => (
            <li key={l.key} className="flex gap-2">
              <span aria-hidden>{l.changes ? "•" : "✓"}</span>
              <span>{l.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[#454442]">
          Log at least {PLAN_REVIEW_MIN_MONTHS} full months in the Tracker and
          we&apos;ll compare them with your plan. Or retake the analysis with
          today&apos;s numbers.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {hasChanges ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void finish(true)}
            className="min-h-[44px] rounded-lg bg-[#534AB7] px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            Update my plan
          </button>
        ) : null}
        {review ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void finish(false)}
            className="min-h-[44px] rounded-lg border border-[#DCD8F4] bg-white px-4 text-sm font-semibold text-[#3C3489] disabled:opacity-60"
          >
            {hasChanges ? "Keep it as it is" : "Plan still fits"}
          </button>
        ) : (
          <Link
            href="/analyse"
            className="flex min-h-[44px] items-center rounded-lg bg-[#534AB7] px-4 text-sm font-semibold text-white"
          >
            Retake the analysis
          </Link>
        )}
      </div>
      {error ? <p className="mt-2 text-sm text-[#E24B4A]">{error}</p> : null}
    </section>
  );
}
