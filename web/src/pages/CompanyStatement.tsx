import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCompanyStatement } from '../hooks/useCorporate';
import { formatCurrency, formatDate } from '@bhai-store/shared';

export default function CompanyStatement() {
  const { id } = useParams();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data: res, isLoading } = useCompanyStatement(Number(id), from || undefined, to || undefined);

  if (isLoading) return <div className="text-center py-8 text-gray-400">Loading...</div>;

  const stmt = res?.data;
  if (!stmt) return <div className="text-center py-8 text-gray-400">Company not found</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/companies" className="text-purple-600 hover:underline text-sm">Corporate Accounts</Link>
          <h2 className="text-2xl font-bold text-gray-800">{stmt.company.name} - Corporate Statement</h2>
        </div>
        <div className="flex gap-2 items-center">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm" />
          <span className="text-gray-400">to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-600 text-xs font-medium">Outstanding Balance</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(stmt.outstanding_balance)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-blue-600 text-xs font-medium">Total Spent</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{formatCurrency(stmt.total_spent)}</p>
          <p className="text-blue-400 text-xs">{stmt.total_purchases} purchases</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-green-600 text-xs font-medium">Total Paid</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(stmt.total_paid + stmt.total_payments_made)}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-orange-600 text-xs font-medium">Total Credit</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">{formatCurrency(stmt.total_credit)}</p>
        </div>
      </div>

      {/* Company Info */}
      <div className="bg-white border rounded-xl p-6">
        <h3 className="font-semibold text-gray-700 mb-3">Company Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {stmt.company.address && <div><span className="text-gray-500">Address:</span> {stmt.company.address}</div>}
          {stmt.company.phone && <div><span className="text-gray-500">Phone:</span> {stmt.company.phone}</div>}
          {stmt.company.email && <div><span className="text-gray-500">Email:</span> {stmt.company.email}</div>}
          {stmt.company.contact_person && <div><span className="text-gray-500">Contact:</span> {stmt.company.contact_person}</div>}
        </div>
      </div>

      {/* Employee Breakdown */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-700">Employee-wise Breakdown</h3>
        </div>
        <table className="w-full">
          <thead className="border-b">
            <tr>
              <th className="text-left px-6 py-3 text-sm text-gray-600">Employee</th>
              <th className="text-left px-6 py-3 text-sm text-gray-600">Designation</th>
              <th className="text-right px-6 py-3 text-sm text-gray-600">Spent</th>
              <th className="text-right px-6 py-3 text-sm text-gray-600">Paid</th>
              <th className="text-right px-6 py-3 text-sm text-gray-600">Outstanding</th>
              <th className="text-right px-6 py-3 text-sm text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {stmt.employees.map((emp: any) => (
              <tr key={emp.employee_id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm font-medium">{emp.employee_name}</td>
                <td className="px-6 py-3 text-sm text-gray-500">{emp.designation || '-'}</td>
                <td className="px-6 py-3 text-sm text-right">{formatCurrency(emp.total_spent)}</td>
                <td className="px-6 py-3 text-sm text-right text-green-600">{formatCurrency(emp.total_paid + emp.total_payments_made)}</td>
                <td className="px-6 py-3 text-sm text-right font-medium text-red-600">{formatCurrency(emp.outstanding_balance)}</td>
                <td className="px-6 py-3 text-sm text-right">
                  <Link to={`/statements/employee/${emp.employee_id}`} className="text-purple-600 hover:underline">
                    Details
                  </Link>
                </td>
              </tr>
            ))}
            {stmt.employees.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No employees</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
