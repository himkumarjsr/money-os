"use client";

import Link from "next/link";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { trackCta } from "@/lib/gtag";

const TOOLS: Array<{
  id: string;
  label: string;
  href: string;
  icon: AppIconName;
}> = [
  {
    id: "sip",
    label: "SIP",
    href: "/calculators?calc=sip&from=home",
    icon: "trending",
  },
  {
    id: "swp",
    label: "SWP",
    href: "/calculators?calc=swp&from=home",
    icon: "wallet",
  },
  {
    id: "split",
    label: "Split",
    href: "/split?from=home",
    icon: "users",
  },
  {
    id: "tax",
    label: "Tax",
    href: "/calculators/tax-regime-2026?from=home",
    icon: "receipt",
  },
  {
    id: "emi",
    label: "EMI",
    href: "/calculators?calc=emi&from=home",
    icon: "bank",
  },
  {
    id: "portfolio",
    label: "Portfolio",
    href: "/portfolio?from=home",
    icon: "briefcase",
  },
  {
    id: "analyse",
    label: "Analyse",
    href: "/analyse?from=home",
    icon: "chart",
  },
];

/** Full-width quick tools — shown below the home banner on mobile only. */
export default function HomeMobileQuickTools() {
  return (
    <section
      aria-label="Quick tools"
      className="rounded-2xl border border-[#E8E6F0] bg-white/90 px-3 py-3 shadow-sm shadow-indigo-500/5 backdrop-blur-sm"
    >
      <p className="mb-2 text-left text-[11px] font-bold uppercase tracking-wide text-[#9B9A94]">
        Quick tools
      </p>
      <nav className="grid grid-cols-4 gap-1.5">
        {TOOLS.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            onClick={() =>
              trackCta({
                cta_name: t.label,
                cta_location: "home_mobile_quick_tools",
                href: t.href,
              })
            }
            className="flex flex-col items-center gap-1 rounded-xl px-1 py-2 transition hover:bg-[#EEEDFE]/70 active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEEDFE]">
              <AppIcon name={t.icon} size={18} color="#534AB7" />
            </span>
            <span className="text-[11px] font-bold leading-tight text-[#111110]">
              {t.label}
            </span>
          </Link>
        ))}
      </nav>
    </section>
  );
}
