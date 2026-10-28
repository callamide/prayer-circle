import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { format } from 'date-fns';
import { usePrayer } from '@/context/PrayerContext';
import { useTheme } from '@/context/ThemeContext';
import { Typography } from '@/constants/theme';
import { Confetti } from '@/components/Confetti';
import { FocusPrayerCard } from '@/components/FocusPrayerCard';
import { NewPrayerModal } from '@/components/NewPrayerModal';
import { AnsweredModal } from '@/components/AnsweredModal';
import { Prayer } from '@/types/database';

export default function TodayScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const {
    profile,
    prayers,
    groups,
    last7Days,
    todaysFocusPrayer,
    rotateFocusPrayer,
    checkInPrayer,
    addPrayer,
    markAsAnswered,
    isOnboarded,
    isLoading,
  } = usePrayer();

  const [showConfetti, setShowConfetti] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [answeredModalPrayer, setAnsweredModalPrayer] = useState<Prayer | null>(null);

  // If not onboarded yet, redirect to onboarding
  useEffect(() => {
    if (!isLoading && !isOnboarded) {
      router.replace('/onboarding');
    }
  }, [isLoading, isOnboarded, router]);

  // Today's Date & Greeting
  const todayDateString = useMemo(() => {
    return format(new Date(), 'EEEE, d MMMM');
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning. Take a quiet minute.';
    if (hour < 17) return 'Good afternoon. Take a quiet minute.';
    return 'Good evening. Take a quiet minute.';
  }, []);

  // Streak & Milestone calculation
  const streak = profile?.prayer_streak || 0;
  const milestone = useMemo(() => {
    if (streak < 7) {
      const days = 7 - streak;
      return `${days} ${days === 1 ? 'day' : 'days'} to your 1–week milestone`;
    }
    if (streak < 14) {
      const days = 14 - streak;
      return `${days} ${days === 1 ? 'day' : 'days'} to your 2–week milestone`;
    }
    if (streak < 30) {
      const days = 30 - streak;
      return `${days} ${days === 1 ? 'day' : 'days'} to your 1–month milestone`;
    }
    const nextMilestone = Math.ceil((streak + 1) / 30) * 30;
    const days = nextMilestone - streak;
    return `${days} ${days === 1 ? 'day' : 'days'} to your ${nextMilestone}–day milestone`;
  }, [streak]);

  // Check if prayed today
  const hasPrayedToday = useMemo(() => {
    const todayDot = last7Days.find((d) => d.isToday);
    return Boolean(todayDot?.hasPrayed);
  }, [last7Days]);

  // Format gentle reminder time
  const formattedReminderTime = useMemo(() => {
    const timeStr = profile?.reminder_time || '20:00';
    try {
      const [h, m] = timeStr.split(':').map(Number);
      const period = h >= 12 ? 'pm' : 'am';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      const displayMin = m ? `:${m < 10 ? '0' : ''}${m}` : ':00';
      return `${displayHour}${displayMin} ${period}`;
    } catch {
      return '8:00 pm';
    }
  }, [profile?.reminder_time]);

  const handlePrayedToday = useCallback(async () => {
    try {
      const res = await checkInPrayer();
      setShowConfetti(true);

      if (res.isFirstToday) {
        if (res.usedGrace) {
          setStatusMessage(`Grace day used! 🔥 ${res.newStreak} day streak preserved`);
        } else {
          setStatusMessage(`Streak updated! 🔥 ${res.newStreak} days strong`);
        }
      } else {
        setStatusMessage('You already prayed today! Another blessing logged 🙏');
      }

      setTimeout(() => setStatusMessage(null), 4000);
    } catch (e) {
      console.error(e);
    }
  }, [checkInPrayer]);

  const handleMarkAsAnsweredSubmit = useCallback(async (
    prayerId: string,
    testimony: string,
    shareWithGroup: boolean
  ) => {
    await markAsAnswered(prayerId, testimony, shareWithGroup);
    setAnsweredModalPrayer(null);
    setShowConfetti(true);
    setStatusMessage('Prayer answered & saved to your wall! 🎉');
    setTimeout(() => setStatusMessage(null), 4000);
  }, [markAsAnswered]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading today...</Text>
      </View>
    );
  }

  const graceDaysUsed = profile?.grace_days_used || (last7Days.some((d) => d.isGraceDay) ? 1 : 0);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Status Toast */}
        {statusMessage && (
          <View style={[styles.toast, { backgroundColor: colors.primary }]}>
            <Text style={[styles.toastText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>
              {statusMessage}
            </Text>
          </View>
        )}

        {/* 1. Header (Exact to Image 2) */}
        <View style={styles.topHeader}>
          <Text style={[styles.dateEyebrow, { color: colors.textTertiary }]}>
            {todayDateString}
          </Text>
          <Text style={[styles.greetingHeadline, { color: colors.text, fontFamily: Typography.serif }]}>
            {greeting}
          </Text>
        </View>

        {/* 2. Circular Streak Ring (Exact to Image 2) */}
        <View style={styles.streakCenterArea}>
          <View style={[styles.streakRingContainer, { borderColor: isDark ? '#262238' : '#F0EBE1' }]}>
            {/* Golden Amber Progress Arc */}
            <View style={[styles.streakRingArc, { borderColor: colors.primary }]} />
            <View style={styles.streakInnerContent}>
              <Text style={[styles.streakCountNumber, { color: colors.text, fontFamily: Typography.serif }]}>
                {streak}
              </Text>
              <Text style={[styles.streakCountSub, { color: colors.textSecondary }]}>
                day streak
              </Text>
              <Text style={[styles.streakMilestoneText, { color: colors.textTertiary }]}>
                {milestone}
              </Text>
            </View>
          </View>
        </View>

        {/* 3. Primary Amber Pill Button: "I Prayed Today" (Exact to Image 2) */}
        <TouchableOpacity
          style={[styles.iPrayedBtn, { backgroundColor: colors.primary }]}
          onPress={handlePrayedToday}
          activeOpacity={0.85}>
          <Text style={[styles.iPrayedBtnText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>
            {hasPrayedToday ? '✓ Prayed Today' : 'I Prayed Today'}
          </Text>
        </TouchableOpacity>

        {/* 4. "This week" Card with Grace Day rhythm (Exact to Image 2) */}
        <View style={[styles.thisWeekCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.thisWeekHeaderRow}>
            <Text style={[styles.thisWeekTitle, { color: colors.text }]}>This week</Text>
            <View style={[styles.graceBadge, { backgroundColor: isDark ? '#2A2433' : '#FDF4E7' }]}>
              <Text style={[styles.graceBadgeText, { color: colors.primary }]}>
                {graceDaysUsed > 0 ? `${graceDaysUsed} GRACE DAY USED` : 'GRACE DAY READY'}
              </Text>
            </View>
          </View>

          {/* 7 Day Circles Row */}
          <View style={styles.daysRow}>
            {last7Days.map((dot, index) => {
              const isGraceSlot = Boolean(dot.isGraceDay);

              return (
                <View key={dot.dateStr || index} style={styles.dayCol}>
                  <View
                    style={[
                      styles.dayCircle,
                      {
                        backgroundColor: isDark ? '#1C1929' : '#FFFFFF',
                        borderColor: isDark ? '#3A3652' : colors.border,
                      },
                      dot.hasPrayed && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                      isGraceSlot &&
                        !dot.hasPrayed && {
                          borderStyle: 'dashed',
                          borderColor: colors.primary,
                        },
                      dot.isToday &&
                        !dot.hasPrayed && {
                          borderColor: colors.primary,
                          borderWidth: 2,
                        },
                    ]}>
                    {dot.hasPrayed ? (
                      <Ionicons name="checkmark" size={16} color={isDark ? '#14121F' : '#FFFFFF'} />
                    ) : isGraceSlot ? (
                      <View style={[styles.graceDotInside, { backgroundColor: colors.primary }]} />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.dayInitial,
                      {
                        color: dot.isToday ? colors.primary : colors.textSecondary,
                        fontWeight: dot.isToday ? '700' : '500',
                      },
                    ]}>
                    {dot.dayLabel.charAt(0)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Footnote */}
          <Text style={[styles.graceExplanation, { color: colors.textTertiary }]}>
            The dashed circle is your grace day. Miss one day a week and your streak holds.
          </Text>
        </View>

        {/* 5. Gentle Reminder Card (Exact to Image 2) */}
        <TouchableOpacity
          style={[styles.reminderCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/profile' as any)}
          activeOpacity={0.85}>
          <View style={[styles.reminderIconCircle, { backgroundColor: isDark ? '#2A2433' : '#FDF4E7' }]}>
            <Ionicons name="notifications" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.reminderTitle, { color: colors.text }]}>
              Gentle reminder at {formattedReminderTime}
            </Text>
            <Text style={[styles.reminderSub, { color: colors.textSecondary }]}>
              A soft nudge, never a scolding.
            </Text>
          </View>
        </TouchableOpacity>

        {/* 6. Walk and Pray Shortcut Card */}
        <TouchableOpacity
          style={[styles.walkShortcutCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/prayer-walk' as any)}
          activeOpacity={0.85}>
          <View style={[styles.walkShortcutIconCircle, { backgroundColor: isDark ? '#2A2433' : '#FDF4E7' }]}>
            <Ionicons name="footsteps" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.walkShortcutTitle, { color: colors.text, fontFamily: Typography.serif }]}>
              Walk and pray
            </Text>
            <Text style={[styles.walkShortcutSub, { color: colors.textSecondary }]}>
              Step outside. Turn motion into communion with God.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* 7. Today's Focus Prayer */}
        {todaysFocusPrayer && (
          <View style={{ marginTop: 8 }}>
            <FocusPrayerCard
              prayer={todaysFocusPrayer}
              onPrayedToday={handlePrayedToday}
              onToggleShowAll={() => router.push('/(tabs)/prayers' as any)}
              isShowingAll={false}
              onRotateNext={rotateFocusPrayer}
              totalActiveCount={prayers.filter((p) => p.status === 'active').length}
              onPressPrayerWalk={() =>
                router.push({
                  pathname: '/prayer-walk',
                  params: { prayerId: todaysFocusPrayer.id },
                })
              }
            />
          </View>
        )}
      </ScrollView>

      <Confetti active={showConfetti} onAnimationEnd={() => setShowConfetti(false)} />

      <NewPrayerModal
        visible={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSubmit={addPrayer}
        groups={groups}
      />

      <AnsweredModal
        visible={Boolean(answeredModalPrayer)}
        prayer={answeredModalPrayer}
        onClose={() => setAnsweredModalPrayer(null)}
        onSubmit={handleMarkAsAnsweredSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  toast: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  toastText: {
    fontSize: 13,
    fontWeight: '700',
  },
  topHeader: {
    marginBottom: 16,
  },
  dateEyebrow: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  greetingHeadline: {
    fontSize: 30,
    fontWeight: '400',
    lineHeight: 38,
  },
  streakCenterArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  streakRingContainer: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  streakRingArc: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 110,
    borderWidth: 6,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },
  streakInnerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  streakCountNumber: {
    fontSize: 58,
    fontWeight: '400',
    lineHeight: 64,
  },
  streakCountSub: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 6,
  },
  streakMilestoneText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  iPrayedBtn: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  iPrayedBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  thisWeekCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  thisWeekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  thisWeekTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  graceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  graceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  graceDotInside: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dayInitial: {
    fontSize: 12,
  },
  graceExplanation: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  reminderIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  reminderSub: {
    fontSize: 13,
    marginTop: 2,
  },
  walkShortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  walkShortcutIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walkShortcutTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  walkShortcutSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
