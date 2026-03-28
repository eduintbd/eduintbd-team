import { useState } from 'react';
import { useSummary, useMonthlyReport, useTopItems } from '../hooks/useReports';
import { formatCurrency, getMonthName } from '@bhai-store/shared';
import CreditSummaryCard from '../components/CreditSummaryCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Reports() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data: summaryRes } = useSummary();
  const { data: monthlyRes } = useMonthlyReport(year);
  const { data: topItemsRes } = useTopItems({ limit: 10 });

  const summary = summaryRes?.data;
  const monthly = (monthlyRes?.data || []).map((m: any) => ({
    ...m,
    name: getMonthName(Number(m.month)),
  }));
  const topItems = topItemsRes?.data || [];

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">Reports</h2>

      {summary && <CreditSummaryCard summary={summary} />}

      {/* Monthly Chart */}
      <div className="bg-white border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Monthly Expenses ({year})</h3>
          <div className="flex gap-2">
            <button onClick={() => setYear(y => y - 1)} className="px-3 py-1 rounded border text-sm hover:bg-gray-50">&larr; {year - 1}</button>
            <button onClick={() => setYear(y => y + 1)} disabled={year >= currentYear} className="px-3 py-1 rounded border text-sm hover:bg-gray-50 disabled:opacity-50">{year + 1} &rarr;</button>
          </div>
        </div>
        {monthly.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="total_spent" name="Total Spent" fill="#3b82f6" />
              <Bar dataKey="total_paid" name="Paid" fill="#22c55e" />
              <Bar dataKey="total_credit" name="Credit" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-gray-400">No data for {year}</div>
        )}
      </div>

      {/* Top Items */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-700">Top Purchased Items</h3>
        </div>
        <table className="w-full">
          <thead className="border-b">
            <tr>
              <th className="text-left px-6 py-3 text-sm text-gray-600">#</th>
              <th className="text-left px-6 py-3 text-sm text-gray-600">Item</th>
              <th className="text-right px-6 py-3 text-sm text-gray-600">Total Qty</th>
              <th className="text-right px-6 py-3 text-sm text-gray-600">Total Spent</th>
              <th className="text-right px-6 py-3 text-sm text-gray-600">Purchases</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {topItems.map((item: any, i: number) => (
              <tr key={item.item_name} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm text-gray-400">{i + 1}</td>
                <td className="px-6 py-3 text-sm font-medium">{item.item_name}</td>
                <td className="px-6 py-3 text-sm text-right">{item.total_quantity}</td>
                <td className="px-6 py-3 text-sm text-right font-medium">{formatCurrency(item.total_spent)}</td>
                <td className="px-6 py-3 text-sm text-right text-gray-500">{item.purchase_count}</td>
              </tr>
            ))}
            {topItems.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
