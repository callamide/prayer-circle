import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Lets the user pick a profile photo from their gallery, crops it square,
 * shrinks it to 256px and returns a compact base64 data URI.
 *
 * Storing a small data URI (≈15–25 KB) keeps the photo working offline,
 * survives cache clears, and can later be uploaded to Supabase Storage.
 * Returns `null` if the user cancels or permission is denied.
 */
export async function pickProfilePhoto(): Promise<string | null> {
  try {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission Needed',
          'Please allow photo access in your phone settings to choose a profile picture.'
        );
        return null;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) return null;

    const asset = result.assets[0];
    const context = ImageManipulator.manipulate(asset.uri);
    context.resize({ width: 256, height: 256 });
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({
      base64: true,
      compress: 0.7,
      format: SaveFormat.JPEG,
    });

    if (saved.base64) {
      return `data:image/jpeg;base64,${saved.base64}`;
    }
    return saved.uri || asset.uri;
  } catch (e) {
    console.warn('Profile photo selection failed:', e);
    Alert.alert('Photo Error', 'We could not load that photo. Please try another one.');
    return null;
  }
}
