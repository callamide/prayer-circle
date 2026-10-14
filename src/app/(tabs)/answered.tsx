import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  Modal,
  TextInput,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePrayer } from '@/context/PrayerContext';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { Confetti } from '@/components/Confetti';
import { Prayer, PrayerCategory } from '@/types/database';
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

export default function AnsweredScreen() {
  const { prayers, addAnsweredPrayer, updateTestimony } = usePrayer();

  const answeredPrayers = useMemo(() => prayers.filter((p) => p.status === 'answered'), [prayers]);
  const [selectedCategory, setSelectedCategory] = useState<'All' | PrayerCategory>('All');
  const [showConfetti, setShowConfetti] = useState(() => answeredPrayers.length > 0);

  // New Answered Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTestimony, setNewTestimony] = useState('');
  const [newCategory, setNewCategory] = useState<PrayerCategory>('Spiritual');
  const [addError, setAddError] = useState('');

  // Edit / View Modal state
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
  const [editedTestimony, setEditedTestimony] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Share Card Modal state
  const [sharingPrayer, setSharingPrayer] = useState<Prayer | null>(null);

  const filteredPrayers = useMemo(() => {
    return selectedCategory === 'All'
      ? answeredPrayers
      : answeredPrayers.filter((p) => p.category === selectedCategory);
  }, [selectedCategory, answeredPrayers]);

  const handleOpenAddModal = () => {
    setNewTitle('');
    setNewTestimony('');
    setNewCategory('Spiritual');
    setAddError('');
    setIsAddModalOpen(true);
  };

  const handleSaveNewAnswered = async () => {
    if (!newTitle.trim()) {
      setAddError('Please enter what prayer God answered.');
      return;
    }
    if (!newTestimony.trim()) {
      setAddError('Please share a short testimony of what happened.');
      return;
    }

    await addAnsweredPrayer({
      title: newTitle.trim(),
      testimony: newTestimony.trim(),
      category: newCategory,
    });

    setIsAddModalOpen(false);
    setShowConfetti(true);
  };

  const handleOpenDetail = (prayer: Prayer) => {
    setSelectedPrayer(prayer);
    setEditedTestimony(prayer.testimony || '');
    setIsEditing(false);
  };

  const handleSaveEditedTestimony = async () => {
    if (selectedPrayer && editedTestimony.trim()) {
      await updateTestimony(selectedPrayer.id, editedTestimony.trim());
      setSelectedPrayer({ ...selectedPrayer, testimony: editedTestimony.trim() });
      setIsEditing(false);
    }
  };

  const handleShareCard = async (prayer: Prayer) => {
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
          alert('Testimony copied:\n\n' + msg);
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.headerTitle}>Answered Prayers</Text>
          <Text style={styles.headerSubtitle}>The Reward Wall of Faith</Text>
        </View>

        <TouchableOpacity
          style={styles.recordPraiseBtn}
          onPress={handleOpenAddModal}
          activeOpacity={0.85}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.recordPraiseBtnText}>+ Record Praise</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter Chips */}
      <View style={styles.categoryBarContainer}>
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
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.8}>
                <Text
                  style={[
                    styles.categoryChipText,
                    isActive && styles.categoryChipTextActive,
                  ]}>
                  {cat} {count > 0 ? `(${count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {filteredPrayers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🕊️</Text>
            <Text style={styles.emptyTitle}>
              {selectedCategory === 'All'
                ? 'No answered prayers yet'
                : `No answered ${selectedCategory} prayers yet`}
            </Text>
            <Text style={styles.emptyText}>
              Every faithful step is heard. When God provides breakthrough, tap “+ Record Praise”
              above or mark a prayer as answered to celebrate God’s faithfulness here!
            </Text>
            <TouchableOpacity
              style={[styles.recordPraiseBtn, { marginTop: 16 }]}
              onPress={handleOpenAddModal}>
              <Text style={styles.recordPraiseBtnText}>+ Write Your First Testimony</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredPrayers.map((prayer) => {
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
                style={styles.answeredCard}
                onPress={() => handleOpenDetail(prayer)}
                activeOpacity={0.9}>
                {/* Top Badge Row */}
                <View style={styles.cardTopRow}>
                  <View style={styles.praisePill}>
                    <Text style={styles.praiseEmoji}>✨</Text>
                    <Text style={styles.praiseText}>
                      Answered in {daysPrayed} {daysPrayed === 1 ? 'day' : 'days'}
                    </Text>
                  </View>

                  <Text style={styles.dateText}>{answeredDateFormatted}</Text>
                </View>

                {/* Prayer Title */}
                <Text style={styles.prayerTitle}>{prayer.title}</Text>

                {/* Category & Scope */}
                <View style={styles.metaRow}>
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryText}>{prayer.category}</Text>
                  </View>
                  <Text style={styles.scopeText}>
                    {prayer.privacy === 'group' ? '👥 Circle Prayer' : '🔒 Personal Walk'}
                  </Text>
                </View>

                {/* Testimony Block */}
                {prayer.testimony ? (
                  <View style={styles.testimonyBox}>
                    <Text style={styles.quoteMark}>“</Text>
                    <Text style={styles.testimonyText}>{prayer.testimony}</Text>
                    <View style={styles.testimonyFooter}>
                      <Text style={styles.testimonyAuthor}>— My Testimony</Text>
                      <Text style={styles.tapToEditHint}>Tap to view / edit</Text>
                    </View>
                  </View>
                ) : null}

                {/* Action Buttons Row */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={() => setSharingPrayer(prayer)}
                    activeOpacity={0.8}>
                    <Ionicons name="card-outline" size={16} color={Colors.primary} />
                    <Text style={styles.shareBtnText}>Testimony Card</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.shareTextBtn}
                    onPress={() => handleShareCard(prayer)}
                    activeOpacity={0.8}>
                    <Ionicons name="share-social-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.shareTextBtnText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* MODAL 1: RECORD NEW ANSWERED PRAYER */}
      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Answered Prayer ✨</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>WHAT DID GOD ANSWER?</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Mama’s complete healing, New job offer"
                placeholderTextColor={Colors.textTertiary}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={styles.inputLabel}>CATEGORY</Text>
              <View style={styles.categoryModalRow}>
                {(['Family', 'Health', 'Spiritual', 'Work', 'Other'] as PrayerCategory[]).map(
                  (c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.catModalChip,
                        newCategory === c && styles.catModalChipActive,
                      ]}
                      onPress={() => setNewCategory(c)}>
                      <Text
                        style={[
                          styles.catModalChipText,
                          newCategory === c && styles.catModalChipTextActive,
                        ]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              <Text style={styles.inputLabel}>SHARE YOUR TESTIMONY</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="How did God answer? Share the breakthrough, unexpected peace, or miracle..."
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={4}
                value={newTestimony}
                onChangeText={setNewTestimony}
              />



              {addError ? <Text style={styles.errorText}>{addError}</Text> : null}

              <TouchableOpacity
                style={styles.savePraiseBtn}
                onPress={handleSaveNewAnswered}
                activeOpacity={0.85}>
                <Text style={styles.savePraiseBtnText}>Save to Reward Wall 🎉</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 2: EDIT TESTIMONY & DETAILS */}
      <Modal visible={Boolean(selectedPrayer)} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Testimony Details</Text>
              <TouchableOpacity onPress={() => setSelectedPrayer(null)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedPrayer ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.detailPrayerTitle}>{selectedPrayer.title}</Text>
                <Text style={styles.detailDateText}>
                  Recorded on{' '}
                  {selectedPrayer.answered_at
                    ? format(parseISO(selectedPrayer.answered_at), 'MMMM d, yyyy')
                    : 'Recently'}
                </Text>

                <View style={styles.testimonyBox}>
                  <Text style={styles.quoteMark}>“</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.editTestimonyInput}
                      multiline
                      value={editedTestimony}
                      onChangeText={setEditedTestimony}
                    />
                  ) : (
                    <Text style={styles.testimonyText}>
                      {selectedPrayer.testimony || 'No testimony written yet.'}
                    </Text>
                  )}
                </View>

                {isEditing ? (
                  <TouchableOpacity
                    style={styles.savePraiseBtn}
                    onPress={handleSaveEditedTestimony}>
                    <Text style={styles.savePraiseBtnText}>Save Updated Testimony</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.modalButtonsRow}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => setIsEditing(true)}>
                      <Ionicons name="pencil" size={16} color={Colors.text} />
                      <Text style={styles.editBtnText}>Edit Testimony</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cardShareBtn}
                      onPress={() => {
                        const target = selectedPrayer;
                        setSelectedPrayer(null);
                        setSharingPrayer(target);
                      }}>
                      <Ionicons name="card-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.cardShareBtnText}>Share Card</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 3: GRAPHIC TESTIMONY CARD PREVIEW & SHARE */}
      <Modal visible={Boolean(sharingPrayer)} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalDialog, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Shareable Praise Card</Text>
              <TouchableOpacity onPress={() => setSharingPrayer(null)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {sharingPrayer ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Visual Graphic Card Container */}
                <View style={styles.graphicCard}>
                  {/* Brand Header */}
                  <View style={styles.graphicHeaderRow}>
                    <Image source={LOGO_IMG} style={styles.graphicLogoThumb} resizeMode="cover" />
                    <View>
                      <Text style={styles.graphicBrandName}>Prayer Walk</Text>
                      <Text style={styles.graphicTagline}>Walk with God. Pray every step.</Text>
                    </View>
                  </View>

                  {/* Praise Badge */}
                  <View style={styles.graphicBadge}>
                    <Text style={styles.graphicBadgeText}>✨ PRAISE REPORT • GOD ANSWERED</Text>
                  </View>

                  {/* Prayer Title */}
                  <Text style={styles.graphicTitle}>“{sharingPrayer.title}”</Text>

                  {/* Quote Body */}
                  <View style={styles.graphicQuoteBox}>
                    <Text style={styles.graphicQuoteText}>
                      “{sharingPrayer.testimony || 'God answered in His perfect faithfulness.'}”
                    </Text>
                  </View>

                  {/* Category & Date */}
                  <View style={styles.graphicFooterRow}>
                    <Text style={styles.graphicCategoryText}>🏷️ {sharingPrayer.category}</Text>
                    <Text style={styles.graphicDateText}>
                      {sharingPrayer.answered_at
                        ? format(parseISO(sharingPrayer.answered_at), 'MMMM yyyy')
                        : 'Faithfully Answered'}
                    </Text>
                  </View>
                </View>

                {/* Share Actions */}
                <TouchableOpacity
                  style={styles.shareWhatsAppBtn}
                  onPress={() => handleShareCard(sharingPrayer)}>
                  <Ionicons name="share-social" size={20} color="#FFFFFF" />
                  <Text style={styles.shareWhatsAppBtnText}>Share Testimony to Circle / WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeCardBtn}
                  onPress={() => setSharingPrayer(null)}>
                  <Text style={styles.closeCardBtnText}>Done</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Confetti celebration */}
      <Confetti
        active={showConfetti}
        onAnimationEnd={() => setShowConfetti(false)}
        count={50}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  recordPraiseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.button,
    gap: 4,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  recordPraiseBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  categoryBarContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingVertical: 8,
  },
  categoryBar: {
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: '#E8F5E9',
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.card,
    padding: Spacing.xl,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  answeredCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  praisePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  praiseEmoji: {
    fontSize: 12,
  },
  praiseText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  dateText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  prayerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  scopeText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  testimonyBox: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  quoteMark: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
    lineHeight: 20,
    marginBottom: 2,
  },
  testimonyText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  testimonyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  testimonyAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  tapToEditHint: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
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
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  shareTextBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalDialog: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  modalTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryModalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  catModalChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catModalChipActive: {
    backgroundColor: '#E8F5E9',
    borderColor: Colors.primary,
  },
  catModalChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  catModalChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    marginTop: 8,
  },
  savePraiseBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 20,
  },
  savePraiseBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  detailPrayerTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.button,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: Colors.border,
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
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.button,
    backgroundColor: Colors.primary,
  },
  cardShareBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  graphicCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  graphicHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  graphicLogoThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  graphicBrandName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  graphicTagline: {
    fontSize: 11,
    color: '#94A3B8',
  },
  graphicBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  graphicBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  graphicTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 24,
  },
  graphicQuoteBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#34D399',
  },
  graphicQuoteText: {
    fontSize: 14,
    color: '#F1F5F9',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  graphicFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  graphicCategoryText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  graphicDateText: {
    fontSize: 11,
    color: '#64748B',
  },
  shareWhatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    borderRadius: BorderRadius.button,
    paddingVertical: 14,
    marginBottom: 8,
  },
  shareWhatsAppBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  closeCardBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  closeCardBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
