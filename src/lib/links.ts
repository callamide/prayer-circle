import * as Linking from 'expo-linking';
import { Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

/**
 * Official download page URL where new users can download the Prayer Walk app
 */
export const APP_DOWNLOAD_URL =
  'https://expo.dev/accounts/koladeorimolade/projects/prayer-circle';

/**
 * Creates a universal deep link for group invites
 */
export function createGroupInviteLink(
  inviteCode: string,
  groupName?: string,
  leaderName?: string
): string {
  const queryParams: Record<string, string> = { code: inviteCode };
  if (groupName) queryParams.name = groupName;
  if (leaderName) queryParams.leader = leaderName;

  // Linking.createURL handles both Expo Go (exp://...) and standalone builds (prayercircle://)
  return Linking.createURL('join', {
    queryParams,
  });
}

/**
 * Creates an HTTPS download & redirect link for users who do not yet have the app installed
 */
export function createDownloadInviteLink(
  inviteCode: string,
  groupName?: string,
  leaderName?: string
): string {
  const params = new URLSearchParams({ code: inviteCode });
  if (groupName) params.set('name', groupName);
  if (leaderName) params.set('leader', leaderName);
  return `${APP_DOWNLOAD_URL}?${params.toString()}`;
}

/**
 * Shares group invite via WhatsApp / Native Share sheet
 */
export async function shareGroupInvite(
  groupName: string,
  inviteCode: string,
  leaderName?: string
): Promise<void> {
  const deepLink = createGroupInviteLink(inviteCode, groupName, leaderName);
  const downloadLink = createDownloadInviteLink(inviteCode, groupName, leaderName);
  const message =
    `Join my prayer circle '${groupName}' on Prayer Walk 🙏\n\n` +
    `📲 Download the app & join:\n${downloadLink}\n\n` +
    `🔗 Already have Prayer Walk? Tap to open:\n${deepLink}\n\n` +
    `Invite Code: ${inviteCode}`;

  try {
    if (Platform.OS === 'web') {
      if (navigator.share) {
        await navigator.share({
          title: `Join ${groupName} on Prayer Walk`,
          text: message,
          url: downloadLink,
        });
      } else {
        await Clipboard.setStringAsync(message);
        alert('Invite link copied to clipboard!');
      }
    } else {
      await Share.share({
        message,
        title: `Join my prayer circle '${groupName}'`,
        url: downloadLink,
      });
    }
  } catch (error) {
    console.warn('Error sharing group invite:', error);
  }
}

/**
 * Generates an 8-character uppercase alphanumeric invite code
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous characters like 0/O, 1/I
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
