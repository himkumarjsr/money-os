import type { Metadata } from "next";
import { generatePageMeta } from "@/lib/seo";

export const metadata: Metadata = generatePageMeta(
  "Money Optimizer — Where to Put Every Rupee",
  "See exactly where to invest your monthly surplus. Emergency layers, insurance strategy, debt acceleration, and SIP allocation.",
  ["money optimizer India", "where to invest salary India"],
);

export default function OptimizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
