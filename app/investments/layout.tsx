import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Investments | Finkoin",
  description: "Your investments on Finkoin.",
  path: "/investments",
  noindex: true,
});

export default function InvestmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
