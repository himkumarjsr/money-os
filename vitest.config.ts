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
  // Heavy DB side-effects — covered via e2e / manual
  "lib/referralRewards.ts",
];

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    include: ["lib/**/*.test.ts", "tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "text-summary"],
      include: ["lib/**/*.ts"],
      exclude: coverageExclude,
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 85,
        branches: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
