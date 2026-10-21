import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Simple Calculator Online - Free | Finkoin",
  description:
    "A quick, free online calculator for everyday sums. For money maths, try Finkoin’s SIP, EMI, tax and PF calculators.",
  path: "/calculator",
});

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
