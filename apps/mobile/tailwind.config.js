/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "../packages/ui/src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ── Brand ──────────────────────────────────────────────────────────
        brand:        '#7C3AED',
        'brand-mid':  '#9333EA',
        'brand-light':'#A78BFA',
        'brand-soft': '#EDE9FE',

        // ── Light theme (main app) ─────────────────────────────────────────
        bg:           '#FFFFFF',
        'bg-splash':  '#FAFAFA',
        'bg-secondary':'#F9FAFB',
        'bg-card':    '#FFFFFF',
        'bg-input':   '#F9FAFB',
        ink:          '#1A1A2E',
        'ink-sec':    '#6B7280',
        'ink-muted':  '#9CA3AF',
        border:       '#E5E7EB',
        'border-light':'#F3F4F6',
        divider:      '#F1F1F5',

        // ── Dark theme (nightlife / venues) ───────────────────────────────
        'dark-bg':    '#0A0A1A',
        'dark-card':  '#1A1633',
        'dark-surf':  '#241E3D',

        // ── Semantic ──────────────────────────────────────────────────────
        success:      '#10B981',
        warning:      '#F59E0B',
        danger:       '#EF4444',
        gold:         '#C9A84C',
        'gold-light': '#F5E3A0',

        // ── Navigation ────────────────────────────────────────────────────
        'tab-active':   '#7C3AED',
        'tab-inactive': '#9CA3AF',

        // ── Legacy (kept for backward compat with existing dark screens) ──
        background: '#0A0A0A',
        card:       '#121212',
        surface:    '#1A1A1A',
        primary:    '#7C3AED',
        accent:     '#00E5FF',
        foreground: '#FFFFFF',
        vtext:      '#FFFFFF',
        subtext:    '#A1A1AA',
      },
    },
  },
  plugins: [],
};
