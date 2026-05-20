import type { ReactNode } from "react";
import Link from "next/link";

function Card({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className={id ? "scroll-mt-24" : undefined}>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <div className="mt-3 text-sm leading-relaxed text-slate-700">{children}</div>
      </div>
    </section>
  );
}

export default function CompoundInterestGuide() {
  return (
    <div className="min-w-0 space-y-10 text-slate-800">
      <p className="text-sm text-slate-600 sm:text-base">
        <strong className="font-semibold text-slate-800">Simple interest</strong> pays only on the original principal
        each year. <strong className="font-semibold text-slate-800">Compound</strong> pays on principal{" "}
        <em>and</em> on gains already added — that is the snowball.
      </p>

      <Card id="formula" title="The formula (lump sum, easy version)">
        <p className="mb-4">
          If you put one amount today and leave it to grow at the <em>same</em> yearly rate, a clean approximation is:
        </p>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-900 sm:text-base">
          A = P × (1 + r)<sup className="text-xs">n</sup>
        </div>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <li>
            <strong className="font-semibold text-slate-900">P</strong> = principal (money you invest today)
          </li>
          <li>
            <strong className="font-semibold text-slate-900">r</strong> = yearly return written as a decimal (10% →{" "}
            <span className="font-mono text-xs sm:text-sm">0.10</span>)
          </li>
          <li>
            <strong className="font-semibold text-slate-900">n</strong> = number of years
          </li>
          <li>
            <strong className="font-semibold text-slate-900">A</strong> = amount you end with (rough estimate; real
            life has fees, taxes, and uneven yearly returns)
          </li>
        </ul>
        <p className="mt-4 text-slate-600">
          Banks sometimes compound monthly; the idea is the same: you earn on a growing balance, not only on the first
          rupee.
        </p>
      </Card>

      <Card id="example" title="Tiny example with real numbers">
        <p className="mb-4">
          You invest <strong className="font-semibold text-slate-900">₹10,000</strong> once. Return{" "}
          <strong className="font-semibold text-slate-900">10% per year</strong> (just for maths — not a promise).
        </p>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[280px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-semibold">Year</th>
                <th className="px-3 py-2 font-semibold">Start balance</th>
                <th className="px-3 py-2 font-semibold">10% return</th>
                <th className="px-3 py-2 font-semibold">End balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="px-3 py-2 font-medium text-slate-900">1</td>
                <td className="px-3 py-2">₹10,000</td>
                <td className="px-3 py-2">₹1,000</td>
                <td className="px-3 py-2 font-semibold text-slate-900">₹11,000</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-slate-900">2</td>
                <td className="px-3 py-2">₹11,000</td>
                <td className="px-3 py-2">₹1,100</td>
                <td className="px-3 py-2 font-semibold text-slate-900">₹12,100</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-slate-900">3</td>
                <td className="px-3 py-2">₹12,100</td>
                <td className="px-3 py-2">₹1,210</td>
                <td className="px-3 py-2 font-semibold text-slate-900">₹13,310</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4">
          Check with the formula: ₹10,000 × (1.1)<sup>3</sup> = <strong className="font-semibold text-slate-900">₹13,310</strong>.
          With <em>simple</em> interest you would get only ₹10,000 + 3×₹1,000 = <strong className="font-semibold">₹13,000</strong> — the extra ₹310 is from compounding.
        </p>
      </Card>

      <Card id="mutual-funds" title="How this helps with mutual funds (MFs) — simple picture">
        <ul className="list-disc space-y-3 pl-5">
          <li>
            In a mutual fund, your money buys <strong className="font-semibold text-slate-900">units</strong>. When the
            fund does well, <strong className="font-semibold text-slate-900">NAV (price per unit)</strong> tends to rise
            over long periods (not every year — markets go up and down).
          </li>
          <li>
            If you stay invested, tomorrow’s gain or loss applies to your{" "}
            <strong className="font-semibold text-slate-900">whole current value</strong> — units × NAV — not only on
            the first SIP instalment. That is the same “growth on growth” idea as compound interest, but we usually say{" "}
            <strong className="font-semibold text-slate-900">compounding of returns</strong> (returns are not fixed like
            an FD rate).
          </li>
          <li>
            <strong className="font-semibold text-slate-900">SIP</strong> adds a fresh amount every month, so you keep
            feeding the snowball. Early SIPs get more years of compounding; that is why even small monthly amounts can
            become large over 10–20 years in illustrations (actual results depend on market, fund, and costs).
          </li>
          <li>
            Choosing <strong className="font-semibold text-slate-900">growth option</strong> (instead of taking payouts)
            keeps gains inside the fund so the full corpus can participate in future NAV movement — mentally similar to
            “interest reinvested” in a deposit.
          </li>
        </ul>
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-950 sm:text-sm">
          <strong className="font-semibold">Remember:</strong> mutual funds are market-linked. Past performance does not
          guarantee future returns. Use conservative assumptions for goals, and read scheme documents / risk factors.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card id="rule-72" title="Rule of 72 (quick mental maths)">
          <p>
            About how many years to <em>roughly</em> double money at a steady yearly rate? Divide{" "}
            <strong className="font-semibold text-slate-900">72</strong> by the rate in percent. Example: at ~8% a year,
            72 ÷ 8 ≈ <strong className="font-semibold text-slate-900">9 years</strong> to double. It is an estimate, not exact.
          </p>
        </Card>
        <Card id="habits" title="Three habits that protect compounding">
          <ul className="list-disc space-y-2 pl-5">
            <li>Start as early as you can, even small.</li>
            <li>Avoid stopping SIPs every time the market dips (unless your goal or cash situation really changed).</li>
            <li>Keep costs low — high fees quietly eat the same compounding math in reverse.</li>
          </ul>
        </Card>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <p className="text-sm font-medium text-slate-800">
          Plug in your own SIP amount, return guess, and years in the calculator.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/calculators?calc=sip"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#534AB7] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          >
            Open SIP calculator →
          </Link>
          <Link
            href="/learn/what-is-an-index-fund-and-why-it-beats-most-mutual-funds"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            Index funds explained →
          </Link>
        </div>
      </div>
    </div>
  );
}
