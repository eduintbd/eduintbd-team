import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { usePayments, useCreatePayment } from '../../src/hooks/usePurchases';
import { formatCurrency, getTodayISO, PAYMENT_METHODS } from '@bhai-store/shared';
import type { CreatePaymentRequest } from '@bhai-store/shared';

export default function PaymentsScreen() {
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { data: res, isLoading, refetch } = usePayments({ page: 1 });
  const createMutation = useCreatePayment();

  const { control, handleSubmit, reset } = useForm<CreatePaymentRequest>({
    defaultValues: { date: getTodayISO(), amount: 0, payment_method: 'cash', notes: '' },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const onSubmit = (data: CreatePaymentRequest) => {
    data.amount = Number(data.amount);
    createMutation.mutate(data, {
      onSuccess: () => {
        Alert.alert('Success', 'Payment recorded!');
        setShowForm(false);
        reset();
      },
      onError: () => Alert.alert('Error', 'Failed to record payment'),
    });
  };

  const payments = res?.data || [];

  if (showForm) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Record Payment</Text>
          <TouchableOpacity onPress={() => setShowForm(false)}>
            <Text style={{ color: '#dc2626', fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <Controller control={control} name="date" render={({ field: { onChange, value } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" />
          </View>
        )} />

        <Controller control={control} name="amount" render={({ field: { onChange, value } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>Amount</Text>
            <TextInput style={styles.input} value={String(value)} onChangeText={onChange} keyboardType="numeric" placeholder="Enter amount" />
          </View>
        )} />

        <Controller control={control} name="payment_method" render={({ field: { onChange, value } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.methodRow}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  style={[styles.methodBtn, value === m.value && styles.methodBtnActive]}
                  onPress={() => onChange(m.value)}
                >
                  <Text style={[styles.methodText, value === m.value && styles.methodTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )} />

        <Controller control={control} name="notes" render={({ field: { onChange, value } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="e.g., Monthly settlement" />
          </View>
        )} />

        <TouchableOpacity
          style={[styles.submitBtn, createMutation.isPending && { opacity: 0.5 }]}
          onPress={handleSubmit(onSubmit)}
          disabled={createMutation.isPending}
        >
          <Text style={styles.submitText}>{createMutation.isPending ? 'Saving...' : 'Record Payment'}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Payments</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>+ Record</Text>
        </TouchableOpacity>
      </View>

      {payments.map((p: any) => (
        <View key={p.id} style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardDate}>{p.date}</Text>
            <Text style={styles.cardAmount}>{formatCurrency(p.amount)}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardMethod}>{p.payment_method}</Text>
            {p.notes && <Text style={styles.cardNotes}>{p.notes}</Text>}
          </View>
        </View>
      ))}
      {payments.length === 0 && !isLoading && (
        <Text style={styles.empty}>No payments recorded yet.</Text>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  addBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardDate: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  cardAmount: { fontSize: 16, fontWeight: 'bold', color: '#16a34a' },
  cardMethod: { fontSize: 12, color: '#6b7280', textTransform: 'capitalize' },
  cardNotes: { fontSize: 12, color: '#9ca3af' },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, backgroundColor: '#fff', fontSize: 14 },
  methodRow: { flexDirection: 'row', gap: 8 },
  methodBtn: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, alignItems: 'center' },
  methodBtnActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  methodText: { color: '#6b7280', fontSize: 13 },
  methodTextActive: { color: '#16a34a', fontWeight: '600' },
  submitBtn: { backgroundColor: '#2563eb', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#9ca3af', padding: 40 },
});
