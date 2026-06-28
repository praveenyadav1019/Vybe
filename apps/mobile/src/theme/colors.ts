export const colors = {
  // ── Light theme — clean & minimal ──────────────────────────────
  background: '#FFFFFF',
  card: '#FFFFFF',
  surface: '#F5F5F7',
  primary: '#7C3AED',
  primaryLight: '#9D6EFF',
  primaryDark: '#5B21B6',
  accent: '#7C3AED',
  accentDark: '#5B21B6',
  pink: '#7C3AED',
  coral: '#7C3AED',
  yellow: '#F59E0B',
  lime: '#22C55E',
  text: '#111827',
  subtext: '#6B7280',
  success: '#16A34A',
  danger: '#EF4444',
  warning: '#F59E0B',
  border: '#ECECF1',
  overlay: 'rgba(17,24,39,0.45)',
  glass: 'rgba(0,0,0,0.03)',
  glassBorder: 'rgba(0,0,0,0.08)',

  // Mode colors — calm, restrained
  modes: {
    dating: '#7C3AED',
    hook: '#7C3AED',
    'co-travel': '#16A34A',
    'night-out': '#7C3AED',
    'club-mates': '#6366F1',
    casual: '#9CA3AF',
    happening: '#F59E0B',
  },

  // Gradients — subtle, monochrome violet (no rainbow)
  gradients: {
    primary: ['#7C3AED', '#6D28D9'] as string[],
    vybe: ['#7C3AED', '#6D28D9'] as string[],
    sunset: ['#7C3AED', '#6D28D9'] as string[],
    ocean: ['#6366F1', '#4F46E5'] as string[],
    candy: ['#7C3AED', '#6D28D9'] as string[],
    lime: ['#22C55E', '#16A34A'] as string[],
    sunrise: ['#7C3AED', '#6D28D9'] as string[],
    accent: ['#6366F1', '#4F46E5'] as string[],
    dark: ['#F5F5F7', '#FFFFFF'] as string[],
    card: ['#FFFFFF', '#F9FAFB'] as string[],
    danger: ['#EF4444', '#B91C1C'] as string[],
    neon: ['#7C3AED', '#6366F1'] as string[],
  },
} as const;

export type Colors = typeof colors;
