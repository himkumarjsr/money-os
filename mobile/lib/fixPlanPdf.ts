import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import type { AnalysisResult } from "@/lib/financialEngine";
import type { PriorityPlan } from "@/lib/priorityEngine";
import { siteBase } from "@/lib/splitApi";
import type { FixPlanExplanations } from "@/lib/fixPlanMerge";
import { getSupabase } from "@/lib/supabase";

export type { FixPlanExplanations };

export type FixPlanPdfInput = {
  profile: FinancialProfile;
  result: AnalysisResult;
  priorityPlan: PriorityPlan;
  explanations: FixPlanExplanations;
};

const TIMEOUT_MS = 60_000;
const FALLBACK_FILE_NAME = "Finkoin-Fix-Plan.pdf";

function fileNameFrom(disposition: string | null): string {
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  const name = match?.[1]?.replace(/[^a-zA-Z0-9._-]/g, "") ?? "";
  return name.toLowerCase().endsWith(".pdf") ? name : FALLBACK_FILE_NAME;
}

function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

async function errorFromResponse(res: Response): Promise<string> {
  if (res.status === 401) return "Sign in again to download your plan.";
  if (res.status === 429) {
    return "You've downloaded a lot of PDFs recently. Please try again later.";
  }
  try {
    const json = (await res.json()) as { error?: unknown };
    if (typeof json?.error === "string" && json.error) return json.error;
  } catch {
    // Non-JSON error body.
  }
  return "Couldn't create your PDF right now. Please try again.";
}

/** Generate the Fix Plan PDF and open the share sheet. */
export async function shareFixPlanPdf(
  input: FixPlanPdfInput,
): Promise<{ error?: string }> {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      return { error: "Sharing isn't available on this device." };
    }

    const {
      data: { session },
    } = await getSupabase().auth.getSession();
    const token = session?.access_token;
    if (!token) return { error: "Sign in again to download your plan." };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    let bytes: Uint8Array;
    try {
      res = await fetch(`${siteBase()}/api/analyse/pdf`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/pdf",
        },
        body: JSON.stringify({ ...input, timeZone: deviceTimeZone() }),
        signal: controller.signal,
      });
      if (!res.ok) return { error: await errorFromResponse(res) };
      bytes = new Uint8Array(await res.arrayBuffer());
    } catch (e) {
      const aborted = e instanceof Error && e.name === "AbortError";
      return {
        error: aborted
          ? "Creating your PDF took too long. Check your connection and try again."
          : "Network error. Check your connection and try again.",
      };
    } finally {
      clearTimeout(timer);
    }

    if (bytes.byteLength === 0) {
      return { error: "Couldn't create your PDF right now. Please try again." };
    }

    const file = new File(
      Paths.cache,
      fileNameFrom(res.headers.get("content-disposition")),
    );
    file.create({ overwrite: true });
    file.write(bytes);

    await Sharing.shareAsync(file.uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: "Your Finkoin Fix Plan",
    });
    return {};
  } catch {
    return { error: "Couldn't save or share your PDF. Please try again." };
  }
}
