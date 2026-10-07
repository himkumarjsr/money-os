"use client";

import { getSupabase } from "@/lib/supabase";
import {
  deletePlannedInvestment,
  fetchPlannedInvestments,
  formatStartMonth,
  setPlannedInvestmentStatus,
  type PlannedInvestment,
} from "@/lib/plannedInvestments";
import { useCallback, useEffect, useMemo, useState } from "react";

/** Fix Plan reminders the user consented to; they start each SIP themselves and mark it here. */
export default function PlannedInvestmentsSection({ userId }: { userId: string }) {
  const [rows, setRows] = useState<PlannedInvestment[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setRows(await fetchPlannedInvestments(getSupabase(), userId));
    } catch {
      setRows([]);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; rows: PlannedInvestment[] }>();
    for (const r of rows) {
      const g = map.get(r.source_id) ?? { label: r.source_label, rows: [] };
      g.rows.push(r);
      map.set(r.source_id, g);
    }
    return Array.from(map.entries());
  }, [rows]);

  if (rows.length === 0) return null;

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    setError("");
    try {
      await fn();
      await load();
    } catch {
      setError("Couldn't update that. Check your connection and try again.");
    } finally {
      setBusyId(null);
    }
  };

  const total = rows.reduce((s, r) => s + r.monthly_amount, 0);
  const started = rows.filter((r) => r.status !== "pending").length;

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-[#E8E6F0]">
      <div className="flex items-baseline justify-between gap-3 bg-[#EEEDFE] px-3.5 py-2.5">
        <div className="text-[13px] font-bold text-[#534AB7]">
          Planned investments
        </div>
        <div className="text-[12px] font-semibold text-[#534AB7]">
          ₹{total.toLocaleString("en-IN")}/mo · {started}/{rows.length} started
        </div>
      </div>
      {groups.map(([sourceId, g]) => (
        <div key={sourceId} className="border-b border-[#F7F7F4] px-3.5 py-2.5 last:border-b-0">
          <div className="mb-1 text-[13px] font-semibold text-[#111110]">{g.label}</div>
          {g.rows.map((r) => {
            const isStarted = r.status !== "pending";
            const busy = busyId === r.id;
            return (
              <div key={r.id} className="flex items-center gap-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-[#454442]">{r.instrument_label}</div>
                  <div className="text-[11px] text-[#7A7871]">
                    ₹{r.monthly_amount.toLocaleString("en-IN")}/mo ·{" "}
                    {isStarted ? "✓ Started" : `Starts ${formatStartMonth(r.start_month)}`}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(r.id, () =>
                      setPlannedInvestmentStatus(
                        getSupabase(),
                        userId,
                        r.id,
                        isStarted ? "pending" : "started",
                      ),
                    )
                  }
                  className={`min-h-[44px] rounded-lg px-3 text-[12px] font-bold disabled:opacity-50 ${
                    isStarted
                      ? "bg-[#F1F0EC] text-[#5F5E5A]"
                      : "bg-[#534AB7] text-white"
                  }`}
                >
                  {isStarted ? "Undo" : "Mark started"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Remove ${r.instrument_label} for ${g.label}`}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Remove the ${r.instrument_label} reminder for ${g.label}?`,
                      )
                    ) {
                      return;
                    }
                    void run(r.id, () =>
                      deletePlannedInvestment(getSupabase(), userId, r.id),
                    );
                  }}
                  className="min-h-[44px] rounded-lg px-2 text-[12px] font-semibold text-[#E24B4A] disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      ))}
      <div className="border-t border-[#F7F7F4] px-3.5 py-2 text-[11px] text-[#9B9A94]">
        Reminders only. Nothing is invested automatically. Start each SIP
        yourself, then mark it started.
      </div>
      {error ? (
        <div className="px-3.5 pb-2 text-[12px] text-[#E24B4A]">{error}</div>
      ) : null}
    </div>
  );
}
