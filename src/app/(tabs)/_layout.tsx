import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';

interface HushTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

function HushTabBar({ state, descriptors, navigation }: HushTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 10);

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: isDark ? '#14121F' : '#FFFFFF',
          borderTopColor: isDark ? '#262238' : '#F0EBE1',
          paddingBottom: bottomInset,
        },
      ]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        // Hide screens with href: null
        if (options.href === null) {
          return null;
        }

        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isFocused ? colors.primary : (isDark ? '#7E7A94' : '#8A869E'),
                  fontWeight: isFocused ? '700' : '500',
                },
              ]}>
              {label as string}
            </Text>
            {/* Golden Amber Underline Indicator */}
            <View
              style={[
                styles.tabIndicator,
                {
                  backgroundColor: isFocused ? colors.primary : 'transparent',
                },
              ]}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <HushTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
        }}
      />
      <Tabs.Screen
        name="prayers"
        options={{
          title: 'Pray & Walk',
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Circle',
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Wall & Journal',
        }}
      />
      {/* Hidden helper screens for deep navigation */}
      <Tabs.Screen
        name="walk"
        options={{
          href: null,
          title: 'Walk',
        }}
      />
      <Tabs.Screen
        name="wall"
        options={{
          href: null,
          title: 'Wall',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 56,
  },
  tabLabel: {
    fontSize: 13,
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  tabIndicator: {
    width: 24,
    height: 2.5,
    borderRadius: 2,
  },
});
