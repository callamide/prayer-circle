import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Share,
  Platform,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePrayer } from '@/context/PrayerContext';
import { useTheme } from '@/context/ThemeContext';
import { Colors, BorderRadius, Spacing, Typography } from '@/constants/theme';
import { Confetti } from '@/components/Confetti';
import {
  JournalEntry,
  PrayerPlan,
  PrayerPlanDay,
  Prayer,
  PrayerCategory,
} from '@/types/database';
import { differenceInCalendarDays, parseISO, format } from 'date-fns';

const LOGO_IMG = require('@/assets/images/prayer-walk-logo.jpg');

const CATEGORIES: ('All' | PrayerCategory)[] = [
  'All',
  'Family',
  'Health',
  'Spiritual',
  'Work',
  'Other',
];

export interface JournalTabProps {
  initialTab?: 'plans' | 'notes' | 'answered';
}

export default function JournalTabScreen({ initialTab }: JournalTabProps = {}) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();

  const {
    journalEntries,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    prayerPlans,
    userPlans,
    activePlan,
    startPrayerPlan,
    completePlanDay,
    prayers,
    addAnsweredPrayer,
    updateTestimony,
  } = usePrayer();

  // Tab: 'answered' (Wall of Praise) | 'notes' (Journal & Walks) | 'plans' (Walking Plans)
  const defaultTab =
    initialTab ??
    (params.tab === 'plans' || params.tab === 'notes' || params.tab === 'answered'
      ? (params.tab as 'plans' | 'notes' | 'answered')
      : 'answered');
  const [tabOverride, setTabOverride] = useState<'plans' | 'notes' | 'answered' | null>(defaultTab);
  const activeTab: 'plans' | 'notes' | 'answered' = tabOverride ?? defaultTab;

  const setActiveTab = (tab: 'plans' | 'notes' | 'answered') => {
    setTabOverride(tab);
  };

  // ==================== NOTES STATE ====================
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<JournalEntry | null>(null);

  const [noteTitle, setNoteTitle] = useState('');
  const [noteScripture, setNoteScripture] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState('meditation');
  const [noteSteps, setNoteSteps] = useState('');

  // ==================== PLANS STATE ====================
  const [viewingDayPlan, setViewingDayPlan] = useState<{
    plan: PrayerPlan;
    day: PrayerPlanDay;
    isCompleted: boolean;
  } | null>(null);

  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [customPlanTitle, setCustomPlanTitle] = useState('');
  const [customPlanSubtitle, setCustomPlanSubtitle] = useState('');
  const [customPlanDays, setCustomPlanDays] = useState('7');
  const [isCustomDays, setIsCustomDays] = useState(false);
  const [customDaysInput, setCustomDaysInput] = useState('');
  const [customPlanCategory, setCustomPlanCategory] = useState('Spiritual');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  // ==================== ANSWERED PRAYERS STATE ====================
  const answeredPrayers = useMemo(
    () => prayers.filter((p) => p.status === 'answered'),
    [prayers]
  );
  const [selectedCategory, setSelectedCategory] = useState<'All' | PrayerCategory>('All');
  const [isAddAnsweredOpen, setIsAddAnsweredOpen] = useState(false);
  const [newAnsweredTitle, setNewAnsweredTitle] = useState('');
  const [newAnsweredTestimony, setNewAnsweredTestimony] = useState('');
  const [newAnsweredCategory, setNewAnsweredCategory] = useState<PrayerCategory>('Spiritual');
  const [addAnsweredError, setAddAnsweredError] = useState('');

  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
  const [editedTestimony, setEditedTestimony] = useState('');
  const [isEditingTestimony, setIsEditingTestimony] = useState(false);

  const [sharingPrayer, setSharingPrayer] = useState<Prayer | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Notes tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    journalEntries.forEach((entry) => {
      entry.tags?.forEach((t) => set.add(t.toLowerCase().trim()));
    });
    return ['all', ...Array.from(set)];
  }, [journalEntries]);

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    return journalEntries.filter((note) => {
      const matchSearch =
        searchQuery === '' ||
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (note.scripture && note.scripture.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchTag =
        selectedTag === 'all' ||
        (note.tags && note.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase()));

      return matchSearch && matchTag;
    });
  }, [journalEntries, searchQuery, selectedTag]);

  // Filtered Answered Prayers
  const filteredAnswered = useMemo(() => {
    return selectedCategory === 'All'
      ? answeredPrayers
      : answeredPrayers.filter((p) => p.category === selectedCategory);
  }, [selectedCategory, answeredPrayers]);

  // ==================== HANDLERS ====================
  const handleOpenNewNote = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteScripture('');
    setNoteContent('');
    setNoteTags('meditation');
    setNoteSteps('');
    setIsNoteModalOpen(true);
  };

  const handleEditNote = (note: JournalEntry) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteScripture(note.scripture || '');
    setNoteContent(note.content);
    setNoteTags(note.tags ? note.tags.join(', ') : '');
    setNoteSteps(note.steps_walked ? String(note.steps_walked) : '');
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim()) {
      Alert.alert('Missing Title', 'Please give your reflection a title.');
      return;
    }
    if (!noteContent.trim()) {
      Alert.alert('Missing Content', 'Please write your reflections or prayer insights.');
      return;
    }

    const tagsArray = noteTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const stepsVal = noteSteps ? parseInt(noteSteps, 10) : undefined;

    if (editingNote) {
      await updateJournalEntry(editingNote.id, {
        title: noteTitle.trim(),
        scripture: noteScripture.trim() || undefined,
        content: noteContent.trim(),
        tags: tagsArray,
        steps_walked: isNaN(stepsVal!) ? undefined : stepsVal,
      });
    } else {
      await addJournalEntry({
        title: noteTitle.trim(),
        scripture: noteScripture.trim() || undefined,
        content: noteContent.trim(),
        tags: tagsArray,
        steps_walked: isNaN(stepsVal!) ? undefined : stepsVal,
      });
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      setShowConfetti(true);
    }

    setIsNoteModalOpen(false);
  };

  const handleDeleteNote = (id: string) => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this reflection?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteJournalEntry(id),
      },
    ]);
  };

  const handleOpenCreatePlan = () => {
    setCustomPlanTitle('');
    setCustomPlanSubtitle('');
    setCustomPlanDays('7');
    setIsCustomDays(false);
    setCustomDaysInput('');
    setCustomPlanCategory('Spiritual');
    setIsCustomCategory(false);
    setCustomCategoryInput('');
    setIsCreatePlanOpen(true);
  };

  const handleStartPlan = async (planId: string) => {
    await startPrayerPlan(planId);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    setShowConfetti(true);
  };

  const handleCompleteDay = async (planId: string, dayNumber: number) => {
    await completePlanDay(planId, dayNumber);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    setShowConfetti(true);
    setViewingDayPlan(null);
  };

  // Answered Handlers
  const handleOpenAddAnsweredModal = () => {
    setNewAnsweredTitle('');
    setNewAnsweredTestimony('');
    setNewAnsweredCategory('Spiritual');
    setAddAnsweredError('');
    setIsAddAnsweredOpen(true);
  };

  const handleSaveNewAnswered = async () => {
    if (!newAnsweredTitle.trim()) {
      setAddAnsweredError('Please enter what prayer God answered.');
      return;
    }
    if (!newAnsweredTestimony.trim()) {
      setAddAnsweredError('Please share a short testimony of what happened.');
      return;
    }

    await addAnsweredPrayer({
      title: newAnsweredTitle.trim(),
      testimony: newAnsweredTestimony.trim(),
      category: newAnsweredCategory,
    });

    setIsAddAnsweredOpen(false);
    setShowConfetti(true);
  };

  const handleOpenAnsweredDetail = (prayer: Prayer) => {
    setSelectedPrayer(prayer);
    setEditedTestimony(prayer.testimony || '');
    setIsEditingTestimony(false);
  };

  const handleSaveEditedTestimony = async () => {
    if (selectedPrayer && editedTestimony.trim()) {
      await updateTestimony(selectedPrayer.id, editedTestimony.trim());
      setSelectedPrayer({ ...selectedPrayer, testimony: editedTestimony.trim() });
      setIsEditingTestimony(false);
    }
  };

  const handleShareAnsweredText = async (prayer: Prayer) => {
    const days =
      prayer.answered_at && prayer.created_at
        ? differenceInCalendarDays(parseISO(prayer.answered_at), parseISO(prayer.created_at)) + 1
        : 7;

    const msg = `🎉 Praise Report on Prayer Walk!\n\n"${prayer.title}"\nAnswered after ${days} days of prayer.\n\nTestimony: “${
      prayer.testimony || 'God answered in His perfect faithfulness!'
    }”\n\n— Walk with God. Pray every step.`;

    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({ title: 'Prayer Answered!', text: msg });
        } else {
          Alert.alert('Testimony Copied', msg);
        }
      } else {
        await Share.share({
          message: msg,
          title: 'Prayer Answered!',
        });
      }
    } catch (e) {
      console.warn('Share testimony failed:', e);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={[styles.topHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerEyebrow, { color: colors.primary }]}>FAITH & REFLECTION</Text>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Typography.serif }]}>
            Wall & Journal
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {activeTab === 'answered'
              ? 'Wall of Praise & Testimonies of Faith'
              : activeTab === 'notes'
              ? 'Walking Reflections & Personal Journal'
              : 'Guided Scripture Walking Plans'}
          </Text>
        </View>

        {activeTab === 'answered' && (
          <TouchableOpacity
            style={[styles.addHeaderBtn, { backgroundColor: colors.primary }]}
            onPress={handleOpenAddAnsweredModal}
            activeOpacity={0.85}>
            <Ionicons name="add" size={18} color={isDark ? '#14121F' : '#FFFFFF'} />
            <Text style={[styles.addHeaderBtnText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>+ Praise</Text>
          </TouchableOpacity>
        )}

        {activeTab === 'notes' && (
          <TouchableOpacity
            style={[styles.addHeaderBtn, { backgroundColor: colors.primary }]}
            onPress={handleOpenNewNote}
            activeOpacity={0.85}>
            <Ionicons name="add" size={18} color={isDark ? '#14121F' : '#FFFFFF'} />
            <Text style={[styles.addHeaderBtnText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>+ Note</Text>
          </TouchableOpacity>
        )}

        {activeTab === 'plans' && (
          <TouchableOpacity
            style={[styles.addHeaderBtnOutline, { borderColor: colors.primary }]}
            onPress={handleOpenCreatePlan}
            activeOpacity={0.85}>
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={[styles.addHeaderBtnOutlineText, { color: colors.primary }]}>Custom</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 3-Segment Switcher */}
      <View style={[styles.segmentContainer, { backgroundColor: isDark ? '#1C1929' : '#F3EFE6', borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            styles.segmentBtnWide,
            activeTab === 'answered' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('answered')}
          activeOpacity={0.8}>
          <Ionicons
            name={activeTab === 'answered' ? 'trophy' : 'trophy-outline'}
            size={14}
            color={activeTab === 'answered' ? (isDark ? '#14121F' : '#FFFFFF') : colors.textSecondary}
          />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.segmentText,
              { color: activeTab === 'answered' ? (isDark ? '#14121F' : '#FFFFFF') : colors.textSecondary },
              activeTab === 'answered' && { fontWeight: '700' },
            ]}>
            Wall of Praise{answeredPrayers.length > 0 ? ` (${answeredPrayers.length})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            styles.segmentBtnWide,
            activeTab === 'notes' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('notes')}
          activeOpacity={0.8}>
          <Ionicons
            name={activeTab === 'notes' ? 'book' : 'book-outline'}
            size={14}
            color={activeTab === 'notes' ? (isDark ? '#14121F' : '#FFFFFF') : colors.textSecondary}
          />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.segmentText,
              { color: activeTab === 'notes' ? (isDark ? '#14121F' : '#FFFFFF') : colors.textSecondary },
              activeTab === 'notes' && { fontWeight: '700' },
            ]}>
            Journal & Walks{journalEntries.length > 0 ? ` (${journalEntries.length})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            styles.segmentBtnNarrow,
            activeTab === 'plans' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('plans')}
          activeOpacity={0.8}>
          <Ionicons
            name={activeTab === 'plans' ? 'map' : 'map-outline'}
            size={14}
            color={activeTab === 'plans' ? (isDark ? '#14121F' : '#FFFFFF') : colors.textSecondary}
          />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.segmentText,
              { color: activeTab === 'plans' ? (isDark ? '#14121F' : '#FFFFFF') : colors.textSecondary },
              activeTab === 'plans' && { fontWeight: '700' },
            ]}>
            Plans
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* ===================== TAB 1: WALKING PLANS ===================== */}
        {activeTab === 'plans' && (
          <View>
            {/* Active Plan Card (if any) */}
            {activePlan && (
              <View style={[styles.activePlanBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.activePlanHeaderRow}>
                  <View style={[styles.activeBadge, { backgroundColor: isDark ? '#3A2F2A' : '#FDF4E7' }]}>
                    <Text style={[styles.activeBadgeText, { color: colors.primary }]}>ACTIVE PLAN</Text>
                  </View>
                  <Text style={[styles.activeCategoryText, { color: colors.textTertiary }]}>{activePlan.plan.category}</Text>
                </View>

                <Text style={[styles.activePlanTitle, { color: colors.text, fontFamily: Typography.serif }]}>{activePlan.plan.title}</Text>
                <Text style={[styles.activePlanSubtitle, { color: colors.textSecondary }]}>{activePlan.plan.subtitle}</Text>

                {/* Progress bar */}
                <View style={styles.planProgressContainer}>
                  <View style={[styles.planProgressTrack, { backgroundColor: isDark ? '#2A2433' : '#E5E7EB' }]}>
                    <View
                      style={[
                        styles.planProgressFill,
                        {
                          backgroundColor: colors.primary,
                          width: `${Math.round(
                            (activePlan.userPlan.completed_days.length /
                              activePlan.plan.days_count) *
                              100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.planProgressText, { color: colors.textTertiary }]}>
                    Day {activePlan.userPlan.current_day} of {activePlan.plan.days_count} (
                    {activePlan.userPlan.completed_days.length} completed)
                  </Text>
                </View>

                {/* Days Grid */}
                <View style={styles.daysGrid}>
                  {activePlan.plan.days.map((day) => {
                    const isDone = activePlan.userPlan.completed_days.includes(day.day_number);
                    const isCurrent = activePlan.userPlan.current_day === day.day_number && !isDone;

                    return (
                      <TouchableOpacity
                        key={day.day_number}
                        style={[
                          styles.dayCell,
                          {
                            backgroundColor: isDark ? '#201D31' : '#F9FAFB',
                            borderColor: isDark ? '#3A3652' : '#E5E7EB',
                          },
                          isDone && [styles.dayCellDone, { backgroundColor: colors.primary, borderColor: colors.primary }],
                          isCurrent && [styles.dayCellCurrent, { borderColor: colors.primary }],
                        ]}
                        onPress={() =>
                          setViewingDayPlan({
                            plan: activePlan.plan,
                            day,
                            isCompleted: isDone,
                          })
                        }
                        activeOpacity={0.8}>
                        {isDone ? (
                          <Ionicons name="checkmark-circle" size={20} color={isDark ? '#14121F' : '#FFFFFF'} />
                        ) : (
                          <Text
                            style={[
                              styles.dayCellNum,
                              { color: colors.text },
                              isCurrent && { color: colors.primary, fontWeight: '700' },
                            ]}>
                            {day.day_number}
                          </Text>
                        )}
                        <Text
                          style={[
                            styles.dayCellSub,
                            { color: colors.textTertiary },
                            isDone && { color: isDark ? '#14121F' : '#FFFFFF' },
                            isCurrent && { color: colors.primary },
                          ]}>
                          Day {day.day_number}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Curated Plans List */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>GUIDED WALKING PLANS</Text>
              <Text style={[styles.sectionSubtext, { color: colors.textTertiary }]}>
                Scripture journeys designed for focused prayer walks
              </Text>
            </View>

            {prayerPlans.map((plan) => {
              const userProgress = userPlans.find((u) => u.plan_id === plan.id);
              const isStarted = Boolean(userProgress);
              const isFinished = userProgress?.is_completed;

              return (
                <View key={plan.id} style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.planTopRow}>
                    <View style={[styles.categoryBadge, { backgroundColor: colors.surfaceVariant }]}>
                      <Text style={[styles.categoryBadgeText, { color: colors.textSecondary }]}>{plan.category}</Text>
                    </View>
                    <View style={[styles.durationPill, { backgroundColor: isDark ? '#3A2F2A' : '#FDF4E7' }]}>
                      <Ionicons name="calendar-outline" size={13} color={colors.primary} />
                      <Text style={[styles.durationText, { color: colors.primary }]}>{plan.days_count} Days</Text>
                    </View>
                  </View>

                  <Text style={[styles.planTitle, { color: colors.text, fontFamily: Typography.serif }]}>{plan.title}</Text>
                  <Text style={[styles.planSubtitle, { color: colors.textSecondary }]}>{plan.subtitle}</Text>
                  <Text style={[styles.planDescription, { color: colors.textSecondary }]}>{plan.description}</Text>

                  <View style={styles.planFooterRow}>
                    <View style={styles.stepsEstimateRow}>
                      <Ionicons name="footsteps-outline" size={14} color={colors.textSecondary} />
                      <Text style={[styles.stepsEstimateText, { color: colors.textSecondary }]}>
                        ~{plan.days_count * 1200} steps of prayer
                      </Text>
                    </View>

                    {isFinished ? (
                      <View style={[styles.finishedBadge, { backgroundColor: isDark ? '#3A2F2A' : '#FDF4E7' }]}>
                        <Ionicons name="ribbon-outline" size={16} color={colors.primary} />
                        <Text style={[styles.finishedText, { color: colors.primary }]}>Completed</Text>
                      </View>
                    ) : isStarted && userProgress ? (
                      <TouchableOpacity
                        style={[styles.continuePlanBtn, { borderColor: colors.primary }]}
                        onPress={() => {
                          const firstUnfinished =
                            plan.days.find(
                              (d) => !userProgress.completed_days.includes(d.day_number)
                            ) || plan.days[0];
                          setViewingDayPlan({
                            plan,
                            day: firstUnfinished,
                            isCompleted: false,
                          });
                        }}
                        activeOpacity={0.8}>
                        <Text style={[styles.continuePlanBtnText, { color: colors.primary }]}>
                          Continue Day {userProgress.current_day} →
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.startPlanBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleStartPlan(plan.id)}
                        activeOpacity={0.85}>
                        <Text style={[styles.startPlanBtnText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>Start Plan</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ===================== TAB 2: MEDITATION NOTES ===================== */}
        {activeTab === 'notes' && (
          <View>
            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
              <Ionicons name="search" size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search reflections, scripture, or tags..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Tag Filter Chips */}
            {allTags.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagsContainer}>
                {allTags.map((tag) => {
                  const isActive = selectedTag === tag;
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagChip,
                        {
                          backgroundColor: isActive ? colors.primary : colors.surfaceVariant,
                          borderColor: isActive ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setSelectedTag(tag)}
                      activeOpacity={0.8}>
                      <Text
                        style={[
                          styles.tagChipText,
                          {
                            color: isActive ? (isDark ? '#14121F' : '#FFFFFF') : colors.textSecondary,
                            fontWeight: isActive ? '700' : '500',
                          },
                        ]}>
                        #{tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Notes List */}
            {filteredNotes.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={styles.emptyEmoji}>📝</Text>
                <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: Typography.serif }]}>
                  {searchQuery || selectedTag !== 'all'
                    ? 'No matching reflections'
                    : 'Your Journal is Empty'}
                </Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Capture verses, quiet reflections from your walks, or insights received in prayer.
                </Text>
                <TouchableOpacity
                  style={[styles.addHeaderBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
                  onPress={handleOpenNewNote}
                  activeOpacity={0.85}>
                  <Text style={[styles.addHeaderBtnText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>+ Write First Note</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredNotes.map((note) => {
                const dateStr = format(parseISO(note.created_at), 'MMM d, yyyy');
                return (
                  <View key={note.id} style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.noteTopRow}>
                      <Text style={[styles.noteDate, { color: colors.textTertiary }]}>{dateStr}</Text>
                      {note.steps_walked ? (
                        <View style={[styles.noteStepsPill, { backgroundColor: isDark ? '#2A2433' : '#E8F5E9' }]}>
                          <Ionicons name="footsteps" size={12} color={colors.primary} />
                          <Text style={[styles.noteStepsText, { color: colors.primary }]}>{note.steps_walked} steps</Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={[styles.noteTitle, { color: colors.text }]}>{note.title}</Text>

                    {note.scripture ? (
                      <View style={[styles.scriptureQuoteBox, { backgroundColor: isDark ? '#1C1929' : '#F8FAF8', borderLeftColor: colors.primary }]}>
                        <Text style={[styles.scriptureQuoteText, { color: colors.text }]}>{note.scripture}</Text>
                      </View>
                    ) : null}

                    <Text style={[styles.noteContent, { color: colors.textSecondary }]}>{note.content}</Text>

                    {note.tags && note.tags.length > 0 && (
                      <View style={styles.noteTagsRow}>
                        {note.tags.map((t) => (
                          <View key={t} style={[styles.inlineTag, { backgroundColor: isDark ? '#2A2433' : '#F3F4F6' }]}>
                            <Text style={[styles.inlineTagText, { color: colors.textSecondary }]}>#{t}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Note Action Buttons */}
                    <View style={[styles.noteActionsRow, { borderTopColor: colors.borderLight }]}>
                      <TouchableOpacity
                        style={styles.noteActionBtn}
                        onPress={() => handleEditNote(note)}>
                        <Ionicons name="pencil-outline" size={15} color={colors.textSecondary} />
                        <Text style={[styles.noteActionText, { color: colors.textSecondary }]}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.noteActionBtn}
                        onPress={() => handleDeleteNote(note.id)}>
                        <Ionicons name="trash-outline" size={15} color="#DC2626" />
                        <Text style={[styles.noteActionText, { color: '#DC2626' }]}>
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ===================== TAB: WALL OF PRAISE (ANSWERED PRAYERS) ===================== */}
        {activeTab === 'answered' && (
          <View>
            {/* Scripture Banner from Wall */}
            <View style={[styles.verseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.verseQuote, { color: colors.text, fontFamily: Typography.serif }]}>
                &ldquo;I will remember the deeds of the Lord; yes, I will remember your wonders of old.&rdquo;
              </Text>
              <Text style={[styles.verseRef, { color: colors.primary }]}>— Psalm 77:11</Text>
            </View>

            {/* Category Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryBar}>
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat;
                const count =
                  cat === 'All'
                    ? answeredPrayers.length
                    : answeredPrayers.filter((p) => p.category === cat).length;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                    activeOpacity={0.8}>
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: isActive ? (isDark ? '#14121F' : '#FFFFFF') : colors.textSecondary },
                        isActive && { fontWeight: '700' },
                      ]}>
                      {cat} {count > 0 ? `(${count})` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Answered List */}
            {filteredAnswered.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={styles.emptyEmoji}>🕊️</Text>
                <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: Typography.serif }]}>
                  {selectedCategory === 'All'
                    ? 'No answered prayers yet'
                    : `No answered ${selectedCategory} prayers yet`}
                </Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Every faithful step is heard. When God provides breakthrough, tap “+ Praise”
                  above to record testimonies and celebrate God’s faithfulness!
                </Text>
                <TouchableOpacity
                  style={[styles.addHeaderBtn, { backgroundColor: colors.primary, marginTop: 16, alignSelf: 'center' }]}
                  onPress={handleOpenAddAnsweredModal}
                  activeOpacity={0.85}>
                  <Text style={[styles.addHeaderBtnText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>+ Record Praise Report</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredAnswered.map((prayer) => {
                const daysPrayed =
                  prayer.answered_at && prayer.created_at
                    ? Math.max(
                        1,
                        differenceInCalendarDays(
                          parseISO(prayer.answered_at),
                          parseISO(prayer.created_at)
                        ) + 1
                      )
                    : 7;

                const answeredDateFormatted = prayer.answered_at
                  ? format(parseISO(prayer.answered_at), 'MMMM d, yyyy')
                  : 'Recently';

                return (
                  <TouchableOpacity
                    key={prayer.id}
                    style={[styles.answeredCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleOpenAnsweredDetail(prayer)}
                    activeOpacity={0.9}>
                    <View style={styles.cardTopRow}>
                      <View style={[styles.praisePill, { backgroundColor: isDark ? '#2A2433' : '#FDF4E7' }]}>
                        <Text style={styles.praiseEmoji}>✨</Text>
                        <Text style={[styles.praiseText, { color: colors.primary }]}>
                          Answered in {daysPrayed} {daysPrayed === 1 ? 'day' : 'days'}
                        </Text>
                      </View>
                      <Text style={[styles.dateText, { color: colors.textTertiary }]}>{answeredDateFormatted}</Text>
                    </View>

                    <Text style={[styles.prayerTitle, { color: colors.text, fontFamily: Typography.serif }]}>
                      {prayer.title}
                    </Text>

                    <View style={styles.metaRow}>
                      <View style={[styles.categoryPill, { backgroundColor: colors.surfaceVariant }]}>
                        <Text style={[styles.categoryText, { color: colors.textSecondary }]}>{prayer.category}</Text>
                      </View>
                      <Text style={[styles.scopeText, { color: colors.textTertiary }]}>
                        {prayer.privacy === 'group' ? '👥 Circle Prayer' : '🔒 Personal Walk'}
                      </Text>
                    </View>

                    {prayer.testimony ? (
                      <View style={[styles.testimonyBox, { backgroundColor: isDark ? '#1C1929' : '#FBF9F5', borderColor: colors.border }]}>
                        <Text style={[styles.quoteMark, { color: colors.primary }]}>“</Text>
                        <Text style={[styles.testimonyText, { color: colors.textSecondary }]}>{prayer.testimony}</Text>
                        <View style={styles.testimonyFooter}>
                          <Text style={[styles.testimonyAuthor, { color: colors.primary }]}>— My Testimony</Text>
                          <Text style={[styles.tapToEditHint, { color: colors.textTertiary }]}>Tap to view / edit</Text>
                        </View>
                      </View>
                    ) : null}

                    {/* Share Buttons */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={[styles.shareBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                        onPress={() => setSharingPrayer(prayer)}
                        activeOpacity={0.8}>
                        <Ionicons name="card-outline" size={15} color={colors.primary} />
                        <Text style={[styles.shareBtnText, { color: colors.primary }]}>Testimony Card</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.shareTextBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                        onPress={() => handleShareAnsweredText(prayer)}
                        activeOpacity={0.8}>
                        <Ionicons name="share-social-outline" size={15} color={colors.textSecondary} />
                        <Text style={[styles.shareTextBtnText, { color: colors.textSecondary }]}>Share</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Confetti Celebration */}
      <Confetti active={showConfetti} onAnimationEnd={() => setShowConfetti(false)} />

      {/* ===================== MODALS ===================== */}

      {/* MODAL: VIEW / COMPLETE DAY PLAN */}
      <Modal visible={Boolean(viewingDayPlan)} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalDialog, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTag, { color: colors.primary }]}>DAY {viewingDayPlan?.day.day_number}</Text>
                <Text style={[styles.modalTitle, { color: colors.text, fontFamily: Typography.serif }]}>{viewingDayPlan?.day.title}</Text>
              </View>
              <TouchableOpacity onPress={() => setViewingDayPlan(null)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {viewingDayPlan && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.scriptureCard, { backgroundColor: isDark ? '#1C1929' : '#F9FAFB', borderColor: colors.border }]}>
                  <Text style={[styles.scriptureHeading, { color: colors.primary }]}>TODAY&rsquo;S SCRIPTURE</Text>
                  <Text style={[styles.scriptureBody, { color: colors.text }]}>{viewingDayPlan.day.scripture}</Text>
                </View>

                {viewingDayPlan.isCompleted ? (
                  <View style={[styles.completedDayNotice, { backgroundColor: isDark ? '#203A2B' : '#E8F5E9' }]}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    <Text style={[styles.completedDayNoticeText, { color: colors.primary }]}>
                      You completed Day {viewingDayPlan.day.day_number}!
                    </Text>
                  </View>
                ) : (
                  <View style={styles.dayModalButtonsRow}>
                    <TouchableOpacity
                      style={[styles.prayWalkNowBtn, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        setViewingDayPlan(null);
                        router.push('/prayer-walk');
                      }}
                      activeOpacity={0.85}>
                      <Ionicons name="footsteps" size={18} color={isDark ? '#14121F' : '#FFFFFF'} />
                      <Text style={[styles.prayWalkNowBtnText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>Walk With This Scripture</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.markDayDoneBtn, { borderColor: colors.primary, backgroundColor: isDark ? '#2A2433' : '#FDF4E7' }]}
                      onPress={() =>
                        handleCompleteDay(viewingDayPlan.plan.id, viewingDayPlan.day.day_number)
                      }
                      activeOpacity={0.85}>
                      <Ionicons name="checkmark-done" size={18} color={colors.primary} />
                      <Text style={[styles.markDayDoneBtnText, { color: colors.primary }]}>Mark Day Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL: WRITE / EDIT NOTE */}
      <Modal visible={isNoteModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          style={styles.modalOverlay}>
          <View style={[styles.modalDialog, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingNote ? 'Edit Reflection' : 'New Journal Note'}
              </Text>
              <TouchableOpacity onPress={() => setIsNoteModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>TITLE</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Walking in the Peace of God"
                placeholderTextColor={colors.textTertiary}
                value={noteTitle}
                onChangeText={setNoteTitle}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>SCRIPTURE (OPTIONAL)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Psalm 23:3 — He restores my soul"
                placeholderTextColor={colors.textTertiary}
                value={noteScripture}
                onChangeText={setNoteScripture}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>REFLECTIONS & PRAYER NOTES</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea, { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.border }]}
                placeholder="What did God show you on your walk? What are you praying through?"
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={6}
                value={noteContent}
                onChangeText={setNoteContent}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>TAGS (COMMA SEPARATED)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. peace, morning walk, guidance"
                placeholderTextColor={colors.textTertiary}
                value={noteTags}
                onChangeText={setNoteTags}
              />

              <TouchableOpacity
                style={[styles.saveNoteBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveNote}
                activeOpacity={0.85}>
                <Text style={[styles.saveNoteBtnText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>
                  {editingNote ? 'Update Note' : 'Save Reflection'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: CREATE CUSTOM PLAN */}
      <Modal visible={isCreatePlanOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          style={styles.modalOverlay}>
          <View style={[styles.modalDialog, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create Custom Plan</Text>
              <TouchableOpacity onPress={() => setIsCreatePlanOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PLAN TITLE</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. 7 Days of Gratitude"
                placeholderTextColor={colors.textTertiary}
                value={customPlanTitle}
                onChangeText={setCustomPlanTitle}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>SUBTITLE & FOCUS</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Walking in thankfulness every morning"
                placeholderTextColor={colors.textTertiary}
                value={customPlanSubtitle}
                onChangeText={setCustomPlanSubtitle}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>DURATION</Text>
              <View style={styles.daysSelectorRow}>
                {['3', '7', '14', '21'].map((d) => {
                  const isActive = !isCustomDays && customPlanDays === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.daySelectChip,
                        {
                          backgroundColor: isActive ? (isDark ? '#3A2F2A' : '#FDF4E7') : colors.surfaceVariant,
                          borderColor: isActive ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        setIsCustomDays(false);
                        setCustomPlanDays(d);
                      }}>
                      <Text
                        style={[
                          styles.daySelectChipText,
                          {
                            color: isActive ? colors.primary : colors.textSecondary,
                            fontWeight: isActive ? '700' : '500',
                          },
                        ]}>
                        {d} Days
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[
                    styles.daySelectChip,
                    {
                      backgroundColor: isCustomDays ? (isDark ? '#3A2F2A' : '#FDF4E7') : colors.surfaceVariant,
                      borderColor: isCustomDays ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setIsCustomDays(true)}>
                  <Text
                    style={[
                      styles.daySelectChipText,
                      {
                        color: isCustomDays ? colors.primary : colors.textSecondary,
                        fontWeight: isCustomDays ? '700' : '500',
                      },
                    ]}>
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>

              {isCustomDays && (
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.border, marginTop: 6 }]}
                  placeholder="Enter number of days (e.g. 30)"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  value={customDaysInput}
                  onChangeText={setCustomDaysInput}
                />
              )}

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CATEGORY</Text>
              <View style={styles.daysSelectorRow}>
                {['Spiritual', 'Health', 'Family', 'Work'].map((cat) => {
                  const isActive = !isCustomCategory && customPlanCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.daySelectChip,
                        {
                          backgroundColor: isActive ? (isDark ? '#3A2F2A' : '#FDF4E7') : colors.surfaceVariant,
                          borderColor: isActive ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        setIsCustomCategory(false);
                        setCustomPlanCategory(cat);
                      }}>
                      <Text
                        style={[
                          styles.daySelectChipText,
                          {
                            color: isActive ? colors.primary : colors.textSecondary,
                            fontWeight: isActive ? '700' : '500',
                          },
                        ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[
                    styles.daySelectChip,
                    {
                      backgroundColor: isCustomCategory ? (isDark ? '#3A2F2A' : '#FDF4E7') : colors.surfaceVariant,
                      borderColor: isCustomCategory ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setIsCustomCategory(true)}>
                  <Text
                    style={[
                      styles.daySelectChipText,
                      {
                        color: isCustomCategory ? colors.primary : colors.textSecondary,
                        fontWeight: isCustomCategory ? '700' : '500',
                      },
                    ]}>
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>

              {isCustomCategory && (
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.border, marginTop: 6 }]}
                  placeholder="Enter custom category (e.g. Finances, Fasting)"
                  placeholderTextColor={colors.textTertiary}
                  value={customCategoryInput}
                  onChangeText={setCustomCategoryInput}
                />
              )}

              <TouchableOpacity
                style={[styles.saveNoteBtn, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  if (!customPlanTitle.trim()) {
                    Alert.alert('Missing Title', 'Please enter a plan title.');
                    return;
                  }
                  const daysCount = isCustomDays
                    ? parseInt(customDaysInput, 10) || 7
                    : parseInt(customPlanDays, 10);

                  const finalCategory = isCustomCategory
                    ? customCategoryInput.trim() || 'Custom'
                    : customPlanCategory;

                  const customId = `plan-custom-${Date.now()}`;
                  const sampleDays: PrayerPlanDay[] = Array.from(
                    { length: daysCount },
                    (_, i) => ({
                      day_number: i + 1,
                      title: `Step ${i + 1}: Walk in Faith`,
                      scripture:
                        'Hebrews 11:1 — "Faith is confidence in what we hope for and assurance about what we do not see."',
                      reflection:
                        'Take quiet, steady strides today. Entrust every unknown concern into God’s faithful hands.',
                      prayer_prompt: 'Lord, give me faith to trust your footsteps ahead.',
                    })
                  );

                  const newCustomPlan: PrayerPlan = {
                    id: customId,
                    title: customPlanTitle.trim(),
                    subtitle: customPlanSubtitle.trim() || 'Custom guided prayer journey',
                    description: `A personal ${daysCount}-day prayer walk plan created by you.`,
                    days_count: daysCount,
                    icon: 'footsteps',
                    badge_name: 'Faith Walker',
                    category: finalCategory,
                    days: sampleDays,
                  };

                  prayerPlans.unshift(newCustomPlan);
                  await startPrayerPlan(customId);
                  setIsCreatePlanOpen(false);
                  setShowConfetti(true);
                }}
                activeOpacity={0.85}>
                <Text style={[styles.saveNoteBtnText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>Create & Start Plan</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: RECORD ANSWERED PRAYER */}
      <Modal visible={isAddAnsweredOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          style={styles.modalOverlay}>
          <View style={[styles.modalDialog, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Record Answered Prayer ✨</Text>
              <TouchableOpacity onPress={() => setIsAddAnsweredOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>WHAT DID GOD ANSWER?</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Mama’s complete healing, New job offer"
                placeholderTextColor={colors.textTertiary}
                value={newAnsweredTitle}
                onChangeText={setNewAnsweredTitle}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CATEGORY</Text>
              <View style={styles.categoryModalRow}>
                {(['Family', 'Health', 'Spiritual', 'Work', 'Other'] as PrayerCategory[]).map(
                  (c) => {
                    const isCatActive = newAnsweredCategory === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[
                          styles.catModalChip,
                          {
                            backgroundColor: isCatActive ? (isDark ? '#3A2F2A' : '#FDF4E7') : colors.surfaceVariant,
                            borderColor: isCatActive ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setNewAnsweredCategory(c)}>
                        <Text
                          style={[
                            styles.catModalChipText,
                            {
                              color: isCatActive ? colors.primary : colors.textSecondary,
                              fontWeight: isCatActive ? '700' : '500',
                            },
                          ]}>
                          {c}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>SHARE YOUR TESTIMONY</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea, { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.border }]}
                placeholder="How did God answer? Share the breakthrough, unexpected peace, or miracle..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                value={newAnsweredTestimony}
                onChangeText={setNewAnsweredTestimony}
              />

              {addAnsweredError ? (
                <Text style={styles.errorText}>{addAnsweredError}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.savePraiseBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveNewAnswered}
                activeOpacity={0.85}>
                <Text style={[styles.savePraiseBtnText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>Save to Reward Wall 🎉</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: EDIT / VIEW TESTIMONY */}
      <Modal visible={Boolean(selectedPrayer)} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          style={styles.modalOverlay}>
          <View style={[styles.modalDialog, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Testimony Details</Text>
              <TouchableOpacity onPress={() => setSelectedPrayer(null)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedPrayer ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}>
                <Text style={[styles.detailPrayerTitle, { color: colors.text, fontFamily: Typography.serif }]}>{selectedPrayer.title}</Text>
                <Text style={[styles.detailDateText, { color: colors.textTertiary }]}>
                  Recorded on{' '}
                  {selectedPrayer.answered_at
                    ? format(parseISO(selectedPrayer.answered_at), 'MMMM d, yyyy')
                    : 'Recently'}
                </Text>

                <View style={[styles.testimonyBox, { backgroundColor: isDark ? '#1C1929' : '#FBF9F5', borderColor: colors.border }]}>
                  <Text style={[styles.quoteMark, { color: colors.primary }]}>“</Text>
                  {isEditingTestimony ? (
                    <TextInput
                      style={[styles.editTestimonyInput, { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.border }]}
                      multiline
                      value={editedTestimony}
                      onChangeText={setEditedTestimony}
                    />
                  ) : (
                    <Text style={[styles.testimonyText, { color: colors.text }]}>
                      {selectedPrayer.testimony || 'No testimony written yet.'}
                    </Text>
                  )}
                </View>

                {isEditingTestimony ? (
                  <TouchableOpacity
                    style={[styles.savePraiseBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSaveEditedTestimony}>
                    <Text style={[styles.savePraiseBtnText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>Save Updated Testimony</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.modalButtonsRow}>
                    <TouchableOpacity
                      style={[styles.editBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                      onPress={() => setIsEditingTestimony(true)}>
                      <Ionicons name="pencil" size={16} color={colors.text} />
                      <Text style={[styles.editBtnText, { color: colors.text }]}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.cardShareBtn, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        const target = selectedPrayer;
                        setSelectedPrayer(null);
                        setSharingPrayer(target);
                      }}>
                      <Ionicons name="card-outline" size={16} color={isDark ? '#14121F' : '#FFFFFF'} />
                      <Text style={[styles.cardShareBtnText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>Share Card</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: SHAREABLE PRAISE REPORT CARD */}
      <Modal visible={Boolean(sharingPrayer)} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalDialog, { backgroundColor: colors.card, maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Shareable Praise Card</Text>
              <TouchableOpacity onPress={() => setSharingPrayer(null)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {sharingPrayer ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.graphicCard, { backgroundColor: isDark ? '#1C1929' : '#FFFFFF', borderColor: colors.border }]}>
                  <View style={styles.graphicHeaderRow}>
                    <Image source={LOGO_IMG} style={styles.graphicLogoThumb} resizeMode="cover" />
                    <View>
                      <Text style={[styles.graphicBrandName, { color: colors.text }]}>Prayer Walk</Text>
                      <Text style={[styles.graphicBrandTagline, { color: colors.primary }]}>Praise Report</Text>
                    </View>
                  </View>

                  <View style={[styles.graphicPraiseBadge, { backgroundColor: isDark ? '#3A2F2A' : '#FDF4E7' }]}>
                    <Text style={styles.graphicPraiseEmoji}>✨</Text>
                    <Text style={[styles.graphicPraiseBadgeText, { color: colors.primary }]}>GOD ANSWERED</Text>
                  </View>

                  <Text style={[styles.graphicPrayerTitle, { color: colors.text, fontFamily: Typography.serif }]}>{sharingPrayer.title}</Text>

                  <View style={[styles.graphicQuoteCard, { backgroundColor: isDark ? '#242038' : '#FDFBF7', borderColor: colors.border }]}>
                    <Text style={[styles.graphicQuoteMark, { color: colors.primary }]}>“</Text>
                    <Text style={[styles.graphicTestimonyText, { color: colors.text }]}>
                      {sharingPrayer.testimony || 'God moved in His power and faithfulness!'}
                    </Text>
                  </View>

                  <View style={styles.graphicFooterRow}>
                    <View style={styles.graphicFooterLeft}>
                      <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
                      <Text style={[styles.graphicCategoryText, { color: colors.textSecondary }]}>{sharingPrayer.category}</Text>
                    </View>
                    <Text style={[styles.graphicFooterBrand, { color: colors.textTertiary }]}>prayerwalk.app</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.shareNowBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleShareAnsweredText(sharingPrayer)}
                  activeOpacity={0.85}>
                  <Ionicons name="share-social" size={18} color={isDark ? '#14121F' : '#FFFFFF'} />
                  <Text style={[styles.shareNowBtnText, { color: isDark ? '#14121F' : '#FFFFFF' }]}>Share Praise Report</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  verseCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  verseQuote: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  verseRef: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  addHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  addHeaderBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  addHeaderBtnOutlineText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 3,
    borderWidth: 1,
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 17,
    gap: 4,
    minWidth: 0,
    overflow: 'hidden',
  },
  segmentBtnWide: {
    flex: 1.25,
  },
  segmentBtnNarrow: {
    flex: 0.8,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    zIndex: 1,
  },
  segmentText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl + 20,
  },
  sectionHeaderRow: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  sectionSubtext: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  // Active Plan Banner
  activePlanBanner: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
  },
  activePlanHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  activeCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activePlanTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
  },
  activePlanSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  planProgressContainer: {
    marginTop: 10,
    marginBottom: 12,
  },
  planProgressTrack: {
    height: 6,
    backgroundColor: '#E8F5E9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  planProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  planProgressText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  dayCell: {
    width: 44,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayCellDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayCellCurrent: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: '#E8F5E9',
  },
  dayCellNum: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  dayCellNumCurrent: {
    color: Colors.primary,
    fontWeight: '800',
  },
  dayCellSub: {
    fontSize: 8,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dayCellSubDone: {
    color: '#FFFFFF',
  },
  dayCellSubCurrent: {
    color: Colors.primary,
  },

  // Plan Card
  planCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  planTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  planSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  planDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 6,
  },
  planFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  stepsEstimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stepsEstimateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  startPlanBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  startPlanBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  continuePlanBtn: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  continuePlanBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  finishedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  finishedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },

  // Notes Search & Filter
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.button,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  tagChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tagChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Note Card
  noteCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  noteTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  noteDate: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  noteStepsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  noteStepsText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  scriptureQuoteBox: {
    backgroundColor: '#F8FAF8',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 8,
  },
  scriptureQuoteText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: Colors.text,
    lineHeight: 18,
  },
  noteContent: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  noteTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  inlineTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inlineTagText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  noteActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  noteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  noteActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // Answered Prayers Tab Styles
  categoryBar: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
    marginBottom: Spacing.md,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  answeredCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  praisePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  praiseEmoji: {
    fontSize: 11,
  },
  praiseText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  dateText: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  prayerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  categoryPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  scopeText: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  testimonyBox: {
    backgroundColor: '#F8FAF8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8F5E9',
    marginBottom: 10,
  },
  quoteMark: {
    fontSize: 22,
    color: Colors.primary,
    lineHeight: 22,
    marginBottom: -4,
  },
  testimonyText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  testimonyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E8F5E9',
  },
  testimonyAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  tapToEditHint: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  shareTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  shareTextBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // Empty State
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: Spacing.md,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },

  // Modals common
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalDialog: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
    maxHeight: '88%',
    flexShrink: 1,
  },
  modalScrollContent: {
    paddingBottom: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTag: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.button,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
  },
  modalTextArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  saveNoteBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  saveNoteBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Day detail modal
  scriptureCard: {
    backgroundColor: '#F8FAF8',
    borderRadius: BorderRadius.card,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    marginBottom: 20,
  },
  scriptureHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  scriptureBody: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
    fontStyle: 'italic',
  },
  completedDayNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: BorderRadius.card,
    padding: 14,
    gap: 10,
  },
  completedDayNoticeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  dayModalButtonsRow: {
    gap: 10,
    marginBottom: 10,
  },
  prayWalkNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
    paddingVertical: 14,
    gap: 8,
  },
  prayWalkNowBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  markDayDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: BorderRadius.button,
    paddingVertical: 14,
    gap: 8,
  },
  markDayDoneBtnText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },

  // Create plan custom chips
  daysSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  daySelectChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.button,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  daySelectChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  daySelectChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  daySelectChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Answered Modal specific
  categoryModalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  catModalChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catModalChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catModalChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  catModalChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  savePraiseBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  savePraiseBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
  },

  // Detail & Share card modals
  detailPrayerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  detailDateText: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 12,
  },
  editTestimonyInput: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    minHeight: 80,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: BorderRadius.button,
    gap: 6,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  cardShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: BorderRadius.button,
    gap: 6,
  },
  cardShareBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Graphic Praise Card Preview
  graphicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E8F5E9',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 16,
  },
  graphicHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  graphicLogoThumb: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  graphicBrandName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },
  graphicBrandTagline: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  graphicPraiseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
    marginBottom: 10,
  },
  graphicPraiseEmoji: {
    fontSize: 12,
  },
  graphicPraiseBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.6,
  },
  graphicPrayerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
  },
  graphicQuoteCard: {
    backgroundColor: '#F8FAF8',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginBottom: 14,
  },
  graphicQuoteMark: {
    fontSize: 24,
    color: Colors.primary,
    lineHeight: 20,
  },
  graphicTestimonyText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.text,
    lineHeight: 22,
  },
  graphicFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  graphicFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  graphicCategoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  graphicFooterBrand: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  shareNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.button,
    gap: 8,
    marginBottom: 10,
  },
  shareNowBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
