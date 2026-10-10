#!/usr/bin/env node
/**
 * Generates app/theme.css: dark + premium palettes for the web/PWA.
 *
 * The web UI is written with literal Tailwind colours (bg-white,
 * text-slate-900, text-[#534AB7], …). Rather than touching ~150 files, this
 * scans app/ and components/ for every colour utility and emits an override
 * under :root[data-theme] that maps it to a palette role (card, text, muted,
 * primary, success tint, …). Light mode is untouched: no data-theme, no rules.
 *
 * Re-run after adding new colour classes:  npm run theme:css
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import colors from "tailwindcss/colors.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCAN_DIRS = ["app", "components"];
const OUT = join(ROOT, "app/theme.css");

// ── Palettes (kept in step with mobile/constants/theme.ts) ────────────────
const PALETTES = {
  dark: {
    bg: "#0E0E12",
    card: "#18181F",
    surface: "#1F1E28",
    border: "#2A2935",
    "border-light": "#22212C",
    "border-strong": "#3A3948",
    text: "#F2F1EE",
    "text-2": "#B5B3AD",
    muted: "#85837D",
    primary: "#6C63E0",
    "primary-text": "#A49DF5",
    "primary-light": "#26234A",
    "primary-border": "#3B3A66",
    "success-text": "#6EE7B7",
    "success-light": "#0F2E24",
    "success-border": "#1E5A45",
    "warning-text": "#FCD34D",
    "warning-light": "#33270F",
    "warning-border": "#5C4718",
    "danger-text": "#FCA5A5",
    "danger-light": "#3A1A1A",
    "danger-border": "#6B2A2A",
  },
  premium: {
    bg: "#0A0A0C",
    card: "#141418",
    surface: "#1C1A14",
    border: "#2E2918",
    "border-light": "#1F1C14",
    "border-strong": "#4A3F1F",
    text: "#F5F1E6",
    "text-2": "#C2B9A3",
    muted: "#8C8573",
    primary: "#9A7B2F",
    "primary-text": "#D4AF37",
    "primary-light": "#2A2312",
    "primary-border": "#4A3F1F",
    "success-text": "#6EE7B7",
    "success-light": "#0F2E24",
    "success-border": "#1E5A45",
    "warning-text": "#FCD34D",
    "warning-light": "#33270F",
    "warning-border": "#5C4718",
    "danger-text": "#FCA5A5",
    "danger-light": "#3A1A1A",
    "danger-border": "#6B2A2A",
  },
};

// ── Scan ──────────────────────────────────────────────────────────────────
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if ([".tsx", ".ts"].includes(extname(p)) && !p.includes(".test."))
      out.push(p);
  }
  return out;
}

const PROPS =
  "bg|text|border(?:-[trblxy])?|divide|ring|outline|from|via|to|fill|stroke|placeholder|caret|accent|decoration";
const NAMED =
  "white|black|transparent|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950)";
const TOKEN_RE = new RegExp(
  String.raw`(?<![\w:/\[-])((?:[a-z0-9-]+:)*)(!?)(${PROPS})-((?:${NAMED})|\[#[0-9a-fA-F]{3,8}\])(?:\/(\d{1,3}|\[[0-9.]+\]))?(?![\w\]-])`,
  "g",
);

// Inline styles: style={{ color: "#534AB7", border: "1px solid #E8E6F0" }}
const STYLE_PROPS = {
  color: ["color", "text"],
  background: ["background", "bg"],
  backgroundColor: ["background-color", "bg"],
  border: ["border", "border"],
  borderTop: ["border-top", "border"],
  borderBottom: ["border-bottom", "border"],
  borderLeft: ["border-left", "border"],
  borderRight: ["border-right", "border"],
  borderColor: ["border-color", "border"],
  fill: ["fill", "text"],
  stroke: ["stroke", "text"],
};
const STYLE_RE = new RegExp(
  String.raw`\b(${Object.keys(STYLE_PROPS).join("|")}):\s*["'\x60]([^"'\x60]*?)(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\b([^"'\x60]*)["'\x60]`,
  "g",
);

const GRADIENT_RE = /\b(background):\s*["'](linear-gradient\([^"']*\))["']/g;
const WHITE_RE = /\b(background|backgroundColor):\s*["']white["']/g;

const tokens = new Map();
const inline = new Map();
const gradients = new Set();
const whites = new Set();
for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(TOKEN_RE)) tokens.set(m[0], m);
    for (const m of src.matchAll(GRADIENT_RE)) gradients.add(m[2]);
    for (const m of src.matchAll(WHITE_RE)) whites.add(m[1]);
    for (const m of src.matchAll(STYLE_RE)) {
      const [, key, before, hex, after] = m;
      // Only plain colours or "1px solid #hex" borders — skip gradients etc.
      if (/gradient|url\(/.test(before + after)) continue;
      const value = `${before}${hex}${after}`.trim();
      inline.set(`${key}|${value.toLowerCase()}`, {
        key,
        hex: hex.toLowerCase(),
        before: before.trim(),
        after: after.trim(),
      });
    }
  }
}

// ── Colour maths ──────────────────────────────────────────────────────────
function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3 || h.length === 4)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
}

const GRAY_FAMILIES = new Set(["slate", "gray", "zinc", "neutral", "stone"]);
const GRAY_HEX = new Set();

function resolveColor(raw) {
  if (raw.startsWith("[#")) return raw.slice(1, -1);
  if (raw === "white") return "#ffffff";
  if (raw === "black") return "#000000";
  if (raw === "transparent") return null;
  const [name, shade] = raw.split("-");
  const hex = colors[name]?.[shade] ?? null;
  if (hex && GRAY_FAMILIES.has(name)) GRAY_HEX.add(hex.toLowerCase());
  return hex;
}

function analyse(hex) {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const chroma = max - min;
  let h = 0;
  if (chroma) {
    if (max === r) h = ((g - b) / chroma) % 6;
    else if (max === g) h = (b - r) / chroma + 2;
    else h = (r - g) / chroma + 4;
    h = (h * 60 + 360) % 360;
  }
  const hue =
    h < 15 || h >= 330
      ? "danger"
      : h < 65
        ? "warning"
        : h < 190
          ? "success"
          : "primary";
  // Tailwind's greys are slightly blue; near-black text reads as neutral too.
  const neutral =
    chroma < 0.08 ||
    GRAY_HEX.has(hex.toLowerCase()) ||
    (l < 0.18 && chroma < 0.2);
  return { l, neutral, hue };
}

/** Palette role for a colour used as `kind`, or null to leave it alone. */
function role(kind, hex) {
  const { l, neutral, hue } = analyse(hex);
  if (kind === "bg") {
    if (neutral) {
      if (l >= 0.97) return "card";
      if (l >= 0.85) return "surface";
      if (l >= 0.6) return "border";
      return null;
    }
    if (l >= 0.93 && hue === "primary")
      return l >= 0.965 ? "bg" : "primary-light";
    if (l >= 0.85) return `${hue}-light`;
    if (hue === "primary" && l >= 0.3 && l < 0.75) return "primary";
    return null;
  }
  if (kind === "text") {
    if (neutral) {
      if (l >= 0.85) return null;
      if (l < 0.3) return "text";
      if (l < 0.5) return "text-2";
      return "muted";
    }
    if (l < 0.75) return `${hue}-text`;
    return null;
  }
  // border-ish
  if (neutral) {
    if (l >= 0.93) return "border-light";
    if (l >= 0.75) return "border";
    if (l >= 0.5) return "border-strong";
    return null;
  }
  if (l >= 0.8) return `${hue}-border`;
  if (hue === "primary") return "primary-text";
  return null;
}

