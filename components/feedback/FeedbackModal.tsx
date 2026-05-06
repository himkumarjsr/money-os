"use client";

import { cn } from "@/lib/cn";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type FeedbackModalProps = {
  open: boolean;
  onClose: () => void;
  /** Where in the app feedback was opened from (stored in Supabase `context`). */
  source?: string;
};

export function FeedbackModal({ open, onClose, source = "header" }: FeedbackModalProps) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRating(0);
    setMessage("");
    setError(null);
    setDone(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const submit = useCallback(async () => {
    if (!isLoggedIn || rating < 1) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          rating,
          message: message.trim(),
          context: source,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        if (res.status === 401) {
          setError("Please sign in to send feedback.");
          return;
        }
        setError(data.message ?? data.error ?? "Could not save feedback. Try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }, [isLoggedIn, message, rating, source]);

  if (!open) return null;

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
        className="fixed left-1/2 top-1/2 z-[1002] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#E8E6F0] bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="feedback-modal-title" className="text-lg font-bold text-slate-900">
            Feedback
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-xl leading-none text-slate-600 hover:bg-slate-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {!isLoggedIn ? (
          <p className="mt-4 text-sm text-slate-600">
            Sign in so we can tie ratings to your account and follow up if needed.
          </p>
        ) : done ? (
          <p className="mt-4 text-sm font-medium text-emerald-800">Thanks — your feedback was saved.</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">How would you rate your experience?</p>
            <div className="mt-3 flex justify-center gap-2" role="group" aria-label="Rating 1 to 5 stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl border text-lg transition",
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

            <label htmlFor="feedback-message" className="mt-4 block text-sm font-medium text-slate-800">
              Comments <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={8000}
              placeholder="What worked well? What should we improve?"
              className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-[#534AB7]/30 focus:ring-2"
            />

            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

            <button
              type="button"
              disabled={submitting || rating < 1}
              onClick={() => void submit()}
              className="mt-4 w-full rounded-xl bg-[#534AB7] py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:bg-[#44399a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Submit feedback"}
            </button>
          </>
        )}

        {!isLoggedIn ? (
          <Link
            href={`/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}
            className="mt-4 flex w-full items-center justify-center rounded-xl border border-[#534AB7] py-3 text-sm font-semibold text-[#534AB7]"
            onClick={onClose}
          >
            Sign in
          </Link>
        ) : null}
      </div>
    </>
  );
}
