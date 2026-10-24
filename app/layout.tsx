import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import AppInitializer from "@/components/AppInitializer";
import PwaBootSplash from "@/components/PwaBootSplash";
import BrandCoin from "@/components/ui/BrandCoin";
import { MotionLazyProvider } from "@/components/MotionLazyProvider";
import { ReferralCapture } from "@/components/ReferralCapture";
import { ReferralSuccessToast } from "@/components/ReferralSuccessToast";
import { AuthRecoveryRedirect } from "@/components/AuthRecoveryRedirect";
import { AuthSessionSync } from "@/components/AuthSessionSync";
import { SplitInviteResume } from "@/components/SplitInviteResume";
import { PwaLaunchHandler } from "@/components/PwaLaunchHandler";
import { FinancialStoreAuthSync } from "@/components/FinancialStoreAuthSync";
import FeedbackPopupManager from "@/components/FeedbackPopupManager";
import FloatingCalculator from "@/components/FloatingCalculator";
import IntroTourVideo from "@/components/IntroTourVideo";
import MorningTipPopup from "@/components/MorningTipPopup";
import PushPermissionPrompt from "@/components/PushPermissionPrompt";
import Footer from "@/components/landing/Footer";
import AnalyticsConsent from "@/components/AnalyticsConsent";
import { GlobalNavbar } from "@/components/global-navbar";
import ScrollToTopOnRouteChange from "@/components/ScrollToTopOnRouteChange";
import RouteChangeLoader from "@/components/ui/RouteChangeLoader";
import {
  FINKOIN_TAGLINE,
  FINKOIN_TAGLINE_FULL,
  SEO_CONFIG,
  SITE_URL,
} from "@/lib/seo";

import RenewalReminderBanner from "@/components/RenewalReminderBannerLazy";
import { Toast } from "@/components/ui/Toast";
import ThemeSync from "@/components/ThemeSync";
import { themeBootScript } from "@/lib/theme";
import "./globals.css";
import "./theme.css";

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

