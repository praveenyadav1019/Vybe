/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}", "../packages/ui/src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        card: "#121212",
        surface: "#1A1A1A",
        border: "#2A2A2A",
        primary: "#7C3AED",
        accent: "#00E5FF",
        success: "#22C55E",
        danger: "#EF4444",
        warning: "#F59E0B",
        foreground: "#FFFFFF",
        vtext: "#FFFFFF",
        subtext: "#A1A1AA",
      },
    },
  },
  plugins: [],
};
