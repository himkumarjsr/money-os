/** Emails that unlock Pro UX without Razorpay (internal / demo). */
const PRO_PAYWALL_BYPASS_EMAILS = ["finkoin.os@gmail.com"];

export function canBypassProPaywall(
  email: string | null | undefined,
  isAdmin?: boolean | null,
): boolean {
  if (isAdmin) return true;
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  return PRO_PAYWALL_BYPASS_EMAILS.includes(e);
}
