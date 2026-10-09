import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { Prayer } from '@/types/database';

interface FocusPrayerCardProps {
  prayer: Prayer | null;
  onPrayedToday: () => void;
  onToggleShowAll: () => void;
  isShowingAll: boolean;
  onRotateNext?: () => void;
  totalActiveCount: number;
  onPressPrayerWalk?: () => void;
}

export const FocusPrayerCard: React.FC<FocusPrayerCardProps> = ({
  prayer,
  onPrayedToday,
  onToggleShowAll,
  isShowingAll,
  onRotateNext,
  totalActiveCount,
  onPressPrayerWalk,
}) => {
  const [isPressing, setIsPressing] = useState(false);

  if (!prayer) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyEmoji}>🌱</Text>
        <Text style={styles.emptyTitle}>No prayers yet</Text>
        <Text style={styles.emptySubtitle}>
          Add your first prayer to start your daily circle habit.
        </Text>
      </View>
    );
  }

  const daysPraying = differenceInCalendarDays(new Date(), parseISO(prayer.created_at)) + 1;

  return (
    <View style={styles.wrapper}>
      {/* Big Card */}
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.topRow}>
          <View style={styles.focusPill}>
            <Text style={styles.focusPillText}>TODAY’S FOCUS</Text>
          </View>

          {totalActiveCount > 1 && onRotateNext && (
            <TouchableOpacity
              onPress={onRotateNext}
              style={styles.cycleButton}
              activeOpacity={0.7}>
              <Text style={styles.cycleText}>Next focus →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>{prayer.title}</Text>

        {/* Details if present */}
        {prayer.details ? (
          <Text style={styles.details} numberOfLines={3}>
            {prayer.details}
          </Text>
        ) : null}

        {/* Badges row */}
        <View style={styles.badgesRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{prayer.category}</Text>
          </View>

          <View style={styles.daysBadge}>
            <Text style={styles.daysText}>
              Day {daysPraying} of praying
            </Text>
          </View>

          <View style={styles.privacyBadge}>
            <Text style={styles.privacyText}>
              {prayer.privacy === 'group' ? '👥 Circle' : '🔒 Private'}
            </Text>
          </View>
        </View>
      </View>

      {/* BIG Button below card: "🙏 I Prayed Today" */}
      <Pressable
        onPressIn={() => setIsPressing(true)}
        onPressOut={() => setIsPressing(false)}
        onPress={onPrayedToday}
        style={[
          styles.bigPrayButton,
          isPressing && styles.bigPrayButtonPressed,
        ]}>
        <Text style={styles.bigPrayButtonText}>🙏 I Prayed Today</Text>
      </Pressable>

      {/* Small pill button: "🚶 Prayer Walk" (secondary style, outline) */}
      {onPressPrayerWalk && (
        <TouchableOpacity
          onPress={onPressPrayerWalk}
          style={styles.prayerWalkPillBtn}
          activeOpacity={0.8}>
          <Text style={styles.prayerWalkPillText}>🚶 Prayer Walk</Text>
        </TouchableOpacity>
      )}

      {/* "Pray for another" collapsed toggle link */}
      <TouchableOpacity
        onPress={onToggleShowAll}
        style={styles.anotherLinkContainer}
        activeOpacity={0.7}>
        <Text style={styles.anotherLinkText}>
          {isShowingAll
            ? 'Hide prayer list ↑'
            : `Pray for another (${totalActiveCount} active) ↓`}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  focusPill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  focusPillText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  cycleButton: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  cycleText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 28,
    letterSpacing: -0.3,
    marginBottom: Spacing.sm,
  },
  details: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.xs,
  },
  categoryBadge: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  daysBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  daysText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  privacyBadge: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  privacyText: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  bigPrayButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  bigPrayButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  bigPrayButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  anotherLinkContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  anotherLinkText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  prayerWalkPillBtn: {
    marginTop: 10,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  prayerWalkPillText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
