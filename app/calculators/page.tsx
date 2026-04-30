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
  const calc = Array.isArray(searchParams?.calc) ? searchParams?.calc[0] : searchParams?.calc;
  const canonical = calc ? `/calculators?calc=${calc}` : "/calculators";
  return {
    ...generatePageMeta(
      "Free Financial Calculators for India",
      "SIP calculator, EMI calculator, PPF calculator, home loan calculator, emergency fund calculator and more. All free.",
      ["financial calculators India", "SIP calculator", "EMI calculator", "PPF calculator", "home loan calculator"],
    ),
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
