export const LightColors = {
  primary: '#2E7D32', // Soft forest green
  primaryLight: '#E8F5E9', // Soft mint / sage background
  primaryDark: '#1B5E20',
  secondary: '#388E3C',
  accent: '#E65100', // Fire / Streak amber
  accentLight: '#FFF3E0',

  background: '#F9FAF9', // Clean soft background
  card: '#FFFFFF', // Pure white card
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F1',

  text: '#192219', // Deep soft charcoal
  textSecondary: '#5C6A5D', // Muted slate green
  textTertiary: '#8E9B8F',

  border: '#E2E8E2', // Subtle soft borders
  borderLight: '#EDF1ED',

  error: '#D32F2F',
  success: '#2E7D32',
  white: '#FFFFFF',
};

export const DarkColors = {
  primary: '#4CAF50', // Vibrant leaf green in dark mode
  primaryLight: '#1B3520', // Deep soft forest tint
  primaryDark: '#2E7D32',
  secondary: '#66BB6A',
  accent: '#FF9800', // Fire / Streak amber
  accentLight: '#3D2808',

  background: '#0F1410', // Deep OLED-friendly forest black
  card: '#18201A', // Rich elevated card surface
  surface: '#1F2922',
  surfaceVariant: '#27342B',

  text: '#F1F5F2', // Crisp readable off-white
  textSecondary: '#A2B4A5', // Soft muted sage
  textTertiary: '#6F8072',

  border: '#2A372D', // Subtle dark border
  borderLight: '#212C23',

  error: '#EF5350',
  success: '#4CAF50',
  white: '#FFFFFF',
};

export type ThemeColors = typeof LightColors;

// Backwards-compatible default colors reference
export const Colors = LightColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  card: 16, // Large rounded 16px cards
  button: 16, // Large rounded 16px buttons
  full: 9999,
};
