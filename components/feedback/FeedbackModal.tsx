"use client";

import { apiFetch } from "@/lib/apiFetch";
import { cn } from "@/lib/cn";
import { trackEvent } from "@/lib/gtag";
import { loginHrefPreserveRef } from "@/lib/referralRewards";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type FeedbackModalProps = {
  open: boolean;
  onClose: () => void;
  /** Where in the app feedback was opened from (stored in Supabase `context`). */
  source?: string;
};

const STEPS = [
  { key: "intro", title: "Help us improve", subtitle: "A few short steps — like our guided checkup." },
  { key: "rating", title: "Step 1 · Overall experience", subtitle: "How would you rate Finkoin so far?" },
  { key: "area", title: "Step 2 · Where in the app?", subtitle: "What did you use most recently?" },
  { key: "highlights", title: "Step 3 · What worked well?", subtitle: "Optional — tell us what you liked." },
  { key: "improve", title: "Step 4 · What should improve?", subtitle: "Optional — bugs, confusion, or missing features." },
  { key: "recommend", title: "Step 5 · Recommendation", subtitle: "Would you recommend Finkoin to a friend?" },
] as const;

const AREAS = [
  { id: "analyse", label: "Financial health check / Analyse" },
  { id: "calculators", label: "Calculators" },
  { id: "tracker", label: "Expense tracker" },
  { id: "plans", label: "Plans & billing" },
  { id: "learn", label: "Learn / articles" },
  { id: "other", label: "Something else" },
] as const;

type Recommend = "yes" | "maybe" | "no" | "";

/** When set (build-time env), feedback uses your Google Form only — no Finkoin DB or `/api/feedback`. */
const FEEDBACK_GOOGLE_FORM_URL = (process.env.NEXT_PUBLIC_FEEDBACK_GOOGLE_FORM_URL ?? "").trim();

