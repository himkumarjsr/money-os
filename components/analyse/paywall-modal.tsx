"use client";

import { useEffect } from "react";

type PaywallModalProps = {
  open: boolean;
  onClose: () => void;
  fkBalance?: number;
  priceLabel?: string;
  onConfirm?: () => Promise<void> | void;
  confirming?: boolean;
  success?: boolean;
};

export function PaywallModal({
  open,
  onClose,
  fkBalance = 0,
  priceLabel = "Pay ₹99",
  onConfirm,
  confirming = false,
  success = false,
}: PaywallModalProps) {
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#EEEDFE] text-[#534AB7]">
              FK
            </div>
            <h2 id="paywall-title" className="text-xl font-semibold text-slate-900">
              Unlock your fix plan
            </h2>
            <p className="mt-1 text-sm text-slate-600">Your complete AI roadmap is ready to unlock.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {fkBalance > 0 ? (
          <p className="mt-3 rounded-xl bg-[#F7F6FE] px-3 py-2 text-xs text-[#534AB7]">FK balance: {fkBalance} FK</p>
        ) : null}

        <div className="mt-4 rounded-2xl border border-[#E8E6F0] bg-[#FAFAFE] p-4">
          <p className="text-xs uppercase tracking-wide text-[#7A7871]">Price</p>
          <p className="text-2xl font-bold text-[#111110]">{priceLabel}</p>
        </div>

        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          <li>✓ Complete priority plan</li>
          <li>✓ Debt clearance strategy</li>
          <li>✓ 12-month action roadmap</li>
          <li>✓ Downloadable PDF report</li>
          <li>✓ Insurance recommendations from Finkoin</li>
        </ul>

        <button
          type="button"
          onClick={() => void onConfirm?.()}
          disabled={confirming || success}
          className="mt-5 h-12 w-full rounded-xl bg-[#534AB7] font-semibold text-white disabled:opacity-70"
        >
          {success ? "✓ Success, redirecting..." : confirming ? "Confirming and unlocking..." : "Confirm and unlock"}
        </button>

        <p className="mt-3 text-center text-xs text-[#9B9A94]">Educational only.</p>
        {success ? (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-[#1D9E75]">
            <span>✓</span>
            <span>Unlock successful</span>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#1D9E75] border-r-transparent" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
