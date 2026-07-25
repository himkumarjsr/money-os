"use client";

import { AppIcon } from "@/components/ui/AppIcon";
import { clearBodyScrollLocks, lockBodyScroll } from "@/lib/bodyScrollLock";
import { useEffect } from "react";

/**
 * Modal shell for the analyse flow.
 * Renders the full 7-step form as children — does not strip fields.
 * When `open` is false, children render inline on the page.
 */
export default function AnalyseAdvisorModal({
  open,
  step,
  stepTitle,
  stepCount,
  onClose,
  children,
}: {
  open: boolean;
  step: number;
  stepTitle: string;
  stepCount: number;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const unlock = lockBodyScroll();
    return () => {
      unlock();
      clearBodyScrollLocks();
    };
  }, [open]);

  if (!open) {
    return <>{children}</>;
  }

  const progress = Math.round(((step + 1) / Math.max(1, stepCount)) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-900/60 p-3 py-6 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="analyse-advisor-title"
    >
      <div className="my-auto flex max-h-[min(92dvh,56rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#F0EFF8] px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#534AB7]">
              Finkoin advisor
            </p>
            <h2
              id="analyse-advisor-title"
              className="text-lg font-semibold text-slate-900 sm:text-xl"
            >
              Financial health check
            </h2>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Step {step + 1} of {stepCount} · {stepTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg p-2 text-[#534AB7] hover:bg-slate-100"
            aria-label="Close modal and use page form"
            title="Use page form"
          >
            <AppIcon name="close" size={16} color="#534AB7" />
          </button>
        </div>

        <div className="shrink-0 px-4 pt-3 sm:px-6">
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#EEEDFE]">
            <div
              className="h-full rounded-full bg-[#534AB7] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[11px] text-[#7A7871]">
            {progress}% complete
          </p>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-2 sm:px-6"
          data-analyse-modal-scroll
        >
          {children}
        </div>
      </div>
    </div>
  );
}
