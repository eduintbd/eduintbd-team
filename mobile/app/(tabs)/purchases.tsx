import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { usePurchases, useCreatePurchase } from '../../src/hooks/usePurchases';
import { formatCurrency, getTodayISO } from '@bhai-store/shared';
import type { CreatePurchaseRequest } from '@bhai-store/shared';

export default function PurchasesScreen() {
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { data: res, isLoading, refetch } = usePurchases({ page: 1 });
  const createMutation = useCreatePurchase();

  const { control, handleSubmit, reset, watch } = useForm<CreatePurchaseRequest>({
    defaultValues: {
      date: getTodayISO(),
      paid_amount: 0,
      notes: '',
      items: [{ item_name: '', quantity: 1, unit_price: 0, total_price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const onSubmit = (data: CreatePurchaseRequest) => {
    // Calculate totals
    data.items = data.items.map(item => ({
      ...item,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      total_price: Number(item.quantity) * Number(item.unit_price),
    }));
    data.paid_amount = Number(data.paid_amount);

    createMutation.mutate(data, {
      onSuccess: () => {
        Alert.alert('Success', 'Purchase recorded!');
        setShowForm(false);
        reset();
      },
      onError: () => Alert.alert('Error', 'Failed to create purchase'),
    });
  };

  const purchases = res?.data || [];

  if (showForm) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.formHeader}>
          <Text style={styles.title}>New Purchase</Text>
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

        <Text style={[styles.label, { marginTop: 16 }]}>Items</Text>
        {fields.map((field, index) => (
          <View key={field.id} style={styles.itemRow}>
            <Controller control={control} name={`items.${index}.item_name`} render={({ field: { onChange, value } }) => (
              <TextInput style={[styles.input, { flex: 1 }]} value={value} onChangeText={onChange} placeholder="Item name" />
            )} />
            <Controller control={control} name={`items.${index}.quantity`} render={({ field: { onChange, value } }) => (
              <TextInput style={[styles.input, { width: 60 }]} value={String(value)} onChangeText={onChange} placeholder="Qty" keyboardType="numeric" />
            )} />
            <Controller control={control} name={`items.${index}.unit_price`} render={({ field: { onChange, value } }) => (
              <TextInput style={[styles.input, { width: 80 }]} value={String(value)} onChangeText={onChange} placeholder="Price" keyboardType="numeric" />
            )} />
            {fields.length > 1 && (
              <TouchableOpacity onPress={() => remove(index)} style={{ padding: 8 }}>
                <Text style={{ color: '#dc2626' }}>X</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity onPress={() => append({ item_name: '', quantity: 1, unit_price: 0, total_price: 0 })}>
          <Text style={{ color: '#16a34a', marginTop: 8 }}>+ Add Item</Text>
        </TouchableOpacity>

        <Controller control={control} name="paid_amount" render={({ field: { onChange, value } }) => (
          <View style={[styles.field, { marginTop: 16 }]}>
            <Text style={styles.label}>Paid Amount</Text>
            <TextInput style={styles.input} value={String(value)} onChangeText={onChange} keyboardType="numeric" placeholder="0" />
          </View>
        )} />

        <Controller control={control} name="notes" render={({ field: { onChange, value } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>Notes</Text>
            <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="Optional notes" />
          </View>
        )} />

        <TouchableOpacity
          style={[styles.submitBtn, createMutation.isPending && { opacity: 0.5 }]}
          onPress={handleSubmit(onSubmit)}
          disabled={createMutation.isPending}
        >
          <Text style={styles.submitText}>{createMutation.isPending ? 'Saving...' : 'Save Purchase'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
    >
      <View style={styles.formHeader}>
        <Text style={styles.title}>Purchases</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>+ New</Text>
        </TouchableOpacity>
      </View>

      {purchases.map((p: any) => (
        <View key={p.id} style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardDate}>{p.date}</Text>
            <Text style={[styles.badge, p.payment_status === 'paid' ? styles.badgePaid : p.payment_status === 'credit' ? styles.badgeCredit : styles.badgePartial]}>
              {p.payment_status}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Total: {formatCurrency(p.total_amount)}</Text>
            <Text style={{ color: '#dc2626', fontSize: 12 }}>Credit: {formatCurrency(p.credit_amount)}</Text>
          </View>
          {p.notes && <Text style={styles.cardNotes}>{p.notes}</Text>}
        </View>
      ))}
      {purchases.length === 0 && !isLoading && (
        <Text style={styles.empty}>No purchases yet. Tap "+ New" to add one.</Text>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  addBtn: { backgroundColor: '#16a34a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardDate: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  cardLabel: { fontSize: 12, color: '#6b7280' },
  cardNotes: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, fontSize: 11, fontWeight: '600', overflow: 'hidden', textTransform: 'capitalize' },
  badgePaid: { backgroundColor: '#dcfce7', color: '#16a34a' },
  badgeCredit: { backgroundColor: '#fef2f2', color: '#dc2626' },
  badgePartial: { backgroundColor: '#fef9c3', color: '#ca8a04' },
  field: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, backgroundColor: '#fff', fontSize: 14 },
  itemRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  submitBtn: { backgroundColor: '#16a34a', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#9ca3af', padding: 40 },
});
