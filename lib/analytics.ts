declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    clarity?: (...args: any[]) => void;
  }
}

export const Analytics = {
  event: (eventName: string, params?: Record<string, any>) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", eventName, params);
    }
    if (typeof window !== "undefined" && window.clarity) {
      window.clarity("event", eventName);
    }
  },

  healthCheckStarted: () => Analytics.event("health_check_started"),
  healthCheckCompleted: (score: number) =>
    Analytics.event("health_check_completed", { score }),
  fixPlanViewed: () => Analytics.event("fix_plan_viewed"),
  fixPlanPurchased: () => Analytics.event("fix_plan_purchased"),
  calculatorUsed: (type: string) =>
    Analytics.event("calculator_used", { calculator_type: type }),
  splitGroupCreated: () => Analytics.event("split_group_created"),
  splitExpenseAdded: () => Analytics.event("split_expense_added"),
  splitInviteSent: () => Analytics.event("split_invite_sent"),
  referralLinkCopied: () => Analytics.event("referral_link_copied"),
  feedbackSubmitted: (rating: number) =>
    Analytics.event("feedback_submitted", { rating }),
  loginCompleted: (method: string) =>
    Analytics.event("login_completed", { method }),

  // backward compatibility wrappers
  formStarted: () => Analytics.healthCheckStarted(),
  formCompleted: (score: number) => Analytics.healthCheckCompleted(score),
  paywallViewed: () => Analytics.event("paywall_viewed"),
  paymentStarted: (amount: number) =>
    Analytics.event("payment_started", { value: amount, currency: "INR" }),
  paymentCompleted: (amount: number) =>
    Analytics.event("purchase", {
      value: amount,
      currency: "INR",
      items: [{ item_name: "fix_plan", price: amount }],
    }),
  taxCalculatorUsed: () => Analytics.event("tax_calculator_used"),
  trackerExpenseAdded: (bucket: string) =>
    Analytics.event("expense_added", { bucket }),
  reportViewed: (score: number) => Analytics.event("report_viewed", { score }),
  scoreShared: (platform: string) =>
    Analytics.event("score_shared", { platform }),
};
