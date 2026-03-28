import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEmployeeSchema } from '@bhai-store/shared';
import { useCreateEmployee, useCompany } from '../hooks/useCorporate';
import toast from 'react-hot-toast';
import type { CreateEmployeeRequest } from '@bhai-store/shared';

export default function EmployeeForm() {
  const { companyId } = useParams();
  const cId = Number(companyId);
  const navigate = useNavigate();
  const createMutation = useCreateEmployee();
  const { data: companyRes } = useCompany(cId);

  const { register, handleSubmit, formState: { errors } } = useForm<CreateEmployeeRequest>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: { company_id: cId, name: '', designation: '', phone: '' },
  });

  const onSubmit = (data: CreateEmployeeRequest) => {
    createMutation.mutate({ ...data, company_id: cId }, {
      onSuccess: () => {
        toast.success('Employee added!');
        navigate(`/companies/${cId}/employees`);
      },
      onError: () => toast.error('Failed to add employee'),
    });
  };

  return (
    <div className="max-w-lg">
      <Link to={`/companies/${cId}/employees`} className="text-purple-600 hover:underline text-sm">
        Back to {companyRes?.data?.name || 'Company'}
      </Link>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 mt-2">Add Employee</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name *</label>
          <input {...register('name')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Full name" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
          <input {...register('designation')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g., Manager, Staff" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input {...register('phone')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="01XXXXXXXXX" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={createMutation.isPending} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
            {createMutation.isPending ? 'Saving...' : 'Add Employee'}
          </button>
          <button type="button" onClick={() => navigate(`/companies/${cId}/employees`)} className="px-6 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
        </div>
      </form>
    </div>
  );
}
