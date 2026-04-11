import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Inter } from "next/font/google";
import { AuthSessionSync } from "@/components/AuthSessionSync";
import { FinancialStoreAuthSync } from "@/components/FinancialStoreAuthSync";
import { GlobalNavbar } from "@/components/global-navbar";

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

export const metadata: Metadata = {
  title: "Finkoin",
  description: "Personal finance tools and calculators",
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
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
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
