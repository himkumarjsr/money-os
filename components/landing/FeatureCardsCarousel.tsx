"use client";

import AnimateOnScroll from "@/components/ui/AnimateOnScroll";
import { AnimatePresence, m, useMotionValue, useTransform } from "framer-motion";
import { useMemo, useState } from "react";

type Feature = { readonly title: string; readonly body: string };

const cardClassName =
  "h-full rounded-2xl border border-white/20 bg-white/60 p-6 backdrop-blur-md shadow-[0_12px_38px_rgba(79,70,229,0.13)] transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/25";

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

  return (
    <div className="mt-12">
      <div className="relative px-1 md:hidden">
        <div className="relative" style={{ perspective: "1000px" }}>
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
      </div>

      <div className="hidden grid-cols-3 gap-6 md:grid">
        {features.map((f, index) => (
          <AnimateOnScroll
            key={f.title}
            variant="fadeUp"
            delay={index * 0.08}
            aboveFold
            className={`${cardClassName} group relative overflow-hidden`}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-400/0 via-violet-400/0 to-blue-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:from-indigo-400/10 group-hover:via-violet-400/5 group-hover:to-blue-400/10"
            />
            <FeatureCardContent {...f} />
          </AnimateOnScroll>
        ))}
      </div>

      <p className="mt-4 text-center text-xs font-medium text-slate-500 md:hidden">
        Swipe to flip through features
      </p>
    </div>
  );
}