// ── CSS output ────────────────────────────────────────────────────────────
function escapeClass(cls) {
  let out = cls.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
  if (/^[0-9]/.test(out)) out = `\\3${out[0]} ${out.slice(1)}`;
  return out;
}

const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 };
const PSEUDO = {
  hover: ":hover",
  focus: ":focus",
  "focus-visible": ":focus-visible",
  "focus-within": ":focus-within",
  active: ":active",
  disabled: ":disabled",
  placeholder: "::placeholder",
  first: ":first-child",
  last: ":last-child",
};

function colorValue(roleName, alpha) {
  const v = `var(--fk-${roleName})`;
  if (!alpha) return v;
  const pct = alpha.startsWith("[")
    ? Number(alpha.slice(1, -1)) * 100
    : Number(alpha);
  return `color-mix(in srgb, ${v} ${pct}%, transparent)`;
}

function declarations(prop, value, important) {
  const imp = important ? " !important" : "";
  switch (prop) {
    case "bg":
      return `background-color:${value}${imp}`;
    case "text":
    case "placeholder":
      return `color:${value}${imp}`;
    case "caret":
      return `caret-color:${value}${imp}`;
    case "accent":
      return `accent-color:${value}${imp}`;
    case "decoration":
      return `text-decoration-color:${value}${imp}`;
    case "fill":
      return `fill:${value}${imp}`;
    case "stroke":
      return `stroke:${value}${imp}`;
    case "ring":
      return `--tw-ring-color:${value}${imp}`;
    case "outline":
      return `outline-color:${value}${imp}`;
    case "border":
      return `border-color:${value}${imp}`;
    case "border-t":
      return `border-top-color:${value}${imp}`;
    case "border-b":
      return `border-bottom-color:${value}${imp}`;
    case "border-l":
      return `border-left-color:${value}${imp}`;
    case "border-r":
      return `border-right-color:${value}${imp}`;
    case "border-x":
      return `border-left-color:${value}${imp};border-right-color:${value}${imp}`;
    case "border-y":
      return `border-top-color:${value}${imp};border-bottom-color:${value}${imp}`;
    case "from":
      return `--tw-gradient-from:${value} var(--tw-gradient-from-position)${imp};--tw-gradient-to:color-mix(in srgb, ${value} 0%, transparent) var(--tw-gradient-to-position)${imp};--tw-gradient-stops:var(--tw-gradient-from), var(--tw-gradient-to)${imp}`;
    case "via":
      return `--tw-gradient-to:color-mix(in srgb, ${value} 0%, transparent) var(--tw-gradient-to-position)${imp};--tw-gradient-stops:var(--tw-gradient-from), ${value} var(--tw-gradient-via-position), var(--tw-gradient-to)${imp}`;
    case "to":
      return `--tw-gradient-to:${value} var(--tw-gradient-to-position)${imp}`;
    default:
      return null;
  }
}

