"use client";

import { OnboardingStepBasics } from "@/components/forms/onboarding-step-basics";
import { OnboardingStepComplete } from "@/components/forms/onboarding-step-complete";
import { OnboardingStepGoals } from "@/components/forms/onboarding-step-goals";
import { useAppStore } from "@/store/use-app-store";

const steps = ["Basics", "Goals", "Done"] as const;

export function OnboardingWizard() {
  const step = useAppStore((s) => s.onboardingStep);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-8">
      <nav
        className="mb-8 flex flex-wrap items-center justify-center gap-2 sm:gap-4"
        aria-label="Onboarding progress"
      >
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={
                i === step
                  ? "flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-[color:var(--color-primary-foreground)]"
                  : "flex size-8 items-center justify-center rounded-full bg-surface-alt text-xs font-medium text-muted"
              }
              aria-current={i === step ? "step" : undefined}
            >
              {i + 1}
            </span>
            <span
              className={
                i === step
                  ? "hidden text-sm font-medium text-[color:var(--color-text)] sm:inline"
                  : "hidden text-sm text-muted sm:inline"
              }
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <span className="hidden text-border sm:inline" aria-hidden>
                /
              </span>
            )}
          </div>
        ))}
      </nav>
      {step === 0 && <OnboardingStepBasics />}
      {step === 1 && <OnboardingStepGoals />}
      {step === 2 && <OnboardingStepComplete />}
    </section>
  );
}
