import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Refer a Friend | Finkoin",
  description: "Invite friends to Finkoin and earn FK rewards.",
  path: "/refer",
  noindex: true,
});

export default function ReferLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
