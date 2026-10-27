import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { usePrayer } from '@/context/PrayerContext';
import { requestNotificationPermissions } from '@/lib/notifications';
import { AnimatedLogo } from '@/components/AnimatedLogo';

const FOCUS_OPTIONS = [
  { id: 'Spiritual', label: 'Deepening Faith & Peace', icon: '🌿' },
  { id: 'Health', label: 'Healing & Physical Health', icon: '🛡️' },
  { id: 'Family', label: 'Family & Loved Ones', icon: '👨‍👩‍👧' },
  { id: 'Work', label: 'Career & Life Direction', icon: '🧭' },
  { id: 'Other', label: 'Freedom from Anxiety & Stress', icon: '🕊️' },
];

const TIME_PRESETS = [
  { time: '06:00', label: '6:00 AM', desc: 'Sunrise' },
  { time: '07:00', label: '7:00 AM', desc: 'Morning' },
  { time: '08:00', label: '8:00 AM', desc: 'Day Start' },
  { time: '12:00', label: '12:00 PM', desc: 'Noon Walk' },
  { time: '20:00', label: '8:00 PM', desc: 'Evening Peace' },
];

const STARTER_PRAYERS = [
  'Peace and health for my family',
  'Wisdom and clarity in my decisions',
  'Strength and healing in my body',
  'A grateful heart in every season',
];

