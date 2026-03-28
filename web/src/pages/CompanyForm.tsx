import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCompanySchema } from '@bhai-store/shared';
import { useCreateCompany } from '../hooks/useCorporate';
import toast from 'react-hot-toast';
import type { CreateCompanyRequest } from '@bhai-store/shared';

export default function CompanyForm() {
  const navigate = useNavigate();
  const createMutation = useCreateCompany();

  const { register, handleSubmit, formState: { errors } } = useForm<CreateCompanyRequest>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: { name: '', address: '', phone: '', email: '', contact_person: '' },
  });

  const onSubmit = (data: CreateCompanyRequest) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Company added!');
        navigate('/companies');
      },
      onError: () => toast.error('Failed to add company'),
    });
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Add Corporate Account</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
          <input {...register('name')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="e.g., ABC Corporation" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input {...register('address')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="Office address" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input {...register('phone')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="01XXXXXXXXX" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" {...register('email')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="company@email.com" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
          <input {...register('contact_person')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="Main contact name" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={createMutation.isPending} className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium">
            {createMutation.isPending ? 'Saving...' : 'Add Company'}
          </button>
          <button type="button" onClick={() => navigate('/companies')} className="px-6 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
        </div>
      </form>
    </div>
  );
}
