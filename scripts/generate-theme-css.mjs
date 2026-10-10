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
  // "24K Mirror": near-black with polished, shiny gold. No blue or purple.
  premium: {
    bg: "#0A0A0A",
    card: "#151412",
    surface: "#1C1A15",
    border: "#2C2616",
    "border-light": "#201D14",
    "border-strong": "#4A3F1F",
    text: "#F5EFDC",
    "text-2": "#C9C1AE",
    muted: "#9E978A",
    primary: "#D4AF37",
    "primary-text": "#E8C766",
    "primary-light": "#1D1910",
    "primary-border": "#5A4A1E",
    "success-text": "#6FCF97",
    "success-light": "#0F2A1C",
    "success-border": "#1E5A3A",
    "warning-text": "#F3D27A",
    "warning-light": "#2E2410",
    "warning-border": "#5C4718",
    "danger-text": "#EB7A72",
    "danger-light": "#341615",
    "danger-border": "#6B2A2A",
    "gold-1": "#B38728",
    "gold-2": "#FCF6BA",
    "gold-3": "#D4AF37",
    "on-gold": "#1A1405",
    "gold-grad":
      "linear-gradient(100deg, #AA771C 0%, #FCF6BA 30%, #D4AF37 50%, #FBF5B7 70%, #B38728 100%)",
    hero: "linear-gradient(160deg, #221C0E 0%, #12100B 55%, #1C170C 100%)",
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
  "bg|text|border(?:-[trblxy])?|divide|ring|outline|from|via|to|fill|stroke|placeholder|caret|accent|decoration|shadow";
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

// Colours picked at runtime: `background: open ? "#F7F5FF" : "white"`, or
// tone maps like `{ bg: "#FBF5F5", badgeText: "#991B1B" }` spread into styles.
const STYLE_EXPR_RE =
  /\b(background|backgroundColor|color|borderColor)\s*:\s*([^,\n{}]*\?[^,\n{}]*)/g;
const TONE_RE =
  /\b\w*?(bg|Bg|background|Background|text|Text|color|Color|border|Border)\s*:\s*["'](#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})["']/g;
const QUOTED_HEX_RE = /["'](#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|white)["']/g;
const TONE_KEYS = {
  bg: ["background", "backgroundColor"],
  background: ["background", "backgroundColor"],
  text: ["color"],
  color: ["color"],
  border: ["borderColor"],
};

const GRADIENT_RE = /\b(background):\s*["'](linear-gradient\([^"']*\))["']/g;
const WHITE_RE = /\b(background|backgroundColor):\s*["']white["']/g;

const ARB_GRADIENT_RE =
  /(?<![\w:-])bg-\[linear-gradient\([^\]\s]*\)\](?![\w\]-])/g;
const ANY_HEX_RE = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;

const tokens = new Map();
const arbGradients = new Set();
const allHexes = new Set();
const inline = new Map();
const gradients = new Set();
const whites = new Set();
for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(TOKEN_RE)) tokens.set(m[0], m);
    for (const m of src.matchAll(GRADIENT_RE)) gradients.add(m[2]);
    for (const m of src.matchAll(WHITE_RE)) whites.add(m[1]);
    for (const m of src.matchAll(ARB_GRADIENT_RE)) arbGradients.add(m[0]);
    for (const m of src.matchAll(ANY_HEX_RE)) allHexes.add(m[0].toLowerCase());
    const addPlain = (key, hex) => {
      if (hex === "white") {
        if (key !== "color") whites.add(key);
        return;
      }
      inline.set(`${key}|${hex.toLowerCase()}`, {
        key,
        hex: hex.toLowerCase(),
        before: "",
        after: "",
      });
    };
    for (const m of src.matchAll(STYLE_EXPR_RE)) {
      for (const q of m[2].matchAll(QUOTED_HEX_RE)) addPlain(m[1], q[1]);
    }
    for (const m of src.matchAll(TONE_RE)) {
      const kind = m[1].toLowerCase();
      for (const key of TONE_KEYS[kind]) addPlain(key, m[2]);
      // Tone borders render as `1px solid ${tone.border}`.
      if (kind === "border")
        inline.set(`border|1px solid ${m[2].toLowerCase()}`, {
          key: "border",
          hex: m[2].toLowerCase(),
          before: "1px solid",
          after: "",
        });
    }
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

// Category and chart colours live in lib/ constants; Premium recolours them by value.
for (const file of walk(join(ROOT, "lib"))) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(ANY_HEX_RE)) allHexes.add(m[0].toLowerCase());
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
  return { l, neutral, hue, chroma };
}

