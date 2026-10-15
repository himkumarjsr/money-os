/** `/analyse` opens the saved report when there is one; this opens the form. */
export const ANALYSE_RETAKE_HREF = "/analyse?retake=1";

export function isAnalyseRetake(search: string): boolean {
  return new URLSearchParams(search).has("retake");
}
