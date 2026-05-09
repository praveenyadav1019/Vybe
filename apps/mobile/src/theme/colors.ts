export const colors = {
  background: '#0A0A0A',
  card: '#121212',
  surface: '#1A1A1A',
  primary: '#7C3AED',
  primaryLight: '#9D6EFF',
  primaryDark: '#5B21B6',
  accent: '#00E5FF',
  accentDark: '#00B8CC',
  text: '#FFFFFF',
  subtext: '#A1A1AA',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  border: '#2A2A2A',
  overlay: 'rgba(0,0,0,0.7)',
  glass: 'rgba(255,255,255,0.05)',
  glassBorder: 'rgba(255,255,255,0.1)',

  // Mode colors
  modes: {
    dating: '#FF4D6D',
    hook: '#FF6B35',
    'co-travel': '#4CAF50',
    'night-out': '#7C3AED',
    'club-mates': '#00E5FF',
    casual: '#A1A1AA',
  },

  // Gradients (as arrays for LinearGradient)
  gradients: {
    primary: ['#7C3AED', '#4C1D95'] as string[],
    accent: ['#00E5FF', '#0066CC'] as string[],
    dark: ['#1A1A2E', '#0A0A0A'] as string[],
    card: ['#1E1E2E', '#121212'] as string[],
    danger: ['#EF4444', '#991B1B'] as string[],
    neon: ['#7C3AED', '#00E5FF'] as string[],
  },
} as const;

export type Colors = typeof colors;
