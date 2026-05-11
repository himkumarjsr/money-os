"use client";

import { useEffect, useState } from "react";

interface Testimonial {
  id: string;
  rating: number;
  message: string;
  user_name: string;
  user_city: string;
  user_profession: string;
  score_at_time: number;
  created_at: string;
}

const CACHE_KEY = "finkoin_testimonials";
const CACHE_TTL = 24 * 60 * 60 * 1000;

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as { data?: Testimonial[]; fetchedAt?: number };
          const age = Date.now() - Number(parsed.fetchedAt ?? 0);
          if (age < CACHE_TTL && Array.isArray(parsed.data) && parsed.data.length > 0) {
            setTestimonials(parsed.data);
            setLoading(false);
            return;
          }
        }
      } catch {
        // ignore stale cache parse issues
      }

      try {
        const res = await fetch("/api/testimonials", { method: "GET", cache: "no-store" });
        const json = (await res.json()) as { testimonials?: Testimonial[] };
        const result = Array.isArray(json.testimonials) ? json.testimonials : [];
        setTestimonials(result);
        if (result.length > 0) {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, fetchedAt: Date.now() }));
        }
      } catch (err) {
        console.error("Testimonials fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading || testimonials.length === 0) return null;

  return (
    <section style={{ padding: "48px 16px", background: "#F7F7F4" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#534AB7",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            WHAT USERS SAY
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111110", margin: 0 }}>Real people, real results</h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {testimonials.map((t) => (
            <div key={t.id} style={{ background: "white", borderRadius: 16, padding: "20px", border: "1px solid #E8E6F0" }}>
              <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} style={{ color: "#534AB7", opacity: s <= t.rating ? 1 : 0.28 }}>
                    ★
                  </span>
                ))}
              </div>

              <p style={{ fontSize: 14, color: "#5F5E5A", lineHeight: 1.6, margin: "0 0 14px", fontStyle: "italic" }}>
                &ldquo;{t.message}&rdquo;
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "#EEEDFE",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#534AB7",
                    flexShrink: 0,
                  }}
                >
                  {(t.user_name || "U").substring(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111110" }}>{t.user_name || "Finkoin User"}</div>
                  <div style={{ fontSize: 11, color: "#9B9A94" }}>
                    {t.user_profession && t.user_city
                      ? `${t.user_profession} · ${t.user_city}`
                      : t.user_city || ""}
                  </div>
                </div>
                {t.score_at_time ? (
                  <div
                    style={{
                      background: "#EEEDFE",
                      color: "#534AB7",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 20,
                      flexShrink: 0,
                    }}
                  >
                    {t.score_at_time}/100
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
