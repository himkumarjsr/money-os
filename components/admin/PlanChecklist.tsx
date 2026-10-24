"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type { PlanTick } from "@/lib/adminConsole";
import type { PlanChecklistDoc } from "@/lib/adminDocs/planChecklist";

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function Progress({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#F0EFF8]">
        <div
          className="h-full rounded-full bg-[#1D9E75]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-[#5F5E5A]">
        {done}/{total}
      </span>
    </div>
  );
}

export function PlanChecklist({
  docs,
  initialTicks,
  canEdit,
  error: loadError,
}: {
  docs: readonly PlanChecklistDoc[];
  initialTicks: PlanTick[];
  canEdit: boolean;
  error: string | null;
}) {
  const [ticks, setTicks] = useState(
    () => new Map(initialTicks.map((t) => [t.itemId, t])),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(loadError);

  async function toggle(itemId: string, done: boolean) {
    if (!canEdit || busy) return;
    setBusy(itemId);
    setError(null);
    try {
      const res = await apiFetch("/api/admin/plan-checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, done }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ticks?: PlanTick[];
        error?: string;
      };
      if (!res.ok || !body.ticks) {
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      setTicks(new Map(body.ticks.map((t) => [t.itemId, t])));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const allIds = docs.flatMap((d) =>
    d.steps.flatMap((s) => s.items.map((i) => i.id)),
  );
  const doneTotal = allIds.filter((id) => ticks.has(id)).length;

  return (
    <section className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E8E6F0] bg-[#F7F7F4] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[#111110]">
            Overall progress
          </p>
          <p className="text-xs text-[#5F5E5A]">
            {canEdit
              ? "Tick an item when it's done. Changes save straight away."
              : "Read-only: only the super admin can tick items."}
          </p>
        </div>
        <Progress done={doneTotal} total={allIds.length} />
      </div>

      {error ? (
        <p className="rounded-lg bg-[#FCEBEB] px-3 py-2 text-sm text-[#E24B4A]">
          {error}
        </p>
      ) : null}

      {docs.map((doc) => {
        const ids = doc.steps.flatMap((s) => s.items.map((i) => i.id));
        const done = ids.filter((id) => ticks.has(id)).length;
        return (
          <details
            key={doc.id}
            open
            className="overflow-hidden rounded-xl border border-[#E8E6F0] bg-white"
          >
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3">
              <span className="text-base font-bold text-[#111110]">
                {doc.title}
              </span>
              <Progress done={done} total={ids.length} />
            </summary>
            <div className="space-y-4 border-t border-[#F0EFF8] px-4 py-4">
              {doc.steps.map((step) => (
                <div key={step.title}>
                  <p className="pb-1.5 text-xs font-semibold uppercase tracking-wide text-[#534AB7]">
                    {step.title}
                  </p>
                  <ul className="space-y-1">
                    {step.items.map((item) => {
                      const tick = ticks.get(item.id);
                      const checked = Boolean(tick);
                      return (
                        <li key={item.id}>
                          <label
                            className={`flex items-start gap-2.5 rounded-lg px-2 py-1.5 ${
                              canEdit
                                ? "cursor-pointer hover:bg-[#F7F7F4]"
                                : "cursor-default"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!canEdit || busy !== null}
                              onChange={(e) =>
                                void toggle(item.id, e.target.checked)
                              }
                              className="mt-0.5 h-4 w-4 shrink-0 accent-[#534AB7] disabled:opacity-70"
                            />
                            <span className="min-w-0">
                              <span
                                className={`text-sm ${
                                  checked
                                    ? "text-[#9B9A94] line-through"
                                    : "text-[#111110]"
                                }`}
                              >
                                {item.text}
                              </span>
                              {tick ? (
                                <span className="block text-xs text-[#9B9A94]">
                                  Done {formatDate(tick.doneAt)}
                                </span>
                              ) : null}
                              {busy === item.id ? (
                                <span className="block text-xs text-[#534AB7]">
                                  Saving…
                                </span>
                              ) : null}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        );
      })}
    </section>
  );
}
