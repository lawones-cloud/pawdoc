export const Colors = {
  primary: "#1B4332",
  primaryMid: "#2D6A4F",
  primaryLight: "#52B788",
  primaryPale: "#D8F3DC",
  accent: "#F4A261",
  accentLight: "#FFBA80",
  accentDark: "#E07D3A",
  background: "#F7F8F6",
  surface: "#FFFFFF",
  surfaceElevated: "#FAFFF8",
  textPrimary: "#0F1F17",
  textSecondary: "#52796F",
  textMuted: "#95A89F",
  textInverse: "#FFFFFF",
  border: "#E2EBE6",
  borderLight: "#F0F4F2",
  error: "#DC2626",
  warning: "#D97706",
  success: "#059669",
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
  "2xl": 24,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: "#1B4332",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: "#1B4332",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: "#1B4332",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  card: {
    shadowColor: "#1B4332",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
} as const;
