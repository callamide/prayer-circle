import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { Prayer } from '@/types/database';

interface AnsweredModalProps {
  visible: boolean;
  prayer: Prayer | null;
  onClose: () => void;
  onSubmit: (prayerId: string, testimony: string, shareWithGroup: boolean) => void;
}

export const AnsweredModal: React.FC<AnsweredModalProps> = ({
  visible,
  prayer,
  onClose,
  onSubmit,
}) => {
  const [testimony, setTestimony] = useState('');
  const [shareWithGroup, setShareWithGroup] = useState(true);
  const [error, setError] = useState('');

  if (!prayer) return null;

  const handleSubmit = () => {
    if (!testimony.trim()) {
      setError('Please write a brief testimony of how God answered.');
      return;
    }
    setError('');
    const testText = testimony;
    setTestimony('');
    onSubmit(prayer.id, testText, shareWithGroup);
  };

  const handleCancel = () => {
    setTestimony('');
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>🎉</Text>
          </View>
          <Text style={styles.title}>Prayer Answered!</Text>
          <Text style={styles.prayerTitle}>&ldquo;{prayer.title}&rdquo;</Text>

          <Text style={styles.instruction}>
            How did God answer? Share your testimony:
          </Text>

          {/* Testimony input */}
          <TextInput
            style={styles.textInput}
            placeholder="Write what happened... God's faithfulness, unexpected peace, or breakthrough..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={4}
            value={testimony}
            onChangeText={(t) => {
              setTestimony(t);
              if (error) setError('');
            }}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Share with group switch */}
          {Boolean(prayer.group_id) && (
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Share testimony with circle</Text>
                <Text style={styles.switchSub}>Encourage other members in your group</Text>
              </View>
              <Switch
                value={shareWithGroup}
                onValueChange={setShareWithGroup}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancel}
              activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              activeOpacity={0.85}>
              <Text style={styles.submitBtnText}>Save Testimony ✨</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  dialog: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconEmoji: {
    fontSize: 26,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  prayerTitle: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  instruction: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  textInput: {
    width: '100%',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.md,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    minHeight: 90,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 8,
    marginVertical: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  switchInfo: {
    flex: 1,
    paddingRight: 12,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  switchSub: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: Spacing.md,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  submitBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: BorderRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
