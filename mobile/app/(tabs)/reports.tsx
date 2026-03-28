import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSummary, useMonthlyReport } from '../../src/hooks/usePurchases';
import { formatCurrency, getMonthName } from '@bhai-store/shared';
import { useState } from 'react';

export default function ReportsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const year = new Date().getFullYear();
  const { data: summaryRes, refetch } = useSummary();
  const { data: monthlyRes } = useMonthlyReport(year);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const summary = summaryRes?.data;
  const monthly = monthlyRes?.data || [];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
    >
      <Text style={styles.title}>Reports</Text>

      {summary && (
        <>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Outstanding Balance</Text>
            <Text style={styles.balanceAmount}>{formatCurrency(summary.outstanding_balance)}</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
              <Text style={[styles.statLabel, { color: '#2563eb' }]}>Total Spent</Text>
              <Text style={[styles.statValue, { color: '#1d4ed8' }]}>{formatCurrency(summary.total_spent)}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}>
              <Text style={[styles.statLabel, { color: '#16a34a' }]}>Total Paid</Text>
              <Text style={[styles.statValue, { color: '#15803d' }]}>{formatCurrency(summary.total_paid)}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#fef2f2' }]}>
              <Text style={[styles.statLabel, { color: '#dc2626' }]}>Total Credit</Text>
              <Text style={[styles.statValue, { color: '#b91c1c' }]}>{formatCurrency(summary.total_credit)}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#fefce8' }]}>
              <Text style={[styles.statLabel, { color: '#ca8a04' }]}>Payments Made</Text>
              <Text style={[styles.statValue, { color: '#a16207' }]}>{formatCurrency(summary.total_payments_made)}</Text>
            </View>
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Monthly Breakdown ({year})</Text>
      {monthly.map((m: any) => (
        <View key={m.month} style={styles.monthCard}>
          <Text style={styles.monthName}>{getMonthName(Number(m.month))}</Text>
          <View style={styles.monthStats}>
            <Text style={styles.monthStat}>Spent: {formatCurrency(m.total_spent)}</Text>
            <Text style={[styles.monthStat, { color: '#16a34a' }]}>Paid: {formatCurrency(m.total_paid)}</Text>
            <Text style={[styles.monthStat, { color: '#dc2626' }]}>Credit: {formatCurrency(m.total_credit)}</Text>
          </View>
          <Text style={styles.monthPurchases}>{m.purchase_count} purchases</Text>
        </View>
      ))}
      {monthly.length === 0 && (
        <Text style={styles.empty}>No data for {year}</Text>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  balanceCard: { backgroundColor: '#fef2f2', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#fecaca' },
  balanceLabel: { color: '#dc2626', fontSize: 14, fontWeight: '500' },
  balanceAmount: { color: '#b91c1c', fontSize: 32, fontWeight: 'bold', marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  statCard: { width: '48%', borderRadius: 12, padding: 14 },
  statLabel: { fontSize: 11, fontWeight: '500' },
  statValue: { fontSize: 16, fontWeight: 'bold', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },
  monthCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8 },
  monthName: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 8 },
  monthStats: { flexDirection: 'row', gap: 12 },
  monthStat: { fontSize: 12, color: '#6b7280' },
  monthPurchases: { fontSize: 11, color: '#9ca3af', marginTop: 6 },
  empty: { textAlign: 'center', color: '#9ca3af', padding: 40 },
});
