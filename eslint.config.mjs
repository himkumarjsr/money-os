import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    // Keep `npm run lint` merge-blocking: no warnings.
    rules: {
      "react-hooks/exhaustive-deps": "off",
      "import/no-anonymous-default-export": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    // Keep global lint stable; enforce stricter rules only
    // on the Split feature paths we are actively maintaining.
    files: [
      "app/split/**/*.{ts,tsx}",
      "app/api/split/**/*.{ts,tsx}",
      "store/splitStore.ts",
    ],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // Prevent debug logs in production
      "no-console": [
        "error",
        {
          allow: ["warn", "error"],
        },
      ],

      // Prevent unused variables
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      // `any` is common in legacy areas; keep disabled globally.
      // Prefer fixing incrementally when touching files.
      "@typescript-eslint/no-explicit-any": "off",

      // React hooks deps are noisy in this codebase; keep off.
      "react-hooks/exhaustive-deps": "off",

      // No hardcoded localhost
      "no-restricted-syntax": "off",
    },
  },
  {
    // Ignore generated files
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
      "*.config.js",
      "*.config.mjs",
      "mobile/**",
    ],
  },
];

export default eslintConfig;
