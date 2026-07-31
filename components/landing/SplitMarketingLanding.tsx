import Link from "next/link";

const FAQS = [
  {
    q: "What is Finkoin Split?",
    a: "A free expense-splitting app for friends, roommates, and trips in India. Create a group, add spends, and see who owes whom — clearly.",
  },
  {
    q: "Is Finkoin Split a Splitwise alternative?",
    a: "Yes. It is built for Indian groups who want simple bill splitting without heavy clutter. Free to start.",
  },
  {
    q: "Can I invite friends with a link?",
    a: "Yes. Create a group, share an invite link, and members can join and add expenses together.",
  },
  {
    q: "Do I need to pay to split bills?",
    a: "No. Core splitting on Finkoin Split is free.",
  },
] as const;

const FEATURES = [
  {
    t: "Groups for trips & flatmates",
    d: "One space per trip, PG, or friend circle — keep balances tidy.",
  },
  {
    t: "Add expenses in seconds",
    d: "Log who paid, split equally or your way, and move on.",
  },
  {
    t: "Clear settle-up view",
    d: "See simplified debts so you know exactly who to pay.",
  },
  {
    t: "Invite with a link",
    d: "Friends join without a long setup. Works on mobile.",
  },
] as const;

const SIGNUP_HREF = "/login?redirect=%2Fsplit&mode=signup";
const LOGIN_HREF = "/login?redirect=%2Fsplit";

export default function SplitMarketingLanding() {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-gradient-to-b from-indigo-50 via-[#F4F2FC] to-violet-50/80 text-slate-900 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-48 h-72 w-72 rounded-full bg-indigo-400/15 blur-3xl"
      />

      <section className="relative mx-auto max-w-3xl px-4 pb-14 pt-10 text-center sm:px-6 sm:pb-20 sm:pt-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#534AB7]">
          Finkoin Split
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#1a1824] sm:text-5xl sm:leading-[1.1]">
          Split expenses with friends — simply
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Free group expense tracker for India. Trips, flatmates, dinners —
          track who paid, who owes, and settle without awkward maths. A clean
          Splitwise-style alternative.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={SIGNUP_HREF}
            className="inline-flex min-h-12 w-full max-w-xs items-center justify-center rounded-full bg-[#534AB7] px-6 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(83,74,183,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(83,74,183,0.45)] sm:w-auto"
          >
            Create free Split account
          </Link>
          <Link
            href={LOGIN_HREF}
            className="inline-flex min-h-12 w-full max-w-xs items-center justify-center rounded-full border border-[#534AB7]/25 bg-white/70 px-6 text-sm font-semibold text-[#534AB7] backdrop-blur-sm transition hover:bg-white sm:w-auto"
          >
            Log in
          </Link>
        </div>
        <p className="mt-4 text-xs font-medium text-slate-500">
          Free forever for core splitting · Mobile-friendly · Made for India
        </p>
      </section>

      <section className="relative mx-auto max-w-4xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-[#1a1824]">
          Why people use Finkoin Split
        </h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li key={f.t} className="text-left">
              <h3 className="text-lg font-semibold text-[#534AB7]">{f.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {f.d}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative mx-auto mt-16 max-w-3xl px-4 sm:mt-20 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-[#1a1824]">
          How Split works
        </h2>
        <ol className="mt-8 space-y-8 text-left">
          {[
            {
              n: "1",
              t: "Create a group",
              d: "Name it for a trip, flat, or weekend outing.",
            },
            {
              n: "2",
              t: "Invite friends",
              d: "Share a link — they join and can add expenses too.",
            },
            {
              n: "3",
              t: "Add spends & settle",
              d: "See balances and settle up when the trip ends.",
            },
          ].map((s) => (
            <li key={s.n} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#534AB7] text-sm font-bold text-white">
                {s.n}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-[#1a1824]">{s.t}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {s.d}
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
          Split the next bill the easy way
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Sign up free and create your first Finkoin Split group in under a
          minute.
        </p>
        <Link
          href={SIGNUP_HREF}
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#534AB7] px-8 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(83,74,183,0.35)] transition hover:-translate-y-0.5"
        >
          Create free Split account
        </Link>
        <p className="mt-4 text-xs text-slate-500">
          Also try{" "}
          <Link href="/analyse" className="font-semibold text-[#534AB7]">
            financial health check
          </Link>
          {" · "}
          <Link
            href="/calculators/emi"
            className="font-semibold text-[#534AB7]"
          >
            EMI calculator
          </Link>
        </p>
      </section>
    </div>
  );
}
