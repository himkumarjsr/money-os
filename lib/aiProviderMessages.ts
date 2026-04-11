/** Pulls human-readable window from Groq error text, e.g. "1h30m21.6s". */
export function parseGroqRetryInText(text: string): string | null {
  if (!text) return null;
  const m = text.match(/try again in\s+([^.]+?)\./i);
  return m?.[1]?.trim() ?? null;
}

export function formatAiRateLimitNotice(retryIn: string | null): string {
  const when = retryIn ? ` Try again in about ${retryIn}.` : " Try again in a little while.";
  return `Our AI provider hit a usage limit.${when} You’re seeing a built‑in plan below.`;
}

/** @deprecated Prefer {@link formatAiTimeoutNotice} so the limit matches client config. */
export const AI_TIMEOUT_NOTICE =
  "The AI request took too long. You’re seeing a built‑in plan — try again in a moment.";

export function formatAiTimeoutNotice(limitSeconds: number): string {
  const sec = Math.max(1, Math.round(limitSeconds));
  const min = Math.max(1, Math.round(sec / 60));
  const limitPhrase =
    min <= 1 ? "about a minute" : min === 2 ? "about 2 minutes" : `about ${min} minutes`;
  return `The AI didn’t finish in time (we stop waiting after ${limitPhrase}). You’re seeing a built‑in plan — try again after a short wait.`;
}
