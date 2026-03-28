import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPaymentSchema, getTodayISO, PAYMENT_METHODS } from '@bhai-store/shared';
import { useCreatePayment } from '../hooks/usePayments';
import { useCompanies, useEmployees } from '../hooks/useCorporate';
import toast from 'react-hot-toast';
import type { CreatePaymentRequest } from '@bhai-store/shared';

export default function PaymentForm() {
  const navigate = useNavigate();
  const createMutation = useCreatePayment();
  const { data: companiesRes } = useCompanies();
  const companies = companiesRes?.data || [];
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>();
  const { data: employeesRes } = useEmployees(selectedCompanyId);
  const employees = employeesRes?.data || [];

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CreatePaymentRequest>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      date: getTodayISO(),
      amount: 0,
      payment_method: 'cash',
      notes: '',
    },
  });

  const onSubmit = (data: CreatePaymentRequest) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Payment recorded!');
        navigate('/payments');
      },
      onError: () => toast.error('Failed to record payment'),
    });
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Record Payment</h2>
      <p className="text-gray-500 mb-6">Record a payment made to Bhai Bhai Store to reduce your credit balance.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Corporate Account (Optional) */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-purple-700">Corporate Account (optional)</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
              <select
                {...register('company_id', { valueAsNumber: true })}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setSelectedCompanyId(val);
                  setValue('company_id', val as any);
                  setValue('employee_id', undefined as any);
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Personal / Walk-in --</option>
                {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
              <select
                {...register('employee_id', { valueAsNumber: true })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                disabled={!selectedCompanyId}
              >
                <option value="">-- Select Employee --</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name} {e.designation ? `(${e.designation})` : ''}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" {...register('date')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" />
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
          <input type="number" step="any" {...register('amount', { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="Enter amount" />
          {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
          <select {...register('payment_method')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500">
            {PAYMENT_METHODS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <input type="text" {...register('notes')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="e.g., Monthly settlement" />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {createMutation.isPending ? 'Saving...' : 'Record Payment'}
          </button>
          <button type="button" onClick={() => navigate('/payments')} className="px-6 py-2 border rounded-lg hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
