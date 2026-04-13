import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Inter } from "next/font/google";
import { AuthSessionSync } from "@/components/AuthSessionSync";
import { FinancialStoreAuthSync } from "@/components/FinancialStoreAuthSync";
import { GlobalNavbar } from "@/components/global-navbar";
import ScrollToTopOnRouteChange from "@/components/ScrollToTopOnRouteChange";

const RenewalReminderBanner = dynamic(
  () =>
    import("@/components/RenewalReminderBanner").then((m) => ({ default: m.RenewalReminderBanner })),
  { ssr: false },
);
import { Toast } from "@/components/ui/Toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://finkoin.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Finkoin - AI Personal Finance Advisor for India",
    template: "%s | Finkoin",
  },
  description:
    "Finkoin helps Indians manage money with AI-led financial analysis, calculators, and actionable planning.",
  keywords: [
    "Finkoin",
    "Finkoin finance app",
    "personal finance India",
    "SIP calculator India",
    "EMI calculator",
    "income tax calculator India",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "Finkoin - AI Personal Finance Advisor for India",
    description:
      "Plan, track, and improve your financial life with Finkoin's AI advisor and free calculators.",
    url: siteUrl,
    siteName: "Finkoin",
    type: "website",
    images: [
      {
        url: `${siteUrl}/assets/brand/finkoin-icon-1024.svg`,
        secureUrl: `${siteUrl}/assets/brand/finkoin-icon-1024.svg`,
        width: 1024,
        height: 1024,
        alt: "Finkoin logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Finkoin - AI Personal Finance Advisor for India",
    description:
      "Plan, track, and improve your financial life with Finkoin's AI advisor and free calculators.",
    images: [`${siteUrl}/assets/brand/finkoin-icon-1024.svg`],
  },
  icons: {
    icon: [
      {
        url: "/assets/brand/finkoin-icon-1024.svg",
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
    shortcut: "/assets/brand/finkoin-icon-1024.svg",
    apple: "/assets/brand/finkoin-icon-1024.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#534ab7" },
    { media: "(prefers-color-scheme: dark)", color: "#13111a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Finkoin",
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/assets/brand/finkoin-icon-1024.svg`,
          width: 1024,
          height: 1024,
        },
        sameAs: [],
      },
      {
        "@type": "WebSite",
        name: "Finkoin",
        url: siteUrl,
        publisher: {
          "@type": "Organization",
          name: "Finkoin",
        },
      },
    ],
  };

  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <ScrollToTopOnRouteChange />
        <AuthSessionSync />
        <FinancialStoreAuthSync />
        <GlobalNavbar />
        <RenewalReminderBanner />
        {children}
        <Toast />
      </body>
    </html>
  );
}
