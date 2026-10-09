"use client";

import { apiFetch } from "@/lib/apiFetch";
import { supabase } from "@/lib/supabase";
import { paywallConfirmLabel } from "@/lib/paywallCopy";
import { Analytics } from "@/lib/analytics";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type PaywallModalProps = {
  open: boolean;
  onClose: () => void;
  /** Shown in the price row (fix plan is always ₹99; FK is not applied here). */
  priceLabel?: string;
  /** Override default fix-plan headline */
  title?: string;
  /** Short supporting line under the title */
  subtitle?: string;
  /** Razorpay order description */
  checkoutDescription?: string;
  /** Bullet list under the price card */
  bulletPoints?: string[];
  /** Where to send the user after a successful unlock (default: fix plan) */
  navigateAfterUnlock?: string;
};

type RazorpaySuccessPayload = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayConstructorOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: RazorpaySuccessPayload) => void | Promise<void>;
  modal?: { ondismiss?: () => void };
  prefill?: { email?: string; name?: string };
  theme?: { color?: string };
};

type RazorpayFailedPayload = {
  error?: {
    description?: string;
    reason?: string;
    code?: string;
    metadata?: { order_id?: string; payment_id?: string };
  };
};

type RazorpayCheckoutInstance = {
  open: () => void;
  on?: (
    event: string,
    handler: (response: RazorpayFailedPayload) => void,
  ) => void;
};

declare global {
  interface Window {
    Razorpay?: new (
      options: RazorpayConstructorOptions,
    ) => RazorpayCheckoutInstance;
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Razorpay can only load in the browser."));
      return;
    }
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve();
      else reject(new Error("Razorpay failed to initialize."));
    };
    script.onerror = () =>
      reject(new Error("Failed to load Razorpay checkout script."));
    document.body.appendChild(script);
  });
}

const DEFAULT_BULLETS = [
  "Complete priority plan",
  "Debt clearance strategy",
  "12-month action roadmap",
  "Downloadable PDF report",
  "Insurance recommendations from Finkoin",
];

export function PaywallModal({
  open,
  onClose,
  priceLabel = "Pay ₹99",
  title = "Unlock your fix plan",
  subtitle = "Your complete AI roadmap is ready to unlock.",
  checkoutDescription = "Unlock full AI fix plan",
  bulletPoints = DEFAULT_BULLETS,
  navigateAfterUnlock = "/analyse/fixplan",
}: PaywallModalProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setSubscription = useAuthStore((s) => s.setSubscription);
  const [rzpLoading, setRzpLoading] = useState(false);
  const [rzpError, setRzpError] = useState("");

  const resetRzpState = useCallback(() => {
    setRzpLoading(false);
    setRzpError("");
  }, []);

  useEffect(() => {
    if (!open) {
      resetRzpState();
    }
  }, [open, resetRzpState]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handlePaidUnlock = async () => {
    if (rzpLoading) return;
    setRzpError("");

    if (!supabase || !user?.id) {
      setRzpError("Please sign in to complete payment.");
      return;
    }

    setRzpLoading(true);
    Analytics.paymentStarted(99);
    try {
      const cfgRes = await apiFetch("/api/razorpay/checkout-config");
      const cfgJson = (await cfgRes.json()) as {
        keyId?: string;
        error?: string;
      };
      if (!cfgRes.ok || !cfgJson.keyId) {
        throw new Error(cfgJson.error || "Payments are not configured.");
      }
      const keyId = cfgJson.keyId;

      await loadRazorpayScript();

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("Session expired. Please sign in again.");
      }

      const orderRes = await apiFetch("/api/razorpay/create-order", {
        method: "POST",
      });
      const orderJson = (await orderRes.json()) as {
        orderId?: string;
        amount?: number;
        currency?: string;
        error?: string;
        detail?: string;
      };

      if (!orderRes.ok) {
        const detail = orderJson.detail?.trim();
        const headline = orderJson.error?.trim();
        const combined =
          detail && headline && detail !== headline
            ? `${headline}: ${detail}`
            : detail || headline;
        throw new Error(combined || "Could not start checkout.");
      }

      const orderId = orderJson.orderId;
      const amount = orderJson.amount;
      const currency = orderJson.currency ?? "INR";
      if (!orderId || amount == null) {
        throw new Error("Invalid order response from server.");
      }

      const Rzp = window.Razorpay;
      if (!Rzp) {
        throw new Error("Razorpay failed to initialize.");
      }

      const options: RazorpayConstructorOptions = {
        key: keyId,
        amount,
        currency,
        name: "Finkoin",
        description: checkoutDescription,
        order_id: orderId,
        prefill: {
          email: user.email ?? undefined,
          name: user.name ?? undefined,
        },
        theme: { color: "#534AB7" },
        modal: {
          ondismiss: () => {
            setRzpLoading(false);
          },
        },
        handler: async (response: RazorpaySuccessPayload) => {
          try {
            const verifyRes = await apiFetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyJson = (await verifyRes.json()) as {
              ok?: boolean;
              error?: string;
            };
            if (!verifyRes.ok || !verifyJson.ok) {
              throw new Error(
                verifyJson.error || "Payment verification failed.",
              );
            }

            setSubscription("pro");
            Analytics.paymentCompleted(99);
            setRzpLoading(false);
            onClose();
            router.push(navigateAfterUnlock);
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Verification failed.";
            setRzpError(msg);
            setRzpLoading(false);
          }
        },
      };

      const instance = new Rzp(options);
      instance.on?.("payment.failed", (response) => {
        setRzpLoading(false);
        const msg =
          response?.error?.description ||
          response?.error?.reason ||
          "Payment failed. Please try again or use another method.";
        setRzpError(msg);
      });
      instance.open();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setRzpError(msg);
      setRzpLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
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
            <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#EEEDFE] text-lg font-semibold text-[#534AB7]">
              F
            </div>
            <h2
              id="paywall-title"
              className="text-xl font-semibold text-slate-900"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-lg font-semibold leading-none text-slate-900 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="mt-3 text-xs font-medium leading-relaxed text-[#454442]">
          Finkoin Keys (FK) are rewards for activity on Finkoin. They do not
          reduce this unlock price and are not tied to buying any product here.
        </p>

        <div className="mt-4 rounded-2xl border border-[#E8E6F0] bg-[#FAFAFE] p-4">
          <p className="text-xs uppercase tracking-wide text-[#7A7871]">
            Price
          </p>
          <p className="text-2xl font-bold text-[#111110]">{priceLabel}</p>
        </div>

        {rzpError ? (
          <p
            className="mt-3 rounded-xl bg-[#FDEDEC] px-3 py-2 text-sm text-[#791F1F]"
            role="alert"
          >
            {rzpError}
          </p>
        ) : null}

        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          {bulletPoints.map((line) => (
            <li key={line}>✓ {line}</li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => void handlePaidUnlock()}
          disabled={rzpLoading}
          className="mt-5 h-12 w-full rounded-xl bg-[#534AB7] font-semibold text-white disabled:opacity-70"
        >
          {paywallConfirmLabel({
            paymentsEnabled: true,
            priceInr: 99,
            loading: rzpLoading,
          })}
        </button>

        <p className="mt-3 text-center text-xs text-[#9B9A94]">
          Educational only.
        </p>
      </div>
    </div>
  );
}
