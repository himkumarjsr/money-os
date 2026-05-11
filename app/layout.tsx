import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Inter } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Suspense } from "react";
import AppInitializer from "@/components/AppInitializer";
import { MotionLazyProvider } from "@/components/MotionLazyProvider";
import { ReferralCapture } from "@/components/ReferralCapture";
import { ReferralSuccessToast } from "@/components/ReferralSuccessToast";
import { AuthSessionSync } from "@/components/AuthSessionSync";
import { FinancialStoreAuthSync } from "@/components/FinancialStoreAuthSync";
import FeedbackPopupManager from "@/components/FeedbackPopupManager";
import MorningTipPopup from "@/components/MorningTipPopup";
import Footer from "@/components/landing/Footer";
import { GlobalNavbar } from "@/components/global-navbar";
import ScrollToTopOnRouteChange from "@/components/ScrollToTopOnRouteChange";
import { SEO_CONFIG, SITE_URL } from "@/lib/seo";

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
  preload: true,
  adjustFontFallback: true,
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
});

const siteUrl = SITE_URL;

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
        url: "https://finkoin.com/og/og-home.png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Finkoin - AI Personal Finance Advisor for India",
    description:
      "Plan, track, and improve your financial life with Finkoin's AI advisor and free calculators.",
    images: [`${siteUrl}/og/og-home.png`],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Finkoin",
    startupImage: [
      {
        url: "/splash/apple-splash-2048-2732.png",
        media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/apple-splash-1668-2388.png",
        media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/apple-splash-1536-2048.png",
        media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/apple-splash-1125-2436.png",
        media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/apple-splash-1242-2688.png",
        media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/apple-splash-828-1792.png",
        media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/apple-splash-1242-2208.png",
        media: "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/apple-splash-750-1334.png",
        media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/apple-splash-640-1136.png",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Finkoin",
    "application-name": "Finkoin",
    "msapplication-TileColor": "#534AB7",
    "msapplication-tap-highlight": "no",
    "format-detection": "telephone=no",
  },
  icons: {
    icon: [
      {
        url: "/assets/brand/finkoin-icon-1024.svg",
        type: "image/svg+xml",
        sizes: "any",
      },
      { url: "/icons/icon-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512x512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/assets/brand/finkoin-icon-1024.svg",
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192" },
      { url: "/icons/icon-152x152.png", sizes: "152x152" },
    ],
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
          url: `${siteUrl}/icons/icon-512x512.png`,
          width: 512,
          height: 512,
        },
        contactPoint: {
          "@type": "ContactPoint",
          email: "hello@finkoin.com",
          contactType: "customer service",
        },
        sameAs: ["https://twitter.com/finkoin", "https://linkedin.com/company/finkoin"],
      },
      {
        "@type": "WebSite",
        name: "Finkoin",
        url: siteUrl,
        description: "Free financial health check for India",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/learn?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
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
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#534AB7" />
        <meta
          name="google-site-verification"
          content="INyXjW5d4nLIwegnwnH_DAKX81o3a_cYup7iq_Jt-6U"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Finkoin" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" fetchPriority="low" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Finkoin",
              url: siteUrl,
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
                url: siteUrl,
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
        <MotionLazyProvider>
          <Suspense fallback={null}>
            <ReferralCapture />
          </Suspense>
          <AppInitializer>
            <ScrollToTopOnRouteChange />
            <AuthSessionSync />
            <FinancialStoreAuthSync />
            <GlobalNavbar />
            <RenewalReminderBanner />
            <main id="main-content" className="relative flex min-h-0 flex-1 flex-col">
              {children}
            </main>
            <MorningTipPopup />
            <FeedbackPopupManager />
            <Footer />
            <ReferralSuccessToast />
            <Toast />
          </AppInitializer>
        </MotionLazyProvider>
      </body>
      <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!} />
    </html>
  );
}
