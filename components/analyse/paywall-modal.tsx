"use client";

import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";

type PlanId = "advisor" | "moneyos";

type RazorpayOpen = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: { razorpay_payment_id: string }) => void;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
};

type RazorpayInstance = { open: () => void };

type RazorpayCtor = new (options: RazorpayOpen) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Razorpay script failed")),
      );
      return;
    }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Razorpay script failed"));
    document.body.appendChild(s);
  });
}

type PaywallModalProps = {
  open: boolean;
  onClose: () => void;
};

export function PaywallModal({ open, onClose }: PaywallModalProps) {
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const pay = useCallback(
    async (plan: PlanId) => {
      setError(null);
      const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!publicKey) {
        setError(
          "Add NEXT_PUBLIC_RAZORPAY_KEY_ID (test key) and server keys RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET.",
        );
        return;
      }

      setBusy(plan);
      try {
        await loadRazorpay();
        if (!window.Razorpay) {
          throw new Error("Razorpay failed to load");
        }

        const res = await fetch("/api/razorpay/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const payload = (await res.json()) as {
          orderId?: string;
          amount?: number;
          currency?: string;
          label?: string;
          error?: string;
          detail?: string;
        };

        if (!res.ok) {
          throw new Error(payload.error ?? "Could not create order");
        }

        const orderId = payload.orderId;
        const amount = payload.amount;
        const currency = payload.currency ?? "INR";
        const label = payload.label ?? "MoneyOS";

        if (!orderId || amount == null) {
          throw new Error("Invalid order response");
        }

        const rzp = new window.Razorpay({
          key: publicKey,
          amount,
          currency,
          name: "MoneyOS",
          description: label,
          order_id: orderId,
          theme: { color: "#534AB7" },
          modal: { ondismiss: () => setBusy(null) },
          handler: () => {
            setBusy(null);
            onClose();
          },
        });
        rzp.open();
        setBusy(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Payment could not start");
        setBusy(null);
      }
    },
    [onClose],
  );

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
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="paywall-title"
              className="text-xl font-semibold text-slate-900 sm:text-2xl"
            >
              Choose your plan
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Test mode: use Razorpay test keys. No real charge in test mode.
            </p>
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

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-medium text-slate-500">Free</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              ₹0
              <span className="text-base font-normal text-slate-500">
                {" "}
                / forever
              </span>
            </p>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
              <li>Health check &amp; calculators</li>
              <li>Top insight from your fix plan</li>
            </ul>
            <p className="mt-6 text-xs font-medium text-emerald-700">
              You&apos;re on Free
            </p>
          </div>

          <div className="flex flex-col rounded-2xl border-2 border-[#534AB7] p-5 ring-1 ring-[#534AB7]/20">
            <p className="text-sm font-medium text-[#534AB7]">Advisor</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              ₹49
              <span className="text-base font-normal text-slate-500"> / mo</span>
            </p>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
              <li>Full 7-step AI fix plan</li>
              <li>WhatsApp / chat nudges (where enabled)</li>
            </ul>
            <Button
              type="button"
              variant="primary"
              className="mt-6 w-full"
              disabled={busy !== null}
              onClick={() => void pay("advisor")}
            >
              {busy === "advisor" ? "Opening…" : "Pay with Razorpay (test)"}
            </Button>
          </div>

          <div className="flex flex-col rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-medium text-slate-500">MoneyOS</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              ₹99
              <span className="text-base font-normal text-slate-500"> / mo</span>
            </p>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
              <li>Everything in Advisor</li>
              <li>Workspace, exports &amp; priority support</li>
            </ul>
            <Button
              type="button"
              variant="secondary"
              className="mt-6 w-full border-slate-200"
              disabled={busy !== null}
              onClick={() => void pay("moneyos")}
            >
              {busy === "moneyos" ? "Opening…" : "Pay with Razorpay (test)"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
