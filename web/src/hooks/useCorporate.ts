import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import type { CreateCompanyRequest, CreateEmployeeRequest } from '@bhai-store/shared';

// Companies
export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  });
}

export function useCompany(id: number) {
  return useQuery({
    queryKey: ['companies', id],
    queryFn: () => api.get(`/companies/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCompanyRequest) => api.post('/companies', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/companies/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/companies/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}

// Employees
export function useEmployees(companyId?: number) {
  return useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => api.get('/employees', { params: companyId ? { company_id: companyId } : {} }).then(r => r.data),
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEmployeeRequest) => api.post('/employees', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/employees/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

// Statements
export function useCompanyStatement(companyId: number, from?: string, to?: string) {
  return useQuery({
    queryKey: ['statements', 'company', companyId, from, to],
    queryFn: () => api.get(`/statements/company/${companyId}`, { params: { from, to } }).then(r => r.data),
    enabled: !!companyId,
  });
}

export function useEmployeeStatement(employeeId: number, from?: string, to?: string) {
  return useQuery({
    queryKey: ['statements', 'employee', employeeId, from, to],
    queryFn: () => api.get(`/statements/employee/${employeeId}`, { params: { from, to } }).then(r => r.data),
    enabled: !!employeeId,
  });
}
