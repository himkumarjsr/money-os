import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "My Goals | Finkoin",
  description: "Your goals, the SIP each one needs and the SIPs linked to it.",
  path: "/goals",
  noindex: true,
});

export default function GoalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
