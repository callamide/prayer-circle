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
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius, Spacing } from '@/constants/theme';
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
  const { colors, isDark } = useTheme();
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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}>
          {/* Top Header */}
          <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={[styles.closeText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>New Prayer</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}>
              <Text style={[styles.saveText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <View style={styles.contentWrap}>
              {/* Title Input with Char Counter */}
              <View style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: colors.text }]}>Prayer Title *</Text>
                  <Text style={[styles.charCount, { color: colors.textTertiary }]}>{title.length}/100</Text>
                </View>
                <TextInput
                  style={[
                    styles.titleInput,
                    {
                      backgroundColor: colors.surfaceVariant,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="e.g. Healing for Mum, Wisdom at work..."
                  placeholderTextColor={colors.textTertiary}
                  maxLength={100}
                  value={title}
                  onChangeText={(t) => {
                    setTitle(t);
                    if (error) setError('');
                  }}
                  autoFocus
                />
                {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}
              </View>

              {/* Details / Heart behind it */}
              <View style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.text }]}>Details (optional)</Text>
                <TextInput
                  style={[
                    styles.detailsInput,
                    {
                      backgroundColor: colors.surfaceVariant,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Add thoughts, scriptures, or background to remember..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  value={details}
                  onChangeText={setDetails}
                />
              </View>

              {/* Category Chips */}
              <View style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.text }]}>Category</Text>
                <View style={styles.chipsRow}>
                  {CATEGORIES.map((cat) => {
                    const isCatActive = category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isCatActive
                              ? (isDark ? '#3A2F2A' : '#FDF4E7')
                              : colors.surfaceVariant,
                            borderColor: isCatActive ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setCategory(cat)}
                        activeOpacity={0.7}>
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color: isCatActive ? colors.primary : colors.textSecondary,
                              fontWeight: isCatActive ? '700' : '500',
                            },
                          ]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Privacy Toggle: Private (Default) vs Circle */}
              <View style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.text }]}>Privacy (Private by default)</Text>
                <View style={styles.privacySelector}>
                  <TouchableOpacity
                    style={[
                      styles.privacyOption,
                      {
                        backgroundColor: privacy === 'private'
                          ? (isDark ? '#3A2F2A' : '#FDF4E7')
                          : colors.surfaceVariant,
                        borderColor: privacy === 'private' ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setPrivacy('private')}>
                    <Text style={styles.privacyOptionEmoji}>🔒</Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.privacyOptionTitle,
                          {
                            color: privacy === 'private' ? colors.primary : colors.text,
                          },
                        ]}>
                        Private
                      </Text>
                      <Text style={[styles.privacyOptionSub, { color: colors.textSecondary }]}>Only you can see this</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.privacyOption,
                      {
                        backgroundColor: privacy === 'group'
                          ? (isDark ? '#3A2F2A' : '#FDF4E7')
                          : colors.surfaceVariant,
                        borderColor: privacy === 'group' ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setPrivacy('group')}>
                    <Text style={styles.privacyOptionEmoji}>👥</Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.privacyOptionTitle,
                          {
                            color: privacy === 'group' ? colors.primary : colors.text,
                          },
                        ]}>
                        Prayer Circle
                      </Text>
                      <Text style={[styles.privacyOptionSub, { color: colors.textSecondary }]}>Shared with group members</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Group Selector if Privacy is group */}
              {privacy === 'group' && (
                <View style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.label, { color: colors.text }]}>Choose Prayer Circle</Text>
                  {groups.length === 0 ? (
                    <View style={[styles.noGroupBanner, { backgroundColor: colors.surfaceVariant }]}>
                      <Text style={[styles.noGroupText, { color: colors.textSecondary }]}>
                        You haven’t created or joined any circles yet. Create one in the Circle tab!
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.groupList}>
                      {groups.map((g) => {
                        const isGrpActive = selectedGroupId === g.id;
                        return (
                          <TouchableOpacity
                            key={g.id}
                            style={[
                              styles.groupItem,
                              {
                                backgroundColor: isGrpActive
                                  ? (isDark ? '#3A2F2A' : '#FDF4E7')
                                  : colors.surfaceVariant,
                                borderColor: isGrpActive ? colors.primary : colors.border,
                              },
                            ]}
                            onPress={() => setSelectedGroupId(g.id)}>
                            <Text
                              style={[
                                styles.groupItemName,
                                {
                                  color: isGrpActive ? colors.primary : colors.text,
                                  fontWeight: isGrpActive ? '700' : '600',
                                },
                              ]}>
                              {g.name}
                            </Text>
                            {isGrpActive && (
                              <Text style={[styles.groupItemCheck, { color: colors.primary }]}>✓</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Big Add Prayer Button */}
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleSubmit}
                activeOpacity={0.85}>
                <Text style={[styles.submitBtnText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>
                  Add to Today’s Prayers
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  closeText: {
    fontSize: 15,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  contentWrap: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    gap: Spacing.md,
  },
  inputGroup: {
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 1,
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
    marginBottom: 6,
  },
  charCount: {
    fontSize: 12,
  },
  titleInput: {
    borderRadius: BorderRadius.md,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
  },
  detailsInput: {
    borderRadius: BorderRadius.md,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
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
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
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
  },
  privacyOptionEmoji: {
    fontSize: 20,
  },
  privacyOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  privacyOptionSub: {
    fontSize: 11,
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
  },
  groupItemName: {
    fontSize: 14,
  },
  groupItemCheck: {
    fontSize: 14,
    fontWeight: '700',
  },
  noGroupBanner: {
    padding: 12,
    borderRadius: BorderRadius.md,
  },
  noGroupText: {
    fontSize: 12,
    lineHeight: 18,
  },
  submitBtn: {
    height: 52,
    borderRadius: BorderRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
