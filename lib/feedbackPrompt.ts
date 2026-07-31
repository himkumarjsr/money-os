/** Per-product feedback prompt persistence (local, user-scoped when possible). */

export function productKeyFromPath(path: string) {
  return path.split("/").filter(Boolean)[0] || "app";
}

function feedbackKeys(pageKey: string, userId?: string | null) {
  const legacy = `finkoin_feedback_${pageKey}`;
  if (userId) return [`finkoin_feedback_${userId}_${pageKey}`, legacy];
  return [legacy];
}

export function hasAskedForProduct(pageKey: string, userId?: string | null) {
  if (typeof window === "undefined") return false;
  try {
    return feedbackKeys(pageKey, userId).some(
      (key) => window.localStorage.getItem(key) === "1",
    );
  } catch {
    return false;
  }
}

/** Persist once asked / submitted so we never re-prompt for that product. */
export function markFeedbackAsked(pageKey: string, userId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    for (const key of feedbackKeys(pageKey, userId)) {
      window.localStorage.setItem(key, "1");
    }
  } catch {
    /* ignore quota / private mode */
  }
}
