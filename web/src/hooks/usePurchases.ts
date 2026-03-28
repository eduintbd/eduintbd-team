import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import type { CreatePurchaseRequest } from '@bhai-store/shared';

export function usePurchases(params?: { from?: string; to?: string; status?: string; page?: number }) {
  return useQuery({
    queryKey: ['purchases', params],
    queryFn: () => api.get('/purchases', { params }).then(r => r.data),
  });
}

export function usePurchase(id: number) {
  return useQuery({
    queryKey: ['purchases', id],
    queryFn: () => api.get(`/purchases/${id}`).then(r => r.data),
    enabled: !!id,
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

export function useUpdatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreatePurchaseRequest> }) =>
      api.put(`/purchases/${id}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useDeletePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/purchases/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
