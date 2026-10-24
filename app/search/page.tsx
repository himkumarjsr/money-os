import type { Metadata } from "next";
import SearchPageClient from "@/components/search/SearchPageClient";
import { buildWebSearchIndex } from "@/lib/siteSearchIndex";

export const metadata: Metadata = {
  title: "Search | Finkoin",
  description:
    "Search Finkoin features, calculators, Learn guides and blog articles.",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const initialQuery = (Array.isArray(q) ? q[0] : q) ?? "";
  return (
    <SearchPageClient
      entries={buildWebSearchIndex()}
      initialQuery={initialQuery}
    />
  );
}
