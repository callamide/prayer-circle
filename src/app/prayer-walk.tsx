import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  ScrollView,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pedometer } from 'expo-sensors';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';

import { usePrayer } from '@/context/PrayerContext';
import { useTheme } from '@/context/ThemeContext';
import { Colors, BorderRadius, Spacing, Typography } from '@/constants/theme';
import { Confetti } from '@/components/Confetti';
import { Prayer } from '@/types/database';

const ENCOURAGEMENTS = [
  'The Lord is near 🙏',
  'Pray without ceasing',
  'Your circle prays with you',
  'Cast your cares upon Him',
];

export interface PrayerWalkScreenProps {
  embedded?: boolean;
  initialPrayerId?: string | null;
  onExit?: () => void;
}

export default function PrayerWalkScreen({
  embedded = false,
  initialPrayerId,
  onExit,
}: PrayerWalkScreenProps = {}) {
  const router = useRouter();
  const params = useLocalSearchParams<{ prayerId?: string }>();
  const effectivePrayerId = initialPrayerId ?? params.prayerId;
  const { prayers, addWellnessSession, addJournalEntry, profile } = usePrayer();
  const { colors, isDark } = useTheme();

  // Active prayers available to select (memoized to prevent re-filter every timer tick)
  const activePrayers = useMemo(() => prayers.filter((p) => p.status === 'active'), [prayers]);
  const recent3Prayers = useMemo(() => activePrayers.slice(0, 3), [activePrayers]);

  // Initial prayer selection if passed via params or props
  const initialPrayer = effectivePrayerId
    ? activePrayers.find((p) => p.id === effectivePrayerId) || null
    : null;

  // Screen Phases: 'select' | 'walking' | 'summary'
  const [phase, setPhase] = useState<'select' | 'walking' | 'summary'>(
    initialPrayer ? 'walking' : 'select'
  );

  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(initialPrayer);
  const [isGenericWalk, setIsGenericWalk] = useState<boolean>(
    !initialPrayer && Boolean(effectivePrayerId === 'generic')
  );

  // Walk Metrics
  const [steps, setSteps] = useState<number | null>(0);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [prayerStops, setPrayerStops] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pedometerAvailable, setPedometerAvailable] = useState<boolean>(true);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(true);

  // Hush Reflection & Prayer Stop Banners
  const [walkNote, setWalkNote] = useState<string>('');
  const [stopBannerText, setStopBannerText] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Encouragement overlay banner
  const [encouragementText, setEncouragementText] = useState<string | null>(null);

  // Confetti for summary
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  // Keep screen awake while viewing walk screen
  useKeepAwake();

  // Step & Wall-clock Timer refs (supports background / screen-off counting)
  const pedometerSubRef = useRef<{ remove: () => void } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const baseStepsRef = useRef<number>(0);
  const walkSessionStepsRef = useRef<number>(0);

  // Wall-clock time tracking so timer continues accurately when phone screen is off
  const accumulatedSecondsRef = useRef<number>(0);
  const segmentStartTimestampRef = useRef<number | null>(null);
  const lastMinuteTriggeredRef = useRef<number>(0);

  // Background step reconciliation refs
  const backgroundStartDateRef = useRef<Date | null>(null);
  const stepsAtBackgroundStartRef = useRef<number>(0);

  // Setup Pedometer permissions & availability on mount
  useEffect(() => {
    let isMounted = true;

    async function checkPedometer() {
      if (Platform.OS === 'web') {
        if (isMounted) {
          setPedometerAvailable(false);
          setSteps(0);
        }
        return;
      }

      try {
        const available = await Pedometer.isAvailableAsync();
        if (!available) {
          if (isMounted) {
            setPedometerAvailable(false);
            setSteps(null);
          }
          return;
        }

        if (Pedometer.requestPermissionsAsync) {
          const perm = await Pedometer.requestPermissionsAsync();
          if (perm.status !== 'granted') {
            if (isMounted) {
              setPermissionGranted(false);
              setSteps(null);
            }
            return;
          }
        }

        if (isMounted) {
          setPedometerAvailable(true);
          setPermissionGranted(true);
        }
      } catch (err) {
        console.warn('Pedometer check error:', err);
        if (isMounted) {
          setPedometerAvailable(false);
          setSteps(null);
        }
      }
    }

    checkPedometer();

    return () => {
      isMounted = false;
    };
  }, []);

  // Timer: Wall-clock synchronized interval so time continues counting when screen is off
  useEffect(() => {
    if (phase !== 'walking' || isPaused) {
      if (segmentStartTimestampRef.current !== null) {
        const elapsedInSegment = Math.floor(
          (Date.now() - segmentStartTimestampRef.current) / 1000
        );
        accumulatedSecondsRef.current += Math.max(0, elapsedInSegment);
        segmentStartTimestampRef.current = null;
      }
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (segmentStartTimestampRef.current === null) {
      segmentStartTimestampRef.current = Date.now();
    }

    const updateTimerFromWallClock = () => {
      if (segmentStartTimestampRef.current === null) return;
      const elapsedInSegment = Math.floor(
        (Date.now() - segmentStartTimestampRef.current) / 1000
      );
      const next = accumulatedSecondsRef.current + Math.max(0, elapsedInSegment);
      setDurationSeconds(next);

      const currentMinute = Math.floor(next / 60);
      if (currentMinute > 0 && currentMinute > lastMinuteTriggeredRef.current) {
        lastMinuteTriggeredRef.current = currentMinute;
        const quoteIndex = currentMinute % ENCOURAGEMENTS.length;
        setEncouragementText(ENCOURAGEMENTS[quoteIndex]);

        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }

        setTimeout(() => {
          setEncouragementText(null);
        }, 6000);
      }
    };

    timerRef.current = setInterval(updateTimerFromWallClock, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, isPaused]);

  // Pedometer Watcher lifecycle: stays active in background while walking & unpaused,
  // and stops/pauses only when user pauses or ends walk
  useEffect(() => {
    if (
      phase !== 'walking' ||
      isPaused ||
      Platform.OS === 'web' ||
      !pedometerAvailable ||
      !permissionGranted
    ) {
      if (pedometerSubRef.current) {
        pedometerSubRef.current.remove();
        pedometerSubRef.current = null;
      }
      return;
    }

    baseStepsRef.current = walkSessionStepsRef.current;
    let sub: { remove: () => void } | null = null;
    try {
      sub = Pedometer.watchStepCount((result) => {
        const currentSteps = baseStepsRef.current + result.steps;
        walkSessionStepsRef.current = currentSteps;
        setSteps(currentSteps);
      });
      pedometerSubRef.current = sub;
    } catch (e) {
      console.warn('Error starting pedometer watcher:', e);
    }

    return () => {
      if (sub) {
        sub.remove();
      }
      pedometerSubRef.current = null;
    };
  }, [phase, isPaused, pedometerAvailable, permissionGranted]);

  // AppState Listener: Keep counting in background when screen turns off!
  // Reconcile elapsed time & hardware pedometer step count when screen turns back on.
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextAppState: AppStateStatus) => {
        if (phase !== 'walking' || isPaused) {
          backgroundStartDateRef.current = null;
          return;
        }

        if (nextAppState.match(/inactive|background/)) {
          if (!backgroundStartDateRef.current) {
            backgroundStartDateRef.current = new Date();
            stepsAtBackgroundStartRef.current = walkSessionStepsRef.current;
          }
        } else if (nextAppState === 'active') {
          // 1. Immediately sync wall-clock duration
          if (segmentStartTimestampRef.current !== null) {
            const elapsedInSegment = Math.floor(
              (Date.now() - segmentStartTimestampRef.current) / 1000
            );
            setDurationSeconds(
              accumulatedSecondsRef.current + Math.max(0, elapsedInSegment)
            );
          }

          // 2. Reconcile any steps recorded by OS hardware sensor while screen was off
          const bgStart = backgroundStartDateRef.current;
          backgroundStartDateRef.current = null;

          if (
            bgStart &&
            Platform.OS !== 'web' &&
            pedometerAvailable &&
            permissionGranted
          ) {
            try {
              const now = new Date();
              const bgStepResult = await Pedometer.getStepCountAsync(bgStart, now);
              if (bgStepResult && typeof bgStepResult.steps === 'number') {
                const reconciledTotal =
                  stepsAtBackgroundStartRef.current + bgStepResult.steps;
                if (reconciledTotal > walkSessionStepsRef.current) {
                  walkSessionStepsRef.current = reconciledTotal;
                  setSteps(reconciledTotal);
                }
              }
            } catch {
              // On devices where getStepCountAsync is not supported, watchStepCount continues streaming hardware sensor deltas
            }
          }
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [phase, isPaused, pedometerAvailable, permissionGranted]);

  // Start walk for a chosen prayer
  const handleSelectPrayer = (prayer: Prayer | null) => {
    setSelectedPrayer(prayer);
    setIsGenericWalk(!prayer);
    accumulatedSecondsRef.current = 0;
    segmentStartTimestampRef.current = null;
    lastMinuteTriggeredRef.current = 0;
    baseStepsRef.current = 0;
    walkSessionStepsRef.current = 0;
    setSteps(pedometerAvailable && permissionGranted ? 0 : null);
    setDurationSeconds(0);
    setPrayerStops(0);
    setWalkNote('');
    setPhase('walking');
    setIsPaused(false);
  };

  // Mark a Prayer Stop (Hush Innovation)
  const handleMarkPrayerStop = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    setPrayerStops((prev) => {
      const next = prev + 1;
      setStopBannerText(`Prayer stop #${next} marked 🙏`);
      setTimeout(() => {
        setStopBannerText(null);
      }, 3500);
      return next;
    });
  };

  // Toggle Pause / Resume
  const handleTogglePause = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setIsPaused((prev) => !prev);
  };

  // End Walk -> Show summary
  const handleEndWalk = () => {
    if (segmentStartTimestampRef.current !== null) {
      const elapsedInSegment = Math.floor(
        (Date.now() - segmentStartTimestampRef.current) / 1000
      );
      const finalDuration =
        accumulatedSecondsRef.current + Math.max(0, elapsedInSegment);
      accumulatedSecondsRef.current = finalDuration;
      segmentStartTimestampRef.current = null;
      setDurationSeconds(finalDuration);
    }
    if (pedometerSubRef.current) {
      pedometerSubRef.current.remove();
      pedometerSubRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    setPhase('summary');
    setShowConfetti(true);
  };

  // Summary Actions (Hush "Well Walked" Flow)
  const handleSaveToJournal = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await addWellnessSession({
        linked_prayer_id: selectedPrayer ? selectedPrayer.id : null,
        linked_prayer_title: selectedPrayer ? selectedPrayer.title : 'Walk & Pray',
        type: 'prayer_walk',
        steps: steps !== null ? steps : null,
        duration_seconds: durationSeconds,
        prayer_stops: prayerStops,
        logAsPrayerCheckin: true,
      });

      const noteContent = walkNote.trim() || `Completed a ${Math.max(1, Math.round(durationSeconds / 60))}-min prayer walk${prayerStops > 0 ? ` with ${prayerStops} prayer stop${prayerStops > 1 ? 's' : ''}` : ''}.`;
      await addJournalEntry({
        title: `Prayer Walk: ${selectedPrayer ? selectedPrayer.title : 'Quiet Communion'}`,
        content: noteContent,
        linked_prayer_id: selectedPrayer ? selectedPrayer.id : null,
        steps_walked: steps !== null ? steps : undefined,
        tags: ['prayer-walk', `${Math.max(1, Math.round(durationSeconds / 60))}min`],
      });

      if (onExit) {
        onExit();
      } else {
        router.replace('/(tabs)');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogAsCheckin = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await addWellnessSession({
        linked_prayer_id: selectedPrayer ? selectedPrayer.id : null,
        linked_prayer_title: selectedPrayer ? selectedPrayer.title : 'Walk & Pray',
        type: 'prayer_walk',
        steps: steps !== null ? steps : null,
        duration_seconds: durationSeconds,
        prayer_stops: prayerStops,
        logAsPrayerCheckin: true,
      });
      if (onExit) {
        onExit();
      } else {
        router.replace('/(tabs)');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const minutesWalked = Math.max(1, Math.round(durationSeconds / 60));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      {/* PHASE 1: SELECT PRAYER SCREEN */}
      {phase === 'select' && (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.topNav, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => {
                if (onExit) onExit();
                else router.back();
              }}
              style={styles.backBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.screenHeading, { color: colors.text, fontFamily: Typography.serif }]}>Walk and Pray</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView contentContainerStyle={styles.selectScrollContent}>
            <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(242, 179, 94, 0.15)' : Colors.primaryLight }]}>
              <Text style={styles.iconEmoji}>🚶</Text>
            </View>

            <Text style={[styles.selectTitle, { color: colors.text, fontFamily: Typography.serif }]}>Walk and Pray</Text>
            <Text style={[styles.selectSubtitle, { color: colors.textSecondary }]}>
              Pick what you&apos;ll pray for during your walk
            </Text>

            {/* Prayer Options List */}
            <View style={styles.optionsList}>
              {recent3Prayers.map((prayer) => (
                <TouchableOpacity
                  key={prayer.id}
                  style={[styles.prayerOptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleSelectPrayer(prayer)}
                  activeOpacity={0.8}>
                  <View style={styles.optionTextCol}>
                    <Text style={[styles.optionPrayerTitle, { color: colors.text }]} numberOfLines={2}>
                      {prayer.title}
                    </Text>
                    <View style={[styles.categoryBadge, { backgroundColor: colors.surfaceVariant }]}>
                      <Text style={[styles.categoryBadgeText, { color: colors.textSecondary }]}>{prayer.category}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}

              {/* Generic Option */}
              <TouchableOpacity
                style={[
                  styles.prayerOptionCard,
                  styles.genericOptionCard,
                  {
                    backgroundColor: isDark ? 'rgba(242, 179, 94, 0.1)' : '#F8FAF8',
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => handleSelectPrayer(null)}
                activeOpacity={0.8}>
                <View style={styles.optionTextCol}>
                  <Text style={[styles.optionPrayerTitle, { color: colors.text }]}>Just walk and pray</Text>
                  <Text style={[styles.genericSubtext, { color: colors.textSecondary }]}>
                    Quiet stillness and listening in nature
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}

      {/* PHASE 2: WALK SCREEN (EXACT MATCH TO IMAGE 3) */}
      {phase === 'walking' && (
        <ScrollView
          style={[styles.walkContainer, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.walkScrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Top Header */}
          <View style={styles.walkTopHeader}>
            <Text style={[styles.walkEyebrow, { color: colors.primary }]}>
              PRAYER WALK · IN PROGRESS
            </Text>
            <Text style={[styles.walkMainTitle, { color: colors.text, fontFamily: Typography.serif }]}>
              Walk and pray
            </Text>
          </View>

          {/* Center Metric Display: Ring with Footsteps */}
          <View style={styles.metricCenterArea}>
            <View
              style={[
                styles.ringContainer,
                {
                  borderColor: isDark ? '#262238' : '#F0EBE1',
                },
              ]}>
              {/* Golden Amber Progress Arc Overlay */}
              <View style={[styles.ringProgressArc, { borderColor: colors.primary }]} />
              <View style={styles.ringInnerContent}>
                <Ionicons name="footsteps" size={28} color={colors.primary} style={{ marginBottom: 4 }} />
                <Text style={[styles.ringStepCount, { color: colors.text, fontFamily: Typography.serif }]}>
                  {(steps ?? 0).toLocaleString()}
                </Text>
                <Text style={[styles.ringStepSub, { color: colors.textSecondary }]}>
                  of 3,000 steps
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
              <View style={[styles.liveTrackingDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.ringFooterText, { color: colors.textTertiary, marginTop: 0 }]}>
                Counted by your phone&apos;s motion sensor.
              </Text>
            </View>
          </View>

          {/* 3 Stats Card: Time, Distance, Prayer Stops */}
          <View style={[styles.hushThreeStatsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.hushStatCol}>
              <Text style={[styles.hushStatNumber, { color: colors.text, fontFamily: Typography.serif }]}>
                {formatTime(durationSeconds)}
              </Text>
              <Text style={[styles.hushStatLabel, { color: colors.textSecondary }]}>time</Text>
            </View>
            <View style={[styles.hushStatDivider, { backgroundColor: isDark ? '#2D2A44' : '#EAE4D9' }]} />
            <View style={styles.hushStatCol}>
              <Text style={[styles.hushStatNumber, { color: colors.text, fontFamily: Typography.serif }]}>
                {steps ? (steps * 0.00076).toFixed(1) : '0.0'}km
              </Text>
              <Text style={[styles.hushStatLabel, { color: colors.textSecondary }]}>distance</Text>
            </View>
            <View style={[styles.hushStatDivider, { backgroundColor: isDark ? '#2D2A44' : '#EAE4D9' }]} />
            <View style={styles.hushStatCol}>
              <Text style={[styles.hushStatNumber, { color: colors.text, fontFamily: Typography.serif }]}>
                {prayerStops}
              </Text>
              <Text style={[styles.hushStatLabel, { color: colors.textSecondary }]}>prayer stops</Text>
            </View>
          </View>

          {/* "Walking for" Card */}
          <View style={[styles.walkingForCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.walkingForEyebrow, { color: colors.textTertiary }]}>Walking for</Text>
            <View style={styles.walkingForRow}>
              <Text style={[styles.walkingForPrayerTitle, { color: colors.text, fontFamily: Typography.serif }]} numberOfLines={2}>
                {isGenericWalk
                  ? 'Open communion with God 🌿'
                  : selectedPrayer?.title || 'Quiet prayer'}
              </Text>
              <TouchableOpacity
                onPress={() => setPhase('select')}
                style={[styles.changePillBtn, { backgroundColor: isDark ? '#2A2433' : '#F3EFE6', borderColor: colors.border }]}
                activeOpacity={0.75}>
                <Text style={[styles.changePillText, { color: colors.text }]}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Floating Stop Feedback or Scripture Encouragement Banner */}
          {stopBannerText ? (
            <View style={[styles.stopBanner, { backgroundColor: isDark ? 'rgba(242, 179, 94, 0.2)' : '#FFF3E0', borderColor: colors.primary }]}>
              <Ionicons name="flag" size={16} color={colors.primary} />
              <Text style={[styles.stopBannerText, { color: colors.primary }]}>{stopBannerText}</Text>
            </View>
          ) : encouragementText ? (
            <View style={[styles.stopBanner, { backgroundColor: isDark ? 'rgba(242, 179, 94, 0.2)' : '#FFF3E0', borderColor: colors.primary }]}>
              <Text style={{ fontSize: 13 }}>🕊️</Text>
              <Text style={[styles.stopBannerText, { color: colors.primary }]}>{encouragementText}</Text>
            </View>
          ) : null}

          {/* Mark a Prayer Stop Button */}
          <TouchableOpacity
            style={[
              styles.markPrayerStopPill,
              {
                backgroundColor: isDark ? '#14121F' : '#FFFFFF',
                borderColor: isDark ? '#3A3652' : colors.border,
              },
            ]}
            onPress={handleMarkPrayerStop}
            activeOpacity={0.8}>
            <Text style={[styles.markPrayerStopPillText, { color: colors.text }]}>
              Mark a prayer stop{prayerStops > 0 ? ` (${prayerStops})` : ''}
            </Text>
          </TouchableOpacity>

          {/* Bottom Action Controls Row: Pause & Finish Walk */}
          <View style={styles.walkBottomRow}>
            <TouchableOpacity
              style={[
                styles.pausePillBtn,
                {
                  backgroundColor: isDark ? '#14121F' : '#FFFFFF',
                  borderColor: isDark ? '#3A3652' : colors.border,
                },
                isPaused && { backgroundColor: isDark ? '#2A2433' : '#EAE4D9' },
              ]}
              onPress={handleTogglePause}
              activeOpacity={0.85}>
              <Text style={[styles.pausePillText, { color: colors.text }]}>
                {isPaused ? 'Resume' : 'Pause'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.finishWalkPillBtn, { backgroundColor: colors.primary }]}
              onPress={handleEndWalk}
              activeOpacity={0.85}>
              <Text style={[styles.finishWalkPillText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>
                Finish walk
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* PHASE 3: END SUMMARY SCREEN (EXACT MATCH TO IMAGE 1) */}
      {phase === 'summary' && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.summaryContainer, { backgroundColor: colors.background }]}>
          <ScrollView
            contentContainerStyle={styles.summaryContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {/* Top Eyebrow & Title */}
            <View style={styles.summaryTopHeader}>
              <Text style={[styles.summaryEyebrow, { color: colors.primary }]}>
                PRAYER WALK COMPLETE
              </Text>
              <Text style={[styles.summaryMainTitle, { color: colors.text, fontFamily: Typography.serif }]}>
                Well walked.
              </Text>
            </View>

            {/* Central Circular Progress Ring */}
            <View style={styles.metricCenterArea}>
              <View style={[styles.ringContainer, { borderColor: colors.primary }]}>
                <View style={styles.ringInnerContent}>
                  <Text style={[styles.ringStepCount, { color: colors.text, fontFamily: Typography.serif }]}>
                    {(steps ?? 0).toLocaleString()}
                  </Text>
                  <Text style={[styles.ringStepSub, { color: colors.textSecondary }]}>
                    steps · goal reached
                  </Text>
                </View>
              </View>
            </View>

            {/* 3 Stats Card: Time, Distance, Prayer Stops */}
            <View style={[styles.hushThreeStatsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.hushStatCol}>
                <Text style={[styles.hushStatNumber, { color: colors.text, fontFamily: Typography.serif }]}>
                  {minutesWalked} min
                </Text>
                <Text style={[styles.hushStatLabel, { color: colors.textSecondary }]}>time</Text>
              </View>
              <View style={[styles.hushStatDivider, { backgroundColor: isDark ? '#2D2A44' : '#EAE4D9' }]} />
              <View style={styles.hushStatCol}>
                <Text style={[styles.hushStatNumber, { color: colors.text, fontFamily: Typography.serif }]}>
                  {steps ? (steps * 0.00076).toFixed(1) : '0.0'} km
                </Text>
                <Text style={[styles.hushStatLabel, { color: colors.textSecondary }]}>distance</Text>
              </View>
              <View style={[styles.hushStatDivider, { backgroundColor: isDark ? '#2D2A44' : '#EAE4D9' }]} />
              <View style={styles.hushStatCol}>
                <Text style={[styles.hushStatNumber, { color: colors.text, fontFamily: Typography.serif }]}>
                  {prayerStops}
                </Text>
                <Text style={[styles.hushStatLabel, { color: colors.textSecondary }]}>prayer stops</Text>
              </View>
            </View>

            {/* Streak Credit Badge Card */}
            <View
              style={[
                styles.hushHabitBadgeCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}>
              <View style={[styles.hushCheckCircle, { backgroundColor: colors.primary }]}>
                <Ionicons name="checkmark" size={16} color={isDark ? '#14121F' : '#FFFFFF'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.hushHabitTitle, { color: colors.text }]}>
                  Counted as today&apos;s prayer
                </Text>
                <Text style={[styles.hushHabitSub, { color: colors.textSecondary }]}>
                  Your streak is now {profile?.prayer_streak || 1} {(profile?.prayer_streak || 1) === 1 ? 'day' : 'days'}.
                </Text>
              </View>
            </View>

            {/* Inline Reflection Note Section */}
            <View style={styles.hushJournalSection}>
              <Text style={[styles.hushJournalLabel, { color: colors.textSecondary }]}>
                Add a note to your journal
              </Text>
              <View style={[styles.hushJournalInputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  style={[
                    styles.hushJournalInput,
                    {
                      color: colors.text,
                    },
                  ]}
                  value={walkNote}
                  onChangeText={setWalkNote}
                  placeholder="The street was quiet. I prayed by name for each house I passed."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Bottom Buttons: Skip & Save to Journal */}
            <View style={styles.walkBottomRow}>
              <TouchableOpacity
                style={[
                  styles.pausePillBtn,
                  {
                    backgroundColor: isDark ? '#14121F' : '#FFFFFF',
                    borderColor: isDark ? '#3A3652' : colors.border,
                  },
                ]}
                onPress={handleLogAsCheckin}
                disabled={isSaving}
                activeOpacity={0.7}>
                <Text style={[styles.pausePillText, { color: colors.text }]}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.finishWalkPillBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveToJournal}
                disabled={isSaving}
                activeOpacity={0.85}>
                <Text style={[styles.finishWalkPillText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>
                  Save to journal
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <Confetti
            active={showConfetti}
            onAnimationEnd={() => setShowConfetti(false)}
            count={45}
          />
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    padding: 4,
  },
  screenHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  selectScrollContent: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  iconEmoji: {
    fontSize: 30,
  },
  selectTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  selectSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  optionsList: {
    width: '100%',
    gap: 12,
  },
  prayerOptionCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  genericOptionCard: {
    backgroundColor: '#F8FAF8',
    borderColor: Colors.primary,
  },
  optionTextCol: {
    flex: 1,
    gap: 6,
    paddingRight: 10,
  },
  optionPrayerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  genericSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  categoryBadge: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  walkContainer: {
    flex: 1,
  },
  prayingForBadge: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  prayingForTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 4,
  },
  prayingForLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1,
  },
  changePrayerBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  changePrayerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stopBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginTop: 10,
  },
  stopBannerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  prayingForTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  walkCategoryPill: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginTop: 6,
  },
  walkCategoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  encouragementBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#FFE082',
    marginTop: 12,
  },
  encouragementEmoji: {
    fontSize: 16,
  },
  encouragementText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C5B00',
  },
  metricCenterArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.xl,
  },
  stepsDisplay: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  stepsNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  liveTrackingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: 'center',
  },
  liveTrackingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveTrackingText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  stepsNumber: {
    fontSize: 72,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -2,
    lineHeight: 80,
  },
  stepsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  backgroundActiveHint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 6,
    fontWeight: '500',
  },
  timerModeSub: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  hudRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  hudCol: {
    alignItems: 'center',
    flex: 1,
  },
  hudVal: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  hudLbl: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  hudDivider: {
    width: 1,
    height: 24,
  },
  markStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 13,
    borderRadius: 20,
    borderWidth: 1.5,
    marginTop: Spacing.md,
  },
  markStopBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  walkBottomControls: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: Spacing.md,
  },
  pauseButton: {
    flex: 1,
    height: 56,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
  },
  pauseButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  resumeButtonText: {
    color: '#FFFFFF',
  },
  endWalkButton: {
    flex: 1,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endWalkButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryContainer: {
    flex: 1,
  },
  summaryContent: {
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  summaryIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  summaryIconEmoji: {
    fontSize: 32,
  },
  summaryTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  summaryBody: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  hushStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    marginBottom: Spacing.md,
  },
  hushStatCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  hushStatVal: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  hushStatLbl: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  streakBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  streakBadgeEmoji: {
    fontSize: 24,
  },
  streakBadgeTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  streakBadgeSub: {
    fontSize: 12,
    marginTop: 2,
  },
  journalNoteCard: {
    width: '100%',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  journalNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  journalNoteTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  journalNotePrompt: {
    fontSize: 12,
    marginBottom: 10,
  },
  journalNoteInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryButtonsCol: {
    width: '100%',
    gap: 10,
  },
  saveJournalBtn: {
    width: '100%',
    height: 54,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  saveJournalBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  doneBtn: {
    width: '100%',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Hush design system styles for Phase 2 & Phase 3
  walkScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  walkTopHeader: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  walkEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  walkMainTitle: {
    fontSize: 32,
    fontWeight: '400',
    textAlign: 'center',
  },
  ringContainer: {
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 8,
  },
  ringProgressArc: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 105,
    borderWidth: 6,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },
  ringInnerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringStepCount: {
    fontSize: 44,
    fontWeight: '400',
    lineHeight: 48,
  },
  ringStepSub: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  ringFooterText: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 8,
    textAlign: 'center',
  },
  hushThreeStatsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginVertical: 14,
  },
  hushStatCol: {
    alignItems: 'center',
    flex: 1,
  },
  hushStatNumber: {
    fontSize: 22,
    fontWeight: '500',
    marginBottom: 3,
  },
  hushStatLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  hushStatDivider: {
    width: 1,
    height: 30,
  },
  walkingForCard: {
    width: '100%',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
  },
  walkingForEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  walkingForRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  walkingForPrayerTitle: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  changePillBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  changePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  markPrayerStopPill: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  markPrayerStopPillText: {
    fontSize: 15,
    fontWeight: '600',
  },
  walkBottomRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 6,
    marginBottom: 20,
  },
  pausePillBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pausePillText: {
    fontSize: 15,
    fontWeight: '600',
  },
  finishWalkPillBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishWalkPillText: {
    fontSize: 15,
    fontWeight: '700',
  },
  summaryTopHeader: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  summaryEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  summaryMainTitle: {
    fontSize: 34,
    fontWeight: '400',
    textAlign: 'center',
  },
  hushHabitBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginVertical: 12,
  },
  hushCheckCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hushHabitTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  hushHabitSub: {
    fontSize: 13,
    marginTop: 2,
  },
  hushJournalSection: {
    width: '100%',
    marginVertical: 10,
  },
  hushJournalLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  hushJournalInputBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  hushJournalInput: {
    fontSize: 14,
    lineHeight: 20,
    minHeight: 70,
  },
});
