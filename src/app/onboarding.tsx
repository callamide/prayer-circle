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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { usePrayer } from '@/context/PrayerContext';
import { shareGroupInvite } from '@/lib/links';

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = usePrayer();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [name, setName] = useState('');
  const [firstPrayer, setFirstPrayer] = useState('Family health and peace');
  const [nameError, setNameError] = useState('');

  const handleNextStep1 = () => {
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!name.trim()) {
      setNameError('Please share what we should call you.');
      return;
    }
    setNameError('');
    setStep(3);
  };

  const handleNextStep3 = () => {
    setStep(4);
  };

  const handleFinish = async (inviteSent = false) => {
    await completeOnboarding(name || 'Friend in Faith', firstPrayer, inviteSent);
    router.replace('/(tabs)');
  };

  const handleInviteWhatsApp = async () => {
    await shareGroupInvite('Family Circle', 'FAITH777');
    await handleFinish(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {/* Progress Indicator */}
          <View style={styles.progressRow}>
            {[1, 2, 3, 4].map((s) => (
              <View
                key={s}
                style={[
                  styles.progressBar,
                  step >= s && styles.progressBarActive,
                ]}
              />
            ))}
          </View>

          {/* STEP 1: WELCOME */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>🌿</Text>
              </View>

              <Text style={styles.brandTitle}>Prayer Circle</Text>
              <Text style={styles.tagline}>Small prayers. Real faith. Together.</Text>

              <Text style={styles.description}>
                A calm, clutter-free space inspired by simple daily habits. Focus on one prayer
                at a time, build an unbreakable rhythm, and watch God answer.
              </Text>

              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>🔥</Text>
                  <Text style={styles.featureText}>A forgiving streak that extends grace</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>🙏</Text>
                  <Text style={styles.featureText}>Daily focus on one prayer in 60 seconds</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>👥</Text>
                  <Text style={styles.featureText}>Private circles for up to 15 trusted souls</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleNextStep1}
                activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Begin (60 Seconds)</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: ASK NAME */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>What should we call you?</Text>
              <Text style={styles.stepSubtitle}>
                Your name will appear when you pray for your circle and share answered prayers.
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
                autoFocus
              />

              {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleNextStep2}
                activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Continue →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3: FIRST PRAYER */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>What is on your heart today?</Text>
              <Text style={styles.stepSubtitle}>
                Add your first prayer request. Keep it simple and heartfelt.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. Family health and peace"
                placeholderTextColor={Colors.textTertiary}
                value={firstPrayer}
                onChangeText={setFirstPrayer}
                maxLength={100}
              />

              {/* Suggestions */}
              <View style={styles.suggestBox}>
                <Text style={styles.suggestLabel}>SUGGESTIONS:</Text>
                <View style={styles.suggestChips}>
                  {[
                    'Family health & peace',
                    'Wisdom in decision making',
                    'Healing & rapid recovery',
                    'Deeper peace and stillness',
                  ].map((sugg) => (
                    <TouchableOpacity
                      key={sugg}
                      style={styles.suggestChip}
                      onPress={() => setFirstPrayer(sugg)}>
                      <Text style={styles.suggestChipText}>{sugg}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleNextStep3}
                activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Add to My Circle →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 4: INVITE FRIENDS / FINISH */}
          {step === 4 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>👥</Text>
              </View>

              <Text style={styles.stepTitle}>Faith is better together</Text>
              <Text style={styles.stepSubtitle}>
                Invite family or a friend to pray alongside you in your private circle.
              </Text>

              <TouchableOpacity
                style={styles.whatsappButton}
                onPress={handleInviteWhatsApp}
                activeOpacity={0.85}>
                <Text style={styles.whatsappButtonText}>
                  Invite via WhatsApp 🙏
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => handleFinish(false)}
                activeOpacity={0.7}>
                <Text style={styles.skipButtonText}>Skip for now & start praying</Text>
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
    padding: Spacing.lg,
    flexGrow: 1,
    justifyContent: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  progressBarActive: {
    backgroundColor: Colors.primary,
  },
  stepContainer: {
    alignItems: 'center',
    width: '100%',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconEmoji: {
    fontSize: 32,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  featureList: {
    width: '100%',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    gap: 12,
    marginBottom: Spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    fontSize: 18,
  },
  featureText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  input: {
    width: '100%',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.md,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  suggestBox: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  suggestLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  suggestChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestChip: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  primaryButton: {
    width: '100%',
    height: 54,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
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
  whatsappButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#25D366',
    borderRadius: BorderRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  whatsappButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
