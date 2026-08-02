"use client";

import Link from "next/link";
import TaxFaqAccordion, {
  type TaxFaq,
} from "@/components/learn/tax/TaxFaqAccordion";
import { LearnArticleLayout } from "@/components/learn/LearnArticleLayout";
import TaxRegimeLearnEmbed from "@/components/learn/tools/TaxRegimeLearnEmbed";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const FAQS: TaxFaq[] = [
  {
    q: "Which is better: old or new tax regime?",
    a: "There is no universal winner. Compare using your real deductions/exemptions (80C/80D/HRA/home loan/NPS) and compute final tax after rebate, surcharge, and cess.",
  },
  {
    q: "Can I switch regimes every year?",
    a: "Many salaried individuals can choose each year at filing time, but rules can differ for business income. Verify current-year conditions for your case.",
  },
  {
    q: "Does HRA matter for the decision?",
    a: "Yes. If you pay rent and are eligible for HRA exemption (old regime), it can materially change taxable income.",
  },
  {
    q: "What is the fastest way to decide?",
    a: "List eligible deductions you can actually claim with proofs. If the list is small, new regime often wins; if large (within caps), old regime can win. Then verify using a calculator.",
  },
  {
    q: "Should I trust slab rates only?",
    a: "No. Always compute the full tax: taxable income → slab tax → rebate (87A if applicable) → surcharge (if applicable) → cess.",
  },
  {
    q: "What if I have capital gains?",
    a: "Compute capital gains separately using their own rules/rates; don’t treat them as plain salary slab income.",
  },
  {
    q: "Does employer declaration lock my final choice?",
    a: "Often it affects TDS during the year, but the final choice may be made at filing time. Confirm rules for your case.",
  },
  {
    q: "What deductions are common in old regime?",
    a: "80C, 80D, home loan interest (24(b)), HRA exemption, NPS (80CCD(1B)), and others subject to conditions.",
  },
];

export default function OldVsNewRegimeGuideFY2526() {
  const toc = [
    { id: "calculator", label: "Live calculator" },
    { id: "how-to-decide", label: "How to decide (2-minute method)" },
    { id: "comparison", label: "Side-by-side comparison" },
    { id: "examples", label: "Examples by salary" },
    { id: "checklist", label: "Proof checklist" },
    { id: "faq", label: "FAQs" },
  ];

  return (
    <LearnArticleLayout
      toc={toc}
      asideNote="Use the calculator for the exact number."
    >
      <div className="min-w-0 space-y-12">
        <Section
          id="calculator"
          title="Old vs new tax regime calculator (embedded)"
        >
          <p className="mb-4 text-sm text-slate-600">
            This is the advantage vs text-only articles: run{" "}
            <strong>old new tax regime 2026</strong> numbers here with your
            deductions, then keep reading the examples below.
          </p>
          <TaxRegimeLearnEmbed />
        </Section>

        <Section id="how-to-decide" title="How to decide (2-minute method)">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
              <li>
                Write your annual salary components (basic, HRA, allowances) and
                other income (interest, capital gains).
              </li>
              <li>
                List deductions/exemptions you can actually claim with proofs
                (80C, 80D, HRA, 24(b), NPS).
              </li>
              <li>
                Compute tax under both regimes using the same income, then apply
                rebate/surcharge/cess.
              </li>
              <li>
                Pick the lower tax (and consider effort: proof collection +
                complexity).
              </li>
            </ol>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/calculators?calc=tax-regime"
                className="rounded-xl bg-[#534AB7] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
              >
                Compare both regimes in calculator →
              </Link>
              <Link
                href="/learn/know-taxation-in-india-old-vs-new-slabs-interest-rates"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Read tax basics (FY vs AY, ITR, TDS) →
              </Link>
            </div>
          </div>
        </Section>

        <Section
          id="comparison"
          title="Old vs new regime — side-by-side comparison"
        >
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Feature</th>
                  <th className="px-4 py-3 font-semibold">Old regime</th>
                  <th className="px-4 py-3 font-semibold">New regime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    Deductions/exemptions
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    More allowed (subject to conditions)
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    Fewer allowed (simpler)
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    HRA benefit
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    Can apply if eligible
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    Typically not applicable
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    Proof burden
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    Higher (rent receipts, policy docs, etc.)
                  </td>
                  <td className="px-4 py-3 text-slate-700">Lower</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    Who it suits (often)
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    People with meaningful eligible deductions
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    People with few deductions
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section
          id="examples"
          title="Examples (how the decision changes by salary)"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">
                ₹10L salary — common pivot point
              </div>
              <p className="mt-2 text-sm text-slate-700">
                If you claim HRA + 80C + 80D (and/or home loan interest), old
                regime often becomes competitive. If deductions are minimal, new
                regime often wins.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">
                ₹15L+ salary
              </div>
              <p className="mt-2 text-sm text-slate-700">
                Compare full tax and watch surcharge bands. Keep capital gains
                separate; don’t mix them into salary slabs.
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            For detailed beginner fundamentals (FY vs AY, ITR, AIS/26AS), start
            here:{" "}
            <Link
              href="/learn/know-taxation-in-india-old-vs-new-slabs-interest-rates"
              className="font-semibold text-[#534AB7] hover:underline"
            >
              Indian income tax explained simply →
            </Link>
          </p>
        </Section>

        <Section id="checklist" title="Proof checklist (old regime)">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <ul className="grid list-disc gap-2 pl-5 text-sm text-slate-700 sm:grid-cols-2">
              <li>Form 16 (salary + TDS)</li>
              <li>
                Rent receipts / rental agreement (if claiming HRA exemption)
              </li>
              <li>Life insurance premium / PPF / ELSS proofs (80C)</li>
              <li>Health insurance premium proofs (80D)</li>
              <li>Home loan interest certificate (24(b))</li>
              <li>NPS contribution proof (80CCD(1B))</li>
              <li>Bank interest certificates (FD/RD/savings)</li>
              <li>Capital gains statements (if any)</li>
            </ul>
          </div>
        </Section>

        <TaxFaqAccordion faqs={FAQS} />
      </div>
    </LearnArticleLayout>
  );
}
