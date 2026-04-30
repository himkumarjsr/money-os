import type { Metadata } from "next";
import { generatePageMeta } from "@/lib/seo";

export const metadata: Metadata = generatePageMeta(
  "Your Financial Health Report",
  "View your financial health score, emergency fund status, insurance gaps, and your personalised fix plan.",
  ["financial health report", "financial score"],
);

export default function AnalyseResultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
