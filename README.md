# Prayer Circle 🙏

> **"Small prayers. Real faith. Together."**

A full-stack, mobile-first faith habit application designed with the simplicity, calm, and clarity of the StepUp pedometer app. No social media clutter, no vanity metrics — just quiet daily faithfulness, an encouraging forgiveness habit loop, and intimate prayer circles of up to 15 trusted friends or family members.

---

## 🌿 Design Inspiration & Principles

- **StepUp Simplicity**: Pure white background (`#FFFFFF`), subtle soft green tint (`#2E7D32`), large rounded cards (`16px`), and generous spacing.
- **Calm Over Clutter**: No likes, no follower counts. Only simple, heartfelt reactions: `🙏 Prayed`, `❤️ Love`, `✨ Amen`.
- **Focus Over Overwhelm**: A single **"Today's Focus"** prayer card with a prominent, tactile **"🙏 I Prayed Today"** button.

---

## 📱 Core Features

### 1. 🔥 The Streak That Forgives (Habit Logic)
- **Daily Check-In**: Tapping *"I Prayed Today"* logs your prayer and advances the focus to your next active prayer.
- **Double-Tap Protection**: If you already checked in today, your prayer is logged without double-incrementing your streak.
- **1-Day Gap (Yesterday)**: Streak increments by +1 (`streak = streak + 1`).
- **2-Day Gap (Grace Day)**: If 2 days have passed and you have not used your 1 grace day this week, the grace day is consumed and your streak continues unharmed!
- **Extended Inactivity**: If more than 2 days have elapsed (or grace is exhausted), the streak resets gracefully to 1.
- **7-Day Rhythm Dots**: Visual status circles indicating each day's consistency (Mon–Sun).
- **35-Day Consistency Grid**: GitHub-style green contribution grid in your profile.

### 2. 🎯 Today Screen (Habit Focus)
- Top: Flame streak counter (`🔥 4 days`) + 7-day calendar rhythm dots.
- Center: **Today's Focus** card showing:
  - Title & details
  - Category badge (`Family`, `Health`, `Work`, `Spiritual`, `Other`)
  - Days praying counter (`Day 10 of praying`)
  - Privacy indicator (`🔒 Private` vs `👥 Circle`)
- Primary Action: Large **"🙏 I Prayed Today"** button with haptic feedback, celebratory confetti, and automatic rotation to your next focus prayer.
- Collapsible Prayer List: *"Pray for another"* expands your full active prayer list with quick prayer actions and filter chips (`All` | `Private` | `Circle`).
- Add Prayer Modal: Add prayers up to 100 characters with category selector and private-by-default toggle.

### 3. 👥 Circles Screen (Max 15 Members)
- Create or join private prayer circles.
- **15-Member Limit**: Enforced both in client validation and via PostgreSQL trigger constraints.
- **Chronological Feed**:
  - Member prayers shared to the circle
  - Progress updates
  - Answered testimonies
  - Real-time system notifications: *"Mum Grace prayed 🙏"*
- **3 Reaction Buttons**: `🙏 Prayed`, `❤️ Love`, `✨ Amen` (no distracting comment threads).
- **Gentle Accountability**: Detects when a circle member hasn't prayed in 2 days and prompts the owner with an encouragement card: *"Encourage Sarah? She hasn't prayed in 2 days"* -> 1-tap encouragement nudge.
- **Deep Link Invites**: Generates `prayercircle://join?code=INVITE_CODE` deep links via Expo Linking, shared seamlessly via WhatsApp or native share sheet.

### 4. 🏆 Answered Screen (The Reward Wall)
- Celebratory confetti on opening.
- Cards showing prayer title, days prayed before the answer was received, and testimony notes.
- Quick action to share testimony with friends or your circle.

### 5. 👤 Profile & Notification Settings
- Profile avatar, name editing, and statistics:
  - Current Streak 🔥
  - Longest Streak 🏆
  - Total Prayers 🙏
  - Answered Prayers ✨
