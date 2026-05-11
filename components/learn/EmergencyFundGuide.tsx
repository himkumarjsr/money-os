import type { ReactNode } from "react";
import Link from "next/link";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-slate-700">{children}</div>
    </div>
  );
}

function StageRow({
  stage,
  story,
  months,
}: {
  stage: string;
  story: string;
  months: string;
}) {
  return (
    <tr className="align-top">
      <td className="border-b border-slate-100 px-3 py-3 font-semibold text-slate-900">{stage}</td>
      <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{story}</td>
      <td className="border-b border-slate-100 px-3 py-3 font-semibold text-[#534AB7]">{months}</td>
    </tr>
  );
}

export default function EmergencyFundGuide() {
  return (
    <div className="min-w-0 space-y-10 text-slate-800">
      <p className="text-sm text-slate-600 sm:text-base">
        On this page we use one clear rule: build toward{" "}
        <strong className="font-semibold text-slate-800">up to 12 months</strong> of your family’s{" "}
        <strong className="font-semibold text-slate-800">essential</strong> (must-pay) expenses — not holidays or
        discretionary spends. That is the <strong className="font-semibold text-slate-800">maximum target</strong> we
        recommend planning around; many people start lower and increase as life gets heavier.
      </p>

      <Card title="Why an emergency fund is the first money habit">
        <p className="mb-4">
          Job loss, health shocks, urgent travel, or a broken laptop should not force you to sell long-term investments in
          a bad market or swipe a credit card at 30–40% APR. Emergency cash is{" "}
          <strong className="font-semibold text-slate-900">cash-flow insurance</strong> — boring, liquid, and separate
          from SIPs and property.
        </p>
        <p>
          Think of it as the foundation: only after a real buffer exists does it make sense to push hard into risky
          assets or aggressive prepayment elsewhere.
        </p>
      </Card>

      <Card title="What “one month” means (count essentials only)">
        <p className="mb-3">Add up monthly costs you would still pay in a crisis:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Rent or home loan EMI, utilities, groceries, school fees, insurance premiums, minimum loan payments</li>
          <li>Phone, internet, medicine, transport to interviews or work</li>
        </ul>
        <p className="mt-3 text-slate-600">
          Skip dining out, subscriptions you would cancel, and vacation budgets. Your “month” number should feel tight
          but honest.
        </p>
      </Card>

      <section aria-labelledby="life-stages-heading">
        <h2 id="life-stages-heading" className="text-lg font-semibold text-slate-900">
          How many months? Stories by life stage (all cap at 12 months)
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          These are <strong className="font-semibold text-slate-800">planning ranges</strong>, not rules written in law.
          Pick the row that sounds closest to you, then adjust for loans, income volatility, and health.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-semibold">Life stage</th>
                <th className="px-3 py-2 font-semibold">Typical situation</th>
                <th className="px-3 py-2 font-semibold">Target range</th>
              </tr>
            </thead>
            <tbody>
              <StageRow
                stage="Bachelor"
                story="Riya, 24, lives in a PG; parents are not dependent on her salary. Few fixed costs, but a job gap or medical bill should not mean borrowing from friends. She starts small and increases every raise."
                months="3–5 months"
              />
              <StageRow
                stage="About to get married"
                story="Karan is engaged. Wedding spends are planned separately; he still builds emergency cash so a notice period or relocation right after marriage does not touch the wedding corpus or new rent deposit."
                months="4–6 months"
              />
              <StageRow
                stage="Married, no kids"
                story="Anjali and Vikram share rent and goals. If both earn, a leaner buffer can work; if one income pays for two people and EMIs, they steer toward the higher end of the range (still within 12 months max)."
                months="5–8 months"
              />
              <StageRow
                stage="Married + 1 child"
                story="School fees and childcare are non-negotiable each month. A layoff cannot mean ‘we will figure fees later’ — they build closer to the top half of the scale."
                months="7–10 months"
              />
              <StageRow
                stage="Married + 2 children"
                story="Two fee streams, activities, and higher healthcare probability. The household plans toward 9–12 months of essentials as the ceiling."
                months="9–12 months"
              />
              <StageRow
                stage="… + dependents you support (e.g. parents)"
                story="Neha’s parents rely on her for rent supplements and medicines. That is a fixed monthly obligation on top of her own family — she uses the same 12-month cap but aims at the top of her life-stage band."
                months="9–12 months"
              />
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-600 sm:text-sm">
          <strong className="font-semibold text-slate-800">Cap:</strong> on Finkoin Learn we treat{" "}
          <strong className="font-semibold text-slate-800">12 months of essential expenses</strong> as the maximum
          emergency-fund target to plan for in normal situations. Beyond that, extra safety often belongs in{" "}
          <strong className="font-semibold text-slate-800">insurance + diversified investments</strong>, not only in
          cash.
        </p>
      </section>

      <Card title="One rupee example (easy maths)">
        <p className="mb-4">
          Suppose your <strong className="font-semibold text-slate-900">essential</strong> spend is{" "}
          <strong className="font-semibold text-slate-900">₹45,000/month</strong> (rent, food, fees, EMIs you must keep).
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-semibold text-slate-900">6 months</strong> → ₹45,000 × 6 ={" "}
            <strong className="font-semibold text-slate-900">₹2,70,000</strong>
          </li>
          <li>
            <strong className="font-semibold text-slate-900">12 months (max target)</strong> → ₹45,000 × 12 ={" "}
            <strong className="font-semibold text-slate-900">₹5,40,000</strong>
          </li>
        </ul>
        <p className="mt-4 text-slate-600">
          If essentials are ₹80,000/month, 12 months = ₹9,60,000. The multiple is the same idea — only your monthly
          number changes.
        </p>
      </Card>

      <Card title="Where to keep it (India-friendly)">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-semibold text-slate-900">Liquid mutual funds</strong> or{" "}
            <strong className="font-semibold text-slate-900">overnight / money-market style</strong> funds — usually
            redeem in a business day or as per scheme; read the SID for cut-off rules.
          </li>
          <li>
            <strong className="font-semibold text-slate-900">Sweep FD</strong> linked to savings — auto moves surplus to
            FD-like interest with sweep back when needed.
          </li>
          <li>
            A <strong className="font-semibold text-slate-900">separate savings account</strong> you do not use for UPI
            shopping — mental accounting helps.
          </li>
        </ul>
        <p className="mt-4 text-amber-900">
          <strong className="font-semibold">Avoid</strong> for this bucket: direct equity, long lock-in deposits, gold
          you cannot sell quickly, or money buried in illiquid assets.
        </p>
      </Card>

      <Card title="Home loan? Keep EMIs liquid">
        <p>
          Keep at least <strong className="font-semibold text-slate-900">three home loan EMIs</strong> in absolutely
          liquid form even if you prepay aggressively — banks do not pause EMIs because your net worth is in property or
          ELSS.
        </p>
      </Card>

      <Card title="Build and rebuild">
        <ul className="list-disc space-y-2 pl-5">
          <li>Automate a fixed transfer every month until you hit your stage target (up to the 12-month cap).</li>
          <li>After any withdrawal (medical, job gap), <strong className="font-semibold text-slate-900">refill</strong>{" "}
            before raising SIPs again.</li>
          <li>
            Once a year, bump the target if rent, fees, or family size changed — your “month” is not static for 10 years.
          </li>
        </ul>
        <p className="mt-4">
          <Link href="/learn/what-is-compound-interest-and-why-it-changes-everything" className="font-semibold text-[#534AB7] hover:underline">
            Why compounding matters after the buffer is in place →
          </Link>
        </p>
      </Card>

      <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-950 sm:text-sm">
        <strong className="font-semibold">Educational only.</strong> Mutual funds are subject to market risks; read all
        scheme-related documents. This page is not personalised financial advice.
      </div>
    </div>
  );
}
