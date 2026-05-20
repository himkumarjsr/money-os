import type { ReactNode } from "react";
import Link from "next/link";

function Card({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className={id ? "scroll-mt-24" : undefined}>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <div className="mt-3 text-sm leading-relaxed text-slate-700">{children}</div>
      </div>
    </section>
  );
}

export default function TermInsuranceVsEndowmentGuide() {
  return (
    <div className="min-w-0 space-y-10 text-slate-800">
      <p className="text-sm text-slate-600 sm:text-base">
        Term insurance is <strong className="font-semibold text-slate-800">pure protection</strong>: a fixed premium
        buys a large sum payable if you die during the policy term. Below is a practical “why”, how to think about{" "}
        <strong className="font-semibold text-slate-800">how much</strong>, what people buy wrong, and why{" "}
        <strong className="font-semibold text-slate-800">premium you can always pay</strong> matters as much as the
        cover amount.
      </p>

      <Card id="why-matters" title="Why this matters — money for obligations, then survival">
        <p className="mb-4">
          If the main earner dies early, the family still faces the same world:{" "}
          <strong className="font-semibold text-slate-900">loan EMIs</strong>,{" "}
          <strong className="font-semibold text-slate-900">children’s education</strong>,{" "}
          <strong className="font-semibold text-slate-900">rent or home costs</strong>, day-to-day expenses, and
          possible <strong className="font-semibold text-slate-900">large medical bills</strong> (even with health
          insurance, cash flow and co-pay gaps exist).
        </p>
        <p className="mb-4">
          Term cover is meant so that, in that worst case, the payout can:{" "}
          <strong className="font-semibold text-slate-900">pay off or sharply reduce big debts you choose to include</strong>{" "}
          (for example home loan), <strong className="font-semibold text-slate-900">fund non-negotiable goals</strong> you
          had planned (education), set aside a <strong className="font-semibold text-slate-900">medical / liquidity buffer</strong>,{" "}
          and rebuild an <strong className="font-semibold text-slate-900">emergency runway</strong> — and{" "}
          <strong className="font-semibold text-slate-900">still leave enough corpus</strong> so dependents can live
          without your income for many years, not just survive the first 12 months.
        </p>
        <p>
          Many families plan an emergency fund of <strong className="font-semibold text-slate-900">several months up to
          about 12 months</strong> of must-pay expenses (see our emergency fund guide). If income is volatile or you are
          the only earner, you usually steer toward the <strong className="font-semibold text-slate-900">upper end</strong>{" "}
          of that range. Term insurance does not replace that fund while you are alive — but the{" "}
          <strong className="font-semibold text-slate-900">sum assured</strong> should reflect that the family may need
          to recreate buffers <em>and</em> replace lost income after big one-time uses.
        </p>
        <p className="mt-4">
          <Link
            href="/learn/emergency-fund-how-much-where-to-keep-it"
            className="font-semibold text-[#534AB7] hover:underline"
          >
            Emergency fund — how much, where to keep it →
          </Link>
        </p>
      </Card>

      <Card id="example" title="Illustrative example (numbers are not advice)">
        <p className="mb-4">
          Imagine a sole earner wants the family to be able to: clear a large home loan, keep education on track, hold
          liquidity for shocks, and then still have years of living costs. A <strong className="font-semibold text-slate-900">needs-based</strong>{" "}
          list might look like this (purely educational):
        </p>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[300px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-semibold">Bucket (illustrative)</th>
                <th className="px-3 py-2 font-semibold">Example amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="px-3 py-2">Outstanding home loan you want extinguished</td>
                <td className="px-3 py-2 font-medium text-slate-900">₹35,00,000</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Education corpus (say next 8–10 years)</td>
                <td className="px-3 py-2 font-medium text-slate-900">₹25,00,000</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Medical / liquidity buffer (not a substitute for health insurance)</td>
                <td className="px-3 py-2 font-medium text-slate-900">₹10,00,000</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Emergency fund to recreate (e.g. ~12 months essential costs — see emergency fund guide)</td>
                <td className="px-3 py-2 font-medium text-slate-900">₹5,40,000</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Income replacement — essential household costs for several years</td>
                <td className="px-3 py-2 font-medium text-slate-900">₹35,00,000</td>
              </tr>
              <tr className="bg-slate-50 font-semibold text-slate-900">
                <td className="px-3 py-2">Rough total to discuss with family / advisor</td>
                <td className="px-3 py-2">~₹1.10 crore</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-slate-600">
          Shortcut checks people use: <strong className="font-semibold text-slate-800">10–15× annual income</strong>{" "}
          (sometimes + loan outstanding). Use that as a cross-check to your needs list — city, lifestyle, number of
          dependents, and existing assets change everything.
        </p>
      </Card>

      <Card id="buying-wrong" title="Buying wrong — what to avoid">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-semibold text-slate-900">Endowment / money-back as “main protection”:</strong> the
            death benefit per rupee of premium is usually small. You may get a “maturity story”, but the family might be
            severely underinsured if you die young.
          </li>
          <li>
            <strong className="font-semibold text-slate-900">Confusing savings with life cover:</strong> keep
            investments in transparent products (MFs, PPF, etc.) and life cover as term — same message as mixing goals
            in one opaque bundle.
          </li>
          <li>
            <strong className="font-semibold text-slate-900">Under-buying because the premium “feels wasted”:</strong>{" "}
            term has no maturity value; that is why it is cheap enough to buy meaningful cover.
          </li>
        </ul>
        <p className="mt-4">
          Before any bundled product, ask for <strong className="font-semibold text-slate-900">net return after all
          charges</strong> and compare with a simple <strong className="font-semibold text-slate-900">term + PPF / MF</strong>{" "}
          combo you understand.
        </p>
      </Card>

      <Card id="premium-discipline" title="Do not buy so much cover that the premium breaks you">
        <p className="mb-4">
          The <strong className="font-semibold text-slate-900">right</strong> term plan is one your family can rely on
          for <strong className="font-semibold text-slate-900">the full term</strong>. That means you must be able to pay
          the premium after a bad year too — <strong className="font-semibold text-slate-900">job loss</strong>,{" "}
          <strong className="font-semibold text-slate-900">business dip</strong>, or{" "}
          <strong className="font-semibold text-slate-900">income shock</strong>. If the premium is too large a share of
          take-home, people often <strong className="font-semibold text-slate-900">stop paying</strong>; a lapsed term
          policy leaves you with <strong className="font-semibold text-slate-900">no cover</strong> when you restart
          later (and you will be older — new cover may cost more or have health underwriting hurdles).
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Size cover from <strong className="font-semibold text-slate-900">needs + a premium stress test</strong>:
            “Can I pay this every year for 20–30 years even if income drops 20–30% for a while?”
          </li>
          <li>
            If the honest answer is no, prefer a <strong className="font-semibold text-slate-900">slightly lower sum
            assured you will not lapse</strong> over a heroic number on paper.
          </li>
          <li>
            When income rises, <strong className="font-semibold text-slate-900">add cover or a second term policy</strong>{" "}
            rather than over-stretching today (subject to insurer rules and health declarations).
          </li>
          <li>
            Revisit cover every few years: as <strong className="font-semibold text-slate-900">loans shrink</strong> and{" "}
            <strong className="font-semibold text-slate-900">investments grow</strong>, you may need less pure risk
            cover — but don’t cut blindly; dependents and goals matter.
          </li>
        </ul>
      </Card>

      <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-950 sm:text-sm">
        <strong className="font-semibold">Educational only.</strong> This is not personalised insurance advice, not a
        recommendation to buy or skip any product, and not a solicitation. Sum assured, riders, and tax treatment depend
        on insurer terms and current law — verify with a{" "}
        <strong className="font-semibold">registered insurance advisor / financial planner</strong> and official
        policy documents before you commit.
      </div>
    </div>
  );
}
