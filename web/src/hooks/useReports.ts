import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

export function useSummary() {
  return useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => api.get('/reports/summary').then(r => r.data),
  });
}

export function useMonthlyReport(year?: number) {
  return useQuery({
    queryKey: ['reports', 'monthly', year],
    queryFn: () => api.get('/reports/monthly', { params: { year } }).then(r => r.data),
  });
}

export function useTopItems(params?: { from?: string; to?: string; limit?: number }) {
  return useQuery({
    queryKey: ['reports', 'top-items', params],
    queryFn: () => api.get('/reports/top-items', { params }).then(r => r.data),
  });
}

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: () => api.get('/items').then(r => r.data),
  });
}
