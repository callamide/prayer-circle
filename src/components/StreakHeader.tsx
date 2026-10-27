import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { DayDot } from '@/lib/streak';

interface StreakHeaderProps {
  streak: number;
  last7Days: DayDot[];
  showTagline?: boolean;
}

const StreakHeaderComponent: React.FC<StreakHeaderProps> = ({
  streak,
  last7Days,
  showTagline = true,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Top Banner / Tagline */}
      {showTagline && (
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>Small prayers. Real faith. Together.</Text>
      )}

      {/* Streak Info */}
      <View style={styles.streakRow}>
        <View style={styles.flameBadge}>
          <Text style={styles.flameEmoji}>🔥</Text>
          <View>
            <Text style={styles.streakCount}>
              {streak} {streak === 1 ? 'day' : 'days'}
            </Text>
            <Text style={styles.streakSubtext}>
              {streak > 0 ? 'prayer streak' : 'start your habit today'}
            </Text>
          </View>
        </View>
      </View>

      {/* 7 Days Dots */}
      <View style={[styles.dotsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.dotsTitle, { color: colors.textSecondary }]}>THIS WEEK’S RHYTHM</Text>
        <View style={styles.dotsRow}>
          {last7Days.map((dot, index) => {
            return (
              <View key={dot.dateStr || index} style={styles.dayCol}>
                <View
                  style={[
                    styles.dot,
                    dot.hasPrayed && styles.dotPrayed,
                    dot.isToday && styles.dotToday,
                  ]}>
                  {dot.hasPrayed ? (
                    <Text style={styles.checkMark}>✓</Text>
                  ) : (
                    <View style={styles.dotEmptyInner} />
                  )}
                </View>
                <Text
                  style={[
                    styles.dayLabel,
                    dot.isToday && styles.dayLabelToday,
                    dot.hasPrayed && styles.dayLabelPrayed,
                  ]}>
                  {dot.dayLabel}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

export const StreakHeader = React.memo(StreakHeaderComponent);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  flameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flameEmoji: {
    fontSize: 28,
  },
  streakCount: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  streakSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  graceInfo: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  graceText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  dotsCard: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dotsTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayCol: {
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotPrayed: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dotToday: {
    borderColor: Colors.accent,
    borderWidth: 2,
  },
  dotEmptyInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  dayLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dayLabelToday: {
    fontWeight: '700',
    color: Colors.accent,
  },
  dayLabelPrayed: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
