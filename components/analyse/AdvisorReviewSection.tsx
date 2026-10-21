"use client";

import type { AdvisorReview } from "@/lib/advisorReview";

function ActionList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#534AB7]">
        {title}
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((text) => (
          <li key={text} className="flex gap-2 text-sm text-[#3D3C38]">
            <span aria-hidden className="text-[#534AB7]">
              •
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Adviser's review: money in the wrong place + one action list. */
export default function AdvisorReviewSection({
  review,
}: {
  review: AdvisorReview;
}) {
  return (
    <>
      {review.fixes.length > 0 ? (
        <section className="rounded-2xl border border-[#E8E6F0] bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-[#111110]">
            Money in the wrong place
          </h3>
          <p className="mt-1 text-sm text-[#5F5E5A]">
            What an adviser would change in what you already have.
          </p>
          <ul className="mt-3 space-y-3">
            {review.fixes.map((f) => (
              <li
                key={`${f.id}:${f.title}`}
                className="rounded-xl bg-[#F7F7F4] p-3"
              >
                <p className="text-sm font-semibold text-[#111110]">
                  {f.title}
                </p>
                <p className="mt-0.5 text-sm text-[#5F5E5A]">{f.detail}</p>
                {f.yearlyGain && f.yearlyGain > 0 ? (
                  <p className="mt-1 text-xs font-semibold text-[#1D9E75]">
                    About ₹{f.yearlyGain.toLocaleString("en-IN")} a year better
                    off
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-[#E8E6F0] bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-[#111110]">
          Your action list
        </h3>
        <ActionList title="This week" items={review.thisWeek} />
        <ActionList title="Every month" items={review.monthly} />
        <ActionList title="Every year" items={review.yearly} />
      </section>
    </>
  );
}
