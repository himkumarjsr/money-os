import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import AppInitializer from "@/components/AppInitializer";
import PwaBootSplash from "@/components/PwaBootSplash";
import { MotionLazyProvider } from "@/components/MotionLazyProvider";
import { ReferralCapture } from "@/components/ReferralCapture";
import { ReferralSuccessToast } from "@/components/ReferralSuccessToast";
import { AuthRecoveryRedirect } from "@/components/AuthRecoveryRedirect";
import { AuthSessionSync } from "@/components/AuthSessionSync";
import { SplitInviteResume } from "@/components/SplitInviteResume";
import { PwaLaunchHandler } from "@/components/PwaLaunchHandler";
import { FinancialStoreAuthSync } from "@/components/FinancialStoreAuthSync";
import FeedbackPopupManager from "@/components/FeedbackPopupManager";
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
  authors: [{ name: "Himanshu Kumar", url: siteUrl }],
  creator: "Finkoin",
  publisher: "Finkoin",
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
    type: "website",
    locale: "en_IN",
    title: defaultTitle,
    description: `${FINKOIN_TAGLINE_FULL} Free financial health check, tax calculator, SIP calculator, home loan EMI, expense tracker and more. Built for Indians.`,
    url: siteUrl,
    siteName: "Finkoin",
    images: [
      {
        url: `${siteUrl}/og/og-home.png`,
        width: 1200,
        height: 630,
        alt: "Finkoin — India Personal Finance",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@finkoin",
    creator: "@finkoin",
    title: `Finkoin — ${FINKOIN_TAGLINE}`,
    description: `${FINKOIN_TAGLINE_FULL} Free financial health check for every Indian. No PAN needed.`,
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Applies the saved Appearance choice before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
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
                  description: `India's free personal finance platform. ${FINKOIN_TAGLINE_FULL}`,
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
                  description: `Finkoin is India's complete personal finance platform. ${FINKOIN_TAGLINE_FULL} Free financial health check. No PAN. No Aadhaar.`,
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
          JS — covers the blank gap when opening the installed PWA.
        */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
#finkoin-boot-splash{display:none}
@media (display-mode:standalone),(display-mode:fullscreen),(display-mode:minimal-ui){
#finkoin-boot-splash{position:fixed;inset:0;z-index:100000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:linear-gradient(165deg,#5f56c4 0%,#534ab7 48%,#3c3489 100%);color:#fff;transition:opacity .35s ease,visibility .35s ease}
#finkoin-boot-splash.finkoin-boot-splash--hide{opacity:0;visibility:hidden;pointer-events:none}
#finkoin-boot-splash .finkoin-boot-mark{display:flex;height:72px;width:72px;align-items:center;justify-content:center;border-radius:20px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);box-shadow:0 12px 40px rgba(20,16,60,.28);font-size:22px;font-weight:800;letter-spacing:-.03em}
#finkoin-boot-splash .finkoin-boot-name{margin:0;font-size:22px;font-weight:700;letter-spacing:-.03em}
#finkoin-boot-splash .finkoin-boot-sub{margin:0;font-size:13px;font-weight:500;color:rgba(255,255,255,.78)}
#finkoin-boot-splash .finkoin-boot-ring{width:28px;height:28px;margin-top:8px;border-radius:50%;border:2.5px solid rgba(255,255,255,.28);border-top-color:#fff;animation:finkoin-boot-spin .75s linear infinite}
@keyframes finkoin-boot-spin{to{transform:rotate(360deg)}}
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
            FK
          </div>
          <p className="finkoin-boot-name">Finkoin</p>
          <p className="finkoin-boot-sub">Loading your money OS…</p>
          <div className="finkoin-boot-ring" aria-hidden />
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
            <MorningTipPopup />
            <PushPermissionPrompt />
            <FeedbackPopupManager />
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
