import Link from "next/link";

function Card({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={id ? "scroll-mt-24" : undefined}>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
          {children}
        </div>
      </div>
    </section>
  );
}

export default function Form16ItrGuide() {
  return (
    <div className="min-w-0 space-y-8 text-slate-800">
      <p className="text-sm text-slate-600 sm:text-base">
        Looking for <strong>free ITR filing 2025-26</strong> help? Finkoin’s
        angle is simple: start from your{" "}
        <strong>Form 16 / salary numbers</strong>, compare old vs new regime,
        and walk into filing with clarity — without paying for a basic
        comparison.
      </p>

      <div className="rounded-2xl border border-[#534AB7]/30 bg-[#FAFAFE] p-5">
        <div className="text-sm font-bold text-[#111110]">
          Use Finkoin’s free tax tool (FY 2025-26)
        </div>
        <p className="mt-2 text-sm text-[#5F5E5A]">
          Enter salary / Form 16 style numbers, deductions (80C, HRA, NPS, home
          loan), and see which regime saves more — before you open the
          income-tax portal.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/calculators/tax-regime-2026"
            className="inline-flex min-h-10 items-center rounded-xl bg-[#534AB7] px-4 text-sm font-bold text-white no-underline"
          >
            Open tax regime calculator →
          </Link>
          <Link
            href="/analyse"
            className="inline-flex min-h-10 items-center rounded-xl border border-[#E8E6F0] bg-white px-4 text-sm font-bold text-[#534AB7] no-underline"
          >
            Full financial health check →
          </Link>
        </div>
      </div>

      <Card id="what-form-16" title="What Form 16 is (and what it is not)">
        <p>
          Form 16 is your employer’s TDS certificate: Part A (employer TAN, tax
          deposited) and Part B (salary, allowances, perquisites, deductions
          considered by payroll, taxable income).
        </p>
        <p>
          It is <strong>not</strong> your ITR. Bank interest, capital gains,
          rent income, and second Form 16s (job switch) often sit outside what
          one employer saw.
        </p>
      </Card>

      <Card id="verify" title="What to verify before you file">
        <ul className="list-disc space-y-1 pl-5">
          <li>Gross salary and exemptions match salary slips / CTC letters.</li>
          <li>
            HRA exemption matches rent proofs and metro vs non-metro rules.
          </li>
          <li>
            80C shows PF correctly — don’t double-count ELSS you never declared.
          </li>
          <li>Two employers → two Form 16s; merge incomes carefully.</li>
          <li>Download AIS / Form 26AS and match TDS credits.</li>
        </ul>
      </Card>

      <Card
        id="free-filing"
        title="“Free ITR filing” — what Finkoin helps with"
      >
        <p>
          Many sites promise free e-filing in June–July. Finkoin’s unique early
          step is <strong>decision support</strong>: which regime, which
          deductions matter, and whether your salary story needs ITR-1 vs a more
          complex form.
        </p>
        <p>
          Use the{" "}
          <Link
            href="/calculators/tax-regime-2026"
            className="font-semibold text-[#534AB7]"
          >
            Old vs New Tax Regime Calculator 2025-26
          </Link>{" "}
          with Form 16 figures, then file on the official Income Tax portal (or
          your preferred e-filing partner) with numbers you already understand.
        </p>
      </Card>

      <Card id="steps" title="Practical 5-step path for FY 2025-26">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Collect Form 16 (all employers), AIS, 26AS, bank interest
            certificates.
          </li>
          <li>
            Run{" "}
            <Link
              href="/calculators/tax-regime-2026"
              className="font-semibold text-[#534AB7]"
            >
              regime comparison
            </Link>{" "}
            with realistic 80C / HRA / 24B / NPS.
          </li>
          <li>
            Read{" "}
            <Link
              href="/learn/old-vs-new-tax-regime-which-saves-you-more-money"
              className="font-semibold text-[#534AB7]"
            >
              old vs new regime guide
            </Link>{" "}
            if deductions are large.
          </li>
          <li>Pick the regime, gather proofs, reconcile AIS mismatches.</li>
          <li>File ITR on the government portal; keep acknowledgements.</li>
        </ol>
      </Card>

      <Card id="disclaimer" title="Important">
        <p>
          Finkoin is educational software — not a CA firm or authorised e-filing
          intermediary. Complex cases (capital gains schedules, business income,
          NRI) need a qualified professional.
        </p>
      </Card>
    </div>
  );
}
