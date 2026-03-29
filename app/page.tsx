import { ButtonLink } from "@/components/ui/button";
import Link from "next/link";

const features = [
  {
    title: "Free financial health check — takes 3 minutes",
    body: "Answer a short questionnaire and see a clear snapshot of spending, savings, and risk areas — no paperwork.",
  },
  {
    title: "15+ financial calculators — SIP, EMI, PPF and more",
    body: "Plan investments, loans, tax-saving instruments, and retirement with calculators tuned for Indian rules and rates.",
  },
  {
    title: "AI fix plan — exact steps to fix your finances (Advisor ₹49/mo)",
    body: "Go beyond generic tips: get a sequenced action list you can follow week by week. Upgrade when you want human review.",
  },
] as const;

const testimonials = [
  {
    quote:
      "The health check spelled out what I was ignoring — overspending on UPI and no emergency fund. The fix list felt doable.",
    name: "Ananya Krishnan",
    city: "Bengaluru",
    role: "Product designer",
  },
  {
    quote:
      "I use the SIP and EMI calculators before every decision. Finally one place that doesn’t push random products on me.",
    name: "Rohit Verma",
    city: "Pune",
    role: "IT consultant",
  },
] as const;

const pricing = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Financial health check, calculators, and basic guidance.",
    cta: { label: "Start free", href: "/analyse", highlight: false },
  },
  {
    name: "Advisor",
    price: "₹49",
    period: "/mo",
    description: "AI fix plan plus optional chat with a qualified advisor for clarifications.",
    cta: { label: "Get Advisor", href: "/pricing", highlight: true },
  },
  {
    name: "MoneyOS",
    price: "₹99",
    period: "/mo",
    description: "Full workspace: goals, automations, exports, and priority support.",
    cta: { label: "See MoneyOS", href: "/pricing", highlight: false },
  },
] as const;

const footerLinks = [
  { label: "Calculators", href: "/calculators" },
  { label: "Learn Finance", href: "/learn" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-white text-slate-900 antialiased">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-slate-900 no-underline"
          >
            MoneyOS
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
            <Link
              href="/calculators"
              className="hidden hover:text-slate-900 sm:inline"
            >
              Calculators
            </Link>
            <Link
              href="/analyse"
              className="rounded-lg bg-[#534AB7] px-4 py-2 text-white hover:bg-[#44399a]"
            >
              Check health
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="border-b border-slate-100 bg-white px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl sm:leading-tight md:text-5xl md:leading-[1.1]">
              Know exactly where your money is going — and what to do about it
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
              India&apos;s only financial app that tells you what&apos;s wrong
              AND gives you the exact fix
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:mt-10">
              <ButtonLink
                href="/analyse"
                variant="primary"
                size="lg"
                className="w-full max-w-md shadow-none sm:w-auto"
              >
                Check my financial health — free
              </ButtonLink>
              <div
                className="flex flex-col items-center gap-3 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-2"
                role="list"
              >
                <span role="listitem" className="whitespace-nowrap">
                  10,000+ users
                </span>
                <span
                  className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline"
                  aria-hidden
                />
                <span role="listitem" className="whitespace-nowrap">
                  No credit card needed
                </span>
                <span
                  className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline"
                  aria-hidden
                />
                <span role="listitem" className="whitespace-nowrap">
                  Made in India
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-100 bg-white px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-slate-500">
              What you get
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-center text-xl font-semibold text-slate-900 sm:text-2xl">
              Everything to see the problem, then fix it
            </p>
            <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
              {features.map((f) => (
                <li
                  key={f.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
                >
                  <h3 className="text-lg font-semibold leading-snug text-slate-900">
                    {f.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-[0.9375rem]">
                    {f.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-b border-slate-100 bg-white px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-slate-500">
              Loved by Indians building better money habits
            </h2>
            <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
              {testimonials.map((t) => (
                <li
                  key={t.name}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
                >
                  <p className="flex-1 text-sm leading-relaxed text-slate-700 sm:text-[0.9375rem]">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-5 border-t border-slate-100 pt-5">
                    <p className="font-semibold text-slate-900">{t.name}</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {t.role} · {t.city}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-b border-slate-100 bg-white px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-slate-500">
              Pricing
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-xl font-semibold text-slate-900 sm:text-2xl">
              Start free. Upgrade when you want a human in the loop.
            </p>
            <ul className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
              {pricing.map((tier) => (
                <li
                  key={tier.name}
                  className={`flex flex-col rounded-2xl border bg-white p-6 sm:p-7 ${
                    tier.cta.highlight
                      ? "border-[#534AB7] ring-1 ring-[#534AB7]"
                      : "border-slate-200"
                  }`}
                >
                  <p className="text-sm font-medium text-slate-500">
                    {tier.name}
                  </p>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tracking-tight text-slate-900">
                      {tier.price}
                    </span>
                    <span className="text-slate-500">{tier.period}</span>
                  </p>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">
                    {tier.description}
                  </p>
                  <Link
                    href={tier.cta.href}
                    className={`mt-6 inline-flex min-h-11 items-center justify-center rounded-xl text-center text-sm font-semibold no-underline transition ${
                      tier.cta.highlight
                        ? "bg-[#534AB7] text-white hover:bg-[#44399a]"
                        : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                    } `}
                  >
                    {tier.cta.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-semibold text-slate-900">MoneyOS</p>
            <p className="mt-1 text-sm text-slate-500">
              Built for India · RBI-aware education, not advice
            </p>
          </div>
          <nav
            className="flex flex-col gap-3 text-sm font-medium text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-8"
            aria-label="Footer"
          >
            {footerLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mx-auto mt-8 max-w-6xl border-t border-slate-100 pt-8 text-center text-xs text-slate-400 sm:text-left">
          © {new Date().getFullYear()} MoneyOS. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