function kindOf(prop) {
  if (["bg", "from", "via", "to"].includes(prop)) return "bg";
  if (
    [
      "text",
      "placeholder",
      "fill",
      "stroke",
      "caret",
      "accent",
      "decoration",
    ].includes(prop)
  )
    return "text";
  return "border";
}

const rules = [];
for (const [token, m] of [...tokens].sort(([a], [b]) => a.localeCompare(b))) {
  const [, variantChain, bang, prop, rawColor, alpha] = m;
  const hex = resolveColor(rawColor);
  if (!hex) continue;
  const r = role(kindOf(prop), hex);
  if (!r) continue;

  const variants = variantChain.split(":").filter(Boolean);
  let media = null;
  let pseudo = "";
  let prefix = "";
  let ok = true;
  for (const v of variants) {
    if (BREAKPOINTS[v]) media = BREAKPOINTS[v];
    else if (PSEUDO[v]) pseudo += PSEUDO[v];
    else if (v === "group-hover") prefix = ".group:hover ";
    else if (v === "group-focus") prefix = ".group:focus ";
    else ok = false;
  }
  if (!ok) continue;

  const decl = declarations(prop, colorValue(r, alpha), Boolean(bang));
  if (!decl) continue;
  let sel = `:root[data-theme] ${prefix}.${escapeClass(token)}${pseudo}`;
  if (prop === "divide") {
    sel = `:root[data-theme] ${prefix}.${escapeClass(token)}${pseudo} > :not([hidden]) ~ :not([hidden])`;
  }
  const body =
    prop === "divide" ? `border-color:${colorValue(r, alpha)}` : decl;
  const rule = `${sel}{${body}}`;
  rules.push({ media, rule });
}

