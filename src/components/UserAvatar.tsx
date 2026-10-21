import React from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

// Warm, brand-aligned palette for initials avatars (picked deterministically per name)
const AVATAR_COLORS = [
  { bg: '#E8F5E9', fg: '#2E7D32' },
  { bg: '#E3F2FD', fg: '#1565C0' },
  { bg: '#FFF3E0', fg: '#E65100' },
  { bg: '#F3E5F5', fg: '#6A1B9A' },
  { bg: '#E0F2F1', fg: '#00695C' },
  { bg: '#FCE4EC', fg: '#AD1457' },
];

function getInitials(name?: string | null) {
  const clean = (name || '').trim();
  if (!clean) return '🙏';
  const parts = clean.split(/\s+/);
  const first = parts[0]?.[0] || '';
  const second = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + second).toUpperCase();
}

function pickColor(name?: string | null) {
  const s = (name || 'P').trim();
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

interface UserAvatarProps {
  name?: string | null;
  uri?: string | null;
  size?: number;
  /** Draws a white ring around the avatar (used for floating / overlapping avatars) */
  ring?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Circular user avatar: shows the profile photo when available, otherwise colored initials. */
export function UserAvatar({ name, uri, size = 40, ring = false, style }: UserAvatarProps) {
  const color = pickColor(name);
  const ringWidth = ring ? Math.max(2, Math.round(size * 0.06)) : 0;

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color.bg,
          borderWidth: ringWidth,
        },
        ring && styles.ring,
        style,
      ]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size - ringWidth * 2, height: size - ringWidth * 2, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <Text style={[styles.initials, { color: color.fg, fontSize: Math.round(size * 0.38) }]}>
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderColor: '#FFFFFF',
  },
  ring: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  initials: {
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
