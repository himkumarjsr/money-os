import Link from "next/link";
import type { CalcGuide } from "@/app/calculators/calculator-guides";

/** Server-rendered explainer under a calculator: how it works, formula, worked example, table, tips. */
export default function CalculatorGuide({
  guide,
  appName,
}: {
  guide: CalcGuide;
  appName: string;
}) {
  return (
    <section
      aria-labelledby="calc-guide"
      className="mx-auto mt-10 max-w-3xl px-4 text-slate-700 sm:px-6"
    >
      <h2 id="calc-guide" className="text-lg font-semibold text-slate-900">
        How the {appName} works
      </h2>
      {guide.howItWorks.map((p) => (
        <p key={p} className="mt-2 text-sm leading-relaxed sm:text-base">
          {p}
        </p>
      ))}

      {guide.formula ? (
        <>
          <h3 className="mt-6 font-semibold text-slate-900">Formula</h3>
          <p className="mt-2 rounded-xl bg-slate-50 px-4 py-3 font-mono text-sm text-slate-900">
            {guide.formula.expression}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {guide.formula.legend.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </>
      ) : null}

      <h3 className="mt-6 font-semibold text-slate-900">
        Worked example: {guide.example.title}
      </h3>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
        {guide.example.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>

      {guide.table ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left text-sm">
            <caption className="mb-2 text-left font-semibold text-slate-900">
              {guide.table.caption}
            </caption>
            <thead>
              <tr>
                {guide.table.head.map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-900"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guide.table.rows.map((row) => (
                <tr key={row.join("|")}>
                  {row.map((cell, i) => (
                    <td
                      key={`${i}-${cell}`}
                      className="border-b border-slate-100 px-3 py-2 tabular-nums"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-500">
            Illustrative, assuming a constant rate. Actual returns and rates
            vary.
          </p>
        </div>
      ) : null}

      <h3 className="mt-6 font-semibold text-slate-900">Tips</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed sm:text-base">
        {guide.tips.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      <p className="mt-6 rounded-xl bg-[#EEEDFE] px-4 py-3 text-sm text-slate-800">
        Want to know if your whole plan is on track?{" "}
        <Link
          href="/analyse"
          className="font-semibold text-[#534AB7] hover:underline"
        >
          Get your free money score
        </Link>{" "}
        in about two minutes. No PAN, no Aadhaar.
      </p>
    </section>
  );
}
