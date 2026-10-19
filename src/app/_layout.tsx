import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PrayerProvider } from '@/context/PrayerContext';
import { requestNotificationPermissions } from '@/lib/notifications';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  const [showSplashOverlay, setShowSplashOverlay] = useState(true);
  const [overlayOpacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    requestNotificationPermissions();

    // Let the Spiritual Breathing logo animate on app launch, then smoothly dissolve
    const timer = setTimeout(() => {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }).start(() => {
        setShowSplashOverlay(false);
      });
    }, 1650);

    return () => clearTimeout(timer);
  }, [overlayOpacity]);

  return (
    <SafeAreaProvider>
      <PrayerProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#FFFFFF' },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="onboarding"
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="join"
            options={{
              headerShown: false,
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="prayer-walk"
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="journal"
            options={{
              headerShown: false,
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
        </Stack>

        {showSplashOverlay && (
          <Animated.View
            pointerEvents="none"
            style={[styles.splashOverlay, { opacity: overlayOpacity }]}>
            <AnimatedLogo size={136} variant="hero" />
            <Text style={styles.splashTitle}>Prayer Walk</Text>
            <Text style={styles.splashSubtitle}>Walk with God. Pray every step.</Text>
          </Animated.View>
        )}
      </PrayerProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  splashTitle: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  splashSubtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
