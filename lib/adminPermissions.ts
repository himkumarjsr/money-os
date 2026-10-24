/**
 * Permission keys the super admin grants per console admin (migration 062).
 * The database is the authority; this mirrors its rules so the apps can
 * show or hide things, and validates input before it reaches the RPC.
 */

export type AdminFeatureKey = "fixplan_free" | "pro_free";

export const ADMIN_FEATURES: ReadonlyArray<{
  key: AdminFeatureKey;
  label: string;
  hint: string;
}> = [
  {
    key: "fixplan_free",
    label: "Use Fix Plan without paying",
    hint: "Opens /analyse/fixplan and its PDF for free.",
  },
  {
    key: "pro_free",
    label: "All Pro features without paying",
    hint: "Fix Plan, Money Map and anything else behind Pro.",
  },
];

/** Every admin console section; super admin only, never grantable. */
export const ALL_SECTIONS_KEY = "section:*";
export const ADMIN_ACCESS_SECTION = "admin-access";

export function sectionKey(id: string): string {
  return `section:${id}`;
}

const KEY_RE = /^(section:(\*|[a-z0-9-]{1,64})|fixplan_free|pro_free)$/;

/** Same rule as console_set_permissions: known shape, never admin-access. */
export function isGrantableKey(key: unknown): key is string {
  return (
    typeof key === "string" &&
    KEY_RE.test(key) &&
    key !== sectionKey(ADMIN_ACCESS_SECTION)
  );
}

/** Mirrors private.console_email_has_permission for the caller's own keys. */
export function hasAdminPermission(
  perms: readonly string[] | null | undefined,
  key: string,
): boolean {
  if (!perms || perms.length === 0) return false;
  if (perms.includes("*")) return true;
  if (key === sectionKey(ADMIN_ACCESS_SECTION)) return false;
  if (perms.includes(key)) return true;
  if (key.startsWith("section:") && perms.includes(ALL_SECTIONS_KEY))
    return true;
  return key === "fixplan_free" && perms.includes("pro_free");
}
