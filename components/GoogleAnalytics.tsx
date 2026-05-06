"use client";

import { AnalyticsBehavior } from "@/components/AnalyticsBehavior";
import { getAnalyticsContext } from "@/lib/analyticsContext";
import { GA_MEASUREMENT_ID } from "@/lib/gtag";
import { useAuthStore } from "@/store/authStore";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { Suspense, useEffect } from "react";

function GaRouteViewsAndUser() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const userId = useAuthStore((s) => s.user?.id);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    const q = searchParams?.toString();
    const page_path = pathname ? (q ? `${pathname}?${q}` : pathname) : "";

    const ctx = getAnalyticsContext();

    window.gtag?.("set", "user_properties", {
      app_surface: String(ctx.app_surface ?? ""),
      device_category: String(ctx.device_category ?? ""),
      timezone: String(ctx.timezone ?? ""),
      language: String(ctx.language ?? ""),
    });

    window.gtag?.("config", GA_MEASUREMENT_ID, {
      page_path,
      ...(isLoggedIn && userId ? { user_id: userId } : {}),
      ...ctx,
    });
  }, [pathname, searchParams, isLoggedIn, userId]);

  return null;
}

export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="ga-gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
        `}
      </Script>
      <AnalyticsBehavior />
      <Suspense fallback={null}>
        <GaRouteViewsAndUser />
      </Suspense>
    </>
  );
}
