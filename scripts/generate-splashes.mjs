import sharp from "sharp";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const splashes = [
  { w: 2048, h: 2732, name: "apple-splash-2048-2732" },
  { w: 1668, h: 2388, name: "apple-splash-1668-2388" },
  { w: 1536, h: 2048, name: "apple-splash-1536-2048" },
  { w: 1125, h: 2436, name: "apple-splash-1125-2436" },
  { w: 1242, h: 2688, name: "apple-splash-1242-2688" },
  { w: 828, h: 1792, name: "apple-splash-828-1792" },
  { w: 1242, h: 2208, name: "apple-splash-1242-2208" },
  { w: 750, h: 1334, name: "apple-splash-750-1334" },
  { w: 640, h: 1136, name: "apple-splash-640-1136" },
];

mkdirSync(join(root, "public/splash"), { recursive: true });

for (const s of splashes) {
  const fs = Math.max(56, Math.round(Math.min(s.w, s.h) * 0.09));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s.w}" height="${s.h}">
  <rect width="100%" height="100%" fill="#534ab7"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs}" fill="white">FK</text>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(join(root, "public/splash", `${s.name}.png`));
  console.log(`Generated ${s.name}`);
}

console.log("All splash screens generated!");
