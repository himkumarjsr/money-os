import type { Metadata } from "next";
import { generatePageMeta } from "@/lib/seo";

export const metadata: Metadata = generatePageMeta(
  "ITR Auto-fill — Upload Form 16",
  "Upload Form 16, AIS or salary slips. Finkoin extracts tax numbers in memory, discards the files, and pre-fills your FY 2025-26 tax comparison.",
  [
    "ITR auto fill",
    "Form 16 upload",
    "income tax calculator India",
    "old vs new tax regime",
  ],
  { canonicalPath: "/tax" },
);

export default function TaxLayout({ children }: { children: React.ReactNode }) {
  return children;
}
