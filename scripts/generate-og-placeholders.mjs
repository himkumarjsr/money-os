/**
 * Generates 1200×630 PNG placeholders under public/og (purple gradient + FK + label).
 * Run: node scripts/generate-og-placeholders.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const ogDir = path.join(root, "public", "og");
const blogOgDir = path.join(ogDir, "blog");

function escXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

async function writePng(relPath, label) {
  const width = 1200;
  const height = 630;
  const safe = escXml(label).slice(0, 80);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#534AB7"/>
      <stop offset="100%" stop-color="#1e1545"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <text x="600" y="260" text-anchor="middle" fill="#ffffff" font-family="system-ui,Segoe UI,sans-serif" font-size="96" font-weight="800">FK</text>
  <text x="600" y="360" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="system-ui,Segoe UI,sans-serif" font-size="26" font-weight="600">${safe}</text>
</svg>`;
  const out = path.join(root, "public", relPath);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log("wrote", relPath);
}

const jobs = [
  ["og/home.png", "Finkoin — Financial health"],
  ["og/tax-calculator.png", "Tax regime 2026"],
  ["og/analyse.png", "Financial health check"],
];

const slugs = [
  "old-vs-new-tax-regime-2026",
  "term-insurance-calculator-india",
  "emergency-fund-calculator-india",
  "80c-deductions-guide-2026",
];

async function main() {
  fs.mkdirSync(blogOgDir, { recursive: true });
  for (const [rel, label] of jobs) {
    await writePng(rel, label);
  }
  for (const slug of slugs) {
    await writePng(`og/blog/${slug}.png`, slug.replace(/-/g, " "));
  }
}

await main();
