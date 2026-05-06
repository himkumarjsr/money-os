#!/usr/bin/env node
/**
 * Ensures server-only env vars are only read from API routes or lib/supabaseServer.ts.
 * Run: npm run check:secrets
 */
import { readdirSync, readFileSync } from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const SERVER_SECRET_PATTERN =
  /process\.env\.(?:SUPABASE_SERVICE_ROLE_KEY|RAZORPAY_KEY_SECRET|GROQ_API_KEY)\b/;

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  "out",
  "dist",
  "coverage",
  ".git",
]);

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    const name = ent.name;
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walk(full, out);
    } else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function isAllowed(relPosix) {
  if (relPosix === "lib/supabaseServer.ts") return true;
  if (relPosix.startsWith("app/api/")) return true;
  if (relPosix.startsWith("scripts/")) return true;
  return false;
}

const files = walk(root);
const violations = [];

for (const abs of files) {
  const rel = relative(root, abs).split("\\").join("/");
  let content;
  try {
    content = readFileSync(abs, "utf8");
  } catch {
    continue;
  }
  if (!SERVER_SECRET_PATTERN.test(content)) continue;
  if (!isAllowed(rel)) violations.push(rel);
}

if (violations.length) {
  console.error(
    "check-server-secrets-scope: server secrets must only appear in app/api/**, lib/supabaseServer.ts, or scripts/.\nOffenders:\n",
  );
  for (const v of violations) console.error("  -", v);
  process.exit(1);
}

console.log("check-server-secrets-scope: OK");
