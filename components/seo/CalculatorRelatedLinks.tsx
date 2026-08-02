import Link from "next/link";

export type RelatedLink = {
  href: string;
  title: string;
  desc: string;
};

const DEFAULT_LINKS: RelatedLink[] = [
  {
    href: "/calculators/sip",
    title: "SIP Calculator India",
    desc: "Plan monthly mutual fund investments",
  },
  {
    href: "/calculators/tax-regime-2026",
    title: "Old vs New Tax Regime Calculator",
    desc: "Compare tax savings for FY 2025-26",
  },
  {
    href: "/analyse",
    title: "Financial Health Check",
    desc: "Free score — Know it. Fix it. Grow it.",
  },
  {
    href: "/learn/section-80c-limits-and-beyond",
    title: "Section 80C guide",
    desc: "Tax-saving deductions explained",
  },
];

export default function CalculatorRelatedLinks({
  links = DEFAULT_LINKS,
}: {
  links?: RelatedLink[];
}) {
  return (
    <aside className="mx-auto mt-8 max-w-3xl rounded-2xl bg-[#F7F7F4] p-5">
      <div className="mb-3.5 text-[15px] font-bold text-[#111110]">
        Related tools & guides
      </div>
      <div className="flex flex-col gap-2.5">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-[10px] border border-[#E8E6F0] bg-white px-3.5 py-3 no-underline"
          >
            <div className="mb-0.5 text-[13px] font-bold text-[#534AB7]">
              {link.title}
            </div>
            <div className="text-[11px] text-[#9B9A94]">{link.desc}</div>
          </Link>
        ))}
      </div>
    </aside>
  );
}
