import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import {
  Profile,
  Prayer,
  PrayerGroup,
  PrayerCheckin,
  PrayerReaction,
  PrayerUpdate,
  GroupFeedItem,
  PrayerCategory,
  PrayerPrivacy,
  ReactionType,
  WellnessSession,
  WellnessSessionType,
  JournalEntry,
  PrayerPlan,
  UserPrayerPlan,
  UserActivity,
  MilestoneBadge,
  GroupMember,
} from '@/types/database';
import {
  calculateStreakOnCheckin,
  getLast7Days,
  getContributionGrid,
  DayDot,
  ContributionCell,
} from '@/lib/streak';
import { generateInviteCode } from '@/lib/links';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { scheduleDailyPrayerReminder, sendLocalNotification } from '@/lib/notifications';
import { CURATED_PRAYER_PLANS } from '@/constants/prayerPlans';

export interface CompleteOnboardingParams {
  name: string;
  firstPrayerTitle?: string;
  preferredTime?: string;
  prayerFocus?: string;
  email?: string;
  password?: string;
  isGuest?: boolean;
  inviteSent?: boolean;
}

export interface PendingInviteInfo {
  code: string;
  groupName?: string;
  leaderName?: string;
}

interface StoredAccountRecord {
  id: string;
  email: string;
  password: string;
  profile: Profile;
  prayers: Prayer[];
  groups: PrayerGroup[];
  checkins: PrayerCheckin[];
  wellnessSessions: WellnessSession[];
  journalEntries: JournalEntry[];
  userPlans: UserPrayerPlan[];
  updated_at: string;
}

interface PrayerContextValue {
  // State
  profile: Profile;
  prayers: Prayer[];
  groups: PrayerGroup[];
  checkins: PrayerCheckin[];
  feedItems: GroupFeedItem[];
  isOnboarded: boolean;
  isLoading: boolean;
  isOnlineConfigured: boolean;
  currentUserId: string;
  isGuest: boolean;
  pendingInvite: PendingInviteInfo | null;
  setPendingInvite: (invite: PendingInviteInfo | null) => Promise<void>;

  // Streak & Habits
  last7Days: DayDot[];
  contributionGrid: ContributionCell[];
  todaysFocusPrayer: Prayer | null;
  rotateFocusPrayer: () => void;
  checkInPrayer: (prayerId?: string) => Promise<{ newStreak: number; isFirstToday: boolean; usedGrace: boolean }>;

  // Prayers
  addPrayer: (input: {
    title: string;
    details?: string;
    category: PrayerCategory;
    privacy: PrayerPrivacy;
    groupId?: string | null;
  }) => Promise<Prayer>;
  markAsAnswered: (prayerId: string, testimony: string, shareWithGroup?: boolean) => Promise<void>;
  addAnsweredPrayer: (input: {
    title: string;
    testimony: string;
    category?: PrayerCategory;
    days_prayed?: number;
    answered_at?: string;
  }) => Promise<Prayer>;
  updateTestimony: (prayerId: string, testimony: string) => Promise<void>;
  updatePrayer: (prayerId: string, title: string, details?: string, category?: PrayerCategory) => Promise<void>;
  deletePrayer: (prayerId: string) => Promise<void>;

  // Journal & Meditation
  journalEntries: JournalEntry[];
  addJournalEntry: (input: {
    title: string;
    content: string;
    scripture?: string;
    linked_prayer_id?: string | null;
    tags?: string[];
    steps_walked?: number | null;
  }) => Promise<JournalEntry>;
  updateJournalEntry: (
    id: string,
    input: {
      title?: string;
      content?: string;
      scripture?: string;
      tags?: string[];
      steps_walked?: number | null;
    }
  ) => Promise<void>;
  deleteJournalEntry: (id: string) => Promise<void>;

  // Prayer Plans
  prayerPlans: PrayerPlan[];
  userPlans: UserPrayerPlan[];
  activePlan: { plan: PrayerPlan; userPlan: UserPrayerPlan } | null;
  startPrayerPlan: (planId: string) => Promise<UserPrayerPlan>;
  completePlanDay: (planId: string, dayNumber: number) => Promise<void>;

  // Groups
  createGroup: (name: string, description?: string) => Promise<PrayerGroup>;
  joinGroup: (
    inviteCode: string,
    groupNameHint?: string,
    leaderNameHint?: string
  ) => Promise<{ success: boolean; group?: PrayerGroup; error?: string }>;
  addReaction: (prayerId: string, type: ReactionType) => Promise<void>;
  addPrayerUpdate: (prayerId: string, content: string) => Promise<void>;
  sendEncouragement: (groupId: string, memberId: string, memberName: string) => Promise<void>;

  // Profile & Settings
  updateProfileName: (name: string) => Promise<void>;
  updateReminderTime: (time: string) => Promise<void>;
  toggleNotificationSetting: (key: 'notify_group' | 'notify_gentle_miss') => Promise<void>;
  completeOnboarding: (
    params: CompleteOnboardingParams | string,
    firstPrayerTitle?: string,
    inviteSent?: boolean
  ) => Promise<void>;
  logout: () => Promise<void>;

  // Auth & YouVersion-style Profile
  userActivities: UserActivity[];
  milestones: MilestoneBadge[];
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ success: boolean; error?: string }>;
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signInWithOAuth: (
    provider: 'apple' | 'google',
    fullName?: string
  ) => Promise<{ success: boolean; error?: string }>;

  // V2 Prayer Walk & Wellness
  wellnessSessions: WellnessSession[];
  totalPrayerWalks: number;
  totalStepsWalked: number;
  addWellnessSession: (input: {
    linked_prayer_id?: string | null;
    linked_prayer_title?: string;
    type?: WellnessSessionType;
    steps: number | null;
    duration_seconds: number;
    logAsPrayerCheckin?: boolean;
  }) => Promise<WellnessSession>;
}

const STORAGE_KEYS = {
  PROFILE: '@pc_profile_v1',
  PRAYERS: '@pc_prayers_v1',
  GROUPS: '@pc_groups_v1',
  CHECKINS: '@pc_checkins_v1',
  FEED: '@pc_feed_v1',
  ONBOARDED: '@pc_onboarded_v1',
  WELLNESS: '@pc_wellness_v1',
  JOURNAL: '@pw_journal_v1',
  USER_PLANS: '@pw_user_plans_v1',
  ACCOUNTS_DB: '@pw_accounts_db_v1',
  SHARED_GROUPS: '@pw_shared_groups_v1',
  PENDING_INVITE: '@pw_pending_invite_v1',
};

const DEFAULT_PROFILE_ID = 'local-user-profile-id';

const initialProfile: Profile = {
  id: DEFAULT_PROFILE_ID,
  full_name: '',
  email: null,
  is_guest: true,
  avatar_url: null,
  prayer_streak: 0,
  longest_streak: 0,
  last_prayed_at: null,
  grace_days_used: 0,
  reminder_time: '06:00',
  notify_group: true,
  notify_gentle_miss: true,
  created_at: new Date().toISOString(),
};

async function getAccountsDb(): Promise<Record<string, StoredAccountRecord>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNTS_DB);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveAccountsDb(db: Record<string, StoredAccountRecord>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNTS_DB, JSON.stringify(db));
  } catch (e) {
    console.warn('Failed to save accounts db:', e);
  }
}

async function getSharedGroupsDb(): Promise<Record<string, PrayerGroup>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SHARED_GROUPS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveSharedGroupsDb(db: Record<string, PrayerGroup>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SHARED_GROUPS, JSON.stringify(db));
  } catch (e) {
    console.warn('Failed to save shared groups db:', e);
  }
}

