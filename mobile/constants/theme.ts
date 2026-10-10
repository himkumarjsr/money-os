import { StyleSheet } from "react-native";

/**
 * Design tokens. `Colors` always reads the active palette (light, dark or
 * premium); `themedStyles` rebuilds a StyleSheet for whichever palette is
 * active. The app remounts its screens when the theme changes, so values read
 * during render are always current.
 */
const lightPalette = {
  primary: "#534AB7",
  primaryDark: "#3C3489",
  primaryLight: "#EEEDFE",
  primaryMedium: "#AFA9EC",
  accent: "#534AB7",
  onPrimary: "#FFFFFF",
  success: "#1D9E75",
  successDark: "#047857",
  successLight: "#E1F5EE",
  successText: "#065F46",
  warning: "#BA7517",
  warningLight: "#FFF3E0",
  warningText: "#78350F",
  error: "#E24B4A",
  errorLight: "#FCEBEB",
  errorText: "#991B1B",
  background: "#F7F7F4",
  backgroundDeep: "#EEF2FF",
  card: "#FFFFFF",
  surfaceMuted: "#F4F2FC",
  inverseSurface: "#0F172A",
  border: "#E8E6F0",
  borderIndigo: "#C7D2FE",
  borderLight: "#F0EFF8",
  textPrimary: "#111110",
  textSecondary: "#5F5E5A",
  textMuted: "#9B9A94",
  textWhite: "#FFFFFF",
  slate300: "#CBD5E1",
  slate800: "#1E293B",
  indigo600: "#4F46E5",
  violet600: "#7C3AED",
  blue600: "#2563EB",
  glass: "rgba(245,243,252,0.94)",
  glassSoft: "rgba(244,242,252,0.55)",
  glassBorder: "rgba(255,255,255,0.8)",
  glassCard: "rgba(255,255,255,0.75)",
  heroWash: "rgba(224,231,255,0.72)",
  heroBorder: "rgba(199,210,254,0.8)",
  tabIdle: "#3D3A5C",
  primaryTint: "rgba(83,74,183,0.16)",
  primaryTintBorder: "rgba(83,74,183,0.22)",
};

export type Palette = typeof lightPalette;

const darkPalette: Palette = {
  primary: "#6C63E0",
  primaryDark: "#C9C4FF",
  primaryLight: "#26234A",
  primaryMedium: "#5A52B5",
  accent: "#8B83F0",
  onPrimary: "#FFFFFF",
  success: "#34C08F",
  successDark: "#6EE7B7",
  successLight: "#0F2E24",
  successText: "#6EE7B7",
  warning: "#E0A23A",
  warningLight: "#33270F",
  warningText: "#FCD34D",
  error: "#F06A69",
  errorLight: "#3A1A1A",
  errorText: "#FCA5A5",
  background: "#0E0E12",
  backgroundDeep: "#15142A",
  card: "#18181F",
  surfaceMuted: "#1F1E28",
  inverseSurface: "#26253A",
  border: "#2A2935",
  borderIndigo: "#3B3A66",
  borderLight: "#22212C",
  textPrimary: "#F2F1EE",
  textSecondary: "#B5B3AD",
  textMuted: "#85837D",
  textWhite: "#FFFFFF",
  slate300: "#3A3F4A",
  slate800: "#E2E8F0",
  indigo600: "#8B87F5",
  violet600: "#A78BFA",
  blue600: "#60A5FA",
  glass: "rgba(24,24,31,0.94)",
  glassSoft: "rgba(24,24,31,0.6)",
  glassBorder: "rgba(255,255,255,0.08)",
  glassCard: "rgba(255,255,255,0.06)",
  heroWash: "rgba(38,35,74,0.6)",
  heroBorder: "rgba(59,58,102,0.8)",
  tabIdle: "#B5B3AD",
  primaryTint: "rgba(139,131,240,0.2)",
  primaryTintBorder: "rgba(139,131,240,0.3)",
};

