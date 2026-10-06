/** Fix Plan paywall copy shared by web and mobile, so the button never implies a charge that won't happen. */

export function paywallConfirmLabel(opts: {
  paymentsEnabled: boolean;
  priceInr: number;
  loading?: boolean;
}): string {
  if (!opts.paymentsEnabled) return "Continue — payments coming soon";
  if (opts.loading) return "Opening secure checkout...";
  return `Confirm and unlock ₹${opts.priceInr}`;
}

/** Shown under the price when nothing will be charged; null when payments are live. */
export function paywallPriceNote(paymentsEnabled: boolean): string | null {
  return paymentsEnabled
    ? null
    : "You won't be charged — payments aren't switched on yet.";
}
