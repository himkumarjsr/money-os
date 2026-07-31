"use client";

import ConsentModal from "@/components/analyse/ConsentModal";
import { AnalyseOnboardingForm } from "@/components/forms/analyse-onboarding-form";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import { Analytics } from "@/lib/analytics";
import { getSupabase, isConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Per-user consent (v2). Anonymous `finkoin_analyse_consent_v1` is no longer read or written here. */
function analyseConsentStorageKey(userId: string) {
  return `finkoin_analyse_consent_v2_${userId}`;
}

/** Logged-in analyse flow (consent + onboarding form). */
export default function AnalyseAppClient() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [consentChecked, setConsentChecked] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const formStartTrackedRef = useRef(false);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;

    let cancelled = false;

    try {
      const cached =
        typeof window !== "undefined" &&
        window.localStorage.getItem(analyseConsentStorageKey(uid)) === "true";
      if (cached) {
        setHasConsent(true);
        setConsentChecked(true);
        return;
      }
    } catch {
      setHasConsent(false);
    }

    if (!isConfigured) {
      setConsentChecked(true);
      return;
    }

    void (async () => {
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from("users")
          .select("data_consent_given")
          .eq("id", uid)
          .maybeSingle();
        if (cancelled) return;
        if (data?.data_consent_given) {
          try {
            window.localStorage.setItem(analyseConsentStorageKey(uid), "true");
          } catch {
            /* ignore */
          }
          setHasConsent(true);
        }
      } catch {
        if (!cancelled) setHasConsent(false);
      } finally {
        if (!cancelled) setConsentChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!hasConsent || formStartTrackedRef.current) return;
    Analytics.healthCheckStarted();
    formStartTrackedRef.current = true;
  }, [hasConsent]);

  const handleAccept = () => {
    const uid = useAuthStore.getState().user?.id;
    if (!uid) return;
    try {
      window.localStorage.setItem(analyseConsentStorageKey(uid), "true");
    } catch {
      /* ignore */
    }
    setHasConsent(true);

    if (!isConfigured) return;

    void (async () => {
      try {
        const supabase = getSupabase();
        const { error } = await supabase
          .from("users")
          .update({
            data_consent_given: true,
            data_consent_at: new Date().toISOString(),
            data_consent_version: "v2",
          })
          .eq("id", uid);
        if (error) console.warn("users data_consent update:", error.message);
      } catch (e) {
        console.warn("users data_consent update:", e);
      }
    })();
  };

  const handleDecline = () => {
    router.replace("/");
  };

  if (!consentChecked) {
    return <BrandPageLoader fullScreen={false} label="Loading…" />;
  }

  return (
    <div className="min-h-dvh bg-white text-slate-900">
      {hasConsent ? <AnalyseOnboardingForm /> : null}
      {!hasConsent ? (
        <ConsentModal onAccept={handleAccept} onDecline={handleDecline} />
      ) : null}
    </div>
  );
}
