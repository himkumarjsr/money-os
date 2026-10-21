import Link from "next/link";
import { CATEGORIES } from "@/app/calculators/calculator-config";
import {
  INDEXABLE_CALC_IDS,
  getSeoForCalc,
} from "@/app/calculators/calculator-seo";

/**
 * Server-rendered links to every calculator page, grouped by category.
 * The in-app picker uses buttons, which crawlers cannot follow, so this is
 * how search engines discover each /calculators/[id] page from the site itself.
 */
export default function AllCalculatorsLinks({
  currentId,
}: {
  currentId?: string;
}) {
  return (
    <nav
      aria-labelledby="all-calculators"
      className="mx-auto mt-10 max-w-3xl px-4 text-slate-700 sm:px-6"
    >
      <h2 id="all-calculators" className="text-lg font-semibold text-slate-900">
        All calculators
      </h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        {CATEGORIES.map((cat) => {
          // tax-regime lives at its own route, /calculators/tax-regime-2026.
          const items = cat.items.filter(
            (i) => i.id === "tax-regime" || INDEXABLE_CALC_IDS.includes(i.id),
          );
          if (items.length === 0) return null;
          return (
            <div key={cat.id}>
              <h3 className="text-sm font-semibold text-slate-900">
                {cat.label}
              </h3>
              <ul className="mt-2 space-y-1 text-sm">
                {items.map((item) => {
                  const seo = getSeoForCalc(item.id);
                  return (
                    <li key={item.id}>
                      {item.id === currentId ? (
                        <span className="text-slate-500">{seo.appName}</span>
                      ) : (
                        <Link
                          href={seo.path}
                          className="text-[#534AB7] hover:underline"
                        >
                          {seo.appName}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
