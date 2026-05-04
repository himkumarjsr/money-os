import type { Metadata } from "next";
import { generatePageMeta } from "@/lib/seo";

export const metadata: Metadata = generatePageMeta(
  "Your Financial Health Report — Score & Insights | Finkoin",
  "View your financial health score, emergency fund status, insurance gaps, debt ratio, and personalised next steps. Free summary on Finkoin.",
  ["financial health report India", "financial health score", "free financial analysis India"],
  {
    titleMode: "absolute",
    canonicalPath: "/analyse/result",
    openGraphImagePath: "/og/analyse.png",
  },
);

export default function AnalyseResultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
