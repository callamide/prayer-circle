import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from '@/components/UserAvatar';

interface OrbitAvatar {
  name: string;
  uri?: string | null;
}

interface CircleOrbitHeroProps {
  /** Avatars floating around the circle (first 4 are shown) */
  avatars?: OrbitAvatar[];
  size?: number;
}

const DEFAULT_AVATARS: OrbitAvatar[] = [
  { name: 'Tunde Ade' },
  { name: 'Grace Okafor' },
  { name: 'Blessing Eze' },
  { name: 'David Musa' },
];

// Footprint trail positions around the orbit (angle in degrees, rotation of the print)
const FOOTPRINTS = [
  { angle: -62, rot: 30 },
  { angle: -48, rot: 45 },
  { angle: -34, rot: 60 },
  { angle: 128, rot: 210 },
  { angle: 142, rot: 225 },
  { angle: 156, rot: 240 },
  { angle: 34, rot: 120 },
  { angle: 48, rot: 135 },
  { angle: 62, rot: 150 },
];

/**
 * "Praying together" illustration: soft mint circle with two walking companions,
 * a trail of footprints orbiting the circle and floating member avatars.
 * Pure React Native views + vector icons — no extra dependencies.
 */
export function CircleOrbitHero({ avatars, size = 260 }: CircleOrbitHeroProps) {
  const [float] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [float]);

  const floatUp = float.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const floatDown = float.interpolate({ inputRange: [0, 1], outputRange: [0, 6] });

  const list = [...(avatars || []), ...DEFAULT_AVATARS].slice(0, 4);
  const center = size / 2;
  const circleSize = size * 0.78;
  const trailRadius = size * 0.47;

  // Avatar placements: left-top, left-bottom, right-top, right-bottom
  const avatarSpots = [
    { left: size * 0.02, top: size * 0.2, s: size * 0.24, anim: floatUp },
    { left: size * -0.02, top: size * 0.52, s: size * 0.3, anim: floatDown },
    { left: size * 0.74, top: size * 0.4, s: size * 0.3, anim: floatUp },
    { left: size * 0.72, top: size * 0.66, s: size * 0.22, anim: floatDown },
  ];

  return (
    <View style={{ width: size, height: size }}>
      {/* Soft mint circle */}
      <View
        style={[
          styles.circle,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            left: center - circleSize / 2,
            top: center - circleSize / 2,
          },
        ]}
      />

      {/* Footprint trail orbiting the circle */}
      {FOOTPRINTS.map((f, i) => {
        const rad = (f.angle * Math.PI) / 180;
        const x = center + trailRadius * Math.sin(rad) - 9;
        const y = center - trailRadius * Math.cos(rad) - 9;
        return (
          <View
            key={i}
            style={[styles.print, { left: x, top: y, transform: [{ rotate: `${f.rot}deg` }] }]}>
            <Ionicons name="footsteps" size={18} color="#66A86A" />
          </View>
        );
      })}

      {/* Two walking companions */}
      <View style={[styles.figures, { left: 0, right: 0, top: center - size * 0.24 }]}>
        <Ionicons name="person" size={size * 0.4} color="#4A86C5" style={styles.figureLeft} />
        <Ionicons name="person" size={size * 0.4} color="#4A86C5" style={styles.figureRight} />
      </View>

      {/* Floating member avatars */}
      {list.map((a, i) => {
        const spot = avatarSpots[i];
        return (
          <Animated.View
            key={a.name + i}
            style={[
              styles.avatarSpot,
              { left: spot.left, top: spot.top, transform: [{ translateY: spot.anim }] },
            ]}>
            <UserAvatar name={a.name} uri={a.uri} size={spot.s} ring />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    position: 'absolute',
    backgroundColor: '#E3F1E4',
  },
  print: {
    position: 'absolute',
    opacity: 0.9,
  },
  figures: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  figureLeft: {
    marginRight: -14,
  },
  figureRight: {
    marginLeft: -14,
  },
  avatarSpot: {
    position: 'absolute',
  },
});
