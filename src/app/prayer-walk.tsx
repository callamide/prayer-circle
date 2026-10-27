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
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pedometer } from 'expo-sensors';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';

import { usePrayer } from '@/context/PrayerContext';
import { useTheme } from '@/context/ThemeContext';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { Confetti } from '@/components/Confetti';
import { Prayer } from '@/types/database';

const ENCOURAGEMENTS = [
  'The Lord is near 🙏',
  'Pray without ceasing',
  'Your circle prays with you',
  'Cast your cares upon Him',
];

export default function PrayerWalkScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prayerId?: string }>();
  const { prayers, addWellnessSession } = usePrayer();
  const { colors, isDark } = useTheme();

  // Active prayers available to select (memoized to prevent re-filter every timer tick)
  const activePrayers = useMemo(() => prayers.filter((p) => p.status === 'active'), [prayers]);
  const recent3Prayers = useMemo(() => activePrayers.slice(0, 3), [activePrayers]);

  // Initial prayer selection if passed via params
  const initialPrayer = params.prayerId
    ? activePrayers.find((p) => p.id === params.prayerId) || null
    : null;

  // Screen Phases: 'select' | 'walking' | 'summary'
  const [phase, setPhase] = useState<'select' | 'walking' | 'summary'>(
    initialPrayer ? 'walking' : 'select'
  );

  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(initialPrayer);
  const [isGenericWalk, setIsGenericWalk] = useState<boolean>(
    !initialPrayer && Boolean(params.prayerId === 'generic')
  );

  // Walk Metrics
  const [steps, setSteps] = useState<number | null>(0);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pedometerAvailable, setPedometerAvailable] = useState<boolean>(true);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(true);

  // Encouragement overlay banner
  const [encouragementText, setEncouragementText] = useState<string | null>(null);

  // Confetti for summary
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  // Keep screen awake while viewing walk screen
  useKeepAwake();

  // Subtle live tracking pulse dot (indicates active hardware pedometer streaming)
  const [trackingPulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (phase !== 'walking' || isPaused) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(trackingPulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(trackingPulse, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [phase, isPaused, trackingPulse]);

  const trackingDotOpacity = trackingPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });

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
          setSteps(null);
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
    setPhase('walking');
    setIsPaused(false);
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

  // Summary Actions
  const handleLogAsCheckin = async () => {
    await addWellnessSession({
      linked_prayer_id: selectedPrayer ? selectedPrayer.id : null,
      linked_prayer_title: selectedPrayer ? selectedPrayer.title : 'Walk & Pray',
      type: 'prayer_walk',
      steps: steps !== null ? steps : null,
      duration_seconds: durationSeconds,
      logAsPrayerCheckin: true,
    });
    router.replace('/(tabs)');
  };

  const handleFinishWithoutCheckin = async () => {
    await addWellnessSession({
      linked_prayer_id: selectedPrayer ? selectedPrayer.id : null,
      linked_prayer_title: selectedPrayer ? selectedPrayer.title : 'Walk & Pray',
      type: 'prayer_walk',
      steps: steps !== null ? steps : null,
      duration_seconds: durationSeconds,
      logAsPrayerCheckin: false,
    });
    router.replace('/(tabs)');
  };

  const handleLogAndJournal = async () => {
    await addWellnessSession({
      linked_prayer_id: selectedPrayer ? selectedPrayer.id : null,
      linked_prayer_title: selectedPrayer ? selectedPrayer.title : 'Walk & Pray',
      type: 'prayer_walk',
      steps: steps !== null ? steps : null,
      duration_seconds: durationSeconds,
      logAsPrayerCheckin: true,
    });
    router.replace('/journal' as any);
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const minutesWalked = Math.max(1, Math.round(durationSeconds / 60));
  const prayerTitleText = isGenericWalk
    ? 'quiet prayer'
    : selectedPrayer
    ? selectedPrayer.title
    : 'prayer';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      {/* PHASE 1: SELECT PRAYER SCREEN */}
      {phase === 'select' && (
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.topNav}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.screenHeading}>Walk and Pray</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView contentContainerStyle={styles.selectScrollContent}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>🚶</Text>
            </View>

            <Text style={styles.selectTitle}>Walk and Pray</Text>
            <Text style={styles.selectSubtitle}>
              Pick what you&apos;ll pray for during your walk
            </Text>

            {/* Prayer Options List */}
            <View style={styles.optionsList}>
              {recent3Prayers.map((prayer) => (
                <TouchableOpacity
                  key={prayer.id}
                  style={styles.prayerOptionCard}
                  onPress={() => handleSelectPrayer(prayer)}
                  activeOpacity={0.8}>
                  <View style={styles.optionTextCol}>
                    <Text style={styles.optionPrayerTitle} numberOfLines={2}>
                      {prayer.title}
                    </Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{prayer.category}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              ))}

              {/* Generic Option */}
              <TouchableOpacity
                style={[styles.prayerOptionCard, styles.genericOptionCard]}
                onPress={() => handleSelectPrayer(null)}
                activeOpacity={0.8}>
                <View style={styles.optionTextCol}>
                  <Text style={styles.optionPrayerTitle}>Just walk and pray</Text>
                  <Text style={styles.genericSubtext}>
                    Quiet stillness and listening in nature
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}

      {/* PHASE 2: WALK SCREEN (THE CORE) */}
      {phase === 'walking' && (
        <View style={styles.walkContainer}>
          {/* Top Focus Banner */}
          <View style={styles.walkTopHeader}>
            <View style={styles.prayingForBadge}>
              <Text style={styles.prayingForLabel}>PRAYING FOR</Text>
              <Text style={styles.prayingForTitle} numberOfLines={2}>
                {isGenericWalk
                  ? 'Open communion with God 🌿'
                  : selectedPrayer?.title}
              </Text>
              {selectedPrayer?.category && !isGenericWalk && (
                <View style={styles.walkCategoryPill}>
                  <Text style={styles.walkCategoryText}>{selectedPrayer.category}</Text>
                </View>
              )}
            </View>

            {/* Encouragement Floating Banner */}
            {encouragementText && (
              <View style={styles.encouragementBanner}>
                <Text style={styles.encouragementEmoji}>🕊️</Text>
                <Text style={styles.encouragementText}>{encouragementText}</Text>
              </View>
            )}
          </View>

          {/* Center Metric Display */}
          <View style={styles.metricCenterArea}>
            {pedometerAvailable && permissionGranted ? (
              <View style={styles.stepsDisplay}>
                <View style={styles.stepsNumberRow}>
                  <Text style={[styles.stepsNumber, { color: colors.primary }]}>{steps ?? 0}</Text>
                  {!isPaused && (
                    <View
                      style={[
                        styles.liveTrackingPill,
                        {
                          backgroundColor: isDark ? 'rgba(76, 175, 80, 0.16)' : 'rgba(46, 125, 50, 0.08)',
                          borderColor: isDark ? 'rgba(76, 175, 80, 0.35)' : 'rgba(46, 125, 50, 0.22)',
                        },
                      ]}>
                      <Animated.View
                        style={[
                          styles.liveTrackingDot,
                          {
                            backgroundColor: colors.primary,
                            opacity: trackingDotOpacity,
                          },
                        ]}
                      />
                      <Text style={[styles.liveTrackingText, { color: colors.primary }]}>
                        Tracking...
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.stepsLabel, { color: colors.textSecondary }]}>steps of prayer</Text>
                <Text style={[styles.backgroundActiveHint, { color: colors.textTertiary }]}>
                  {isPaused
                    ? 'Walk paused'
                    : 'Counts even when your screen is off'}
                </Text>
              </View>
            ) : (
              <View style={styles.stepsDisplay}>
                <Text style={[styles.stepsLabel, { color: colors.textSecondary }]}>Timer-only mode</Text>
                <Text style={[styles.timerModeSub, { color: colors.textTertiary }]}>Quiet prayer focus</Text>
              </View>
            )}

            {/* Timer Display */}
            <View style={styles.timerBox}>
              <Text style={styles.timerText}>{formatTime(durationSeconds)}</Text>
              <Text style={styles.timerSub}>{isPaused ? 'PAUSED' : 'TIME ELAPSED'}</Text>
            </View>
          </View>

          {/* Bottom Action Controls */}
          <View style={styles.walkBottomControls}>
            <TouchableOpacity
              style={[
                styles.pauseButton,
                isPaused && styles.resumeButton,
              ]}
              onPress={handleTogglePause}
              activeOpacity={0.85}>
              <Ionicons
                name={isPaused ? 'play' : 'pause'}
                size={22}
                color={isPaused ? '#FFFFFF' : Colors.primary}
              />
              <Text
                style={[
                  styles.pauseButtonText,
                  isPaused && styles.resumeButtonText,
                ]}>
                {isPaused ? 'Resume Walk' : 'Pause'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.endWalkButton}
              onPress={handleEndWalk}
              activeOpacity={0.85}>
              <Text style={styles.endWalkButtonText}>End Walk</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* PHASE 3: END SUMMARY SCREEN */}
      {phase === 'summary' && (
        <View style={styles.summaryContainer}>
          <ScrollView contentContainerStyle={styles.summaryContent}>
            <View style={styles.summaryIconBadge}>
              <Text style={styles.summaryIconEmoji}>🎉</Text>
            </View>

            <Text style={styles.summaryTitle}>Walk Complete</Text>
            <Text style={styles.summaryBody}>
              You walked {steps !== null ? `${steps} steps` : ''} praying for{' '}
              <Text style={{ fontWeight: '700' }}>&ldquo;{prayerTitleText}&rdquo;</Text>{' '}
              for {minutesWalked} {minutesWalked === 1 ? 'min' : 'mins'}.
            </Text>

            {/* Stat Cards */}
            <View style={styles.summaryStatsRow}>
              {steps !== null && (
                <View style={styles.summaryStatCard}>
                  <Text style={styles.summaryStatValue}>{steps}</Text>
                  <Text style={styles.summaryStatLabel}>Steps Walked</Text>
                </View>
              )}
              <View style={styles.summaryStatCard}>
                <Text style={styles.summaryStatValue}>{formatTime(durationSeconds)}</Text>
                <Text style={styles.summaryStatLabel}>Duration</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.summaryButtonsCol}>
              <TouchableOpacity
                style={styles.logCheckinBtn}
                onPress={handleLogAsCheckin}
                activeOpacity={0.85}>
                <Text style={styles.logCheckinBtnText}>
                  Log as Prayer Check-in 🙏
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.journalNoteBtn}
                onPress={handleLogAndJournal}
                activeOpacity={0.85}>
                <Ionicons name="book-outline" size={17} color={Colors.primary} />
                <Text style={styles.journalNoteBtnText}>
                  Record Reflection in Journal 📖
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={handleFinishWithoutCheckin}
                activeOpacity={0.7}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <Confetti
            active={showConfetti}
            onAnimationEnd={() => setShowConfetti(false)}
            count={45}
          />
        </View>
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
    backgroundColor: '#F7FAF7',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  walkTopHeader: {
    alignItems: 'center',
    marginTop: Spacing.sm,
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
  prayingForLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: 4,
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
  timerBox: {
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timerText: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  timerSub: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 1,
    marginTop: 2,
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
    backgroundColor: Colors.card,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  resumeButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pauseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  resumeButtonText: {
    color: '#FFFFFF',
  },
  endWalkButton: {
    flex: 1,
    height: 56,
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.background,
  },
  summaryContent: {
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  summaryIconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  summaryIconEmoji: {
    fontSize: 34,
  },
  summaryTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
  },
  summaryBody: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: Spacing.xl,
  },
  summaryStatCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryStatValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 4,
  },
  summaryStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryButtonsCol: {
    width: '100%',
    gap: 12,
  },
  logCheckinBtn: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  logCheckinBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  journalNoteBtn: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  journalNoteBtnText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  doneBtn: {
    width: '100%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
