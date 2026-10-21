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
import { usePrayer } from '@/context/PrayerContext';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { StreakHeader } from '@/components/StreakHeader';
import { FocusPrayerCard } from '@/components/FocusPrayerCard';
import { PrayerCard } from '@/components/PrayerCard';
import { NewPrayerModal } from '@/components/NewPrayerModal';
import { AnsweredModal } from '@/components/AnsweredModal';
import { Confetti } from '@/components/Confetti';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { NotificationBell } from '@/components/NotificationBell';
import { Prayer } from '@/types/database';

export default function TodayScreen() {
  const router = useRouter();
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
    deletePrayer,
    isOnboarded,
    isLoading,
    wellnessSessions,
    activePlan,
  } = usePrayer();

  const [showAllPrayers, setShowAllPrayers] = useState(false);
  const [filterPrivacy, setFilterPrivacy] = useState<'all' | 'private' | 'group'>('all');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [answeredModalPrayer, setAnsweredModalPrayer] = useState<Prayer | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // If not onboarded yet, redirect to onboarding flow
  useEffect(() => {
    if (!isLoading && !isOnboarded) {
      router.replace('/onboarding');
    }
  }, [isLoading, isOnboarded, router]);

  // Active prayers (memoized for speed)
  const activePrayers = useMemo(() => prayers.filter((p) => p.status === 'active'), [prayers]);
  const filteredActivePrayers = useMemo(() => {
    return activePrayers.filter((p) => {
      if (filterPrivacy === 'private') return p.privacy === 'private';
      if (filterPrivacy === 'group') return p.privacy === 'group';
      return true;
    });
  }, [activePrayers, filterPrivacy]);

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
        setStatusMessage('Checkin logged! You already prayed today 🙏');
      }

      // Auto-hide toast after 4s
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (e) {
      console.error(e);
    }
  }, [checkInPrayer]);

  const handleQuickPrayPrayer = useCallback(async (prayer: Prayer) => {
    try {
      await checkInPrayer(prayer.id);
      setShowConfetti(true);
      setStatusMessage(`Prayed for "${prayer.title}" 🙏`);
      setTimeout(() => setStatusMessage(null), 3500);
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
      <View style={styles.loadingContainer}>
        <AnimatedLogo size={96} variant="hero" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top App Header */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <AnimatedLogo size={36} variant="compact" />
          <View>
            <Text style={styles.brandTitle}>Prayer Walk</Text>
            <Text style={styles.brandSubtitle}>Walk with God. Pray every step.</Text>
          </View>
        </View>

        <View style={styles.headerBtnGroup}>
          <TouchableOpacity
            style={styles.journalHeaderBtn}
            onPress={() => router.push('/journal' as any)}
            activeOpacity={0.8}>
            <Ionicons name="book-outline" size={17} color={Colors.primary} />
            <Text style={styles.journalHeaderBtnText}>Journal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setIsNewModalOpen(true)}
            activeOpacity={0.8}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>New</Text>
          </TouchableOpacity>

          <NotificationBell />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Status Toast Notification */}
        {statusMessage && (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{statusMessage}</Text>
          </View>
        )}

        {/* 1. Streak and 7 Days Dots */}
        <StreakHeader streak={profile.prayer_streak} last7Days={last7Days} />

        {/* 2. Today's Focus - Single Big Card & Big Button */}
        <FocusPrayerCard
          prayer={todaysFocusPrayer}
          onPrayedToday={handlePrayedToday}
          onToggleShowAll={() => setShowAllPrayers((prev) => !prev)}
          isShowingAll={showAllPrayers}
          onRotateNext={rotateFocusPrayer}
          totalActiveCount={activePrayers.length}
          onPressPrayerWalk={() => router.push('/prayer-walk')}
        />

        {/* 3. Walking Plans & Journal Spotlight Card */}
        <TouchableOpacity
          style={styles.journalSpotlightCard}
          onPress={() => router.push('/journal' as any)}
          activeOpacity={0.9}>
          <View style={styles.journalSpotlightLeft}>
            <View style={styles.journalIconCircle}>
              <Ionicons
                name={activePlan ? 'footsteps' : 'book'}
                size={22}
                color={Colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.journalSpotlightBadgeRow}>
                <Text style={styles.journalSpotlightBadge}>
                  {activePlan ? 'ACTIVE PRAYER PLAN' : 'PRAYER JOURNAL & PLANS'}
                </Text>
              </View>
              <Text style={styles.journalSpotlightTitle} numberOfLines={1}>
                {activePlan
                  ? `${activePlan.plan.title} (Day ${activePlan.userPlan.current_day})`
                  : 'Walking Plans & Meditation Notes'}
              </Text>
              <Text style={styles.journalSpotlightDesc} numberOfLines={1}>
                {activePlan
                  ? 'Tap to continue your guided walking scripture journey'
                  : 'Track your walks, reflect on scriptures, and grow daily'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
        </TouchableOpacity>

        {/* 3. Recent Prayer Walks History */}
        {wellnessSessions.length > 0 && (
          <View style={styles.walksHistorySection}>
            <Text style={styles.walksHistoryHeading}>RECENT PRAYER WALKS</Text>
            {wellnessSessions.slice(0, 3).map((session) => {
              const mins = Math.max(1, Math.round(session.duration_seconds / 60));
              const stepsText = session.steps !== null ? `${session.steps} steps` : 'Time with God';
              return (
                <View key={session.id} style={styles.walkHistoryCard}>
                  <Text style={styles.walkHistoryEmoji}>🚶</Text>
                  <View style={styles.walkHistoryContent}>
                    <Text style={styles.walkHistoryMain}>
                      {stepsText} • {mins} min
                    </Text>
                    <Text style={styles.walkHistoryPrayer} numberOfLines={1}>
                      for &ldquo;{session.linked_prayer_title || 'Quiet prayer'}&rdquo;
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* 4. Full List of Active Prayers (Collapsed by default) */}
        {showAllPrayers && (
          <View style={styles.allPrayersSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                ALL ACTIVE PRAYERS ({filteredActivePrayers.length})
              </Text>

              {/* Filter Chips */}
              <View style={styles.chipsRow}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    filterPrivacy === 'all' && styles.chipActive,
                  ]}
                  onPress={() => setFilterPrivacy('all')}>
                  <Text
                    style={[
                      styles.chipText,
                      filterPrivacy === 'all' && styles.chipTextActive,
                    ]}>
                    All
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.chip,
                    filterPrivacy === 'private' && styles.chipActive,
                  ]}
                  onPress={() => setFilterPrivacy('private')}>
                  <Text
                    style={[
                      styles.chipText,
                      filterPrivacy === 'private' && styles.chipTextActive,
                    ]}>
                    Private
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.chip,
                    filterPrivacy === 'group' && styles.chipActive,
                  ]}
                  onPress={() => setFilterPrivacy('group')}>
                  <Text
                    style={[
                      styles.chipText,
                      filterPrivacy === 'group' && styles.chipTextActive,
                    ]}>
                    Circle
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {filteredActivePrayers.length === 0 ? (
              <View style={styles.emptyFilterBox}>
                <Text style={styles.emptyFilterText}>
                  No prayers match this filter.
                </Text>
              </View>
            ) : (
              filteredActivePrayers.map((prayer) => (
                <PrayerCard
                  key={prayer.id}
                  prayer={prayer}
                  isFocused={todaysFocusPrayer?.id === prayer.id}
                  onPressPray={handleQuickPrayPrayer}
                  onMarkAnswered={(p) => setAnsweredModalPrayer(p)}
                  onDelete={(p) => deletePrayer(p.id)}
                  onPrayAndWalk={(p) =>
                    router.push({
                      pathname: '/prayer-walk',
                      params: { prayerId: p.id },
                    })
                  }
                />
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Confetti Celebration */}
      <Confetti
        active={showConfetti}
        onAnimationEnd={() => setShowConfetti(false)}
      />

      {/* New Prayer Modal */}
      <NewPrayerModal
        visible={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSubmit={addPrayer}
        groups={groups}
      />

      {/* Answered Testimony Modal */}
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
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: '#FFFFFF',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    width: 36,
    height: 36,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  headerBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  journalHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  journalHeaderBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  journalSpotlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#D1E7DD',
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  journalSpotlightLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 8,
  },
  journalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalSpotlightBadgeRow: {
    marginBottom: 2,
  },
  journalSpotlightBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  journalSpotlightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  journalSpotlightDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 60,
  },
  toast: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  allPrayersSection: {
    marginTop: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  emptyFilterBox: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyFilterText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  walksHistorySection: {
    marginBottom: Spacing.md,
  },
  walksHistoryHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  walkHistoryCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  walkHistoryEmoji: {
    fontSize: 20,
  },
  walkHistoryContent: {
    flex: 1,
  },
  walkHistoryMain: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  walkHistoryPrayer: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