const defaultTitle = SEO_CONFIG.defaultTitle;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: "%s | Finkoin",
  },
  applicationName: "Finkoin",
  authors: [{ name: "Finkoin Team", url: siteUrl }],
  creator: "Finkoin",
  publisher: "Finkoin",
  description: SEO_CONFIG.defaultDescription,
  keywords: SEO_CONFIG.defaultKeywords,
  // No default canonical here: a "/" canonical inherited by every page told
  // Google those pages were copies of the home page. Pages set their own.
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
    type: "website",
    locale: "en_IN",
    title: defaultTitle,
    description: SEO_CONFIG.defaultDescription,
    url: siteUrl,
    siteName: "Finkoin",
    images: [
      {
        url: `${siteUrl}/og/og-home.png`,
        width: 1200,
        height: 630,
        alt: "Finkoin - India Personal Finance",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@finkoin",
    creator: "@finkoin",
    title: SEO_CONFIG.defaultTitle,
    description: SEO_CONFIG.defaultDescription,
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
      { url: "/favicon.ico", sizes: "48x48" },
      {
        url: "/assets/brand/finkoin-coin.svg",
        type: "image/svg+xml",
        sizes: "any",
      },
      {
        url: "/icons/icon-192x192.png?v=coin",
        type: "image/png",
        sizes: "192x192",
      },
      {
        url: "/icons/icon-512x512.png?v=coin",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    shortcut: "/assets/brand/finkoin-coin.svg",
    apple: [
      { url: "/icons/icon-192x192.png?v=coin", sizes: "192x192" },
      { url: "/icons/icon-152x152.png?v=coin", sizes: "152x152" },
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Applies the saved Appearance choice before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png?v=coin" />
        <link
          rel="apple-touch-icon"
          sizes="152x152"
          href="/icons/icon-152x152.png?v=coin"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/icons/icon-192x192.png?v=coin"
        />
        <link
          rel="apple-touch-icon"
          sizes="167x167"
          href="/icons/icon-192x192.png?v=coin"
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
                  description: `India's free personal finance platform. ${FINKOIN_TAGLINE_FULL}`,
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
                  description: `Finkoin is India's complete personal finance platform. ${FINKOIN_TAGLINE_FULL} Free financial health check. No PAN. No Aadhaar.`,
                  foundingDate: "2026",
                  foundingLocation: "India",
                  areaServed: "IN",
                  email: "hello@finkoin.com",
                  sameAs: [
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
              description: `Personal finance for India. ${FINKOIN_TAGLINE_FULL}`,
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
      <body className="font-sans min-h-dvh bg-[#F4F2FC] antialiased">
        {/*
          Critical CSS is inline so the splash paints before globals.css /
          JS - covers the blank gap when opening the installed PWA.
        */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
#finkoin-boot-splash{display:none}
@media (display-mode:standalone),(display-mode:fullscreen),(display-mode:minimal-ui){
#finkoin-boot-splash{position:fixed;inset:0;z-index:100000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:linear-gradient(165deg,#5f56c4 0%,#534ab7 48%,#3c3489 100%);color:#fff;transition:opacity .35s ease,visibility .35s ease}
#finkoin-boot-splash.finkoin-boot-splash--hide{opacity:0;visibility:hidden;pointer-events:none}
#finkoin-boot-splash .finkoin-boot-mark{display:flex;perspective:600px;filter:drop-shadow(0 12px 30px rgba(20,16,60,.35));animation:finkoin-boot-flip 1.3s cubic-bezier(.3,.7,.3,1) both}
#finkoin-boot-splash .finkoin-boot-mark svg{animation:fk-coin-turn 1.6s 1.5s ease-in-out infinite}
#finkoin-boot-splash .finkoin-boot-name{margin:0;font-size:22px;font-weight:700;letter-spacing:-.03em}
#finkoin-boot-splash .finkoin-boot-sub{margin:0;font-size:13px;font-weight:500;color:rgba(255,255,255,.78)}
#finkoin-boot-splash .finkoin-boot-name,#finkoin-boot-splash .finkoin-boot-sub{animation:finkoin-boot-rise .55s 1s ease-out both}
:root[data-theme="dark"] #finkoin-boot-splash{background:linear-gradient(160deg,#1e1a44 0%,#12102a 55%,#1a1638 100%);color:#eeedfe}
:root[data-theme="premium"] #finkoin-boot-splash{background:linear-gradient(160deg,#221c0e 0%,#12100b 55%,#1c170c 100%)}
:root[data-theme="premium"] #finkoin-boot-splash .finkoin-boot-name{background:var(--fk-gold-grad);-webkit-background-clip:text;background-clip:text;color:transparent}
:root[data-theme="premium"] #finkoin-boot-splash .finkoin-boot-sub{color:#bfb38a}
@keyframes finkoin-boot-flip{from{transform:rotateY(-540deg) scale(.6);opacity:0}to{transform:none;opacity:1}}
@keyframes finkoin-boot-rise{from{transform:translateY(10px);opacity:0}to{transform:none;opacity:1}}
@media (prefers-reduced-motion:reduce){#finkoin-boot-splash *{animation:none!important}}
}
`,
          }}
        />
        <div
          id="finkoin-boot-splash"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="finkoin-boot-mark" aria-hidden>
            <BrandCoin size={84} decorative />
          </div>
          <p className="finkoin-boot-name">Finkoin</p>
          <p className="finkoin-boot-sub">Loading your money OS…</p>
        </div>
        <PwaBootSplash />
        <MotionLazyProvider>
          <Suspense fallback={null}>
            <ReferralCapture />
          </Suspense>
          <AppInitializer>
            <ThemeSync />
            <ScrollToTopOnRouteChange />
            <RouteChangeLoader />
            <AuthSessionSync />
            <AuthRecoveryRedirect />
            <PwaLaunchHandler />
            <SplitInviteResume />
            <FinancialStoreAuthSync />
            <GlobalNavbar />
            <RenewalReminderBanner />
            {/*
              Do NOT use min-h-0 / overflow-y-auto here. That pattern needs a fixed
              viewport height on body; with min-h-dvh it clips tall pages (e.g.
              Split add-expense) so the window cannot scroll.
            */}
            <main
              id="main-content"
              className="relative w-full max-w-[100%] overflow-x-clip"
            >
              {children}
            </main>
            <IntroTourVideo />
            <MorningTipPopup />
            <PushPermissionPrompt />
            <FeedbackPopupManager />
            <FloatingCalculator />
            <Footer />
            <ReferralSuccessToast />
            <Toast />
            <AnalyticsConsent />
          </AppInitializer>
        </MotionLazyProvider>
      </body>
    </html>
  );
}
