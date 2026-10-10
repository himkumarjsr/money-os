"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";

const CONSENT_KEY = "finkoin_analytics_consent";
const REOPEN_EVENT = "finkoin:analytics-choices";
const CLARITY_ID = "wy7rqfej1z";

type Choice = "granted" | "denied";

function readChoice(): Choice | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

/** Reopen the banner (e.g. from the privacy policy) so users can change their choice. */
export function openAnalyticsChoices() {
  window.dispatchEvent(new Event(REOPEN_EVENT));
}

/**
 * Opt-in for Google Analytics and Microsoft Clarity (DPDP: clear, affirmative
 * consent). Neither script loads until the visitor taps Allow.
 */
export default function AnalyticsConsent() {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [bannerOpen, setBannerOpen] = useState(false);

  useEffect(() => {
    const saved = readChoice();
    setChoice(saved);
    if (!saved) setBannerOpen(true);
    const reopen = () => setBannerOpen(true);
    window.addEventListener(REOPEN_EVENT, reopen);
    return () => window.removeEventListener(REOPEN_EVENT, reopen);
  }, []);

  const decide = (next: Choice) => {
    try {
      localStorage.setItem(CONSENT_KEY, next);
    } catch {
      /* private mode: choice lasts for this visit only */
    }
    setBannerOpen(false);
    // Scripts already running can't be unloaded; reload so a withdrawal takes effect.
    if (choice === "granted" && next === "denied") {
      window.location.reload();
      return;
    }
    setChoice(next);
  };

  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <>
      {choice === "granted" ? (
        <>
          <Script id="microsoft-clarity" strategy="afterInteractive">
            {`
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                c[a]("consentv2", { ad_Storage: "denied", analytics_Storage: "granted" });
              })(window, document, "clarity", "script", "${CLARITY_ID}");
            `}
          </Script>
          {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
        </>
      ) : null}

      {bannerOpen ? (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[1200] flex justify-center p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-6"
          role="dialog"
          aria-live="polite"
          aria-label="Analytics choices"
        >
          <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-[#E8E6F0] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
            <p className="text-base font-bold text-[#111110]">
              Help us improve Finkoin?
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#5F5E5A]">
              With your OK we use Google Analytics and Microsoft Clarity to see
              which pages people use and where they get stuck. Your financial
              numbers are never sent to them. You can change this any time in
              our{" "}
              <Link
                href="/legal/privacy#analytics"
                className="font-semibold text-[#534AB7] underline"
              >
                Privacy Policy
              </Link>
              .
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => decide("denied")}
                className="min-h-[44px] flex-1 rounded-xl border border-[#E8E6F0] text-sm font-semibold text-[#5F5E5A]"
              >
                No thanks
              </button>
              <button
                type="button"
                onClick={() => decide("granted")}
                className="min-h-[44px] flex-1 rounded-xl bg-[#534AB7] text-sm font-bold text-white"
              >
                Allow
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
