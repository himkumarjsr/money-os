"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

/**
 * Super admin delete controls for the analyse logs list (migration 063).
 * The list itself stays server-rendered; these pieces share the selection
 * through context. Deleting removes the rows from the database for good.
 */

type DeleteState = {
  canDelete: boolean;
  allIds: number[];
  selected: Set<number>;
  deleted: Set<number>;
  busy: boolean;
  toggle: (id: number) => void;
  setAll: (on: boolean) => void;
  remove: (ids: number[]) => Promise<void>;
};

const Ctx = createContext<DeleteState | null>(null);

function useDeleteState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AnalyseLogsDelete pieces need the provider");
  return ctx;
}

export function AnalyseLogsDeleteProvider({
  canDelete,
  ids,
  children,
}: {
  canDelete: boolean;
  ids: number[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [deleted, setDeleted] = useState<Set<number>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const allIds = ids.filter((id) => !deleted.has(id));

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setAll(on: boolean) {
    setSelected(on ? new Set(allIds) : new Set());
  }

  async function remove(target: number[]) {
    if (!canDelete || busy || target.length === 0) return;
    const label =
      target.length === 1 ? "this log" : `these ${target.length} logs`;
    if (
      !window.confirm(
        `Permanently delete ${label} from the database? This can't be undone. The users' own data is not affected.`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch("/api/admin/analyse-logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: target }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        deleted?: number;
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDeleted((prev) => new Set([...prev, ...target]));
      setSelected((prev) => {
        const next = new Set(prev);
        target.forEach((id) => next.delete(id));
        return next;
      });
      const n = body.deleted ?? 0;
      setNotice(`Deleted ${n} log${n === 1 ? "" : "s"}.`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Ctx.Provider
      value={{
        canDelete,
        allIds,
        selected,
        deleted,
        busy,
        toggle,
        setAll,
        remove,
      }}
    >
      {error ? (
        <p className="rounded-xl border border-[#F0C9C9] bg-[#FDF3F3] p-3 text-sm text-[#A32D2D]">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-xl border border-[#CFE3BC] bg-[#EAF3DE] p-3 text-sm text-[#3B6D11]">
          {notice}
        </p>
      ) : null}
      {children}
    </Ctx.Provider>
  );
}

export function AnalyseLogsBulkBar() {
  const { canDelete, allIds, selected, busy, setAll, remove } =
    useDeleteState();
  if (!canDelete || allIds.length === 0) return null;
  const picked = allIds.filter((id) => selected.has(id));
  const allOn = picked.length === allIds.length;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E5E4DF] bg-[#FAFAF8] px-4 py-2 text-sm">
      <label className="flex items-center gap-2 text-[#5F5E5A]">
        <input
          type="checkbox"
          checked={allOn}
          onChange={(e) => setAll(e.target.checked)}
          disabled={busy}
        />
        Select all shown
      </label>
      <span className="text-[#5F5E5A]">{picked.length} selected</span>
      <button
        type="button"
        onClick={() => remove(picked)}
        disabled={busy || picked.length === 0}
        className="ml-auto rounded-lg bg-[#A32D2D] px-3 py-1.5 font-semibold text-white disabled:opacity-40"
      >
        {busy ? "Deleting…" : "Delete selected"}
      </button>
    </div>
  );
}

export function AnalyseLogSelect({ id }: { id: number }) {
  const { canDelete, selected, busy, toggle } = useDeleteState();
  if (!canDelete) return null;
  return (
    <input
      type="checkbox"
      aria-label="Select this log"
      checked={selected.has(id)}
      onChange={() => toggle(id)}
      disabled={busy}
      className="mt-3.5 shrink-0"
    />
  );
}

export function AnalyseLogDeleteButton({ id }: { id: number }) {
  const { canDelete, busy, remove } = useDeleteState();
  if (!canDelete) return null;
  return (
    <button
      type="button"
      onClick={() => remove([id])}
      disabled={busy}
      className="mt-2 shrink-0 rounded-lg border border-[#F0C9C9] px-2.5 py-1 text-xs font-semibold text-[#A32D2D] disabled:opacity-40"
    >
      Delete
    </button>
  );
}

/** Hides a row as soon as it is deleted, before the page refreshes. */
export function AnalyseLogRowGate({
  id,
  children,
}: {
  id: number;
  children: ReactNode;
}) {
  const { deleted } = useDeleteState();
  return deleted.has(id) ? null : <>{children}</>;
}
