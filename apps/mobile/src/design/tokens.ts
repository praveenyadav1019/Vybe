/**
 * VYBEON Design Token System
 * Extracted pixel-by-pixel from UI reference images.
 * Single source of truth for all screens.
 */

// ─── Color Palette ────────────────────────────────────────────────────────────

export const palette = {
  // Brand purple
  purple50:  '#F5F3FF',
  purple100: '#EDE9FE',
  purple200: '#DDD6FE',
  purple300: '#C4B5FD',
  purple400: '#A78BFA',
  purple500: '#8B5CF6',
  purple600: '#7C3AED',
  purple700: '#6D28D9',
  purple800: '#5B21B6',
  purple900: '#4C1D95',

  // Logo gradient exact colors
  logoTop:    '#9333EA',
  logoBottom: '#C084FC',

  // Neutrals
  white:   '#FFFFFF',
  gray50:  '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Dark surfaces (venues / nightlife / checkout)
  dark50:  '#F0EEFF',
  dark900: '#0A0A1A',
  dark800: '#12102A',
  dark750: '#1A1633',
  dark700: '#1E1A38',
  dark600: '#241E3D',
  dark500: '#2D2654',

  // Gold / Premium
  gold:      '#C9A84C',
  goldLight: '#F5E3A0',
  goldDark:  '#A07B2A',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error:   '#EF4444',
  info:    '#3B82F6',
} as const;


// ─── Semantic Color Tokens ────────────────────────────────────────────────────

export const C = {
  // Brand
  brand:     palette.purple600,   // #7C3AED — primary purple
  brandMid:  palette.logoTop,     // #9333EA — medium purple
  brandSoft: palette.purple100,   // #EDE9FE — very light purple tint
  brandGlow: 'rgba(124,58,237,0.18)',

  // Logo gradient
  logoFrom: palette.logoTop,      // #9333EA
  logoTo:   palette.logoBottom,   // #C084FC

  // ── Light theme (main app screens) ──────────────────────────────────────
  // Backgrounds
  bgPrimary:   palette.white,     // #FFFFFF — main screens
  bgSplash:    '#FAFAFA',         // splash (near white, very slight warm tint)
  bgSecondary: palette.gray50,    // #F9FAFB — secondary areas
  bgCard:      palette.white,
  bgInput:     palette.gray50,    // input field background

  // Text
  textPrimary:     '#1A1A2E',     // near-black with purple tint (from home/profile refs)
  textSecondary:   palette.gray500,
  textMuted:       palette.gray400,
  textPlaceholder: palette.gray300,
  textWhite:       palette.white,
  textInverse:     palette.white,

  // UI chrome
  border:      palette.gray200,   // #E5E7EB
  borderLight: palette.gray100,   // #F3F4F6
  divider:     '#F1F1F5',
  hairline:    'rgba(0,0,0,0.08)',

  // ── Dark theme (venue / nightlife / events / checkout) ──────────────────
  darkBg:      palette.dark900,
  darkCard:    palette.dark750,
  darkSurface: palette.dark700,
  darkBorder:  palette.dark500,
  darkText:    palette.white,
  darkSubtext: 'rgba(255,255,255,0.6)',

  // ── Navigation ────────────────────────────────────────────────────────────
  tabBg:       palette.white,
  tabActive:   palette.purple600,
  tabInactive: palette.gray400,
  tabBorder:   '#F1F1F5',

  // ── Chat ──────────────────────────────────────────────────────────────────
  bubbleMine:   palette.purple600,
  bubbleTheirs: palette.gray100,
  chatBg:       palette.white,

  // ── Story rings ───────────────────────────────────────────────────────────
  storyRingActive:   palette.logoTop,     // unviewed ring
  storyRingViewed:   palette.gray300,     // viewed ring
  storyRingMe:       palette.gray200,     // "You" add-story ring

  // ── Semantic ──────────────────────────────────────────────────────────────
  success: palette.success,
  warning: palette.warning,
  danger:  palette.error,
  gold:    palette.gold,
  goldLight: palette.goldLight,

  // ── Overlays ──────────────────────────────────────────────────────────────
  overlayDark:   'rgba(0,0,0,0.55)',
  overlayLight:  'rgba(255,255,255,0.9)',
  overlayBrand:  'rgba(124,58,237,0.12)',
} as const;


