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
        primary: "#2D6A4F",
        "primary-light": "#52B788",
        "primary-dark": "#1B4332",
        accent: "#F4A261",
        "accent-light": "#FFBA80",
        "accent-dark": "#E07D3A",
        background: "#FAFAFA",
        surface: "#FFFFFF",
        "text-primary": "#1A1A1A",
        "text-secondary": "#6B7280",
        error: "#EF4444",
        warning: "#F59E0B",
        success: "#10B981",
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
