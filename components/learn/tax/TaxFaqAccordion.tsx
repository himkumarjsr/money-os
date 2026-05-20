import LearnFaqAccordion, { type LearnFaq } from "@/components/learn/LearnFaqAccordion";

export type TaxFaq = LearnFaq;

export default function TaxFaqAccordion({ faqs }: { faqs: TaxFaq[] }) {
  return (
    <LearnFaqAccordion
      faqs={faqs}
      subtitle="Clear answers using official Income Tax terminology. Educational guidance only."
      searchPlaceholder="Search (e.g. ITR-1, FY vs AY, 80C)"
    />
  );
}
