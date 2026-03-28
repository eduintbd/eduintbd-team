import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEmployeeStatement } from '../hooks/useCorporate';
import { formatCurrency, formatDate } from '@bhai-store/shared';

export default function EmployeeStatement() {
  const { id } = useParams();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data: res, isLoading } = useEmployeeStatement(Number(id), from || undefined, to || undefined);

  if (isLoading) return <div className="text-center py-8 text-gray-400">Loading...</div>;

  const stmt = res?.data;
  if (!stmt) return <div className="text-center py-8 text-gray-400">Employee not found</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/companies" className="text-purple-600 hover:underline text-sm">Corporate Accounts</Link>
          <span className="text-gray-400 mx-2">/</span>
          <Link to={`/statements/company/${stmt.employee.company_id}`} className="text-purple-600 hover:underline text-sm">{stmt.company_name}</Link>
          <h2 className="text-2xl font-bold text-gray-800">{stmt.employee.name} - Individual Statement</h2>
          <p className="text-sm text-gray-500">{stmt.employee.designation || ''} at {stmt.company_name}</p>
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

      {/* Purchases Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-700">Purchases</h3>
        </div>
        <table className="w-full">
          <thead className="border-b">
            <tr>
              <th className="text-left px-6 py-3 text-sm text-gray-600">Date</th>
              <th className="text-right px-6 py-3 text-sm text-gray-600">Total</th>
              <th className="text-right px-6 py-3 text-sm text-gray-600">Paid</th>
              <th className="text-right px-6 py-3 text-sm text-gray-600">Credit</th>
              <th className="text-left px-6 py-3 text-sm text-gray-600">Status</th>
              <th className="text-left px-6 py-3 text-sm text-gray-600">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {stmt.purchases.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm">{formatDate(p.date)}</td>
                <td className="px-6 py-3 text-sm text-right font-medium">{formatCurrency(p.total_amount)}</td>
                <td className="px-6 py-3 text-sm text-right text-green-600">{formatCurrency(p.paid_amount)}</td>
                <td className="px-6 py-3 text-sm text-right text-red-600">{formatCurrency(p.credit_amount)}</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    p.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                    p.payment_status === 'credit' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {p.payment_status}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-500">{p.notes || '-'}</td>
              </tr>
            ))}
            {stmt.purchases.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No purchases</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Payments Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-700">Payments Made</h3>
        </div>
        <table className="w-full">
          <thead className="border-b">
            <tr>
              <th className="text-left px-6 py-3 text-sm text-gray-600">Date</th>
              <th className="text-right px-6 py-3 text-sm text-gray-600">Amount</th>
              <th className="text-left px-6 py-3 text-sm text-gray-600">Method</th>
              <th className="text-left px-6 py-3 text-sm text-gray-600">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {stmt.payments.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm">{formatDate(p.date)}</td>
                <td className="px-6 py-3 text-sm text-right font-medium text-green-600">{formatCurrency(p.amount)}</td>
                <td className="px-6 py-3 text-sm capitalize">{p.payment_method}</td>
                <td className="px-6 py-3 text-sm text-gray-500">{p.notes || '-'}</td>
              </tr>
            ))}
            {stmt.payments.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No payments</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
