import {
  differenceInCalendarDays,
  format,
  subDays,
  parseISO,
  startOfWeek,
  isToday,
} from 'date-fns';

export interface StreakCalculationInput {
  currentStreak: number;
  longestStreak: number;
  lastPrayedAt: string | null; // 'YYYY-MM-DD'
  graceDaysUsed: number;
  gracePeriodStart?: string | null;
}

export interface StreakCalculationResult {
  newStreak: number;
  newLongestStreak: number;
  newGraceDaysUsed: number;
  newGracePeriodStart: string;
  todayDateStr: string;
  isFirstPrayerToday: boolean;
  usedGraceDay: boolean;
  streakReset: boolean;
}

/**
 * Returns today's date formatted as YYYY-MM-DD in local time
 */
export function getTodayDateStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Evaluates the "Streak That Forgives" rule:
 * - If already prayed today: no streak increment (prevent double tap)
 * - If prayed yesterday: streak + 1
 * - If prayed 2 days ago and grace_days_used < 1 this week: use grace day, streak continues (+1), grace_days_used++
 * - If > 2 days gap or grace used up: reset streak to 1
 * - If first prayer ever (streak = 0 or lastPrayedAt = null): streak = 1
 */
export function calculateStreakOnCheckin(
  input: StreakCalculationInput,
  now = new Date()
): StreakCalculationResult {
  const todayStr = format(now, 'yyyy-MM-dd');
  const weekStartStr = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Check if grace period needs weekly reset
  let graceDaysUsed = input.graceDaysUsed || 0;
  if (!input.gracePeriodStart || input.gracePeriodStart !== weekStartStr) {
    graceDaysUsed = 0;
  }

  // First time ever praying
  if (!input.lastPrayedAt || input.currentStreak <= 0) {
    const newStreak = 1;
    return {
      newStreak,
      newLongestStreak: Math.max(input.longestStreak || 0, newStreak),
      newGraceDaysUsed: graceDaysUsed,
      newGracePeriodStart: weekStartStr,
      todayDateStr: todayStr,
      isFirstPrayerToday: true,
      usedGraceDay: false,
      streakReset: false,
    };
  }

  const lastDate = parseISO(input.lastPrayedAt);
  const diff = differenceInCalendarDays(now, lastDate);

  // 1. If prayed today: don't increment streak (prevent double tap)
  if (diff <= 0) {
    return {
      newStreak: input.currentStreak,
      newLongestStreak: Math.max(input.longestStreak || 0, input.currentStreak),
      newGraceDaysUsed: graceDaysUsed,
      newGracePeriodStart: weekStartStr,
      todayDateStr: todayStr,
      isFirstPrayerToday: false,
      usedGraceDay: false,
      streakReset: false,
    };
  }

  // 2. If prayed yesterday: streak continues!
  if (diff === 1) {
    const newStreak = input.currentStreak + 1;
    return {
      newStreak,
      newLongestStreak: Math.max(input.longestStreak || 0, newStreak),
      newGraceDaysUsed: graceDaysUsed,
      newGracePeriodStart: weekStartStr,
      todayDateStr: todayStr,
      isFirstPrayerToday: true,
      usedGraceDay: false,
      streakReset: false,
    };
  }

  // 3. If prayed 2 days ago and grace day is available this week:
  if (diff === 2 && graceDaysUsed < 1) {
    const newStreak = input.currentStreak + 1;
    return {
      newStreak,
      newLongestStreak: Math.max(input.longestStreak || 0, newStreak),
      newGraceDaysUsed: graceDaysUsed + 1,
      newGracePeriodStart: weekStartStr,
      todayDateStr: todayStr,
      isFirstPrayerToday: true,
      usedGraceDay: true,
      streakReset: false,
    };
  }

  // 4. If > 2 days gap or grace used up: reset to 1
  return {
    newStreak: 1,
    newLongestStreak: Math.max(input.longestStreak || 0, 1),
    newGraceDaysUsed: 0,
    newGracePeriodStart: weekStartStr,
    todayDateStr: todayStr,
    isFirstPrayerToday: true,
    usedGraceDay: false,
    streakReset: true,
  };
}

export interface DayDot {
  date: Date;
  dateStr: string;
  dayLabel: string; // 'M', 'T', 'W' etc.
  isToday: boolean;
  hasPrayed: boolean;
  isGraceDay?: boolean;
}

/**
 * Returns the last 7 calendar days with prayed status
 */
export function getLast7Days(
  checkinDates: Set<string> | string[],
  now = new Date()
): DayDot[] {
  const set = checkinDates instanceof Set ? checkinDates : new Set(checkinDates);
  const dots: DayDot[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = subDays(now, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    dots.push({
      date: d,
      dateStr,
      dayLabel: format(d, 'EEEEE'), // Single letter: M, T, W, T, F, S, S
      isToday: isToday(d),
      hasPrayed: set.has(dateStr),
    });
  }

  return dots;
}

export interface ContributionCell {
  dateStr: string;
  count: number;
  level: 0 | 1 | 2; // 0: none, 1: 1 prayer, 2: 2+ prayers
  isToday: boolean;
}

/**
 * Returns a 35-day (7 columns x 5 rows) or past 35 days grid for GitHub-style calendar
 */
export function getContributionGrid(
  checkinDates: string[],
  days = 35,
  now = new Date()
): ContributionCell[] {
  const countMap = new Map<string, number>();
  for (const date of checkinDates) {
    countMap.set(date, (countMap.get(date) || 0) + 1);
  }

  const cells: ContributionCell[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(now, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const count = countMap.get(dateStr) || 0;
    const level: 0 | 1 | 2 = count === 0 ? 0 : count === 1 ? 1 : 2;

    cells.push({
      dateStr,
      count,
      level,
      isToday: isToday(d),
    });
  }

  return cells;
}
