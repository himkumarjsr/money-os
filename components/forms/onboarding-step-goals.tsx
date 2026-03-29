"use client";

import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/use-app-store";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  goals: z
    .array(z.string())
    .min(1, "Pick at least one goal")
    .max(5, "Choose up to 5 goals"),
});

export type OnboardingGoalsValues = z.infer<typeof schema>;

const OPTIONS = [
  "Build emergency fund",
  "Pay down debt",
  "Save for a home",
  "Invest for retirement",
];

export function OnboardingStepGoals() {
  const setOnboardingStep = useAppStore((s) => s.setOnboardingStep);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingGoalsValues>({
    resolver: zodResolver(schema),
    defaultValues: { goals: [] },
  });

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={handleSubmit(() => setOnboardingStep(2))}
    >
      <div>
        <h2 className="text-xl font-semibold text-[color:var(--color-text)] sm:text-2xl">
          What are you working toward?
        </h2>
        <p className="mt-1 text-sm text-muted sm:text-base">
          Select one or more goals. You can change these later.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {OPTIONS.map((opt) => (
          <label
            key={opt}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm sm:text-base has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-[var(--ring-primary)]"
          >
            <input
              type="checkbox"
              value={opt}
              {...register("goals")}
              className="size-4 rounded border-border text-primary"
            />
            <span className="text-[color:var(--color-text)]">{opt}</span>
          </label>
        ))}
      </div>
      {errors.goals && (
        <p className="text-sm text-danger">{errors.goals.message}</p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setOnboardingStep(0)}
        >
          Back
        </Button>
        <Button type="submit" variant="primary">
          Continue
        </Button>
      </div>
    </form>
  );
}
