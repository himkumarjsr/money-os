import type {
  AnalyseFormValues,
  FinancialProfile,
} from "@/lib/analyse-form-schema";
import { getAppSurface } from "@/lib/analyticsContext";
import {
  buildAnalyseLogPayload,
  type AnalyseLogSource,
} from "@/lib/analyseLogPayload";
import { buildAnalyseLogSheet, type SheetRow } from "@/lib/analyseLogSheet";
import type { AnalysisResult } from "@/lib/financialEngine";
import { supabase } from "@/lib/supabaseClient";

const rowsForTable = (rows: SheetRow[]) =>
  rows.map((r) => ({
    item: r.label,
    value: r.value,
    how: r.note ?? "",
    ...(r.flag ? { problem: r.flag } : {}),
  }));

/**
 * Prints the report's calculation sheet to the browser console (Inspect →
 * Console, look for "Finkoin Analyse") and keeps the full payload on
 * `window.__finkoinAnalyseLog`.
 */
function printAnalyseLog(payload: ReturnType<typeof buildAnalyseLogPayload>) {
  try {
    (window as unknown as Record<string, unknown>).__finkoinAnalyseLog =
      payload;
    console.groupCollapsed(
      `%cFinkoin Analyse%c ${payload.source} · ${
        payload.checks.length
          ? `${payload.checks.length} number(s) disagree`
          : "numbers agree"
      }`,
      "background:#534AB7;color:#fff;padding:2px 6px;border-radius:4px",
      payload.checks.length ? "color:#A32D2D" : "color:#3B6D11",
    );
    for (const section of buildAnalyseLogSheet(
      payload as unknown as Record<string, unknown>,
    )) {
      console.group(section.title);
      if (section.rows) console.table(rowsForTable(section.rows));
      for (const g of section.groups ?? []) {
        console.log(g.title);
        console.table(rowsForTable(g.rows));
      }
      if (section.table) {
        const head = section.table.head;
        console.table(
          section.table.rows.map((row) =>
            Object.fromEntries(head.map((h, i) => [h, row[i]])),
          ),
        );
      }
      console.groupEnd();
    }
    console.log("Full data:", payload);
    console.groupEnd();
  } catch (e) {
    console.warn("analyse console log failed:", e);
  }
}

/**
 * Appends one row to `analyse_logs` (migration 057) each time a report is
 * generated. Fire-and-forget: a failed log never blocks or breaks the report.
 */
export function logAnalyseRun(
  userId: string | null | undefined,
  input: {
    source: AnalyseLogSource;
    profile: FinancialProfile;
    result: AnalysisResult;
    form?: Partial<AnalyseFormValues> | null;
  },
): void {
  const client = supabase;
  // Built after the report has rendered, so it never slows the page down.
  void new Promise((r) => setTimeout(r, 1000))
    .then(async () => {
      const payload = buildAnalyseLogPayload(input);
      printAnalyseLog(payload);
      if (!userId || !client) return;
      const { error } = await client.from("analyse_logs").insert({
        user_id: userId,
        source: input.source,
        platform: getAppSurface() === "pwa" ? "pwa" : "web",
        app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
        check_count: payload.checks.length,
        payload,
      });
      if (error) console.warn("analyse log failed:", error.message);
    })
    .catch((e) => console.warn("analyse log failed:", e));
}
