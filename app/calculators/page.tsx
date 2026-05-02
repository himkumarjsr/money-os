import type { Metadata } from "next";
import CalculatorsClient from "./CalculatorsClient";
import { getItemById } from "./calculator-config";
import { generatePageMeta } from "@/lib/seo";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://finkoin.com";

const SEO_COPY: Record<
  string,
  {
    title: string;
    description: string;
    keywords: string[];
    faq: Array<{ q: string; a: string }>;
  }
> = {
  sip: {
    title: "SIP Calculator India - Mutual Fund Returns Calculator | Finkoin",
    description:
      "Use Finkoin SIP calculator India to estimate monthly mutual fund returns, total invested amount, and projected wealth over time.",
    keywords: ["SIP calculator India", "mutual fund calculator", "SIP return calculator"],
    faq: [
      {
        q: "What is SIP calculator?",
        a: "A SIP calculator estimates future value of monthly mutual fund investments based on amount, rate and tenure.",
      },
      {
        q: "How is SIP return calculated?",
        a: "It uses a compounding formula with periodic monthly investment, expected annual return and investment duration.",
      },
      {
        q: "Is SIP better than FD?",
        a: "SIP may offer higher long-term growth with market risk while FD offers fixed returns with lower risk.",
      },
    ],
  },
  "tax-regime": {
    title: "Tax Regime Calculator 2026 — Old vs New | Finkoin",
    description:
      "Free India income tax calculator FY 2025-26: salaried, business, freelancer, pensioner, NRI (illustrative), senior citizen. Compare old vs new regime with 80C, 80D, HRA, 80GG, 24(b), 80EEA & missed deduction alerts.",
    keywords: [
      "old vs new tax regime 2026",
      "income tax calculator India 2026",
      "which tax regime is better",
      "tax regime calculator India",
      "new tax regime slab 2026",
      "freelancer tax calculator India",
      "NRI tax calculator India",
      "80GG rent without HRA calculator",
      "80TTA 80TTB calculator",
      "senior citizen income tax calculator",
      "business owner old vs new tax regime",
    ],
    faq: [
      {
        q: "Which tax regime is better for salaried employees in India?",
        a: "It depends on deductions such as 80C, 80D, HRA, and home loan interest. Use the calculator with your actual numbers to compare old vs new regime.",
      },
      {
        q: "Does the new tax regime allow HRA exemption?",
        a: "Typically HRA-related exemptions are tied to the old regime structure in planning tools. This calculator applies HRA only on the old regime side.",
      },
      {
        q: "Can freelancers and business owners use this calculator?",
        a: "Yes — enter business profit and freelance income separately; old regime includes Chapter VI-A entries you qualify for; new regime uses illustrative ₹75k standard deduction only.",
      },
      {
        q: "How are NRIs handled?",
        a: "There is an NRI toggle for context — tax residency and DTAA rules are not modelled in detail; use the results as non-binding illustrations only.",
      },
      {
        q: "Is this calculator official for filing?",
        a: "No — it is an educational estimate using FY 2025-26 illustrative slabs. Confirm with your CA and Form 16.",
      },
    ],
  },
  emi: {
    title: "EMI Calculator - Loan EMI Calculator Online | Finkoin",
    description:
      "Estimate your loan EMI instantly with Finkoin's EMI calculator. Compare monthly installments, interest outgo, and repayment duration.",
    keywords: ["EMI calculator", "loan EMI calculator", "home loan EMI calculator"],
    faq: [
      {
        q: "What is EMI calculator?",
        a: "An EMI calculator estimates monthly loan installments from principal, rate of interest and tenure.",
      },
      {
        q: "How is EMI calculated?",
        a: "EMI is calculated using a reducing-balance formula that factors loan amount, monthly interest rate and months.",
      },
      {
        q: "Can I compare loan options with EMI calculator?",
        a: "Yes, by varying interest rate and tenure you can compare affordability and total interest outgo.",
      },
    ],
  },
  default: {
    title: "Finance Calculators - SIP, EMI, Tax & More | Finkoin",
    description:
      "Explore Finkoin calculators for SIP, EMI, tax planning and personal finance decisions. Fast, free, and easy to use.",
    keywords: ["finance calculators India", "SIP calculator India", "EMI calculator", "income tax calculator India"],
    faq: [
      {
        q: "What calculators are available on Finkoin?",
        a: "Finkoin offers investment, loan, and life-planning calculators including SIP, EMI, PPF, SWP, and more.",
      },
      {
        q: "Are these calculator results exact?",
        a: "They are planning estimates meant for education and comparison, not guaranteed financial advice.",
      },
      {
        q: "Can I use calculators for free?",
        a: "Yes, all calculators are free to use online.",
      },
    ],
  },
};

function getSeoForCalc(calcId?: string) {
  if (!calcId) return SEO_COPY.default;
  return SEO_COPY[calcId] ?? SEO_COPY.default;
}

type PageProps = {
  searchParams?: { calc?: string | string[] };
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const calcParam = Array.isArray(searchParams?.calc) ? searchParams?.calc[0] : searchParams?.calc;
  const activeItem = getItemById(calcParam);
  const seo = getSeoForCalc(activeItem.id);
  const canonical = calcParam ? `/calculators?calc=${calcParam}` : "/calculators";
  return {
    ...generatePageMeta(seo.title, seo.description, seo.keywords),
    alternates: { canonical },
  };
}

export default async function CalculatorsPage({ searchParams }: PageProps) {
  const calc = Array.isArray(searchParams?.calc) ? searchParams?.calc[0] : searchParams?.calc;
  const active = getItemById(calc);
  const seo = getSeoForCalc(active.id);
  const pageUrl = `${siteUrl}/calculators${calc ? `?calc=${calc}` : ""}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: active.title === "SIP" ? "SIP Calculator India" : `${active.title} Calculator`,
        description: seo.description,
        url: pageUrl,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
      },
      {
        "@type": "FAQPage",
        mainEntity: seo.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.a,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CalculatorsClient initialCalcId={active.id} />
    </>
  );
}
