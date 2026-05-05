"use client";

import AnimateOnScroll from "@/components/ui/AnimateOnScroll";
import { AnimatePresence, m, useMotionValue, useTransform } from "framer-motion";
import { useMemo, useState } from "react";

type Feature = { readonly title: string; readonly body: string };

const cardClassName =
  "h-full rounded-2xl border border-white/20 bg-white/60 p-6 backdrop-blur-md shadow-[0_12px_38px_rgba(79,70,229,0.13)] transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/25 md:p-7";

function FeatureCardContent({ title, body }: Feature) {
  return (
    <>
      <h3 className="text-lg font-semibold leading-snug tracking-tight text-slate-900">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-[0.9375rem]">
        {body}
      </p>
    </>
  );
}

export default function FeatureCardsCarousel({
  features,
}: {
  features: readonly Feature[];
}) {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const dragX = useMotionValue(0);
  const rotateY = useTransform(dragX, [-220, 0, 220], [18, 0, -18]);
  const shadowOpacity = useTransform(dragX, [-180, 0, 180], [0.35, 0, 0.35]);

  const activeFeature = features[active];
  const atStart = active === 0;
  const atEnd = active === features.length - 1;
  const dragElastic = atStart || atEnd ? 0.12 : 0.2;

  const mobileVariants = useMemo(
    () => ({
      initial: (dir: number) => ({
        rotateY: dir > 0 ? 32 : -32,
        opacity: 0,
        x: dir > 0 ? 44 : -44,
        scale: 0.98,
      }),
      animate: {
        rotateY: 0,
        opacity: 1,
        x: 0,
        scale: 1,
        transition: { type: "spring", stiffness: 240, damping: 26, mass: 0.8 },
      },
      exit: (dir: number) => ({
        rotateY: dir > 0 ? -180 : 180,
        opacity: 0,
        x: dir > 0 ? -56 : 56,
        transition: { duration: 0.42, ease: "easeInOut" },
      }),
    }),
    [],
  );

  const paginate = (nextDirection: number) => {
    const nextIndex = active + nextDirection;
    if (nextIndex < 0 || nextIndex >= features.length) return;
    setDirection(nextDirection);
    setActive(nextIndex);
  };

  const goTo = (index: number) => {
    if (index === active || index < 0 || index >= features.length) return;
    setDirection(index > active ? 1 : -1);
    setActive(index);
  };

  return (
    <div className="mt-12">
      <div className="relative mx-auto max-w-lg px-1 md:max-w-xl lg:max-w-2xl">
        <div className="relative flex items-center justify-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => paginate(-1)}
            disabled={atStart}
            className="hidden shrink-0 rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-35 sm:inline-flex"
            aria-label="Previous feature"
          >
            <span aria-hidden className="block px-0.5 text-lg leading-none">
              ‹
            </span>
          </button>

          <div className="relative min-w-0 flex-1" style={{ perspective: "1000px" }}>
            <AnimatePresence mode="wait" custom={direction}>
              <m.div
                key={activeFeature.title}
                custom={direction}
                variants={mobileVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={dragElastic}
                dragMomentum={false}
                style={{ rotateY, x: dragX, transformStyle: "preserve-3d" }}
                onDragEnd={(_, info) => {
                  const swipePower = Math.abs(info.offset.x) * info.velocity.x;
                  if (info.offset.x < -70 || swipePower < -18000) paginate(1);
                  else if (info.offset.x > 70 || swipePower > 18000) paginate(-1);
                }}
                className="relative touch-pan-y"
              >
                <AnimateOnScroll
                  variant="fadeUp"
                  aboveFold
                  className={`${cardClassName} border-white/20 bg-white/60`}
                >
                  <FeatureCardContent {...activeFeature} />
                </AnimateOnScroll>
                <m.div
                  aria-hidden
                  style={{ opacity: shadowOpacity }}
                  className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-900/10 via-transparent to-violet-900/10"
                />
              </m.div>
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => paginate(1)}
            disabled={atEnd}
            className="hidden shrink-0 rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-35 sm:inline-flex"
            aria-label="Next feature"
          >
            <span aria-hidden className="block px-0.5 text-lg leading-none">
              ›
            </span>
          </button>
        </div>

        <div
          className="mt-6 flex flex-wrap items-center justify-center gap-2"
          role="tablist"
          aria-label="Feature slides"
        >
          {features.map((f, i) => (
            <button
              key={f.title}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`${f.title}${i === active ? ", current slide" : ""}`}
              onClick={() => goTo(i)}
              className={
                i === active
                  ? "h-2.5 min-w-[28px] rounded-full bg-[#534AB7] px-1 transition"
                  : "h-2.5 w-2.5 rounded-full bg-slate-300 transition hover:bg-slate-400"
              }
            />
          ))}
        </div>
      </div>

      <p className="mt-3 text-center text-xs font-medium text-slate-600">
        Swipe on mobile, or use arrows and dots on larger screens
      </p>
    </div>
  );
}
