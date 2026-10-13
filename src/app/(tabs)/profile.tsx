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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePrayer } from '@/context/PrayerContext';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { StreakCalendarGrid } from '@/components/StreakCalendarGrid';
import { createGroupInviteLink } from '@/lib/links';
import { MilestoneBadge } from '@/types/database';

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
    userActivities,
    milestones,
    signUpWithEmail,
  } = usePrayer();

  // Active Tab: 'overview' | 'activity' | 'milestones'
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'milestones'>('overview');

  // Edit Name Modal
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.full_name);

  // Custom Reminder Time Modal
  const [isCustomTimeOpen, setIsCustomTimeOpen] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState(profile.reminder_time);

  // Email Connect Modal (for guest accounts)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState(profile.email || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Milestone Detail Modal
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneBadge | null>(null);

  // Stats
  const totalPrayers = prayers.length;
  const answeredPrayers = prayers.filter((p) => p.status === 'answered').length;
  const currentStreak = profile.prayer_streak;
  const longestStreak = profile.longest_streak;

  const handleSaveName = async () => {
    if (nameInput.trim()) {
      await updateProfileName(nameInput.trim());
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }
    setIsEditingName(false);
  };

  const handleSaveCustomTime = async () => {
    const trimmed = customTimeInput.trim();
    if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(trimmed)) {
      await updateReminderTime(trimmed);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      setIsCustomTimeOpen(false);
    } else {
      Alert.alert('Invalid Format', 'Please enter time in 24-hour HH:MM format (e.g. 06:30 or 20:00).');
    }
  };

  const handleConnectEmail = async () => {
    if (!emailInput.trim() || !emailInput.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (passwordInput.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters.');
      return;
    }

    setIsSubmittingAuth(true);
    const res = await signUpWithEmail(
      emailInput.trim(),
      passwordInput,
      profile.full_name || 'Pilgrim'
    );
    setIsSubmittingAuth(false);

    if (res.success) {
      setIsEmailModalOpen(false);
      Alert.alert('Account Connected', `Your profile is now registered with ${emailInput.trim()}`);
    } else {
      Alert.alert('Connection Note', res.error || 'Saved locally.');
      setIsEmailModalOpen(false);
    }
  };

  const handleInviteFriends = async () => {
    const inviteLink = createGroupInviteLink('PRAYER');
    const msg = `Join me on Prayer Walk — Walk with God. Pray every step.\n${inviteLink}`;

    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({ title: 'Prayer Walk', text: msg });
        } else {
          alert('Link copied:\n' + msg);
        }
      } else {
        await Share.share({
          message: msg,
          title: 'Join me on Prayer Walk',
        });
      }
    } catch (e) {
      console.warn('Invite friends failed:', e);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Reset & Sign Out',
      'Are you sure you want to sign out and reset your local Prayer Walk data?',
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

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : '2026';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.headerTitle}>My Profile</Text>
          <Text style={styles.headerSubtitle}>Spiritual Journey & Rhythm</Text>
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
        {/* ===================== YOUVERSION PROFILE CARD ===================== */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <Image
              source={require('@/../assets/images/prayer-walk-logo.jpg')}
              style={styles.avatarLogo}
              resizeMode="cover"
            />
          </View>

          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{profile.full_name || 'Pilgrim in Faith'}</Text>
              <TouchableOpacity onPress={() => setIsEditingName(true)} style={styles.editIconBtn}>
                <Ionicons name="pencil-outline" size={15} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setIsEmailModalOpen(true)}
              style={styles.emailRow}
              activeOpacity={0.7}>
              <Ionicons
                name={profile.email ? 'mail-outline' : 'person-circle-outline'}
                size={13}
                color={Colors.textTertiary}
              />
              <Text style={styles.userEmail} numberOfLines={1}>
                {profile.email ? profile.email : 'Guest • Tap to connect email'}
              </Text>
            </TouchableOpacity>

            <View style={styles.badgeRow}>
              {profile.prayer_focus && (
                <View style={styles.focusPill}>
                  <Text style={styles.focusPillText}>{profile.prayer_focus}</Text>
                </View>
              )}
              <Text style={styles.memberSinceText}>Walking since {memberSince}</Text>
            </View>
          </View>
        </View>

        {/* ===================== SEGMENTED SELECTOR ===================== */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'overview' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('overview')}
            activeOpacity={0.8}>
            <Ionicons
              name={activeTab === 'overview' ? 'stats-chart' : 'stats-chart-outline'}
              size={16}
              color={activeTab === 'overview' ? '#FFFFFF' : Colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'overview' && styles.segmentTextActive,
              ]}>
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'activity' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('activity')}
            activeOpacity={0.8}>
            <Ionicons
              name={activeTab === 'activity' ? 'time' : 'time-outline'}
              size={16}
              color={activeTab === 'activity' ? '#FFFFFF' : Colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'activity' && styles.segmentTextActive,
              ]}>
              Activity ({userActivities.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'milestones' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('milestones')}
            activeOpacity={0.8}>
            <Ionicons
              name={activeTab === 'milestones' ? 'trophy' : 'trophy-outline'}
              size={16}
              color={activeTab === 'milestones' ? '#FFFFFF' : Colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'milestones' && styles.segmentTextActive,
              ]}>
              Milestones
            </Text>
          </TouchableOpacity>
        </View>

        {/* ===================== 1. OVERVIEW TAB ===================== */}
        {activeTab === 'overview' && (
          <View>
            {/* 6 Stats Grid (StepUp Style) */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>🔥</Text>
                <Text style={styles.statValue}>{currentStreak}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>🏆</Text>
                <Text style={styles.statValue}>{longestStreak}</Text>
                <Text style={styles.statLabel}>Best Streak</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>🚶</Text>
                <Text style={styles.statValue}>{totalPrayerWalks}</Text>
                <Text style={styles.statLabel}>Prayer Walks</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>👣</Text>
                <Text style={styles.statValue}>{totalStepsWalked.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Steps Prayed</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>🙏</Text>
                <Text style={styles.statValue}>{totalPrayers}</Text>
                <Text style={styles.statLabel}>Total Prayers</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>✨</Text>
                <Text style={styles.statValue}>{answeredPrayers}</Text>
                <Text style={styles.statLabel}>Answered</Text>
              </View>
            </View>

            {/* GitHub / YouVersion 35-Day Consistency Heatmap Grid */}
            <StreakCalendarGrid cells={contributionGrid} />

            {/* Daily Prayer Reminder Settings */}
            <View style={styles.settingsCard}>
              <View style={styles.settingsHeaderRow}>
                <Text style={styles.settingsSectionTitle}>DAILY PRAYER REMINDER</Text>
                <TouchableOpacity
                  onPress={() => setIsCustomTimeOpen(true)}
                  style={styles.customTimeBtn}>
                  <Text style={styles.customTimeBtnText}>Custom Time</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.reminderDesc}>
                A quiet morning prompt to begin your day with God (currently set for{' '}
                <Text style={{ fontWeight: '700', color: Colors.primary }}>
                  {profile.reminder_time}
                </Text>
                ).
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
                    Notify when prayer friends share petitions or record praise testimonies
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
                  <Text style={styles.toggleTitle}>Gentle Evening Miss (8:00 PM)</Text>
                  <Text style={styles.toggleSubtitle}>
                    A peaceful whisper if you haven&apos;t taken your prayer walk by evening
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

            {/* Cloud Sync Card */}
            <View style={styles.syncCard}>
              <View style={styles.syncRow}>
                <Ionicons
                  name={isOnlineConfigured ? 'cloud-done-outline' : 'cloud-outline'}
                  size={20}
                  color={isOnlineConfigured ? Colors.primary : Colors.textSecondary}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.syncTitle}>
                    {isOnlineConfigured ? 'Supabase Cloud Synced' : 'Fast Local-First Storage'}
                  </Text>
                  <Text style={styles.syncSubtitle}>
                    {isOnlineConfigured
                      ? 'Prayers, walk sessions, testimonies and streaks are protected with Postgres & RLS'
                      : 'All data is safely stored on your device. Configure Supabase keys for cloud sync.'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ===================== 2. ACTIVITY FEED (YOUVERSION TIMELINE) ===================== */}
        {activeTab === 'activity' && (
          <View style={styles.activityFeedContainer}>
            <Text style={styles.timelineHeading}>SPIRITUAL WALK TIMELINE</Text>
            {userActivities.length === 0 ? (
              <View style={styles.emptyActivityBox}>
                <Ionicons name="footsteps-outline" size={40} color={Colors.textTertiary} />
                <Text style={styles.emptyActivityTitle}>No Activities Yet</Text>
                <Text style={styles.emptyActivityDesc}>
                  Your daily prayer walks, check-ins, journal reflections and testimonies will appear here in chronological order.
                </Text>
              </View>
            ) : (
              userActivities.map((act, index) => {
                const dateStr = new Date(act.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <View key={act.id || index} style={styles.timelineItem}>
                    {/* Timeline Left Line & Icon */}
                    <View style={styles.timelineLeftColumn}>
                      <View
                        style={[
                          styles.timelineIconCircle,
                          { backgroundColor: act.color || Colors.primaryLight },
                        ]}>
                        <Ionicons
                          name={(act.icon as any) || 'sparkles'}
                          size={15}
                          color={act.color ? '#FFFFFF' : Colors.primary}
                        />
                      </View>
                      {index < userActivities.length - 1 && <View style={styles.timelineVerticalLine} />}
                    </View>

                    {/* Timeline Content */}
                    <View style={styles.timelineContentCard}>
                      <View style={styles.timelineHeaderRow}>
                        <Text style={styles.timelineTitle}>{act.title}</Text>
                        <Text style={styles.timelineTime}>{dateStr}</Text>
                      </View>
                      <Text style={styles.timelineDesc}>{act.description}</Text>

                      {act.metadata?.testimony && (
                        <View style={styles.timelineQuoteBox}>
                          <Text style={styles.timelineQuoteText}>
                            &ldquo;{act.metadata.testimony}&rdquo;
                          </Text>
                        </View>
                      )}

                      {act.metadata?.steps !== undefined && act.metadata?.steps !== null && (
                        <View style={styles.timelineStepsRow}>
                          <Ionicons name="footsteps" size={12} color={Colors.primary} />
                          <Text style={styles.timelineStepsText}>
                            {act.metadata.steps.toLocaleString()} steps taken with God
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ===================== 3. MILESTONES & BADGES ===================== */}
        {activeTab === 'milestones' && (
          <View>
            <View style={styles.milestonesHeaderRow}>
              <Text style={styles.milestonesHeading}>SPIRITUAL MILESTONES</Text>
              <Text style={styles.milestonesCount}>
                {milestones.filter((m) => m.is_unlocked).length} of {milestones.length} Unlocked
              </Text>
            </View>

            <View style={styles.milestonesGrid}>
              {milestones.map((milestone) => {
                const percent = Math.min(
                  100,
                  Math.round((milestone.progress / milestone.target) * 100)
                );

                return (
                  <TouchableOpacity
                    key={milestone.id}
                    style={[
                      styles.milestoneCard,
                      milestone.is_unlocked && styles.milestoneCardUnlocked,
                    ]}
                    onPress={() => setSelectedMilestone(milestone)}
                    activeOpacity={0.8}>
                    <View
                      style={[
                        styles.milestoneIconWrap,
                        milestone.is_unlocked && styles.milestoneIconWrapUnlocked,
                      ]}>
                      <Ionicons
                        name={(milestone.icon as any) || 'trophy'}
                        size={24}
                        color={milestone.is_unlocked ? '#D97706' : Colors.textTertiary}
                      />
                    </View>

                    <Text style={styles.milestoneTitle} numberOfLines={1}>
                      {milestone.title}
                    </Text>
                    <Text style={styles.milestoneDesc} numberOfLines={2}>
                      {milestone.description}
                    </Text>

                    {milestone.is_unlocked ? (
                      <View style={styles.unlockedPill}>
                        <Ionicons name="checkmark-circle" size={13} color={Colors.primary} />
                        <Text style={styles.unlockedPillText}>Unlocked</Text>
                      </View>
                    ) : (
                      <View style={styles.progressContainer}>
                        <View style={styles.milestoneProgressBg}>
                          <View
                            style={[
                              styles.milestoneProgressFill,
                              { width: `${percent}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.milestoneProgressText}>
                          {milestone.progress.toLocaleString()} / {milestone.target.toLocaleString()}{' '}
                          {milestone.unit}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Invite Friends Action Card */}
        <TouchableOpacity
          style={styles.inviteFriendsBtn}
          onPress={handleInviteFriends}
          activeOpacity={0.85}>
          <Ionicons name="gift-outline" size={18} color="#FFFFFF" />
          <Text style={styles.inviteFriendsText}>Invite Friends to Prayer Walk</Text>
        </TouchableOpacity>

        {/* Logout / Reset Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.logoutBtnText}>Reset / Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ===================== EDIT NAME MODAL ===================== */}
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

      {/* ===================== CUSTOM TIME MODAL ===================== */}
      <Modal visible={isCustomTimeOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.nameModalBox}>
            <Text style={styles.nameModalTitle}>Set Daily Prayer Time</Text>
            <Text style={styles.modalSubDesc}>
              Enter your preferred time in 24h format (e.g., 06:30 or 21:15)
            </Text>
            <TextInput
              style={styles.nameInput}
              value={customTimeInput}
              onChangeText={setCustomTimeInput}
              placeholder="06:30"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numbers-and-punctuation"
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setIsCustomTimeOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSaveCustomTime}>
                <Text style={styles.modalSaveText}>Set Time</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================== EMAIL CONNECT MODAL ===================== */}
      <Modal visible={isEmailModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.nameModalBox}>
            <Text style={styles.nameModalTitle}>
              {profile.email ? 'Update Email Account' : 'Connect Your Account'}
            </Text>
            <Text style={styles.modalSubDesc}>
              Register an email so you can sync your prayer walks and journal across devices.
            </Text>
            <TextInput
              style={styles.nameInput}
              value={emailInput}
              onChangeText={setEmailInput}
              placeholder="your@email.com"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.nameInput, { marginTop: 10 }]}
              value={passwordInput}
              onChangeText={setPasswordInput}
              placeholder="Password (min 6 characters)"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setIsEmailModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleConnectEmail}
                disabled={isSubmittingAuth}>
                <Text style={styles.modalSaveText}>
                  {isSubmittingAuth ? 'Saving...' : 'Connect'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================== MILESTONE CELEBRATION MODAL ===================== */}
      {selectedMilestone && (
        <Modal visible={Boolean(selectedMilestone)} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.milestoneDetailBox}>
              <View
                style={[
                  styles.milestoneDetailIconWrap,
                  selectedMilestone.is_unlocked && styles.milestoneDetailIconWrapUnlocked,
                ]}>
                <Ionicons
                  name={(selectedMilestone.icon as any) || 'trophy'}
                  size={42}
                  color={selectedMilestone.is_unlocked ? '#D97706' : Colors.textTertiary}
                />
              </View>

              <Text style={styles.milestoneDetailTitle}>{selectedMilestone.title}</Text>
              <Text style={styles.milestoneDetailDesc}>{selectedMilestone.description}</Text>

              {selectedMilestone.is_unlocked ? (
                <View style={styles.milestoneDetailUnlockedBadge}>
                  <Ionicons name="sparkles" size={16} color="#D97706" />
                  <Text style={styles.milestoneDetailUnlockedText}>
                    Milestone Achieved! 🎉
                  </Text>
                </View>
              ) : (
                <View style={{ width: '100%', marginVertical: 12 }}>
                  <View style={styles.milestoneProgressBg}>
                    <View
                      style={[
                        styles.milestoneProgressFill,
                        {
                          width: `${Math.min(
                            100,
                            (selectedMilestone.progress / selectedMilestone.target) * 100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.milestoneDetailProgressText}>
                    Progress: {selectedMilestone.progress.toLocaleString()} /{' '}
                    {selectedMilestone.target.toLocaleString()} {selectedMilestone.unit}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.milestoneCloseBtn}
                onPress={() => setSelectedMilestone(null)}>
                <Text style={styles.milestoneCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
  // YouVersion Profile Card
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
    shadowColor: Colors.primary,
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  avatarWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarLogo: {
    width: '100%',
    height: '100%',
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
    fontWeight: '800',
    color: Colors.text,
  },
  editIconBtn: {
    padding: 2,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  userEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  focusPill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  focusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  memberSinceText: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  // Segmented Switcher
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    marginBottom: Spacing.md,
    padding: 4,
    borderRadius: BorderRadius.lg,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: Colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Stats Grid
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
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // Settings Card
  settingsCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  settingsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  settingsSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  customTimeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#F1F5F9',
  },
  customTimeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
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
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  toggleInfo: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  toggleSubtitle: {
    fontSize: 12,
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
    lineHeight: 16,
  },
  inviteFriendsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.card,
    paddingVertical: 14,
    marginBottom: Spacing.md,
  },
  inviteFriendsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoutBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutBtnText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
  // Timeline Styles
  activityFeedContainer: {
    marginBottom: Spacing.md,
  },
  timelineHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textTertiary,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  emptyActivityBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyActivityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  emptyActivityDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  timelineLeftColumn: {
    alignItems: 'center',
    width: 36,
  },
  timelineIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineVerticalLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
  },
  timelineContentCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.border,
    marginLeft: 6,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  timelineTime: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginLeft: 6,
  },
  timelineDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  timelineQuoteBox: {
    backgroundColor: '#F8FAF8',
    borderLeftWidth: 2,
    borderLeftColor: Colors.primary,
    padding: 6,
    borderRadius: BorderRadius.sm,
    marginTop: 6,
  },
  timelineQuoteText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: Colors.text,
  },
  timelineStepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  timelineStepsText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  // Milestones Styles
  milestonesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  milestonesHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  milestonesCount: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  milestonesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.md,
  },
  milestoneCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  milestoneCardUnlocked: {
    borderColor: '#F59E0B',
    borderWidth: 1.5,
    backgroundColor: '#FFFDF9',
  },
  milestoneIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  milestoneIconWrapUnlocked: {
    backgroundColor: '#FEF3C7',
  },
  milestoneTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 3,
  },
  milestoneDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: 10,
    minHeight: 30,
  },
  unlockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  unlockedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  milestoneProgressBg: {
    width: '100%',
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  milestoneProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  milestoneProgressText: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  // Modal Overlays
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  nameModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 360,
  },
  nameModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  modalSubDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginBottom: 12,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalSave: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Milestone Detail Box
  milestoneDetailBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  milestoneDetailIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  milestoneDetailIconWrapUnlocked: {
    backgroundColor: '#FEF3C7',
  },
  milestoneDetailTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  milestoneDetailDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  milestoneDetailUnlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginVertical: 10,
  },
  milestoneDetailUnlockedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  milestoneDetailProgressText: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  milestoneCloseBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    marginTop: 8,
  },
  milestoneCloseBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
