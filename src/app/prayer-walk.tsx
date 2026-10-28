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

export default function PrayerWalkScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prayerId?: string }>();
  const { prayers, addWellnessSession, addJournalEntry, profile } = usePrayer();
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

      router.replace('/(tabs)');
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
      router.replace('/(tabs)');
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
  const prayerTitleText = isGenericWalk
    ? 'quiet prayer'
    : selectedPrayer
    ? selectedPrayer.title
    : 'prayer';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      {/* PHASE 1: SELECT PRAYER SCREEN */}
      {phase === 'select' && (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.topNav, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
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

      {/* PHASE 2: WALK SCREEN (THE CORE) */}
      {phase === 'walking' && (
        <View style={[styles.walkContainer, { backgroundColor: colors.background }]}>
          {/* Top Focus & Intention Banner */}
          <View style={styles.walkTopHeader}>
            <View style={[styles.prayingForBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.prayingForTopRow}>
                <Text style={[styles.prayingForLabel, { color: colors.primary }]}>WALKING FOR</Text>
                <TouchableOpacity
                  onPress={() => setPhase('select')}
                  style={styles.changePrayerBtn}
                  activeOpacity={0.7}>
                  <Text style={[styles.changePrayerText, { color: colors.primary }]}>Change</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.prayingForTitle, { color: colors.text }]} numberOfLines={2}>
                {isGenericWalk
                  ? 'Open communion with God 🌿'
                  : selectedPrayer?.title}
              </Text>
              {selectedPrayer?.category && !isGenericWalk && (
                <View style={[styles.walkCategoryPill, { backgroundColor: colors.surfaceVariant }]}>
                  <Text style={[styles.walkCategoryText, { color: colors.textSecondary }]}>{selectedPrayer.category}</Text>
                </View>
              )}
            </View>

            {/* Floating Banner for Prayer Stop or Encouragement */}
            {stopBannerText ? (
              <View style={[styles.stopBanner, { backgroundColor: isDark ? 'rgba(242, 179, 94, 0.2)' : '#FFF3E0', borderColor: colors.primary }]}>
                <Ionicons name="flag" size={16} color={colors.primary} />
                <Text style={[styles.stopBannerText, { color: colors.primary }]}>{stopBannerText}</Text>
              </View>
            ) : encouragementText ? (
              <View style={[styles.encouragementBanner, { backgroundColor: isDark ? 'rgba(242, 179, 94, 0.15)' : '#FFF8E1', borderColor: colors.border }]}>
                <Text style={styles.encouragementEmoji}>🕊️</Text>
                <Text style={[styles.encouragementText, { color: colors.text }]}>{encouragementText}</Text>
              </View>
            ) : null}
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
                          backgroundColor: isDark ? 'rgba(242, 179, 94, 0.16)' : 'rgba(200, 122, 36, 0.1)',
                          borderColor: isDark ? 'rgba(242, 179, 94, 0.4)' : 'rgba(200, 122, 36, 0.25)',
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
                <Text style={[styles.stepsLabel, { color: colors.textSecondary }]}>steps walked</Text>
                <Text style={[styles.backgroundActiveHint, { color: colors.textTertiary }]}>
                  {isPaused
                    ? 'Walk paused'
                    : 'Counts even when your phone is in your pocket'}
                </Text>
              </View>
            ) : (
              <View style={styles.stepsDisplay}>
                <Text style={[styles.stepsLabel, { color: colors.textSecondary }]}>Timer-only mode</Text>
                <Text style={[styles.timerModeSub, { color: colors.textTertiary }]}>Quiet prayer focus</Text>
              </View>
            )}

            {/* Hush 3 HUD Metrics Row */}
            <View style={[styles.hudRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.hudCol}>
                <Text style={[styles.hudVal, { color: colors.text }]}>{formatTime(durationSeconds)}</Text>
                <Text style={[styles.hudLbl, { color: colors.textSecondary }]}>TIME</Text>
              </View>
              <View style={[styles.hudDivider, { backgroundColor: colors.border }]} />
              <View style={styles.hudCol}>
                <Text style={[styles.hudVal, { color: colors.text }]}>
                  {steps ? (steps * 0.00076).toFixed(2) : '0.00'} km
                </Text>
                <Text style={[styles.hudLbl, { color: colors.textSecondary }]}>DISTANCE</Text>
              </View>
              <View style={[styles.hudDivider, { backgroundColor: colors.border }]} />
              <View style={styles.hudCol}>
                <Text style={[styles.hudVal, { color: colors.primary }]}>{prayerStops}</Text>
                <Text style={[styles.hudLbl, { color: colors.textSecondary }]}>STOPS</Text>
              </View>
            </View>

            {/* Mark a Prayer Stop Button (Hush Core Innovation) */}
            <TouchableOpacity
              style={[
                styles.markStopBtn,
                {
                  backgroundColor: isDark ? 'rgba(242, 179, 94, 0.12)' : 'rgba(200, 122, 36, 0.08)',
                  borderColor: isDark ? 'rgba(242, 179, 94, 0.45)' : 'rgba(200, 122, 36, 0.35)',
                },
              ]}
              onPress={handleMarkPrayerStop}
              activeOpacity={0.8}>
              <Ionicons name="flag" size={17} color={colors.primary} />
              <Text style={[styles.markStopBtnText, { color: colors.primary }]}>
                Mark a prayer stop{prayerStops > 0 ? ` (${prayerStops})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Action Controls */}
          <View style={styles.walkBottomControls}>
            <TouchableOpacity
              style={[
                styles.pauseButton,
                { backgroundColor: colors.card, borderColor: colors.primary },
                isPaused && { backgroundColor: colors.primary },
              ]}
              onPress={handleTogglePause}
              activeOpacity={0.85}>
              <Ionicons
                name={isPaused ? 'play' : 'pause'}
                size={22}
                color={isPaused ? '#FFFFFF' : colors.primary}
              />
              <Text
                style={[
                  styles.pauseButtonText,
                  { color: colors.primary },
                  isPaused && styles.resumeButtonText,
                ]}>
                {isPaused ? 'Resume Walk' : 'Pause'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.endWalkButton, { backgroundColor: colors.primary }]}
              onPress={handleEndWalk}
              activeOpacity={0.85}>
              <Text style={styles.endWalkButtonText}>End Walk</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* PHASE 3: END SUMMARY SCREEN (HUSH "WELL WALKED" FLOW) */}
      {phase === 'summary' && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.summaryContainer, { backgroundColor: colors.background }]}>
          <ScrollView
            contentContainerStyle={styles.summaryContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <View style={[styles.summaryIconBadge, { backgroundColor: isDark ? 'rgba(242, 179, 94, 0.15)' : '#FFF8EE' }]}>
              <Text style={styles.summaryIconEmoji}>🕊️</Text>
            </View>

            <Text style={[styles.summaryTitle, { color: colors.text, fontFamily: Typography.serif }]}>
              Well walked.
            </Text>
            <Text style={[styles.summaryBody, { color: colors.textSecondary }]}>
              You walked {steps !== null ? `${steps} steps (${minutesWalked} min)` : `${minutesWalked} min`} in intentional communion with God for{' '}
              <Text style={{ fontWeight: '700', color: colors.text }}>&ldquo;{prayerTitleText}&rdquo;</Text>.
            </Text>

            {/* Stat Cards Grid */}
            <View style={styles.hushStatsGrid}>
              <View style={[styles.hushStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.hushStatVal, { color: colors.primary }]}>{steps ?? 0}</Text>
                <Text style={[styles.hushStatLbl, { color: colors.textSecondary }]}>Steps</Text>
              </View>
              <View style={[styles.hushStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.hushStatVal, { color: colors.text }]}>{formatTime(durationSeconds)}</Text>
                <Text style={[styles.hushStatLbl, { color: colors.textSecondary }]}>Duration</Text>
              </View>
              <View style={[styles.hushStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.hushStatVal, { color: colors.text }]}>
                  {steps ? (steps * 0.00076).toFixed(2) : '0.00'} km
                </Text>
                <Text style={[styles.hushStatLbl, { color: colors.textSecondary }]}>Distance</Text>
              </View>
              <View style={[styles.hushStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.hushStatVal, { color: colors.primary }]}>{prayerStops}</Text>
                <Text style={[styles.hushStatLbl, { color: colors.textSecondary }]}>Prayer Stops</Text>
              </View>
            </View>

            {/* Streak Credit Badge */}
            <View
              style={[
                styles.streakBadgeCard,
                {
                  backgroundColor: isDark ? 'rgba(242, 179, 94, 0.12)' : '#FFF8EE',
                  borderColor: isDark ? 'rgba(242, 179, 94, 0.35)' : '#FFE082',
                },
              ]}>
              <Text style={styles.streakBadgeEmoji}>🔥</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.streakBadgeTitle, { color: colors.text }]}>
                  Counted as today&apos;s prayer
                </Text>
                <Text style={[styles.streakBadgeSub, { color: colors.textSecondary }]}>
                  Your streak is now {profile?.prayer_streak || 1} {(profile?.prayer_streak || 1) === 1 ? 'day' : 'days'}
                </Text>
              </View>
            </View>

            {/* Inline Reflection Note Card (Hush Screen 7 Direct Journal Save) */}
            <View style={[styles.journalNoteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.journalNoteHeader}>
                <Ionicons name="book-outline" size={17} color={colors.primary} />
                <Text style={[styles.journalNoteTitle, { color: colors.text }]}>
                  Add a note to your journal
                </Text>
              </View>
              <Text style={[styles.journalNotePrompt, { color: colors.textSecondary }]}>
                What did God speak to you while you walked?
              </Text>
              <TextInput
                style={[
                  styles.journalNoteInput,
                  {
                    backgroundColor: isDark ? '#14121F' : '#FAF9F5',
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={walkNote}
                onChangeText={setWalkNote}
                placeholder="A thought, scripture, or prayer intention from this walk..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.summaryButtonsCol}>
              <TouchableOpacity
                style={[styles.saveJournalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveToJournal}
                disabled={isSaving}
                activeOpacity={0.85}>
                <Ionicons name="journal-outline" size={18} color="#FFFFFF" />
                <Text style={styles.saveJournalBtnText}>
                  {walkNote.trim() ? 'Save to Journal & Finish' : 'Finish & Record Walk'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={handleLogAsCheckin}
                disabled={isSaving}
                activeOpacity={0.7}>
                <Text style={[styles.doneBtnText, { color: colors.textSecondary }]}>
                  Skip note & finish
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
});
