import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { GlobalNavbar } from "@/components/global-navbar";
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
        <GlobalNavbar />
        {children}
        <Toast />
      </body>
    </html>
  );
}
