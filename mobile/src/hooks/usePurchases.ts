import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { CreatePurchaseRequest } from '@bhai-store/shared';

export function usePurchases(params?: { page?: number; status?: string }) {
  return useQuery({
    queryKey: ['purchases', params],
    queryFn: () => api.get('/purchases', { params }).then(r => r.data),
  });
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePurchaseRequest) => api.post('/purchases', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useSummary() {
  return useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => api.get('/reports/summary').then(r => r.data),
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/payments', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function usePayments(params?: { page?: number }) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: () => api.get('/payments', { params }).then(r => r.data),
  });
}

export function useMonthlyReport(year?: number) {
  return useQuery({
    queryKey: ['reports', 'monthly', year],
    queryFn: () => api.get('/reports/monthly', { params: { year } }).then(r => r.data),
  });
}
