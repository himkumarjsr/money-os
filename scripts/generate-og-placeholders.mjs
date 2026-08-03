/**
 * Generates 1200×630 Open Graph banners under public/og with the real Finkoin logo.
 * Run: node scripts/generate-og-placeholders.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const logoPath = path.join(root, "public", "logo.png");

const WIDTH = 1200;
const HEIGHT = 630;
const LOGO_SIZE = 72;

function escXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

async function prepareLogo() {
  const rx = Math.round((18 / 64) * LOGO_SIZE);
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${LOGO_SIZE}" height="${LOGO_SIZE}">
      <rect width="${LOGO_SIZE}" height="${LOGO_SIZE}" rx="${rx}" ry="${rx}" fill="#fff"/>
    </svg>`,
  );
  return sharp(logoPath)
    .resize(LOGO_SIZE, LOGO_SIZE, { fit: "cover", position: "centre" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function preparePlate() {
  const size = LOGO_SIZE + 8;
  const rx = Math.round((18 / 64) * LOGO_SIZE) + 4;
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
            <rect width="${size}" height="${size}" rx="${rx}" fill="#fff"/>
          </svg>`,
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();
}

/**
 * @param {object} opts
 * @param {string} opts.relPath
 * @param {string} opts.title
 * @param {string} [opts.line1]
 * @param {string} [opts.line2]
 * @param {string} [opts.footerLeft]
 * @param {Buffer} opts.logo
 * @param {Buffer} opts.plate
 * @param {"product"|"home"} [opts.variant]
 */
