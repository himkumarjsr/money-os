import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

console.log("📚 Updating documentation...");

function run(cmd: string): string {
  return execSync(cmd, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 20 * 1024 * 1024,
  });
}

let passed = 0;
let failed = 0;
let total = 0;
let testLine = "Unit tests: unavailable";

console.log("🧪 Running unit tests...");
try {
  const unitResults = run("npx vitest run --reporter=json");
  // Vitest may print non-JSON logs before the JSON payload.
  const jsonStart = unitResults.indexOf("{");
  const payload = jsonStart >= 0 ? unitResults.slice(jsonStart) : unitResults;
  const results = JSON.parse(payload) as {
    numPassedTests?: number;
    numFailedTests?: number;
    numTotalTests?: number;
  };
  passed = results.numPassedTests ?? 0;
  failed = results.numFailedTests ?? 0;
  total = results.numTotalTests ?? passed + failed;
  testLine = `Unit tests: ${passed}/${total} passing`;
  console.log(`✅ ${testLine}`);
  if (failed > 0) console.log(`❌ Failed: ${failed}`);
} catch (err) {
  console.log("⚠️  Some unit tests failed or reporter parse failed");
  const message = err instanceof Error ? err.message : String(err);
  const match = message.match(/(\d+) failed/);
  if (match) failed = Number(match[1]);
  testLine = `Unit tests: failed to complete (see npm test)`;
}

const statusBlock = `## TEST STATUS

Last run: ${new Date().toISOString()}
${testLine}
Failed: ${failed}

Living docs:
- \`docs/README.md\`
- \`docs/PRODUCT_SURFACE.md\`
- \`docs/API_REFERENCE.md\`
- \`docs/CORE_ARCHITECTURE.md\`
- \`docs/DATA_AND_STORES.md\`
- \`docs/FUNCTIONS_REFERENCE.md\`
- \`docs/DESIGN_SYSTEM.md\`
- \`docs/ENV_AND_SCRIPTS.md\`
- \`docs/TESTING.md\`

`;

const systemPath = "FINKOIN_SYSTEM.md";
if (existsSync(systemPath)) {
  const systemMd = readFileSync(systemPath, "utf8");
  const existingMatch = systemMd.match(
    /## TEST STATUS[\s\S]*?(?=\n## |\n# |$)/,
  );
  const stripRun = (s: string) =>
    s
      .replace(/Last run:.*\n/, "")
      .replace(/\n{2,}/g, "\n")
      .trim();
  if (existingMatch && stripRun(existingMatch[0]) === stripRun(statusBlock)) {
    console.log("✅ FINKOIN_SYSTEM.md TEST STATUS unchanged (skip write)");
  } else {
    let updated: string;
    if (existingMatch) {
      updated = systemMd.replace(
        /## TEST STATUS[\s\S]*?(?=\n## |\n# |$)/,
        statusBlock,
      );
    } else {
      updated = systemMd.replace(
        /(Generated from:[\s\S]*?\n\n---\n)/,
        `$1\n${statusBlock}---\n`,
      );
    }
    writeFileSync(systemPath, updated);
    console.log("✅ FINKOIN_SYSTEM.md TEST STATUS updated");
  }
}

console.log("📘 Checking TypeScript...");
try {
  run("npx tsc --noEmit");
  console.log("✅ TypeScript: no errors");
} catch {
  console.log("❌ TypeScript: errors found");
}

console.log("🔍 Running ESLint...");
try {
  run("npx eslint . --max-warnings 0");
  console.log("✅ ESLint: clean");
} catch {
  console.log("⚠️  ESLint: warnings/errors found");
}

console.log("📚 Documentation update finished!");
