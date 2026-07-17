import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: "About Finkoin — Financial Health Platform for India",
  },
  description:
    "Finkoin helps Indians understand their financial health. Free tool. No PAN needed. Built by Indians for India.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Finkoin — Financial Health Platform for India",
    description:
      "Finkoin helps Indians understand their financial health. Free tool. No PAN needed. Built by Indians for India.",
    url: `${SITE_URL}/about`,
    siteName: "Finkoin",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og/og-home.png`,
        width: 1200,
        height: 630,
        alt: "About Finkoin",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Finkoin — Financial Health Platform for India",
    description:
      "Finkoin helps Indians understand their financial health. Free tool. No PAN needed. Built by Indians for India.",
    images: [`${SITE_URL}/og/og-home.png`],
  },
};

const founderJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  mainEntity: {
    "@type": "Person",
    "@id": `${SITE_URL}/about#founder`,
    name: "Himanshu Kumar",
    jobTitle: "Founder",
    description:
      "Founder of Finkoin, a free personal finance health platform built for India.",
    image: `${SITE_URL}/assets/founder-himanshu-kumar.png`,
    url: `${SITE_URL}/about`,
    worksFor: {
      "@type": "Organization",
      name: "Finkoin",
      url: SITE_URL,
    },
    nationality: "Indian",
    sameAs: ["https://www.linkedin.com/in/himanshu-k-81b484140/"],
  },
};