- Consistency Grid (5-week activity heatmap).
- Daily Prayer Reminder presets (default: **6:00 AM**).
- Circle activity notification toggle.
- Gentle miss notification toggle (**8:00 PM** evening reminder if today's focus is waiting).
- Supabase connection status badge.

### 6. 🚀 60-Second Onboarding (No Initial Login Wall)
1. Welcome & vision
2. Name input
3. First prayer setup with suggestions (*"Family health & peace"*)
4. Optional WhatsApp circle invite & launch directly into prayer!

---

## 🛠 Tech Stack

- **Framework**: React Native + [Expo SDK 57](https://expo.dev)
- **Router**: Expo Router (`src/app`)
- **Backend / DB**: [Supabase](https://supabase.com) (PostgreSQL, Auth, RLS, Realtime replication)
- **Push & Local Notifications**: `expo-notifications`
- **Deep Linking**: `expo-linking`
- **Storage**: `@react-native-async-storage/async-storage` (instant offline & guest functionality, seamlessly syncing with Supabase)
- **Haptics**: `expo-haptics`
- **Icons**: `@expo/vector-icons` (`Ionicons`)
- **Dates**: `date-fns`

---

## 🗄️ Database Schema & RLS

The database migration is located at [`supabase/migrations/20240101000000_init_prayer_circle.sql`](file:///c:/Users/chenz/Desktop/prayer%20cicle/supabase/migrations/20240101000000_init_prayer_circle.sql) and [`supabase/schema.sql`](file:///c:/Users/chenz/Desktop/prayer%20cicle/supabase/schema.sql).

### Tables:
1. `profiles`: `id`, `full_name`, `avatar_url`, `prayer_streak`, `longest_streak`, `last_prayed_at`, `grace_days_used`, `reminder_time`, `notify_group`, `notify_gentle_miss`.
2. `prayer_groups`: `id`, `name`, `description`, `owner_id`, `invite_code`, `created_at`.
3. `group_members`: `id`, `group_id`, `user_id`, `joined_at` (`UNIQUE(group_id, user_id)`). Max 15 trigger-enforced.
4. `prayers`: `id`, `user_id`, `group_id`, `title` (max 100), `details`, `category`, `privacy`, `status`, `testimony`, `answered_at`.
5. `prayer_checkins`: `id`, `user_id`, `prayer_id`, `prayed_at`.
6. `prayer_reactions`: `id`, `prayer_id`, `user_id`, `type` (`prayed` | `love` | `amen`).
7. `prayer_updates`: `id`, `prayer_id`, `user_id`, `content`, `created_at`.

### RLS Policies:
- **Private prayers**: Only readable and editable by `auth.uid()`.
- **Circle prayers**: Readable by members belonging to the same `group_id`.
- **Reactions & Updates**: Restricted to authenticated members of the circle.
- **Realtime**: Subscriptions enabled on `prayers`, `prayer_updates`, and `prayer_reactions`.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or bun

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Add your Supabase credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```
*(Note: If you run without Supabase credentials, the app seamlessly runs in high-speed local offline mode with full state persistence!)*

### 4. Setup Database in Supabase
1. Go to your Supabase project dashboard.
2. Open the **SQL Editor**.
3. Copy and run the contents of [`supabase/schema.sql`](file:///c:/Users/chenz/Desktop/prayer%20cicle/supabase/schema.sql).

### 5. Run the Application
```bash
npm start
```
- Press `w` to open in your web browser.
- Press `a` to run on an Android emulator or scan the QR code with Expo Go on your physical Android device.
- Press `i` to run on an iOS simulator or scan with Expo Go on iPhone.

### 6. Verification Commands
```bash
npx expo lint       # Lint verification (0 errors)
npx tsc --noEmit    # TypeScript type check (0 errors)
```

---

## 🕊️ License
MIT License.
