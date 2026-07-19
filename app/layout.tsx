import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Inter } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";
import { Suspense } from "react";
import AppInitializer from "@/components/AppInitializer";
import { MotionLazyProvider } from "@/components/MotionLazyProvider";
import { ReferralCapture } from "@/components/ReferralCapture";
import { ReferralSuccessToast } from "@/components/ReferralSuccessToast";
import { AuthSessionSync } from "@/components/AuthSessionSync";
import { SplitInviteResume } from "@/components/SplitInviteResume";
import { FinancialStoreAuthSync } from "@/components/FinancialStoreAuthSync";
import FeedbackPopupManager from "@/components/FeedbackPopupManager";
import MorningTipPopup from "@/components/MorningTipPopup";
import Footer from "@/components/landing/Footer";
import { GlobalNavbar } from "@/components/global-navbar";
import ScrollToTopOnRouteChange from "@/components/ScrollToTopOnRouteChange";
import RouteChangeLoader from "@/components/ui/RouteChangeLoader";
import { SEO_CONFIG, SITE_URL } from "@/lib/seo";

const RenewalReminderBanner = dynamic(
  () =>
    import("@/components/RenewalReminderBanner").then((m) => ({
      default: m.RenewalReminderBanner,
    })),
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
  fallback: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "sans-serif",
  ],
});

const siteUrl = SITE_URL;

const brandKeywords = [
  "Finkoin",
  "Finkoin app",
  "Finkoin financial health",
  "finkoin.com",
] as const;

const defaultTitle = "Finkoin — Free Financial Health Check for India";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: "%s | Finkoin",
  },
  applicationName: "Finkoin",
  description: SEO_CONFIG.defaultDescription,
  keywords: [...brandKeywords, ...SEO_CONFIG.defaultKeywords],
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
    title: defaultTitle,
    description:
      "Plan, track, and improve your financial life with Finkoin's AI advisor and free calculators.",
    url: siteUrl,
    siteName: "Finkoin",
    type: "website",
    images: [
      {
        url: `${siteUrl}/og/og-home.png`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
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
        media:
          "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/apple-splash-1668-2388.png",
        media:
          "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/apple-splash-1536-2048.png",
        media:
          "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/apple-splash-1125-2436.png",
        media:
          "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/apple-splash-1242-2688.png",
        media:
          "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/apple-splash-828-1792.png",
        media:
          "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/apple-splash-1242-2208.png",
        media:
          "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/apple-splash-750-1334.png",
        media:
          "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/apple-splash-640-1136.png",
        media:
          "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Finkoin",
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
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link
          rel="apple-touch-icon"
          sizes="152x152"
          href="/icons/icon-152x152.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/icons/icon-192x192.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="167x167"
          href="/icons/icon-192x192.png"
        />
        <meta name="theme-color" content="#534AB7" />
        <meta
          name="google-site-verification"
          content="INyXjW5d4nLIwegnwnH_DAKX81o3a_cYup7iq_Jt-6U"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Finkoin" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" fetchPriority="low" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": "https://www.finkoin.com/#website",
                  url: "https://www.finkoin.com",
                  name: "Finkoin",
                  alternateName: ["Finkoin App", "Finkoin Finance"],
                  description: "India's free financial health check platform",
                  potentialAction: {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate:
                        "https://www.finkoin.com/search?q={search_term_string}",
                    },
                    "query-input": "required name=search_term_string",
                  },
                },
                {
                  "@type": "Organization",
                  "@id": "https://www.finkoin.com/#organization",
                  name: "Finkoin",
                  alternateName: "Finkoin",
                  url: "https://www.finkoin.com",
                  logo: {
                    "@type": "ImageObject",
                    url: "https://www.finkoin.com/icons/icon-512x512.png",
                    width: 512,
                    height: 512,
                  },
                  description:
                    "Finkoin is India's free financial health check platform. Know your financial health score in 5 minutes. No PAN. No Aadhaar.",
                  foundingDate: "2026",
                  foundingLocation: "India",
                  areaServed: "IN",
                  email: "hello@finkoin.com",
                  founder: {
                    "@type": "Person",
                    "@id": "https://www.finkoin.com/about#founder",
                    name: "Himanshu Kumar",
                    jobTitle: "Founder",
                    worksFor: {
                      "@id": "https://www.finkoin.com/#organization",
                    },
                    image:
                      "https://www.finkoin.com/assets/founder-himanshu-kumar.png",
                    url: "https://www.finkoin.com/about",
                    sameAs: [
                      "https://www.linkedin.com/in/himanshu-k-81b484140/",
                    ],
                  },
                  sameAs: [
                    "https://www.instagram.com/finkoin",
                    "https://twitter.com/finkoin",
                    "https://linkedin.com/company/finkoin",
                  ],
                },
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Finkoin",
              url: siteUrl,
              description:
                "Personal financial health check and wealth planning for India",
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
      <body className="font-sans min-h-dvh bg-white antialiased">
        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){
          (c[a].q=c[a].q||[])
            .push(arguments)};
        t=l.createElement(r);
        t.async=1;
        t.src=
          "https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];
        y.parentNode.insertBefore(t,y);
        // Queue cookieless mode before Clarity boots (no 1P/3P cookies).
        c[a]("consentv2", {
          ad_Storage: "denied",
          analytics_Storage: "denied"
        });
      })(window, document, 
        "clarity", "script", 
        "wy7rqfej1z");
    `,
          }}
        />
        <MotionLazyProvider>
          <Suspense fallback={null}>
            <ReferralCapture />
          </Suspense>
          <AppInitializer>
            <ScrollToTopOnRouteChange />
            <RouteChangeLoader />
            <AuthSessionSync />
            <SplitInviteResume />
            <FinancialStoreAuthSync />
            <GlobalNavbar />
            <RenewalReminderBanner />
            {/*
              Do NOT use min-h-0 / overflow-y-auto here. That pattern needs a fixed
              viewport height on body; with min-h-dvh it clips tall pages (e.g.
              Split add-expense) so the window cannot scroll.
            */}
            <main id="main-content" className="relative w-full">
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
