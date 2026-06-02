export const FINKOIN_SPLIT_TOKEN_KEY = "finkoin_split_token";
export const FINKOIN_SPLIT_REDIRECT_KEY = "finkoin_split_redirect";

export function saveSplitInviteToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FINKOIN_SPLIT_TOKEN_KEY, token);
}

export function saveSplitInviteRedirect(path: string) {
  if (typeof window === "undefined") return;
  if (!path.startsWith("/")) return;
  localStorage.setItem(FINKOIN_SPLIT_REDIRECT_KEY, path);
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

  const splitRedirect = localStorage.getItem(FINKOIN_SPLIT_REDIRECT_KEY);
  if (splitRedirect?.startsWith("/")) {
    localStorage.removeItem(FINKOIN_SPLIT_REDIRECT_KEY);
    return splitRedirect;
  }

  const splitToken = localStorage.getItem(FINKOIN_SPLIT_TOKEN_KEY);
  if (splitToken) {
    localStorage.removeItem(FINKOIN_SPLIT_TOKEN_KEY);
    return `/split/join?token=${encodeURIComponent(splitToken)}`;
  }

  return fallback;
}