/** Black and gold, unlocked by long-term use or a top leaderboard rank. */
const premiumPalette: Palette = {
  ...darkPalette,
  primary: "#9A7B2F",
  primaryDark: "#F1D58A",
  primaryLight: "#2A2312",
  primaryMedium: "#7A6326",
  accent: "#D4AF37",
  background: "#0A0A0C",
  backgroundDeep: "#14110A",
  card: "#141418",
  surfaceMuted: "#1C1A14",
  inverseSurface: "#221D10",
  border: "#2E2918",
  borderIndigo: "#4A3F1F",
  borderLight: "#1F1C14",
  textPrimary: "#F5F1E6",
  textSecondary: "#C2B9A3",
  textMuted: "#8C8573",
  indigo600: "#D4AF37",
  violet600: "#E0BE5A",
  blue600: "#D4AF37",
  glass: "rgba(20,20,24,0.94)",
  glassSoft: "rgba(20,20,24,0.6)",
  glassBorder: "rgba(212,175,55,0.18)",
  glassCard: "rgba(255,255,255,0.05)",
  heroWash: "rgba(42,35,18,0.6)",
  heroBorder: "rgba(74,63,31,0.8)",
  tabIdle: "#C2B9A3",
  primaryTint: "rgba(212,175,55,0.16)",
  primaryTintBorder: "rgba(212,175,55,0.3)",
};

export type ThemeName = "light" | "dark" | "premium";

export const Palettes: Record<ThemeName, Palette> = {
  light: lightPalette,
  dark: darkPalette,
  premium: premiumPalette,
};

let activeTheme: ThemeName = "light";

export function getActiveTheme(): ThemeName {
  return activeTheme;
}

/** Switch palettes. Callers remount the screen tree so styles re-read it. */
export function setActiveTheme(name: ThemeName): void {
  activeTheme = name;
}

export function isDarkTheme(name: ThemeName = activeTheme): boolean {
  return name !== "light";
}

export const Colors: Readonly<Palette> = new Proxy({} as Palette, {
  get: (_t, key) => Palettes[activeTheme][key as keyof Palette],
  ownKeys: () => Reflect.ownKeys(Palettes[activeTheme]),
  getOwnPropertyDescriptor: (_t, key) => ({
    enumerable: true,
    configurable: true,
    value: Palettes[activeTheme][key as keyof Palette],
  }),
});

/**
 * `StyleSheet.create` that follows the active theme: the factory runs once per
 * palette, on first use, and reads `Colors` like any other code.
 */
export function themedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: () => T,
): T {
  const cache: Partial<Record<ThemeName, T>> = {};
  const current = (): T =>
    (cache[activeTheme] ??= StyleSheet.create(factory()));
  return new Proxy({} as T, {
    get: (_t, key) => current()[key as keyof T],
    ownKeys: () => Reflect.ownKeys(current()),
    getOwnPropertyDescriptor: (_t, key) => ({
      enumerable: true,
      configurable: true,
      value: current()[key as keyof T],
    }),
  });
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 20,
  round: 999,
} as const;

export const FontSize = {
  xs: 10,
  sm: 11,
  md: 13,
  base: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  strong: {
    shadowColor: "#534AB7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export const FINKOIN_TAGLINE = "Know it. Fix it. Grow it.";
export const FINKOIN_TAGLINE_SUB = "Your complete money life.";

/** Like `themedStyles` for plain objects (tone maps, chart palettes). */
export function themed<T extends object>(factory: () => T): T {
  const cache: Partial<Record<ThemeName, T>> = {};
  const current = (): T => (cache[activeTheme] ??= factory());
  return new Proxy({} as T, {
    get: (_t, key) => current()[key as keyof T],
    has: (_t, key) => key in current(),
    ownKeys: () => Reflect.ownKeys(current()),
    getOwnPropertyDescriptor: (_t, key) => ({
      enumerable: true,
      configurable: true,
      value: current()[key as keyof T],
    }),
  });
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const ch = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, "0");
  return `#${ch(ar, br)}${ch(ag, bg)}${ch(ab, bb)}`;
}

/**
 * A light tint (status pill, category chip, card wash) as written for the
 * light theme. In dark themes it becomes a deep version of the same hue.
 */
export function tintBg(lightHex: string, strength = 0.22): string {
  if (activeTheme === "light") return lightHex;
  const [r, g, b] = hexToRgb(lightHex);
  // Push the pale tint back toward its full hue, then sink it into the card colour.
  const sat = (c: number) => Math.max(0, Math.min(255, 255 - (255 - c) * 5));
  const full = `#${[r, g, b].map((c) => sat(c).toString(16).padStart(2, "0")).join("")}`;
  return mixHex(Palettes[activeTheme].card, full, strength);
}

/** Dark text meant for a light tint; lightened so it stays readable on `tintBg()`. */
export function tintFg(darkHex: string): string {
  return activeTheme === "light" ? darkHex : mixHex(darkHex, "#FFFFFF", 0.62);
}