export function FeedbackModal({ open, onClose, source = "header" }: FeedbackModalProps) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState(0);
  const [rating, setRating] = useState(0);
  const [area, setArea] = useState<(typeof AREAS)[number]["id"] | "">("");
  const [highlights, setHighlights] = useState("");
  const [improvements, setImprovements] = useState("");
  const [recommend, setRecommend] = useState<Recommend>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const totalSteps = STEPS.length;

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setRating(0);
    setArea("");
    setHighlights("");
    setImprovements("");
    setRecommend("");
    setError(null);
    setDone(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    trackEvent("feedback_open", {
      feedback_source: source,
      feedback_channel: FEEDBACK_GOOGLE_FORM_URL ? "google_form" : "in_app_wizard",
    });
  }, [open, source]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const areaLabel = useMemo(() => AREAS.find((a) => a.id === area)?.label ?? "", [area]);

  const canGoNext = useCallback(() => {
    switch (step) {
      case 0:
        return true;
      case 1:
        return rating >= 1;
      case 2:
        return area !== "";
      case 3:
      case 4:
        return true;
      default:
        return false;
    }
  }, [step, rating, area]);

  const goNext = () => {
    if (!canGoNext()) return;
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    setError(null);
  };

  const submit = useCallback(async () => {
    if (!isLoggedIn || rating < 1 || !area || !recommend || !user?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      const hl = highlights.trim();
      const im = improvements.trim();
      const messageParts = [`Area: ${areaLabel}`, hl && `What worked:\n${hl}`, im && `To improve:\n${im}`, `Recommend: ${recommend}`];
      const message = messageParts.filter(Boolean).join("\n\n");
      const page_context = `wizard_${source}_${area}`;

      const res = await apiFetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: user.id,
          rating,
          message,
          page_context,
          score_at_time: null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.message ?? data.error ?? "Could not save feedback. Try again.");
        return;
      }
      setDone(true);
      trackEvent("feedback_submit", { feedback_source: source, rating });
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }, [area, areaLabel, highlights, improvements, isLoggedIn, rating, recommend, source, user?.id]);

  if (!open) return null;

  if (FEEDBACK_GOOGLE_FORM_URL) {
    return (
      <>
        <button
          type="button"
          className="fixed inset-0 z-[1001] bg-black/40"
          aria-label="Close feedback"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-google-title"
          className="fixed left-1/2 top-1/2 z-[1002] w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#E8E6F0] bg-white p-5 shadow-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#534AB7]">Feedback</p>
              <h2 id="feedback-google-title" className="mt-1 text-lg font-bold text-slate-900">
                Share feedback on Google Forms
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-xl leading-none text-slate-600 hover:bg-slate-100"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Your answers are submitted only in our Google Form (linked spreadsheet).{" "}
            <strong className="font-semibold text-slate-800">We do not save feedback in the Finkoin database.</strong>
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            To get each response by email: open the form in Google Forms → <strong>Settings</strong> (gear) →{" "}
            <strong>Responses</strong> → enable notifications for new responses.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                trackEvent("feedback_google_form_open", { feedback_source: source });
                window.open(FEEDBACK_GOOGLE_FORM_URL, "_blank", "noopener,noreferrer");
              }}
              className="flex-1 rounded-xl bg-[#534AB7] py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/25"
            >
              Open feedback form
            </button>
          </div>
        </div>
      </>
    );
  }

  const meta = STEPS[step];

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[1001] bg-black/40"
        aria-label="Close feedback"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        className="fixed left-1/2 top-1/2 z-[1002] flex max-h-[min(560px,88vh)] w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-[#E8E6F0] bg-white shadow-xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 pb-3 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#534AB7]">
              Feedback · Step {step + 1} of {totalSteps}
            </p>
            <h2 id="feedback-modal-title" className="mt-1 text-lg font-bold leading-snug text-slate-900">
              {meta.title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{meta.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-xl leading-none text-slate-600 hover:bg-slate-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mt-3 flex shrink-0 justify-center gap-1.5 px-5" aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 rounded-full transition-all",
                i === step ? "w-7 bg-[#534AB7]" : i < step ? "w-2 bg-[#534AB7]/35" : "w-2 bg-slate-200",
              )}
            />
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!isLoggedIn ? (
            <p className="text-sm text-slate-600">
              Sign in so we can save your answers and follow up if needed. Your responses also sync to our team inbox when
              Google Forms is configured on the server.
            </p>
          ) : done ? (
            <p className="text-sm font-medium text-emerald-800">
              Thanks — your feedback was saved. If Google Sheets mirroring is enabled, it will appear in the linked form too.
            </p>
          ) : (
            <>
              {step === 0 ? (
                <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-slate-700">
                  <li>Five quick questions — tap Next to begin.</li>
                  <li>Takes under a minute.</li>
                  <li>You can skip optional text fields.</li>
                </ul>
              ) : null}

              {step === 1 ? (
                <div className="flex justify-center gap-2 pt-2" role="group" aria-label="Rating 1 to 5 stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl border text-xl transition",
                        rating >= n
                          ? "border-[#534AB7] bg-[#EEEDFE] text-[#534AB7]"
                          : "border-slate-200 bg-white text-slate-400 hover:border-slate-300",
                      )}
                      aria-pressed={rating >= n}
                      aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              ) : null}

              {step === 2 ? (
                <div className="grid gap-2 pt-1">
                  {AREAS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setArea(a.id)}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left text-sm font-medium transition",
                        area === a.id
                          ? "border-[#534AB7] bg-[#EEEDFE] text-[#3C3489]"
                          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300",
                      )}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {step === 3 ? (
                <textarea
                  value={highlights}
                  onChange={(e) => setHighlights(e.target.value)}
                  rows={5}
                  maxLength={4000}
                  placeholder="Features, clarity, speed — anything that stood out."
                  className="mt-1 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-[#534AB7]/30 focus:ring-2"
                />
              ) : null}

              {step === 4 ? (
                <textarea
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                  rows={5}
                  maxLength={4000}
                  placeholder="What felt confusing, slow, or missing?"
                  className="mt-1 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-[#534AB7]/30 focus:ring-2"
                />
              ) : null}

              {step === 5 ? (
                <div className="space-y-4 pt-1">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/90 p-3 text-xs leading-relaxed text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-900">Rating:</span> {rating}/5
                    </p>
                    <p className="mt-1">
                      <span className="font-semibold text-slate-900">Area:</span> {areaLabel || "—"}
                    </p>
                    {highlights.trim() ? (
                      <p className="mt-2 whitespace-pre-wrap">
                        <span className="font-semibold text-slate-900">Worked well:</span> {highlights.trim()}
                      </p>
                    ) : null}
                    {improvements.trim() ? (
                      <p className="mt-2 whitespace-pre-wrap">
                        <span className="font-semibold text-slate-900">Improve:</span> {improvements.trim()}
                      </p>
                    ) : null}
                  </div>

                  <p className="text-sm font-medium text-slate-800">Would you recommend Finkoin?</p>
                  <div className="grid gap-2">
                    {(
                      [
                        { id: "yes" as const, label: "Yes — I would recommend it" },
                        { id: "maybe" as const, label: "Maybe — depends" },
                        { id: "no" as const, label: "Not yet" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setRecommend(opt.id)}
                        className={cn(
                          "rounded-xl border px-4 py-3 text-left text-sm font-semibold transition",
                          recommend === opt.id
                            ? "border-[#534AB7] bg-[#EEEDFE] text-[#3C3489]"
                            : "border-slate-200 bg-white text-slate-800 hover:border-slate-300",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            </>
          )}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-slate-100 px-5 py-4">
          {!isLoggedIn ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700"
              >
                Close
              </button>
              <Link
                href={loginHrefPreserveRef(
                  `/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`,
                )}
                className="flex flex-1 items-center justify-center rounded-xl bg-[#534AB7] py-3 text-sm font-semibold text-white"
                onClick={onClose}
              >
                Sign in
              </Link>
            </>
          ) : done ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-[#534AB7] py-3 text-sm font-semibold text-white"
            >
              Done
            </button>
          ) : (
            <>
              {step === 0 ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600"
                >
                  Maybe later
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700"
                >
                  Back
                </button>
              )}
              {step < totalSteps - 1 ? (
                <button
                  type="button"
                  disabled={!canGoNext()}
                  onClick={goNext}
                  className="flex-1 rounded-xl bg-[#534AB7] py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting || !recommend}
                  onClick={() => void submit()}
                  className="flex-1 rounded-xl bg-[#534AB7] py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {submitting ? "Sending…" : "Submit feedback"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
