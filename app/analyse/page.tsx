"use client";

import ConsentModal from "@/components/analyse/ConsentModal";
import { AnalyseOnboardingForm } from "@/components/forms/analyse-onboarding-form";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ANALYSE_CONSENT_KEY = "finkoin_analyse_consent_v1";

export default function AnalysePage() {
  const router = useRouter();
  const [consentChecked, setConsentChecked] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    const accepted = window.localStorage.getItem(ANALYSE_CONSENT_KEY) === "true";
    setHasConsent(accepted);
    setConsentChecked(true);
  }, []);

  const handleAccept = () => {
    window.localStorage.setItem(ANALYSE_CONSENT_KEY, "true");
    setHasConsent(true);
  };

  const handleDecline = () => {
    router.push("/");
  };

  return (
    <div className="min-h-dvh bg-white text-slate-900">
      {consentChecked && hasConsent ? <AnalyseOnboardingForm /> : null}
      {consentChecked && !hasConsent ? (
        <ConsentModal onAccept={handleAccept} onDecline={handleDecline} />
      ) : null}
    </div>
  );
}
