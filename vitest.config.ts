import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Coverage gate focuses on pure business logic under `lib/`.
 * Infra (Supabase clients), AI/PDF/export, and large content modules are
 * excluded — those need integration / e2e coverage instead.
 */
const coverageExclude = [
  "node_modules/**",
  ".next/**",
  "tests/**",
  "**/*.config.*",
  "lib/**/*.test.ts",
  "lib/supabase.ts",
  "lib/supabaseClient.ts",
  "lib/supabaseServer.ts",
  "lib/aiService.ts",
  "lib/aiProviderMessages.ts",
  "lib/generatePDF.ts",
  "lib/exportExcel.ts",
  "lib/gtag.ts",
  "lib/analytics.ts",
  "lib/analyticsContext.ts",
  "lib/animations.ts",
  "lib/blogContent.ts",
  "lib/learnContent.ts",
  "lib/learnArticleFaqs.ts",
  "lib/learnRichArticles.ts",
  "lib/seo.ts",
  "lib/learnSeo.ts",
  "lib/googleFeedbackForm.ts",
  "lib/finkoinAiPlan.ts",
  "lib/payment.ts",
  "lib/kycVerification.ts",
  "lib/syncProfileAssets.ts",
  "lib/userAnalyseSnapshot.ts",
  "lib/userPolicies.ts",
  "lib/auth.ts",
  "lib/authSession.ts",
  "lib/analyse-form-schema.ts",
  "lib/taxRegimeComparisonFY2026.ts",
  "lib/taxMissedDeductionAlerts.ts",
  "lib/taxTeachContent.ts",
  "lib/trackerProfileIncome.ts",
  // Static blog/content modules — not unit-tested business logic
  "lib/data/**",
  // Re-export barrel only
  "lib/knowledgeBase/index.ts",
  // Large combinatorics — covered by dedicated *.test.ts + tracker/analyse e2e
  "lib/financialEngine.ts",
  "lib/trackerCreditCards.ts",
  // Heavy DB side-effects — covered via e2e / manual
  "lib/referralRewards.ts",
];

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    include: [
      "lib/**/*.test.ts",
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.test.tsx",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "text-summary"],
      include: ["lib/**/*.ts"],
      exclude: coverageExclude,
      thresholds: {
        lines: 95,
        statements: 95,
        functions: 95,
        // Combinatorial engines still drag global branches; Split notify +
        // webPush are gated at ≥90–95% via per-file thresholds below.
        branches: 84,
        "lib/splitExpenseNotify.ts": {
          lines: 95,
          statements: 95,
          functions: 95,
          branches: 95,
        },
        "lib/webPush.ts": {
          lines: 95,
          statements: 95,
          functions: 95,
          branches: 95,
        },
        "lib/feedbackPrompt.ts": {
          lines: 95,
          statements: 95,
          functions: 95,
          branches: 95,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
