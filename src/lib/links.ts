import * as Linking from 'expo-linking';
import { Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

/**
 * Creates a universal deep link for group invites
 */
export function createGroupInviteLink(inviteCode: string): string {
  // Linking.createURL handles both Expo Go (exp://...) and standalone builds (prayercircle://)
  return Linking.createURL('join', {
    queryParams: { code: inviteCode },
  });
}

/**
 * Shares group invite via WhatsApp / Native Share sheet
 */
export async function shareGroupInvite(groupName: string, inviteCode: string): Promise<void> {
  const link = createGroupInviteLink(inviteCode);
  const message = `Join my prayer circle '${groupName}' 🙏\n${link}\n\nInvite Code: ${inviteCode}`;

  try {
    if (Platform.OS === 'web') {
      if (navigator.share) {
        await navigator.share({
          title: `Join ${groupName}`,
          text: message,
          url: link,
        });
      } else {
        await Clipboard.setStringAsync(message);
        alert('Invite link copied to clipboard!');
      }
    } else {
      await Share.share({
        message,
        title: `Join my prayer circle '${groupName}'`,
        url: link, // iOS supports url property
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
