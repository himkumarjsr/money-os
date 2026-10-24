"use client";

import { useEffect, useState } from "react";
import {
  FIX_PLAN_PRICE_INR,
  formatAccessDate,
  type FixPlanAccess,
} from "@/lib/fixPlanAccess";
import { androidAppIntentUrl } from "@/lib/nativeAppLaunch";
import { isAndroidUserAgent } from "@/lib/pwaLaunch";

/**
 * The Fix Plan is bought only in the Finkoin mobile app (Google Play / App
 * Store). On the web we point people to the app, and unlock the page once
 * the same account has bought it there.
 */

const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL?.trim() ||
  "https://play.google.com/store/apps/details?id=com.finkoin.app";
const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL?.trim() || "";

const BULLETS = [
  "Complete priority plan",
  "Debt clearance strategy",
  "Step-by-step wealth builder plan",
  "Downloadable PDF report",
  "Insurance recommendations from Finkoin",
];

type PanelProps = {
  email?: string | null;
  access?: FixPlanAccess | null;
  /** Re-check access after buying in the app. */
  onRecheck?: () => Promise<void> | void;
};

export function UnlockInAppPanel({ email, access, onRecheck }: PanelProps) {
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    setIsAndroid(isAndroidUserAgent(navigator.userAgent));
  }, []);

  const expired =
    access?.reason === "expired" ? formatAccessDate(access.expiresAt) : null;

  const recheck = async () => {
    if (!onRecheck || checking) return;
    setChecking(true);
    try {
      await onRecheck();
    } finally {
      setChecking(false);
      setChecked(true);
    }
  };

  return (
    <div>
      <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#EEEDFE] text-lg font-semibold text-[#534AB7]">
        F
      </div>
      <h2
        id="unlock-in-app-title"
        className="text-xl font-semibold text-slate-900"
      >
        {expired ? "Your fix plan year has ended" : "Unlock in the Finkoin app"}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        {expired
          ? `Your access ended on ${expired}. Renew in the Finkoin app to keep your plan.`
          : "Buy your fix plan in the Finkoin app. It then opens here on the website too."}
      </p>

      <div className="mt-4 rounded-2xl border border-[#E8E6F0] bg-[#FAFAFE] p-4">
        <p className="text-xs uppercase tracking-wide text-[#7A7871]">Price</p>
        <p className="text-2xl font-bold text-[#111110]">
          ₹{FIX_PLAN_PRICE_INR}
          <span className="ml-1 text-sm font-medium text-[#7A7871]">
            one-time, for 1 year
          </span>
        </p>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        {BULLETS.map((line) => (
          <li key={line}>✓ {line}</li>
        ))}
      </ul>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <a
          href={
            isAndroid
              ? androidAppIntentUrl("analyse/fixplan", PLAY_STORE_URL)
              : PLAY_STORE_URL
          }
          target={isAndroid ? undefined : "_blank"}
          rel="noopener noreferrer"
          className="flex h-12 items-center justify-center rounded-xl bg-[#534AB7] px-4 text-sm font-semibold text-white hover:opacity-90"
        >
          Get it on Google Play
        </a>
        {APP_STORE_URL ? (
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center justify-center rounded-xl bg-[#111110] px-4 text-sm font-semibold text-white hover:opacity-90"
          >
            Download on the App Store
          </a>
        ) : (
          <span className="flex h-12 items-center justify-center rounded-xl border border-[#E8E6F0] px-4 text-center text-sm font-medium text-[#7A7871]">
            App Store: coming soon
          </span>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-[#454442]">
        Sign in to the app with the same account
        {email ? (
          <>
            {" "}
            (<span className="font-semibold">{email}</span>)
          </>
        ) : null}
        . After you pay, come back here and the plan opens.
      </p>

      {onRecheck ? (
        <button
          type="button"
          onClick={() => void recheck()}
          disabled={checking}
          className="mt-3 h-11 w-full rounded-xl border border-[#534AB7] text-sm font-semibold text-[#534AB7] hover:bg-[#EEEDFE] disabled:opacity-60"
        >
          {checking ? "Checking…" : "I've paid in the app, check again"}
        </button>
      ) : null}
      {checked && !checking ? (
        <p className="mt-2 text-center text-xs text-[#7A7871]" role="status">
          No purchase found for this account yet. It can take a minute after
          paying.
        </p>
      ) : null}

      <p className="mt-3 text-center text-xs text-[#7A7871]">
        Finkoin Keys (FK) don&apos;t reduce this price. Educational only.
      </p>
    </div>
  );
}

type ModalProps = PanelProps & { open: boolean; onClose: () => void };

export function UnlockInAppModal({ open, onClose, ...panel }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-in-app-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl sm:p-7">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-lg font-semibold leading-none text-slate-900 hover:bg-slate-100"
          aria-label="Close"
        >
          ✕
        </button>
        <UnlockInAppPanel {...panel} />
      </div>
    </div>
  );
}