// React writes `prop:#hex` when rendering on the server and
// `prop: rgb(r, g, b)` when it sets the style in the browser; match both.
const inlineRules = [];
for (const { key, hex, before, after } of [...inline.values()].sort((a, b) =>
  `${a.key}${a.before}${a.hex}${a.after}`.localeCompare(
    `${b.key}${b.before}${b.hex}${b.after}`,
  ),
)) {
  const [cssProp, kind] = STYLE_PROPS[key];
  const r = role(kind, hex);
  if (!r) continue;
  const rgb = `rgb(${hexToRgb(hex)
    .map((v) => Math.round(v * 255))
    .join(", ")})`;
  const target =
    kind === "border"
      ? cssProp === "border-color" || cssProp === "border"
        ? "border-color"
        : `${cssProp}-color`
      : kind === "bg"
        ? "background-color"
        : cssProp;
  const join = (c) => [before, c, after].filter(Boolean).join(" ");
  const sel =
    `:root[data-theme] [style*="${cssProp}:${join(hex)}" i],\n` +
    `:root[data-theme] [style*="${cssProp}: ${join(rgb)}"]`;
  inlineRules.push(`${sel} {\n  ${target}: var(--fk-${r}) !important;\n}`);
}

for (const key of [...whites].sort()) {
  const [cssProp] = STYLE_PROPS[key];
  inlineRules.push(
    `:root[data-theme] [style*="${cssProp}:white" i],\n:root[data-theme] [style*="${cssProp}: white"] {\n  background: var(--fk-card) !important;\n}`,
  );
}

// Light-only page washes, e.g. linear-gradient(135deg, #F7F7F4 0%, #EEEDFE 100%)
for (const g of [...gradients].sort()) {
  const hexes = g.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? [];
  if (!hexes.length || /rgba?\(|var\(/.test(g)) continue;
  if (!hexes.every((h) => analyse(h).l >= 0.85)) continue;
  const client = g.replace(
    /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g,
    (h) =>
      `rgb(${hexToRgb(h)
        .map((v) => Math.round(v * 255))
        .join(", ")})`,
  );
  inlineRules.push(
    `:root[data-theme] [style*="background:${g}" i],\n:root[data-theme] [style*="background: ${client}"] {\n  background: var(--fk-bg) !important;\n}`,
  );
}

const vars = Object.entries(PALETTES)
  .map(
    ([name, pal]) =>
      `:root[data-theme="${name}"] {\n${Object.entries(pal)
        .map(([k, v]) => `  --fk-${k}: ${v};`)
        .join(
          "\n",
        )}\n  --color-primary: var(--fk-primary);\n  --color-surface: var(--fk-card);\n  --color-surface-alt: var(--fk-surface);\n  --color-muted: var(--fk-muted);\n  --color-border: var(--fk-border);\n  --color-text: var(--fk-text);\n}`,
  )
  .join("\n\n");

const plain = rules.filter((r) => !r.media).map((r) => r.rule);
const byMedia = new Map();
for (const r of rules.filter((x) => x.media)) {
  if (!byMedia.has(r.media)) byMedia.set(r.media, []);
  byMedia.get(r.media).push(r.rule);
}

const css = `/*
  GENERATED by scripts/generate-theme-css.mjs — do not edit by hand.
  Dark and Premium themes for the web/PWA (light needs no overrides).
  Run \`npm run theme:css\` after adding new colour classes.
*/

${vars}

:root[data-theme],
:root[data-theme] body {
  background-color: var(--fk-bg) !important;
  color: var(--fk-text);
}

:where(:root[data-theme]) :where(input, select, textarea) {
  color: var(--fk-text);
  background-color: var(--fk-card);
  border-color: var(--fk-border);
}

:where(:root[data-theme]) ::placeholder {
  color: var(--fk-muted);
}

${plain.join("\n")}

/* Inline style={{ … }} colours */
${inlineRules.join("\n")}

${[...byMedia.entries()]
  .sort(([a], [b]) => a - b)
  .map(
    ([w, rs]) =>
      `@media (min-width: ${w}px) {\n${rs.map((x) => `  ${x}`).join("\n")}\n}`,
  )
  .join("\n\n")}
`;

writeFileSync(OUT, css);
console.log(
  `theme.css: ${rules.length} class overrides, ${inlineRules.length} inline-style overrides`,
);
