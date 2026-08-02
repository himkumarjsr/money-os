import Link from "next/link";
import SipCroreCalculatorEmbed from "@/components/learn/tools/SipCroreCalculatorEmbed";

function Card({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={id ? "scroll-mt-24" : undefined}>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
          {children}
        </div>
      </div>
    </section>
  );
}

export default function SipCroreGuide() {
  return (
    <div className="min-w-0 space-y-8 text-slate-800">
      <p className="text-sm text-slate-600 sm:text-base">
        Searching for <strong>sip calculator 1 crore</strong>? Use the live tool
        below, then read how tenure and return assumptions change the monthly
        SIP you need for ₹1 crore in 10, 15, or 20 years.
      </p>

      <SipCroreCalculatorEmbed />

      <Card id="quick-table" title="Quick reference — ₹1 crore at 12% p.a.">
        <p>
          Illustrative monthly SIP (constant 12% expected return, monthly
          compounding). Markets vary — treat as a planning range, not a promise.
        </p>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[280px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2">Horizon</th>
                <th className="px-3 py-2">Approx. monthly SIP</th>
                <th className="px-3 py-2">Total invested</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100">
                <td className="px-3 py-2 font-semibold">10 years</td>
                <td className="px-3 py-2">≈ ₹43,000–45,000</td>
                <td className="px-3 py-2">≈ ₹52–54 lakh</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-3 py-2 font-semibold">15 years</td>
                <td className="px-3 py-2">≈ ₹21,000–23,000</td>
                <td className="px-3 py-2">≈ ₹38–41 lakh</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-3 py-2 font-semibold">20 years</td>
                <td className="px-3 py-2">≈ ₹12,000–13,000</td>
                <td className="px-3 py-2">≈ ₹29–31 lakh</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          Move the sliders above for your exact rate and goal (₹50 lakh to ₹5
          crore).
        </p>
      </Card>

      <Card id="assumptions" title="Assumptions that change the answer">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Return rate:</strong> Equity SIP planning often uses 10–12%
            long-term; 15% is aggressive. Lower rates need higher SIPs.
          </li>
          <li>
            <strong>Inflation:</strong> ₹1 crore in 20 years buys less than
            today’s ₹1 crore. For lifestyle goals, inflate the target.
          </li>
          <li>
            <strong>Step-up SIP:</strong> Raising SIP 10% yearly can cut the
            starting amount — model that on the{" "}
            <Link
              href="/calculators/sip"
              className="font-semibold text-[#534AB7]"
            >
              full SIP calculator
            </Link>
            .
          </li>
          <li>
            <strong>Taxes & costs:</strong> Equity LTCG and expense ratios
            reduce net corpus vs gross calculator output.
          </li>
        </ul>
      </Card>

      <Card id="how-to-use" title="How to use this for a real plan">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Pick a horizon you can stick to (10 / 15 / 20 years).</li>
          <li>Set a conservative return (e.g. 10–12%).</li>
          <li>
            Note the monthly SIP — check it fits after rent, EMIs, and emergency
            fund.
          </li>
          <li>
            Run a{" "}
            <Link href="/analyse" className="font-semibold text-[#534AB7]">
              Finkoin financial health check
            </Link>{" "}
            so the SIP doesn’t starve insurance or liquidity.
          </li>
        </ol>
      </Card>

      <Card id="related" title="Related Finkoin tools">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <Link
              href="/calculators/sip"
              className="font-semibold text-[#534AB7]"
            >
              SIP calculator India
            </Link>{" "}
            — forward returns from a monthly amount
          </li>
          <li>
            <Link
              href="/calculators/fire"
              className="font-semibold text-[#534AB7]"
            >
              FIRE number calculator
            </Link>{" "}
            — when ₹1 crore is not enough
          </li>
          <li>
            <Link
              href="/learn/sip-vs-lumpsum-when-to-use-which"
              className="font-semibold text-[#534AB7]"
            >
              SIP vs lump sum
            </Link>
          </li>
        </ul>
      </Card>
    </div>
  );
}
