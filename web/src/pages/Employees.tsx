import { useParams, Link } from 'react-router-dom';
import { useEmployees, useCompany, useDeleteEmployee } from '../hooks/useCorporate';
import toast from 'react-hot-toast';

export default function Employees() {
  const { companyId } = useParams();
  const cId = Number(companyId);
  const { data: companyRes } = useCompany(cId);
  const { data: res, isLoading } = useEmployees(cId);
  const deleteMutation = useDeleteEmployee();

  const company = companyRes?.data;
  const employees = res?.data || [];

  const handleDelete = (id: number) => {
    if (!confirm('Delete this employee?')) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Employee deleted'),
      onError: () => toast.error('Failed to delete'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/companies" className="text-purple-600 hover:underline text-sm">Corporate Accounts</Link>
          <h2 className="text-2xl font-bold text-gray-800">{company?.name || 'Company'} - Employees</h2>
        </div>
        <Link
          to={`/companies/${cId}/employees/new`}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + Add Employee
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Designation</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {employees.map((e: any) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{e.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{e.designation || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{e.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${e.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {e.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link to={`/statements/employee/${e.id}`} className="text-purple-600 hover:underline text-sm">Statement</Link>
                    <button onClick={() => handleDelete(e.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No employees yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
