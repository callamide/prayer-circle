import React, { useState, useMemo, useCallback } from 'react';
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
import { useTheme } from '@/context/ThemeContext';
import { Typography } from '@/constants/theme';
import { PrayerCard } from '@/components/PrayerCard';
import { FocusPrayerCard } from '@/components/FocusPrayerCard';
import { NewPrayerModal } from '@/components/NewPrayerModal';
import { AnsweredModal } from '@/components/AnsweredModal';
import { Confetti } from '@/components/Confetti';
import { Prayer } from '@/types/database';

export default function PrayersTabScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const {
    prayers,
    groups,
    todaysFocusPrayer,
    rotateFocusPrayer,
    checkInPrayer,
    addPrayer,
    markAsAnswered,
    deletePrayer,
  } = usePrayer();

  const [filterPrivacy, setFilterPrivacy] = useState<'all' | 'private' | 'group'>('all');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [answeredModalPrayer, setAnsweredModalPrayer] = useState<Prayer | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const activePrayers = useMemo(() => prayers.filter((p) => p.status === 'active'), [prayers]);
  const filteredActivePrayers = useMemo(() => {
    return activePrayers.filter((p) => {
      if (filterPrivacy === 'private') return p.privacy === 'private';
      if (filterPrivacy === 'group') return p.privacy === 'group';
      return true;
    });
  }, [activePrayers, filterPrivacy]);

  const handlePrayed = useCallback(async (prayerId?: string) => {
    try {
      await checkInPrayer(prayerId);
      setShowConfetti(true);
      setStatusMessage('Prayer logged 🙏');
      setTimeout(() => setStatusMessage(null), 3000);
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerEyebrow, { color: colors.primary }]}>YOUR INTENTIONS</Text>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Typography.serif }]}>Prayers</Text>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => setIsNewModalOpen(true)}
          activeOpacity={0.85}>
          <Ionicons name="add" size={18} color={isDark ? '#14121F' : '#FFFFFF'} />
          <Text style={[styles.addBtnText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Status Toast */}
        {statusMessage && (
          <View style={[styles.toast, { backgroundColor: colors.primary }]}>
            <Text style={[styles.toastText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>{statusMessage}</Text>
          </View>
        )}

        {/* Today's Focus Prayer Spotlight */}
        {todaysFocusPrayer && (
          <FocusPrayerCard
            prayer={todaysFocusPrayer}
            onPrayedToday={() => handlePrayed(todaysFocusPrayer.id)}
            onToggleShowAll={() => {}}
            isShowingAll={true}
            onRotateNext={rotateFocusPrayer}
            totalActiveCount={activePrayers.length}
            onPressPrayerWalk={() => router.push({ pathname: '/prayer-walk', params: { prayerId: todaysFocusPrayer.id } })}
          />
        )}

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              { backgroundColor: colors.card, borderColor: colors.border },
              filterPrivacy === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setFilterPrivacy('all')}>
            <Text
              style={[
                styles.filterPillText,
                { color: filterPrivacy === 'all' ? (isDark ? '#14121F' : '#FFFFFF') : colors.textSecondary },
              ]}>
              All ({activePrayers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              { backgroundColor: colors.card, borderColor: colors.border },
              filterPrivacy === 'private' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setFilterPrivacy('private')}>
            <Text
              style={[
                styles.filterPillText,
                { color: filterPrivacy === 'private' ? (isDark ? '#14121F' : '#FFFFFF') : colors.textSecondary },
              ]}>
              Private
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              { backgroundColor: colors.card, borderColor: colors.border },
              filterPrivacy === 'group' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setFilterPrivacy('group')}>
            <Text
              style={[
                styles.filterPillText,
                { color: filterPrivacy === 'group' ? (isDark ? '#14121F' : '#FFFFFF') : colors.textSecondary },
              ]}>
              Circle
            </Text>
          </TouchableOpacity>
        </View>

        {/* List of Prayer Cards */}
        {filteredActivePrayers.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="hand-left-outline" size={32} color={colors.textTertiary} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: Typography.serif }]}>
              No prayers found
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              {filterPrivacy === 'all'
                ? 'Bring your heart to God. Add your first prayer intention.'
                : 'No prayers under this filter.'}
            </Text>
          </View>
        ) : (
          filteredActivePrayers.map((prayer) => (
            <PrayerCard
              key={prayer.id}
              prayer={prayer}
              isFocused={todaysFocusPrayer?.id === prayer.id}
              onPressPray={() => handlePrayed(prayer.id)}
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  toast: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 14,
    alignItems: 'center',
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 14,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyBox: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
