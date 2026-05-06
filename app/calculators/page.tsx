import type { Metadata } from "next";
import { Suspense } from "react";
import CalculatorsClient from "./CalculatorsClient";
import { getItemById } from "./calculator-config";
import { generatePageMeta, SITE_URL } from "@/lib/seo";

const siteUrl = SITE_URL;

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
    title: "Tax Regime Calculator 2026 — Old vs New Regime | Finkoin",
    description:
      "Free tax regime calculator for FY 2025-26. Compare old and new tax regime with all deductions — 80C, HRA, home loan, NPS, education loan. Works for salaried, freelancer, retired. Updated for Budget 2025.",
    keywords: [
      "old vs new tax regime 2026",
      "tax regime calculator 2026",
      "income tax calculator India 2026",
      "which tax regime is better",
      "new tax regime slabs 2026",
      "87A rebate calculator",
      "80C deduction limit 2026",
      "HRA exemption calculator",
      "income tax FY 2025-26",
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
    title: "Free Financial Calculators for India 2026 | Finkoin",
    description:
      "Free calculators for India: Tax regime comparison, SIP returns, emergency fund, term insurance, net worth. Updated for FY 2025-26.",
    keywords: [
      "financial calculator India free",
      "tax calculator India 2026",
      "SIP calculator India",
      "term insurance calculator",
      "net worth calculator India",
    ],
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

  if (!calcParam) {
    return {
      title: { absolute: "Free Financial Calculators for India 2026 | Finkoin" },
      description: seo.description,
      keywords: seo.keywords,
      alternates: { canonical: "/calculators" },
      openGraph: {
        title: "Free Financial Calculators for India 2026 | Finkoin",
        description: seo.description,
        url: `${siteUrl}/calculators`,
        siteName: "Finkoin",
        type: "website",
        images: [{ url: `${siteUrl}/og/home.png`, width: 1200, height: 630, alt: "Finkoin calculators" }],
      },
      twitter: {
        card: "summary_large_image",
        title: "Free Financial Calculators for India 2026 | Finkoin",
        description: seo.description,
        images: [`${siteUrl}/og/home.png`],
      },
    };
  }

  if (activeItem.id === "tax-regime") {
    return {
      title: { absolute: "Tax Regime Calculator 2026 — Old vs New Regime | Finkoin" },
      description: seo.description,
      keywords: seo.keywords,
      alternates: { canonical: "/calculators/tax-regime-2026" },
      openGraph: {
        title: "Tax Regime Calculator 2026 — Old vs New | Finkoin",
        description: "Free. Compare old and new tax regime. All deductions included.",
        url: `${siteUrl}/calculators/tax-regime-2026`,
        siteName: "Finkoin",
        type: "website",
        images: [
          {
            url: `${siteUrl}/og/tax-calculator.png`,
            width: 1200,
            height: 630,
            alt: "Finkoin tax regime calculator",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: "Tax Regime Calculator 2026 — Old vs New | Finkoin",
        description: "Free. Compare old and new tax regime. All deductions included.",
        images: [`${siteUrl}/og/tax-calculator.png`],
      },
    };
  }

  return {
    ...generatePageMeta(seo.title, seo.description, seo.keywords, {
      titleMode: "absolute",
      canonicalPath: `/calculators?calc=${encodeURIComponent(calcParam)}`,
      openGraphImagePath: "/og/home.png",
    }),
  };
}

export default async function CalculatorsPage({ searchParams }: PageProps) {
  const calc = Array.isArray(searchParams?.calc) ? searchParams?.calc[0] : searchParams?.calc;
  const active = getItemById(calc);
  const seo = getSeoForCalc(active.id);
  const pageUrl =
    active.id === "tax-regime"
      ? `${siteUrl}/calculators/tax-regime-2026`
      : `${siteUrl}/calculators${calc ? `?calc=${calc}` : ""}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      active.id === "tax-regime"
        ? {
            "@type": "WebApplication",
            name: "Finkoin Tax Regime Calculator 2026",
            description: "Free calculator to compare old and new tax regime for FY 2025-26",
            url: pageUrl,
            applicationCategory: "FinanceApplication",
            operatingSystem: "Web",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "INR",
            },
            featureList: [
              "Old vs New tax regime comparison",
              "All deductions: 80C, HRA, NPS, home loan",
              "Works for salaried, freelancer, retired",
              "FY 2025-26 slabs",
            ],
          }
        : {
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
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center bg-white text-sm text-slate-600">
            Loading calculators…
          </div>
        }
      >
        <CalculatorsClient initialCalcId={active.id} />
      </Suspense>
    </>
  );
}
