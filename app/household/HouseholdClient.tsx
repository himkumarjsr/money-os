"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import BackLink from "@/components/ui/BackLink";
import YearlyRoadmapTable from "@/components/analyse/YearlyRoadmapTable";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { analyseFinances } from "@/lib/financialEngine";
import { formatIndian } from "@/lib/formatters";
import {
  combineHouseholdProfiles,
  HOUSEHOLD_RULES_LINE,
} from "@/lib/householdProfile";
import {
  acceptHouseholdInvite,
  createHouseholdInvite,
  householdInviteUrl,
  householdStatus,
  monthRange,
  partnerProfile,
  partnerTransactions,
  setHouseholdShare,
  spendByBucket,
  unlinkHousehold,
  type HouseholdShare,
  type HouseholdStatus,
  type PartnerTransaction,
} from "@/lib/householdClient";
import { buildPriorityPlan } from "@/lib/priorityEngine";
import { getSupabase } from "@/lib/supabase";
import { useFinancialStore } from "@/store/financialStore";

const money = (v: number) =>
  `${v < 0 ? "−" : ""}₹${formatIndian(Math.round(Math.abs(v)))}`;

const card = "rounded-2xl border border-[#E8E6F0] bg-white p-5";
const primaryBtn =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#534AB7] px-4 text-sm font-semibold text-white disabled:opacity-50";
const quietBtn =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#E8E6F0] bg-white px-4 text-sm font-semibold text-[#111110] disabled:opacity-50";

