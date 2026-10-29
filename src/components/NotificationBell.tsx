import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { usePrayer } from '@/context/PrayerContext';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { UserAvatar } from '@/components/UserAvatar';

const LAST_SEEN_KEY = '@pw_notifications_last_seen_v1';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  created_at: string;
  userName?: string;
  avatarUrl?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
}

function timeAgo(iso: string) {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

/**
 * Header bell icon with an unread dot. Tapping opens an in-app notification centre
 * built from circle activity (prayers shared, answered, prayed-for) and personal milestones.
 */
export function NotificationBell() {
  const { feedItems, groups, profile, userActivities } = usePrayer();
  const { colors, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(LAST_SEEN_KEY)
      .then((v) => setLastSeen(v))
      .catch(() => {});
  }, []);

  const notifications = useMemo((): NotificationItem[] => {
    const groupNames: Record<string, string> = {};
    for (const g of groups) groupNames[g.id] = g.name;

    const list: NotificationItem[] = [];

    // Activity from other members in my circles
    for (const item of feedItems) {
      if (item.user_id === profile.id) continue;
      const circle = groupNames[item.group_id] || 'your circle';
      let title = '';
      let icon: NotificationItem['icon'] = 'people';
      let color: string = Colors.primary;
      switch (item.type) {
        case 'prayer_shared':
          title = `${item.user_name} shared a prayer request in ${circle}`;
          icon = 'hand-left';
          break;
        case 'prayer_answered':
          title = `${item.user_name}'s prayer was answered 🎉`;
          icon = 'sparkles';
          color = '#F59E0B';
          break;
        case 'prayer_update':
          title = `${item.user_name} posted an update in ${circle}`;
          icon = 'chatbubble-ellipses';
          break;
        case 'user_prayed':
          title = `${item.user_name} prayed with ${circle} 🙏`;
          icon = 'heart';
          color = '#E11D48';
          break;
      }
      list.push({
        id: 'n-feed-' + item.id,
        title,
        body: item.prayer_title ? `"${item.prayer_title}"` : item.content || '',
        created_at: item.created_at,
        userName: item.user_name,
        avatarUrl: item.avatar_url,
        icon,
        color,
      });
    }

    // Personal journey highlights (walks, answered prayers, milestones)
    for (const act of userActivities.slice(0, 15)) {
      if (act.type !== 'prayer_walk' && act.type !== 'prayer_answered' && act.type !== 'plan_day_completed') {
        continue;
      }
      list.push({
        id: 'n-act-' + act.id,
        title: act.title,
        body: act.description,
        created_at: act.created_at,
        icon: (act.icon as NotificationItem['icon']) || 'footsteps',
        color: act.color || Colors.primary,
      });
    }

    // Streak encouragement
    if (profile.prayer_streak >= 3) {
      list.push({
        id: 'n-streak-' + profile.prayer_streak,
        title: `🔥 ${profile.prayer_streak}-day prayer streak!`,
        body: 'You are building a beautiful rhythm with God. Keep walking.',
        created_at: profile.last_prayed_at
          ? new Date(profile.last_prayed_at + 'T08:00:00').toISOString()
          : new Date().toISOString(),
        icon: 'flame',
        color: '#F97316',
      });
    }

    list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return list.slice(0, 40);
  }, [feedItems, groups, profile, userActivities]);

  const unreadCount = useMemo(() => {
    if (!lastSeen) return notifications.length;
    return notifications.filter((n) => n.created_at > lastSeen).length;
  }, [notifications, lastSeen]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    const now = new Date().toISOString();
    setLastSeen(now);
    AsyncStorage.setItem(LAST_SEEN_KEY, now).catch(() => {});
  }, []);

  return (
    <>
      <TouchableOpacity
        style={styles.bellBtn}
        onPress={handleOpen}
        activeOpacity={0.7}
        accessibilityLabel="Notifications">
        <Ionicons name="notifications-outline" size={22} color={colors.text} />
        {unreadCount > 0 && (
          <View style={[styles.badge, { borderColor: isDark ? '#14121F' : '#FFFFFF' }]}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsOpen(false)}>
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Notifications</Text>
            <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {notifications.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#2A2433' : '#FDF4E7' }]}>
                  <Ionicons name="notifications-outline" size={30} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>You are all caught up</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  When your circle shares prayers, prays for you, or celebrates answered prayers,
                  it will show up here.
                </Text>
              </View>
            ) : (
              notifications.map((n) => (
                <View key={n.id} style={[styles.row, { borderBottomColor: colors.border }]}>
                  {n.userName ? (
                    <View>
                      <UserAvatar name={n.userName} uri={n.avatarUrl} size={42} />
                      <View style={[styles.iconChip, { backgroundColor: n.color }]}>
                        <Ionicons name={n.icon || 'people'} size={10} color="#FFFFFF" />
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.iconCircle, { backgroundColor: (n.color || colors.primary) + '1A' }]}>
                      <Ionicons name={n.icon || 'footsteps'} size={20} color={n.color || colors.primary} />
                    </View>
                  )}
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: colors.text }]}>{n.title}</Text>
                    {!!n.body && (
                      <Text style={[styles.rowBody, { color: colors.textSecondary }]} numberOfLines={2}>
                        {n.body}
                      </Text>
                    )}
                    <Text style={[styles.rowTime, { color: colors.textTertiary }]}>{timeAgo(n.created_at)}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 3,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#E53935',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  modalSafe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  iconChip: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 19,
  },
  rowBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  rowTime: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
});
