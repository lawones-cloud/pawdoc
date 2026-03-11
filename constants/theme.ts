export const Colors = {
  primary: "#2D6A4F",
  primaryLight: "#52B788",
  primaryDark: "#1B4332",
  accent: "#F4A261",
  accentLight: "#FFBA80",
  accentDark: "#E07D3A",
  background: "#FAFAFA",
  surface: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textSecondary: "#6B7280",
  textInverse: "#FFFFFF",
  border: "#E5E7EB",
  error: "#EF4444",
  warning: "#F59E0B",
  success: "#10B981",
} as const;

export const Fonts = {
  headlineBold: "Nunito_700Bold",
  headlineSemiBold: "Nunito_600SemiBold",
  bodyRegular: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
} as const;

export const FontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
  "3xl": 64,
} as const;

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
} as const;
