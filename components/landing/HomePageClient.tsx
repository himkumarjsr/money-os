"use client";

import type { ReactNode } from "react";
import HomeHeroCarousel from "@/components/landing/HomeHeroCarousel";
import HomeMobileQuickTools from "@/components/landing/HomeMobileQuickTools";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import { TrackImpression } from "@/components/TrackImpression";
import { m, useScroll, useSpring, useTransform } from "framer-motion";
import dynamic from "next/dynamic";

const HomePageBelowFold = dynamic(() => import("./HomePageBelowFold"), {
  ssr: true,
  loading: () => (
    <BrandPageLoader
      fullScreen={false}
      size="sm"
      minHeight="48vh"
      label="Loading…"
    />
  ),
});

export default function HomePageClient({ children }: { children: ReactNode }) {
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.2,
  });
  const heroScale = useTransform(scrollY, [0, 420], [1, 0.9]);
  const heroOpacity = useTransform(scrollY, [0, 320], [1, 0.72]);
  const heroY = useTransform(scrollY, [0, 420], [0, -70]);
  const orbLeftY = useTransform(scrollY, [0, 1000], [0, -140]);
  const orbRightY = useTransform(scrollY, [0, 1200], [0, -180]);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-indigo-50 via-white to-violet-50/70 text-slate-900 antialiased">
      <m.div
        aria-hidden
        className="pointer-events-none fixed left-0 right-0 top-0 z-[70] h-1 origin-left bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500"
        style={{ scaleX: progress }}
      />
      <m.div
        aria-hidden
        className="pointer-events-none fixed -left-24 top-24 z-0 h-64 w-64 rounded-full bg-violet-400/25 blur-3xl"
        style={{ y: orbLeftY }}
      />
      <m.div
        aria-hidden
        className="pointer-events-none fixed -right-28 top-40 z-0 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl"
        style={{ y: orbRightY }}
      />
      <main className="snap-y snap-mandatory">
        <TrackImpression component_id="home_hero_section" threshold={0.2}>
          <section className="relative z-10 overflow-hidden border-b border-indigo-100/80 px-4 pb-10 pt-8 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
            <m.div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-100/70 via-violet-100/60 to-blue-100/60"
              animate={{ opacity: [0.75, 1, 0.8] }}
              transition={{
                duration: 8,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeOut",
              }}
            />
            <m.div
              aria-hidden
              className="pointer-events-none absolute left-[7%] top-10 -z-10 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl"
              animate={{ y: [0, -14, 0], x: [0, 6, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            />
            <m.div
              aria-hidden
              className="pointer-events-none absolute right-[8%] top-14 -z-10 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl"
              animate={{ y: [0, 12, 0], x: [0, -5, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <m.div
              style={{ scale: heroScale, opacity: heroOpacity, y: heroY }}
              className="relative mx-auto max-w-4xl text-center"
            >
              {children}
              <div className="mt-3 sm:mt-8">
                <HomeHeroCarousel />
              </div>
              <div className="mt-3 md:hidden">
                <HomeMobileQuickTools />
              </div>
            </m.div>
          </section>
        </TrackImpression>

        <HomePageBelowFold />
      </main>
    </div>
  );
}
