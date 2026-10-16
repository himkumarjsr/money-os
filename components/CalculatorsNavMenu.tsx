"use client";

import { CATEGORIES } from "@/app/calculators/calculator-config";
import { AppIcon } from "@/components/ui/AppIcon";
import { AnimatePresence, m } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function calcHref(calcId: string) {
  if (calcId === "tax-regime") return "/calculators/tax-regime-2026";
  return `/calculators/${calcId}`;
}

/** Desktop header item: "Calculators" with a dropdown of every finance calculator, grouped by category. */
export function CalculatorsNavMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => cancelClose, []);

  return (
    <div
      ref={rootRef}
      // Not `relative`: the panel anchors to the header row so it spans the full header width.
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="nav-underline inline-flex items-center gap-1 transition-colors duration-300 hover:text-[#534AB7]"
      >
        Calculators
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M3 4.5 6 7.5 9 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AnimatePresence>
        {open ? (
          <m.div
            key="calculators-menu"
            data-track-nav-zone="calculators_menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-x-4 top-full z-[60] pt-1 sm:inset-x-6"
          >
            <div
              className="max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-[#F0EFF8] bg-white p-5 shadow-[0_8px_40px_rgba(0,0,0,0.12)]"
              role="menu"
              aria-label="Finance calculators"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-base font-bold text-slate-900">
                  Finance calculators
                </p>
                <Link
                  href="/calculators"
                  role="menuitem"
                  className="text-xs font-semibold text-[#534AB7] hover:underline"
                >
                  View all ›
                </Link>
              </div>
              <div className="grid grid-cols-4 gap-x-5 gap-y-6">
                {CATEGORIES.map((category) => (
                  <div key={category.id} className="min-w-0">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      {category.label}
                    </p>
                    <ul className="space-y-0.5">
                      {category.items.map((item) => {
                        const href = calcHref(item.id);
                        const active = pathname === href;
                        return (
                          <li key={item.id}>
                            <Link
                              href={href}
                              role="menuitem"
                              title={item.blurb}
                              aria-current={active ? "page" : undefined}
                              className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50 ${active ? "bg-slate-50 font-semibold" : ""}`}
                            >
                              {item.icon ? (
                                <AppIcon
                                  className="mt-0.5 shrink-0"
                                  name={item.icon}
                                  size={15}
                                  color="#534AB7"
                                />
                              ) : null}
                              <span>{item.title}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
