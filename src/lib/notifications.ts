import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Schedule daily 6:00 AM reminder:
 * "Your circle is praying — tap to keep your streak 🙏"
 */
export async function scheduleDailyPrayerReminder(timeStr = '06:00'): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const [hoursStr, minutesStr] = timeStr.split(':');
    const hour = parseInt(hoursStr || '6', 10);
    const minute = parseInt(minutesStr || '0', 10);

    // Cancel existing reminder with matching identifier
    await Notifications.cancelScheduledNotificationAsync('daily-prayer-reminder').catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: 'daily-prayer-reminder',
      content: {
        title: 'Prayer Circle 🙏',
        body: 'Your circle is praying — tap to keep your streak',
        data: { screen: 'today' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch (e) {
    console.warn('Could not schedule daily reminder:', e);
  }
}

/**
 * Schedule gentle miss reminder if user hasn't checked in by evening:
 * "Your prayer for [Today's Focus] is waiting 🙏"
 */
export async function scheduleGentleMissReminder(prayerTitle = 'Today’s Focus'): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.cancelScheduledNotificationAsync('gentle-miss-reminder').catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: 'gentle-miss-reminder',
      content: {
        title: 'A gentle reminder 🙏',
        body: `Your prayer for "${prayerTitle}" is waiting`,
        data: { screen: 'today' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 20, // 8:00 PM
        minute: 0,
      },
    });
  } catch (e) {
    console.warn('Could not schedule gentle miss reminder:', e);
  }
}

/**
 * Schedule Sunday 6:00 PM weekly recap
 */
export async function scheduleWeeklyRecapReminder(stats: {
  daysPrayed: number;
  circlePrayers: number;
  answeredCount: number;
}): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.cancelScheduledNotificationAsync('weekly-recap').catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: 'weekly-recap',
      content: {
        title: 'Weekly Prayer Reflection ✨',
        body: `You prayed ${stats.daysPrayed} days, your circle prayed ${stats.circlePrayers} times, ${stats.answeredCount} answered`,
        data: { screen: 'profile' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // Sunday
        hour: 18,
        minute: 0,
      },
    });
  } catch (e) {
    console.warn('Could not schedule weekly recap:', e);
  }
}

/**
 * Send an immediate local notification (e.g., when a friend prays or answers prayer)
 */
export async function sendLocalNotification(title: string, body: string, data?: Record<string, any>) {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null, // immediate
    });
  } catch (e) {
    console.warn('Failed to send notification:', e);
  }
}
