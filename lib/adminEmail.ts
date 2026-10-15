/** Same rule as private.console_admins in migration 053. */
const ADMIN_EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Lower-cased, trimmed email, or null when it can't be an admin email. */
export function normalizeAdminEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (!email || email.length > 254 || !ADMIN_EMAIL_RE.test(email)) return null;
  return email;
}
