import type { AnalyseLogRow } from "@/lib/adminConsole";
import {
  buildAnalyseLogSheet,
  inr,
  type SheetRow,
  type SheetSection,
} from "@/lib/analyseLogSheet";

/**
 * Server-rendered list of analyse logs (migration 057). Filters are a plain
 * GET form, so the page needs no client JS. Click a row for its calculation
 * sheet: what the user entered, then every number built from it.
 */

const RAW: Array<[string, (p: Record<string, unknown>) => unknown]> = [
  ["Form answers", (p) => p.form],
  ["Profile", (p) => p.profile],
  ["Steps", (p) => p.steps],
  ["Report", (p) => p.result],
];

function SheetRows({ rows }: { rows: SheetRow[] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r, i) => (
          <tr
            key={i}
            className={`border-b border-[#EEEDE8] last:border-0 ${r.flag ? "bg-[#FDF3F3]" : ""}`}
          >
            <td
              className={`py-1.5 pr-3 align-top text-[#2C2C2A] ${r.total ? "font-semibold" : ""}`}
            >
              {r.label}
            </td>
            <td
              className={`whitespace-nowrap py-1.5 pr-3 text-right align-top tabular-nums text-[#111110] ${r.total ? "font-semibold" : ""}`}
            >
              {r.value}
            </td>
            <td className="py-1.5 align-top text-xs text-[#5F5E5A]">
              {r.note}
              {r.flag ? (
                <span className="block font-semibold text-[#A32D2D]">
                  ⚠ {r.flag}
                </span>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SheetView({ section }: { section: SheetSection }) {
  return (
    <section className="rounded-lg border border-[#E5E4DF] p-3">
      <h3 className="mb-2 text-sm font-bold text-[#111110]">{section.title}</h3>
      {section.rows ? <SheetRows rows={section.rows} /> : null}
      {section.groups ? (
        <div className="grid gap-4 md:grid-cols-2">
          {section.groups.map((g) => (
            <div key={g.title}>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#5F5E5A]">
                {g.title}
              </h4>
              <SheetRows rows={g.rows} />
            </div>
          ))}
        </div>
      ) : null}
      {section.table ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E4DF] text-left text-xs text-[#5F5E5A]">
                {section.table.head.map((h) => (
                  <th key={h} className="py-1.5 pr-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-[#EEEDE8] last:border-0 align-top ${
                    section.table?.flagged?.includes(i) ? "bg-[#FDF3F3]" : ""
                  }`}
                >
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`py-1.5 pr-3 text-[#2C2C2A] ${j === row.length - 1 && row.length > 5 ? "min-w-[260px] text-xs" : "whitespace-nowrap"}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function headline(payload: Record<string, unknown>) {
  const steps = (payload.steps ?? {}) as Record<string, unknown>;
  const surplus = (steps.surplus ?? {}) as Record<string, unknown>;
  const score = (steps.moneyScore ?? {}) as Record<string, unknown>;
  const parts: string[] = [];
  if (surplus.totalIncome != null)
    parts.push(`Income ${inr(surplus.totalIncome)}`);
  if (surplus.netSurplus != null)
    parts.push(`Surplus ${inr(surplus.netSurplus)}`);
  if (score.total != null) parts.push(`Score ${String(score.total)}`);
  return parts.join(" · ");
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      });
}

export function AnalyseLogsViewer({
  logs,
  email,
  onlyChecks,
  error,
}: {
  logs: AnalyseLogRow[];
  email: string;
  onlyChecks: boolean;
  error?: string | null;
}) {
  return (
    <div className="mt-6 space-y-4">
      <form
        method="get"
        className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E5E4DF] bg-[#FAFAF8] p-3"
      >
        <input
          type="email"
          name="email"
          defaultValue={email}
          placeholder="Filter by email"
          className="min-w-0 flex-1 rounded-lg border border-[#E5E4DF] bg-[#FFFFFF] px-3 py-2 text-sm text-[#111110]"
        />
        <label className="flex items-center gap-2 text-sm text-[#5F5E5A]">
          <input
            type="checkbox"
            name="checks"
            value="1"
            defaultChecked={onlyChecks}
          />
          Only reports with checks
        </label>
        <button
          type="submit"
          className="rounded-lg bg-[#534AB7] px-4 py-2 text-sm font-semibold text-white"
        >
          Show
        </button>
      </form>

      {error ? (
        <p className="rounded-xl border border-[#F0C9C9] bg-[#FDF3F3] p-3 text-sm text-[#A32D2D]">
          Couldn&apos;t load logs: {error}. If the table is missing, run
          migration 057 in the Supabase SQL editor.
        </p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-[#5F5E5A]">No logs yet.</p>
      ) : (
        <ul className="space-y-3">
          {logs.map((log) => (
            <li
              key={log.id}
              className="rounded-xl border border-[#E5E4DF] bg-[#FFFFFF]"
            >
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
                  <span className="font-semibold text-[#111110]">
                    {log.email ?? "unknown user"}
                  </span>
                  <span className="text-[#5F5E5A]">
                    {formatTime(log.createdAt)}
                  </span>
                  <span className="text-[#5F5E5A]">
                    {headline(log.payload)}
                  </span>
                  <span className="rounded bg-[#F1EFE8] px-2 py-0.5 text-xs text-[#5F5E5A]">
                    {log.source === "form_submit"
                      ? "Form submit"
                      : "Profile edit"}
                    {log.platform ? ` · ${log.platform}` : ""}
                    {log.appVersion ? ` · v${log.appVersion}` : ""}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      log.checkCount > 0
                        ? "bg-[#FCEBEB] text-[#A32D2D]"
                        : "bg-[#EAF3DE] text-[#3B6D11]"
                    }`}
                  >
                    {log.checkCount > 0
                      ? `${log.checkCount} check${log.checkCount === 1 ? "" : "s"}`
                      : "Numbers agree"}
                  </span>
                </summary>
                <div className="space-y-3 border-t border-[#E5E4DF] px-4 py-3">
                  {buildAnalyseLogSheet(log.payload).map((section) => (
                    <SheetView key={section.title} section={section} />
                  ))}
                  <details>
                    <summary className="cursor-pointer text-sm font-medium text-[#5F5E5A]">
                      Raw data
                    </summary>
                    {RAW.map(([title, pick]) => {
                      const value = pick(log.payload);
                      if (value == null) return null;
                      return (
                        <details key={title} className="mt-2">
                          <summary className="cursor-pointer text-sm text-[#111110]">
                            {title}
                          </summary>
                          <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-[#F7F6F2] p-3 text-xs leading-relaxed text-[#2C2C2A]">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        </details>
                      );
                    })}
                  </details>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
