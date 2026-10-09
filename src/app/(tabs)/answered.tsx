import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePrayer } from '@/context/PrayerContext';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { Confetti } from '@/components/Confetti';
import { Prayer } from '@/types/database';
import { differenceInCalendarDays, parseISO, format } from 'date-fns';

export default function AnsweredScreen() {
  const { prayers } = usePrayer();
  const answeredPrayers = prayers.filter((p) => p.status === 'answered');
  const [showConfetti, setShowConfetti] = useState(() => answeredPrayers.length > 0);

  const handleShareTestimony = async (prayer: Prayer) => {
    const days = prayer.answered_at && prayer.created_at
      ? differenceInCalendarDays(parseISO(prayer.answered_at), parseISO(prayer.created_at)) + 1
      : 1;

    const msg = `Praise God! My prayer was answered in Prayer Circle 🎉\n\n"${prayer.title}"\n\nTestimony: ${prayer.testimony || 'God answered in His perfect time!'}\n(Prayed for ${days} days)`;

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
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.headerTitle}>Answered Prayers</Text>
          <Text style={styles.headerSubtitle}>The Reward Wall of Faith</Text>
        </View>

        <View style={styles.counterBadge}>
          <Text style={styles.counterEmoji}>🏆</Text>
          <Text style={styles.counterText}>{answeredPrayers.length} Answered</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {answeredPrayers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🕊️</Text>
            <Text style={styles.emptyTitle}>No answered prayers yet</Text>
            <Text style={styles.emptyText}>
              Every small prayer is heard. When God answers, long-press the prayer on Today’s
              screen to record your testimony and celebrate here!
            </Text>
          </View>
        ) : (
          answeredPrayers.map((prayer) => {
            const daysPrayed =
              prayer.answered_at && prayer.created_at
                ? Math.max(
                    1,
                    differenceInCalendarDays(
                      parseISO(prayer.answered_at),
                      parseISO(prayer.created_at)
                    ) + 1
                  )
                : 1;

            const answeredDateFormatted = prayer.answered_at
              ? format(parseISO(prayer.answered_at), 'MMMM d, yyyy')
              : 'Recently';

            return (
              <View key={prayer.id} style={styles.answeredCard}>
                {/* Top Badge Row */}
                <View style={styles.cardTopRow}>
                  <View style={styles.praisePill}>
                    <Text style={styles.praiseEmoji}>✨</Text>
                    <Text style={styles.praiseText}>Answered in {daysPrayed} {daysPrayed === 1 ? 'day' : 'days'}</Text>
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
                    {prayer.privacy === 'group' ? '👥 Circle Prayer' : '🔒 Private Prayer'}
                  </Text>
                </View>

                {/* Testimony Block */}
                {prayer.testimony ? (
                  <View style={styles.testimonyBox}>
                    <Text style={styles.quoteMark}>“</Text>
                    <Text style={styles.testimonyText}>{prayer.testimony}</Text>
                    <Text style={styles.testimonyAuthor}>— My Testimony</Text>
                  </View>
                ) : null}

                {/* Share Button */}
                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={() => handleShareTestimony(prayer)}
                  activeOpacity={0.8}>
                  <Ionicons name="share-outline" size={16} color={Colors.primary} />
                  <Text style={styles.shareBtnText}>Share Testimony</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Confetti celebration when opening */}
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
  counterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF9C4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  counterEmoji: {
    fontSize: 14,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6F5603',
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 60,
    gap: Spacing.md,
  },
  answeredCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#FFE082',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
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
    gap: 4,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  praiseEmoji: {
    fontSize: 12,
  },
  praiseText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8D6E03',
  },
  dateText: {
    fontSize: 11,
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
    marginBottom: Spacing.sm,
  },
  categoryPill: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
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
    borderRadius: BorderRadius.md,
    padding: 12,
    marginVertical: 6,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  quoteMark: {
    fontSize: 22,
    color: Colors.primary,
    fontWeight: '800',
    lineHeight: 20,
  },
  testimonyText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  testimonyAuthor: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 6,
    fontWeight: '500',
    textAlign: 'right',
  },
  shareBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    height: 42,
    borderRadius: BorderRadius.button,
    marginTop: 8,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.lg,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
