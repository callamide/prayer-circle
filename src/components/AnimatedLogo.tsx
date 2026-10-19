import React, { useEffect, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';

const LOGO_IMG = require('@/assets/images/logo.png');

interface AnimatedLogoProps {
  /** Width and height of the logo emblem in dp */
  size?: number;
  /**
   * 'hero' displays concentric breathing sanctuary aura rings behind the floating emblem.
   * 'compact' displays a subtle breathing pulse suitable for headers and avatars.
   */
  variant?: 'hero' | 'compact';
  /** Optional container style override */
  style?: StyleProp<ViewStyle>;
}

/**
 * Spiritual Breathing Animated Logo (Style 1)
 * Continuous 3.2-second calm inhale/exhale cycle with concentric sanctuary aura rings.
 */
export function AnimatedLogo({
  size = 112,
  variant = 'hero',
  style,
}: AnimatedLogoProps) {
  // Primary 3.2s breathing phase: 0 (exhale rest) -> 1 (full inhale) -> 0 (exhale rest)
  const [breathAnim] = useState(() => new Animated.Value(0));
  // Secondary slightly offset ripple for outer sanctuary aura ring
  const [outerAuraAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const outerLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(250),
        Animated.timing(outerAuraAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(outerAuraAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    breathLoop.start();
    if (variant === 'hero') {
      outerLoop.start();
    }

    return () => {
      breathLoop.stop();
      outerLoop.stop();
    };
  }, [breathAnim, outerAuraAnim, variant]);

  const isHero = variant === 'hero';

  // Emblem breathing scale & gentle upward float
  const logoScale = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, isHero ? 1.075 : 1.055],
  });

  const logoTranslateY = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isHero ? -3.5 : -1.5],
  });

  // Inner sanctuary aura ring
  const innerRingScale = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1.14],
  });

  const innerRingOpacity = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.55],
  });

  // Outer sanctuary aura ring
  const outerRingScale = outerAuraAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.28],
  });

  const outerRingOpacity = outerAuraAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.32],
  });

  const containerSize = isHero ? Math.round(size * 1.25) : size;
  const innerAuraSize = Math.round(size * 0.96);
  const outerAuraSize = Math.round(size * 1.14);

  return (
    <View
      style={[
        styles.container,
        { width: containerSize, height: containerSize },
        style,
      ]}>
      {isHero && (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.outerAuraRing,
              {
                width: outerAuraSize,
                height: outerAuraSize,
                borderRadius: outerAuraSize / 2,
                opacity: outerRingOpacity,
                transform: [{ scale: outerRingScale }],
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.innerAuraRing,
              {
                width: innerAuraSize,
                height: innerAuraSize,
                borderRadius: innerAuraSize / 2,
                opacity: innerRingOpacity,
                transform: [{ scale: innerRingScale }],
              },
            ]}
          />
        </>
      )}

      <Animated.View
        style={{
          width: size,
          height: size,
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ scale: logoScale }, { translateY: logoTranslateY }],
        }}>
        <Image
          source={LOGO_IMG}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerAuraRing: {
    position: 'absolute',
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: 'rgba(76, 175, 80, 0.25)',
  },
  outerAuraRing: {
    position: 'absolute',
    backgroundColor: 'rgba(232, 245, 233, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.16)',
  },
});
