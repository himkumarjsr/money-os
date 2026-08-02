export const FINKOIN_SPLIT_TOKEN_KEY = "finkoin_split_token";
export const FINKOIN_SPLIT_REDIRECT_KEY = "finkoin_split_redirect";

const INVITE_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days — matches open invites

function canUseDom() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function setInviteCookie(name: string, value: string) {
  if (!canUseDom()) return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${INVITE_COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

function getInviteCookie(name: string): string | null {
  if (!canUseDom()) return null;
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq) !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1));
    } catch {
      return part.slice(eq + 1);
    }
  }
  return null;
}

function clearInviteCookie(name: string) {
  if (!canUseDom()) return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function saveSplitInviteToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FINKOIN_SPLIT_TOKEN_KEY, token);
  // Cookie helps iOS: Safari / WhatsApp WebView storage is siloed from the PWA.
  setInviteCookie(FINKOIN_SPLIT_TOKEN_KEY, token);
}

export function saveSplitInviteRedirect(path: string) {
  if (typeof window === "undefined") return;
  if (!path.startsWith("/")) return;
  localStorage.setItem(FINKOIN_SPLIT_REDIRECT_KEY, path);
  setInviteCookie(FINKOIN_SPLIT_REDIRECT_KEY, path);
}

/** Normalize a next/redirect query value to an in-app path. */
export function sanitizeAppPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim();
  try {
    // URLSearchParams usually decodes once; tolerate a still-encoded value.
    if (!value.startsWith("/") && /%2F/i.test(value)) {
      value = decodeURIComponent(value);
    } else if (value.startsWith("%2F")) {
      value = decodeURIComponent(value);
    }
  } catch {
    return null;
  }
  if (!value.startsWith("/")) return null;
  // Block protocol-relative / open redirects
  if (value.startsWith("//")) return null;
  return value;
}

function peekStoredSplitPath(): string | null {
  if (typeof window === "undefined") return null;

  const splitRedirect =
    localStorage.getItem(FINKOIN_SPLIT_REDIRECT_KEY) ||
    getInviteCookie(FINKOIN_SPLIT_REDIRECT_KEY);
  if (splitRedirect?.startsWith("/")) return splitRedirect;

  const splitToken =
    localStorage.getItem(FINKOIN_SPLIT_TOKEN_KEY) ||
    getInviteCookie(FINKOIN_SPLIT_TOKEN_KEY);
  if (splitToken) {
    return `/split/join?token=${encodeURIComponent(splitToken)}`;
  }
  return null;
}

/** Read-only: never clears invite localStorage / cookies. */
export function peekPostLoginPath(
  search: string,
  fallback = "/analyse",
): string {
  if (typeof window === "undefined") return fallback;

  const params = new URLSearchParams(search);
  const fromQuery = sanitizeAppPath(
    params.get("next") || params.get("redirect"),
  );
  if (fromQuery) return fromQuery;

  return peekStoredSplitPath() ?? fallback;
}

/** Clear invite backup only after a successful join (or explicit dismiss). */
export function clearSplitInviteRedirect() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(FINKOIN_SPLIT_REDIRECT_KEY);
  localStorage.removeItem(FINKOIN_SPLIT_TOKEN_KEY);
  clearInviteCookie(FINKOIN_SPLIT_REDIRECT_KEY);
  clearInviteCookie(FINKOIN_SPLIT_TOKEN_KEY);
}

/**
 * Resolve post-login destination. Prefer peek + clear after navigation succeeds.
 * Kept for callers that need a single resolve; does not clear until consume=true.
 */
export function resolvePostLoginPath(
  search: string,
  fallback = "/analyse",
  opts?: { consume?: boolean },
): string {
  const path = peekPostLoginPath(search, fallback);
  if (opts?.consume && path !== fallback) {
    // Only clear when destination came from stored invite (not from URL next).
    const fromQuery = sanitizeAppPath(
      new URLSearchParams(search).get("next") ||
        new URLSearchParams(search).get("redirect"),
    );
    if (!fromQuery && peekStoredSplitPath()) {
      clearSplitInviteRedirect();
    }
  }
  return path;
}
