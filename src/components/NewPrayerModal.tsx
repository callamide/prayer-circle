import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { PrayerCategory, PrayerPrivacy, PrayerGroup } from '@/types/database';

interface NewPrayerModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    details?: string;
    category: PrayerCategory;
    privacy: PrayerPrivacy;
    groupId?: string | null;
  }) => void;
  groups: PrayerGroup[];
}

const CATEGORIES: PrayerCategory[] = ['Family', 'Health', 'Work', 'Spiritual', 'Other'];

export const NewPrayerModal: React.FC<NewPrayerModalProps> = ({
  visible,
  onClose,
  onSubmit,
  groups,
}) => {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [category, setCategory] = useState<PrayerCategory>('Family');
  const [privacy, setPrivacy] = useState<PrayerPrivacy>('private');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    groups.length > 0 ? groups[0].id : null
  );
  const [error, setError] = useState('');

  const reset = () => {
    setTitle('');
    setDetails('');
    setCategory('Family');
    setPrivacy('private');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      setError('Please enter a prayer title.');
      return;
    }
    if (title.trim().length > 100) {
      setError('Title must be 100 characters or less.');
      return;
    }

    onSubmit({
      title: title.trim(),
      details: details.trim() || undefined,
      category,
      privacy,
      groupId: privacy === 'group' ? selectedGroupId : null,
    });

    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>New Prayer</Text>
          <TouchableOpacity onPress={handleSubmit} style={styles.saveBtn}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 }]}
          keyboardShouldPersistTaps="handled">
          {/* Title Input with Char Counter */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Prayer Title *</Text>
              <Text style={styles.charCount}>{title.length}/100</Text>
            </View>
            <TextInput
              style={styles.titleInput}
              placeholder="e.g. Healing for Mum, Wisdom at work..."
              placeholderTextColor={Colors.textTertiary}
              maxLength={100}
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                if (error) setError('');
              }}
              autoFocus
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          {/* Details / Heart behind it */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Details (optional)</Text>
            <TextInput
              style={styles.detailsInput}
              placeholder="Add thoughts, scriptures, or background to remember..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={3}
              value={details}
              onChangeText={setDetails}
            />
          </View>

          {/* Category Chips */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.chipsRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.chip,
                    category === cat && styles.chipActive,
                  ]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.chipText,
                      category === cat && styles.chipTextActive,
                    ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Privacy Toggle: Private (Default) vs Circle */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Privacy (Private by default)</Text>
            <View style={styles.privacySelector}>
              <TouchableOpacity
                style={[
                  styles.privacyOption,
                  privacy === 'private' && styles.privacyOptionActive,
                ]}
                onPress={() => setPrivacy('private')}>
                <Text style={styles.privacyOptionEmoji}>🔒</Text>
                <View>
                  <Text
                    style={[
                      styles.privacyOptionTitle,
                      privacy === 'private' && styles.privacyOptionTitleActive,
                    ]}>
                    Private
                  </Text>
                  <Text style={styles.privacyOptionSub}>Only you can see this</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.privacyOption,
                  privacy === 'group' && styles.privacyOptionActive,
                ]}
                onPress={() => setPrivacy('group')}>
                <Text style={styles.privacyOptionEmoji}>👥</Text>
                <View>
                  <Text
                    style={[
                      styles.privacyOptionTitle,
                      privacy === 'group' && styles.privacyOptionTitleActive,
                    ]}>
                    Prayer Circle
                  </Text>
                  <Text style={styles.privacyOptionSub}>Shared with group members</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Group Selector if Privacy is group */}
          {privacy === 'group' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Choose Prayer Circle</Text>
              {groups.length === 0 ? (
                <View style={styles.noGroupBanner}>
                  <Text style={styles.noGroupText}>
                    You haven’t created or joined any circles yet. Create one in the Groups tab!
                  </Text>
                </View>
              ) : (
                <View style={styles.groupList}>
                  {groups.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      style={[
                        styles.groupItem,
                        selectedGroupId === g.id && styles.groupItemActive,
                      ]}
                      onPress={() => setSelectedGroupId(g.id)}>
                      <Text
                        style={[
                          styles.groupItemName,
                          selectedGroupId === g.id && styles.groupItemNameActive,
                        ]}>
                        {g.name}
                      </Text>
                      {selectedGroupId === g.id && (
                        <Text style={styles.groupItemCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Big Add Prayer Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            activeOpacity={0.85}>
            <Text style={styles.submitBtnText}>Add to Today’s Prayers</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  closeText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  inputGroup: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  titleInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.md,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 6,
  },
  detailsInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.md,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  privacySelector: {
    gap: 10,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceVariant,
  },
  privacyOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  privacyOptionEmoji: {
    fontSize: 20,
  },
  privacyOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  privacyOptionTitleActive: {
    color: Colors.primary,
  },
  privacyOptionSub: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  groupList: {
    gap: 8,
  },
  groupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceVariant,
  },
  groupItemActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  groupItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  groupItemNameActive: {
    color: Colors.primary,
  },
  groupItemCheck: {
    color: Colors.primary,
    fontWeight: '700',
  },
  noGroupBanner: {
    padding: 12,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.md,
  },
  noGroupText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: 54,
    borderRadius: BorderRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
