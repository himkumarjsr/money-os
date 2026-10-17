import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Insurance | Finkoin",
  description: "Your insurance cover on Finkoin.",
  path: "/insurance",
  noindex: true,
});

export default function InsuranceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
