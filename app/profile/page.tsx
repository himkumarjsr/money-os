"use client";

import { ProtectedGate } from "@/components/auth/ProtectedGate";
import ProfileAssets from "@/components/profile/ProfileAssets";
import { AppIcon } from "@/components/ui/AppIcon";
import BackLink from "@/components/ui/BackLink";
import { analyseFinances } from "@/lib/financialEngine";
import { trackShare } from "@/lib/gtag";
import { fetchUserAnalyseSnapshot } from "@/lib/userAnalyseSnapshot";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";
import { useGamificationStore } from "@/store/gamificationStore";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logoutAction = useAuthStore((s) => s.logout);
  const result = useFinancialStore((s) => s.result);
  const submission = useFinancialStore((s) => s.lastSubmission);
  const hydrateFromSnapshot = useFinancialStore((s) => s.hydrateFromSnapshot);
  const fkBalance = useGamificationStore((s) => s.fkBalance);

  const [referralCopied, setReferralCopied] = useState(false);

  // If local store is empty, pull the latest analysis snapshot from Supabase.
  useEffect(() => {
    if (!user?.id || submission) return;
    let cancelled = false;
    void (async () => {
      try {
        const snap = await fetchUserAnalyseSnapshot(user.id);
        if (cancelled || !snap?.lastSubmission) return;
        const engineResult =
          snap.result ?? analyseFinances(snap.lastSubmission);
        hydrateFromSnapshot(snap.lastSubmission, engineResult, {
          analysisPatch: snap.analysis ?? undefined,
          aiPlan: snap.aiPlan,
        });
      } catch (e) {
        console.warn("Profile assets sync failed:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, submission, hydrateFromSnapshot]);

  const referralLink = useMemo(() => {
    const code = user?.referralCode ?? "FINK0000";
    const origin = (
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.finkoin.com"
    ).replace(/\/$/, "");
    return `${origin}/?ref=${encodeURIComponent(code)}`;
  }, [user?.referralCode]);

  const analysisSnapshot = useMemo(() => {
    if (!submission) return null;
    return result ?? analyseFinances(submission);
  }, [submission, result]);

  const healthScore = useMemo(() => {
    if (!analysisSnapshot) return null;
    return Math.max(
      0,
      100 -
        analysisSnapshot.issues.filter((i) => i.severity === "critical")
          .length *
          15 -
        analysisSnapshot.issues.filter((i) => i.severity === "warning").length *
          7,
    );
  }, [analysisSnapshot]);

  const checklist = analysisSnapshot?.securityChecklist ?? [];
  const checklistCount = checklist.filter((i) => i.status === "ok").length;

  const copyReferralLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    trackShare({
      method: "clipboard",
      content_type: "referral_link",
      content_id: "profile_page",
      outcome: "completed",
    });
    setReferralCopied(true);
    window.setTimeout(() => setReferralCopied(false), 2500);
  };

  return (
    <ProtectedGate>
      <main className="mx-auto w-full max-w-5xl min-w-0 space-y-6 overflow-x-hidden px-4 py-8 pb-28 sm:px-6 md:pb-8">
        <BackLink fallbackHref="/" label="Back" />
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <div className="mx-auto inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#534AB7] text-2xl font-bold text-white">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              (user?.name?.charAt(0) || "U").toUpperCase()
            )}
          </div>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            {user?.name ?? "Finkoin user"}
          </h1>
          <p className="text-sm text-slate-500">
            {user?.phone ?? user?.email ?? "No phone/email"}
          </p>
        </section>

        <section
          className={`rounded-2xl p-5 ${user?.subscriptionTier === "free" ? "border border-slate-200 bg-slate-50" : "bg-[#534AB7] text-white"}`}
        >
          <p className="text-sm font-medium">
            {user?.subscriptionTier === "free"
              ? "Free Plan"
              : user?.subscriptionTier === "pro"
                ? "Pro Plan"
                : "Pro Max Plan"}
          </p>
          <p className="mt-1 text-xs opacity-80">
            Expiry:{" "}
            {user?.subscriptionExpiry
              ? new Date(user.subscriptionExpiry).toLocaleDateString("en-IN")
              : "No expiry"}
          </p>
        </section>

        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-500">Health score</p>
            <p className="text-xl font-bold text-slate-900">
              {healthScore ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">FK tokens</p>
            <p className="flex items-center gap-1.5 text-xl font-bold text-slate-900">
              <AppIcon name="coin" size={20} color="#534AB7" />
              {fkBalance}
            </p>
          </div>
        </section>

        <ProfileAssets profile={submission} analysis={analysisSnapshot} />

        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Your financial checklist</h2>
          <p className="mt-1 text-sm text-slate-500">
            {checklistCount} of {Math.max(1, checklist.length)} completed
          </p>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-[#534AB7]"
              style={{
                width: `${Math.min(100, (checklistCount / Math.max(1, checklist.length)) * 100)}%`,
              }}
            />
          </div>
          <ul className="mt-4 space-y-3">
            {checklist.slice(0, 8).map((item) => (
              <li
                key={item.label}
                className="flex min-w-0 items-start gap-2 text-sm"
              >
                <span className="mt-0.5 shrink-0">
                  <AppIcon
                    name={item.status === "ok" ? "checkCircle" : "close"}
                    size={16}
                    color={item.status === "ok" ? "#1D9E75" : "#E24B4A"}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 break-words font-medium text-[#111110]">
                      {item.label}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-[#9B9A94]">
                      {item.status === "ok" ? "Done" : "Pending"}
                    </span>
                  </div>
                  {item.detail ? (
                    <p className="mt-0.5 break-words text-xs leading-snug text-[#9B9A94]">
                      {item.detail}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
            {checklist.length === 0 ? (
              <li className="text-center text-sm text-slate-500">
                Complete analysis to unlock your checklist.
              </li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">KYC verification</h2>
            <span className="rounded-full bg-[#EEEDFE] px-2.5 py-0.5 text-[11px] font-semibold text-[#534AB7]">
              Coming soon
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            PAN, Aadhaar, and full identity checks are on the way. We&apos;ll
            notify you when verification opens on Finkoin.
          </p>
          <div className="mt-3 space-y-3 opacity-60">
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-700">
                PAN verification
              </p>
              <p className="mt-0.5 text-xs text-slate-500">Coming soon</p>
            </div>
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="text-slate-700">
                Mobile verification:{" "}
                {user?.phone ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                    <AppIcon name="checkCircle" size={14} color="#534AB7" />
                    Verified
                  </span>
                ) : (
                  <span className="text-slate-500">Coming soon</span>
                )}
              </p>
              <p className="mt-1 text-slate-500">
                Aadhaar verification: Coming soon
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">
            Refer friends · Earn FK tokens
          </h2>
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
            {referralLink}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                referralCopied
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              }`}
              onClick={() => void copyReferralLink()}
            >
              {referralCopied ? (
                <>
                  <AppIcon name="check" size={14} color="#534AB7" />
                  Copied
                </>
              ) : (
                "Copy link"
              )}
            </button>
            <a
              className="rounded-lg bg-[#25D366] px-3 py-2 text-sm font-semibold text-white"
              href={`https://wa.me/?text=${encodeURIComponent(`I use Finkoin to manage my finances. Get your free AI financial health check: ${referralLink}`)}`}
              target="_blank"
              rel="noreferrer"
              onClick={() =>
                trackShare({
                  method: "whatsapp",
                  content_type: "referral_link",
                  content_id: "profile_page",
                  outcome: "completed",
                })
              }
            >
              Share on WhatsApp
            </a>
          </div>
        </section>

        <section className="rounded-2xl border border-red-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-red-700">Account</h2>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600"
            >
              Delete all my data
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              onClick={async () => {
                try {
                  await logoutAction();
                } finally {
                  router.push("/");
                  router.refresh();
                }
              }}
            >
              Sign out
            </button>
          </div>
        </section>
      </main>
    </ProtectedGate>
  );
}
