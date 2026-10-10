import type { Metadata } from "next";
import { getItemById } from "../calculator-config";
import {
  getOgImagePathForCalc,
  resolveCalcIdFromPathSegment,
} from "../calculator-seo";
import { generatePageMeta } from "@/lib/seo";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata(props: LayoutProps): Promise<Metadata> {
  const params = await props.params;
  const calcId = resolveCalcIdFromPathSegment(params.id) ?? params.id;
  const calc = getItemById(calcId);
  return generatePageMeta(
    `${calc.title} Calculator`,
    calc.blurb,
    [
      `${calc.title.toLowerCase()} calculator India`,
      "financial calculators India",
    ],
    {
      canonicalPath: `/calculators/${params.id}`,
      openGraphImagePath: getOgImagePathForCalc(calcId),
    },
  );
}

export default function CalculatorIdLayout({ children }: LayoutProps) {
  return children;
}
