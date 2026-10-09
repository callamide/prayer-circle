// Verification test for Streak That Forgives & Habit Logic
const assert = require('assert');

function calculateStreakOnCheckin(input, now = new Date()) {
  const format = (d) => d.toISOString().split('T')[0];
  const todayStr = format(now);

  let graceDaysUsed = input.graceDaysUsed || 0;

  // First time
  if (!input.lastPrayedAt || input.currentStreak <= 0) {
    return { newStreak: 1, isFirstPrayerToday: true, usedGraceDay: false, streakReset: false, newGraceDaysUsed: graceDaysUsed };
  }

  const lastDate = new Date(input.lastPrayedAt + 'T00:00:00Z');
  const nowDate = new Date(todayStr + 'T00:00:00Z');
  const diffDays = Math.round((nowDate - lastDate) / (1000 * 60 * 60 * 24));

  // 1. If today: no increment (prevent double tap)
  if (diffDays <= 0) {
    return { newStreak: input.currentStreak, isFirstPrayerToday: false, usedGraceDay: false, streakReset: false, newGraceDaysUsed: graceDaysUsed };
  }

  // 2. If yesterday: streak + 1
  if (diffDays === 1) {
    return { newStreak: input.currentStreak + 1, isFirstPrayerToday: true, usedGraceDay: false, streakReset: false, newGraceDaysUsed: graceDaysUsed };
  }

  // 3. If 2 days ago and grace available:
  if (diffDays === 2 && graceDaysUsed < 1) {
    return { newStreak: input.currentStreak + 1, isFirstPrayerToday: true, usedGraceDay: true, streakReset: false, newGraceDaysUsed: graceDaysUsed + 1 };
  }

  // 4. >2 days gap or grace used up: reset to 1
  return { newStreak: 1, isFirstPrayerToday: true, usedGraceDay: false, streakReset: true, newGraceDaysUsed: 0 };
}

console.log('Running Habit & Streak Logic Tests...');

const today = new Date('2026-10-09T10:00:00Z');

// Test 1: First time ever
const t1 = calculateStreakOnCheckin({ currentStreak: 0, longestStreak: 0, lastPrayedAt: null, graceDaysUsed: 0 }, today);
assert.strictEqual(t1.newStreak, 1, 'First time streak should be 1');
assert.strictEqual(t1.isFirstPrayerToday, true);

// Test 2: Double tap today
const t2 = calculateStreakOnCheckin({ currentStreak: 1, longestStreak: 1, lastPrayedAt: '2026-10-09', graceDaysUsed: 0 }, today);
assert.strictEqual(t2.newStreak, 1, 'Double tap today should not increment');
assert.strictEqual(t2.isFirstPrayerToday, false);

// Test 3: Prayed yesterday
const t3 = calculateStreakOnCheckin({ currentStreak: 4, longestStreak: 4, lastPrayedAt: '2026-10-08', graceDaysUsed: 0 }, today);
assert.strictEqual(t3.newStreak, 5, 'Yesterday should increment streak 4 -> 5');
assert.strictEqual(t3.usedGraceDay, false);

// Test 4: Prayed 2 days ago with grace day available
const t4 = calculateStreakOnCheckin({ currentStreak: 5, longestStreak: 5, lastPrayedAt: '2026-10-07', graceDaysUsed: 0 }, today);
assert.strictEqual(t4.newStreak, 6, '2 days ago with grace should continue streak 5 -> 6');
assert.strictEqual(t4.usedGraceDay, true);
assert.strictEqual(t4.newGraceDaysUsed, 1);

// Test 5: Prayed 2 days ago with grace day already consumed
const t5 = calculateStreakOnCheckin({ currentStreak: 6, longestStreak: 6, lastPrayedAt: '2026-10-07', graceDaysUsed: 1 }, today);
assert.strictEqual(t5.newStreak, 1, '2 days ago without grace should reset to 1');
assert.strictEqual(t5.streakReset, true);

// Test 6: Gap > 2 days
const t6 = calculateStreakOnCheckin({ currentStreak: 10, longestStreak: 10, lastPrayedAt: '2026-10-05', graceDaysUsed: 0 }, today);
assert.strictEqual(t6.newStreak, 1, '>2 days gap should reset to 1');
assert.strictEqual(t6.streakReset, true);

console.log('✅ All 6 Habit & Streak unit tests passed successfully!');
