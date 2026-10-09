export type PrayerCategory = 'Family' | 'Health' | 'Work' | 'Spiritual' | 'Other';
export type PrayerPrivacy = 'private' | 'group';
export type PrayerStatus = 'active' | 'answered' | 'archived';
export type ReactionType = 'prayed' | 'love' | 'amen';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  prayer_streak: number;
  longest_streak: number;
  last_prayed_at: string | null; // 'YYYY-MM-DD'
  grace_days_used: number;
  grace_period_start?: string | null;
  reminder_time: string; // '06:00'
  notify_group: boolean;
  notify_gentle_miss: boolean;
  created_at: string;
}

export interface PrayerGroup {
  id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  invite_code: string; // 8 characters
  created_at: string;
  members_count?: number;
  members?: GroupMember[];
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  profile?: Profile;
}

export interface Prayer {
  id: string;
  user_id: string;
  group_id?: string | null;
  title: string;
  details?: string | null;
  category: PrayerCategory;
  privacy: PrayerPrivacy;
  status: PrayerStatus;
  testimony?: string | null;
  answered_at?: string | null;
  created_at: string;
  updated_at: string;
  user_profile?: Profile;
  group?: PrayerGroup;
  reactions?: PrayerReaction[];
  updates?: PrayerUpdate[];
}

export interface PrayerCheckin {
  id: string;
  user_id: string;
  prayer_id?: string | null;
  prayed_at: string;
}

export interface PrayerReaction {
  id: string;
  prayer_id: string;
  user_id: string;
  type: ReactionType;
  created_at: string;
  user_profile?: Profile;
}

export interface PrayerUpdate {
  id: string;
  prayer_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_profile?: Profile;
}

export type FeedItemType = 'prayer_shared' | 'prayer_update' | 'prayer_answered' | 'user_prayed';

export interface GroupFeedItem {
  id: string;
  type: FeedItemType;
  group_id: string;
  user_id: string;
  user_name: string;
  avatar_url?: string | null;
  prayer_id?: string;
  prayer_title?: string;
  content?: string;
  created_at: string;
  reactions?: PrayerReaction[];
}

export type WellnessSessionType = 'prayer_walk' | 'breath_prayer';

export interface WellnessSession {
  id: string;
  user_id: string;
  linked_prayer_id?: string | null;
  linked_prayer_title?: string;
  type: WellnessSessionType;
  steps: number | null;
  duration_seconds: number;
  created_at: string;
}