// ─── Typography ───────────────────────────────────────────────────────────────

export const T = {
  size: {
    xs:   11,
    sm:   12,
    base: 13,
    md:   15,
    lg:   16,
    xl:   18,
    '2xl': 22,
    '3xl': 28,
    '4xl': 32,
    hero:  40,
  },
  weight: {
    regular:   '400' as const,
    medium:    '500' as const,
    semibold:  '600' as const,
    bold:      '700' as const,
    extrabold: '800' as const,
    black:     '900' as const,
  },
  tracking: {
    tight:   -0.5,
    normal:  0,
    wide:    0.5,
    wider:   1,
    widest:  2,
    logo:    4,     // "VYBEON" letter spacing
  },
  leading: {
    tight:   1.2,
    snug:    1.35,
    normal:  1.5,
    relaxed: 1.7,
  },
} as const;


// ─── Spacing ──────────────────────────────────────────────────────────────────

export const S = {
  0:  0,
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  7:  28,
  8:  32,
  10: 40,
  12: 48,
  16: 64,

  // Semantic aliases
  screenH:   16,   // horizontal screen padding
  screenV:   20,   // vertical section padding from top
  section:   24,   // gap between sections
  card:      16,   // card internal padding
  item:      12,   // gap between list items
  icon:      8,    // icon-to-label gap
} as const;


// ─── Border Radius ────────────────────────────────────────────────────────────

export const R = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,

  // Semantic
  card:    16,
  button:  9999,   // pill buttons
  input:   12,
  avatar:  9999,
  sheet:   24,     // bottom-sheet top corners
  badge:   9999,
  chip:    20,
} as const;


// ─── Shadows ──────────────────────────────────────────────────────────────────

export const SH = {
  xs: {
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sm: {
    shadowColor: '#000000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOpacity: 0.09,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOpacity: 0.13,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  brand: {
    shadowColor: '#7C3AED',
    shadowOpacity: 0.30,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
  gold: {
    shadowColor: '#C9A84C',
    shadowOpacity: 0.30,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
  tab: {
    shadowColor: '#000000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 },
    elevation: 10,
  },
} as const;


// ─── Animation presets ────────────────────────────────────────────────────────

export const ANIM = {
  spring: {
    gentle:  { damping: 20, stiffness: 200, mass: 0.8 },
    bouncy:  { damping: 12, stiffness: 180, mass: 0.8 },
    snappy:  { damping: 25, stiffness: 300, mass: 0.8 },
    logo:    { damping: 14, stiffness: 120, mass: 1.0 },
  },
  duration: {
    instant: 100,
    fast:    150,
    normal:  250,
    slow:    400,
    enter:   320,
    exit:    200,
    splash:  2600,   // total splash animation duration before nav
  },
  delay: {
    logo:    0,
    tagline: 600,
    bar:     900,
    nav:     2400,
  },
} as const;


// ─── Component dimension constants ────────────────────────────────────────────

export const DIM = {
  tabBarHeight:   56,    // visible tab bar height (excl. safe area)
  headerHeight:   56,
  storyAvatar:    56,    // story ring outer diameter
  storyInner:     48,    // story image diameter
  avatarXS:       28,
  avatarSM:       36,
  avatarMD:       48,
  avatarLG:       64,
  avatarXL:       96,
  venueCardW:     155,
  venueCardH:     195,
  personCardW:    130,
  personCardH:    168,
  matchCardSize:  54,    // "new match" circle in chat list
  buttonHeight:   52,
  inputHeight:    52,
} as const;
