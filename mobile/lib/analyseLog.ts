import Constants from "expo-constants";
import { Platform } from "react-native";
import type {
  AnalyseFormValues,
  FinancialProfile,
} from "@/lib/analyse-form-schema";
import {
  buildAnalyseLogPayload,
  type AnalyseLogSource,
} from "@/lib/analyseLogPayload";
import type { AnalysisResult } from "@/lib/financialEngine";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

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
  if (!userId || !isSupabaseConfigured()) return;
  // Built after the report has rendered, so it never slows the page down.
  void new Promise((r) => setTimeout(r, 1000))
    .then(async () => {
      const payload = buildAnalyseLogPayload(input);
      const { error } = await getSupabase()
        .from("analyse_logs")
        .insert({
          user_id: userId,
          source: input.source,
          platform: Platform.OS,
          app_version: Constants.expoConfig?.version ?? null,
          check_count: payload.checks.length,
          payload,
        });
      if (error) console.warn("analyse log failed:", error.message);
    })
    .catch((e) => console.warn("analyse log failed:", e));
}
