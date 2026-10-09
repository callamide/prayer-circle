import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  AppState,
  AppStateStatus,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pedometer } from 'expo-sensors';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';

import { usePrayer } from '@/context/PrayerContext';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { Confetti } from '@/components/Confetti';
import { Prayer } from '@/types/database';
import { sendLocalNotification } from '@/lib/notifications';

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

  // Active prayers available to select
  const activePrayers = prayers.filter((p) => p.status === 'active');
  const recent3Prayers = activePrayers.slice(0, 3);

  // Initial prayer selection if passed via params
  const initialPrayer = params.prayerId
    ? activePrayers.find((p) => p.id === params.prayerId) || null
    : null;

  // Screen Phases: 'select' | 'walking' | 'summary'
  const [phase, setPhase] = useState<'select' | 'walking' | 'summary'>(
    initialPrayer ? 'walking' : 'select'
  );

  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(initialPrayer);
  const [isGenericWalk, setIsGenericWalk] = useState<boolean>(!initialPrayer && Boolean(params.prayerId === 'generic'));

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

  // Keep screen awake ONLY while actively on this walk screen!
  useKeepAwake();

  // Step subscription ref
  const pedometerSubRef = useRef<{ remove: () => void } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const baseStepsRef = useRef<number>(0);
  const walkSessionStepsRef = useRef<number>(0);

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

  // Timer: 1 second interval when active and not paused
  useEffect(() => {
    if (phase !== 'walking' || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setDurationSeconds((prev) => {
        const next = prev + 1;

        // Encouragement trigger: Every 60 seconds
        if (next > 0 && next % 60 === 0) {
          const quoteIndex = Math.floor(next / 60) % ENCOURAGEMENTS.length;
          setEncouragementText(ENCOURAGEMENTS[quoteIndex]);

          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }

          // Auto clear banner after 6s
          setTimeout(() => {
            setEncouragementText(null);
          }, 6000);
        }

        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, isPaused]);

  // Watcher lifecycle based on phase & pause state
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

  // AppState Listener: Auto-pause when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState.match(/inactive|background/) && phase === 'walking' && !isPaused) {
        setIsPaused(true);
        if (pedometerSubRef.current) {
          pedometerSubRef.current.remove();
          pedometerSubRef.current = null;
        }
        sendLocalNotification(
          'Prayer Walk Paused 🙏',
          'Your prayer walk was paused while you stepped away. Tap to continue.'
        );
      }
    });

    return () => {
      subscription.remove();
    };
  }, [phase, isPaused]);

  // Start walk for a chosen prayer
  const handleSelectPrayer = (prayer: Prayer | null) => {
    setSelectedPrayer(prayer);
    setIsGenericWalk(!prayer);
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
    <SafeAreaView style={styles.safeArea}>
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
                <Text style={styles.stepsNumber}>{steps ?? 0}</Text>
                <Text style={styles.stepsLabel}>steps of prayer</Text>
              </View>
            ) : (
              <View style={styles.stepsDisplay}>
                <Text style={styles.stepsLabel}>Timer-only mode</Text>
                <Text style={styles.timerModeSub}>Quiet prayer focus</Text>
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
    fontSize: 32,
  },
  summaryTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  summaryBody: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
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
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
  },
  summaryStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 4,
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
    elevation: 3,
  },
  logCheckinBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  doneBtn: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
