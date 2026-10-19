import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { usePrayer } from '@/context/PrayerContext';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { APP_DOWNLOAD_URL, createGroupInviteLink } from '@/lib/links';
import { Ionicons } from '@expo/vector-icons';

export default function JoinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    inviteCode?: string;
    name?: string;
    groupName?: string;
    leader?: string;
    leaderName?: string;
  }>();
  const { joinGroup, isOnboarded, isLoading, setPendingInvite } = usePrayer();

  const initialCode = (params.code || params.inviteCode || '').trim().toUpperCase();
  const groupNameHint = params.name || params.groupName ? String(params.name || params.groupName) : undefined;
  const leaderNameHint = params.leader || params.leaderName ? String(params.leader || params.leaderName) : undefined;

  const [code, setCode] = useState(() => initialCode);
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinedGroupName, setJoinedGroupName] = useState<string | null>(null);

  // Save pending invite and redirect un-onboarded users directly to Onboarding
  useEffect(() => {
    if (isLoading) return;

    if (initialCode) {
      setPendingInvite({
        code: initialCode,
        groupName: groupNameHint,
        leaderName: leaderNameHint,
      });
    }

    if (!isOnboarded && Platform.OS !== 'web') {
      router.replace({
        pathname: '/onboarding',
        params: {
          inviteCode: initialCode,
          ...(groupNameHint ? { groupName: groupNameHint } : {}),
          ...(leaderNameHint ? { leaderName: leaderNameHint } : {}),
        },
      });
    }
  }, [isLoading, isOnboarded, initialCode, groupNameHint, leaderNameHint, setPendingInvite, router]);

  // On Web: Try opening native app deep link automatically when arriving via shared link
  useEffect(() => {
    if (Platform.OS === 'web' && initialCode) {
      const deepLink = createGroupInviteLink(initialCode, groupNameHint, leaderNameHint);
      Linking.openURL(deepLink).catch(() => {});
    }
  }, [initialCode, groupNameHint, leaderNameHint]);

  const handleDownloadApp = async () => {
    try {
      await Linking.openURL(APP_DOWNLOAD_URL);
    } catch (e) {
      console.warn('Could not open download URL:', e);
    }
  };

  const handleProceedToOnboarding = async () => {
    if (code.trim()) {
      await setPendingInvite({
        code: code.trim().toUpperCase(),
        groupName: groupNameHint,
        leaderName: leaderNameHint,
      });
    }
    router.replace({
      pathname: '/onboarding',
      params: {
        inviteCode: code.trim().toUpperCase(),
        ...(groupNameHint ? { groupName: groupNameHint } : {}),
        ...(leaderNameHint ? { leaderName: leaderNameHint } : {}),
      },
    });
  };

  const handleJoin = async () => {
    if (!code.trim()) {
      setError('Please enter the 8-character invite code.');
      return;
    }

    if (!isOnboarded) {
      await handleProceedToOnboarding();
      return;
    }

    setError('');
    setIsJoining(true);

    try {
      const res = await joinGroup(code.trim().toUpperCase(), groupNameHint, leaderNameHint);
      if (!res.success) {
        setError(res.error || 'Could not join this circle.');
        setIsJoining(false);
        return;
      }

      await setPendingInvite(null);
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.content, { alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
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
              You are now part of this prayer circle. Share requests, view members, and lift each other up.
            </Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleGoToCircles}>
              <Text style={styles.primaryBtnText}>Open Circle & View Members →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>👥</Text>
            </View>

            <Text style={styles.title}>
              {groupNameHint ? `Join "${groupNameHint}"` : 'You’re Invited to Pray'}
            </Text>
            <Text style={styles.subtitle}>
              {leaderNameHint
                ? `${leaderNameHint} invited you to join their prayer circle on Prayer Walk.`
                : 'Enter or confirm the circle code to join your friends or family in daily prayer.'}
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

            {/* Download App prompt for web or new visitors */}
            {(Platform.OS === 'web' || !isOnboarded) && (
              <View style={styles.downloadBanner}>
                <Text style={styles.downloadBannerTitle}>
                  Don&apos;t have Prayer Walk installed yet?
                </Text>
                <Text style={styles.downloadBannerSub}>
                  Download the mobile app first, then open it to complete onboarding and join this circle automatically.
                </Text>
                <TouchableOpacity
                  style={styles.downloadBtn}
                  onPress={handleDownloadApp}
                  activeOpacity={0.85}>
                  <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.downloadBtnText}>Download Prayer Walk App</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={isOnboarded ? handleJoin : handleProceedToOnboarding}
              disabled={isJoining}
              activeOpacity={0.85}>
              {isJoining ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {isOnboarded ? 'Join Prayer Circle' : 'Continue to Onboarding →'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => router.replace(isOnboarded ? '/(tabs)' : '/onboarding')}>
              <Text style={styles.cancelText}>
                {isOnboarded ? 'Back to Today' : 'Go to Onboarding'}
              </Text>
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
    textAlign: 'center',
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
  downloadBanner: {
    width: '100%',
    backgroundColor: '#E8F5E9',
    borderRadius: BorderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  downloadBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  downloadBannerSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 10,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1B5E20',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.button,
    width: '100%',
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
