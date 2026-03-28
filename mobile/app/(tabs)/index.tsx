import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useSummary, usePurchases } from '../../src/hooks/usePurchases';
import { formatCurrency, STORE_NAME } from '@bhai-store/shared';
import { useState } from 'react';

export default function DashboardScreen() {
  const { data: summaryRes, isLoading, refetch } = useSummary();
  const { data: purchasesRes } = usePurchases({ page: 1 });
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const summary = summaryRes?.data;
  const recentPurchases = (purchasesRes?.data || []).slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
    >
      <Text style={styles.storeName}>{STORE_NAME}</Text>

      {/* Outstanding Balance */}
      {summary && (
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Outstanding Balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(summary.outstanding_balance)}</Text>
          <Text style={styles.balanceSub}>Payable to {STORE_NAME}</Text>
        </View>
      )}

      {/* Quick Stats */}
      {summary && (
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
            <Text style={[styles.statLabel, { color: '#2563eb' }]}>Total Spent</Text>
            <Text style={[styles.statValue, { color: '#1d4ed8' }]}>{formatCurrency(summary.total_spent)}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}>
            <Text style={[styles.statLabel, { color: '#16a34a' }]}>Total Paid</Text>
            <Text style={[styles.statValue, { color: '#15803d' }]}>{formatCurrency(summary.total_paid + summary.total_payments_made)}</Text>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#16a34a' }]} onPress={() => router.push('/(tabs)/purchases')}>
          <Text style={styles.actionText}>+ New Purchase</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2563eb' }]} onPress={() => router.push('/(tabs)/payments')}>
          <Text style={styles.actionText}>+ Record Payment</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Purchases */}
      <Text style={styles.sectionTitle}>Recent Purchases</Text>
      {recentPurchases.map((p: any) => (
        <View key={p.id} style={styles.purchaseItem}>
          <View>
            <Text style={styles.purchaseDate}>{p.date}</Text>
            <Text style={styles.purchaseStatus}>{p.payment_status}</Text>
          </View>
          <Text style={styles.purchaseAmount}>{formatCurrency(p.total_amount)}</Text>
        </View>
      ))}
      {recentPurchases.length === 0 && !isLoading && (
        <Text style={styles.empty}>No purchases yet</Text>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  storeName: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  balanceCard: { backgroundColor: '#fef2f2', borderRadius: 16, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: '#fecaca' },
  balanceLabel: { color: '#dc2626', fontSize: 14, fontWeight: '500' },
  balanceAmount: { color: '#b91c1c', fontSize: 36, fontWeight: 'bold', marginTop: 8 },
  balanceSub: { color: '#f87171', fontSize: 12, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 12, padding: 16 },
  statLabel: { fontSize: 12, fontWeight: '500' },
  statValue: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },
  purchaseItem: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  purchaseDate: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  purchaseStatus: { fontSize: 12, color: '#6b7280', marginTop: 2, textTransform: 'capitalize' },
  purchaseAmount: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  empty: { textAlign: 'center', color: '#9ca3af', padding: 20 },
});
