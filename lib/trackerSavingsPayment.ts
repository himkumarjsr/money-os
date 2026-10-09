/**
 * "Paid from RD savings": a yearly premium paid out of money already set
 * aside each month (the `premium_rd` RD / savings contributions). Those
 * monthly contributions were counted in Security and in Money Left when they
 * were made, so the premium itself must not count again.
 */
export const RD_SAVINGS_PAYMENT_METHOD = "rd_savings";

export function isPaidFromSavings(txn: {
  payment_method?: string | null;
}): boolean {
  return (
    (txn.payment_method || "").trim().toLowerCase() ===
    RD_SAVINGS_PAYMENT_METHOD
  );
}