export default function HouseholdClient() {
  const params = useSearchParams();
  const mine = useFinancialStore((s) => s.lastSubmission);
  const [status, setStatus] = useState<HouseholdStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState(params?.get("code") ?? "");
  const [copied, setCopied] = useState(false);
  const [partner, setPartner] = useState<FinancialProfile | null>(null);
  const [spends, setSpends] = useState<PartnerTransaction[] | null>(null);

  const run = useCallback(async (fn: () => Promise<HouseholdStatus | void>) => {
    setBusy(true);
    setError(null);
    try {
      const next = await fn();
      setStatus(next ?? (await householdStatus(getSupabase())));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void run(() => householdStatus(getSupabase()));
  }, [run]);

  const active = status?.status === "active";
  const partnerShares = status?.partner_share;
  useEffect(() => {
    if (!active) {
      setPartner(null);
      setSpends(null);
      return;
    }
    const supabase = getSupabase();
    let cancelled = false;
    void (async () => {
      try {
        const [p, t] = await Promise.all([
          partnerShares?.profile ? partnerProfile(supabase) : null,
          partnerShares?.tracker
            ? partnerTransactions(supabase, monthRange().from, monthRange().to)
            : null,
        ]);
        if (!cancelled) {
          setPartner(p);
          setSpends(t);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, partnerShares?.profile, partnerShares?.tracker]);

  const inviteUrl = useMemo(() => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.finkoin.com");
    return status?.invite_code
      ? householdInviteUrl(status.invite_code, origin)
      : "";
  }, [status?.invite_code]);

  const share = status?.my_share ?? { profile: false, tracker: false };
  const toggle = (key: keyof HouseholdShare) =>
    run(() =>
      setHouseholdShare(getSupabase(), { ...share, [key]: !share[key] }),
    );

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <BackLink fallbackHref="/profile" label="Back" />
      <h1 className="mt-3 text-3xl font-bold text-[#111110]">
        Link your partner
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[#5F5E5A]">
        Two accounts, one household. See a combined report and each other&apos;s
        spending. Each of you chooses what to share, and either of you can
        unlink at any time.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-[#FCEBEB] px-3 py-2 text-sm text-[#A32D2D]"
        >
          {error}
        </p>
      ) : null}

      {status === null ? (
        <p className="mt-6 text-sm text-[#5F5E5A]">Loading…</p>
      ) : status.status === "none" ? (
        <div className="mt-6 grid gap-4">
          <section className={card}>
            <h2 className="text-lg font-semibold">Invite your partner</h2>
            <p className="mt-1 text-sm text-[#5F5E5A]">
              Get a code and send it to them. They open the link or type the
              code in their own Finkoin account.
            </p>
            <button
              type="button"
              className={`${primaryBtn} mt-3`}
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await createHouseholdInvite(getSupabase());
                })
              }
            >
              Get an invite code
            </button>
          </section>
          <section className={card}>
            <h2 className="text-lg font-semibold">Got a code?</h2>
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void run(() => acceptHouseholdInvite(getSupabase(), code));
              }}
            >
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="8-letter code"
                aria-label="Invite code"
                autoCapitalize="characters"
                className="min-h-[44px] flex-1 rounded-xl border border-[#E8E6F0] px-3 text-base uppercase tracking-widest"
              />
              <button
                type="submit"
                className={primaryBtn}
                disabled={busy || code.trim().length < 8}
              >
                Link accounts
              </button>
            </form>
          </section>
        </div>
      ) : status.status === "pending" ? (
        <section className={`${card} mt-6`}>
          <h2 className="text-lg font-semibold">Waiting for your partner</h2>
          <p className="mt-1 text-sm text-[#5F5E5A]">
            Send them this code or link. It works once.
          </p>
          <p className="mt-3 text-center text-3xl font-bold tracking-[0.3em] text-[#534AB7]">
            {status.invite_code}
          </p>
          <p className="mt-2 break-all rounded-lg bg-[#F7F7F4] px-3 py-2 text-xs">
            {inviteUrl}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={quietBtn}
              onClick={async () => {
                await navigator.clipboard.writeText(inviteUrl);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2500);
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            <a
              className="inline-flex min-h-[44px] items-center rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white"
              href={`https://wa.me/?text=${encodeURIComponent(`Let's link our Finkoin accounts so we can plan our money together. Open ${inviteUrl} or enter code ${status.invite_code}.`)}`}
              target="_blank"
              rel="noreferrer"
            >
              Share on WhatsApp
            </a>
            <button
              type="button"
              className={quietBtn}
              disabled={busy}
              onClick={() => run(() => unlinkHousehold(getSupabase()))}
            >
              Cancel invite
            </button>
          </div>
        </section>
      ) : (
        <div className="mt-6 grid gap-4">
          <section className={card}>
            <h2 className="text-lg font-semibold">
              Linked with {status.partner_name || "your partner"}
            </h2>
            <p className="mt-1 text-sm text-[#5F5E5A]">
              What you share with them:
            </p>
            <div className="mt-2 grid gap-2">
              {(
                [
                  [
                    "profile",
                    "My money profile",
                    "Income, spends, savings, loans and cover from your report, for a combined household report.",
                  ],
                  [
                    "tracker",
                    "My tracker spends",
                    "Every expense you add in the tracker, read-only.",
                  ],
                ] as Array<[keyof HouseholdShare, string, string]>
              ).map(([key, label, hint]) => (
                <label
                  key={key}
                  className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl bg-[#FAFAFE] p-3"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 accent-[#534AB7]"
                    checked={share[key]}
                    disabled={busy}
                    onChange={() => void toggle(key)}
                  />
                  <span>
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="block text-xs text-[#5F5E5A]">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-[#5F5E5A]">
              {status.partner_name || "Your partner"} shares:{" "}
              {[
                partnerShares?.profile ? "money profile" : null,
                partnerShares?.tracker ? "tracker spends" : null,
              ]
                .filter(Boolean)
                .join(" and ") || "nothing yet"}
              .
            </p>
            <button
              type="button"
              className={`${quietBtn} mt-3 text-[#A32D2D]`}
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Unlink? You both stop seeing each other's data straight away.",
                  )
                )
                  void run(() => unlinkHousehold(getSupabase()));
              }}
            >
              Unlink
            </button>
          </section>

          <HouseholdReport
            mine={mine}
            partner={partner}
            partnerName={status.partner_name || "your partner"}
            partnerShares={!!partnerShares?.profile}
          />

          <PartnerSpends
            rows={spends}
            partnerName={status.partner_name || "Your partner"}
            partnerShares={!!partnerShares?.tracker}
          />
        </div>
      )}
    </main>
  );
}

function HouseholdReport({
  mine,
  partner,
  partnerName,
  partnerShares,
}: {
  mine: FinancialProfile | null;
  partner: FinancialProfile | null;
  partnerName: string;
  partnerShares: boolean;
}) {
  const combined = useMemo(() => {
    if (!mine || !partner) return null;
    const profile = combineHouseholdProfiles(mine, partner);
    const result = analyseFinances(profile);
    const plan = buildPriorityPlan(profile, result);
    return { profile, result, plan };
  }, [mine, partner]);

  if (!mine)
    return (
      <section className={card}>
        <h2 className="text-lg font-semibold">Household report</h2>
        <p className="mt-1 text-sm text-[#5F5E5A]">
          Finish your own analysis first, then come back here.{" "}
          <Link href="/analyse" className="font-semibold text-[#534AB7]">
            Start analysis →
          </Link>
        </p>
      </section>
    );
  if (!partnerShares || !combined)
    return (
      <section className={card}>
        <h2 className="text-lg font-semibold">Household report</h2>
        <p className="mt-1 text-sm text-[#5F5E5A]">
          {partnerShares
            ? `Loading ${partnerName}'s profile…`
            : `Shows once ${partnerName} shares their money profile.`}
        </p>
      </section>
    );

  const { result, plan, profile } = combined;
  const facts: Array<[string, number]> = [
    [
      "Household income / month",
      (profile.monthlySalary || 0) +
        (profile.spouseIncome || 0) +
        (profile.otherIncome || 0),
    ],
    ["Left over / month", plan.monthlySurplus],
    ["Net worth", result.netWorth],
  ];
  return (
    <>
      <section className={card}>
        <h2 className="text-lg font-semibold">Household report</h2>
        <p className="mt-1 text-xs leading-relaxed text-[#5F5E5A]">
          {HOUSEHOLD_RULES_LINE}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-[#5F5E5A]">Money score</dt>
            <dd className="text-xl font-bold">{result.overallScore} / 100</dd>
          </div>
          {facts.map(([label, v]) => (
            <div key={label}>
              <dt className="text-xs text-[#5F5E5A]">{label}</dt>
              <dd className="text-xl font-bold tabular-nums">{money(v)}</dd>
            </div>
          ))}
        </dl>
        {result.moneyScore?.topActions?.length ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {result.moneyScore.topActions.slice(0, 3).map((a) => (
              <li key={a.text}>{a.text}</li>
            ))}
          </ul>
        ) : null}
      </section>
      <YearlyRoadmapTable profile={profile} items={plan.goalFunding?.items} />
    </>
  );
}

function PartnerSpends({
  rows,
  partnerName,
  partnerShares,
}: {
  rows: PartnerTransaction[] | null;
  partnerName: string;
  partnerShares: boolean;
}) {
  const month = new Date().toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
  if (!partnerShares)
    return (
      <section className={card}>
        <h2 className="text-lg font-semibold">{partnerName}&apos;s spends</h2>
        <p className="mt-1 text-sm text-[#5F5E5A]">
          Shows once they share their tracker spends.
        </p>
      </section>
    );
  const sum = spendByBucket(rows ?? []);
  return (
    <section className={card}>
      <h2 className="text-lg font-semibold">
        {partnerName}&apos;s spends · {month}
      </h2>
      {rows === null ? (
        <p className="mt-1 text-sm text-[#5F5E5A]">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-1 text-sm text-[#5F5E5A]">Nothing added this month.</p>
      ) : (
        <>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {money(sum.total)}
          </p>
          <p className="text-xs text-[#5F5E5A]">
            {sum.buckets.map(([b, v]) => `${b} ${money(v)}`).join(" · ")}
          </p>
          <ul className="mt-3 divide-y divide-[#F0EFF8] text-sm">
            {rows.slice(0, 30).map((t) => (
              <li key={t.id} className="flex justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {t.description || t.subcategory || t.category}
                  </span>
                  <span className="text-xs text-[#5F5E5A]">
                    {new Date(t.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    · {t.category}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {money(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
