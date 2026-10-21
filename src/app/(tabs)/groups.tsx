import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePrayer } from '@/context/PrayerContext';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { shareGroupInvite } from '@/lib/links';
import { GroupFeedItem, ReactionType, GroupMember, Profile } from '@/types/database';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { NotificationBell } from '@/components/NotificationBell';
import { UserAvatar } from '@/components/UserAvatar';
import { CircleOrbitHero } from '@/components/CircleOrbitHero';

export default function GroupsScreen() {
  const router = useRouter();
  const {
    groups,
    feedItems,
    profile,
    isGuest,
    createGroup,
    joinGroup,
    addReaction,
    sendEncouragement,
    totalPrayerWalks,
    totalStepsWalked,
    signUpWithEmail,
    signInWithEmail,
  } = usePrayer();

  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    groups.length > 0 ? groups[0].id : ''
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isGuestAuthModalOpen, setIsGuestAuthModalOpen] = useState(false);
  const [isMembersListModalOpen, setIsMembersListModalOpen] = useState(false);

  // Guest Account Upgrade Modal State
  const [guestAuthMode, setGuestAuthMode] = useState<'signup' | 'signin'>('signup');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  const [guestAuthError, setGuestAuthError] = useState('');
  const [guestAuthLoading, setGuestAuthLoading] = useState(false);

  // Viewing Member Profile Modal
  const [viewingMember, setViewingMember] = useState<{
    member: GroupMember;
    profile: Profile;
  } | null>(null);

  // Create Form State
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [createError, setCreateError] = useState('');

  // Join Form State
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  // Current active group
  const activeGroup = groups.find((g) => g.id === selectedGroupId) || groups[0] || null;

  // Filter feed items for current group
  const groupFeed = useMemo(
    () => (activeGroup ? feedItems.filter((item) => item.group_id === activeGroup.id) : []),
    [activeGroup, feedItems]
  );

  // Complete members list for active group with current user merged + any feed members
  const membersList: GroupMember[] = useMemo(() => {
    const baseMembers: GroupMember[] = activeGroup?.members?.length
      ? activeGroup.members.map((m) => (m.user_id === profile.id ? { ...m, profile } : m))
      : activeGroup
      ? [
          {
            id: 'gm-owner',
            group_id: activeGroup.id,
            user_id: profile.id,
            joined_at: activeGroup.created_at || '2026-09-01T00:00:00.000Z',
            profile,
          },
        ]
      : [];

    // Ensure current user is included if they are in the group
    if (activeGroup && !baseMembers.some((m) => m.user_id === profile.id)) {
      baseMembers.push({
        id: 'gm-' + profile.id,
        group_id: activeGroup.id,
        user_id: profile.id,
        joined_at: activeGroup.created_at || new Date().toISOString(),
        profile,
      });
    }

    // Also include any members from groupFeed who aren't yet in baseMembers
    for (const item of groupFeed) {
      if (item.user_id && !baseMembers.some((m) => m.user_id === item.user_id)) {
        const feedMemberProfile: Profile = {
          id: item.user_id,
          full_name: item.user_name || 'Circle Member',
          prayer_streak: 2,
          longest_streak: 5,
          last_prayed_at: item.created_at.slice(0, 10),
          grace_days_used: 0,
          reminder_time: '06:00',
          notify_group: true,
          notify_gentle_miss: true,
          prayer_focus: 'Walking in Faith',
          created_at: activeGroup?.created_at || item.created_at,
        };
        baseMembers.push({
          id: 'gm-feed-' + item.user_id,
          group_id: activeGroup?.id || '',
          user_id: item.user_id,
          joined_at: item.created_at,
          profile: feedMemberProfile,
        });
      }
    }

    return baseMembers;
  }, [activeGroup, profile, groupFeed]);

  // Accountability: Find member inactive for >= 2 days
  const inactiveMember = membersList.find((m) => {
    if (m.user_id === profile.id) return false;
    if (!m.profile?.last_prayed_at) return true;
    try {
      const diff = differenceInCalendarDays(new Date(), parseISO(m.profile.last_prayed_at));
      return diff >= 2;
    } catch {
      return false;
    }
  });

  // Gate group creation so guest users cannot create a prayer group
  const handleAttemptCreateGroup = () => {
    if (isGuest) {
      setGuestAuthError('');
      setIsGuestAuthModalOpen(true);
      return;
    }
    setCreateError('');
    setIsCreateModalOpen(true);
  };

  const handleGuestAuthSubmit = async () => {
    if (!guestEmail.trim() || !guestPassword.trim()) {
      setGuestAuthError('Please enter both your email and password.');
      return;
    }
    if (guestPassword.length < 6) {
      setGuestAuthError('Password must be at least 6 characters.');
      return;
    }

    setGuestAuthLoading(true);
    setGuestAuthError('');

    const res =
      guestAuthMode === 'signup'
        ? await signUpWithEmail(guestEmail, guestPassword, profile.full_name || 'Pilgrim')
        : await signInWithEmail(guestEmail, guestPassword);

    setGuestAuthLoading(false);

    if (!res.success) {
      setGuestAuthError(res.error || 'Authentication failed.');
      return;
    }

    setIsGuestAuthModalOpen(false);
    setGuestEmail('');
    setGuestPassword('');
    setIsCreateModalOpen(true);
  };

  const handleCreateGroup = async () => {
    if (isGuest) {
      setIsCreateModalOpen(false);
      setIsGuestAuthModalOpen(true);
      return;
    }
    if (!newGroupName.trim()) {
      setCreateError('Please enter a circle name.');
      return;
    }
    try {
      const created = await createGroup(newGroupName, newGroupDesc);
      setSelectedGroupId(created.id);
      setNewGroupName('');
      setNewGroupDesc('');
      setCreateError('');
      setIsCreateModalOpen(false);
    } catch (err: any) {
      setCreateError(err.message || 'Could not create circle.');
    }
  };

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) {
      setJoinError('Please enter an 8-character invite code.');
      return;
    }
    const res = await joinGroup(joinCode);
    if (!res.success) {
      setJoinError(res.error || 'Failed to join circle.');
      return;
    }
    if (res.group) {
      setSelectedGroupId(res.group.id);
    }
    setJoinCode('');
    setJoinError('');
    setIsJoinModalOpen(false);
    Alert.alert('Joined Circle! 🙏', `You are now part of ${res.group?.name || 'the circle'}.`);
  };

  const handleInvite = async () => {
    if (!activeGroup) return;
    await shareGroupInvite(activeGroup.name, activeGroup.invite_code, profile.full_name);
  };

  const handleEncourage = (member: NonNullable<typeof inactiveMember>) => {
    if (!activeGroup) return;
    sendEncouragement(activeGroup.id, member.user_id, member.profile?.full_name || 'Sister/Brother');
    Alert.alert(
      'Encouragement Sent 💛',
      `Sent a gentle prayer nudge to ${member.profile?.full_name || 'member'}.`
    );
  };

  const handleOpenUserProfile = useCallback((userId: string, userName?: string) => {
    const found = membersList.find((m) => m.user_id === userId);
    if (found) {
      setViewingMember({
        member: found,
        profile: found.profile || {
          ...profile,
          id: userId,
          full_name: userName || 'Circle Member',
        },
      });
    } else {
      const fallbackProfile: Profile = {
        id: userId,
        full_name: userName || 'Circle Member',
        prayer_streak: 4,
        longest_streak: 8,
        last_prayed_at: activeGroup?.created_at || '2026-09-01T00:00:00.000Z',
        grace_days_used: 0,
        reminder_time: '07:00',
        notify_group: true,
        notify_gentle_miss: true,
        prayer_focus: 'Walking in Faith',
        created_at: activeGroup?.created_at || '2026-09-01T00:00:00.000Z',
      };
      setViewingMember({
        member: {
          id: 'gm-' + userId,
          group_id: activeGroup?.id || '',
          user_id: userId,
          joined_at: activeGroup?.created_at || '2026-09-01T00:00:00.000Z',
          profile: fallbackProfile,
        },
        profile: fallbackProfile,
      });
    }
  }, [membersList, profile, activeGroup]);

  const formatDateMonthYear = (dateStr?: string | null) => {
    if (!dateStr) return 'Sep 2026';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '2026';
    }
  };

  const formatLastPrayedText = (dateStr?: string | null) => {
    if (!dateStr) return 'Active this week';
    try {
      const diff = differenceInCalendarDays(new Date(), parseISO(dateStr));
      if (diff === 0) return 'Today 🙏';
      if (diff === 1) return 'Yesterday';
      return `${diff} days ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.headerTitle}>Prayer Circles</Text>
          <Text style={styles.headerSubtitle}>Real faith. Together.</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerSmallBtn}
            onPress={() => setIsJoinModalOpen(true)}
            activeOpacity={0.7}>
            <Text style={styles.headerSmallBtnText}>Join Code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={handleAttemptCreateGroup}
            activeOpacity={0.7}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.headerAddBtnText}>New</Text>
          </TouchableOpacity>

          <NotificationBell />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Circle Selector Tabs if multiple groups */}
        {groups.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.circleSelectorScroll}
            contentContainerStyle={styles.circleSelectorContent}>
            {groups.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[
                  styles.circleChip,
                  (activeGroup?.id === g.id) && styles.circleChipActive,
                ]}
                onPress={() => setSelectedGroupId(g.id)}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.circleChipText,
                    (activeGroup?.id === g.id) && styles.circleChipTextActive,
                  ]}>
                  {g.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Empty State if no groups */}
        {groups.length === 0 ? (
          <View style={styles.emptyHeroWrap}>
            <CircleOrbitHero
              size={260}
              avatars={[{ name: profile.full_name || 'You', uri: profile.avatar_url }]}
            />
            <Text style={styles.emptyHeroTitle}>Praying together{'\n'}builds real faith</Text>
            <Text style={styles.emptyHeroText}>
              Create a private circle for your family, church, or small group (up to 15 members),
              or join an existing circle with an invite code.
            </Text>

            <TouchableOpacity
              style={styles.heroPrimaryBtn}
              onPress={handleAttemptCreateGroup}
              activeOpacity={0.85}>
              <Text style={styles.heroPrimaryBtnText}>Create a Circle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.heroOutlineBtn}
              onPress={() => setIsJoinModalOpen(true)}
              activeOpacity={0.85}>
              <Text style={styles.heroOutlineBtnText}>Join with Code</Text>
            </TouchableOpacity>
          </View>
        ) : (
          activeGroup && (
            <>
              {/* Group Hero Card (Clickable to view all members & profiles) */}
              <View style={styles.groupHeroCard}>
                <TouchableOpacity
                  style={styles.groupHeroTop}
                  onPress={() => setIsMembersListModalOpen(true)}
                  activeOpacity={0.75}>
                  <View style={styles.groupIconBadge}>
                    <Text style={styles.groupIconEmoji}>🌿</Text>
                  </View>
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupHeroName}>{activeGroup.name}</Text>
                    {activeGroup.description ? (
                      <Text style={styles.groupHeroDesc}>{activeGroup.description}</Text>
                    ) : (
                      <Text style={styles.groupHeroDesc}>
                        Tap to view all members & profiles
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
                </TouchableOpacity>

                {/* Capacity & Code (Clickable to open members directory) */}
                <View style={styles.metaBadgeRow}>
                  <TouchableOpacity
                    style={styles.memberCountBadge}
                    onPress={() => setIsMembersListModalOpen(true)}
                    activeOpacity={0.7}>
                    <Ionicons name="people" size={14} color={Colors.primary} />
                    <Text style={styles.memberCountText}>
                      {membersList.length} / 15 members • View All
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.codeBadge}>
                    <Text style={styles.codeBadgeLabel}>Code:</Text>
                    <Text style={styles.codeBadgeValue}>{activeGroup.invite_code}</Text>
                  </View>
                </View>

                {/* Invite Button */}
                <TouchableOpacity
                  style={styles.inviteButton}
                  onPress={handleInvite}
                  activeOpacity={0.85}>
                  <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.inviteButtonText}>Invite to Circle</Text>
                </TouchableOpacity>
              </View>

              {/* Accountability Card (if member hasn't prayed in 2 days) */}
              {inactiveMember && (
                <View style={styles.accountabilityCard}>
                  <View style={styles.accIconBox}>
                    <Text style={styles.accEmoji}>💛</Text>
                  </View>
                  <View style={styles.accTextBox}>
                    <Text style={styles.accTitle}>
                      Encourage {inactiveMember.profile?.full_name || 'member'}?
                    </Text>
                    <Text style={styles.accSub}>
                      Hasn’t checked in for 2 days. A gentle word brings peace.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.accBtn}
                    onPress={() => handleEncourage(inactiveMember)}
                    activeOpacity={0.7}>
                    <Text style={styles.accBtnText}>Send Nudge</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Circle Members Row */}
              <View style={styles.membersSection}>
                <View style={styles.membersHeaderRow}>
                  <Text style={styles.membersHeaderTitle}>
                    CIRCLE MEMBERS ({membersList.length})
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsMembersListModalOpen(true)}
                    activeOpacity={0.7}>
                    <Text style={styles.membersHeaderSubtitle}>
                      View All & Profiles →
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.membersScroll}>
                  {membersList.map((m) => {
                    const memberProfile = m.profile || {
                      id: m.user_id,
                      full_name: 'Member',
                      prayer_streak: 1,
                      longest_streak: 1,
                      last_prayed_at: null,
                      grace_days_used: 0,
                      reminder_time: '07:00',
                      notify_group: true,
                      notify_gentle_miss: true,
                      created_at: m.joined_at,
                    };
                    const isMe = m.user_id === profile.id;
                    const initial = memberProfile.full_name
                      ? memberProfile.full_name.trim().charAt(0).toUpperCase()
                      : 'P';
                    const hasPrayedToday = Boolean(
                      memberProfile.last_prayed_at &&
                      memberProfile.last_prayed_at.startsWith(new Date().toISOString().slice(0, 10))
                    );

                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.memberChipCard, isMe && styles.memberChipCardMe]}
                        onPress={() => setViewingMember({ member: m, profile: memberProfile })}
                        activeOpacity={0.75}>
                        <View style={styles.memberAvatarContainer}>
                          {(isMe ? profile.avatar_url : memberProfile.avatar_url) ? (
                            <UserAvatar
                              name={memberProfile.full_name}
                              uri={isMe ? profile.avatar_url : memberProfile.avatar_url}
                              size={44}
                            />
                          ) : (
                            <View style={[styles.memberAvatarCircle, isMe && styles.memberAvatarCircleMe]}>
                              <Text style={[styles.memberAvatarText, isMe && styles.memberAvatarTextMe]}>
                                {initial}
                              </Text>
                            </View>
                          )}
                          {hasPrayedToday && <View style={styles.prayedTodayDot} />}
                        </View>
                        <Text style={styles.memberNameText} numberOfLines={1}>
                          {isMe ? `${memberProfile.full_name} (You)` : memberProfile.full_name}
                        </Text>
                        <View style={styles.memberStreakRow}>
                          <Text style={styles.memberStreakEmoji}>🔥</Text>
                          <Text style={styles.memberStreakText}>
                            {memberProfile.prayer_streak}d
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Feed Title */}
              <View style={styles.feedHeaderRow}>
                <Text style={styles.feedHeaderTitle}>CIRCLE FEED</Text>
                <Text style={styles.feedHeaderCount}>{groupFeed.length} updates</Text>
              </View>

              {/* Chronological Feed */}
              {groupFeed.length === 0 ? (
                <View style={styles.emptyFeedBox}>
                  <Text style={styles.emptyFeedEmoji}>🕊️</Text>
                  <Text style={styles.emptyFeedTitle}>No circle activity yet</Text>
                  <Text style={styles.emptyFeedText}>
                    When circle members pray, share prayers, or post answered testimonies,
                    they’ll appear here in real time.
                  </Text>
                </View>
              ) : (
                <View style={styles.feedList}>
                  {groupFeed.map((item) => (
                    <FeedItemCard
                      key={item.id}
                      item={item}
                      currentUserId={profile.id}
                      onReact={addReaction}
                      onPressUser={handleOpenUserProfile}
                    />
                  ))}
                </View>
              )}
            </>
          )
        )}
      </ScrollView>

      {/* GUEST ACCOUNT REQUIRED MODAL (Blocks guests from creating a group until they sign up/in) */}
      <Modal
        visible={isGuestAuthModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsGuestAuthModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.guestLockBadge}>
              <Ionicons name="lock-closed" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Account Required</Text>
            <Text style={styles.modalSubtitle}>
              Guest users cannot create a Prayer Circle. Please create a free account or sign in so your circle and members are permanently saved.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Email address (e.g. name@example.com)"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={guestEmail}
              onChangeText={(t) => {
                setGuestEmail(t);
                if (guestAuthError) setGuestAuthError('');
              }}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Password (min 6 characters)"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
              value={guestPassword}
              onChangeText={(t) => {
                setGuestPassword(t);
                if (guestAuthError) setGuestAuthError('');
              }}
            />

            <View style={styles.guestModeSwitchRow}>
              <Text style={styles.guestModeSwitchPrompt}>
                {guestAuthMode === 'signup'
                  ? 'Already have an account?'
                  : "Don't have an account?"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setGuestAuthMode(guestAuthMode === 'signup' ? 'signin' : 'signup');
                  setGuestAuthError('');
                }}>
                <Text style={styles.guestModeSwitchLink}>
                  {guestAuthMode === 'signup' ? 'Sign In' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            </View>

            {guestAuthError ? <Text style={styles.modalError}>{guestAuthError}</Text> : null}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setGuestAuthError('');
                  setIsGuestAuthModalOpen(false);
                }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleGuestAuthSubmit}
                disabled={guestAuthLoading}>
                {guestAuthLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>
                    {guestAuthMode === 'signup' ? 'Create Account' : 'Sign In'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* GROUP MEMBERS DIRECTORY MODAL (When clicking on the group card or View All Members) */}
      {activeGroup && (
        <Modal
          visible={isMembersListModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setIsMembersListModalOpen(false)}>
          <View style={styles.memberModalOverlay}>
            <View style={styles.memberModalDialog}>
              <View style={styles.memberModalHeader}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.memberModalHeaderTitle}>
                    {activeGroup.name} • Members ({membersList.length})
                  </Text>
                  <Text style={styles.memberModalHeaderSubtitle}>
                    Tap any member below to view their profile & spiritual rhythm
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsMembersListModalOpen(false)}
                  style={styles.modalCloseBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.memberModalScrollContent}>
                {membersList.map((m) => {
                  const memberProfile = m.profile || {
                    id: m.user_id,
                    full_name: 'Circle Member',
                    prayer_streak: 1,
                    longest_streak: 1,
                    last_prayed_at: null,
                    grace_days_used: 0,
                    reminder_time: '07:00',
                    notify_group: true,
                    notify_gentle_miss: true,
                    created_at: m.joined_at,
                  };
                  const isMe = m.user_id === profile.id;
                  const isLeader = activeGroup.owner_id === m.user_id;
                  const initial = memberProfile.full_name
                    ? memberProfile.full_name.trim().charAt(0).toUpperCase()
                    : 'P';

                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={styles.directoryMemberRow}
                      onPress={() => {
                        setIsMembersListModalOpen(false);
                        setViewingMember({ member: m, profile: memberProfile });
                      }}
                      activeOpacity={0.75}>
                      {(isMe ? profile.avatar_url : memberProfile.avatar_url) ? (
                        <UserAvatar
                          name={memberProfile.full_name}
                          uri={isMe ? profile.avatar_url : memberProfile.avatar_url}
                          size={44}
                        />
                      ) : (
                        <View
                          style={[
                            styles.memberAvatarCircle,
                            isMe && styles.memberAvatarCircleMe,
                          ]}>
                          <Text
                            style={[
                              styles.memberAvatarText,
                              isMe && styles.memberAvatarTextMe,
                            ]}>
                            {initial}
                          </Text>
                        </View>
                      )}

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={styles.directoryNameRow}>
                          <Text style={styles.directoryMemberName} numberOfLines={1}>
                            {memberProfile.full_name}
                          </Text>
                          {isMe && (
                            <View style={styles.youBadge}>
                              <Text style={styles.youBadgeText}>YOU</Text>
                            </View>
                          )}
                          {isLeader && (
                            <View style={styles.leaderBadge}>
                              <Text style={styles.leaderBadgeText}>LEADER</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.directoryMemberSub}>
                          {memberProfile.prayer_focus || 'Walking in Faith'} • 🔥{' '}
                          {memberProfile.prayer_streak}d streak
                        </Text>
                      </View>

                      <View style={styles.viewProfilePill}>
                        <Text style={styles.viewProfilePillText}>Profile</Text>
                        <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Create Circle Modal */}
      <Modal visible={isCreateModalOpen} animationType="slide" transparent onRequestClose={() => setIsCreateModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Create a Prayer Circle</Text>
            <Text style={styles.modalSubtitle}>
              Intimate prayer spaces have a maximum limit of 15 members to preserve closeness.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Circle Name (e.g. Family, Youth Leaders, Small Group)"
              placeholderTextColor={Colors.textTertiary}
              value={newGroupName}
              onChangeText={(t) => {
                setNewGroupName(t);
                if (createError) setCreateError('');
              }}
            />

            <TextInput
              style={[styles.modalInput, styles.modalInputArea]}
              placeholder="Description (optional)"
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={2}
              value={newGroupDesc}
              onChangeText={setNewGroupDesc}
            />

            {createError ? <Text style={styles.modalError}>{createError}</Text> : null}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setCreateError('');
                  setIsCreateModalOpen(false);
                }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreateGroup}>
                <Text style={styles.modalSubmitText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Join Circle Modal */}
      <Modal visible={isJoinModalOpen} animationType="fade" transparent onRequestClose={() => setIsJoinModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Join a Prayer Circle</Text>
            <Text style={styles.modalSubtitle}>
              Enter the 8-character invite code shared by your circle leader.
            </Text>

            <TextInput
              style={[styles.modalInput, styles.joinCodeInput]}
              placeholder="e.g. FAITH777"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="characters"
              maxLength={8}
              value={joinCode}
              onChangeText={(t) => {
                setJoinCode(t.toUpperCase());
                if (joinError) setJoinError('');
              }}
            />

            {joinError ? <Text style={styles.modalError}>{joinError}</Text> : null}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setJoinError('');
                  setIsJoinModalOpen(false);
                }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleJoinGroup}>
                <Text style={styles.modalSubmitText}>Join Circle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MEMBER PROFILE MODAL */}
      {viewingMember && (
        <Modal
          visible={Boolean(viewingMember)}
          animationType="slide"
          transparent
          onRequestClose={() => setViewingMember(null)}>
          <View style={styles.memberModalOverlay}>
            <View style={styles.memberModalDialog}>
              {/* Modal Header */}
              <View style={styles.memberModalHeader}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.memberModalHeaderTitle}>
                    {viewingMember.profile.full_name}&rsquo;s Profile
                  </Text>
                  <Text style={styles.memberModalHeaderSubtitle}>
                    {viewingMember.member.user_id === profile.id
                      ? 'Your Spiritual Journey & Rhythm'
                      : 'Circle Member • Spiritual Journey & Rhythm'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setViewingMember(null)}
                  style={styles.modalCloseBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.memberModalScrollContent}>
                {/* Profile Card */}
                <View style={styles.memberProfileCard}>
                  {(viewingMember.member.user_id === profile.id
                    ? profile.avatar_url
                    : viewingMember.profile.avatar_url) ? (
                    <UserAvatar
                      name={viewingMember.profile.full_name}
                      uri={
                        viewingMember.member.user_id === profile.id
                          ? profile.avatar_url
                          : viewingMember.profile.avatar_url
                      }
                      size={52}
                    />
                  ) : (
                  <View
                    style={[
                      styles.memberAvatarLarge,
                      viewingMember.member.user_id === profile.id && styles.memberAvatarLargeMe,
                    ]}>
                    <Text
                      style={[
                        styles.memberAvatarLargeText,
                        viewingMember.member.user_id === profile.id && styles.memberAvatarLargeTextMe,
                      ]}>
                      {viewingMember.profile.full_name
                        ? viewingMember.profile.full_name.trim().charAt(0).toUpperCase()
                        : 'P'}
                    </Text>
                  </View>
                  )}

                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <View style={styles.memberTitleRow}>
                      <Text style={styles.memberCardFullName} numberOfLines={1}>
                        {viewingMember.profile.full_name}
                      </Text>
                      {viewingMember.member.user_id === profile.id && (
                        <View style={styles.youBadge}>
                          <Text style={styles.youBadgeText}>YOU</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.memberCardRole}>
                      {activeGroup?.owner_id === viewingMember.member.user_id
                        ? 'Circle Leader'
                        : 'Circle Member'}
                    </Text>

                    <View style={styles.memberBadgeRow}>
                      {viewingMember.profile.prayer_focus ? (
                        <View style={styles.focusPill}>
                          <Text style={styles.focusPillText}>
                            {viewingMember.profile.prayer_focus}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={styles.memberSinceText}>
                        Joined {formatDateMonthYear(viewingMember.member.joined_at || viewingMember.profile.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 2x2 Stats Grid (Matching profile page) */}
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statEmoji}>🔥</Text>
                    <Text style={styles.statValue}>{viewingMember.profile.prayer_streak}</Text>
                    <Text style={styles.statLabel}>Day Streak</Text>
                  </View>

                  <View style={styles.statCard}>
                    <Text style={styles.statEmoji}>🏆</Text>
                    <Text style={styles.statValue}>{viewingMember.profile.longest_streak}</Text>
                    <Text style={styles.statLabel}>Best Streak</Text>
                  </View>

                  <View style={styles.statCard}>
                    <Text style={styles.statEmoji}>🚶</Text>
                    <Text style={styles.statValue}>
                      {viewingMember.member.user_id === profile.id
                        ? totalPrayerWalks
                        : Math.max(viewingMember.profile.prayer_streak * 2, 3)}
                    </Text>
                    <Text style={styles.statLabel}>Prayer Walks</Text>
                  </View>

                  <View style={styles.statCard}>
                    <Text style={styles.statEmoji}>🐾</Text>
                    <Text style={styles.statValue}>
                      {viewingMember.member.user_id === profile.id
                        ? totalStepsWalked.toLocaleString()
                        : (Math.max(viewingMember.profile.prayer_streak * 840, 1260)).toLocaleString()}
                    </Text>
                    <Text style={styles.statLabel}>Steps Prayed</Text>
                  </View>
                </View>

                {/* Spiritual Rhythm & Accountability Card */}
                <View style={styles.rhythmCard}>
                  <Text style={styles.rhythmCardTitle}>SPIRITUAL RHYTHM & ACCOUNTABILITY</Text>

                  <View style={styles.rhythmRow}>
                    <Ionicons name="time-outline" size={16} color={Colors.primary} />
                    <Text style={styles.rhythmLabel}>Preferred Morning Rhythm:</Text>
                    <Text style={styles.rhythmVal}>
                      {viewingMember.profile.reminder_time || '07:00'}
                    </Text>
                  </View>

                  <View style={styles.rhythmRow}>
                    <Ionicons
                      name={viewingMember.profile.last_prayed_at ? 'checkmark-circle-outline' : 'ellipse-outline'}
                      size={16}
                      color={Colors.primary}
                    />
                    <Text style={styles.rhythmLabel}>Last Active Checkin:</Text>
                    <Text style={styles.rhythmVal}>
                      {formatLastPrayedText(viewingMember.profile.last_prayed_at)}
                    </Text>
                  </View>
                </View>

                {/* Bottom Actions */}
                {viewingMember.member.user_id !== profile.id ? (
                  <View style={styles.memberActionBtns}>
                    <TouchableOpacity
                      style={styles.nudgeMemberBtn}
                      onPress={() => {
                        sendEncouragement(
                          activeGroup?.id || '',
                          viewingMember.member.user_id,
                          viewingMember.profile.full_name
                        );
                        Alert.alert(
                          'Encouragement Sent 💛',
                          `Sent a gentle prayer nudge to ${viewingMember.profile.full_name}.`
                        );
                      }}
                      activeOpacity={0.85}>
                      <Ionicons name="heart" size={17} color="#FFFFFF" />
                      <Text style={styles.nudgeMemberBtnText}>
                        Send Prayer Nudge 💛
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.prayWalkForMemberBtn}
                      onPress={() => {
                        setViewingMember(null);
                        router.push('/prayer-walk');
                      }}
                      activeOpacity={0.85}>
                      <Ionicons name="footsteps" size={16} color={Colors.primary} />
                      <Text style={styles.prayWalkForMemberBtnText}>
                        Start Walk for {viewingMember.profile.full_name.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.viewMyProfileTabBtn}
                    onPress={() => {
                      setViewingMember(null);
                      router.push('/(tabs)/profile');
                    }}
                    activeOpacity={0.85}>
                    <Ionicons name="person-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.viewMyProfileTabBtnText}>
                      View My Full Profile & Badges
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// Individual Feed Item Card
const FeedItemCard: React.FC<{
  item: GroupFeedItem;
  currentUserId: string;
  onReact: (prayerId: string, type: ReactionType) => void;
  onPressUser?: (userId: string, userName?: string) => void;
}> = ({ item, currentUserId, onReact, onPressUser }) => {
  const isPrayed = item.type === 'user_prayed';
  const isAnswered = item.type === 'prayer_answered';

  const reactions = item.reactions || [];
  const prayedCount = reactions.filter((r) => r.type === 'prayed').length;
  const loveCount = reactions.filter((r) => r.type === 'love').length;
  const amenCount = reactions.filter((r) => r.type === 'amen').length;

  const userHasPrayed = reactions.some((r) => r.user_id === currentUserId && r.type === 'prayed');
  const userHasLove = reactions.some((r) => r.user_id === currentUserId && r.type === 'love');
  const userHasAmen = reactions.some((r) => r.user_id === currentUserId && r.type === 'amen');

  if (isPrayed) {
    return (
      <TouchableOpacity
        style={styles.systemMsgCard}
        onPress={() => onPressUser && onPressUser(item.user_id, item.user_name)}
        activeOpacity={0.7}>
        <Text style={styles.systemMsgText}>{item.content}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.feedCard, isAnswered && styles.feedCardAnswered]}>
      {/* Header */}
      <View style={styles.feedCardTop}>
        <TouchableOpacity
          style={styles.feedUserBox}
          onPress={() => onPressUser && onPressUser(item.user_id, item.user_name)}
          activeOpacity={0.75}>
          <View style={[styles.avatarCircle, isAnswered && styles.avatarCircleAnswered]}>
            <Text style={styles.avatarInitial}>
              {item.user_name ? item.user_name.charAt(0).toUpperCase() : 'P'}
            </Text>
          </View>
          <View>
            <Text style={styles.feedUserName}>{item.user_name}</Text>
            <Text style={styles.feedTypeBadge}>
              {isAnswered ? '🎉 Marked as Answered' : 'Shared a prayer'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Prayer Title if present */}
      {item.prayer_title && (
        <Text style={styles.feedPrayerTitle}>{item.prayer_title}</Text>
      )}

      {/* Content */}
      {item.content && (
        <Text style={styles.feedContentText}>{item.content}</Text>
      )}

      {/* Reactions: ONLY 3 buttons: 🙏 Prayed, ❤️, Amen */}
      <View style={styles.reactionBar}>
        <TouchableOpacity
          style={[styles.rxBtn, userHasPrayed && styles.rxBtnActive]}
          onPress={() => onReact(item.prayer_id || item.id, 'prayed')}
          activeOpacity={0.7}>
          <Text style={styles.rxEmoji}>🙏</Text>
          <Text style={[styles.rxLabel, userHasPrayed && styles.rxLabelActive]}>
            Prayed {prayedCount > 0 ? `(${prayedCount})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.rxBtn, userHasLove && styles.rxBtnActive]}
          onPress={() => onReact(item.prayer_id || item.id, 'love')}
          activeOpacity={0.7}>
          <Text style={styles.rxEmoji}>❤️</Text>
          <Text style={[styles.rxLabel, userHasLove && styles.rxLabelActive]}>
            Love {loveCount > 0 ? `(${loveCount})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.rxBtn, userHasAmen && styles.rxBtnActive]}
          onPress={() => onReact(item.prayer_id || item.id, 'amen')}
          activeOpacity={0.7}>
          <Text style={styles.rxEmoji}>✨</Text>
          <Text style={[styles.rxLabel, userHasAmen && styles.rxLabelActive]}>
            Amen {amenCount > 0 ? `(${amenCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerSmallBtn: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  headerSmallBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  headerAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 60,
  },
  circleSelectorScroll: {
    marginBottom: Spacing.md,
  },
  circleSelectorContent: {
    gap: 8,
  },
  circleChip: {
    backgroundColor: Colors.card,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  circleChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  circleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  circleChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  groupHeroCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  groupHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.sm,
  },
  groupIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupIconEmoji: {
    fontSize: 22,
  },
  groupInfo: {
    flex: 1,
  },
  groupHeroName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  groupHeroDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
  },
  memberCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeBadgeLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  codeBadgeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 1,
  },
  inviteButton: {
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: BorderRadius.button,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  accountabilityCard: {
    backgroundColor: '#FFFDE7',
    borderRadius: BorderRadius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFF59D',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.md,
  },
  accIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF9C4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accEmoji: {
    fontSize: 18,
  },
  accTextBox: {
    flex: 1,
  },
  accTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6F5603',
  },
  accSub: {
    fontSize: 11,
    color: '#8A6D05',
    marginTop: 2,
  },
  accBtn: {
    backgroundColor: '#FBC02D',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  accBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3E3003',
  },
  feedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  feedHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
  },
  feedHeaderCount: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  feedList: {
    gap: Spacing.sm,
  },
  feedCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  feedCardAnswered: {
    borderColor: '#FFE082',
    backgroundColor: '#FFFEFA',
  },
  feedCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedUserBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircleAnswered: {
    backgroundColor: '#FFF8E1',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  feedUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  feedTypeBadge: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  feedPrayerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  feedContentText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  reactionBar: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 8,
  },
  rxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceVariant,
  },
  rxBtnActive: {
    backgroundColor: Colors.primaryLight,
  },
  rxEmoji: {
    fontSize: 13,
  },
  rxLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  rxLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  systemMsgCard: {
    backgroundColor: Colors.surfaceVariant,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
    marginVertical: 4,
  },
  systemMsgText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  emptyHeroWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 24,
  },
  emptyHeroTitle: {
    fontSize: 28,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 36,
    marginTop: 22,
  },
  emptyHeroText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
    marginBottom: 26,
    paddingHorizontal: 12,
  },
  heroPrimaryBtn: {
    alignSelf: 'stretch',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  heroPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  heroOutlineBtn: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: 15,
    alignItems: 'center',
  },
  heroOutlineBtnText: {
    color: Colors.primary,
    fontSize: 17,
    fontWeight: '600',
  },
  emptyCircleCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyCircleEmoji: {
    fontSize: 36,
    marginBottom: Spacing.sm,
  },
  emptyCircleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  emptyCircleText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  emptyBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  createFirstBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: BorderRadius.button,
  },
  createFirstBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  joinFirstBtn: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  joinFirstBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyFeedBox: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyFeedEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  emptyFeedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  emptyFeedText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalBox: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  guestLockBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  guestModeSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 6,
  },
  guestModeSwitchPrompt: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  guestModeSwitchLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 17,
  },
  modalInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.md,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  joinCodeInput: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
  },
  modalInputArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalError: {
    color: Colors.error,
    fontSize: 12,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
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
  modalSubmitBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: BorderRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Circle Members Section
  membersSection: {
    marginBottom: Spacing.md,
  },
  membersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  membersHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
  },
  membersHeaderSubtitle: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700',
  },
  membersScroll: {
    gap: 10,
    paddingVertical: 2,
    paddingRight: 6,
  },
  memberChipCard: {
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minWidth: 84,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  memberChipCardMe: {
    borderColor: Colors.primary,
    backgroundColor: '#F7FCF7',
  },
  memberAvatarContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  memberAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarCircleMe: {
    backgroundColor: Colors.primary,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  memberAvatarTextMe: {
    color: '#FFFFFF',
  },
  prayedTodayDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  memberNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    maxWidth: 82,
    textAlign: 'center',
  },
  memberStreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 3,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  memberStreakEmoji: {
    fontSize: 10,
  },
  memberStreakText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2410C',
  },

  // Directory Modal Member Row
  directoryMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAF9',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  directoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  directoryMemberName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  directoryMemberSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  leaderBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leaderBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
  },
  viewProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  viewProfilePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Member Profile Modal
  memberModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  memberModalDialog: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 22,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 8,
  },
  memberModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F1',
  },
  memberModalHeaderTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  memberModalHeaderSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F4F6F4',
  },
  memberModalScrollContent: {
    paddingVertical: 12,
    paddingBottom: 16,
  },
  memberProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAF9',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  memberAvatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarLargeMe: {
    backgroundColor: Colors.primary,
  },
  memberAvatarLargeText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  memberAvatarLargeTextMe: {
    color: '#FFFFFF',
  },
  memberTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberCardFullName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
  },
  youBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
  },
  memberCardRole: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 1,
  },
  memberBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  focusPill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rhythmCard: {
    backgroundColor: '#F8FAF8',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8F0E8',
    marginBottom: 16,
  },
  rhythmCardTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  rhythmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  rhythmLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  rhythmVal: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  memberActionBtns: {
    gap: 10,
    marginTop: 4,
  },
  nudgeMemberBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nudgeMemberBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  prayWalkForMemberBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.button,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  prayWalkForMemberBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  viewMyProfileTabBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewMyProfileTabBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
