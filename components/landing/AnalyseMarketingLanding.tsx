import Link from "next/link";

const FAQS = [
  {
    q: "What is the Finkoin financial health check?",
    a: "A free 5-minute assessment that scores your emergency fund, insurance cover, debt load, and investing habits — built for Indian salaries, EMIs, and goals.",
  },
  {
    q: "Do I need PAN or Aadhaar?",
    a: "No. Finkoin does not ask for PAN or Aadhaar for the health check.",
  },
  {
    q: "Is it really free?",
    a: "Yes. You can start the core financial health check free. Sign in only when you are ready to save your plan.",
  },
  {
    q: "What do I get after the check?",
    a: "A score out of 100, clear gaps (like emergency fund or term cover), and a practical fix plan you can act on month by month.",
  },
] as const;

const STEPS = [
  {
    n: "1",
    title: "Answer simple money questions",
    body: "Income, EMIs, insurance, and investments — no jargon wall.",
  },
  {
    n: "2",
    title: "Get your health score",
    body: "See what is strong and what needs attention, in plain language.",
  },
  {
    n: "3",
    title: "Follow a fix plan",
    body: "Prioritised actions for India: emergency fund, cover gaps, debt, SIPs.",
  },
] as const;

const SIGNUP_HREF = "/login?redirect=%2Fanalyse&mode=signup";
const LOGIN_HREF = "/login?redirect=%2Fanalyse";

export default function AnalyseMarketingLanding() {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-gradient-to-b from-indigo-50 via-[#F4F2FC] to-violet-50/80 text-slate-900 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-40 h-72 w-72 rounded-full bg-indigo-400/15 blur-3xl"
      />

      <section className="relative mx-auto max-w-3xl px-4 pb-14 pt-10 text-center sm:px-6 sm:pb-20 sm:pt-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#534AB7]">
          Finkoin Analyse
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#1a1824] sm:text-5xl sm:leading-[1.1]">
          Know your financial health score in 5 minutes
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Free check for India — emergency fund, term insurance, debt, and
          investments. No PAN. No Aadhaar. Clear next steps, not a lecture.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={SIGNUP_HREF}
            className="inline-flex min-h-12 w-full max-w-xs items-center justify-center rounded-full bg-[#534AB7] px-6 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(83,74,183,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(83,74,183,0.45)] sm:w-auto"
          >
            Start free health check
          </Link>
          <Link
            href={LOGIN_HREF}
            className="inline-flex min-h-12 w-full max-w-xs items-center justify-center rounded-full border border-[#534AB7]/25 bg-white/70 px-6 text-sm font-semibold text-[#534AB7] backdrop-blur-sm transition hover:bg-white sm:w-auto"
          >
            Log in
          </Link>
        </div>
        <p className="mt-4 text-xs font-medium text-slate-500">
          Free to start · Built for Indian salaries & EMIs · Takes ~5 minutes
        </p>
      </section>

      <section className="relative mx-auto max-w-4xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-[#1a1824]">
          What Finkoin checks
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-slate-600">
          Four pillars that decide whether your money plan is resilient.
        </p>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2">
          {[
            {
              t: "Emergency fund",
              d: "Are you covered for 3–12 months of essentials if income pauses?",
            },
            {
              t: "Term insurance",
              d: "Is your cover enough for dependents — or is there a silent gap?",
            },
            {
              t: "Debt load",
              d: "EMIs and credit stress vs income — what is sustainable.",
            },
            {
              t: "Investing habits",
              d: "SIPs and long-term savings vs lifestyle leak.",
            },
          ].map((item) => (
            <li key={item.t} className="text-left">
              <h3 className="text-lg font-semibold text-[#534AB7]">{item.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {item.d}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative mx-auto mt-16 max-w-3xl px-4 sm:mt-20 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-[#1a1824]">
          How it works
        </h2>
        <ol className="mt-8 space-y-8">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4 text-left">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#534AB7] text-sm font-bold text-white">
                {s.n}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-[#1a1824]">
                  {s.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="relative mx-auto mt-16 max-w-3xl px-4 sm:mt-20 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-[#1a1824]">
          Common questions
        </h2>
        <dl className="mt-8 space-y-6 text-left">
          {FAQS.map((f) => (
            <div key={f.q}>
              <dt className="text-base font-semibold text-[#1a1824]">{f.q}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {f.a}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="relative mx-auto mt-16 max-w-2xl px-4 pb-8 text-center sm:mt-20 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-[#1a1824]">
          Ready for your score?
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Create a free Finkoin account and start the financial health check.
        </p>
        <Link
          href={SIGNUP_HREF}
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#534AB7] px-8 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(83,74,183,0.35)] transition hover:-translate-y-0.5"
        >
          Start free health check
        </Link>
        <p className="mt-4 text-xs text-slate-500">
          Also explore{" "}
          <Link
            href="/calculators/sip"
            className="font-semibold text-[#534AB7]"
          >
            SIP calculator
          </Link>
          {" · "}
          <Link href="/split" className="font-semibold text-[#534AB7]">
            Finkoin Split
          </Link>
        </p>
      </section>
    </div>
  );
}
