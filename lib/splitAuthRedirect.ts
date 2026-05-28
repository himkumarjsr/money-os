export const FINKOIN_SPLIT_TOKEN_KEY = "finkoin_split_token";

export function saveSplitInviteToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FINKOIN_SPLIT_TOKEN_KEY, token);
}

export function resolvePostLoginPath(
  search: string,
  fallback = "/analyse",
): string {
  if (typeof window === "undefined") return fallback;

  const params = new URLSearchParams(search);
  const next = params.get("next") || params.get("redirect");
  if (next) {
    try {
      const decoded = decodeURIComponent(next);
      if (decoded.startsWith("/")) return decoded;
    } catch {
      /* ignore malformed next */
    }
  }

  const splitToken = localStorage.getItem(FINKOIN_SPLIT_TOKEN_KEY);
  if (splitToken) {
    localStorage.removeItem(FINKOIN_SPLIT_TOKEN_KEY);
    return `/split/join?token=${encodeURIComponent(splitToken)}`;
  }

  return fallback;
}
