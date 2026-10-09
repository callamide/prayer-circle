import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
  Share,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePrayer } from '@/context/PrayerContext';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { StreakCalendarGrid } from '@/components/StreakCalendarGrid';
import { createGroupInviteLink } from '@/lib/links';

const REMINDER_PRESETS = ['06:00', '07:00', '08:00', '12:00', '21:00'];

export default function ProfileScreen() {
  const {
    profile,
    prayers,
    contributionGrid,
    updateProfileName,
    updateReminderTime,
    toggleNotificationSetting,
    logout,
    isOnlineConfigured,
    totalPrayerWalks,
    totalStepsWalked,
  } = usePrayer();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.full_name);

  // Statistics
  const totalPrayers = prayers.length;
  const answeredPrayers = prayers.filter((p) => p.status === 'answered').length;
  const currentStreak = profile.prayer_streak;
  const longestStreak = profile.longest_streak;

  const handleSaveName = async () => {
    if (nameInput.trim()) {
      await updateProfileName(nameInput);
    }
    setIsEditingName(false);
  };

  const handleInviteFriends = async () => {
    const inviteLink = createGroupInviteLink('PRAYER');
    const msg = `Come join me on Prayer Circle — Small prayers. Real faith. Together.\n${inviteLink}`;

    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({ title: 'Prayer Circle', text: msg });
        } else {
          alert('Link copied:\n' + msg);
        }
      } else {
        await Share.share({
          message: msg,
          title: 'Join me on Prayer Circle',
        });
      }
    } catch (e) {
      console.warn('Invite friends failed:', e);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Reset & Sign Out',
      'Are you sure you want to sign out and reset your local circle data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.headerTitle}>My Profile</Text>
          <Text style={styles.headerSubtitle}>Habit & Spiritual Journey</Text>
        </View>

        <TouchableOpacity
          style={styles.inviteHeaderBtn}
          onPress={handleInviteFriends}
          activeOpacity={0.8}>
          <Ionicons name="person-add-outline" size={15} color={Colors.primary} />
          <Text style={styles.inviteHeaderBtnText}>Invite</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>

          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{profile.full_name || 'Friend in Faith'}</Text>
              <TouchableOpacity onPress={() => setIsEditingName(true)} style={styles.editIconBtn}>
                <Ionicons name="pencil-outline" size={15} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.userTagline}>Small prayers. Real faith. Together.</Text>
          </View>
        </View>

        {/* 4 Stats Grid (StepUp Style) */}
        <View style={styles.statsGrid}>
          {/* Current Streak */}
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValue}>{currentStreak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>

          {/* Longest Streak */}
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🏆</Text>
            <Text style={styles.statValue}>{longestStreak}</Text>
            <Text style={styles.statLabel}>Longest Streak</Text>
          </View>

          {/* Total Prayers */}
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🙏</Text>
            <Text style={styles.statValue}>{totalPrayers}</Text>
            <Text style={styles.statLabel}>Total Prayers</Text>
          </View>

          {/* Answered Prayers */}
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>✨</Text>
            <Text style={styles.statValue}>{answeredPrayers}</Text>
            <Text style={styles.statLabel}>Answered</Text>
          </View>

          {/* Total Prayer Walks */}
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🚶</Text>
            <Text style={styles.statValue}>{totalPrayerWalks}</Text>
            <Text style={styles.statLabel}>Prayer Walks</Text>
          </View>

          {/* Total Steps Walked Praying */}
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>👣</Text>
            <Text style={styles.statValue}>{totalStepsWalked.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Steps Prayed</Text>
          </View>
        </View>

        {/* GitHub-Style Streak Calendar (7x5 Grid) */}
        <StreakCalendarGrid cells={contributionGrid} />

        {/* Settings & Daily Reminder Section */}
        <View style={styles.settingsCard}>
          <Text style={styles.settingsSectionTitle}>DAILY PRAYER REMINDER</Text>

          <Text style={styles.reminderDesc}>
            A peaceful morning reminder to start your day with God (default 6:00 AM).
          </Text>

          {/* Preset Time Chips */}
          <View style={styles.timeChipsRow}>
            {REMINDER_PRESETS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.timeChip,
                  profile.reminder_time === t && styles.timeChipActive,
                ]}
                onPress={() => updateReminderTime(t)}>
                <Text
                  style={[
                    styles.timeChipText,
                    profile.reminder_time === t && styles.timeChipTextActive,
                  ]}>
                  {t === '06:00'
                    ? '6:00 AM'
                    : t === '07:00'
                    ? '7:00 AM'
                    : t === '08:00'
                    ? '8:00 AM'
                    : t === '12:00'
                    ? 'Noon'
                    : '9:00 PM'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notification Toggles */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Circle Activity Notifications</Text>
              <Text style={styles.toggleSubtitle}>
                Get notified when circle members share a prayer or record an answered testimony
              </Text>
            </View>
            <Switch
              value={profile.notify_group}
              onValueChange={() => toggleNotificationSetting('notify_group')}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Gentle Miss Reminder (8:00 PM)</Text>
              <Text style={styles.toggleSubtitle}>
                A soft reminder if you haven&apos;t prayed your focus prayer by evening
              </Text>
            </View>
            <Switch
              value={profile.notify_gentle_miss}
              onValueChange={() => toggleNotificationSetting('notify_gentle_miss')}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Cloud Sync & Supabase Status */}
        <View style={styles.syncCard}>
          <View style={styles.syncRow}>
            <Ionicons
              name={isOnlineConfigured ? 'cloud-done-outline' : 'cloud-outline'}
              size={20}
              color={isOnlineConfigured ? Colors.primary : Colors.textSecondary}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.syncTitle}>
                {isOnlineConfigured ? 'Supabase Connected' : 'Offline / Local Mode'}
              </Text>
              <Text style={styles.syncSubtitle}>
                {isOnlineConfigured
                  ? 'Prayers, groups and streak synced with cloud Postgres & RLS'
                  : 'Fast local storage enabled. Connect Supabase keys in .env for full multi-device sync'}
              </Text>
            </View>
          </View>
        </View>

        {/* Invite Friends Action Card */}
        <TouchableOpacity
          style={styles.inviteFriendsBtn}
          onPress={handleInviteFriends}
          activeOpacity={0.85}>
          <Ionicons name="gift-outline" size={18} color="#FFFFFF" />
          <Text style={styles.inviteFriendsText}>Invite Friends to Prayer Circle</Text>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.logoutBtnText}>Reset / Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal visible={isEditingName} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.nameModalBox}>
            <Text style={styles.nameModalTitle}>Edit Your Name</Text>
            <TextInput
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your Name"
              placeholderTextColor={Colors.textTertiary}
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setIsEditingName(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSaveName}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  inviteHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  inviteHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 60,
  },
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  editIconBtn: {
    padding: 2,
  },
  userTagline: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.md,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  settingsCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  settingsSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  reminderDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  timeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  timeChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  toggleInfo: {
    flex: 1,
    paddingRight: 10,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  toggleSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  syncCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  syncSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  inviteFriendsBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: BorderRadius.button,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  inviteFriendsText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  logoutBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  nameModalBox: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 360,
  },
  nameModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  nameInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.md,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancel: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalSave: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
