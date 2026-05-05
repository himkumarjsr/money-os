"use client";

import { cn } from "@/lib/cn";
import { useEffect, useRef, useState } from "react";

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  fullscreen = false,
  closeOnBackdrop = true,
  closeOnDrag = true,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Edge-to-edge height (e.g. calculators on mobile). */
  fullscreen?: boolean;
  /** Default true. Calculators pass false so only the header X closes the sheet. */
  closeOnBackdrop?: boolean;
  /** Default true. Drag uses the header strip only — content scroll never dismisses. Calculators pass false — X only. */
  closeOnDrag?: boolean;
}) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number | null>(null);
  const dragYRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setDragY(0);
      dragYRef.current = 0;
      setIsDragging(false);
      startYRef.current = null;
    }
  }, [isOpen]);

  const dragHandlers = closeOnDrag
    ? {
        onTouchStart: (event: React.TouchEvent<HTMLDivElement>) => {
          dragYRef.current = 0;
          startYRef.current = event.touches[0]?.clientY ?? null;
          setIsDragging(true);
        },
        onTouchMove: (event: React.TouchEvent<HTMLDivElement>) => {
          if (startYRef.current === null) return;
          const currentY = event.touches[0]?.clientY ?? startYRef.current;
          const delta = Math.max(0, currentY - startYRef.current);
          dragYRef.current = delta;
          setDragY(delta);
        },
        onTouchEnd: () => {
          setIsDragging(false);
          startYRef.current = null;
          const close = dragYRef.current > 80;
          dragYRef.current = 0;
          setDragY(0);
          if (close) onClose();
        },
        onTouchCancel: () => {
          setIsDragging(false);
          startYRef.current = null;
          dragYRef.current = 0;
          setDragY(0);
        },
      }
    : {};

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[999] bg-black transition-opacity duration-300",
          isOpen ? "opacity-40" : "pointer-events-none opacity-0",
          (!closeOnBackdrop || !isOpen) && "pointer-events-none",
        )}
        onClick={closeOnBackdrop && isOpen ? onClose : undefined}
        aria-hidden={!isOpen}
      />

      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[1000] flex flex-col bg-white shadow-[0_-4px_40px_rgba(0,0,0,0.12)]",
          fullscreen
            ? "h-[100dvh] max-h-[100dvh] rounded-none"
            : "h-[90vh] max-h-[90vh] rounded-t-[20px]",
        )}
        style={{
          transform: isOpen ? `translateY(${dragY}px)` : "translateY(100%)",
          transition: isDragging ? "none" : "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
      >
        {/* Drag-to-dismiss attaches only here — scrolling the body never fires these handlers. */}
        <div
          className={cn(
            "shrink-0 bg-white",
            fullscreen && "pt-[env(safe-area-inset-top)]",
            closeOnDrag && "touch-none",
          )}
          {...dragHandlers}
        >
          <div className="mx-auto mt-2 flex justify-center md:mt-3">
            <div className="h-1 w-9 rounded-full bg-[#E0DFF8]" aria-hidden />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-3">
            <h3 id="bottom-sheet-title" className="min-w-0 flex-1 text-base font-bold text-slate-900">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F4F4F0] text-xl font-semibold leading-none text-[#111110]"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4",
            "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
          )}
        >
          {children}
        </div>
      </div>
    </>
  );
}
