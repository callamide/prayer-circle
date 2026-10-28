import { Platform } from 'react-native';

export const LightColors = {
  primary: '#C87A24', // Warm rich amber terracotta
  primaryLight: '#FDF4E7', // Soft warm amber tint
  primaryDark: '#9E5B10',
  secondary: '#388E3C',
  accent: '#F2B35E', // Warm glowing amber
  accentLight: '#FFF8EE',

  background: '#FAF9F5', // Hush warm linen background
  card: '#FFFFFF', // Pure white card
  cardHighlight: '#F9F5EC',
  surface: '#FFFFFF',
  surfaceVariant: '#F3EFE6',

  text: '#1F1E1D', // Hush soft charcoal
  textSecondary: '#6B6A68', // Hush muted warm slate
  textTertiary: '#9C9890',

  border: '#EAE4D9', // Subtle warm border
  borderLight: '#F2ECE0',

  error: '#D32F2F',
  success: '#2E7D32',
  white: '#FFFFFF',
};

export const DarkColors = {
  primary: '#F2B35E', // Warm glowing amber gold from Hush
  primaryLight: '#3A2F2A', // Warm amber-night tint
  primaryDark: '#D4943E',
  secondary: '#E58F8F', // Soft blush accent
  accent: '#F2B35E', // Warm flame amber
  accentLight: '#2A2433',

  background: '#14121F', // Hush signature deep midnight plum/violet
  card: '#201D31', // Hush elevated card surface
  cardHighlight: '#2A2433', // Highlighted card surface
  surface: '#201D31',
  surfaceVariant: '#2A2433',

  text: '#F3EDE4', // Hush warm cream text
  textSecondary: '#B9B3CF', // Hush muted soft lavender-slate
  textTertiary: '#7A7593',

  border: '#3A3652', // Hush dark border
  borderLight: '#2D2A44',

  error: '#E58F8F',
  success: '#8FC7B5', // Soft mint / sage
  white: '#FFFFFF',
};

export const Typography = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  sans: Platform.select({ ios: 'System', android: 'Roboto', default: 'sans-serif' }),
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
