import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { usePrayer } from '@/context/PrayerContext';
import { useTheme } from '@/context/ThemeContext';
import { Typography } from '@/constants/theme';

export default function WallTabScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { prayers } = usePrayer();

  const answeredPrayers = useMemo(() => {
    return prayers
      .filter((p) => p.status === 'answered')
      .sort((a, b) => (b.answered_at || b.created_at).localeCompare(a.answered_at || a.created_at));
  }, [prayers]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerEyebrow, { color: colors.primary }]}>TESTIMONIES OF FAITH</Text>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Typography.serif }]}>Wall</Text>
        </View>

        <View style={[styles.countBadge, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
          <Text style={[styles.countBadgeNumber, { color: colors.primary }]}>{answeredPrayers.length}</Text>
          <Text style={[styles.countBadgeLabel, { color: colors.textSecondary }]}>Answered</Text>
        </View>
      </View>

      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Scripture Quote Banner */}
        <View style={[styles.verseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.verseQuote, { color: colors.text, fontFamily: Typography.serif }]}>
            &ldquo;I will remember the deeds of the Lord; yes, I will remember your wonders of old.&rdquo;
          </Text>
          <Text style={[styles.verseRef, { color: colors.textTertiary }]}>— Psalm 77:11</Text>
        </View>

        {answeredPrayers.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="sparkles" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: Typography.serif }]}>
              Your Wall of Remembrance
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              When God moves in your life, mark a prayer as answered. Your testimonies will be preserved here as a living monument of His grace.
            </Text>
            <TouchableOpacity
              style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(tabs)/prayers' as any)}
              activeOpacity={0.85}>
              <Text style={[styles.emptyActionBtnText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>
                View Active Prayers
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          answeredPrayers.map((prayer) => {
            const answeredDate = prayer.answered_at
              ? format(parseISO(prayer.answered_at), 'MMMM d, yyyy')
              : format(parseISO(prayer.created_at), 'MMMM d, yyyy');

            return (
              <View
                key={prayer.id}
                style={[styles.testimonyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.testimonyHeader}>
                  <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={14} color={isDark ? '#14121F' : '#FFFFFF'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.prayerTitle, { color: colors.text, fontFamily: Typography.serif }]}>
                      {prayer.title}
                    </Text>
                    <Text style={[styles.answeredDate, { color: colors.textTertiary }]}>
                      Answered on {answeredDate}
                    </Text>
                  </View>
                </View>

                {Boolean(prayer.testimony) && (
                  <View style={[styles.testimonyBox, { backgroundColor: isDark ? '#1C1929' : '#FBF9F5', borderColor: colors.border }]}>
                    <Text style={[styles.testimonyText, { color: colors.textSecondary }]}>
                      &ldquo;{prayer.testimony}&rdquo;
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '400',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  countBadgeNumber: {
    fontSize: 14,
    fontWeight: '800',
  },
  countBadgeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  verseCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  verseQuote: {
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 6,
  },
  verseRef: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  testimonyCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  testimonyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerTitle: {
    fontSize: 17,
    fontWeight: '500',
  },
  answeredDate: {
    fontSize: 12,
    marginTop: 2,
  },
  testimonyBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  testimonyText: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  emptyBox: {
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '400',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyActionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
