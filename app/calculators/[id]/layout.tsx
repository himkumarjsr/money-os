import type { Metadata } from "next";
import { getItemById } from "../calculator-config";
import { getOgImagePathForCalc } from "../calculator-seo";
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
    [
      `${calc.title.toLowerCase()} calculator India`,
      "financial calculators India",
    ],
    {
      canonicalPath: `/calculators/${params.id}`,
      openGraphImagePath: getOgImagePathForCalc(params.id),
    },
  );
}

export default function CalculatorIdLayout({ children }: LayoutProps) {
  return children;
}
