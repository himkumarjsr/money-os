/**
 * Makes Inter the default font for every Text and TextInput, like the web's
 * Tailwind `font-sans`. React Native has no global default font, so this
 * wraps the JSX runtime: any Text/TextInput element without its own
 * fontFamily gets the Inter face that matches its fontWeight (custom fonts
 * ignore fontWeight, so each weight is a separate family).
 *
 * Import once, before any screen renders (app/_layout.tsx).
 */
import { StyleSheet, Text, TextInput } from "react-native";

export const INTER_FAMILIES: Record<string, string> = {
  "400": "Inter_400Regular",
  "500": "Inter_500Medium",
  "600": "Inter_600SemiBold",
  "700": "Inter_700Bold",
  "800": "Inter_800ExtraBold",
  "900": "Inter_900Black",
};

function familyFor(weight: unknown): string {
  if (weight === undefined || weight === "normal") return INTER_FAMILIES["400"];
  if (weight === "bold") return INTER_FAMILIES["700"];
  const n = Math.min(900, Math.max(100, Math.round(Number(weight) / 100) * 100));
  if (!Number.isFinite(n)) return INTER_FAMILIES["400"];
  if (n <= 400) return INTER_FAMILIES["400"];
  return INTER_FAMILIES[String(n)] ?? INTER_FAMILIES["400"];
}

function withInter(props: Record<string, unknown> | null) {
  const flat = (StyleSheet.flatten(props?.style as never) ?? {}) as Record<
    string,
    unknown
  >;
  if (flat.fontFamily) return props;
  const { fontWeight, ...rest } = flat;
  return {
    ...props,
    style: { ...rest, fontFamily: familyFor(fontWeight) },
  };
}

let applied = false;

export function applyInterDefault(): void {
  if (applied) return;
  applied = true;
  const patch = (mod: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
      const orig = mod[key] as
        | ((type: unknown, props: Record<string, unknown>, ...r: unknown[]) => unknown)
        | undefined;
      if (typeof orig !== "function") continue;
      try {
        mod[key] = (type: unknown, props: Record<string, unknown>, ...rest: unknown[]) =>
          orig(
            type,
            type === Text || type === TextInput ? withInter(props) ?? props : props,
            ...rest,
          );
      } catch {
        /* read-only export in this runtime: keep the system font */
      }
    }
  };
  try {
    patch(require("react/jsx-runtime"), ["jsx", "jsxs"]);
  } catch {
    /* ignore */
  }
  try {
    patch(require("react/jsx-dev-runtime"), ["jsxDEV"]);
  } catch {
    /* ignore */
  }
  try {
    patch(require("react") as Record<string, unknown>, ["createElement"]);
  } catch {
    /* ignore */
  }
}
