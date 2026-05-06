"use client";

import ConsentModal from "@/components/analyse/ConsentModal";
import { AnalyseOnboardingForm } from "@/components/forms/analyse-onboarding-form";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Per-user consent (v2). Anonymous `finkoin_analyse_consent_v1` is no longer read or written here. */
function analyseConsentStorageKey(userId: string) {
  return `finkoin_analyse_consent_v2_${userId}`;
}

export default function AnalysePage() {
  const router = useRouter();
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);

  const [consentChecked, setConsentChecked] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const redirectedToLoginRef = useRef(false);

  useEffect(() => {
    if (!hasInitialized) return;
    if (!isLoggedIn || !user?.id) {
      if (redirectedToLoginRef.current) return;
      redirectedToLoginRef.current = true;
      router.replace("/login?redirect=/analyse&mode=signup");
      return;
    }
    redirectedToLoginRef.current = false;

    try {
      const accepted =
        typeof window !== "undefined" &&
        window.localStorage.getItem(analyseConsentStorageKey(user.id)) === "true";
      setHasConsent(accepted);
    } catch {
      setHasConsent(false);
    }
    setConsentChecked(true);
  }, [hasInitialized, isLoggedIn, user?.id, router]);

  const handleAccept = () => {
    const uid = useAuthStore.getState().user?.id;
    if (!uid) return;
    try {
      window.localStorage.setItem(analyseConsentStorageKey(uid), "true");
    } catch {
      /* ignore */
    }
    setHasConsent(true);
  };

  const handleDecline = () => {
    router.push("/");
  };

  if (!hasInitialized) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white text-slate-600">
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  if (!isLoggedIn || !user?.id) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-white px-4 text-slate-600">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#534AB7] border-t-transparent" aria-hidden />
        <p className="text-sm">Opening sign up…</p>
      </div>
    );
  }

  if (!consentChecked) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white text-slate-600">
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-white text-slate-900">
      {hasConsent ? <AnalyseOnboardingForm /> : null}
      {!hasConsent ? <ConsentModal onAccept={handleAccept} onDecline={handleDecline} /> : null}
    </div>
  );
}
