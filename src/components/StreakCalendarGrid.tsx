import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { ContributionCell } from '@/lib/streak';

interface StreakCalendarGridProps {
  cells: ContributionCell[];
}

export const StreakCalendarGrid: React.FC<StreakCalendarGridProps> = ({ cells }) => {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>CONSISTENCY GRID</Text>
        <Text style={styles.subtitle}>Past 5 weeks</Text>
      </View>

      {/* Grid: 5 rows x 7 columns */}
      <View style={styles.gridContainer}>
        {cells.map((cell, index) => {
          let bg = '#EDF1ED'; // no prayer
          if (cell.level === 1) bg = '#81C784'; // prayed 1 time
          if (cell.level === 2) bg = '#2E7D32'; // prayed 2+ times

          return (
            <View
              key={cell.dateStr || index}
              style={[
                styles.cell,
                { backgroundColor: bg },
                cell.isToday && styles.cellToday,
              ]}
            />
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <Text style={styles.legendText}>Less</Text>
        <View style={[styles.legendCell, { backgroundColor: '#EDF1ED' }]} />
        <View style={[styles.legendCell, { backgroundColor: '#81C784' }]} />
        <View style={[styles.legendCell, { backgroundColor: '#2E7D32' }]} />
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  cell: {
    width: '12%',
    aspectRatio: 1,
    borderRadius: 4,
  },
  cellToday: {
    borderColor: Colors.accent,
    borderWidth: 1.5,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: Spacing.sm,
  },
  legendText: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
