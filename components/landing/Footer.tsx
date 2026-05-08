import Link from "next/link";
import FeedbackFormButton from "@/components/FeedbackFormButton";

const linkClassName =
  "group inline-flex items-center text-sm text-white/75 transition-all duration-300 hover:-translate-y-0.5 hover:text-white";

function FooterNavLink({ href, label }: { href: string; label: string }) {
  const external = href.startsWith("http") || href.startsWith("mailto:");
  if (external) {
    return (
      <a
        href={href}
        target={href.startsWith("mailto:") ? undefined : "_blank"}
        rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
        className={linkClassName}
      >
        <span>{label}</span>
        <span className="ml-0.5 h-px w-0 bg-white/70 transition-all duration-300 group-hover:w-full" />
      </a>
    );
  }
  return (
    <Link href={href} scroll aria-label={label} className={linkClassName}>
      <span>{label}</span>
      <span className="ml-0.5 h-px w-0 bg-white/70 transition-all duration-300 group-hover:w-full" />
    </Link>
  );
}

const columns = [
  {
    heading: "Product",
    links: [
      { label: "Financial Health Check", href: "/analyse" },
      { label: "Tax Calculator", href: "/calculators/tax-regime-2026" },
      { label: "SIP Calculator", href: "/calculators/sip" },
      { label: "Portfolio Analysis", href: "/portfolio" },
      { label: "Learn", href: "/learn" },
      { label: "Calculators", href: "/calculators" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
      { label: "Press", href: "/press" },
      { label: "Contact", href: "mailto:hello@finkoin.com" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms of Service", href: "/legal/terms" },
      { label: "Refund Policy", href: "/legal/refund" },
      { label: "Disclaimer", href: "/legal/disclaimer" },
    ],
  },
] as const;

const socialLinks = [
  {
    label: "Twitter",
    href: "https://twitter.com/finkoin",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M18.9 2H22l-6.78 7.75L23.2 22h-6.26l-4.9-6.4L6.46 22H3.34l7.25-8.28L1 2h6.42l4.43 5.85L18.9 2Zm-1.1 18.1h1.74L6.47 3.8H4.6L17.8 20.1Z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/company/finkoin",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M6.94 8.5H3.56V20h3.38V8.5Zm.22-3.56C7.15 3.87 6.29 3 5.25 3S3.34 3.87 3.34 4.94s.84 1.94 1.9 1.94h.02c1.05 0 1.9-.87 1.9-1.94ZM20.66 13.4c0-3.34-1.78-4.9-4.15-4.9-1.91 0-2.76 1.05-3.24 1.78V8.5H9.9c.04 1.18 0 11.5 0 11.5h3.37v-6.42c0-.34.02-.68.13-.92.28-.68.9-1.38 1.95-1.38 1.37 0 1.92 1.04 1.92 2.56V20H20.66v-6.6Z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://instagram.com/finkoin",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M12 7.2A4.8 4.8 0 1 0 16.8 12 4.81 4.81 0 0 0 12 7.2Zm0 7.93A3.13 3.13 0 1 1 15.13 12 3.14 3.14 0 0 1 12 15.13Zm5.07-8.14a1.12 1.12 0 1 1-1.12-1.12 1.12 1.12 0 0 1 1.12 1.12ZM19.88 8c-.07-.93-.26-1.75-.97-2.46s-1.53-.9-2.46-.97C15.58 4.5 12 4.5 12 4.5s-3.58 0-4.45.07c-.93.07-1.75.26-2.46.97S4.16 7.07 4.09 8 4 10.42 4 12s.02 3.58.09 4.45c.07.93.26 1.75.97 2.46s1.53.9 2.46.97c.87.07 4.45.07 4.45.07s3.58 0 4.45-.07c.93-.07 1.75-.26 2.46-.97s.9-1.53.97-2.46c.07-.87.07-3.39.07-4.45s0-3.58-.07-4.45ZM18.07 16.6c-.2.5-.58.88-1.08 1.08-.75.29-2.54.23-4.99.23s-4.24.06-4.99-.23a1.63 1.63 0 0 1-1.08-1.08c-.29-.75-.23-2.54-.23-4.99s-.06-4.24.23-4.99c.2-.5.58-.88 1.08-1.08.75-.29 2.54-.23 4.99-.23s4.24-.06 4.99.23c.5.2.88.58 1.08 1.08.29.75.23 2.54.23 4.99s.06 4.24-.23 4.99Z" />
      </svg>
    ),
  },
] as const;

export default function Footer() {
  return (
    <footer
      className="relative w-full shrink-0 overflow-hidden border-t border-white/10 bg-gradient-to-br from-[#161430] via-[#221944] to-[#0d0d17] text-white shadow-[0_-12px_40px_rgba(22,20,48,0.12)]"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/60 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-20 top-8 h-40 w-40 rounded-full bg-indigo-500/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 top-24 h-44 w-44 rounded-full bg-violet-500/20 blur-3xl"
        aria-hidden
      />

      <div className="mx-auto max-w-6xl px-4 pb-8 pt-12 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-[0_20px_60px_rgba(72,52,172,0.25)]">
          <h3 className="text-xl font-semibold tracking-tight text-white">Start your financial journey today</h3>
          <p className="mt-1 text-sm text-white/75">Takes less than 2 minutes</p>
          <div className="mt-4">
            <Link
              href="/analyse"
              scroll
              aria-label="Get free financial plan"
              className="inline-flex items-center rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/35 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/45"
            >
              Get Free Financial Plan
            </Link>
          </div>
        </section>

        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <section className="lg:col-span-4">
            <Link href="/" scroll className="inline-flex items-center gap-2.5" aria-label="Finkoin home">
              <svg width="40" height="40" viewBox="0 0 64 64" aria-hidden>
                <rect width="64" height="64" rx="14" fill="#534AB7" />
                <circle cx="32" cy="32" r="18" fill="none" stroke="#EEEDFE" strokeWidth="2" opacity="0.4" />
                <text x="32" y="39" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="20" fill="#FFFFFF">
                  FK
                </text>
              </svg>
              <span className="text-xl font-bold tracking-tight">Finkoin</span>
            </Link>
            <p className="mt-4 text-sm font-medium text-white/80">Built for India 🇮🇳 • Smart financial decisions powered by AI</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/65">
              Finkoin helps you analyze, plan, and improve your finances with AI-powered insights.
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 hover:border-indigo-300/80 hover:text-white hover:shadow-[0_0_18px_rgba(115,97,255,0.45)]"
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </section>

          <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8" aria-label="Footer links">
            {columns.map((column) => (
              <div key={column.heading}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">{column.heading}</h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <FooterNavLink href={link.href} label={link.label} />
                    </li>
                  ))}
                  {column.heading === "Legal" ? (
                    <li className="pt-1 text-xs leading-relaxed text-white/55">We are not SEBI-registered advisors.</li>
                  ) : null}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <section className="mt-10 grid gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-medium text-white/75 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <p>10,000+ users</p>
          <p>Made in India 🇮🇳</p>
          <p>Bank-level security 🔒</p>
          <p>No spam • No credit card required</p>
        </section>

        <div className="mt-6 flex justify-center">
          <FeedbackFormButton />
        </div>

        <div className="mt-8 border-t border-white/15 pt-6 text-center text-xs text-white/60">
          <p>© 2026 Finkoin. All rights reserved. Made with ❤️ in India 🇮🇳</p>
        </div>
      </div>
    </footer>
  );
}
