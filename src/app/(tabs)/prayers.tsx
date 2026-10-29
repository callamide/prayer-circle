import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import PrayerWalkScreen from '../prayer-walk';

export default function PrayAndWalkTabScreen() {
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

  // Mode: 'intentions' (All Prayers list) | 'walk' (Active or New Prayer Walk)
  const [mode, setMode] = useState<'intentions' | 'walk'>('intentions');
  const [walkPrayerId, setWalkPrayerId] = useState<string | null>(null);

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

  const handleStartWalkForPrayer = useCallback((prayer?: Prayer | null) => {
    setWalkPrayerId(prayer ? prayer.id : 'generic');
    setMode('walk');
  }, []);

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
          <Text style={[styles.headerEyebrow, { color: colors.primary }]}>INTENTIONS & MOVEMENT</Text>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Typography.serif }]}>
            Pray & Walk
          </Text>
        </View>

        {mode === 'intentions' && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => setIsNewModalOpen(true)}
            activeOpacity={0.85}>
            <Ionicons name="add" size={18} color={isDark ? '#14121F' : '#FFFFFF'} />
            <Text style={[styles.addBtnText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>New</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Segmented Mode Selector: Intentions vs Walk & Pray */}
      <View style={[styles.modeBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.modeSegmentWrap, { backgroundColor: isDark ? '#1C1929' : '#F3EFE6' }]}>
          <TouchableOpacity
            style={[
              styles.modeSegmentBtn,
              mode === 'intentions' && [styles.modeSegmentBtnActive, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setMode('intentions')}
            activeOpacity={0.8}>
            <Ionicons
              name="sparkles"
              size={15}
              color={mode === 'intentions' ? (isDark ? '#14121F' : '#FFFFFF') : colors.textSecondary}
            />
            <Text
              style={[
                styles.modeSegmentText,
                { color: mode === 'intentions' ? (isDark ? '#14121F' : '#FFFFFF') : colors.textSecondary },
                mode === 'intentions' && { fontWeight: '700' },
              ]}>
              Intentions ({activePrayers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeSegmentBtn,
              mode === 'walk' && [styles.modeSegmentBtnActive, { backgroundColor: colors.primary }],
            ]}
            onPress={() => {
              setWalkPrayerId(null);
              setMode('walk');
            }}
            activeOpacity={0.8}>
            <Ionicons
              name="footsteps"
              size={15}
              color={mode === 'walk' ? (isDark ? '#14121F' : '#FFFFFF') : colors.textSecondary}
            />
            <Text
              style={[
                styles.modeSegmentText,
                { color: mode === 'walk' ? (isDark ? '#14121F' : '#FFFFFF') : colors.textSecondary },
                mode === 'walk' && { fontWeight: '700' },
              ]}>
              Walk & Pray
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {mode === 'walk' ? (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <PrayerWalkScreen
            embedded={true}
            initialPrayerId={walkPrayerId}
            onExit={() => {
              setWalkPrayerId(null);
              setMode('intentions');
            }}
          />
        </View>
      ) : (
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

        {/* Hero Walk & Pray Quick-Start Banner */}
        <TouchableOpacity
          style={[styles.heroWalkBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => handleStartWalkForPrayer(todaysFocusPrayer || null)}
          activeOpacity={0.85}>
          <View style={[styles.heroWalkIconCircle, { backgroundColor: isDark ? '#2A2433' : '#FDF4E7' }]}>
            <Ionicons name="footsteps" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroWalkTitle, { color: colors.text, fontFamily: Typography.serif }]}>
              Turn your steps into prayer
            </Text>
            <Text style={[styles.heroWalkSub, { color: colors.textSecondary }]}>
              Step outside. The phone motion sensor tracks your steps while you pray.
            </Text>
          </View>
          <View style={[styles.startWalkPill, { backgroundColor: colors.primary }]}>
            <Text style={[styles.startWalkPillText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>Start Walk</Text>
          </View>
        </TouchableOpacity>

        {/* Today's Focus Prayer Highlight */}
        {todaysFocusPrayer && (
          <FocusPrayerCard
            prayer={todaysFocusPrayer}
            onPrayedToday={() => handlePrayed(todaysFocusPrayer.id)}
            onToggleShowAll={() => {}}
            isShowingAll={true}
            onRotateNext={rotateFocusPrayer}
            totalActiveCount={activePrayers.length}
            onPressPrayerWalk={() => handleStartWalkForPrayer(todaysFocusPrayer)}
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
              onPrayAndWalk={(p) => handleStartWalkForPrayer(p)}
            />
          ))
        )}
      </ScrollView>
      )}

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
  modeBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  modeSegmentWrap: {
    flexDirection: 'row',
    borderRadius: 22,
    padding: 3,
  },
  modeSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 19,
  },
  modeSegmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeSegmentText: {
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
  heroWalkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  heroWalkIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroWalkTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  heroWalkSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  startWalkPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  startWalkPillText: {
    fontSize: 12,
    fontWeight: '700',
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
