"use client";

import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { analyseFinances } from "@/lib/financialEngine";
import { formatIndian } from "@/lib/formatters";
import { verifyPAN } from "@/lib/kycVerification";
import { trackShare } from "@/lib/gtag";
import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";
import { useGamificationStore } from "@/store/gamificationStore";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AppIcon } from "@/components/ui/AppIcon";

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logoutAction = useAuthStore((s) => s.logout);
  const updateUser = useAuthStore((s) => s.updateUser);
  const result = useFinancialStore((s) => s.result);
  const submission = useFinancialStore((s) => s.lastSubmission);
  const fkBalance = useGamificationStore((s) => s.fkBalance);

  const [pan, setPan] = useState("");
  const [panLoading, setPanLoading] = useState(false);
  const [panMessage, setPanMessage] = useState("");
  const [referralCopied, setReferralCopied] = useState(false);

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

  const netWorthDisplay = analysisSnapshot?.netWorth;

  const healthScore = useMemo(() => {
    if (!result) return null;
    return Math.max(
      0,
      100 -
        result.issues.filter((i) => i.severity === "critical").length * 15 -
        result.issues.filter((i) => i.severity === "warning").length * 7,
    );
  }, [result]);

  const checklist = result?.securityChecklist ?? [];
  const checklistCount = checklist.filter((i) => i.status === "ok").length;

  const doVerifyPan = async () => {
    if (!user) return;
    setPanLoading(true);
    const res = await verifyPAN(pan, user.name ?? "User");
    setPanLoading(false);
    setPanMessage(res.message);
    if (res.verified) {
      const panNorm = pan.trim().toUpperCase();
      const last4 = panNorm.slice(-4);
      updateUser({
        panVerified: true,
        panLast4: `${last4}${panNorm.charAt(0)}`,
      });
      try {
        const supabase = getSupabase();
        await supabase
          .from("users")
          .update({ pan_verified: true, pan_last4: last4 })
          .eq("id", user.id);
        await useAuthStore.getState().refreshUser();
      } catch (e) {
        console.warn("Could not persist PAN to profile:", e);
      }
    }
  };

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
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
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

        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Health score</p>
            <p className="text-xl font-bold text-slate-900">
              {healthScore ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Net worth snapshot</p>
            <p
              className={`text-xl font-bold ${typeof netWorthDisplay === "number" && netWorthDisplay < 0 ? "text-red-600" : "text-slate-900"}`}
            >
              {typeof netWorthDisplay === "number"
                ? `₹${formatIndian(Math.round(netWorthDisplay))}`
                : "—"}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Same formula as your analysis report (assets − liabilities).
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

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
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
          <ul className="mt-4 space-y-2">
            {checklist.slice(0, 8).map((item) => (
              <li
                key={item.label}
                className="flex items-start justify-between rounded-lg border border-slate-100 p-3"
              >
                <span className="flex items-center gap-2">
                  <AppIcon
                    name={item.status === "ok" ? "checkCircle" : "close"}
                    size={16}
                    color={item.status === "ok" ? "#1D9E75" : "#E24B4A"}
                  />
                  {item.label}
                </span>
                <span className="text-xs text-slate-500">{item.detail}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">KYC verification</h2>
          <p className="mt-1 text-xs text-slate-500">
            PAN: we check the official pattern only (not a government database).
            Your verified flag is saved on your Finkoin profile.
          </p>
          <div className="mt-3 space-y-3">
            <div className="rounded-lg border border-slate-100 p-3">
              {!user?.panVerified ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    placeholder="Enter PAN (ABCDE1234F)"
                    className="h-10 flex-1 rounded-lg border border-slate-200 px-3 outline-none"
                  />
                  <button
                    type="button"
                    onClick={doVerifyPan}
                    className="h-10 rounded-lg bg-[#534AB7] px-4 text-sm font-semibold text-white"
                    disabled={panLoading}
                  >
                    {panLoading ? "Verifying..." : "Verify PAN"}
                  </button>
                </div>
              ) : (
                <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                  <AppIcon name="checkCircle" size={16} color="#534AB7" />
                  PAN verified{user.panLast4 ? ` · ••••${user.panLast4}` : ""}
                </p>
              )}
              {panMessage ? (
                <p className="mt-1 text-xs text-slate-500">{panMessage}</p>
              ) : null}
            </div>
            <div className="rounded-lg border border-slate-100 p-3 text-sm">
              <p className="inline-flex items-center gap-1.5">
                Mobile verification:{" "}
                {user?.phone ? (
                  <>
                    <AppIcon name="checkCircle" size={14} color="#534AB7" />
                    Verified
                  </>
                ) : (
                  "Not verified"
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
