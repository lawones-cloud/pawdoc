/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#1B4332",
        "primary-mid": "#2D6A4F",
        "primary-light": "#52B788",
        "primary-pale": "#D8F3DC",
        accent: "#F4A261",
        "accent-light": "#FFBA80",
        "accent-dark": "#E07D3A",
        background: "#F7F8F6",
        surface: "#FFFFFF",
        "surface-elevated": "#FAFFF8",
        "text-primary": "#0F1F17",
        "text-secondary": "#52796F",
        "text-muted": "#95A89F",
        border: "#E2EBE6",
        "border-light": "#F0F4F2",
        error: "#DC2626",
        warning: "#D97706",
        success: "#059669",
      },
      fontFamily: {
        "nunito-bold": ["Nunito_700Bold"],
        "inter-regular": ["Inter_400Regular"],
        "inter-medium": ["Inter_500Medium"],
        "inter-semibold": ["Inter_600SemiBold"],
      },
    },
  },
  plugins: [],
};
