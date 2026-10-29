import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface HushTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const TAB_CONFIG: Record<
  string,
  {
    title: string;
    focusedIcon: keyof typeof Ionicons.glyphMap;
    unfocusedIcon: keyof typeof Ionicons.glyphMap;
  }
> = {
  index: {
    title: 'Today',
    focusedIcon: 'sunny',
    unfocusedIcon: 'sunny-outline',
  },
  prayers: {
    title: 'Pray & Walk',
    focusedIcon: 'footsteps',
    unfocusedIcon: 'footsteps-outline',
  },
  groups: {
    title: 'Circle',
    focusedIcon: 'people',
    unfocusedIcon: 'people-outline',
  },
  journal: {
    title: 'Wall & Journal',
    focusedIcon: 'book',
    unfocusedIcon: 'book-outline',
  },
  profile: {
    title: 'Profile',
    focusedIcon: 'person',
    unfocusedIcon: 'person-outline',
  },
};

const ALLOWED_TABS = ['index', 'prayers', 'groups', 'journal', 'profile'];

function HushTabBar({ state, descriptors, navigation }: HushTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 22 : 8);

  // Filter routes to only include allowed tabs
  const visibleRoutes = state.routes.filter((route: any) =>
    ALLOWED_TABS.includes(route.name)
  );

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
      {visibleRoutes.map((route: any) => {
        const routeIndex = state.routes.findIndex((r: any) => r.key === route.key);
        const isFocused = state.index === routeIndex;
        const config = TAB_CONFIG[route.name] || {
          title: route.name,
          focusedIcon: 'apps',
          unfocusedIcon: 'apps-outline',
        };

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

        const activeColor = colors.primary;
        const inactiveColor = isDark ? '#7E7A94' : '#8A869E';
        const currentColor = isFocused ? activeColor : inactiveColor;
        const iconName = isFocused ? config.focusedIcon : config.unfocusedIcon;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}>
            <Ionicons
              name={iconName}
              size={21}
              color={currentColor}
              style={styles.tabIcon}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.tabLabel,
                {
                  color: currentColor,
                  fontWeight: isFocused ? '700' : '500',
                },
              ]}>
              {config.title}
            </Text>
            {/* Golden Amber Underline Indicator */}
            <View
              style={[
                styles.tabIndicator,
                {
                  backgroundColor: isFocused ? activeColor : 'transparent',
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
      <Tabs.Screen
        name="profile"
        options={{
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
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  tabIcon: {
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10.5,
    letterSpacing: 0.1,
    marginBottom: 3,
  },
  tabIndicator: {
    width: 18,
    height: 2.5,
    borderRadius: 2,
  },
});