async function writeBanner({
  relPath,
  title,
  line1 = "",
  line2 = "",
  footerLeft = "Free • Made for India",
  logo,
  plate,
  variant = "product",
}) {
  const titleLines = escXml(title)
    .split("\n")
    .filter(Boolean)
    .slice(0, 3);
  const titleTspans = titleLines
    .map((line, i) => {
      const y = 250 + i * 62;
      return `<text x="72" y="${y}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="52" font-weight="800" fill="#FFFFFF">${line}</text>`;
    })
    .join("\n");

  const subY0 = 250 + titleLines.length * 62 + 18;
  const subLines = [line1, line2].filter(Boolean).map(escXml);
  const subTspans = subLines
    .map(
      (line, i) =>
        `<text x="72" y="${subY0 + i * 34}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="24" font-weight="500" fill="rgba(255,255,255,0.88)">${line}</text>`,
    )
    .join("\n");

  let bodyExtra = "";
  if (variant === "home") {
    bodyExtra = `
  <text x="72" y="265" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="40" font-weight="650" fill="#D7D3F8">Your complete money life.</text>
  <text x="72" y="345" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="56" font-weight="800" fill="#FFFFFF">Know it. Fix it. Grow it.</text>
  <text x="72" y="405" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="24" font-weight="500" fill="rgba(255,255,255,0.88)">Financial health, tax, SIP, tracker &amp; split — free for India.</text>
  <rect x="72" y="440" width="118" height="44" rx="22" fill="#FFFFFF"/>
  <text x="131" y="460" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="13" font-weight="700" fill="#534AB7">Know it</text>
  <text x="131" y="476" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="11" font-weight="500" fill="#534AB7" opacity="0.8">Health score &amp; gaps</text>
  <rect x="202" y="440" width="118" height="44" rx="22" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.35)"/>
  <text x="261" y="460" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="13" font-weight="700" fill="#FFFFFF">Fix it</text>
  <text x="261" y="476" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="11" font-weight="500" fill="#FFFFFF" opacity="0.75">Tax, EMI &amp; expenses</text>
  <rect x="332" y="440" width="128" height="44" rx="22" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.35)"/>
  <text x="396" y="460" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="13" font-weight="700" fill="#FFFFFF">Grow it</text>
  <text x="396" y="476" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="11" font-weight="500" fill="#FFFFFF" opacity="0.75">SIP &amp; long-term plan</text>`;
  }

  const mainCopy =
    variant === "home"
      ? bodyExtra
      : `${titleTspans}\n${subTspans}`;

  const wordX = 72 + LOGO_SIZE + 16;
  const wordY = 58 + 48;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4B43B0"/>
      <stop offset="45%" stop-color="#534AB7"/>
      <stop offset="100%" stop-color="#2F2878"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="980" cy="120" r="220" fill="#FFFFFF" opacity="0.10"/>
  <circle cx="1080" cy="360" r="260" fill="#FFFFFF" opacity="0.08"/>
  <circle cx="860" cy="500" r="180" fill="#FFFFFF" opacity="0.07"/>

  <text x="${wordX}" y="${wordY}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="36" font-weight="700" fill="#FFFFFF">Finkoin</text>

  ${mainCopy}

  <rect x="0" y="540" width="1200" height="90" fill="#14111F"/>
  <text x="72" y="595" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="24" font-weight="600" fill="#FFFFFF">${escXml(footerLeft)}</text>
  <text x="1128" y="595" text-anchor="end" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="24" font-weight="600" fill="#FFFFFF">finkoin.com</text>
</svg>`;

  const out = path.join(root, "public", relPath);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(Buffer.from(svg))
    .composite([
      { input: plate, left: 68, top: 54 },
      { input: logo, left: 72, top: 58 },
    ])
    .png()
    .toFile(out);
  console.log("wrote", relPath);
}

const PRODUCT = [
  {
    relPath: "og/og-home.png",
    title: "home",
    variant: "home",
    footerLeft: "No PAN • No Aadhaar • Free",
  },
  {
    relPath: "og/og-sip.png",
    title: "SIP Calculator",
    line1: "See how monthly SIPs can grow.",
    line2: "Free mutual fund SIP planner for India.",
  },
  {
    relPath: "og/og-swp.png",
    title: "SWP Calculator",
    line1: "Plan systematic withdrawals.",
    line2: "Free SWP planner for India.",
  },
  {
    relPath: "og/og-analyse.png",
    title: "Get Your Financial\nHealth Score",
    line1: "Answer a few questions.",
    line2: "Score out of 100. Know exactly what to fix first.",
    footerLeft: "No PAN • No Aadhaar • Free",
  },
  {
    relPath: "og/og-tax-calculator.png",
    title: "Tax Regime\nCalculator",
    line1: "Old vs new regime for FY 2025-26.",
    line2: "Find which saves you more tax.",
  },
  {
    relPath: "og/og-tracker.png",
    title: "Expense Tracker",
    line1: "Track every rupee.",
    line2: "See where money goes — free for India.",
  },
  {
    relPath: "og/og-split.png",
    title: "FK Split",
    line1: "Split bills with friends.",
    line2: "Settle up without the awkward math.",
  },
  {
    relPath: "og/og-portfolio.png",
    title: "Portfolio",
    line1: "See holdings in one place.",
    line2: "Built for Indian investors.",
  },
  {
    relPath: "og/og-emi.png",
    title: "EMI & Loan\nCalculators",
    line1: "Home, car, and personal loan EMI.",
    line2: "Affordability checks — free for India.",
  },
  {
    relPath: "og/og-ppf.png",
    title: "PPF Calculator",
    line1: "Project 15-year PPF maturity.",
    line2: "Plan 80C tax-saving with confidence.",
  },
  {
    relPath: "og/og-po.png",
    title: "Post Office\nSchemes",
    line1: "TD, RD, NSC, KVP, MIS, SCSS, SSY.",
    line2: "Notified rates — free India Post calculators.",
  },
  {
    relPath: "og/og-emergency.png",
    title: "Emergency Fund\nCalculator",
    line1: "How much safety buffer do you need?",
    line2: "Life-stage targets for India.",
  },
  {
    relPath: "og/og-fire.png",
    title: "FIRE Number\nCalculator",
    line1: "When can you retire early?",
    line2: "Corpus estimate adapted for India.",
  },
];

const BLOG = [
  {
    slug: "know-taxation-in-india",
    title: "Know Taxation\nin India",
  },
  {
    slug: "old-vs-new-tax-regime-2026",
    title: "Old vs New Tax\nRegime 2026",
  },
  {
    slug: "term-insurance-calculator-india",
    title: "Term Insurance\nCalculator",
  },
  {
    slug: "emergency-fund-calculator-india",
    title: "Emergency Fund\nCalculator",
  },
  {
    slug: "80c-deductions-guide-2026",
    title: "80C Deductions\nGuide 2026",
  },
];

async function main() {
  if (!fs.existsSync(logoPath)) {
    throw new Error(`Missing logo at ${logoPath}`);
  }
  const logo = await prepareLogo();
  const plate = await preparePlate();

  for (const job of PRODUCT) {
    await writeBanner({ ...job, logo, plate });
  }
  for (const post of BLOG) {
    await writeBanner({
      relPath: `og/blog/${post.slug}.png`,
      title: post.title,
      line1: "Finkoin Learn",
      line2: "Free personal finance guides for India.",
      logo,
      plate,
    });
  }
}

await main();
