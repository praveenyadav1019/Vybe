/**
 * Premium Light Theme — Apple + Airbnb + Instagram aesthetic.
 * Used for all new feature screens (Stories, Places, Venue, Clubmates).
 */
export const light = {
  // Backgrounds
  bg: '#F8F8FC',
  bgAlt: '#FFFFFF',
  card: '#FFFFFF',
  surface: '#F2F2F7',
  surfaceAlt: '#E8E8F0',

  // Text
  text: '#0A0A1A',
  textSec: '#3C3C4E',
  textTer: '#8E8E9A',
  textPlaceholder: '#AEAEB8',

  // Borders & Shadows
  border: '#E5E5EA',
  borderStrong: '#C7C7CC',
  shadow: '#00000012',

  // Brand
  primary: '#6C47FF',        // vibrant purple
  primaryLight: '#EDE9FF',
  primaryDark: '#4C2FCF',

  accent: '#00C2CB',         // teal
  accentLight: '#E0F9FA',

  pink: '#FF2D78',
  pinkLight: '#FFE5EF',

  amber: '#F59E0B',
  amberLight: '#FEF3C7',

  success: '#22C55E',
  successLight: '#DCFCE7',

  danger: '#EF4444',
  dangerLight: '#FEE2E2',

  // Gradients (from → to)
  gradPrimary: ['#7C3AED', '#6C47FF'] as [string, string],
  gradAccent: ['#00C2CB', '#00A8B5'] as [string, string],
  gradWarm: ['#F59E0B', '#EF4444'] as [string, string],
  gradNight: ['#0A0A1A', '#1A1035'] as [string, string],

  // Mode colors
  modes: {
    dating: '#FF2D78',
    hook: '#FF6B35',
    'co-travel': '#22C55E',
    'night-out': '#6C47FF',
    'club-mates': '#00C2CB',
    casual: '#8E8E9A',
    happening: '#F59E0B',
  },

  // Vibe score colors
  vibe: {
    fire: '#EF4444',    // 90+
    hype: '#F59E0B',    // 75+
    vibe: '#6C47FF',    // 60+
    active: '#22C55E',  // 45+
    chill: '#00C2CB',   // 30+
    quiet: '#8E8E9A',   // <30
  },
} as const;

export type LightColor = typeof light;
