import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Leaderboard | Finkoin",
  description: "Monthly FK points leaderboard on Finkoin.",
  path: "/leaderboard",
  noindex: true,
});

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
