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

function StatHighlight({
  tone,
  children,
}: {
  tone: "violet" | "emerald" | "amber";
  children: ReactNode;
}) {
  const styles = {
    violet: "border-violet-200 bg-violet-50/90 text-violet-950",
    emerald: "border-emerald-200 bg-emerald-50/90 text-emerald-950",
    amber: "border-amber-200 bg-amber-50/90 text-amber-950",
  }[tone];

  return (
    <div className={`rounded-xl border p-4 text-sm leading-relaxed ${styles}`}>{children}</div>
  );
}

export default function IndexFundGuide() {
  return (
    <div className="min-w-0 space-y-10 text-slate-800">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">
          Investments
        </span>
        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800 ring-1 ring-inset ring-violet-200">
          Index Funds
        </span>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-200">
          SIP
        </span>
      </div>

      <p className="text-sm text-slate-600 sm:text-base">
        An <strong className="font-semibold text-slate-800">index fund</strong> copies a market benchmark like Nifty 50
        instead of trying to beat it. Most active managers fail to outperform after fees — SPIVA data makes that hard to
        ignore. Below: the cricket analogy, how indices work, fee math, where active still has a role, and how to start
        sensibly.
      </p>
      <p className="text-xs text-slate-500">Last updated: May 2026</p>

      <Card id="cricket-analogy" title="The cricket team analogy">
        <p className="mb-4">
          Imagine you want to bet on Indian cricket. You have two choices:
        </p>
        <ul className="mb-4 list-disc space-y-2 pl-5">
          <li>
            <strong className="font-semibold text-slate-900">Option A — the expert:</strong> Hire someone who watches
            every match, studies every player, picks the best 11, and charges you{" "}
            <strong className="font-semibold text-slate-900">₹15,000 per year</strong> for that expertise (like an active
            mutual fund).
          </li>
          <li>
            <strong className="font-semibold text-slate-900">Option B — the BCCI ranking:</strong> Copy whoever is in the
            official top 50 list automatically. Cost:{" "}
            <strong className="font-semibold text-slate-900">₹200 per year</strong> (like an index fund).
          </li>
        </ul>
        <StatHighlight tone="violet">
          <strong className="font-semibold">SPIVA India 2024:</strong>{" "}
          <strong className="font-semibold">81.5%</strong> of active fund managers (the “experts”) picked a worse
          portfolio than simply copying the benchmark index over the period studied. That is exactly the bet index
          investors are making — own the ranking, not the guru.
        </StatHighlight>
      </Card>

      <Card id="what-is-index" title="What is an index?">
        <p className="mb-4">
          An index is just a <strong className="font-semibold text-slate-900">list</strong>.{" "}
          <strong className="font-semibold text-slate-900">Nifty 50</strong> = the top 50 companies on the National Stock
          Exchange of India by free-float market cap. The list changes as companies grow or shrink — TCS replaced a weaker
          name; Zomato entered when it was big enough. No committee “picks winners”; the index is always the current top
          50.
        </p>
        <p className="mb-3 font-medium text-slate-900">Sample weights in Nifty 50 (illustrative):</p>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[280px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-semibold">Company</th>
                <th className="px-3 py-2 font-semibold">Index weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="px-3 py-2">HDFC Bank</td>
                <td className="px-3 py-2 font-medium text-slate-900">11.83%</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Reliance Industries</td>
                <td className="px-3 py-2 font-medium text-slate-900">8.79%</td>
              </tr>
              <tr>
                <td className="px-3 py-2">ICICI Bank</td>
                <td className="px-3 py-2 font-medium text-slate-900">8.21%</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Bharti Airtel</td>
                <td className="px-3 py-2 font-medium text-slate-900">4.56%</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Infosys</td>
                <td className="px-3 py-2 font-medium text-slate-900">3.97%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card id="what-is-index-fund" title="What is an index fund?">
        <p className="mb-4">
          An index fund <strong className="font-semibold text-slate-900">copies the index</strong> — same stocks, same
          proportions. No fund manager picking names; the fund’s job is to track the benchmark as closely as costs allow.
        </p>
        <p className="mb-3">
          When you invest <strong className="font-semibold text-slate-900">₹10,000</strong> in a Nifty 50 index fund,
          roughly:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="font-semibold text-slate-900">₹1,183</strong> goes to HDFC Bank (11.83%)
          </li>
          <li>
            <strong className="font-semibold text-slate-900">₹879</strong> goes to Reliance (8.79%)
          </li>
          <li>
            <strong className="font-semibold text-slate-900">₹821</strong> goes to ICICI Bank (8.21%)
          </li>
          <li>…and so on for the rest of the 50 stocks</li>
        </ul>
        <p className="mt-4 text-slate-600">No research team. No stock-picking mandate. Just copy.</p>
      </Card>

      <Card id="fee-example" title="The chai stall example — fees compound">
        <p className="mb-4">
          <strong className="font-semibold text-slate-900">Rohan</strong> and{" "}
          <strong className="font-semibold text-slate-900">Priya</strong> each invest{" "}
          <strong className="font-semibold text-slate-900">₹5,000/month</strong> for 20 years. The market returns about{" "}
          <strong className="font-semibold text-slate-900">12%</strong> a year before fees.
        </p>
        <ul className="mb-4 list-disc space-y-2 pl-5">
          <li>
            <strong className="font-semibold text-slate-900">Rohan</strong> — popular large-cap active fund, expense ratio{" "}
            <strong className="font-semibold text-slate-900">1.5%/year</strong>. Net ~10.5% after fees → corpus about{" "}
            <strong className="font-semibold text-slate-900">₹38.8 lakh</strong>.
          </li>
          <li>
            <strong className="font-semibold text-slate-900">Priya</strong> — UTI Nifty 50 Index Fund, expense ratio{" "}
            <strong className="font-semibold text-slate-900">0.20%/year</strong>. Net ~11.8% after fees → corpus about{" "}
            <strong className="font-semibold text-slate-900">₹46.3 lakh</strong>.
          </li>
        </ul>
        <StatHighlight tone="emerald">
          <strong className="text-base font-semibold">Difference: ₹7.5 lakh</strong>
          <p className="mt-2">
            Same market, same monthly amount, same 20 years — only fees differ. That gap is what a small expense ratio
            costs you when it compounds for decades (the “chai” the active team drinks every day, metaphorically).
          </p>
        </StatHighlight>
      </Card>

      <Card id="spiva" title="SPIVA — the shocking data">
        <p className="mb-4">
          This is not theory. <strong className="font-semibold text-slate-900">SPIVA India Year-End 2024</strong> is among
          the most cited studies on active vs passive performance in India.
        </p>
        <StatHighlight tone="violet">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-semibold">81.5%</strong> of large-cap active managers failed to beat the Nifty 50
              benchmark in 2024.
            </li>
            <li>
              Over <strong className="font-semibold">5 years</strong>,{" "}
              <strong className="font-semibold">92.9%</strong> of large-cap active funds underperformed their benchmark.
            </li>
            <li>
              Translation: only about <strong className="font-semibold">7 out of 100</strong> active managers beat the
              index over that horizon — and you do not know in advance which seven.
            </li>
          </ul>
        </StatHighlight>
        <p className="mt-4">
          Last year’s chart-topper rarely repeats. Large caps like Reliance, TCS, and HDFC Bank are covered by hundreds of
          analysts globally — “hidden” information is scarce. Index funds ride the market; active funds pay to fight it.
        </p>
      </Card>

      <Card id="expense-ratio" title="Expense ratio — the silent killer">
        <p className="mb-4">
          Every mutual fund charges an annual <strong className="font-semibold text-slate-900">expense ratio</strong>. You
          never write a separate cheque; it is deducted from NAV and quietly reduces your compounding.
        </p>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[300px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-semibold">Fund type</th>
                <th className="px-3 py-2 font-semibold">Typical expense ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="px-3 py-2">UTI Nifty 50 Index (direct)</td>
                <td className="px-3 py-2 font-medium text-slate-900">0.20%</td>
              </tr>
              <tr>
                <td className="px-3 py-2">HDFC Nifty 50 Index (direct)</td>
                <td className="px-3 py-2 font-medium text-slate-900">0.20%</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Average large-cap active</td>
                <td className="px-3 py-2 font-medium text-slate-900">1.5% – 2.0%</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Active flexi-cap</td>
                <td className="px-3 py-2 font-medium text-slate-900">1.0% – 1.8%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 mb-3">
          A <strong className="font-semibold text-slate-900">₹10,000/month SIP</strong> for 30 years at ~12% market return
          (illustrative):
        </p>
        <ul className="mb-4 list-disc space-y-2 pl-5">
          <li>
            <strong className="font-semibold text-slate-900">0.2% expense</strong> (index) → about{" "}
            <strong className="font-semibold text-slate-900">₹3.49 crore</strong>
          </li>
          <li>
            <strong className="font-semibold text-slate-900">1.5% expense</strong> (active) → about{" "}
            <strong className="font-semibold text-slate-900">₹2.79 crore</strong>
          </li>
        </ul>
        <div className="space-y-3">
          <StatHighlight tone="violet">
            <strong className="font-semibold">81.5%</strong> of large-cap active funds underperformed the index in 2024
            (SPIVA) — paying more does not buy you a better odds of winning.
          </StatHighlight>
          <StatHighlight tone="amber">
            <strong className="font-semibold">~₹70 lakh lost to fees</strong> in this 30-year illustration — same market
            return assumption, only expense ratio differs. Over a working lifetime, that gap is enormous for no guaranteed
            extra return.
          </StatHighlight>
        </div>
      </Card>

      <Card id="active-wins" title="Where active funds still win">
        <p className="mb-4">
          Index funds are not perfect for every pocket of the market. SPIVA India{" "}
          <strong className="font-semibold text-slate-900">Mid-Year 2025</strong>: in mid and small cap, only{" "}
          <strong className="font-semibold text-slate-900">34.5%</strong> of active funds underperformed in that window —
          skilled managers can sometimes find less-researched names.
        </p>
        <p className="mb-3">
          A common <strong className="font-semibold text-slate-900">core–satellite</strong> approach for many long-term
          investors:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-semibold text-slate-900">Core (60–70% of equity):</strong> Nifty 50 or broader index
            (e.g. Nifty 500) — boring, low cost, hard to beat in large cap.
          </li>
          <li>
            <strong className="font-semibold text-slate-900">Satellite (30–40%):</strong> carefully chosen mid/small-cap
            active funds only if you accept higher volatility and can judge a long track record.
          </li>
        </ul>
      </Card>

      <Card id="how-to-start" title="How to start">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Minimum: many index funds allow SIP from about{" "}
            <strong className="font-semibold text-slate-900">₹500/month</strong> (scheme rules vary).
          </li>
          <li>
            <strong className="font-semibold text-slate-900">Examples to research</strong> (educational, not a
            recommendation): UTI Nifty 50 Index Fund Direct (~0.20% expense, large AUM); HDFC Nifty 50 Index Fund Direct
            (~0.20%, min SIP can be as low as ₹100 on some platforms).
          </li>
          <li>
            Platforms: <strong className="font-semibold text-slate-900">Groww</strong>,{" "}
            <strong className="font-semibold text-slate-900">Zerodha Coin</strong>,{" "}
            <strong className="font-semibold text-slate-900">Kuvera</strong> — use{" "}
            <strong className="font-semibold text-slate-900">DIRECT</strong> plans only.
          </li>
          <li>
            <strong className="font-semibold text-slate-900">Regular</strong> plans pay distributor commission (~0.5–1%
            extra from your returns every year). Over 20 years that is lakhs lost vs direct.
          </li>
        </ul>
      </Card>

      <Card id="taxes" title="Taxes on index funds">
        <p className="mb-3">Index funds are taxed like other equity mutual funds (rules as commonly understood in 2026):</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Held <strong className="font-semibold text-slate-900">less than 1 year</strong> — STCG:{" "}
            <strong className="font-semibold text-slate-900">20%</strong>
          </li>
          <li>
            Held <strong className="font-semibold text-slate-900">more than 1 year</strong> — LTCG:{" "}
            <strong className="font-semibold text-slate-900">12.5%</strong>
          </li>
          <li>
            First <strong className="font-semibold text-slate-900">₹1.25 lakh</strong> of LTCG in a year:{" "}
            <strong className="font-semibold text-slate-900">tax-free</strong> (subject to current law)
          </li>
        </ul>
        <p className="mt-4 text-slate-600">For long goals, holding beyond one year avoids unnecessary STCG and lets compounding run.</p>
      </Card>

      <Card id="myths" title="Common myths busted">
        <ul className="space-y-4">
          <li>
            <strong className="font-semibold text-slate-900">Myth 1: “Index funds only give average returns.”</strong>
            <p className="mt-1 text-slate-700">
              “Average” here means the top 50 Indian companies compounding for decades — Nifty 50 has delivered roughly{" "}
              <strong className="font-semibold text-slate-900">~12% CAGR</strong> since inception in many long-window
              studies (not a promise for the future).
            </p>
          </li>
          <li>
            <strong className="font-semibold text-slate-900">Myth 2: “Wait for a crash, then buy.”</strong>
            <p className="mt-1 text-slate-700">
              Time in the market usually beats timing. Start SIP today; you automatically buy more units when prices dip.
            </p>
          </li>
          <li>
            <strong className="font-semibold text-slate-900">Myth 3: “Active funds protect you in crashes.”</strong>
            <p className="mt-1 text-slate-700">
              Most active large-cap funds fall as much or more than the index in sharp selloffs, then lag on the recovery
              because of fees.
            </p>
          </li>
          <li>
            <strong className="font-semibold text-slate-900">Myth 4: “My fund manager is different.”</strong>
            <p className="mt-1 text-slate-700">
              SPIVA 2024: <strong className="font-semibold text-slate-900">81.5%</strong> of managers underperformed — many
              families heard the same story.
            </p>
          </li>
        </ul>
      </Card>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold text-emerald-950">Summary</h2>
        <p className="mt-2 text-sm text-emerald-900">
          <strong className="font-semibold">Index fund</strong> = own the market’s largest companies cheaply, by copying
          the index.
        </p>
        <p className="mt-3 text-sm font-semibold text-emerald-950">Why it often wins:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-900">
          <li>Lower fees (about 0.20% vs 1.5–2% on many active funds)</li>
          <li>No manager-selection risk or style drift</li>
          <li>SPIVA 2024: 81.5% of large-cap active funds lagged the index in that year</li>
          <li>Simple, transparent, predictable</li>
        </ul>
        <p className="mt-3 text-sm font-semibold text-emerald-950">Best for:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-900">
          <li>Goals 5+ years away, large-cap equity, beginners, anyone who values low cost</li>
        </ul>
        <p className="mt-3 text-sm font-semibold text-emerald-950">Less ideal for:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-900">
          <li>Money needed within ~3 years; mid/small-cap sleeves where active may still add value</li>
        </ul>
        <p className="mt-4 text-sm italic text-emerald-800">The boring choice is often the best choice in investing.</p>
      </div>

      <section aria-labelledby="related-index-fund">
        <h2 id="related-index-fund" className="text-base font-semibold text-slate-900">
          Related articles
        </h2>
        <ul className="mt-4 space-y-3">
          <li>
            <Link
              href="/learn/sip-vs-lumpsum-when-to-use-which"
              className="block rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm font-semibold text-[#534AB7] hover:border-[#534AB7]/40 hover:underline"
            >
              SIP vs lumpsum — when to use which →
            </Link>
          </li>
          <li>
            <Link
              href="/learn/what-is-asset-allocation"
              className="block rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm font-semibold text-[#534AB7] hover:border-[#534AB7]/40 hover:underline"
            >
              What is asset allocation? →
            </Link>
          </li>
          <li>
            <Link
              href="/learn/old-vs-new-tax-regime-which-saves-you-more-money"
              className="block rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm font-semibold text-[#534AB7] hover:border-[#534AB7]/40 hover:underline"
            >
              Old vs New Tax Regime →
            </Link>
          </li>
        </ul>
      </section>

      <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-950 sm:text-sm">
        <strong className="font-semibold">Educational only.</strong> This is not investment advice. Finkoin is not a SEBI-
        registered investment advisor. Consult a qualified financial advisor before investing. Past performance does not
        guarantee future results. Data referenced from SPIVA India 2024, AMFI, and fund factsheets as of 2026 — verify
        current expense ratios and tax rules before you act.
      </div>
    </div>
  );
}
