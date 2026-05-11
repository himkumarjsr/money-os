"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import TaxFaqAccordion, { type TaxFaq } from "@/components/learn/tax/TaxFaqAccordion";
import TaxRegimeToggle from "@/components/learn/tax/TaxRegimeToggle";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm leading-relaxed text-slate-700">{children}</div>
    </div>
  );
}

function Section({ id, title, subtitle, children }: { id: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const FAQS: TaxFaq[] = [
  { q: "What is the difference between FY and AY?", a: "FY (Financial Year) is when you earn income (1 Apr to 31 Mar). AY (Assessment Year) is when you file and the Income Tax Department assesses that FY’s income." },
  { q: "FY 2025-26 means what dates?", a: "Income earned from 1 April 2025 to 31 March 2026." },
  { q: "AY 2026-27 means what?", a: "The year in which you typically file the return for FY 2025-26 (and the department assesses it)." },
  {
    q: "Which ITR should a salaried employee usually file?",
    a: "If you are a resident with only salary + bank interest + one eligible house property (and no restricted incomes), ITR-1 is common. If you have capital gains (Indian or foreign stocks/MF), foreign income/assets reporting, or multiple house-property complexity, you usually move to ITR-2. Always confirm on the Income Tax Department’s ITR selection guidance for the year.",
  },
  {
    q: "I invest in US stocks (via an Indian broker or LRS). Which ITR?",
    a: "US equity sales typically create capital gains schedules (and may involve foreign income/asset reporting depending on your case). That is usually not an ITR-1-only situation—most salaried people end up on ITR-2 (subject to eligibility). If you also have business income, ITR-3 may apply. Verify with AIS/broker statements and the official ITR wizard.",
  },
  { q: "Is ITR filing mandatory if my tax is zero?", a: "It can be mandatory in specific cases (high-value transactions, foreign assets, etc.). Even when not mandatory, filing helps with refunds, visa/income proof, and continuity." },
  { q: "How much income is tax-free in India?", a: "It depends on the regime and the rebate rules (e.g., Section 87A) for that year. Always compute taxable income first, then apply rebate/cess." },
  { q: "What is Form 16?", a: "A certificate issued by your employer showing salary paid and TDS deducted. It is a key document for salaried filing." },
  { q: "What is 26AS and AIS?", a: "Form 26AS shows tax credits like TDS/TCS. AIS (Annual Information Statement) and TIS show broader transaction/income information used for matching." },
  { q: "What is TDS in salary?", a: "Tax Deducted at Source. Employers deduct estimated tax monthly and deposit it with the government." },
  { q: "Can I switch between old and new regime every year?", a: "Many salaried individuals can choose each year at filing time. Rules can differ for business income cases; check the current-year conditions." },
  { q: "What is Section 80C?", a: "A deduction section (up to the notified limit) covering common investments/expenses like EPF, PPF, ELSS, life insurance premium, etc., subject to rules." },
  { q: "What is Section 80D?", a: "Deduction for eligible health insurance premium and certain medical expenses, subject to limits and conditions." },
  { q: "What is standard deduction?", a: "A flat deduction from salary/pension as per rules for that year/regime." },
  { q: "What is cess?", a: "Health & Education cess is applied as a percentage on computed tax (after surcharge where applicable) as per current rules." },
  { q: "What is surcharge?", a: "Additional tax on high total income above certain thresholds; it affects the effective tax rate." },
  { q: "What are 234A/234B/234C interest sections?", a: "These are interest provisions for late filing (234A), shortfall of advance tax (234B), and deferment of advance tax installments (234C), generally computed per month when applicable." },
  { q: "Which documents do I need to file ITR?", a: "PAN, Aadhaar, Form 16, AIS/26AS, bank interest certificates, capital gains statements (if any), and proofs for deductions/exemptions you claim." },
  { q: "What is e-verification?", a: "The final verification step after filing (OTP, netbanking, etc.). Without verification within the allowed time, the return is treated as not filed." },
  { q: "Are capital gains taxed like salary slabs?", a: "Often no. Many capital gains have separate rates and rules. Always compute capital gains separately as required." },
  { q: "Is FD interest taxable?", a: "Yes, FD/RD interest is generally taxable as ‘Income from Other Sources’ and may also have TDS." },
  { q: "Do I need to report savings account interest?", a: "Yes. It is income, though you may be eligible for deduction under sections like 80TTA/80TTB (subject to conditions)." },
  { q: "What is ITR-4 (Sugam)?", a: "An ITR form commonly used for eligible presumptive income cases (small business/profession) as per the law." },
  { q: "What if AIS shows something I didn’t earn?", a: "Reconcile with your records and raise feedback/correction on the portal where applicable. Don’t ignore mismatches." },
  { q: "How do refunds work?", a: "If total TDS/advance tax is more than final tax liability, you can get a refund after processing. Ensure bank details are correct." },
  { q: "What is marginal relief?", a: "A relief that can reduce the harsh jump in tax when surcharge triggers; it ensures the additional tax doesn’t exceed the income above threshold by too much, as per rules." },
  { q: "What are common mistakes that cause notices?", a: "Not matching AIS/26AS, forgetting bank/FD interest, incorrect ITR selection, missing e-verification, and claiming unsupported deductions." },
  { q: "Where do I file online?", a: "On the official Income Tax e-Filing portal. Use only the official website and verify the URL." },
  { q: "What is PAN and why is it important?", a: "PAN is your unique tax identifier used across filings, TDS credits, AIS, and many financial transactions." },
  { q: "Who is a resident vs non-resident?", a: "Residency depends on day-count rules under the Income-tax Act and affects scope of income taxed. Check the current rules for your situation." },
  { q: "Can ITR help for visa/income proof?", a: "Yes. Filed ITRs are commonly used as income proof for loans and visas." },
  { q: "Do I need to file if I have foreign assets?", a: "Often yes; foreign assets/income can trigger mandatory filing and additional disclosures. Verify your exact case." },
  { q: "What is self-assessment tax?", a: "Tax you pay if there’s remaining liability after TDS/advance tax, paid before filing." },
  { q: "What is advance tax?", a: "Tax paid in installments during the year if your tax liability crosses the specified threshold, common for non-salary income." },
  { q: "How do I pick between regimes quickly?", a: "List real deductions/exemptions you can claim. If the list is large, old regime may win; if small, new regime often wins. Then confirm using a calculator." },
  { q: "Is this page official tax advice?", a: "No. It’s educational. Use it to understand concepts, then verify the current-year rules and your eligibility before filing." },
  { q: "Can I edit my return after filing?", a: "Revisions are possible within allowed time windows if the law permits. Check current-year timelines on the official portal." },
  { q: "What is ITR-2 used for?", a: "Often used when you have capital gains or multiple houses/foreign assets but no business income. Eligibility conditions apply." },
  { q: "What is ITR-3 used for?", a: "Commonly for business/professional income cases, including certain capital gains/other income combinations." },
  { q: "Does employer regime declaration lock me?", a: "Not always. You can often choose at filing time; however, TDS may be impacted. Verify rules for your case." },
];

export default function IncomeTaxGuideFY2526() {
  const toc = [
    { id: "hero", label: "Start here" },
    { id: "what-is-tax", label: "What is income tax?" },
    { id: "fy-ay", label: "FY vs AY (timeline)" },
    { id: "who-files", label: "Who should file ITR?" },
    { id: "income-heads", label: "Types of income" },
    { id: "itr-forms", label: "ITR forms guide" },
    { id: "regimes", label: "Old vs new regime" },
    { id: "slabs", label: "Tax slabs + 87A/cess" },
    { id: "deductions", label: "Important deductions" },
    { id: "tds", label: "TDS + Form 16 + AIS" },
    { id: "how-to-file", label: "How to file online" },
    { id: "mistakes", label: "Common mistakes" },
    { id: "faq", label: "FAQs" },
  ];

  return (
    <div className="grid min-w-0 gap-10 lg:grid-cols-[280px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">On this page</div>
          <nav className="mt-3 space-y-2 text-sm" aria-label="Table of contents">
            {toc.map((t) => (
              <a key={t.id} href={`#${t.id}`} className="block rounded-lg px-2 py-1 text-slate-700 hover:bg-slate-50 hover:text-[#534AB7]">
                {t.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Updated for <strong>FY 2025-26 (AY 2026-27)</strong>.
          </div>
        </div>
      </aside>

      <div className="min-w-0 space-y-12">
        <Section
          id="hero"
          title="Indian Income Tax Explained Simply (FY 2025-26)"
          subtitle="Understand tax slabs, ITR filing, deductions, old vs new regime, and tax saving in one complete guide."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/analyse" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#534AB7]/40">
              <div className="text-sm font-semibold text-slate-900">Free financial health check</div>
              <p className="mt-1 text-sm text-slate-600">Get a clear plan for savings, debt, and goals.</p>
            </Link>
            <Link href="/calculators?calc=tax-regime" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#534AB7]/40">
              <div className="text-sm font-semibold text-slate-900">Old vs new regime calculator</div>
              <p className="mt-1 text-sm text-slate-600">Compare both regimes with real deductions.</p>
            </Link>
          </div>

          <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <strong className="font-semibold">Disclaimer:</strong> This page is for educational purposes only and should not be considered professional tax advice.
            Always verify current-year rules/limits and your eligibility on the official portal / CBDT notifications.
          </p>
        </Section>

        <Section id="what-is-tax" title="What is income tax? (and why it exists)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card title="Income tax (direct tax)">
              A tax on income earned by a person or entity. For salaried people, it is usually deducted as TDS by the employer and later reconciled in the ITR.
            </Card>
            <Card title="Indirect tax">
              Taxes included in prices of goods/services (example: GST). You don’t “file” GST as a salaried employee, but you pay it as a consumer.
            </Card>
            <Card title="Who needs to pay?">
              If your taxable income exceeds the tax-free thresholds (after deductions/rebates), you pay. Even when tax is zero, filing may still be beneficial or required.
            </Card>
            <Card title="PAN matters">
              PAN is your core tax identifier. It links your TDS credits, AIS/26AS, filings, and many bank/investment transactions.
            </Card>
          </div>
        </Section>

        <Section
          id="fy-ay"
          title="Financial Year (FY) vs Assessment Year (AY) — the simplest way to remember"
          subtitle="Beginners get stuck here. This clears it in 20 seconds."
        >
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">FY 2025-26</div>
                <p className="mt-2 text-sm text-slate-700">Income earned between <strong>1 Apr 2025</strong> → <strong>31 Mar 2026</strong>.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">AY 2026-27</div>
                <p className="mt-2 text-sm text-slate-700">You typically file the return for FY 2025-26 in <strong>2026</strong> — that filing year is AY 2026-27.</p>
              </div>
            </div>
            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline</div>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">Earn income</div>
                  <p className="mt-1 text-sm text-slate-600">Apr 2025 → Mar 2026</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">TDS/advance tax happens</div>
                  <p className="mt-1 text-sm text-slate-600">During FY while income is earned</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">File ITR</div>
                  <p className="mt-1 text-sm text-slate-600">In AY 2026-27</p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section id="who-files" title="Who should file ITR? (even if tax is zero)">
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Common reasons to file">
              Refund due (TDS deducted more than final tax), income proof for loans/visa, record continuity, and to avoid issues when AIS/26AS has entries.
            </Card>
            <Card title="Mandatory filing cases (examples)">
              Certain high-value transactions, foreign assets/income, and other notified conditions can make filing mandatory. Always verify the current-year rules.
            </Card>
          </div>
        </Section>

        <Section id="income-heads" title="Types (heads) of income in India">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Income head</th>
                  <th className="px-4 py-3 font-semibold">What it means</th>
                  <th className="px-4 py-3 font-semibold">Example</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">Salary</td>
                  <td className="px-4 py-3 text-slate-700">Employment income</td>
                  <td className="px-4 py-3 text-slate-700">Monthly salary, bonus</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">House Property</td>
                  <td className="px-4 py-3 text-slate-700">Income from property</td>
                  <td className="px-4 py-3 text-slate-700">Rental income</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">Business & Profession</td>
                  <td className="px-4 py-3 text-slate-700">Self-employment income</td>
                  <td className="px-4 py-3 text-slate-700">Freelancing, shop income</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">Capital Gains</td>
                  <td className="px-4 py-3 text-slate-700">Profit on selling assets</td>
                  <td className="px-4 py-3 text-slate-700">Stocks, mutual funds, property</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">Other Sources</td>
                  <td className="px-4 py-3 text-slate-700">Miscellaneous income</td>
                  <td className="px-4 py-3 text-slate-700">FD interest, savings interest</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section
          id="itr-forms"
          title="Which ITR should I file? (ITR-1 to ITR-7 explained with examples)"
          subtitle="Use this as a map — the final form must match the Income Tax Department’s eligibility rules for that year."
        >
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-700">
              Think in two steps: (1) list every type of income you earned (salary, rent, business, capital gains, foreign interest, etc.), then (2) pick the{" "}
              <strong className="font-semibold">lowest-number ITR that legally covers all of them</strong>. If you are unsure, use the official e-filing portal’s ITR
              selection / help or consult a qualified professional.
            </p>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">ITR</th>
                    <th className="px-4 py-3 font-semibold">Who it is for (plain English)</th>
                    <th className="px-4 py-3 font-semibold">Typical “signals” you belong here</th>
                    <th className="px-4 py-3 font-semibold">Usually NOT the right pick if…</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-900">ITR-1 (Sahaj)</td>
                    <td className="px-4 py-3 text-slate-700">Resident individuals with simple salary + small other income patterns (strict eligibility).</td>
                    <td className="px-4 py-3 text-slate-700">Form 16 only, bank interest, one eligible house property scenario, no capital gains schedules.</td>
                    <td className="px-4 py-3 text-slate-700">You sold stocks/MF/property, you have foreign income, you need multiple house-property reporting, or income types exceed ITR-1 limits.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-900">ITR-2</td>
                    <td className="px-4 py-3 text-slate-700">Individuals/HUFs without business/profession income but with capital gains, more than one house property, or foreign income/asset reporting (as applicable).</td>
                    <td className="px-4 py-3 text-slate-700">Equity/MF sales, RSU vesting gains, rental from multiple properties, foreign dividends/interest, overseas brokerage statements.</td>
                    <td className="px-4 py-3 text-slate-700">You have business/profession books (P&amp;L) beyond presumptive limits.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-900">ITR-3</td>
                    <td className="px-4 py-3 text-slate-700">Individuals/HUFs having income under “Profits and gains of business or profession”.</td>
                    <td className="px-4 py-3 text-slate-700">Freelancer with full books, partner in a firm, consultant billing clients with detailed accounting.</td>
                    <td className="px-4 py-3 text-slate-700">You only have salary + interest and no business income (ITR-1/2 may be enough).</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-900">ITR-4 (Sugam)</td>
                    <td className="px-4 py-3 text-slate-700">Presumptive taxation schemes for eligible small businesses/professions (turnover/limits apply).</td>
                    <td className="px-4 py-3 text-slate-700">Eligible shop owner / freelancer choosing presumptive scheme under law.</td>
                    <td className="px-4 py-3 text-slate-700">You are outside presumptive limits or need detailed P&amp;L reporting (often ITR-3).</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-900">ITR-5</td>
                    <td className="px-4 py-3 text-slate-700">Partnership firms, LLPs, AOP/BOI, artificial juridical persons (not a typical salaried individual form).</td>
                    <td className="px-4 py-3 text-slate-700">You are filing for an LLP/firm entity.</td>
                    <td className="px-4 py-3 text-slate-700">You are filing as an individual salaried employee.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-900">ITR-6</td>
                    <td className="px-4 py-3 text-slate-700">Companies claiming exemption under specific sections (not individual).</td>
                    <td className="px-4 py-3 text-slate-700">Company tax return workflows.</td>
                    <td className="px-4 py-3 text-slate-700">Individual filing.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-900">ITR-7</td>
                    <td className="px-4 py-3 text-slate-700">Persons including companies required to furnish returns under specific trusts/political/refund sections (rare for salaried beginners).</td>
                    <td className="px-4 py-3 text-slate-700">Trust/political party/special cases per law.</td>
                    <td className="px-4 py-3 text-slate-700">Normal salaried employee scenarios.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6">
              <h3 className="text-base font-semibold text-slate-900">Quick “story” examples (beginner-friendly)</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Card title="Example A — Only salary + bank interest">
                  <strong className="font-semibold">Rahul</strong> has Form 16, ₹8,000 savings-account interest, no MF sales, no rent income. This is the classic “simple” profile that often maps to{" "}
                  <strong className="font-semibold">ITR-1</strong> if all eligibility conditions are met.
                </Card>
                <Card title="Example B — US stocks / global MF / RSU sales">
                  <strong className="font-semibold">Neha</strong> is salaried and also sold US stocks (capital gains) and received RSU-related perquisite/gain entries. Even if salary is simple, capital gains reporting usually pushes you away from a pure{" "}
                  <strong className="font-semibold">ITR-1</strong> path towards{" "}
                  <strong className="font-semibold">ITR-2</strong> (and you must reconcile broker statements with AIS). If she also runs a freelance practice with books, consider{" "}
                  <strong className="font-semibold">ITR-3</strong>.
                </Card>
                <Card title="Example C — Crypto / frequent trading">
                  If you treat activity as investing (capital gains) vs business (trading) can change the return shape. Many retail investors need detailed schedules; do not assume ITR-1. When in doubt, use official guidance / a CA.
                </Card>
                <Card title="Example D — Freelancer with invoices + expenses">
                  If you are not eligible for presumptive schemes (or exceed limits), you may need{" "}
                  <strong className="font-semibold">ITR-3</strong> with proper books. If you qualify for presumptive taxation,{" "}
                  <strong className="font-semibold">ITR-4</strong> may apply.
                </Card>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
              <strong className="font-semibold">Official help:</strong> always cross-check on the{" "}
              <a className="font-semibold underline" href="https://www.incometax.gov.in/iec/foportal/" rel="noopener noreferrer" target="_blank">
                Income Tax e-Filing portal
              </a>{" "}
              before submitting.
            </div>

            <p className="mt-5 text-sm text-slate-600">
              Next: regime math and deduction caps →{" "}
              <Link href="/learn/old-vs-new-tax-regime-which-saves-you-more-money" className="font-semibold text-[#534AB7] hover:underline">
                Old vs new tax regime — complete guide
              </Link>
              .
            </p>
          </div>
        </Section>

        <Section id="regimes" title="Old tax regime vs new tax regime (what changes?)">
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Old regime (deduction-friendly)">
              Allows a wider set of deductions/exemptions (80C/80D/HRA-style, home loan interest within limits, etc.) but requires correct documentation.
            </Card>
            <Card title="New regime (simpler)">
              Fewer deductions/exemptions, but different slab structure. Often simpler for people with limited deductions.
            </Card>
          </div>
          <TaxRegimeToggle />
        </Section>

        <Section id="slabs" title="Latest tax slabs FY 2025-26 — what else matters besides slabs?">
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="87A rebate">
              A rebate (not a deduction) that can reduce tax sharply when taxable income is within the notified limits. The exact thresholds/rules can change.
            </Card>
            <Card title="Surcharge + cess">
              Surcharge applies at higher incomes; cess is a percentage applied on computed tax (after surcharge where applicable) as per rules.
            </Card>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Want exact slabs and a full comparison table? Use the{" "}
            <Link href="/calculators?calc=tax-regime" className="font-semibold text-[#534AB7] hover:underline">
              tax regime calculator
            </Link>{" "}
            and cross-check with current-year notifications.
          </div>
        </Section>

        <Section
          id="deductions"
          title="Most important tax-saving sections (with caps used in Finkoin’s FY 2025-26 calculator)"
          subtitle="These limits match the deduction “caps” in our tax regime tool so what you read here matches what the calculator enforces. Always confirm final eligibility on the official law/notifications."
        >
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
            <strong className="font-semibold">Regime note:</strong> deductions like 80C/80D/HRA/24(b) mostly matter under the{" "}
            <strong className="font-semibold">old regime</strong> in typical salaried planning. The new regime in Finkoin currently models a higher{" "}
            <strong className="font-semibold">standard deduction</strong> and generally fewer Chapter VI-A levers — compare both in the{" "}
            <Link href="/calculators?calc=tax-regime" className="font-semibold text-[#534AB7] underline">
              tax regime calculator
            </Link>
            .
          </div>

          <div className="mt-5 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Section / item</th>
                  <th className="px-4 py-3 font-semibold">What it does</th>
                  <th className="px-4 py-3 font-semibold">Cap in Finkoin FY2025-26 model</th>
                  <th className="px-4 py-3 font-semibold">Beginner checklist</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">Standard deduction (salary)</td>
                  <td className="px-4 py-3 text-slate-700">Flat deduction from salary/pension in computations (auto benefit in payslip thinking).</td>
                  <td className="px-4 py-3 text-slate-700">
                    Old regime: <strong className="font-semibold">₹50,000</strong>
                    <br />
                    New regime: <strong className="font-semibold">₹75,000</strong>
                  </td>
                  <td className="px-4 py-3 text-slate-700">Don’t mentally double-count — good tools include this automatically.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">HRA exemption</td>
                  <td className="px-4 py-3 text-slate-700">Rent-related exemption when employer pays HRA (least-of tests).</td>
                  <td className="px-4 py-3 text-slate-700">No single fixed rupee cap in the formula — depends on rent, salary structure, metro/non-metro.</td>
                  <td className="px-4 py-3 text-slate-700">Keep rent agreement + receipts + bank transfers aligned; landlord PAN rules may apply for higher rents.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">80GG (no HRA rent)</td>
                  <td className="px-4 py-3 text-slate-700">If you pay rent but don’t get HRA, an old-regime style rent relief can exist subject to conditions.</td>
                  <td className="px-4 py-3 text-slate-700">
                    Finkoin uses an <strong className="font-semibold">illustrative</strong> model capped at <strong className="font-semibold">₹60,000</strong> (verify eligibility).
                  </td>
                  <td className="px-4 py-3 text-slate-700">Not a substitute for real HRA documentation rules — confirm on official utility.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">80C (combined basket)</td>
                  <td className="px-4 py-3 text-slate-700">EPF/VPF (eligible portion), PPF, ELSS, life insurance premium, principal repayment (eligible part), tuition fees, etc.</td>
                  <td className="px-4 py-3 text-slate-700">
                    <strong className="font-semibold">₹1,50,000</strong> combined cap (extra items don’t create extra 80C room beyond the basket).
                  </td>
                  <td className="px-4 py-3 text-slate-700">If EPF is large, you may “fill” 80C without ELSS — check your payslip + 80C proofs.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">80CCD(1B) (NPS)</td>
                  <td className="px-4 py-3 text-slate-700">Additional NPS contribution deduction beyond the 80C basket (where eligible).</td>
                  <td className="px-4 py-3 text-slate-700">
                    <strong className="font-semibold">₹50,000</strong>
                  </td>
                  <td className="px-4 py-3 text-slate-700">Great if you want disciplined retirement investing + tax planning (subject to product rules).</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">80D (medical insurance)</td>
                  <td className="px-4 py-3 text-slate-700">Premium for self/family and parents (separate buckets in law).</td>
                  <td className="px-4 py-3 text-slate-700">
                    Self/family bucket (as modelled in Finkoin): <strong className="font-semibold">₹25,000</strong> if your age is below 60, else{" "}
                    <strong className="font-semibold">₹50,000</strong>.
                    <br />
                    Parents’ premium bucket (as modelled): <strong className="font-semibold">₹25,000</strong> if parents are not marked senior, else{" "}
                    <strong className="font-semibold">₹50,000</strong>.
                  </td>
                  <td className="px-4 py-3 text-slate-700">Parents’ senior status can materially change the cap — keep policy PDFs.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">24(b) (home loan interest)</td>
                  <td className="px-4 py-3 text-slate-700">Interest on home loan for self-occupied/let-out rules (as applicable).</td>
                  <td className="px-4 py-3 text-slate-700">
                    Finkoin caps self-occupied interest modelling at <strong className="font-semibold">₹2,00,000</strong> (illustrative; let-out has different mechanics).
                  </td>
                  <td className="px-4 py-3 text-slate-700">Use lender interest certificate; don’t confuse principal (80C eligible part) vs interest (24(b)).</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">80EEA (affordable housing interest)</td>
                  <td className="px-4 py-3 text-slate-700">Additional interest deduction for eligible affordable housing loans (conditions apply).</td>
                  <td className="px-4 py-3 text-slate-700">
                    <strong className="font-semibold">₹1,50,000</strong> cap in tool (only if eligible in your facts)
                  </td>
                  <td className="px-4 py-3 text-slate-700">Eligibility is strict — verify sanction date/stamp duty rules for your year.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">80E (education loan interest)</td>
                  <td className="px-4 py-3 text-slate-700">Interest on loan taken for higher education (eligible lender/conditions).</td>
                  <td className="px-4 py-3 text-slate-700">No fixed “₹ cap” in the calculator line — you enter eligible interest; law governs the allowed amount.</td>
                  <td className="px-4 py-3 text-slate-700">Keep lender interest statements; note the “8 years” style rule in law (verify current wording).</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">80G (donations)</td>
                  <td className="px-4 py-3 text-slate-700">Donations to eligible funds/institutions (percentages vary 50%/100% etc.).</td>
                  <td className="px-4 py-3 text-slate-700">You enter <strong className="font-semibold">eligible</strong> donation amounts; the tool doesn’t auto-split categories.</td>
                  <td className="px-4 py-3 text-slate-700">Donation receipt + 80G certificate details must match.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">80TTA (savings interest)</td>
                  <td className="px-4 py-3 text-slate-700">Savings account interest (resident individuals, conditions apply).</td>
                  <td className="px-4 py-3 text-slate-700">
                    <strong className="font-semibold">₹10,000</strong> for non-seniors in tool (seniors usually use 80TTB instead)
                  </td>
                  <td className="px-4 py-3 text-slate-700">FD/RD interest is generally <strong className="font-semibold">not</strong> 80TTA — it’s taxable “other sources”.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">80TTB (senior interest)</td>
                  <td className="px-4 py-3 text-slate-700">Senior citizens: interest on specified deposits (conditions apply).</td>
                  <td className="px-4 py-3 text-slate-700">
                    <strong className="font-semibold">₹50,000</strong>
                  </td>
                  <td className="px-4 py-3 text-slate-700">Seniors should check whether 80TTA vs 80TTB applies to their interest types.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">80DD / 80DDB / 80U</td>
                  <td className="px-4 py-3 text-slate-700">Disability / critical illness / self-disability deductions (highly fact-specific).</td>
                  <td className="px-4 py-3 text-slate-700">
                    80DD: <strong className="font-semibold">₹1,25,000</strong> cap in tool
                    <br />
                    80DDB: <strong className="font-semibold">₹40,000</strong> (non-senior) / <strong className="font-semibold">₹1,00,000</strong> (senior band in tool)
                    <br />
                    80U: <strong className="font-semibold">₹1,25,000</strong> cap in tool
                  </td>
                  <td className="px-4 py-3 text-slate-700">Keep medical certificates/disability certificates as per law.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">Professional tax</td>
                  <td className="px-4 py-3 text-slate-700">State professional tax paid (where applicable).</td>
                  <td className="px-4 py-3 text-slate-700">
                    <strong className="font-semibold">₹5,000</strong> cap in tool
                  </td>
                  <td className="px-4 py-3 text-slate-700">Usually visible on payslip; don’t claim more than actually paid.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">80RRB (royalty)</td>
                  <td className="px-4 py-3 text-slate-700">Royalty income for authors/inventors (eligibility applies).</td>
                  <td className="px-4 py-3 text-slate-700">
                    Illustrative cap <strong className="font-semibold">₹3,00,000</strong> in tool
                  </td>
                  <td className="px-4 py-3 text-slate-700">Rare for typical salaried employees — ignore unless it truly applies.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Card title="LTA (Leave Travel Allowance)">
              LTA is an <strong className="font-semibold">allowance/exemption</strong> story (not a fixed “80C-style” line item in the calculator table). If your employer pays LTA, exemption depends on actual eligible travel bills and employer policy — keep tickets/invoices as per rules.
            </Card>
            <Card title="“Super deductions” mistake to avoid">
              You cannot “stack” two laws to claim the same expense twice. Example: home loan interest belongs in the house-property logic (24(b)/related) — don’t confuse with unrelated sections.
            </Card>
          </div>
        </Section>

        <Section id="tds" title="TDS explained (salary) — Form 16, 26AS, AIS/TIS">
          <div className="grid gap-4 md:grid-cols-3">
            <Card title="TDS on salary">
              Employer estimates annual tax and deducts monthly. Filing reconciles estimated TDS with final tax.
            </Card>
            <Card title="Form 16">
              Proof from employer showing salary and TDS. Use it to populate/verify salary figures.
            </Card>
            <Card title="AIS / 26AS matching">
              Your return should broadly match AIS/26AS. Many notices come from mismatches, not from “wrong tax saving”.
            </Card>
          </div>
        </Section>

        <Section id="how-to-file" title="How to file ITR online (step-by-step)">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>Login on the official Income Tax e-Filing portal using PAN.</li>
            <li>Select the correct ITR form (ITR-1/2/3/4 as applicable).</li>
            <li>Verify prefilled salary/TDS details against Form 16 and AIS/26AS.</li>
            <li>Add missing income (FD interest, capital gains, etc.) if applicable.</li>
            <li>Claim deductions/exemptions you are eligible for with correct details.</li>
            <li>Pay any self-assessment tax (if needed), then submit.</li>
            <li>Complete e-verification within the permitted time.</li>
          </ol>
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <strong className="font-semibold">Common mistake:</strong> forgetting to report bank/FD interest or failing to e-verify.
          </p>
        </Section>

        <Section id="mistakes" title="Common mistakes (and how to avoid them)">
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Wrong ITR selection">Always check eligibility before choosing ITR-1/2/3/4. If in doubt, consult a qualified professional.</Card>
            <Card title="AIS mismatch">Cross-check AIS/26AS. Add missing interest/capital gains if applicable.</Card>
            <Card title="Claiming unsupported deductions">Only claim what you’re eligible for, with evidence (rent receipts, loan certificates, etc.).</Card>
            <Card title="Not e-verifying">Submission is not complete until e-verified within the allowed time.</Card>
          </div>
        </Section>

        <TaxFaqAccordion faqs={FAQS} />

        <section className="mt-10 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
          Next:{" "}
          <Link href="/learn/old-vs-new-tax-regime-which-saves-you-more-money" className="font-semibold text-[#534AB7] hover:underline">
            Old vs new tax regime — complete guide →
          </Link>
        </section>
      </div>
    </div>
  );
}