const PrayerContext = createContext<PrayerContextValue | undefined>(undefined);

export const PrayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [groups, setGroups] = useState<PrayerGroup[]>([]);
  const [checkins, setCheckins] = useState<PrayerCheckin[]>([]);
  const [feedItems, setFeedItems] = useState<GroupFeedItem[]>([]);
  const [wellnessSessions, setWellnessSessions] = useState<WellnessSession[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [userPlans, setUserPlans] = useState<UserPrayerPlan[]>([]);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [focusIndex, setFocusIndex] = useState<number>(0);
  const [pendingInvite, setPendingInviteState] = useState<PendingInviteInfo | null>(null);

  const setPendingInvite = useCallback(async (invite: PendingInviteInfo | null) => {
    setPendingInviteState(invite);
    if (invite) {
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_INVITE, JSON.stringify(invite));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_INVITE);
    }
  }, []);

  // Listen to incoming deep links with invite codes (e.g. prayercircle://join?code=XXXX)
  useEffect(() => {
    const handleIncomingUrl = (url: string | null) => {
      if (!url) return;
      try {
        const parsed = Linking.parse(url);
        const codeParam = parsed.queryParams?.code || parsed.queryParams?.inviteCode;
        const nameParam = parsed.queryParams?.name || parsed.queryParams?.groupName;
        const leaderParam = parsed.queryParams?.leader;
        if (codeParam && typeof codeParam === 'string') {
          setPendingInvite({
            code: codeParam.trim().toUpperCase(),
            groupName: typeof nameParam === 'string' ? nameParam : undefined,
            leaderName: typeof leaderParam === 'string' ? leaderParam : undefined,
          });
        }
      } catch (e) {
        console.warn('Error parsing deep link URL:', e);
      }
    };

    Linking.getInitialURL().then(handleIncomingUrl).catch(() => {});
    const sub = Linking.addEventListener('url', (event) => handleIncomingUrl(event.url));
    return () => sub.remove();
  }, [setPendingInvite]);

  // Load from local storage on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [
          savedProfile,
          savedPrayers,
          savedGroups,
          savedCheckins,
          savedFeed,
          savedOnboarded,
          savedWellness,
          savedJournal,
          savedUserPlans,
          savedPendingInvite,
          sharedGroupsMap,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.PROFILE),
          AsyncStorage.getItem(STORAGE_KEYS.PRAYERS),
          AsyncStorage.getItem(STORAGE_KEYS.GROUPS),
          AsyncStorage.getItem(STORAGE_KEYS.CHECKINS),
          AsyncStorage.getItem(STORAGE_KEYS.FEED),
          AsyncStorage.getItem(STORAGE_KEYS.ONBOARDED),
          AsyncStorage.getItem(STORAGE_KEYS.WELLNESS),
          AsyncStorage.getItem(STORAGE_KEYS.JOURNAL),
          AsyncStorage.getItem(STORAGE_KEYS.USER_PLANS),
          AsyncStorage.getItem(STORAGE_KEYS.PENDING_INVITE),
          getSharedGroupsDb(),
        ]);

        if (savedPendingInvite) {
          setPendingInviteState(JSON.parse(savedPendingInvite));
        }

        let loadedProfile = initialProfile;
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          if (parsed.full_name === 'David' && parsed.prayer_streak === 4) {
            loadedProfile = initialProfile;
            await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(initialProfile));
          } else {
            loadedProfile = {
              ...parsed,
              is_guest: parsed.is_guest !== undefined ? parsed.is_guest : !parsed.email,
            };
            setProfile(loadedProfile);
          }
        } else {
          setProfile(initialProfile);
          await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(initialProfile));
        }

        if (savedPrayers) {
          const parsed: Prayer[] = JSON.parse(savedPrayers);
          const cleaned = parsed.filter((p) => !p.id.startsWith('sample-'));
          setPrayers(cleaned);
          if (cleaned.length !== parsed.length) {
            await AsyncStorage.setItem(STORAGE_KEYS.PRAYERS, JSON.stringify(cleaned));
          }
        } else {
          setPrayers([]);
          await AsyncStorage.setItem(STORAGE_KEYS.PRAYERS, JSON.stringify([]));
        }

        if (savedGroups) {
          const parsed: PrayerGroup[] = JSON.parse(savedGroups);
          const cleaned = parsed
            .filter((g) => !g.id.startsWith('sample-'))
            .map((g) => {
              // Merge latest members list from sharedGroupsMap if available
              const shared = sharedGroupsMap[g.invite_code] || sharedGroupsMap[g.id];
              return shared ? { ...g, ...shared, members: shared.members || g.members } : g;
            });
          setGroups(cleaned);
          await AsyncStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(cleaned));
        } else {
          setGroups([]);
          await AsyncStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify([]));
        }

        if (savedCheckins) {
          const parsed: PrayerCheckin[] = JSON.parse(savedCheckins);
          const cleaned = parsed.filter((c) => !c.prayer_id?.startsWith('sample-'));
          setCheckins(cleaned);
          if (cleaned.length !== parsed.length) {
            await AsyncStorage.setItem(STORAGE_KEYS.CHECKINS, JSON.stringify(cleaned));
          }
        } else {
          setCheckins([]);
          await AsyncStorage.setItem(STORAGE_KEYS.CHECKINS, JSON.stringify([]));
        }

        if (savedFeed) {
          const parsed: GroupFeedItem[] = JSON.parse(savedFeed);
          const cleaned = parsed.filter((f) => !f.group_id.startsWith('sample-'));
          setFeedItems(cleaned);
          if (cleaned.length !== parsed.length) {
            await AsyncStorage.setItem(STORAGE_KEYS.FEED, JSON.stringify(cleaned));
          }
        } else {
          setFeedItems([]);
          await AsyncStorage.setItem(STORAGE_KEYS.FEED, JSON.stringify([]));
        }

        if (savedWellness) {
          const parsed: WellnessSession[] = JSON.parse(savedWellness);
          const cleaned = parsed.filter((w) => !w.id.startsWith('ws-sample-'));
          setWellnessSessions(cleaned);
          if (cleaned.length !== parsed.length) {
            await AsyncStorage.setItem(STORAGE_KEYS.WELLNESS, JSON.stringify(cleaned));
          }
        } else {
          setWellnessSessions([]);
          await AsyncStorage.setItem(STORAGE_KEYS.WELLNESS, JSON.stringify([]));
        }

        if (savedJournal) {
          const parsed: JournalEntry[] = JSON.parse(savedJournal);
          const cleaned = parsed.filter((j) => !j.id.startsWith('j-sample-'));
          setJournalEntries(cleaned);
          if (cleaned.length !== parsed.length) {
            await AsyncStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(cleaned));
          }
        } else {
          setJournalEntries([]);
          await AsyncStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify([]));
        }

        if (savedUserPlans) {
          const parsed: UserPrayerPlan[] = JSON.parse(savedUserPlans);
          const cleaned = parsed.filter((u) => !u.id.startsWith('up-sample-'));
          setUserPlans(cleaned);
          if (cleaned.length !== parsed.length) {
            await AsyncStorage.setItem(STORAGE_KEYS.USER_PLANS, JSON.stringify(cleaned));
          }
        } else {
          setUserPlans([]);
          await AsyncStorage.setItem(STORAGE_KEYS.USER_PLANS, JSON.stringify([]));
        }

        if (savedOnboarded !== null) {
          setIsOnboarded(JSON.parse(savedOnboarded));
        } else {
          setIsOnboarded(false); // First-time user will see onboarding
        }
      } catch (e) {
        console.error('Failed to load local prayer data:', e);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Automatically sync current registered user's data snapshot to ACCOUNTS_DB whenever state updates
  useEffect(() => {
    if (isLoading) return;
    const normEmail = profile.email?.trim().toLowerCase();
    if (!normEmail || profile.is_guest) return;

    let isCancelled = false;
    (async () => {
      const db = await getAccountsDb();
      if (isCancelled) return;
      const existing = db[normEmail];
      db[normEmail] = {
        id: profile.id,
        email: normEmail,
        password: existing?.password || '',
        profile,
        prayers,
        groups,
        checkins,
        wellnessSessions,
        journalEntries,
        userPlans,
        updated_at: new Date().toISOString(),
      };
      await saveAccountsDb(db);
    })();

    return () => {
      isCancelled = true;
    };
  }, [
    isLoading,
    profile,
    prayers,
    groups,
    checkins,
    wellnessSessions,
    journalEntries,
    userPlans,
  ]);

  // Sync state helpers to AsyncStorage
  const saveProfile = useCallback(async (newProfile: Profile) => {
    setProfile(newProfile);
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(newProfile));

    // Also update current user's profile inside shared groups so fellow members see updated name/streak
    const sharedDb = await getSharedGroupsDb();
    let sharedChanged = false;
    for (const key of Object.keys(sharedDb)) {
      const grp = sharedDb[key];
      if (grp.members?.some((m) => m.user_id === newProfile.id)) {
        grp.members = grp.members.map((m) =>
          m.user_id === newProfile.id ? { ...m, profile: newProfile } : m
        );
        sharedChanged = true;
      }
    }
    if (sharedChanged) {
      await saveSharedGroupsDb(sharedDb);
    }
  }, []);

  const saveJournal = useCallback(async (newJournal: JournalEntry[]) => {
    setJournalEntries(newJournal);
    await AsyncStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(newJournal));
  }, []);

  const saveUserPlans = useCallback(async (newPlans: UserPrayerPlan[]) => {
    setUserPlans(newPlans);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PLANS, JSON.stringify(newPlans));
  }, []);

  const savePrayers = useCallback(async (newPrayers: Prayer[]) => {
    setPrayers(newPrayers);
    await AsyncStorage.setItem(STORAGE_KEYS.PRAYERS, JSON.stringify(newPrayers));
  }, []);

  const saveGroups = useCallback(async (newGroups: PrayerGroup[]) => {
    setGroups(newGroups);
    await AsyncStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(newGroups));

    // Persist to shared groups registry so other users/accounts can see members and join
    const sharedDb = await getSharedGroupsDb();
    for (const g of newGroups) {
      sharedDb[g.invite_code] = g;
    }
    await saveSharedGroupsDb(sharedDb);
  }, []);

  const saveCheckins = useCallback(async (newCheckins: PrayerCheckin[]) => {
    setCheckins(newCheckins);
    await AsyncStorage.setItem(STORAGE_KEYS.CHECKINS, JSON.stringify(newCheckins));
  }, []);

  const saveFeed = useCallback(async (newFeed: GroupFeedItem[]) => {
    setFeedItems(newFeed);
    await AsyncStorage.setItem(STORAGE_KEYS.FEED, JSON.stringify(newFeed));
  }, []);

  const saveWellnessSessions = useCallback(async (newSessions: WellnessSession[]) => {
    setWellnessSessions(newSessions);
    await AsyncStorage.setItem(STORAGE_KEYS.WELLNESS, JSON.stringify(newSessions));
  }, []);

  const isGuest = useMemo(() => {
    return Boolean(!profile.email || profile.is_guest);
  }, [profile.email, profile.is_guest]);

  // Today's active prayers
  const activePrayers = useMemo(() => {
    return prayers.filter((p) => p.status === 'active');
  }, [prayers]);

  // Today's Focus Prayer
  const todaysFocusPrayer = useMemo(() => {
    if (activePrayers.length === 0) return null;
    return activePrayers[focusIndex % activePrayers.length];
  }, [activePrayers, focusIndex]);

  const rotateFocusPrayer = useCallback(() => {
    if (activePrayers.length > 0) {
      setFocusIndex((prev) => (prev + 1) % activePrayers.length);
    }
  }, [activePrayers.length]);

  // Streak & Habit Calculations
  const checkinDateStrings = useMemo(() => {
    return checkins.map((c) => c.prayed_at.split('T')[0]);
  }, [checkins]);

  const last7Days = useMemo(() => {
    return getLast7Days(checkinDateStrings);
  }, [checkinDateStrings]);

  const contributionGrid = useMemo(() => {
    return getContributionGrid(checkinDateStrings, 35);
  }, [checkinDateStrings]);

  // CHECK IN ACTION: "I Prayed Today 🙏"
  const checkInPrayer = useCallback(
    async (prayerId?: string) => {
      // 1. Trigger Haptics
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      const effectivePrayerId = prayerId || todaysFocusPrayer?.id;
      const targetPrayer = prayers.find((p) => p.id === effectivePrayerId) || todaysFocusPrayer;

      // 2. Compute Streak using "Streak That Forgives"
      const result = calculateStreakOnCheckin({
        currentStreak: profile.prayer_streak,
        longestStreak: profile.longest_streak,
        lastPrayedAt: profile.last_prayed_at,
        graceDaysUsed: profile.grace_days_used,
        gracePeriodStart: profile.grace_period_start,
      });

      // 3. New Checkin Entry
      const newCheckin: PrayerCheckin = {
        id: 'chk-' + Date.now(),
        user_id: profile.id,
        prayer_id: targetPrayer ? targetPrayer.id : null,
        prayed_at: new Date().toISOString(),
      };
      const updatedCheckins = [newCheckin, ...checkins];
      await saveCheckins(updatedCheckins);

      // 4. Update Profile
      const updatedProfile: Profile = {
        ...profile,
        prayer_streak: result.newStreak,
        longest_streak: result.newLongestStreak,
        last_prayed_at: result.todayDateStr,
        grace_days_used: result.newGraceDaysUsed,
        grace_period_start: result.newGracePeriodStart,
      };
      await saveProfile(updatedProfile);

      // 5. If prayer belongs to a group, post a system message to the feed: "[User] prayed 🙏"
      if (targetPrayer && targetPrayer.group_id) {
        const feedEvent: GroupFeedItem = {
          id: 'fe-' + Date.now(),
          type: 'user_prayed',
          group_id: targetPrayer.group_id,
          user_id: profile.id,
          user_name: profile.full_name || 'A circle member',
          prayer_id: targetPrayer.id,
          prayer_title: targetPrayer.title,
          content: `${profile.full_name || 'Someone'} prayed for "${targetPrayer.title}" 🙏`,
          created_at: new Date().toISOString(),
        };
        await saveFeed([feedEvent, ...feedItems]);
      }

      // 6. Rotate focus to next prayer
      rotateFocusPrayer();

      // 7. Supabase sync if enabled
      if (isSupabaseConfigured) {
        supabase
          .from('prayer_checkins')
          .insert({
            user_id: profile.id,
            prayer_id: targetPrayer ? targetPrayer.id : null,
          })
          .then();
        supabase
          .from('profiles')
          .update({
            prayer_streak: result.newStreak,
            longest_streak: result.newLongestStreak,
            last_prayed_at: result.todayDateStr,
            grace_days_used: result.newGraceDaysUsed,
          })
          .eq('id', profile.id)
          .then();
      }

      return {
        newStreak: result.newStreak,
        isFirstToday: result.isFirstPrayerToday,
        usedGrace: result.usedGraceDay,
      };
    },
    [profile, checkins, prayers, feedItems, todaysFocusPrayer, saveCheckins, saveProfile, saveFeed, rotateFocusPrayer]
  );

  // Add Prayer
  const addPrayer = useCallback(
    async (input: {
      title: string;
      details?: string;
      category: PrayerCategory;
      privacy: PrayerPrivacy;
      groupId?: string | null;
    }) => {
      const now = new Date().toISOString();
      const newPrayer: Prayer = {
        id: 'p-' + Date.now(),
        user_id: profile.id,
        title: input.title.trim().slice(0, 100),
        details: input.details?.trim() || null,
        category: input.category,
        privacy: input.privacy,
        group_id: input.privacy === 'group' ? input.groupId : null,
        status: 'active',
        created_at: now,
        updated_at: now,
      };

      const nextPrayers = [newPrayer, ...prayers];
      await savePrayers(nextPrayers);

      // If group prayer, post to group feed
      if (newPrayer.privacy === 'group' && newPrayer.group_id) {
        const feedEntry: GroupFeedItem = {
          id: 'fe-share-' + Date.now(),
          type: 'prayer_shared',
          group_id: newPrayer.group_id,
          user_id: profile.id,
          user_name: profile.full_name || 'Circle Member',
          prayer_id: newPrayer.id,
          prayer_title: newPrayer.title,
          content: newPrayer.details || newPrayer.title,
          created_at: now,
          reactions: [],
        };
        await saveFeed([feedEntry, ...feedItems]);
      }

      if (isSupabaseConfigured) {
        supabase
          .from('prayers')
          .insert({
            user_id: profile.id,
            title: newPrayer.title,
            details: newPrayer.details,
            category: newPrayer.category,
            privacy: newPrayer.privacy,
            group_id: newPrayer.group_id,
            status: 'active',
          })
          .then();
      }

      return newPrayer;
    },
    [profile, prayers, feedItems, savePrayers, saveFeed]
  );

  // Mark prayer as answered
  const markAsAnswered = useCallback(
    async (prayerId: string, testimony: string, shareWithGroup = true) => {
      const now = new Date().toISOString();
      const prayer = prayers.find((p) => p.id === prayerId);
      if (!prayer) return;

      const updatedList = prayers.map((p) =>
        p.id === prayerId
          ? {
              ...p,
              status: 'answered' as const,
              testimony: testimony.trim(),
              answered_at: now,
              updated_at: now,
            }
          : p
      );
      await savePrayers(updatedList);

      // Post testimony to group feed if requested or already in group
      if (shareWithGroup && prayer.group_id) {
        const testimonyEvent: GroupFeedItem = {
          id: 'fe-ans-' + Date.now(),
          type: 'prayer_answered',
          group_id: prayer.group_id,
          user_id: profile.id,
          user_name: profile.full_name || 'Circle Member',
          prayer_id: prayer.id,
          prayer_title: prayer.title,
          content: testimony.trim(),
          created_at: now,
          reactions: [],
        };
        await saveFeed([testimonyEvent, ...feedItems]);
      }

      if (isSupabaseConfigured) {
        supabase
          .from('prayers')
          .update({
            status: 'answered',
            testimony: testimony.trim(),
            answered_at: now,
            updated_at: now,
          })
          .eq('id', prayerId)
          .then();
      }
    },
    [prayers, profile, feedItems, savePrayers, saveFeed]
  );

  // Directly record an answered prayer / praise report on the Answered tab
  const addAnsweredPrayer = useCallback(
    async (input: {
      title: string;
      testimony: string;
      category?: PrayerCategory;
      days_prayed?: number;
      answered_at?: string;
    }): Promise<Prayer> => {
      const now = input.answered_at || new Date().toISOString();
      const days = input.days_prayed || 7;
      const createdDate = new Date(Date.now() - days * 86400000).toISOString();

      const newAnswered: Prayer = {
        id: 'p-ans-' + Date.now(),
        user_id: profile.id,
        title: input.title.trim().slice(0, 100),
        details: 'Answered prayer recorded on Answered Wall.',
        category: input.category || 'Spiritual',
        privacy: 'private',
        status: 'answered',
        testimony: input.testimony.trim(),
        answered_at: now,
        created_at: createdDate,
        updated_at: now,
      };

      const updated = [newAnswered, ...prayers];
      await savePrayers(updated);

      if (isSupabaseConfigured) {
        supabase.from('prayers').insert(newAnswered).then();
      }

      return newAnswered;
    },
    [profile, prayers, savePrayers]
  );

  // Edit / update testimony on an answered prayer
  const updateTestimony = useCallback(
    async (prayerId: string, testimony: string) => {
      const now = new Date().toISOString();
      const updated = prayers.map((p) =>
        p.id === prayerId
          ? {
              ...p,
              testimony: testimony.trim(),
              updated_at: now,
            }
          : p
      );
      await savePrayers(updated);

      if (isSupabaseConfigured) {
        supabase
          .from('prayers')
          .update({ testimony: testimony.trim(), updated_at: now })
          .eq('id', prayerId)
          .then();
      }
    },
    [prayers, savePrayers]
  );

  const updatePrayer = useCallback(
    async (prayerId: string, title: string, details?: string, category?: PrayerCategory) => {
      const now = new Date().toISOString();
      const updatedList = prayers.map((p) =>
        p.id === prayerId
          ? {
              ...p,
              title: title.slice(0, 100),
              details: details !== undefined ? details : p.details,
              category: category || p.category,
              updated_at: now,
            }
          : p
      );
      await savePrayers(updatedList);

      if (isSupabaseConfigured) {
        supabase
          .from('prayers')
          .update({
            title: title.slice(0, 100),
            details: details,
            category: category,
            updated_at: now,
          })
          .eq('id', prayerId)
          .then();
      }
    },
    [prayers, savePrayers]
  );

  const deletePrayer = useCallback(
    async (prayerId: string) => {
      const updatedList = prayers.filter((p) => p.id !== prayerId);
      await savePrayers(updatedList);

      if (isSupabaseConfigured) {
        supabase.from('prayers').delete().eq('id', prayerId).then();
      }
    },
    [prayers, savePrayers]
  );

  // Journal & Meditation Handlers
  const addJournalEntry = useCallback(
    async (input: {
      title: string;
      content: string;
      scripture?: string;
      linked_prayer_id?: string | null;
      tags?: string[];
      steps_walked?: number | null;
    }): Promise<JournalEntry> => {
      const now = new Date().toISOString();
      const linkedPrayer = input.linked_prayer_id
        ? prayers.find((p) => p.id === input.linked_prayer_id)
        : null;

      const newEntry: JournalEntry = {
        id: 'j-' + Date.now(),
        user_id: profile.id,
        linked_prayer_id: input.linked_prayer_id || null,
        linked_prayer_title: linkedPrayer?.title || null,
        title: input.title.trim(),
        scripture: input.scripture?.trim() || null,
        content: input.content.trim(),
        tags: input.tags && input.tags.length > 0 ? input.tags : ['meditation'],
        steps_walked: input.steps_walked || null,
        created_at: now,
        updated_at: now,
      };

      const updated = [newEntry, ...journalEntries];
      await saveJournal(updated);

      if (isSupabaseConfigured) {
        supabase.from('journal_entries').insert(newEntry).then();
      }

      return newEntry;
    },
    [profile, prayers, journalEntries, saveJournal]
  );

  const updateJournalEntry = useCallback(
    async (
      id: string,
      input: {
        title?: string;
        content?: string;
        scripture?: string;
        tags?: string[];
        steps_walked?: number | null;
      }
    ) => {
      const now = new Date().toISOString();
      const updated = journalEntries.map((j) =>
        j.id === id
          ? {
              ...j,
              ...(input.title !== undefined ? { title: input.title.trim() } : {}),
              ...(input.content !== undefined ? { content: input.content.trim() } : {}),
              ...(input.scripture !== undefined ? { scripture: input.scripture.trim() } : {}),
              ...(input.tags !== undefined ? { tags: input.tags } : {}),
              ...(input.steps_walked !== undefined ? { steps_walked: input.steps_walked } : {}),
              updated_at: now,
            }
          : j
      );
      await saveJournal(updated);

      if (isSupabaseConfigured) {
        supabase
          .from('journal_entries')
          .update({ ...input, updated_at: now })
          .eq('id', id)
          .then();
      }
    },
    [journalEntries, saveJournal]
  );

  const deleteJournalEntry = useCallback(
    async (id: string) => {
      const updated = journalEntries.filter((j) => j.id !== id);
      await saveJournal(updated);

      if (isSupabaseConfigured) {
        supabase.from('journal_entries').delete().eq('id', id).then();
      }
    },
    [journalEntries, saveJournal]
  );

  // Prayer Plans Handlers
  const startPrayerPlan = useCallback(
    async (planId: string): Promise<UserPrayerPlan> => {
      const existing = userPlans.find((p) => p.plan_id === planId);
      if (existing) return existing;

      const newPlan: UserPrayerPlan = {
        id: 'up-' + Date.now(),
        user_id: profile.id,
        plan_id: planId,
        current_day: 1,
        completed_days: [],
        started_at: new Date().toISOString(),
        is_completed: false,
      };

      const updated = [newPlan, ...userPlans];
      await saveUserPlans(updated);

      if (isSupabaseConfigured) {
        supabase.from('user_prayer_plans').insert(newPlan).then();
      }

      return newPlan;
    },
    [profile, userPlans, saveUserPlans]
  );

  const completePlanDay = useCallback(
    async (planId: string, dayNumber: number) => {
      const plan = CURATED_PRAYER_PLANS.find((p) => p.id === planId);
      let userPlan = userPlans.find((p) => p.plan_id === planId);
      if (!plan) return;

      if (!userPlan) {
        userPlan = await startPrayerPlan(planId);
      }

      const completedDaysSet = new Set(userPlan.completed_days);
      completedDaysSet.add(dayNumber);
      const completedDays = Array.from(completedDaysSet).sort((a, b) => a - b);
      const isCompleted = completedDays.length >= plan.days_count;
      const nextDay = isCompleted
        ? plan.days_count
        : Math.min(plan.days_count, dayNumber + 1);

      const now = new Date().toISOString();
      const updated = userPlans.map((up) =>
        up.plan_id === planId
          ? {
              ...up,
              completed_days: completedDays,
              current_day: nextDay,
              last_completed_at: now,
              is_completed: isCompleted,
            }
          : up
      );

      await saveUserPlans(updated);

      // Check in habit streak as well
      await checkInPrayer();

      if (isSupabaseConfigured) {
        supabase
          .from('user_prayer_plans')
          .update({
            completed_days: completedDays,
            current_day: nextDay,
            last_completed_at: now,
            is_completed: isCompleted,
          })
          .eq('id', userPlan.id)
          .then();
      }
    },
    [userPlans, saveUserPlans, startPrayerPlan, checkInPrayer]
  );

  const activePlan = useMemo(() => {
    const activeUserPlan = userPlans.find((up) => !up.is_completed) || userPlans[0];
    if (!activeUserPlan) return null;
    const plan = CURATED_PRAYER_PLANS.find((p) => p.id === activeUserPlan.plan_id);
    if (!plan) return null;
    return { plan, userPlan: activeUserPlan };
  }, [userPlans]);

  // Create Group (Requires registered non-guest user)
  const createGroup = useCallback(
    async (name: string, description?: string) => {
      if (!profile.email || profile.is_guest) {
        throw new Error('Guest users cannot create a prayer group. Please create an account first.');
      }

      const code = generateInviteCode();
      const groupId = 'g-' + Date.now();
      const now = new Date().toISOString();
      const newGroup: PrayerGroup = {
        id: groupId,
        name: name.trim(),
        description: description?.trim() || null,
        owner_id: profile.id,
        invite_code: code,
        created_at: now,
        members_count: 1,
        members: [
          {
            id: 'gm-' + Date.now(),
            group_id: groupId,
            user_id: profile.id,
            joined_at: now,
            profile: profile,
          },
        ],
      };

      const updated = [newGroup, ...groups];
      await saveGroups(updated);

      if (isSupabaseConfigured) {
        supabase
          .from('prayer_groups')
          .insert({
            name: newGroup.name,
            description: newGroup.description,
            owner_id: profile.id,
            invite_code: code,
          })
          .then();
      }

      return newGroup;
    },
    [profile, groups, saveGroups]
  );

  // Join Group with Max 15 validation & full member profile syncing
  const joinGroup = useCallback(
    async (
      inviteCode: string,
      groupNameHint?: string,
      leaderNameHint?: string
    ): Promise<{ success: boolean; group?: PrayerGroup; error?: string }> => {
      const code = inviteCode.trim().toUpperCase();
      if (!code) {
        return { success: false, error: 'Please enter a valid invite code.' };
      }

      const sharedDb = await getSharedGroupsDb();
      const existing = groups.find((g) => g.invite_code === code) || sharedDb[code];

      if (existing) {
        const currentMembers = existing.members || [];
        const isMember = currentMembers.some((m) => m.user_id === profile.id);
        if (isMember) {
          // Make sure it's in the current user's groups list if it was only in sharedDb
          if (!groups.some((g) => g.id === existing.id)) {
            await saveGroups([existing, ...groups]);
          }
          return { success: true, group: existing };
        }
        if (currentMembers.length >= 15) {
          return {
            success: false,
            error: 'This prayer circle has reached its maximum capacity of 15 members.',
          };
        }

        const newMember: GroupMember = {
          id: 'gm-' + Date.now(),
          group_id: existing.id,
          user_id: profile.id,
          joined_at: new Date().toISOString(),
          profile,
        };

        const updatedMembers = [...currentMembers, newMember];
        const updatedGroup: PrayerGroup = {
          ...existing,
          members_count: updatedMembers.length,
          members: updatedMembers,
        };

        const nextUserGroups = groups.some((g) => g.id === existing.id)
          ? groups.map((g) => (g.id === existing.id ? updatedGroup : g))
          : [updatedGroup, ...groups];

        await saveGroups(nextUserGroups);

        // Also update the group inside other members' stored accounts in ACCOUNTS_DB
        const accountsDb = await getAccountsDb();
        let accountsChanged = false;
        for (const accKey of Object.keys(accountsDb)) {
          const acc = accountsDb[accKey];
          if (acc.groups?.some((g) => g.invite_code === code || g.id === existing.id)) {
            acc.groups = acc.groups.map((g) =>
              g.invite_code === code || g.id === existing.id ? updatedGroup : g
            );
            accountsChanged = true;
          }
        }
        if (accountsChanged) {
          await saveAccountsDb(accountsDb);
        }

        return { success: true, group: updatedGroup };
      }

      // If joining a group created on another device (via invite link or code)
      const now = new Date().toISOString();
      const newGroupId = 'g-' + code;
      const leaderId = 'leader-' + code;
      const leaderProfile: Profile = {
        id: leaderId,
        full_name: leaderNameHint?.trim() || 'Circle Leader',
        prayer_streak: 3,
        longest_streak: 7,
        last_prayed_at: now.slice(0, 10),
        grace_days_used: 0,
        reminder_time: '06:00',
        notify_group: true,
        notify_gentle_miss: true,
        prayer_focus: 'Deepening Faith & Peace',
        created_at: now,
      };

      const initialMembers: GroupMember[] = [
        {
          id: 'gm-leader-' + code,
          group_id: newGroupId,
          user_id: leaderId,
          joined_at: now,
          profile: leaderProfile,
        },
        {
          id: 'gm-' + Date.now(),
          group_id: newGroupId,
          user_id: profile.id,
          joined_at: now,
          profile,
        },
      ];

      const joinedGroup: PrayerGroup = {
        id: newGroupId,
        name:
          groupNameHint?.trim() ||
          (code === 'FAITH777' ? 'Faith & Friends Circle' : `Prayer Circle #${code}`),
        description: 'A shared haven of faith and mutual encouragement.',
        owner_id: leaderId,
        invite_code: code,
        created_at: now,
        members_count: initialMembers.length,
        members: initialMembers,
      };

      await saveGroups([joinedGroup, ...groups]);
      return { success: true, group: joinedGroup };
    },
    [groups, profile, saveGroups]
  );

  // Reactions: Only 3 buttons (prayed, love, amen)
  const addReaction = useCallback(
    async (prayerId: string, type: ReactionType) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }

      // Add to feed item reaction if present
      const updatedFeed = feedItems.map((item) => {
        if (item.prayer_id === prayerId || item.id === prayerId) {
          const reactions = item.reactions || [];
          const existing = reactions.find((r) => r.user_id === profile.id && r.type === type);
          if (existing) {
            // Remove reaction
            return {
              ...item,
              reactions: reactions.filter((r) => r.id !== existing.id),
            };
          } else {
            // Add reaction
            const newRx: PrayerReaction = {
              id: 'rx-' + Date.now(),
              prayer_id: prayerId,
              user_id: profile.id,
              type,
              created_at: new Date().toISOString(),
            };
            return {
              ...item,
              reactions: [...reactions, newRx],
            };
          }
        }
        return item;
      });

      await saveFeed(updatedFeed);
    },
    [feedItems, profile.id, saveFeed]
  );

  // Progress update for a prayer
  const addPrayerUpdate = useCallback(
    async (prayerId: string, content: string) => {
      const prayer = prayers.find((p) => p.id === prayerId);
      if (!prayer) return;

      const updateItem: PrayerUpdate = {
        id: 'pu-' + Date.now(),
        prayer_id: prayerId,
        user_id: profile.id,
        content: content.trim(),
        created_at: new Date().toISOString(),
      };

      const updatedPrayers = prayers.map((p) =>
        p.id === prayerId
          ? {
              ...p,
              updates: [updateItem, ...(p.updates || [])],
            }
          : p
      );
      await savePrayers(updatedPrayers);

      if (prayer.group_id) {
        const feedEntry: GroupFeedItem = {
          id: 'fe-up-' + Date.now(),
          type: 'prayer_update',
          group_id: prayer.group_id,
          user_id: profile.id,
          user_name: profile.full_name,
          prayer_id: prayer.id,
          prayer_title: prayer.title,
          content: content.trim(),
          created_at: new Date().toISOString(),
        };
        await saveFeed([feedEntry, ...feedItems]);
      }
    },
    [prayers, profile, feedItems, savePrayers, saveFeed]
  );

  // Send encouragement to an inactive member (Accountability feature)
  const sendEncouragement = useCallback(
    async (groupId: string, memberId: string, memberName: string) => {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      const encItem: GroupFeedItem = {
        id: 'fe-enc-' + Date.now(),
        type: 'user_prayed',
        group_id: groupId,
        user_id: profile.id,
        user_name: profile.full_name,
        content: `💛 ${profile.full_name} sent a gentle encouragement to ${memberName}`,
        created_at: new Date().toISOString(),
      };

      await saveFeed([encItem, ...feedItems]);

      sendLocalNotification(
        'Encouragement Sent ✨',
        `A gentle message was sent to ${memberName} to let them know they are in your prayers.`
      );
    },
    [profile, feedItems, saveFeed]
  );

  // Profile Updates
  const updateProfileName = useCallback(
    async (name: string) => {
      const updated = { ...profile, full_name: name.trim() };
      await saveProfile(updated);
    },
    [profile, saveProfile]
  );

  const updateReminderTime = useCallback(
    async (time: string) => {
      const updated = { ...profile, reminder_time: time };
      await saveProfile(updated);
      scheduleDailyPrayerReminder(time);
    },
    [profile, saveProfile]
  );

  const toggleNotificationSetting = useCallback(
    async (key: 'notify_group' | 'notify_gentle_miss') => {
      const updated = { ...profile, [key]: !profile[key] };
      await saveProfile(updated);
    },
    [profile, saveProfile]
  );

  // Onboarding completion
  const completeOnboarding = useCallback(
    async (
      params: CompleteOnboardingParams | string,
      firstPrayerTitleArg?: string,
      inviteSentArg?: boolean
    ) => {
      let name = 'Friend in Faith';
      let firstPrayerTitle = firstPrayerTitleArg;
      let preferredTime = '06:00';
      let prayerFocus = 'Spiritual';
      let email: string | undefined;
      let password: string | undefined;
      let guestFlag = true;

      if (typeof params === 'object') {
        name = params.name.trim() || 'Friend in Faith';
        firstPrayerTitle = params.firstPrayerTitle;
        preferredTime = params.preferredTime || '06:00';
        prayerFocus = params.prayerFocus || 'Spiritual';
        email = params.email?.trim().toLowerCase();
        password = params.password;
        guestFlag = params.isGuest !== undefined ? params.isGuest : !email;
      } else {
        name = (params as string).trim() || 'Friend in Faith';
      }

      const finalEmail = email || profile.email?.trim().toLowerCase() || null;
      const finalIsGuest = finalEmail ? false : guestFlag;

      const prof: Profile = {
        ...profile,
        id:
          profile.id === DEFAULT_PROFILE_ID && finalEmail
            ? 'usr-' + Date.now()
            : profile.id,
        full_name: name,
        email: finalEmail,
        is_guest: finalIsGuest,
        prayer_focus: prayerFocus,
        reminder_time: preferredTime,
      };
      await saveProfile(prof);

      let updatedPrayers = prayers;
      if (firstPrayerTitle && firstPrayerTitle.trim()) {
        const alreadyHasFirst = prayers.some(
          (p) => p.title.toLowerCase() === firstPrayerTitle!.trim().toLowerCase()
        );
        if (!alreadyHasFirst) {
          const firstPrayer: Prayer = {
            id: 'p-first-' + Date.now(),
            user_id: prof.id,
            title: firstPrayerTitle.trim(),
            details: 'My first prayer in Prayer Walk.',
            category: 'Spiritual',
            privacy: 'private',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          updatedPrayers = [firstPrayer, ...prayers];
          await savePrayers(updatedPrayers);
        }
      }

      // Persist to ACCOUNTS_DB if registered account
      if (finalEmail && !finalIsGuest) {
        const db = await getAccountsDb();
        const existing = db[finalEmail];
        db[finalEmail] = {
          id: prof.id,
          email: finalEmail,
          password: password || existing?.password || '',
          profile: prof,
          prayers: updatedPrayers,
          groups,
          checkins,
          wellnessSessions,
          journalEntries,
          userPlans,
          updated_at: new Date().toISOString(),
        };
        await saveAccountsDb(db);
      }

      setIsOnboarded(true);
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDED, JSON.stringify(true));
      scheduleDailyPrayerReminder(preferredTime);
    },
    [
      profile,
      prayers,
      groups,
      checkins,
      wellnessSessions,
      journalEntries,
      userPlans,
      saveProfile,
      savePrayers,
    ]
  );

  // Email Auth Handlers
  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      fullName: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const normEmail = email.trim().toLowerCase();
        if (!normEmail || !password.trim()) {
          return { success: false, error: 'Email and password are required.' };
        }
        if (!normEmail.includes('@')) {
          return { success: false, error: 'Please enter a valid email address.' };
        }

        // Check local accounts registry first to prevent duplicate account creation
        const db = await getAccountsDb();
        if (db[normEmail]) {
          return {
            success: false,
            error: 'An account with this email already exists. Please Sign In instead.',
          };
        }

        let userId =
          profile.id && profile.id !== DEFAULT_PROFILE_ID
            ? profile.id
            : 'usr-' + Date.now();

        if (isSupabaseConfigured) {
          const { data, error } = await supabase.auth.signUp({
            email: normEmail,
            password: password.trim(),
            options: {
              data: { full_name: fullName.trim() },
            },
          });

          if (error) {
            return { success: false, error: error.message };
          }
          if (data.user) {
            userId = data.user.id;
          }
        }

        const updatedProf: Profile = {
          ...profile,
          id: userId,
          email: normEmail,
          is_guest: false,
          full_name: fullName.trim() || profile.full_name || 'Pilgrim',
        };
        await saveProfile(updatedProf);

        // Save new account to persistent registry
        db[normEmail] = {
          id: userId,
          email: normEmail,
          password: password.trim(),
          profile: updatedProf,
          prayers,
          groups,
          checkins,
          wellnessSessions,
          journalEntries,
          userPlans,
          updated_at: new Date().toISOString(),
        };
        await saveAccountsDb(db);

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Signup failed' };
      }
    },
    [
      profile,
      prayers,
      groups,
      checkins,
      wellnessSessions,
      journalEntries,
      userPlans,
      saveProfile,
    ]
  );

  const signInWithEmail = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const normEmail = email.trim().toLowerCase();
        if (!normEmail || !password.trim()) {
          return { success: false, error: 'Email and password are required.' };
        }

        const db = await getAccountsDb();
        const localAccount = db[normEmail];

        if (localAccount) {
          if (localAccount.password && localAccount.password !== password.trim()) {
            return {
              success: false,
              error: 'Incorrect password for this account. Please try again.',
            };
          }

          // Merge latest shared group members into account's groups
          const sharedGroupsMap = await getSharedGroupsDb();
          const restoredGroups = (localAccount.groups || []).map((g) => {
            const shared = sharedGroupsMap[g.invite_code] || sharedGroupsMap[g.id];
            return shared ? { ...g, ...shared, members: shared.members || g.members } : g;
          });

          const restoredProfile: Profile = {
            ...localAccount.profile,
            email: normEmail,
            is_guest: false,
          };

          await saveProfile(restoredProfile);
          await savePrayers(localAccount.prayers || []);
          await saveGroups(restoredGroups);
          await saveCheckins(localAccount.checkins || []);
          await saveWellnessSessions(localAccount.wellnessSessions || []);
          await saveJournal(localAccount.journalEntries || []);
          await saveUserPlans(localAccount.userPlans || []);

          setIsOnboarded(true);
          await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDED, JSON.stringify(true));

          return { success: true };
        }

        if (isSupabaseConfigured) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: normEmail,
            password: password.trim(),
          });

          if (error) {
            return { success: false, error: error.message };
          }

          if (data.user) {
            const updatedProf: Profile = {
              ...profile,
              id: data.user.id,
              email: normEmail,
              is_guest: false,
              full_name:
                data.user.user_metadata?.full_name || profile.full_name || 'Pilgrim',
            };
            await saveProfile(updatedProf);
            setIsOnboarded(true);
            await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDED, JSON.stringify(true));
            return { success: true };
          }
        }

        return {
          success: false,
          error: 'No account found with this email. Please create an account first.',
        };
      } catch (err: any) {
        return { success: false, error: err.message || 'Login failed' };
      }
    },
    [
      profile,
      saveProfile,
      savePrayers,
      saveGroups,
      saveCheckins,
      saveWellnessSessions,
      saveJournal,
      saveUserPlans,
    ]
  );

  const signInWithOAuth = useCallback(
    async (
      provider: 'apple' | 'google',
      fullName?: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        if (isSupabaseConfigured) {
          const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
              redirectTo:
                Platform.OS === 'web' && typeof window !== 'undefined'
                  ? window.location.origin
                  : 'prayerwalk://',
            },
          });
          if (error) {
            return { success: false, error: error.message };
          }
        }

        const cleanName =
          fullName?.trim() || (provider === 'apple' ? 'Apple Pilgrim' : 'Google Pilgrim');
        const fallbackEmail =
          provider === 'apple'
            ? `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'}@privaterelay.appleid.com`
            : `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'}@gmail.com`;

        const updatedProf: Profile = {
          ...profile,
          email: profile.email || fallbackEmail,
          is_guest: false,
          full_name: cleanName,
        };
        await saveProfile(updatedProf);

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || `${provider} sign-in failed` };
      }
    },
    [profile, saveProfile]
  );

  // V2 Prayer Walk & Wellness Session Handler
  const addWellnessSession = useCallback(
    async (input: {
      linked_prayer_id?: string | null;
      linked_prayer_title?: string;
      type?: WellnessSessionType;
      steps: number | null;
      duration_seconds: number;
      logAsPrayerCheckin?: boolean;
    }) => {
      const now = new Date().toISOString();
      const newSession: WellnessSession = {
        id: 'ws-' + Date.now(),
        user_id: profile.id,
        linked_prayer_id: input.linked_prayer_id || null,
        linked_prayer_title: input.linked_prayer_title || 'Just walk and pray',
        type: input.type || 'prayer_walk',
        steps: input.steps,
        duration_seconds: input.duration_seconds,
        created_at: now,
      };

      const updated = [newSession, ...wellnessSessions];
      await saveWellnessSessions(updated);

      if (input.logAsPrayerCheckin) {
        await checkInPrayer(input.linked_prayer_id || undefined);
      }

      if (isSupabaseConfigured) {
        supabase
          .from('wellness_sessions')
          .insert({
            user_id: profile.id,
            linked_prayer_id: input.linked_prayer_id || null,
            type: newSession.type,
            steps: input.steps,
            duration_seconds: input.duration_seconds,
          })
          .then();
      }

      return newSession;
    },
    [profile.id, wellnessSessions, saveWellnessSessions, checkInPrayer]
  );

  const totalPrayerWalks = useMemo(() => {
    return wellnessSessions.filter((w) => w.type === 'prayer_walk').length;
  }, [wellnessSessions]);

  const totalStepsWalked = useMemo(() => {
    return wellnessSessions.reduce((acc, w) => acc + (w.steps || 0), 0);
  }, [wellnessSessions]);

  // Computed YouVersion-Style Activity Feed
  const userActivities = useMemo((): UserActivity[] => {
    const list: UserActivity[] = [];

    // Wellness / Prayer walks
    for (const ws of wellnessSessions) {
      const mins = Math.max(1, Math.round(ws.duration_seconds / 60));
      const stepsText = ws.steps !== null ? `${ws.steps.toLocaleString()} steps` : `${mins} min`;
      list.push({
        id: 'act-ws-' + ws.id,
        type: 'prayer_walk',
        title: 'Prayer Walk Completed',
        description: `Walked ${stepsText} praying for "${ws.linked_prayer_title || 'prayer focus'}"`,
        created_at: ws.created_at,
        icon: 'footsteps',
        color: '#2E7D32',
        metadata: {
          steps: ws.steps,
          duration_seconds: ws.duration_seconds,
          prayer_title: ws.linked_prayer_title,
        },
      });
    }

    // Answered prayers
    for (const p of prayers.filter((pr) => pr.status === 'answered' && pr.answered_at)) {
      list.push({
        id: 'act-ans-' + p.id,
        type: 'prayer_answered',
        title: 'Prayer Answered ✨',
        description: `"${p.title}": ${p.testimony || 'Praise God for His faithfulness!'}`,
        created_at: p.answered_at!,
        icon: 'trophy',
        color: '#F59E0B',
        metadata: { prayer_id: p.id, prayer_title: p.title, testimony: p.testimony || undefined },
      });
    }

    // Journal entries
    for (const j of journalEntries) {
      list.push({
        id: 'act-j-' + j.id,
        type: 'journal_entry',
        title: 'Meditation Note Written',
        description: `"${j.title}" — ${j.scripture || j.content.slice(0, 60) + '...'}`,
        created_at: j.created_at,
        icon: 'book',
        color: '#3B82F6',
        metadata: { scripture: j.scripture || undefined },
      });
    }

    // Checkins
    for (const chk of checkins.slice(0, 10)) {
      list.push({
        id: 'act-chk-' + chk.id,
        type: 'prayer_checkin',
        title: 'Daily Prayer Completed 🙏',
        description: 'Faithfully kept the daily quiet-time habit.',
        created_at: chk.prayed_at,
        icon: 'sparkles',
        color: '#10B981',
      });
    }

    // Sort descending by timestamp
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }, [wellnessSessions, prayers, journalEntries, checkins]);

  // Computed YouVersion-Style Milestones / Badges
  const milestones = useMemo((): MilestoneBadge[] => {
    const answeredCount = prayers.filter((p) => p.status === 'answered').length;
    const completedPlansCount = userPlans.filter((p) => p.is_completed).length;

    return [
      {
        id: 'badge-first-steps',
        title: 'First Steps',
        description: 'Complete your first prayer walk with God.',
        icon: 'footsteps',
        is_unlocked: totalPrayerWalks >= 1,
        progress: Math.min(1, totalPrayerWalks),
        target: 1,
        unit: 'walk',
      },
      {
        id: 'badge-streak-7',
        title: '7-Day Habit',
        description: 'Pray and walk consistently for 7 days in a row.',
        icon: 'flame',
        is_unlocked: profile.prayer_streak >= 7 || profile.longest_streak >= 7,
        progress: Math.min(7, Math.max(profile.prayer_streak, profile.longest_streak)),
        target: 7,
        unit: 'days',
      },
      {
        id: 'badge-steps-10k',
        title: '10,000 Steps of Faith',
        description: 'Accumulate 10,000 total steps dedicated to prayer.',
        icon: 'trophy',
        is_unlocked: totalStepsWalked >= 10000,
        progress: Math.min(10000, totalStepsWalked),
        target: 10000,
        unit: 'steps',
      },
      {
        id: 'badge-reward-wall',
        title: 'Reward Wall Pioneer',
        description: 'Record your first answered prayer and testimony.',
        icon: 'sparkles',
        is_unlocked: answeredCount >= 1,
        progress: Math.min(1, answeredCount),
        target: 1,
        unit: 'testimony',
      },
      {
        id: 'badge-journaler',
        title: 'Contemplative Soul',
        description: 'Write 3 meditation notes in your spiritual journal.',
        icon: 'book',
        is_unlocked: journalEntries.length >= 3,
        progress: Math.min(3, journalEntries.length),
        target: 3,
        unit: 'notes',
      },
      {
        id: 'badge-streak-30',
        title: 'Month of Faith',
        description: 'Maintain a 30-day streak of active walking prayer.',
        icon: 'medal',
        is_unlocked: profile.prayer_streak >= 30 || profile.longest_streak >= 30,
        progress: Math.min(30, Math.max(profile.prayer_streak, profile.longest_streak)),
        target: 30,
        unit: 'days',
      },
      {
        id: 'badge-plan-finisher',
        title: 'Plan Finisher',
        description: 'Complete all days of a multi-day walking prayer plan.',
        icon: 'ribbon',
        is_unlocked: completedPlansCount >= 1,
        progress: Math.min(1, completedPlansCount),
        target: 1,
        unit: 'plan',
      },
    ];
  }, [totalPrayerWalks, totalStepsWalked, profile, prayers, journalEntries, userPlans]);

  const logout = useCallback(async () => {
    // Save current registered user's snapshot before clearing active session
    const normEmail = profile.email?.trim().toLowerCase();
    if (normEmail && !profile.is_guest) {
      const db = await getAccountsDb();
      const existing = db[normEmail];
      db[normEmail] = {
        id: profile.id,
        email: normEmail,
        password: existing?.password || '',
        profile,
        prayers,
        groups,
        checkins,
        wellnessSessions,
        journalEntries,
        userPlans,
        updated_at: new Date().toISOString(),
      };
      await saveAccountsDb(db);
    }

    // Clear ONLY active session keys — preserve ACCOUNTS_DB, SHARED_GROUPS, and FEED
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.PROFILE,
      STORAGE_KEYS.PRAYERS,
      STORAGE_KEYS.GROUPS,
      STORAGE_KEYS.CHECKINS,
      STORAGE_KEYS.WELLNESS,
      STORAGE_KEYS.JOURNAL,
      STORAGE_KEYS.USER_PLANS,
      STORAGE_KEYS.ONBOARDED,
    ]);

    setProfile(initialProfile);
    setPrayers([]);
    setGroups([]);
    setCheckins([]);
    setWellnessSessions([]);
    setJournalEntries([]);
    setUserPlans([]);
    setIsOnboarded(false);
  }, [
    profile,
    prayers,
    groups,
    checkins,
    wellnessSessions,
    journalEntries,
    userPlans,
  ]);

  return (
    <PrayerContext.Provider
      value={{
        profile,
        prayers,
        groups,
        checkins,
        feedItems,
        isOnboarded,
        isLoading,
        isOnlineConfigured: isSupabaseConfigured,
        currentUserId: profile.id,
        isGuest,
        pendingInvite,
        setPendingInvite,

        last7Days,
        contributionGrid,
        todaysFocusPrayer,
        rotateFocusPrayer,
        checkInPrayer,

        addPrayer,
        markAsAnswered,
        addAnsweredPrayer,
        updateTestimony,
        updatePrayer,
        deletePrayer,

        // Journal & Meditation
        journalEntries,
        addJournalEntry,
        updateJournalEntry,
        deleteJournalEntry,

        // Prayer Plans
        prayerPlans: CURATED_PRAYER_PLANS,
        userPlans,
        activePlan,
        startPrayerPlan,
        completePlanDay,

        createGroup,
        joinGroup,
        addReaction,
        addPrayerUpdate,
        sendEncouragement,

        updateProfileName,
        updateReminderTime,
        toggleNotificationSetting,
        completeOnboarding,
        logout,

        // YouVersion Style & Auth
        userActivities,
        milestones,
        signUpWithEmail,
        signInWithEmail,
        signInWithOAuth,

        // V2 Prayer Walk
        wellnessSessions,
        totalPrayerWalks,
        totalStepsWalked,
        addWellnessSession,
      }}>
      {children}
    </PrayerContext.Provider>
  );
};

export const usePrayer = (): PrayerContextValue => {
  const context = useContext(PrayerContext);
  if (!context) {
    throw new Error('usePrayer must be used within a PrayerProvider');
  }
  return context;
};
