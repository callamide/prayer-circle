import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { usePrayer } from '@/context/PrayerContext';
import { requestNotificationPermissions } from '@/lib/notifications';

const LOGO_IMG = require('@/assets/images/prayer-walk-logo.jpg');

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
  const { completeOnboarding, signUpWithEmail } = usePrayer();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [focus, setFocus] = useState('Spiritual');
  const [preferredTime, setPreferredTime] = useState('06:00');
  const [name, setName] = useState('');
  const [firstPrayer, setFirstPrayer] = useState('Peace and health for my family');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [nameError, setNameError] = useState('');
  // Step 1 -> 2
  const handleNextStep1 = () => setStep(2);

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
    setStep(5);
  };

  // Step 5: Email signup or skip
  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) {
      setAuthError('Please enter both email and password, or continue as guest.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    const res = await signUpWithEmail(email, password, name);
    setAuthLoading(false);

    if (!res.success && res.error) {
      setAuthError(res.error);
      return;
    }

    setStep(6);
  };

  const handleSkipAuth = () => {
    setAuthError('');
    setStep(6);
  };

  // Step 6: Finalize onboarding
  const handleFinish = async () => {
    await completeOnboarding({
      name: name.trim() || 'Friend in Faith',
      firstPrayerTitle: firstPrayer.trim(),
      preferredTime,
      prayerFocus: focus,
      email: email.trim() || undefined,
      password: password.trim() || undefined,
      isGuest: !email.trim(),
    });
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Progress Indicator */}
          <View style={styles.progressRow}>
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <View
                key={s}
                style={[
                  styles.progressBar,
                  step >= s && styles.progressBarActive,
                ]}
              />
            ))}
          </View>

          {/* STEP 1: WELCOME & OFFICIAL LOGO */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.logoCard}>
                <Image source={LOGO_IMG} style={styles.logoImage} resizeMode="cover" />
              </View>

              <Text style={styles.brandTitle}>Prayer Walk</Text>
              <Text style={styles.tagline}>Walk with God. Pray every step.</Text>

              <Text style={styles.description}>
                Inspired by the simplicity of daily steps. Turn your morning walks and quiet moments
                into active prayer, track your spiritual habit, and watch God answer.
              </Text>

              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>👣</Text>
                  <Text style={styles.featureText}>Steps of Prayer: Foreground pedometer tracking</Text>
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
                placeholder="Your first name (e.g. David)"
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

          {/* STEP 5: EMAIL REGISTRATION */}
          {step === 5 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>🔒</Text>
              </View>

              <Text style={styles.stepTitle}>Save Your Spiritual Journey</Text>
              <Text style={styles.stepSubtitle}>
                Create an account to protect your streak, sync across devices, and walk with your prayer circles.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (authError) setAuthError('');
                }}
              />

              <TextInput
                style={[styles.input, { marginTop: 12 }]}
                placeholder="Password (minimum 6 characters)"
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (authError) setAuthError('');
                }}
              />

              {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleRegister}
                disabled={authLoading}
                activeOpacity={0.85}>
                {authLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Create Account & Continue →</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleSkipAuth}
                disabled={authLoading}>
                <Text style={styles.secondaryButtonText}>Continue as Guest (Sign up later)</Text>
              </TouchableOpacity>
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
                Welcome to Prayer Walk, {name || 'Friend in Faith'}.
              </Text>

              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Daily Habit Focus:</Text>
                  <Text style={styles.summaryValue}>“{firstPrayer}”</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Daily Quiet Time:</Text>
                  <Text style={styles.summaryValue}>{preferredTime}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Pedometer Walk:</Text>
                  <Text style={styles.summaryValue}>Every step counted in prayer</Text>
                </View>

                {email ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Account:</Text>
                    <Text style={styles.summaryValue}>{email}</Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleFinish}
                activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Take Your First Step 🙏</Text>
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
    paddingBottom: 40,
    paddingTop: Platform.OS === 'ios' ? 12 : 24,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 28,
  },
  progressBar: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
  },
  progressBarActive: {
    backgroundColor: Colors.primary,
  },
  stepContainer: {
    alignItems: 'center',
  },
  logoCard: {
    width: 220,
    height: 120,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#1B261D',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  logoImage: {
    width: '100%',
    height: '100%',
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
    gap: 12,
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
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    maxWidth: '60%',
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
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
