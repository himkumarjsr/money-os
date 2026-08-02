"use client";

import dynamic from "next/dynamic";
import LearnToolEmbed from "./LearnToolEmbed";

const EmergencyFundCalculator = dynamic(
  () =>
    import("@/components/calculators/EmergencyFundCalculator").then((m) => ({
      default: m.EmergencyFundCalculator,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="py-8 text-center text-sm text-[#9B9A94]">
        Loading calculator…
      </div>
    ),
  },
);

export default function EmergencyFundLearnEmbed() {
  return (
    <LearnToolEmbed
      title="Emergency fund calculator — India"
      subtitle="How much buffer do you need? Adjust expenses and life stage for your number."
      fullToolHref="/calculators/emergency"
      fullToolLabel="Open full emergency calculator →"
    >
      <EmergencyFundCalculator />
    </LearnToolEmbed>
  );
}
