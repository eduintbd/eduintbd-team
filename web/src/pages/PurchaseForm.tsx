import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPurchaseSchema, getTodayISO, formatCurrency } from '@bhai-store/shared';
import { useCreatePurchase } from '../hooks/usePurchases';
import { useItems } from '../hooks/useReports';
import { useCompanies, useEmployees } from '../hooks/useCorporate';
import toast from 'react-hot-toast';
import type { CreatePurchaseRequest } from '@bhai-store/shared';

export default function PurchaseForm() {
  const navigate = useNavigate();
  const createMutation = useCreatePurchase();
  const { data: itemsRes } = useItems();
  const items = itemsRes?.data || [];
  const [showSuggestions, setShowSuggestions] = useState<number | null>(null);
  const { data: companiesRes } = useCompanies();
  const companies = companiesRes?.data || [];
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>();
  const { data: employeesRes } = useEmployees(selectedCompanyId);
  const employees = employeesRes?.data || [];

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreatePurchaseRequest>({
    resolver: zodResolver(createPurchaseSchema),
    defaultValues: {
      date: getTodayISO(),
      paid_amount: 0,
      notes: '',
      items: [{ item_name: '', quantity: 1, unit_price: 0, total_price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchItems = watch('items');
  const watchPaid = watch('paid_amount');

  const totalAmount = watchItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const creditAmount = Math.max(0, totalAmount - (watchPaid || 0));

  const updateItemTotal = (index: number) => {
    const qty = watchItems[index]?.quantity || 0;
    const price = watchItems[index]?.unit_price || 0;
    setValue(`items.${index}.total_price`, qty * price);
  };

  const onSubmit = (data: CreatePurchaseRequest) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Purchase recorded!');
        navigate('/purchases');
      },
      onError: () => toast.error('Failed to create purchase'),
    });
  };

  const filterSuggestions = (query: string) => {
    if (!query) return [];
    return items.filter((i: any) => i.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
  };

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">New Purchase</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" {...register('date')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input type="text" {...register('notes')} placeholder="Optional notes" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">Items</label>
            <button
              type="button"
              onClick={() => append({ item_name: '', quantity: 1, unit_price: 0, total_price: 0 })}
              className="text-primary-600 text-sm hover:underline"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-start bg-gray-50 p-3 rounded-lg relative">
                <div className="flex-1 relative">
                  <input
                    {...register(`items.${index}.item_name`)}
                    placeholder="Item name"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    onFocus={() => setShowSuggestions(index)}
                    onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                    autoComplete="off"
                  />
                  {showSuggestions === index && filterSuggestions(watchItems[index]?.item_name).length > 0 && (
                    <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1">
                      {filterSuggestions(watchItems[index]?.item_name).map((item: any) => (
                        <button
                          key={item.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                          onMouseDown={() => {
                            setValue(`items.${index}.item_name`, item.name);
                            setValue(`items.${index}.item_id` as any, item.id);
                            setShowSuggestions(null);
                          }}
                        >
                          {item.name} <span className="text-gray-400">({item.unit})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    step="any"
                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    placeholder="Qty"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    onChange={(e) => {
                      register(`items.${index}.quantity`).onChange(e);
                      setTimeout(() => updateItemTotal(index), 0);
                    }}
                  />
                </div>
                <div className="w-28">
                  <input
                    type="number"
                    step="any"
                    {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                    placeholder="Price"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    onChange={(e) => {
                      register(`items.${index}.unit_price`).onChange(e);
                      setTimeout(() => updateItemTotal(index), 0);
                    }}
                  />
                </div>
                <div className="w-28 px-3 py-2 bg-white border rounded-lg text-sm text-right font-medium">
                  {formatCurrency(watchItems[index]?.total_price || 0)}
                </div>
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600 px-2 py-2">
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {errors.items && <p className="text-red-500 text-xs mt-1">{typeof errors.items.message === 'string' ? errors.items.message : ''}</p>}
        </div>

        {/* Totals */}
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <div className="flex justify-between text-lg font-semibold">
            <span>Total Amount</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount</label>
            <input
              type="number"
              step="any"
              {...register('paid_amount', { valueAsNumber: true })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-between text-lg font-semibold text-red-600">
            <span>Credit (Payable)</span>
            <span>{formatCurrency(creditAmount)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
          >
            {createMutation.isPending ? 'Saving...' : 'Save Purchase'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/purchases')}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
