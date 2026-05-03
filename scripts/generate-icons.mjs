import sharp from "sharp";
import { mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const candidates = [
  join(rootDir, "public/logo.png"),
  join(rootDir, "public/favicon.ico"),
  join(rootDir, "public/assets/brand/finkoin-icon-1024.svg"),
];

function pickSource() {
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

async function makePlaceholderPng(size, outPath) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="100%" height="100%" fill="#534ab7"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="${Math.round(size * 0.35)}" fill="white">FK</text>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(outPath);
}

mkdirSync(join(rootDir, "public/icons"), { recursive: true });

const source = pickSource();
if (!source) {
  console.warn("No logo source found; generating purple FK placeholders.");
  for (const size of sizes) {
    await makePlaceholderPng(size, join(rootDir, `public/icons/icon-${size}x${size}.png`));
    console.log(`Generated ${size}x${size} (placeholder)`);
  }
} else {
  console.log("Using source:", source);
  for (const size of sizes) {
    await sharp(source).resize(size, size).png().toFile(join(rootDir, `public/icons/icon-${size}x${size}.png`));
    console.log(`Generated ${size}x${size}`);
  }
}

mkdirSync(join(rootDir, "public/screenshots"), { recursive: true });
const shotPath = join(rootDir, "public/screenshots/home.png");
if (source && existsSync(source)) {
  await sharp(source).resize(390, 844, { fit: "cover" }).png().toFile(shotPath);
  console.log("Wrote screenshots/home.png");
} else {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844">
  <rect width="100%" height="100%" fill="#534ab7"/>
  <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="72" fill="white">FK</text>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(shotPath);
  console.log("Wrote screenshots/home.png (placeholder)");
}

console.log("All icons generated!");
