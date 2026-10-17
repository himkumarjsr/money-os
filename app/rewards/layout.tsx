import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Rewards | Finkoin",
  description: "Your FK coins and rewards on Finkoin.",
  path: "/rewards",
  noindex: true,
});

export default function RewardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
