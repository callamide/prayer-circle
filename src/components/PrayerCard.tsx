import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { Prayer } from '@/types/database';

interface PrayerCardProps {
  prayer: Prayer;
  onPressPray?: (prayer: Prayer) => void;
  onMarkAnswered: (prayer: Prayer) => void;
  onEdit?: (prayer: Prayer) => void;
  onDelete?: (prayer: Prayer) => void;
  onPrayAndWalk?: (prayer: Prayer) => void;
  isFocused?: boolean;
}

const PrayerCardComponent: React.FC<PrayerCardProps> = ({
  prayer,
  onPressPray,
  onMarkAnswered,
  onEdit,
  onDelete,
  onPrayAndWalk,
  isFocused = false,
}) => {
  const { colors, isDark } = useTheme();
  const daysPraying = differenceInCalendarDays(new Date(), parseISO(prayer.created_at)) + 1;

  const handleLongPress = () => {
    Alert.alert(
      'Prayer Options',
      prayer.title,
      [
        {
          text: '🎉 Mark as Answered',
          onPress: () => onMarkAnswered(prayer),
        },
        ...(onPrayAndWalk
          ? [
              {
                text: '🚶 Pray & Walk for this',
                onPress: () => onPrayAndWalk(prayer),
              },
            ]
          : []),
        ...(onEdit
          ? [
              {
                text: 'Edit Prayer',
                onPress: () => onEdit(prayer),
              },
            ]
          : []),
        ...(onDelete
          ? [
              {
                text: 'Delete',
                style: 'destructive' as const,
                onPress: () => onDelete(prayer),
              },
            ]
          : []),
        { text: 'Cancel', style: 'cancel' as const },
      ],
      { cancelable: true }
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        isFocused && { borderColor: colors.primary, borderWidth: 1.5 },
      ]}
      activeOpacity={0.85}
      onLongPress={handleLongPress}>
      <View style={styles.content}>
        {/* Top meta row */}
        <View style={styles.metaRow}>
          <View style={[styles.categoryPill, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.categoryText, { color: colors.textSecondary }]}>{prayer.category}</Text>
          </View>

          <View style={[styles.daysPill, { backgroundColor: isDark ? '#262238' : '#F3EFE6' }]}>
            <Text style={[styles.daysText, { color: colors.textSecondary }]}>Day {daysPraying}</Text>
          </View>

          <View style={styles.privacyPill}>
            <Text style={[styles.privacyIcon, { color: colors.textTertiary }]}>
              {prayer.privacy === 'group' ? '👥 Circle' : '🔒 Private'}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {prayer.title}
        </Text>

        {/* Details preview */}
        {prayer.details ? (
          <Text style={[styles.details, { color: colors.textSecondary }]} numberOfLines={2}>
            {prayer.details}
          </Text>
        ) : null}

        {/* Action row */}
        <View style={[styles.actionsRow, { borderTopColor: isDark ? '#2D2A44' : '#F0EBE1' }]}>
          {onPressPray && (
            <TouchableOpacity
              style={[
                styles.quickPrayBtn,
                {
                  backgroundColor: isDark ? '#2A2433' : '#FDF4E7',
                  borderColor: isDark ? '#3A3652' : '#F3EFE6',
                },
              ]}
              onPress={() => onPressPray(prayer)}
              activeOpacity={0.7}>
              <Text style={[styles.quickPrayText, { color: colors.primary }]}>🙏 Pray</Text>
            </TouchableOpacity>
          )}

          {onPrayAndWalk && (
            <TouchableOpacity
              style={[
                styles.quickPrayBtn,
                {
                  backgroundColor: isDark ? '#2A2433' : '#FDF4E7',
                  borderColor: isDark ? '#3A3652' : '#F3EFE6',
                },
              ]}
              onPress={() => onPrayAndWalk(prayer)}
              activeOpacity={0.7}>
              <Text style={[styles.quickPrayText, { color: colors.primary }]}>🚶 Walk</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.answerBtn,
              {
                backgroundColor: isDark ? '#26202B' : '#FFF9E6',
                borderColor: isDark ? '#4A3B2A' : '#FFE082',
              },
            ]}
            onPress={() => onMarkAnswered(prayer)}
            activeOpacity={0.7}>
            <Text style={[styles.answerBtnText, { color: colors.primary }]}>🎉 Answered</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const PrayerCard = React.memo(PrayerCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  focusedBorder: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  content: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryPill: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  daysPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  daysText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  privacyPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  privacyIcon: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 22,
  },
  details: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  quickPrayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  quickPrayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  answerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  answerBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
