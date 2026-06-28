export const vybeonLightTheme = {
  colors: {
    background: "#FFFFFF",
    card: "#F8FAFF",
    border: "#E6E6E6",
    primary: "#7C3AED",
    accent: "#0066FF",
    success: "#16A34A",
    danger: "#DC2626",
    text: "#0A0A0A",
    subtext: "#6B7280",
    glass: "rgba(255, 255, 255, 0.8)",
  },
  radii: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
  },
  space: (n: number) => n * 4,
} as const;

export const vybeonDarkTheme = {
  colors: {
    background: "#0A0A0A",
    card: "#121212",
    border: "#1F1F1F",
    primary: "#7C3AED",
    accent: "#00E5FF",
    success: "#22C55E",
    danger: "#EF4444",
    text: "#FFFFFF",
    subtext: "#A1A1AA",
    glass: "rgba(18, 18, 18, 0.72)",
  },
  radii: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
  },
  space: (n: number) => n * 4,
} as const;

// Default export used by components; set to light theme for the redesign.
export const vybeonTheme = vybeonLightTheme as const;
