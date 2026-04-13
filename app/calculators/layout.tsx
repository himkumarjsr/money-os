import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Finance Calculators - SIP, EMI, Tax & More | Finkoin",
  description:
    "Explore free finance calculators for SIP, EMI, tax planning, home loans and more. Make smarter money decisions with Finkoin.",
  keywords: [
    "SIP calculator India",
    "EMI calculator",
    "Income tax calculator India",
    "financial calculators India",
  ],
  alternates: {
    canonical: "/calculators",
  },
};

export default function CalculatorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
