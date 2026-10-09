import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePrayer } from '@/context/PrayerContext';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function JoinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const { joinGroup } = usePrayer();

  const [code, setCode] = useState(() => (params.code ? String(params.code).toUpperCase() : ''));
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinedGroupName, setJoinedGroupName] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!code.trim()) {
      setError('Please enter the 8-character invite code.');
      return;
    }
    setError('');
    setIsJoining(true);

    try {
      const res = await joinGroup(code.trim().toUpperCase());
      if (!res.success) {
        setError(res.error || 'Could not join this circle.');
        setIsJoining(false);
        return;
      }

      setJoinedGroupName(res.group?.name || 'Prayer Circle');
      setIsJoining(false);
    } catch {
      setError('An unexpected error occurred.');
      setIsJoining(false);
    }
  };

  const handleGoToCircles = () => {
    router.replace('/(tabs)/groups');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Circle</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.content}>
        {joinedGroupName ? (
          <View style={styles.successBox}>
            <View style={styles.successIconBox}>
              <Text style={styles.successEmoji}>🌿</Text>
            </View>
            <Text style={styles.successTitle}>Welcome to {joinedGroupName}!</Text>
            <Text style={styles.successSub}>
              You are now part of this prayer circle. Share requests and lift each other up.
            </Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleGoToCircles}>
              <Text style={styles.primaryBtnText}>Open Circle Feed →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>👥</Text>
            </View>

            <Text style={styles.title}>You’re Invited to Pray</Text>
            <Text style={styles.subtitle}>
              Enter or confirm the circle code to join your friends or family in daily prayer.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. FAITH777"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="characters"
              maxLength={8}
              value={code}
              onChangeText={(t) => {
                setCode(t.toUpperCase());
                if (error) setError('');
              }}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleJoin}
              disabled={isJoining}
              activeOpacity={0.85}>
              {isJoining ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Join Prayer Circle</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.replace('/(tabs)')}>
              <Text style={styles.cancelText}>Back to Today</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconEmoji: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
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
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 3,
    color: Colors.text,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  primaryBtn: {
    width: '100%',
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  successBox: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  successIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  successEmoji: {
    fontSize: 32,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  successSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
});
