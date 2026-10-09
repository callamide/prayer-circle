import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePrayer } from '@/context/PrayerContext';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { shareGroupInvite } from '@/lib/links';
import { GroupFeedItem, ReactionType } from '@/types/database';
import { differenceInCalendarDays, parseISO } from 'date-fns';

export default function GroupsScreen() {
  const {
    groups,
    feedItems,
    profile,
    createGroup,
    joinGroup,
    addReaction,
    sendEncouragement,
  } = usePrayer();

  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    groups.length > 0 ? groups[0].id : ''
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

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
  const groupFeed = activeGroup
    ? feedItems.filter((item) => item.group_id === activeGroup.id)
    : [];

  // Accountability: Find member inactive for >= 2 days
  const inactiveMember = activeGroup?.members?.find((m) => {
    if (m.user_id === profile.id) return false;
    if (!m.profile?.last_prayed_at) return true;
    try {
      const diff = differenceInCalendarDays(new Date(), parseISO(m.profile.last_prayed_at));
      return diff >= 2;
    } catch {
      return false;
    }
  });

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setCreateError('Please enter a circle name.');
      return;
    }
    const created = await createGroup(newGroupName, newGroupDesc);
    setSelectedGroupId(created.id);
    setNewGroupName('');
    setNewGroupDesc('');
    setCreateError('');
    setIsCreateModalOpen(false);
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
    await shareGroupInvite(activeGroup.name, activeGroup.invite_code);
  };

  const handleEncourage = (member: NonNullable<typeof inactiveMember>) => {
    if (!activeGroup) return;
    sendEncouragement(activeGroup.id, member.user_id, member.profile?.full_name || 'Sister/Brother');
    Alert.alert(
      'Encouragement Sent 💛',
      `Sent a gentle prayer nudge to ${member.profile?.full_name || 'member'}.`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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
            onPress={() => setIsCreateModalOpen(true)}
            activeOpacity={0.7}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.headerAddBtnText}>New</Text>
          </TouchableOpacity>
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
          <View style={styles.emptyCircleCard}>
            <Text style={styles.emptyCircleEmoji}>👥</Text>
            <Text style={styles.emptyCircleTitle}>No Prayer Circles yet</Text>
            <Text style={styles.emptyCircleText}>
              Praying together builds real faith. Create a private circle for your family,
              church, or small group (up to 15 members).
            </Text>
            <TouchableOpacity
              style={styles.createFirstBtn}
              onPress={() => setIsCreateModalOpen(true)}>
              <Text style={styles.createFirstBtnText}>Create a Circle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          activeGroup && (
            <>
              {/* Group Hero Card */}
              <View style={styles.groupHeroCard}>
                <View style={styles.groupHeroTop}>
                  <View style={styles.groupIconBadge}>
                    <Text style={styles.groupIconEmoji}>🌿</Text>
                  </View>
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupHeroName}>{activeGroup.name}</Text>
                    {activeGroup.description ? (
                      <Text style={styles.groupHeroDesc}>{activeGroup.description}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Capacity & Code */}
                <View style={styles.metaBadgeRow}>
                  <View style={styles.memberCountBadge}>
                    <Ionicons name="people" size={13} color={Colors.primary} />
                    <Text style={styles.memberCountText}>
                      {activeGroup.members_count || activeGroup.members?.length || 1} / 15 members
                    </Text>
                  </View>

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
                    />
                  ))}
                </View>
              )}
            </>
          )
        )}
      </ScrollView>

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
    </SafeAreaView>
  );
}

// Individual Feed Item Card
const FeedItemCard: React.FC<{
  item: GroupFeedItem;
  currentUserId: string;
  onReact: (prayerId: string, type: ReactionType) => void;
}> = ({ item, currentUserId, onReact }) => {
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
      <View style={styles.systemMsgCard}>
        <Text style={styles.systemMsgText}>{item.content}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.feedCard, isAnswered && styles.feedCardAnswered]}>
      {/* Header */}
      <View style={styles.feedCardTop}>
        <View style={styles.feedUserBox}>
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
        </View>
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
  createFirstBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BorderRadius.button,
  },
  createFirstBtnText: {
    color: '#FFFFFF',
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
});
