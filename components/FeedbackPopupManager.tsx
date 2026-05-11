"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import FeedbackWidget from "@/components/FeedbackWidget";

const SHOW_AFTER_SECONDS = 120;
const PAGES_TO_TRACK = ["/calculators", "/tracker", "/learn", "/analyse", "/portfolio", "/optimizer"];

export default function FeedbackPopupManager() {
  const pathname = usePathname();
  const { isLoggedIn } = useAuthStore();

  const [show, setShow] = useState(false);
  const [context, setContext] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const path = pathname ?? "";
    const isTracked = PAGES_TO_TRACK.some((p) => path.startsWith(p));
    if (!isTracked) return;
    if (!isLoggedIn) return;

    const pageKey = path.split("/")[1] || "app";
    const storageKey = `finkoin_feedback_${pageKey}`;
    if (localStorage.getItem(storageKey)) {
      return;
    }

    const timer = setTimeout(() => {
      setContext(pageKey);
      setShow(true);
    }, SHOW_AFTER_SECONDS * 1000);

    return () => clearTimeout(timer);
  }, [pathname, isLoggedIn]);

  if (!show) return null;

  return (
    <>
      <div
        role="presentation"
        onClick={() => setShow(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 990,
          backdropFilter: "blur(2px)",
        }}
      />

      <div
        style={{
          position: "fixed",
          bottom: 90,
          left: 16,
          right: 16,
          background: "white",
          borderRadius: 20,
          boxShadow: "0 16px 60px rgba(83,74,183,0.2)",
          zIndex: 991,
          maxWidth: 420,
          margin: "0 auto",
          border: "1px solid #E8E6F0",
          overflow: "hidden",
          animation: "feedbackSlideUp 0.3s ease",
        }}
      >
        <style>{`
          @keyframes feedbackSlideUp {
            from {
              transform: translateY(30px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}</style>

        <div
          style={{
            background: "#534AB7",
            padding: "14px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>Quick feedback</div>
          <button
            type="button"
            onClick={() => setShow(false)}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: 6,
              width: 28,
              height: 28,
              cursor: "pointer",
              color: "white",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        <FeedbackWidget pageContext={context} onClose={() => setShow(false)} />
      </div>
    </>
  );
}
