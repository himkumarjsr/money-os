import type { Metadata } from "next";
import { getItemById } from "../calculator-config";
import { generatePageMeta } from "@/lib/seo";

type LayoutProps = {
  children: React.ReactNode;
  params: { id: string };
};

export function generateMetadata({ params }: LayoutProps): Metadata {
  const calc = getItemById(params.id);
  return generatePageMeta(
    `${calc.title} Calculator`,
    calc.blurb,
    [`${calc.title.toLowerCase()} calculator India`, "financial calculators India"],
  );
}

export default function CalculatorIdLayout({ children }: LayoutProps) {
  return children;
}
