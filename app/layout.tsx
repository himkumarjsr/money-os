import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Inter } from "next/font/google";
import AppInitializer from "@/components/AppInitializer";
import { AuthSessionSync } from "@/components/AuthSessionSync";
import { FinancialStoreAuthSync } from "@/components/FinancialStoreAuthSync";
import Footer from "@/components/landing/Footer";
import { GlobalNavbar } from "@/components/global-navbar";
import ScrollToTopOnRouteChange from "@/components/ScrollToTopOnRouteChange";
import { SEO_CONFIG } from "@/lib/seo";

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
    default: SEO_CONFIG.defaultTitle,
    template: "%s | Finkoin",
  },
  description: SEO_CONFIG.defaultDescription,
  keywords: SEO_CONFIG.defaultKeywords,
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Finkoin",
              url: "https://finkoin.com",
              description: "Personal financial health check and wealth planning for India",
              applicationCategory: "FinanceApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "INR",
                description: "Free financial health check",
              },
              provider: {
                "@type": "Organization",
                name: "Finkoin",
                url: "https://finkoin.com",
              },
            }),
          }}
        />
      </head>
      <body className="font-sans min-h-dvh flex flex-col bg-white antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <AppInitializer>
          <ScrollToTopOnRouteChange />
          <AuthSessionSync />
          <FinancialStoreAuthSync />
          <GlobalNavbar />
          <RenewalReminderBanner />
          <main id="main-content" className="relative flex min-h-0 flex-1 flex-col">
            {children}
          </main>
          <Footer />
          <Toast />
        </AppInitializer>
      </body>
    </html>
  );
}
