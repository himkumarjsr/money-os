import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Finkoin Plans - Free and Premium",
  description:
    "Compare Finkoin’s Free and Premium plans and what each one includes. Start free, no PAN or Aadhaar needed.",
  path: "/plans",
});

export default function PlansLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
