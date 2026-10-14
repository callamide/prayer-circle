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
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePrayer } from '@/context/PrayerContext';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { Confetti } from '@/components/Confetti';
import { JournalEntry, PrayerPlan, PrayerPlanDay } from '@/types/database';

export default function JournalScreen() {
  const router = useRouter();
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
    totalStepsWalked,
  } = usePrayer();

  // Tab: 'plans' | 'notes'
  const [activeTab, setActiveTab] = useState<'plans' | 'notes'>('plans');

  // Notes Search & Tag Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  // Modals
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<JournalEntry | null>(null);

  // Note Form Fields
  const [noteTitle, setNoteTitle] = useState('');
  const [noteScripture, setNoteScripture] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState('meditation');
  const [noteSteps, setNoteSteps] = useState('');

  // Plan Day Detail Modal
  const [viewingDayPlan, setViewingDayPlan] = useState<{
    plan: PrayerPlan;
    day: PrayerPlanDay;
    isCompleted: boolean;
  } | null>(null);

  // Create Custom Plan Modal
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [customPlanTitle, setCustomPlanTitle] = useState('');
  const [customPlanSubtitle, setCustomPlanSubtitle] = useState('');
  const [customPlanDays, setCustomPlanDays] = useState('7');
  const [isCustomDays, setIsCustomDays] = useState(false);
  const [customDaysInput, setCustomDaysInput] = useState('');
  const [customPlanCategory, setCustomPlanCategory] = useState('Spiritual');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  const [showConfetti, setShowConfetti] = useState(false);

  // Collect all unique tags for filter chips
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

  // Open Note Creator/Editor
  const handleOpenNewNote = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteScripture('');
    setNoteContent('');
    setNoteTags('meditation');
    setNoteSteps('');
    setIsNoteModalOpen(true);
  };

  const handleOpenEditNote = (note: JournalEntry) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteScripture(note.scripture || '');
    setNoteContent(note.content);
    setNoteTags(note.tags?.join(', ') || 'meditation');
    setNoteSteps(note.steps_walked ? String(note.steps_walked) : '');
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      Alert.alert('Required', 'Please enter a title and your meditation thoughts.');
      return;
    }

    const tagsArray = noteTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const stepsVal = noteSteps ? parseInt(noteSteps, 10) : null;

    if (editingNote) {
      await updateJournalEntry(editingNote.id, {
        title: noteTitle.trim(),
        scripture: noteScripture.trim() || undefined,
        content: noteContent.trim(),
        tags: tagsArray.length > 0 ? tagsArray : ['meditation'],
      });
    } else {
      await addJournalEntry({
        title: noteTitle.trim(),
        scripture: noteScripture.trim() || undefined,
        content: noteContent.trim(),
        tags: tagsArray.length > 0 ? tagsArray : ['meditation'],
        steps_walked: isNaN(stepsVal as number) ? null : stepsVal,
      });
    }

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }

    setIsNoteModalOpen(false);
  };

  const handleDeleteNote = (note: JournalEntry) => {
    Alert.alert(
      'Delete Meditation Note',
      `Are you sure you want to delete "${note.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteJournalEntry(note.id);
          },
        },
      ]
    );
  };

  const handleShareNote = async (note: JournalEntry) => {
    const text = `📖 Prayer Walk Meditation: "${note.title}"\n${
      note.scripture ? `\n"${note.scripture}"\n` : ''
    }\n${note.content}\n\n— Walk with God. Pray every step.`;

    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({ title: note.title, text });
        } else {
          alert('Note copied:\n' + text);
        }
      } else {
        await Share.share({ message: text, title: note.title });
      }
    } catch (e) {
      console.warn('Share error:', e);
    }
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

  // Prayer Plan Actions
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Prayer Journal</Text>
          <Text style={styles.headerSubtitle}>Walking Plans & Meditation Notes</Text>
        </View>

        {activeTab === 'notes' ? (
          <TouchableOpacity
            style={styles.addHeaderBtn}
            onPress={handleOpenNewNote}
            activeOpacity={0.8}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addHeaderBtnText}>New Note</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.addHeaderBtnOutline}
            onPress={handleOpenCreatePlan}
            activeOpacity={0.8}>
            <Ionicons name="add" size={16} color={Colors.primary} />
            <Text style={styles.addHeaderBtnOutlineText}>Custom</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Segmented Switcher */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'plans' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('plans')}
          activeOpacity={0.8}>
          <Ionicons
            name={activeTab === 'plans' ? 'map' : 'map-outline'}
            size={18}
            color={activeTab === 'plans' ? '#FFFFFF' : Colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentText,
              activeTab === 'plans' && styles.segmentTextActive,
            ]}>
            Walking Plans
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'notes' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('notes')}
          activeOpacity={0.8}>
          <Ionicons
            name={activeTab === 'notes' ? 'book' : 'book-outline'}
            size={18}
            color={activeTab === 'notes' ? '#FFFFFF' : Colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentText,
              activeTab === 'notes' && styles.segmentTextActive,
            ]}>
            Meditation Notes ({journalEntries.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* ===================== WALKING PLANS TAB ===================== */}
        {activeTab === 'plans' && (
          <View>
            {/* Active Plan Card (if any) */}
            {activePlan && (
              <View style={styles.activePlanBanner}>
                <View style={styles.activePlanHeaderRow}>
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>ACTIVE PLAN</Text>
                  </View>
                  <Text style={styles.activeCategoryText}>{activePlan.plan.category}</Text>
                </View>

                <Text style={styles.activePlanTitle}>{activePlan.plan.title}</Text>
                <Text style={styles.activePlanSubtitle}>{activePlan.plan.subtitle}</Text>

                {/* Progress Bar */}
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(
                          100,
                          (activePlan.userPlan.completed_days.length /
                            activePlan.plan.days_count) *
                            100
                        )}%`,
                      },
                    ]}
                  />
                </View>

                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>
                    Day {activePlan.userPlan.current_day} of {activePlan.plan.days_count}
                  </Text>
                  <Text style={styles.progressPercent}>
                    {activePlan.userPlan.completed_days.length} completed
                  </Text>
                </View>

                {/* Today's Reading / Prompt Box */}
                {(() => {
                  const currentDayData =
                    activePlan.plan.days.find(
                      (d) => d.day_number === activePlan.userPlan.current_day
                    ) || activePlan.plan.days[0];

                  const isDayDone = activePlan.userPlan.completed_days.includes(
                    currentDayData.day_number
                  );

                  return (
                    <View style={styles.todayPlanCard}>
                      <View style={styles.todayCardHeader}>
                        <Text style={styles.todayCardDayNum}>
                          DAY {currentDayData.day_number}: {currentDayData.title.toUpperCase()}
                        </Text>
                        {isDayDone && (
                          <View style={styles.dayDonePill}>
                            <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                            <Text style={styles.dayDoneText}>Completed</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.todayScripture}>{currentDayData.scripture}</Text>
                      <Text style={styles.todayReflection}>{currentDayData.reflection}</Text>

                      <View style={styles.promptBox}>
                        <Text style={styles.promptTitle}>PRAYER WALK PROMPT</Text>
                        <Text style={styles.promptText}>
                          &ldquo;{currentDayData.prayer_prompt}&rdquo;
                        </Text>
                      </View>

                      {/* Action Buttons */}
                      <View style={styles.planActionRow}>
                        <TouchableOpacity
                          style={styles.startWalkBtn}
                          onPress={() => router.push('/prayer-walk')}
                          activeOpacity={0.85}>
                          <Ionicons name="footsteps" size={18} color="#FFFFFF" />
                          <Text style={styles.startWalkBtnText}>
                            Start Day {currentDayData.day_number} Walk
                          </Text>
                        </TouchableOpacity>

                        {!isDayDone && (
                          <TouchableOpacity
                            style={styles.completeDayBtn}
                            onPress={() =>
                              handleCompleteDay(
                                activePlan.plan.id,
                                currentDayData.day_number
                              )
                            }
                            activeOpacity={0.8}>
                            <Ionicons
                              name="checkmark-outline"
                              size={18}
                              color={Colors.primary}
                            />
                            <Text style={styles.completeDayBtnText}>Complete</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })()}

                {/* Days Breakdown Horizontal / Grid */}
                <Text style={styles.daysBreakdownTitle}>JOURNEY PATH</Text>
                <View style={styles.daysGrid}>
                  {activePlan.plan.days.map((day) => {
                    const isCompleted = activePlan.userPlan.completed_days.includes(
                      day.day_number
                    );
                    const isCurrent =
                      day.day_number === activePlan.userPlan.current_day && !isCompleted;

                    return (
                      <TouchableOpacity
                        key={day.day_number}
                        style={[
                          styles.dayChip,
                          isCompleted && styles.dayChipCompleted,
                          isCurrent && styles.dayChipCurrent,
                        ]}
                        onPress={() =>
                          setViewingDayPlan({
                            plan: activePlan.plan,
                            day,
                            isCompleted,
                          })
                        }
                        activeOpacity={0.75}>
                        <Text
                          style={[
                            styles.dayChipNum,
                            isCompleted && styles.dayChipNumCompleted,
                            isCurrent && styles.dayChipNumCurrent,
                          ]}>
                          {isCompleted ? '✓' : day.day_number}
                        </Text>
                        <Text
                          style={[
                            styles.dayChipTitle,
                            isCompleted && styles.dayChipTitleCompleted,
                            isCurrent && styles.dayChipTitleCurrent,
                          ]}
                          numberOfLines={1}>
                          {day.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Curated Walking Plans List */}
            <View style={styles.curatedSectionHeader}>
              <Text style={styles.sectionHeading}>CURATED WALKING PRAYER PLANS</Text>
              <Text style={styles.sectionSubheading}>
                Thematic walks designed to deepen your conversation with God step by step.
              </Text>
            </View>

            {prayerPlans.map((plan) => {
              const userPlan = userPlans.find((p) => p.plan_id === plan.id);
              const isStarted = Boolean(userPlan);
              const isCompleted = Boolean(userPlan?.is_completed);

              return (
                <View key={plan.id} style={styles.planCard}>
                  <View style={styles.planTopRow}>
                    <View style={styles.planIconCircle}>
                      <Ionicons
                        name={(plan.icon as any) || 'footsteps'}
                        size={22}
                        color={Colors.primary}
                      />
                    </View>
                    <View style={styles.planMeta}>
                      <View style={styles.planBadgeRow}>
                        <Text style={styles.planCategoryPill}>{plan.category}</Text>
                        <Text style={styles.planDaysPill}>{plan.days_count} Days</Text>
                      </View>
                      <Text style={styles.planTitle}>{plan.title}</Text>
                    </View>
                  </View>

                  <Text style={styles.planDesc}>{plan.description}</Text>

                  <View style={styles.planBottomRow}>
                    <View style={styles.planRewardRow}>
                      <Ionicons name="trophy-outline" size={15} color="#D97706" />
                      <Text style={styles.planRewardText}>Badge: {plan.badge_name}</Text>
                    </View>

                    {isCompleted ? (
                      <View style={styles.planCompletedPill}>
                        <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                        <Text style={styles.planCompletedText}>Completed</Text>
                      </View>
                    ) : isStarted ? (
                      <TouchableOpacity
                        style={styles.continuePlanBtn}
                        onPress={() => handleStartPlan(plan.id)}
                        activeOpacity={0.8}>
                        <Text style={styles.continuePlanBtnText}>
                          Day {userPlan?.current_day || 1} ➔
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.startPlanBtn}
                        onPress={() => handleStartPlan(plan.id)}
                        activeOpacity={0.8}>
                        <Text style={styles.startPlanBtnText}>Start Plan</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ===================== MEDITATION NOTES TAB ===================== */}
        {activeTab === 'notes' && (
          <View>
            {/* Search Input */}
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color={Colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search notes, scriptures, reflections..."
                placeholderTextColor={Colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Tag Filter Chips */}
            {allTags.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tagsScrollView}
                contentContainerStyle={styles.tagsContainer}>
                {allTags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tagChip, selectedTag === tag && styles.tagChipActive]}
                    onPress={() => setSelectedTag(tag)}>
                    <Text
                      style={[
                        styles.tagChipText,
                        selectedTag === tag && styles.tagChipTextActive,
                      ]}>
                      {tag === 'all' ? 'All Notes' : `#${tag}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Notes List */}
            {filteredNotes.length === 0 ? (
              <View style={styles.emptyNotesBox}>
                <Ionicons name="book-outline" size={44} color={Colors.textTertiary} />
                <Text style={styles.emptyNotesTitle}>Your Prayer Journal is Clean</Text>
                <Text style={styles.emptyNotesDesc}>
                  Capture verses, quiet reflections from your walks, or answered whisperings of the Holy Spirit.
                </Text>
                <TouchableOpacity
                  style={styles.emptyNotesBtn}
                  onPress={handleOpenNewNote}
                  activeOpacity={0.85}>
                  <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyNotesBtnText}>Write First Meditation Note</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredNotes.map((note) => {
                const dateStr = new Date(note.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <View key={note.id} style={styles.noteCard}>
                    {/* Note Top */}
                    <View style={styles.noteTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.noteTitle}>{note.title}</Text>
                        <Text style={styles.noteDate}>{dateStr}</Text>
                      </View>

                      <View style={styles.noteActionIcons}>
                        <TouchableOpacity
                          style={styles.iconAction}
                          onPress={() => handleShareNote(note)}>
                          <Ionicons name="share-outline" size={18} color={Colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconAction}
                          onPress={() => handleOpenEditNote(note)}>
                          <Ionicons name="pencil-outline" size={18} color={Colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconAction}
                          onPress={() => handleDeleteNote(note)}>
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Scripture Quote */}
                    {note.scripture && (
                      <View style={styles.scriptureQuoteBox}>
                        <Text style={styles.scriptureQuoteText}>{note.scripture}</Text>
                      </View>
                    )}

                    {/* Meditation Body */}
                    <Text style={styles.noteContent}>{note.content}</Text>

                    {/* Footer: Tags & Steps */}
                    <View style={styles.noteFooterRow}>
                      <View style={styles.noteTagsRow}>
                        {note.tags?.map((t, idx) => (
                          <View key={idx} style={styles.noteTagPill}>
                            <Text style={styles.noteTagText}>#{t}</Text>
                          </View>
                        ))}
                      </View>

                      {note.steps_walked && (
                        <View style={styles.stepsBadge}>
                          <Ionicons name="footsteps" size={13} color={Colors.primary} />
                          <Text style={styles.stepsBadgeText}>
                            {note.steps_walked.toLocaleString()} steps
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Confetti Celebration */}
      <Confetti active={showConfetti} onAnimationEnd={() => setShowConfetti(false)} />

      {/* ===================== NEW / EDIT NOTE MODAL ===================== */}
      <Modal visible={isNoteModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.noteModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>
                {editingNote ? 'Edit Reflection' : 'New Meditation Note'}
              </Text>
              <TouchableOpacity
                onPress={() => setIsNoteModalOpen(false)}
                style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flexShrink: 1 }}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>NOTE TITLE *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Quiet Dawn on the Path"
                placeholderTextColor={Colors.textTertiary}
                value={noteTitle}
                onChangeText={setNoteTitle}
              />

              <Text style={styles.inputLabel}>SCRIPTURE ANCHOR (OPTIONAL)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Psalm 23:3 or Romans 8:28"
                placeholderTextColor={Colors.textTertiary}
                value={noteScripture}
                onChangeText={setNoteScripture}
              />

              <Text style={styles.inputLabel}>MEDITATION & PRAYER REFLECTIONS *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="What did God show you as you walked? What prayer or peace filled your heart?"
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={noteContent}
                onChangeText={setNoteContent}
              />

              <Text style={styles.inputLabel}>TAGS (COMMA SEPARATED)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="peace, morning walk, guidance"
                placeholderTextColor={Colors.textTertiary}
                value={noteTags}
                onChangeText={setNoteTags}
              />

              <Text style={styles.inputLabel}>STEPS WALKED DURING PRAYER</Text>
              <TextInput
                style={styles.textInput}
                placeholder={`Optional (Total walk record: ${totalStepsWalked.toLocaleString()})`}
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
                value={noteSteps}
                onChangeText={setNoteSteps}
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsNoteModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveNote}
                activeOpacity={0.85}>
                <Text style={styles.saveBtnText}>
                  {editingNote ? 'Save Changes' : 'Save to Journal'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================== DAY DETAIL MODAL ===================== */}
      {viewingDayPlan && (
        <Modal visible={Boolean(viewingDayPlan)} animationType="fade" transparent>
          <View style={styles.dayModalOverlay}>
            <View style={styles.dayModalCard}>
              <View style={styles.dayModalHeader}>
                <View>
                  <Text style={styles.dayModalPlanName}>{viewingDayPlan.plan.title}</Text>
                  <Text style={styles.dayModalDayTitle}>
                    Day {viewingDayPlan.day.day_number}: {viewingDayPlan.day.title}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setViewingDayPlan(null)}>
                  <Ionicons name="close-circle" size={26} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                <View style={styles.dayScriptureBox}>
                  <Ionicons name="bookmark-outline" size={16} color={Colors.primary} />
                  <Text style={styles.dayScriptureText}>{viewingDayPlan.day.scripture}</Text>
                </View>

                <Text style={styles.daySectionHeading}>REFLECTION</Text>
                <Text style={styles.dayReflectionText}>{viewingDayPlan.day.reflection}</Text>

                <Text style={styles.daySectionHeading}>WALKING PRAYER PROMPT</Text>
                <View style={styles.dayPromptBox}>
                  <Text style={styles.dayPromptText}>
                    &ldquo;{viewingDayPlan.day.prayer_prompt}&rdquo;
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.dayActionRow}>
                <TouchableOpacity
                  style={styles.dayWalkBtn}
                  onPress={() => {
                    setViewingDayPlan(null);
                    router.push('/prayer-walk');
                  }}
                  activeOpacity={0.85}>
                  <Ionicons name="footsteps" size={18} color="#FFFFFF" />
                  <Text style={styles.dayWalkBtnText}>Start Prayer Walk</Text>
                </TouchableOpacity>

                {!viewingDayPlan.isCompleted ? (
                  <TouchableOpacity
                    style={styles.dayCompleteBtn}
                    onPress={() =>
                      handleCompleteDay(
                        viewingDayPlan.plan.id,
                        viewingDayPlan.day.day_number
                      )
                    }
                    activeOpacity={0.8}>
                    <Text style={styles.dayCompleteBtnText}>✓ Complete Day</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.dayAlreadyDonePill}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                    <Text style={styles.dayAlreadyDoneText}>Completed</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ===================== CREATE CUSTOM PLAN MODAL ===================== */}
      <Modal visible={isCreatePlanOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={styles.planModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderTitle}>Create Prayer Plan</Text>
                <Text style={styles.modalHeaderSubtitle}>
                  Design a personal walking journey with God
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsCreatePlanOpen(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.planModalScrollView}
              contentContainerStyle={styles.planModalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              
              {/* PLAN TITLE */}
              <Text style={styles.inputLabel}>PLAN TITLE *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 14 Days of Healing & Hope"
                placeholderTextColor={Colors.textTertiary}
                value={customPlanTitle}
                onChangeText={setCustomPlanTitle}
              />

              {/* SUBTITLE */}
              <Text style={styles.inputLabel}>SUBTITLE / PURPOSE</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. A dedicated walk for personal restoration"
                placeholderTextColor={Colors.textTertiary}
                value={customPlanSubtitle}
                onChangeText={setCustomPlanSubtitle}
              />

              {/* NUMBER OF DAYS */}
              <View style={styles.labelWithBadgeRow}>
                <Text style={styles.inputLabel}>NUMBER OF DAYS</Text>
                <Text style={styles.selectedBadgeText}>
                  {isCustomDays
                    ? `${customDaysInput.trim() ? customDaysInput.trim() : 'Custom'} Days`
                    : `${customPlanDays} Days`}
                </Text>
              </View>

              <View style={styles.daysSelectorRow}>
                {['3', '7', '14', '21', '30'].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.daySelectChip,
                      !isCustomDays && customPlanDays === d && styles.daySelectChipActive,
                    ]}
                    onPress={() => {
                      setIsCustomDays(false);
                      setCustomPlanDays(d);
                    }}
                    activeOpacity={0.75}>
                    <Text
                      style={[
                        styles.daySelectChipText,
                        !isCustomDays && customPlanDays === d && styles.daySelectChipTextActive,
                      ]}>
                      {d} Days
                    </Text>
                  </TouchableOpacity>
                ))}

                {/* Custom Days Chip */}
                <TouchableOpacity
                  style={[
                    styles.daySelectChip,
                    isCustomDays && styles.daySelectChipActive,
                  ]}
                  onPress={() => setIsCustomDays(true)}
                  activeOpacity={0.75}>
                  <Ionicons
                    name="create-outline"
                    size={13}
                    color={isCustomDays ? Colors.primary : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.daySelectChipText,
                      isCustomDays && styles.daySelectChipTextActive,
                    ]}>
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Custom Days Input Field */}
              {isCustomDays && (
                <View style={styles.customFieldContainer}>
                  <View style={styles.customInputRow}>
                    <Ionicons name="calendar-outline" size={17} color={Colors.primary} />
                    <TextInput
                      style={styles.customInputField}
                      placeholder="Enter number (e.g. 5, 10, 40, 100)"
                      placeholderTextColor={Colors.textTertiary}
                      keyboardType="number-pad"
                      value={customDaysInput}
                      onChangeText={(t) => {
                        const numeric = t.replace(/[^0-9]/g, '');
                        setCustomDaysInput(numeric);
                        if (numeric) setCustomPlanDays(numeric);
                      }}
                      autoFocus
                    />
                    <Text style={styles.customUnitLabel}>Days</Text>
                  </View>
                  <Text style={styles.customHelperText}>
                    Enter any walk duration from 1 to 365 days.
                  </Text>
                </View>
              )}

              {/* CATEGORY */}
              <View style={styles.labelWithBadgeRow}>
                <Text style={styles.inputLabel}>CATEGORY</Text>
                <Text style={styles.selectedBadgeText}>
                  {isCustomCategory
                    ? (customCategoryInput.trim() || 'Custom')
                    : customPlanCategory}
                </Text>
              </View>

              <View style={styles.daysSelectorRow}>
                {['Spiritual', 'Family', 'Peace', 'Healing'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.daySelectChip,
                      !isCustomCategory && customPlanCategory === c && styles.daySelectChipActive,
                    ]}
                    onPress={() => {
                      setIsCustomCategory(false);
                      setCustomPlanCategory(c);
                    }}
                    activeOpacity={0.75}>
                    <Text
                      style={[
                        styles.daySelectChipText,
                        !isCustomCategory && customPlanCategory === c && styles.daySelectChipTextActive,
                      ]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}

                {/* Custom Category Chip */}
                <TouchableOpacity
                  style={[
                    styles.daySelectChip,
                    isCustomCategory && styles.daySelectChipActive,
                  ]}
                  onPress={() => setIsCustomCategory(true)}
                  activeOpacity={0.75}>
                  <Ionicons
                    name="pricetag-outline"
                    size={13}
                    color={isCustomCategory ? Colors.primary : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.daySelectChipText,
                      isCustomCategory && styles.daySelectChipTextActive,
                    ]}>
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Custom Category Input Field */}
              {isCustomCategory && (
                <View style={styles.customFieldContainer}>
                  <View style={styles.customInputRow}>
                    <Ionicons name="pencil-outline" size={17} color={Colors.primary} />
                    <TextInput
                      style={styles.customInputField}
                      placeholder="Type custom category (e.g. Gratitude, Marriage, Grief...)"
                      placeholderTextColor={Colors.textTertiary}
                      value={customCategoryInput}
                      onChangeText={(t) => {
                        setCustomCategoryInput(t);
                        if (t.trim()) setCustomPlanCategory(t.trim());
                      }}
                      autoFocus
                    />
                  </View>
                  <Text style={styles.customHelperText}>
                    Name any personal category or spiritual theme.
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsCreatePlanOpen(false)}
                activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={async () => {
                  if (!customPlanTitle.trim()) {
                    Alert.alert('Required', 'Please enter a title for your prayer plan.');
                    return;
                  }

                  let finalDays = parseInt(customPlanDays, 10);
                  if (isCustomDays) {
                    finalDays = parseInt(customDaysInput.trim(), 10);
                    if (isNaN(finalDays) || finalDays < 1 || finalDays > 365) {
                      Alert.alert('Invalid Days', 'Please enter a number of days between 1 and 365.');
                      return;
                    }
                  }

                  let finalCategory = customPlanCategory.trim();
                  if (isCustomCategory) {
                    finalCategory = customCategoryInput.trim();
                    if (!finalCategory) {
                      Alert.alert('Category Required', 'Please enter a name for your custom category.');
                      return;
                    }
                  }

                  const daysCount = finalDays || 7;
                  const customId = 'plan-custom-' + Date.now();
                  const sampleDays: PrayerPlanDay[] = Array.from(
                    { length: daysCount },
                    (_, i) => ({
                      day_number: i + 1,
                      title: `Step ${i + 1}: Walk in Faith`,
                      scripture: 'Hebrews 11:1 — "Faith is confidence in what we hope for and assurance about what we do not see."',
                      reflection:
                        'Take quiet, unhurried steps. Bring your specific petitions to God with an open and expectant heart.',
                      prayer_prompt: `Day ${i + 1} Walk: Lord, guide my steps today and soften my heart to Your voice.`,
                    })
                  );

                  const newCustomPlan: PrayerPlan = {
                    id: customId,
                    title: customPlanTitle.trim(),
                    subtitle: customPlanSubtitle.trim() || 'A custom prayer journey',
                    description: `Custom ${daysCount}-day walking prayer plan for ${finalCategory.toLowerCase()}.`,
                    category: finalCategory,
                    days_count: daysCount,
                    icon: 'footsteps',
                    badge_name: `${customPlanTitle.trim()} Finisher`,
                    days: sampleDays,
                  };

                  // Push to prayerPlans and start it
                  prayerPlans.unshift(newCustomPlan);
                  await startPrayerPlan(customId);
                  setIsCreatePlanOpen(false);
                  setShowConfetti(true);
                  if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Success
                    ).catch(() => {});
                  }
                }}
                activeOpacity={0.85}>
                <Text style={styles.saveBtnText}>Create & Start Plan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    padding: 6,
    marginRight: 4,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  addHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addHeaderBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  addHeaderBtnOutlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    marginHorizontal: Spacing.md,
    marginTop: 12,
    marginBottom: 6,
    padding: 4,
    borderRadius: BorderRadius.lg,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: Colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 60,
  },
  // Active Plan Banner
  activePlanBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginBottom: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  activePlanHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activeBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
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
    color: Colors.textTertiary,
  },
  activePlanTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  activePlanSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 14,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  progressPercent: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  todayPlanCard: {
    backgroundColor: '#F8FAF8',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2EBE2',
    marginBottom: Spacing.md,
  },
  todayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  todayCardDayNum: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  dayDonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  dayDoneText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  todayScripture: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 6,
  },
  todayReflection: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  promptBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginBottom: 12,
  },
  promptTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textTertiary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  promptText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  planActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  startWalkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  startWalkBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  completeDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FFFFFF',
  },
  completeDayBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  daysBreakdownTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textTertiary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayChipCompleted: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  dayChipCurrent: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.primary,
  },
  dayChipNum: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  dayChipNumCompleted: {
    color: Colors.primary,
  },
  dayChipNumCurrent: {
    color: Colors.primary,
  },
  dayChipTitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    maxWidth: 90,
  },
  dayChipTitleCompleted: {
    color: Colors.primary,
  },
  dayChipTitleCurrent: {
    color: Colors.text,
    fontWeight: '700',
  },
  // Curated Plans
  curatedSectionHeader: {
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  sectionSubheading: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  planCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  planTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  planIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planMeta: {
    flex: 1,
  },
  planBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 2,
  },
  planCategoryPill: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  planDaysPill: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  planTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  planDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  planBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 10,
  },
  planRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  planRewardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  startPlanBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  startPlanBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  continuePlanBtn: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  continuePlanBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  planCompletedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  planCompletedText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  // Notes Tab
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  tagsScrollView: {
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
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
  },
  emptyNotesBox: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyNotesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyNotesDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyNotesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
  },
  emptyNotesBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  noteTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  noteDate: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  noteActionIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconAction: {
    padding: 4,
  },
  scriptureQuoteBox: {
    backgroundColor: '#F8FAF8',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: 8,
    borderRadius: BorderRadius.sm,
    marginBottom: 8,
  },
  scriptureQuoteText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: Colors.text,
    lineHeight: 18,
  },
  noteContent: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  noteFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 8,
  },
  noteTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  noteTagPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  noteTagText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  stepsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  stepsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  noteModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 8,
  },
  planModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 8,
  },
  planModalScrollView: {
    flexShrink: 1,
  },
  planModalScrollContent: {
    paddingVertical: 10,
    paddingBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F1',
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  modalHeaderSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F4F6F4',
  },
  modalScrollContent: {
    paddingVertical: 14,
    paddingBottom: 16,
  },
  labelWithBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#FBFDFB',
    borderWidth: 1,
    borderColor: '#E2E8E2',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.text,
  },
  textArea: {
    minHeight: 110,
  },
  customFieldContainer: {
    marginTop: 10,
    marginBottom: 4,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4FAF4',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 8,
  },
  customInputField: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  customUnitLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    paddingRight: 4,
  },
  customHelperText: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 4,
    marginLeft: 4,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F1',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Day Modal
  dayModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  dayModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  dayModalPlanName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  dayModalDayTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  dayScriptureBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F8FAF8',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: 10,
    borderRadius: BorderRadius.sm,
    marginBottom: 14,
  },
  dayScriptureText: {
    flex: 1,
    fontSize: 13,
    fontStyle: 'italic',
    color: Colors.text,
    lineHeight: 19,
  },
  daySectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textTertiary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dayReflectionText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 14,
  },
  dayPromptBox: {
    backgroundColor: Colors.primaryLight,
    padding: 10,
    borderRadius: BorderRadius.md,
    marginBottom: 16,
  },
  dayPromptText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    fontStyle: 'italic',
  },
  dayActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  dayWalkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  dayWalkBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  dayCompleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCompleteBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  dayAlreadyDonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  dayAlreadyDoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  // Custom Plan Chips
  daysSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
    marginBottom: 6,
  },
  daySelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  daySelectChipActive: {
    backgroundColor: '#E8F5E9',
    borderColor: Colors.primary,
  },
  daySelectChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  daySelectChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
