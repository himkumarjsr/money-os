export const Colors = {
  primary: "#534AB7",
  primaryDark: "#3C3489",
  primaryLight: "#EEEDFE",
  primaryMedium: "#AFA9EC",
  success: "#1D9E75",
  successLight: "#E1F5EE",
  warning: "#BA7517",
  warningLight: "#FFF3E0",
  error: "#E24B4A",
  errorLight: "#FCEBEB",
  background: "#F7F7F4",
  card: "#FFFFFF",
  border: "#E8E6F0",
  borderLight: "#F0EFF8",
  textPrimary: "#111110",
  textSecondary: "#5F5E5A",
  textMuted: "#9B9A94",
  textWhite: "#FFFFFF",
} as const;

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
    elevation: 3,
  },
  strong: {
    shadowColor: "#534AB7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