export default function AboutPage() {
  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "60px 24px 80px",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(founderJsonLd) }}
      />
      <div
        style={{
          textAlign: "center",
          marginBottom: 64,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: "#534AB7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            fontSize: 32,
            color: "white",
            fontWeight: 800,
          }}
        >
          FK
        </div>
        <h1
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: "#111110",
            marginBottom: 16,
            lineHeight: 1.2,
          }}
        >
          Making financial health
          <br />
          simple for every Indian
        </h1>
        <p
          style={{
            fontSize: 18,
            color: "#5F5E5A",
            maxWidth: 600,
            margin: "0 auto",
            lineHeight: 1.7,
          }}
        >
          Finkoin is a personal finance platform built specifically for India.
          We help you understand where you stand financially and what to do
          next.
        </p>
      </div>

      <div
        style={{
          background: "#EEEDFE",
          borderRadius: 20,
          padding: "40px",
          marginBottom: 48,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#534AB7",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 16,
          }}
        >
          OUR MISSION
        </div>
        <p
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#3C3489",
            lineHeight: 1.6,
            maxWidth: 600,
            margin: "0 auto",
          }}
        >
          To give every Indian access to personalised financial guidance that
          was previously only available to the wealthy few.
        </p>
      </div>

      <div style={{ marginBottom: 48 }}>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#111110",
            marginBottom: 16,
          }}
        >
          The problem we are solving
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {[
            {
              icon: "wallet" as AppIconName,
              title: "Money disappears",
              desc: "Most Indians earn well but never know where their money goes. No tracking, no awareness, no plan.",
            },
            {
              icon: "alert" as AppIconName,
              title: "No emergency fund",
              desc: "78% of Indians have less than 3 months of expenses saved. One health emergency can wipe out years of savings.",
            },
            {
              icon: "shield" as AppIconName,
              title: "Wrong insurance",
              desc: "Most people are underinsured or have the wrong kind of insurance. LIC endowment plans instead of term insurance.",
            },
            {
              icon: "chart" as AppIconName,
              title: "Financial advice is expensive",
              desc: "Good financial advisors charge ₹5,000-50,000 per year. Most Indians cannot afford this.",
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                background: "#F7F7F4",
                borderRadius: 16,
                padding: "24px",
              }}
            >
              <div
                style={{
                  marginBottom: 12,
                }}
              >
                <AppIcon name={item.icon} size={28} color="#534AB7" />
              </div>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#111110",
                  marginBottom: 8,
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "#5F5E5A",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 48 }}>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#111110",
            marginBottom: 16,
          }}
        >
          How Finkoin helps
        </h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {[
            {
              step: "01",
              title: "Financial Health Check",
              desc: "Answer simple questions about your income, expenses, loans, and savings. No PAN. No Aadhaar. Just numbers.",
              color: "#534AB7",
            },
            {
              step: "02",
              title: "AI-Powered Analysis",
              desc: "Our engine calculates your health score across 5 areas: emergency fund, insurance, debt, investments, and goals.",
              color: "#1D9E75",
            },
            {
              step: "03",
              title: "Personalised Fix Plan",
              desc: "Get a step-by-step action plan specific to your situation. Know exactly what to fix first and in how many months.",
              color: "#BA7517",
            },
            {
              step: "04",
              title: "Monthly Tracking",
              desc: "Track your spending monthly. See where every rupee goes. Get nudged when you overspend on wants vs needs.",
              color: "#E24B4A",
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 20,
                alignItems: "flex-start",
                background: "white",
                border: "1px solid #E8E6F0",
                borderRadius: 16,
                padding: "24px",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: `${item.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 800,
                  color: item.color,
                  flexShrink: 0,
                }}
              >
                {item.step}
              </div>
              <div>
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: "#111110",
                    marginBottom: 6,
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: "#5F5E5A",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 48 }}>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#111110",
            marginBottom: 8,
          }}
        >
          What we believe in
        </h2>
        <p
          style={{
            fontSize: 15,
            color: "#9B9A94",
            marginBottom: 24,
          }}
        >
          Our principles guide every decision we make.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {[
            {
              icon: "lock" as AppIconName | null,
              flag: null as string | null,
              title: "Privacy first",
              desc: "We never ask for PAN, Aadhaar, or bank details. Only numbers. Always encrypted.",
            },
            {
              icon: "notebook" as AppIconName | null,
              flag: null,
              title: "Education over selling",
              desc: "We explain every concept so you learn while you plan. Not just results — understanding.",
            },
            {
              icon: null,
              flag: "🇮🇳",
              title: "Built for India",
              desc: "Indian tax laws, Indian investment products, Indian financial realities. Not a US product adapted.",
            },
            {
              icon: "coin" as AppIconName | null,
              flag: null,
              title: "Affordable always",
              desc: "Core features free forever. Premium features at ₹99 — not ₹5,000/year like advisors.",
            },
            {
              icon: "robot" as AppIconName | null,
              flag: null,
              title: "AI with integrity",
              desc: "Our AI explains, not decides. You stay in control. We never push products for commission.",
            },
            {
              icon: "chart" as AppIconName | null,
              flag: null,
              title: "Data-driven",
              desc: "Every suggestion backed by calculations, not opinions. Show the math, not just the answer.",
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                background: "#F7F7F4",
                borderRadius: 14,
                padding: "20px",
              }}
            >
              <div
                style={{
                  fontSize: item.flag ? 28 : undefined,
                  marginBottom: 10,
                }}
              >
                {item.flag ? (
                  item.flag
                ) : item.icon ? (
                  <AppIcon name={item.icon} size={26} color="#534AB7" />
                ) : null}
              </div>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#111110",
                  marginBottom: 6,
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: "#5F5E5A",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: "#F7F7F4",
          borderRadius: 20,
          padding: "40px",
          marginBottom: 48,
        }}
      >
        <h2
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "#111110",
            marginBottom: 24,
          }}
        >
          The person behind Finkoin
        </h2>
        <div
          style={{
            display: "flex",
            gap: 24,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <Image
            src="/assets/founder-himanshu-kumar.png"
            alt="Himanshu Kumar, Founder of Finkoin"
            width={80}
            height={80}
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              objectFit: "cover",
              flexShrink: 0,
              border: "2px solid #E8E6F0",
            }}
          />
          <div style={{ flex: 1, minWidth: 200 }}>
            <h3
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "#111110",
                marginBottom: 4,
              }}
            >
              Himanshu Kumar
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "#534AB7",
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Founder, Finkoin
            </p>
            <a
              href="https://www.linkedin.com/in/himanshu-k-81b484140/"
              target="_blank"
              rel="noopener noreferrer author"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: "#534AB7",
                fontWeight: 600,
                textDecoration: "none",
                marginBottom: 12,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
              </svg>
              LinkedIn
            </a>
            <p
              style={{
                fontSize: 15,
                color: "#5F5E5A",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Finkoin was born from a simple frustration — why is good financial
              advice so hard to get in India? I built Finkoin to give every
              working Indian the same quality of financial analysis that was
              previously only available to the privileged few. No jargon. No
              hidden agendas. Just clear, honest, personalised guidance.
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          background: "#FFF8F0",
          border: "1px solid #FAEEDA",
          borderRadius: 14,
          padding: "20px 24px",
          marginBottom: 48,
        }}
      >
        <p
          style={{
            fontSize: 13,
            color: "#633806",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          <strong>Disclaimer:</strong> Finkoin provides educational financial
          guidance only. We are not a SEBI-registered investment advisor,
          IRDAI-licensed insurance agent, or RBI-regulated financial entity. All
          analysis is algorithmic and educational. Always consult qualified
          professionals before making major financial decisions.
        </p>
      </div>

      <div
        style={{
          textAlign: "center",
          padding: "40px",
          background: "#534AB7",
          borderRadius: 20,
          color: "white",
        }}
      >
        <h2
          style={{
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 12,
          }}
        >
          Ready to check your financial health?
        </h2>
        <p
          style={{
            fontSize: 16,
            opacity: 0.8,
            marginBottom: 24,
          }}
        >
          Free. Takes 5 minutes. No PAN or Aadhaar needed.
        </p>

        <Link
          href="/analyse"
          style={{
            display: "inline-block",
            background: "white",
            color: "#534AB7",
            padding: "14px 32px",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Start free analysis →
        </Link>
      </div>
    </div>
  );
}