export default function OnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    inviteCode?: string;
    code?: string;
    groupName?: string;
    name?: string;
    leaderName?: string;
    leader?: string;
  }>();

  const {
    completeOnboarding,
    signUpWithEmail,
    signInWithEmail,
    joinGroup,
    pendingInvite,
    setPendingInvite,
  } = usePrayer();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [jumpedToSignInFromStep1, setJumpedToSignInFromStep1] = useState(false);
  const [focus, setFocus] = useState('Spiritual');
  const [preferredTime, setPreferredTime] = useState('06:00');
  const [name, setName] = useState('');
  const [firstPrayer, setFirstPrayer] = useState('Peace and health for my family');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isGuestSelected, setIsGuestSelected] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [nameError, setNameError] = useState('');

  // Capture any invite code passed via route params into pendingInvite
  const routeInviteCode = (params.inviteCode || params.code || '').trim().toUpperCase();
  const routeGroupName = params.groupName || params.name;
  const routeLeaderName = params.leaderName || params.leader;

  useEffect(() => {
    if (routeInviteCode) {
      setPendingInvite({
        code: routeInviteCode,
        groupName: routeGroupName ? String(routeGroupName) : undefined,
        leaderName: routeLeaderName ? String(routeLeaderName) : undefined,
      });
    }
  }, [routeInviteCode, routeGroupName, routeLeaderName, setPendingInvite]);

  const activeInvite = pendingInvite || (routeInviteCode ? {
    code: routeInviteCode,
    groupName: routeGroupName ? String(routeGroupName) : undefined,
    leaderName: routeLeaderName ? String(routeLeaderName) : undefined,
  } : null);

  // Back navigation handler
  const handleBack = () => {
    setAuthError('');
    setNameError('');
    if (step === 5 && jumpedToSignInFromStep1) {
      setJumpedToSignInFromStep1(false);
      setStep(1);
      return;
    }
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4 | 5 | 6);
    }
  };

  // Step 1 -> 2
  const handleNextStep1 = () => {
    setJumpedToSignInFromStep1(false);
    setStep(2);
  };

  // Jump from Step 1 directly to Sign In for returning users
  const handleJumpToSignIn = () => {
    setJumpedToSignInFromStep1(true);
    setAuthMode('signin');
    setAuthError('');
    setStep(5);
  };

  // Step 2 -> 3
  const handleNextStep2 = () => setStep(3);

  // Step 3 -> 4: Time and notification permission
  const handleNextStep3 = async () => {
    await requestNotificationPermissions();
    setStep(4);
  };

  // Step 4 -> 5: Name and first prayer
  const handleNextStep4 = () => {
    if (!name.trim()) {
      setNameError('Please enter your name or nickname.');
      return;
    }
    setNameError('');
    setJumpedToSignInFromStep1(false);
    setStep(5);
  };

  // Step 5: Email signup or signin
  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setAuthError('Please enter both your email and password.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    if (authMode === 'signin') {
      const res = await signInWithEmail(email, password);
      setAuthLoading(false);

      if (!res.success) {
        setAuthError(res.error || 'Could not sign in. Please check your credentials.');
        return;
      }

      // If returning user signed in and had a pending group invite, join automatically
      if (activeInvite?.code) {
        await joinGroup(activeInvite.code, activeInvite.groupName, activeInvite.leaderName);
        await setPendingInvite(null);
        router.replace('/(tabs)/groups');
        return;
      }

      router.replace('/(tabs)');
      return;
    }

    // Sign Up Mode
    const res = await signUpWithEmail(email, password, name);
    setAuthLoading(false);

    if (!res.success) {
      setAuthError(res.error || 'Could not create account.');
      return;
    }

    setIsGuestSelected(false);
    setStep(6);
  };

  const handleSkipAuth = () => {
    setAuthError('');
    setEmail('');
    setPassword('');
    setIsGuestSelected(true);
    setStep(6);
  };

  // Step 6: Finalize onboarding
  const handleFinish = async () => {
    await completeOnboarding({
      name: name.trim() || 'Friend in Faith',
      firstPrayerTitle: firstPrayer.trim(),
      preferredTime,
      prayerFocus: focus,
      email: !isGuestSelected && email.trim() ? email.trim() : undefined,
      password: !isGuestSelected && password.trim() ? password.trim() : undefined,
      isGuest: isGuestSelected || !email.trim(),
    });

    if (activeInvite?.code) {
      await joinGroup(activeInvite.code, activeInvite.groupName, activeInvite.leaderName);
      await setPendingInvite(null);
      router.replace('/(tabs)/groups');
      return;
    }

    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Top Navigation Bar (Back Button + Progress + Step Counter) */}
          <View style={styles.topNavBar}>
            {step > 1 ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBack}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="arrow-back" size={20} color={Colors.text} />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.navPlaceholder} />
            )}

            {/* Progress Indicator (Tappable for completed steps) */}
            <View style={styles.progressRow}>
              {([1, 2, 3, 4, 5, 6] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  disabled={s >= step || jumpedToSignInFromStep1}
                  onPress={() => {
                    if (s < step && !jumpedToSignInFromStep1) {
                      setAuthError('');
                      setNameError('');
                      setStep(s);
                    }
                  }}
                  activeOpacity={0.7}>
                  <View
                    style={[
                      styles.progressBar,
                      step >= s && styles.progressBarActive,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.navRightBox}>
              <Text style={styles.stepIndicatorText}>
                {step}/6
              </Text>
            </View>
          </View>

          {/* Pending Group Invite Banner */}
          {activeInvite && (
            <View style={styles.inviteBanner}>
              <Text style={styles.inviteBannerEmoji}>🌿</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.inviteBannerTitle}>
                  Circle Invite: {activeInvite.groupName || `#${activeInvite.code}`}
                </Text>
                <Text style={styles.inviteBannerSub}>
                  Complete onboarding to automatically join this prayer circle.
                </Text>
              </View>
            </View>
          )}

          {/* STEP 1: WELCOME & OFFICIAL LOGO */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <AnimatedLogo size={112} variant="hero" style={{ marginBottom: 14 }} />

              <Text style={styles.brandTitle}>Prayer Walk</Text>
              <Text style={styles.tagline}>Walk with God. Pray every step.</Text>

              <Text style={styles.description}>
                Inspired by the simplicity of daily steps. Turn your morning walks and quiet moments
                into active prayer, track your spiritual habit, and watch God answer.
              </Text>

              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>👣</Text>
                  <Text style={styles.featureText}>
                    Steps of Prayer: Active & background pedometer tracking
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>🔥</Text>
                  <Text style={styles.featureText}>A forgiving habit streak that extends grace</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>📖</Text>
                  <Text style={styles.featureText}>Walking prayer plans and meditation journal</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>👥</Text>
                  <Text style={styles.featureText}>Private prayer circles for family & trusted friends</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleNextStep1}
                activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Begin (60 Seconds) →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.returningUserBtn}
                onPress={handleJumpToSignIn}
                activeOpacity={0.7}>
                <Text style={styles.returningUserText}>
                  Already have an account?{' '}
                  <Text style={styles.returningUserHighlight}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: SPIRITUAL FOCUS */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>🎯</Text>
              </View>

              <Text style={styles.stepTitle}>What is your prayer focus?</Text>
              <Text style={styles.stepSubtitle}>
                Select the area of life you want to actively lift up during your daily walks.
              </Text>

              <View style={styles.optionsList}>
                {FOCUS_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.optionCard,
                      focus === opt.id && styles.optionCardActive,
                    ]}
                    onPress={() => setFocus(opt.id)}
                    activeOpacity={0.8}>
                    <Text style={styles.optionIcon}>{opt.icon}</Text>
                    <Text
                      style={[
                        styles.optionLabel,
                        focus === opt.id && styles.optionLabelActive,
                      ]}>
                      {opt.label}
                    </Text>
                    {focus === opt.id && (
                      <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleNextStep2}
                activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Continue →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3: PREFERRED PRAYER TIME */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>⏰</Text>
              </View>

              <Text style={styles.stepTitle}>When would you like to pray?</Text>
              <Text style={styles.stepSubtitle}>
                Choose your daily quiet-time window. You can freely change this anytime in your Profile.
              </Text>

              <View style={styles.timeGrid}>
                {TIME_PRESETS.map((t) => (
                  <TouchableOpacity
                    key={t.time}
                    style={[
                      styles.timeCard,
                      preferredTime === t.time && styles.timeCardActive,
                    ]}
                    onPress={() => setPreferredTime(t.time)}
                    activeOpacity={0.8}>
                    <Text
                      style={[
                        styles.timeValue,
                        preferredTime === t.time && styles.timeValueActive,
                      ]}>
                      {t.label}
                    </Text>
                    <Text style={styles.timeDesc}>{t.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.reminderNoticeBox}>
                <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
                <Text style={styles.reminderNoticeText}>
                  We’ll send a gentle reminder at {preferredTime} so you never miss your quiet walk with God.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleNextStep3}
                activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Set Reminder & Continue →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 4: NAME & FIRST PRAYER */}
          {step === 4 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>🙏</Text>
              </View>

              <Text style={styles.stepTitle}>What should we call you?</Text>
              <Text style={styles.stepSubtitle}>
                Your name will appear when you pray for friends and record answered prayers.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Your first name (e.g. Kolade)"
                placeholderTextColor={Colors.textTertiary}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (nameError) setNameError('');
                }}
              />
              {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

              <Text style={[styles.stepTitle, { marginTop: 24, fontSize: 18 }]}>
                What is your first prayer?
              </Text>
              <Text style={styles.stepSubtitle}>
                Pick a starter prompt or write your own prayer for Day 1:
              </Text>

              <TextInput
                style={styles.input}
                placeholder="What are you believing God for?"
                placeholderTextColor={Colors.textTertiary}
                value={firstPrayer}
                onChangeText={setFirstPrayer}
              />

              <View style={styles.starterChipsContainer}>
                {STARTER_PRAYERS.map((pr) => (
                  <TouchableOpacity
                    key={pr}
                    style={[
                      styles.starterChip,
                      firstPrayer === pr && styles.starterChipActive,
                    ]}
                    onPress={() => setFirstPrayer(pr)}>
                    <Text
                      style={[
                        styles.starterChipText,
                        firstPrayer === pr && styles.starterChipTextActive,
                      ]}>
                      {pr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleNextStep4}
                activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Continue →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 5: AUTHENTICATION (EMAIL & PASSWORD) */}
          {step === 5 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>🔒</Text>
              </View>

              <Text style={styles.stepTitle}>
                {authMode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
              </Text>
              <Text style={styles.stepSubtitle}>
                {authMode === 'signup'
                  ? 'Save your prayer notes, track your daily walking habit, and create or join prayer circles.'
                  : 'Enter your registered email and password to restore your prayer journal and circles.'}
              </Text>

              {/* Email & Password Form */}
              <View style={styles.formContainer}>
                <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (authError) setAuthError('');
                  }}
                />

                <Text style={[styles.inputLabel, { marginTop: 14 }]}>PASSWORD</Text>
                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor={Colors.textTertiary}
                  secureTextEntry
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (authError) setAuthError('');
                  }}
                />
              </View>

              {/* Toggle Sign Up / Sign In */}
              <View style={styles.authModeToggleRow}>
                <Text style={styles.authModePrompt}>
                  {authMode === 'signup'
                    ? 'Already have an account?'
                    : "Don't have an account?"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setAuthMode(authMode === 'signup' ? 'signin' : 'signup');
                    setAuthError('');
                  }}>
                  <Text style={styles.authModeAction}>
                    {authMode === 'signup' ? 'Sign In' : 'Create Account'}
                  </Text>
                </TouchableOpacity>
              </View>

              {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleEmailAuth}
                disabled={authLoading}
                activeOpacity={0.85}>
                {authLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {authMode === 'signup' ? 'Create Account & Continue →' : 'Sign In & Restore Data →'}
                  </Text>
                )}
              </TouchableOpacity>

              {!jumpedToSignInFromStep1 && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleSkipAuth}
                  disabled={authLoading}
                  activeOpacity={0.7}>
                  <Text style={styles.secondaryButtonText}>Continue as Guest (Sign up later)</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* STEP 6: READY CONFIRMATION */}
          {step === 6 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>✨</Text>
              </View>

              <Text style={styles.brandTitle}>You Are Ready!</Text>
              <Text style={styles.stepSubtitle}>
                Welcome to Prayer Walk, {name || 'Friend in Faith'}. Tap any row below if you want to revise it.
              </Text>

              <View style={styles.summaryCard}>
                <TouchableOpacity
                  style={styles.summaryRow}
                  onPress={() => setStep(4)}
                  activeOpacity={0.7}>
                  <Text style={styles.summaryLabel}>Name:</Text>
                  <View style={styles.summaryValueWrap}>
                    <Text style={styles.summaryValue}>{name || 'Friend in Faith'}</Text>
                    <Ionicons name="pencil-outline" size={13} color={Colors.primary} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.summaryRow}
                  onPress={() => setStep(2)}
                  activeOpacity={0.7}>
                  <Text style={styles.summaryLabel}>Prayer Focus:</Text>
                  <View style={styles.summaryValueWrap}>
                    <Text style={styles.summaryValue}>{focus}</Text>
                    <Ionicons name="pencil-outline" size={13} color={Colors.primary} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.summaryRow}
                  onPress={() => setStep(4)}
                  activeOpacity={0.7}>
                  <Text style={styles.summaryLabel}>First Prayer:</Text>
                  <View style={styles.summaryValueWrap}>
                    <Text style={styles.summaryValue} numberOfLines={1}>
                      “{firstPrayer}”
                    </Text>
                    <Ionicons name="pencil-outline" size={13} color={Colors.primary} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.summaryRow}
                  onPress={() => setStep(3)}
                  activeOpacity={0.7}>
                  <Text style={styles.summaryLabel}>Daily Quiet Time:</Text>
                  <View style={styles.summaryValueWrap}>
                    <Text style={styles.summaryValue}>{preferredTime}</Text>
                    <Ionicons name="pencil-outline" size={13} color={Colors.primary} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.summaryRow}
                  onPress={() => setStep(5)}
                  activeOpacity={0.7}>
                  <Text style={styles.summaryLabel}>Account Status:</Text>
                  <View style={styles.summaryValueWrap}>
                    <Text style={styles.summaryValue}>
                      {!isGuestSelected && email ? email : 'Guest Mode'}
                    </Text>
                    <Ionicons name="pencil-outline" size={13} color={Colors.primary} />
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleFinish}
                activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>
                  {activeInvite ? 'Finish & Join Prayer Circle 🙏' : 'Take Your First Step 🙏'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleBack}
                activeOpacity={0.7}>
                <Text style={styles.secondaryButtonText}>← Go Back to Previous Step</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 80,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    minHeight: 36,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingRight: 8,
    minWidth: 68,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  navPlaceholder: {
    minWidth: 68,
  },
  navRightBox: {
    minWidth: 68,
    alignItems: 'flex-end',
  },
  stepIndicatorText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textTertiary,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  progressBar: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
  },
  progressBarActive: {
    backgroundColor: Colors.primary,
  },
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
  },
  inviteBannerEmoji: {
    fontSize: 22,
  },
  inviteBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  inviteBannerSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  stepContainer: {
    alignItems: 'center',
  },
  logoCard: {
    width: 116,
    height: 116,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 112,
    height: 112,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconEmoji: {
    fontSize: 34,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 14,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  featureList: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  featureIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  featureText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
  },
  input: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.button,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  optionsList: {
    width: '100%',
    gap: 10,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: BorderRadius.card,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  optionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#E8F5E9',
  },
  optionIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  optionLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    width: '100%',
    marginBottom: 16,
  },
  timeCard: {
    width: '47%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.card,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  timeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#E8F5E9',
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  timeValueActive: {
    color: Colors.primary,
  },
  timeDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  reminderNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    gap: 10,
  },
  reminderNoticeText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  starterChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 24,
  },
  starterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  starterChipActive: {
    backgroundColor: '#E8F5E9',
    borderColor: Colors.primary,
  },
  starterChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  starterChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.card,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 24,
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  summaryValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '62%',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'right',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  returningUserBtn: {
    marginTop: 18,
    paddingVertical: 8,
  },
  returningUserText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  returningUserHighlight: {
    color: Colors.primary,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 16,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  formContainer: {
    width: '100%',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  authModeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 12,
  },
  authModePrompt: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  authModeAction: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
});
