import { Link } from 'react-router-dom';
import { useCompanies, useDeleteCompany } from '../hooks/useCorporate';
import { formatCurrency } from '@bhai-store/shared';
import toast from 'react-hot-toast';

export default function Companies() {
  const { data: res, isLoading } = useCompanies();
  const deleteMutation = useDeleteCompany();

  const handleDelete = (id: number) => {
    if (!confirm('Delete this company and all its employees?')) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Company deleted'),
      onError: () => toast.error('Failed to delete'),
    });
  };

  const companies = res?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Corporate Accounts</h2>
        <Link
          to="/companies/new"
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
        >
          + Add Company
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((c: any) => (
            <div key={c.id} className="bg-white border rounded-xl p-6 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">{c.name}</h3>
                  {c.contact_person && <p className="text-sm text-gray-500">Contact: {c.contact_person}</p>}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {c.address && <p className="text-sm text-gray-500">{c.address}</p>}
              {c.phone && <p className="text-sm text-gray-500">{c.phone}</p>}
              <div className="flex gap-2 pt-2 border-t">
                <Link to={`/statements/company/${c.id}`} className="text-purple-600 hover:underline text-sm font-medium">
                  Statement
                </Link>
                <Link to={`/companies/${c.id}/employees`} className="text-blue-600 hover:underline text-sm font-medium">
                  Employees
                </Link>
                <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:underline text-sm ml-auto">
                  Delete
                </button>
              </div>
            </div>
          ))}
          {companies.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              No companies yet. Add your first corporate account.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
