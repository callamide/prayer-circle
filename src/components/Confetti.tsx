import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

interface ConfettiProps {
  active: boolean;
  onAnimationEnd?: () => void;
  count?: number;
}

const COLORS = ['#2E7D32', '#4CAF50', '#81C784', '#FFD54F', '#FFB74D', '#80CBC4', '#A5D6A7'];

interface ParticleItem {
  id: number;
  xPct: number;
  yAnim: Animated.Value;
  xAnim: Animated.Value;
  rotateAnim: Animated.Value;
  opacityAnim: Animated.Value;
  size: number;
  color: string;
  delay: number;
}

function createParticles(count: number): ParticleItem[] {
  return Array.from({ length: count }, (_, i) => {
    // Deterministic pseudo-random distribution
    const seed = (i * 9301 + 49297) % 233280;
    const random1 = seed / 233280;
    const random2 = ((seed * 9301 + 49297) % 233280) / 233280;
    const random3 = ((seed * 1337 + 7919) % 233280) / 233280;

    return {
      id: i,
      xPct: random1,
      yAnim: new Animated.Value(-20),
      xAnim: new Animated.Value(0),
      rotateAnim: new Animated.Value(0),
      opacityAnim: new Animated.Value(1),
      size: 6 + random2 * 8,
      color: COLORS[i % COLORS.length],
      delay: random3 * 350,
    };
  });
}

export const Confetti: React.FC<ConfettiProps> = ({ active, onAnimationEnd, count = 36 }) => {
  const [particles] = useState<ParticleItem[]>(() => createParticles(count));
  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;

  useEffect(() => {
    if (!active) return;

    particles.forEach((p) => {
      p.yAnim.setValue(-20);
      p.xAnim.setValue(0);
      p.rotateAnim.setValue(0);
      p.opacityAnim.setValue(1);
    });

    const animations = particles.map((p, idx) => {
      const lateralMove = ((idx % 2 === 0 ? 1 : -1) * (40 + (idx * 7) % 80));
      return Animated.sequence([
        Animated.delay(p.delay),
        Animated.parallel([
          Animated.timing(p.yAnim, {
            toValue: windowHeight * 0.75 + (idx % 10) * 10,
            duration: 1800 + (idx % 5) * 100,
            useNativeDriver: true,
          }),
          Animated.timing(p.xAnim, {
            toValue: lateralMove,
            duration: 1800 + (idx % 5) * 100,
            useNativeDriver: true,
          }),
          Animated.timing(p.rotateAnim, {
            toValue: 360 * (idx % 2 === 0 ? 1 : -1),
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(p.opacityAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    Animated.parallel(animations).start(() => {
      if (onAnimationEnd) onAnimationEnd();
    });
  }, [active, onAnimationEnd, particles, windowHeight]);

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => {
        const spin = p.rotateAnim.interpolate({
          inputRange: [-360, 0, 360],
          outputRange: ['-360deg', '0deg', '360deg'],
        });

        return (
          <Animated.View
            key={p.id}
            style={[
              styles.particle,
              {
                left: p.xPct * windowWidth,
                width: p.size,
                height: p.size * 1.5,
                backgroundColor: p.color,
                opacity: p.opacityAnim,
                transform: [
                  { translateY: p.yAnim },
                  { translateX: p.xAnim },
                  { rotate: spin },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    top: 0,
    borderRadius: 3,
  },
});
