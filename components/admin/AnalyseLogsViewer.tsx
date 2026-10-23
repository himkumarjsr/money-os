import type { AnalyseLogRow } from "@/lib/adminConsole";

/**
 * Server-rendered list of analyse logs (migration 057). Filters are a plain
 * GET form, so the page needs no client JS.
 */

const SECTIONS: Array<[string, (p: Record<string, unknown>) => unknown]> = [
  ["Checks", (p) => p.checks],
  ["Form answers", (p) => p.form],
  ["Profile", (p) => p.profile],
  ["Surplus", (p) => (p.steps as Record<string, unknown>)?.surplus],
  ["Priority steps", (p) => (p.steps as Record<string, unknown>)?.priorities],
  ["Safety fund", (p) => (p.steps as Record<string, unknown>)?.safetyFund],
  ["Goals", (p) => (p.steps as Record<string, unknown>)?.goals],
  ["Earmarks", (p) => (p.steps as Record<string, unknown>)?.earmarks],
  [
    "Goal strategies",
    (p) => (p.steps as Record<string, unknown>)?.goalStrategies,
  ],
  ["Money score", (p) => (p.steps as Record<string, unknown>)?.moneyScore],
  ["Report", (p) => p.result],
];

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
                <div className="space-y-2 border-t border-[#E5E4DF] px-4 py-3">
                  {SECTIONS.map(([title, pick]) => {
                    const value = pick(log.payload);
                    if (value == null) return null;
                    return (
                      <details
                        key={title}
                        open={title === "Checks" && log.checkCount > 0}
                      >
                        <summary className="cursor-pointer text-sm font-medium text-[#111110]">
                          {title}
                        </summary>
                        <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-[#F7F6F2] p-3 text-xs leading-relaxed text-[#2C2C2A]">
                          {JSON.stringify(value, null, 2)}
                        </pre>
                      </details>
                    );
                  })}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
