"use client";

import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/use-app-store";

export function OnboardingStepComplete() {
  const setOnboardingStep = useAppStore((s) => s.setOnboardingStep);

  return (
    <div className="flex flex-col gap-6 text-center sm:text-left">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/15 text-success sm:mx-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-8"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-[color:var(--color-text)] sm:text-2xl">
          You&apos;re all set
        </h2>
        <p className="mt-2 text-sm text-muted sm:text-base">
          Your profile is ready. Jump into calculators or refine preferences
          anytime.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-start">
        <Button type="button" variant="secondary" onClick={() => setOnboardingStep(1)}>
          Back
        </Button>
        <Button type="button" variant="primary" onClick={() => setOnboardingStep(0)}>
          Finish &amp; reset demo
        </Button>
      </div>
    </div>
  );
}
