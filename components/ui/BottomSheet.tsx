"use client";

import { useEffect, useRef, useState } from "react";

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef<number | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    startYRef.current = event.touches[0]?.clientY ?? null;
    draggingRef.current = true;
  };

  const onTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!draggingRef.current || startYRef.current === null) return;
    const currentY = event.touches[0]?.clientY ?? startYRef.current;
    const delta = Math.max(0, currentY - startYRef.current);
    setDragY(delta);
  };

  const onTouchEnd = () => {
    draggingRef.current = false;
    if (dragY > 80) {
      setDragY(0);
      onClose();
      return;
    }
    setDragY(0);
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[999] bg-black transition-opacity duration-300 ${isOpen ? "opacity-40" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      <div
        className="fixed bottom-0 left-0 right-0 z-[1000] h-[90vh] rounded-t-[20px] bg-white shadow-[0_-4px_40px_rgba(0,0,0,0.12)]"
        style={{
          transform: isOpen
            ? `translateY(${dragY}px)`
            : "translateY(100%)",
          transition: draggingRef.current
            ? "none"
            : "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mx-auto mt-3 h-1 w-9 rounded bg-[#E0DFF8]" />
        <div className="flex items-center justify-between px-4 pb-3 pt-3">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F4F0] text-xl font-semibold leading-none text-[#111110]"
            aria-label="Close sheet"
          >
            ×
          </button>
        </div>
        <div className="h-[calc(90vh-72px)] overflow-y-auto px-4 pb-5">{children}</div>
      </div>
    </>
  );
}
