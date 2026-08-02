import Link from "next/link";
import { SITE_URL } from "@/lib/seo";

export type BreadcrumbItem = {
  label: string;
  href: string;
};

type Props = {
  items: BreadcrumbItem[];
};

export default function Breadcrumb({ items }: Props) {
  const allItems = [{ label: "Home", href: "/" }, ...items];

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: allItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      item: `${SITE_URL}${item.href === "/" ? "" : item.href}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[#9B9A94]"
      >
        {allItems.map((item, i) => (
          <span
            key={`${item.href}-${i}`}
            className="inline-flex items-center gap-2"
          >
            {i > 0 ? <span className="text-[#E8E6F0]">/</span> : null}
            {i === allItems.length - 1 ? (
              <span className="font-semibold text-[#534AB7]">{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className="text-[#9B9A94] no-underline hover:text-[#534AB7]"
              >
                {item.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
