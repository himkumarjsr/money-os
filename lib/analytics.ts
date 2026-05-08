export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (typeof window === "undefined") return;
  if (!window.gtag) return;

  window.gtag("event", eventName, {
    ...parameters,
    timestamp: new Date().toISOString(),
  });
};

export const Analytics = {
  formStarted: () =>
    trackEvent("form_started", {
      feature: "financial_health",
    }),

  formCompleted: (score: number) =>
    trackEvent("form_completed", {
      feature: "financial_health",
      score_range: score < 40 ? "poor" : score < 70 ? "average" : "good",
    }),

  paywallViewed: () => trackEvent("paywall_viewed"),

  paymentStarted: (amount: number) =>
    trackEvent("payment_started", {
      value: amount,
      currency: "INR",
    }),

  paymentCompleted: (amount: number) =>
    trackEvent("purchase", {
      value: amount,
      currency: "INR",
      items: [
        {
          item_name: "fix_plan",
          price: amount,
        },
      ],
    }),

  taxCalculatorUsed: () => trackEvent("tax_calculator_used"),

  trackerExpenseAdded: (bucket: string) =>
    trackEvent("expense_added", {
      bucket,
    }),

  reportViewed: (score: number) =>
    trackEvent("report_viewed", {
      score,
    }),

  fixPlanViewed: () => trackEvent("fix_plan_viewed"),

  referralLinkCopied: () => trackEvent("referral_link_copied"),

  scoreShared: (platform: string) =>
    trackEvent("score_shared", {
      platform,
    }),
};
