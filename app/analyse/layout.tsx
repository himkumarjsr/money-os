import type { Metadata } from "next";
import { generatePageMeta } from "@/lib/seo";

export const metadata: Metadata = generatePageMeta(
  "Financial Health Analysis — Analyse Your Finances",
  "Enter your income, expenses, loans, and savings to get your complete financial health report with personalised recommendations.",
  ["financial analysis India", "budget analysis"],
);

export default function AnalyseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
