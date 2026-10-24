import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Link your partner | Finkoin",
  description:
    "Link two Finkoin accounts as one household: a combined report and shared spending, with each of you choosing what to share.",
  path: "/household",
  noindex: true,
});

export default function HouseholdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
