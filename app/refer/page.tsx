"use client";

import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function ReferPage() {
  const user = useAuthStore((s) => s.user);
  const code = user?.referralCode ?? "";
  const referralUrl = useMemo(() => {
    const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://finkoin.com").replace(/\/$/, "");
    return code ? `${origin}/?ref=${encodeURIComponent(code)}` : "";
  }, [code]);

  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState<number | null>(null);
  const [referredNames, setReferredNames] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const supabase = getSupabase();
        const { count } = await supabase.from("users").select("*", { count: "exact", head: true }).eq("referred_by", user.id);
        if (!cancelled) setReferralCount(count ?? 0);

        const { data: refs } = await supabase.from("users").select("name").eq("referred_by", user.id).limit(25);
        if (!cancelled && refs) {
          setReferredNames(
            (refs as { name: string | null }[])
              .map((r) => r.name?.trim() || "Friend")
              .map((n) => {
                const p = n.split(/\s+/);
                return p.length > 1 ? `${p[0]} ${p[p.length - 1].charAt(0).toUpperCase()}.` : n;
              }),
          );
        }
      } catch {
        if (!cancelled) setReferralCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const shareText = encodeURIComponent(
    `I've been using Finkoin to track my financial health. Check it out! ${referralUrl}`,
  );

  return (
    <ProtectedGate>
      <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-[#111110]">Refer &amp; earn</h1>
        <p className="mt-2 text-sm text-[#5F5E5A]">Share Finkoin. When friends join with your link, you both earn FK tokens.</p>

        <div
          className="mt-8 flex flex-col gap-3 rounded-[14px] p-4 sm:flex-row sm:items-center sm:gap-3"
          style={{ background: "#F7F7F4" }}
        >
          <div className="min-w-0 flex-1 break-all text-sm font-semibold text-[#534AB7]">{referralUrl || "Generating link…"}</div>
          <button
            type="button"
            disabled={!referralUrl}
            onClick={async () => {
              if (!referralUrl) return;
              await navigator.clipboard.writeText(referralUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            }}
            className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-4 text-[13px] font-bold transition-colors disabled:opacity-50 ${
              copied ? "bg-emerald-600 text-white" : "bg-[#534AB7] text-white hover:opacity-95"
            }`}
          >
            {copied ? (
              <>
                <span className="text-lg leading-none" aria-hidden>
                  ✓
                </span>
                Copied
              </>
            ) : (
              "Copy"
            )}
          </button>
        </div>

        <a
          href={`https://wa.me/?text=${shareText}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-[#25D366] text-base font-bold text-white no-underline"
        >
          <span aria-hidden>📱</span>
          Share on WhatsApp
        </a>

        <div className="mt-10">
          <h3 className="text-lg font-bold text-[#111110]">How it works</h3>
          <div className="mt-4 space-y-5">
            {[
              { step: "1", title: "Share your link", desc: "Send your unique link to friends." },
              { step: "2", title: "Friend signs up", desc: "They create a Finkoin account." },
              { step: "3", title: "Both earn FK", desc: "You get 200 FK on signup bonus flow; they get welcome FK." },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#534AB7] text-sm font-extrabold text-white"
                  aria-hidden
                >
                  {item.step}
                </div>
                <div>
                  <div className="font-bold text-[#111110]">{item.title}</div>
                  <div className="text-[13px] text-[#9B9A94]">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-[14px] p-5" style={{ background: "#F7F7F4" }}>
          <div className="text-[13px] font-semibold uppercase tracking-wide text-[#9B9A94]">Your referral stats</div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-extrabold text-[#534AB7]">{referralCount ?? "—"}</div>
              <div className="text-xs text-[#9B9A94]">Friends referred</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-[#1D9E75]">{(referralCount ?? 0) * 200}</div>
              <div className="text-xs text-[#9B9A94]">FK from referrals (est.)</div>
            </div>
          </div>
        </div>

        {referredNames.length > 0 ? (
          <div className="mt-8">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#9B9A94]">Referred users</h3>
            <ul className="mt-3 space-y-2 text-sm text-[#5F5E5A]">
              {referredNames.map((n, i) => (
                <li key={`${i}-${n}`} className="rounded-lg border border-[#F0EFF8] bg-white px-3 py-2">
                  {n}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-10 text-center text-xs text-[#9B9A94]">
          Bonuses apply when our referral processor runs after signup —{" "}
          <Link href="/legal/terms" className="font-semibold text-[#534AB7]">
            Terms
          </Link>
        </p>
      </main>
    </ProtectedGate>
  );
}
