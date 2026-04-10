"use client";

import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/use-app-store";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2, "Name is too short"),
  country: z.string().min(2, "Required"),
});

export type OnboardingBasicsValues = z.infer<typeof schema>;

export function OnboardingStepBasics() {
  const setOnboardingStep = useAppStore((s) => s.setOnboardingStep);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingBasicsValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", country: "" },
  });

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={handleSubmit(() => setOnboardingStep(1))}
    >
      <div>
        <h2 className="text-xl font-semibold text-[color:var(--color-text)] sm:text-2xl">
          Tell us about you
        </h2>
        <p className="mt-1 text-sm text-muted sm:text-base">
          A few basics to personalize your Finkoin experience.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Name</span>
          <input
            {...register("name")}
            autoComplete="name"
            className="min-h-11 rounded-lg border border-border bg-surface-alt px-3 text-[color:var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--ring-primary)]"
          />
          {errors.name && (
            <span className="text-danger">{errors.name.message}</span>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Country / region</span>
          <input
            {...register("country")}
            autoComplete="country-name"
            className="min-h-11 rounded-lg border border-border bg-surface-alt px-3 text-[color:var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--ring-primary)]"
          />
          {errors.country && (
            <span className="text-danger">{errors.country.message}</span>
          )}
        </label>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button type="submit" variant="primary" className="w-full sm:w-auto">
          Continue
        </Button>
      </div>
    </form>
  );
}