/** Blue/purple brand colours that Premium must never show. */
function isBrandPurple(hex) {
  const { hue, chroma, l } = analyse(hex);
  if (hue !== "primary" || GRAY_HEX.has(hex.toLowerCase())) return false;
  // Near-black navy and aubergine count too: they read as purple on black.
  return chroma >= (l < 0.25 ? 0.06 : 0.12);
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

const GOLD_STOP = { from: "gold-1", via: "gold-2", to: "gold-3" };

/** Premium override for a blue/purple utility: gold, never purple. */
function premiumDecl(prop, hex, alpha, important) {
  const { l } = analyse(hex);
  const kind = kindOf(prop);
  if (prop === "shadow") {
    return {
      decl: `--tw-shadow-color:${colorValue("primary", alpha || "30")}`,
    };
  }
  if (kind === "bg") {
    if (l >= 0.85) return null; // pale washes: the shared rules handle these
    if (alpha) {
      // Soft glows: gold reads much stronger than purple on black.
      const pct = alpha.startsWith("[")
        ? Number(alpha.slice(1, -1)) * 100
        : Number(alpha);
      return {
        decl: declarations(
          prop,
          colorValue("primary", String(Math.round(pct * 0.3))),
          important,
        ),
      };
    }
    if (l >= 0.85) return null; // pale washes: the shared rules handle these
    if (l < 0.25) {
      return {
        decl: declarations(
          prop,
          `var(--fk-${prop === "bg" ? "surface" : "bg"})`,
          important,
        ),
      };
    }
    if (prop === "bg") {
      return {
        decl: "background:var(--fk-gold-grad)!important;color:var(--fk-on-gold)!important",
        onGold: true,
      };
    }
    return {
      decl: declarations(prop, `var(--fk-${GOLD_STOP[prop]})`, important),
      onGold: prop === "from",
    };
  }
  if (kind === "text") {
    return l < 0.85
      ? {
          decl: declarations(
            prop,
            colorValue("primary-text", alpha),
            important,
          ),
        }
      : null;
  }
  return {
    decl: declarations(
      prop,
      colorValue(l >= 0.8 ? "primary-border" : "primary", alpha),
      important,
    ),
  };
}

const rules = [];
const STOP_ORDER = { from: 1, via: 2, to: 3 };
const order = (m) => STOP_ORDER[m[3]] ?? 0;
for (const [token, m] of [...tokens].sort(
  ([a, ma], [b, mb]) => order(ma) - order(mb) || a.localeCompare(b),
)) {
  const [, variantChain, bang, prop, rawColor, alpha] = m;
  const hex = resolveColor(rawColor);
  if (!hex) continue;
  const r = prop === "shadow" ? null : role(kindOf(prop), hex);
  const premium = isBrandPurple(hex)
    ? premiumDecl(prop, hex, alpha, Boolean(bang))
    : null;
  if (!r && !premium) continue;

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

  const cls = `${prefix}.${escapeClass(token)}${pseudo}`;
  const suffix = prop === "divide" ? " > :not([hidden]) ~ :not([hidden])" : "";
  if (r) {
    const decl = declarations(prop, colorValue(r, alpha), Boolean(bang));
    const body =
      prop === "divide" ? `border-color:${colorValue(r, alpha)}` : decl;
    if (body)
      rules.push({ media, rule: `:root[data-theme] ${cls}${suffix}{${body}}` });
  }
  if (premium) {
    const P = `:root[data-theme="premium"]`;
    const body =
      prop === "divide"
        ? premium.decl.replace(/^[^:]+/, "border-color")
        : premium.decl;
    rules.push({ media, premium: true, rule: `${P} ${cls}${suffix}{${body}}` });
    if (premium.onGold && !pseudo)
      rules.push({
        media,
        premium: true,
        rule: `${P} .${escapeClass(token)}[class*="text-white"],${P} .${escapeClass(token)} [class*="text-white"]{color:var(--fk-on-gold)!important}`,
      });
  }
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

// ── Premium: catch every remaining blue/purple ────────────────────────────
// Brand colours also arrive through constants, SVG attributes and gradients,
// so Premium matches them by value wherever they render.
const premiumRules = [];
const P = `:root[data-theme="premium"]`;
const rgbOf = (hex) =>
  `rgb(${hexToRgb(hex)
    .map((v) => Math.round(v * 255))
    .join(", ")})`;
for (const hex of [...allHexes].filter(isBrandPurple).sort()) {
  const { l } = analyse(hex);
  const rgb = rgbOf(hex);
  const ink = l >= 0.85 ? "primary-light" : "primary";
  premiumRules.push(
    `${P} [fill="${hex}" i] {\n  fill: var(--fk-${ink});\n}`,
    `${P} [stroke="${hex}" i] {\n  stroke: var(--fk-${l >= 0.85 ? "gold-2" : "primary"});\n}`,
    `${P} [style*="color:${hex}" i],\n${P} [style*="color: ${rgb}"] {\n  color: var(--fk-${l >= 0.85 ? "gold-2" : "primary-text"}) !important;\n}`,
    `${P} [style*="solid ${hex}" i],\n${P} [style*="solid ${rgb}"],\n${P} [style*="border-color:${hex}" i],\n${P} [style*="border-color: ${rgb}"] {\n  border-color: var(--fk-${l >= 0.8 ? "primary-border" : "primary"}) !important;\n}`,
  );
  const bgSel = ["background:", "background-color:"]
    .flatMap((k) => [
      `${P} [style*="${k}${hex}" i]`,
      `${P} [style*="${k} ${rgb}"]`,
    ])
    .join(",\n");
  if (l >= 0.85)
    premiumRules.push(
      `${bgSel} {\n  background: var(--fk-primary-light) !important;\n}`,
    );
  else if (l < 0.25)
    premiumRules.push(
      `${bgSel} {\n  background: var(--fk-surface) !important;\n}`,
    );
  else
    premiumRules.push(
      `${bgSel} {\n  background: var(--fk-gold-grad) !important;\n  color: var(--fk-on-gold) !important;\n}`,
    );
  // Any inline gradient using a brand colour becomes a dark gold-edged panel.
  premiumRules.push(
    `${P} [style*="gradient"][style*="${hex}" i],\n${P} [style*="gradient"][style*="${rgb}"] {\n  background: var(--fk-hero) !important;\n  border-color: var(--fk-primary-border) !important;\n  box-shadow: inset 0 0 0 1px var(--fk-primary-border);\n}`,
  );
}
for (const cls of [...arbGradients].sort()) {
  const hexes = cls.match(ANY_HEX_RE) ?? [];
  if (!hexes.some(isBrandPurple)) continue;
  premiumRules.push(
    `${P} .${escapeClass(cls)} {\n  background: var(--fk-hero) !important;\n  box-shadow: inset 0 0 0 1px var(--fk-primary-border);\n}`,
  );
}

const vars = Object.entries(PALETTES)
  .map(
    ([name, pal]) =>
      `:root[data-theme="${name}"] {\n${Object.entries(pal)
        .map(([k, v]) => `  --fk-${k}: ${v};`)
        .join(
          "\n",
        )}\n  --color-primary: var(--fk-primary);\n  --color-surface: var(--fk-card);\n  --color-surface-alt: var(--fk-surface);\n  --color-muted: var(--fk-muted);\n  --color-border: var(--fk-border);\n  --color-text: var(--fk-text);${name === "premium" ? "\n  --color-primary-foreground: var(--fk-on-gold);" : ""}\n}`,
  )
  .join("\n\n");

rules.sort((a, b) => Number(Boolean(a.premium)) - Number(Boolean(b.premium)));
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

/* Premium: no blue or purple anywhere */
${premiumRules.join("\n")}

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
  `theme.css: ${rules.length} class overrides, ${inlineRules.length} inline-style overrides, ${premiumRules.length} premium overrides`,
);
