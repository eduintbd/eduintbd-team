import { formatCurrency, formatDate } from '@bhai-store/shared';
import type { Payment } from '@bhai-store/shared';

interface Props {
  payments: Payment[];
  onDelete?: (id: number) => void;
  compact?: boolean;
}

export default function PaymentTable({ payments, onDelete, compact }: Props) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Date</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Amount</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Method</th>
            {!compact && <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Notes</th>}
            {!compact && <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y">
          {payments.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm">{formatDate(p.date)}</td>
              <td className="px-4 py-3 text-sm font-medium text-green-600">{formatCurrency(p.amount)}</td>
              <td className="px-4 py-3 text-sm capitalize">{p.payment_method}</td>
              {!compact && <td className="px-4 py-3 text-sm text-gray-500">{p.notes || '-'}</td>}
              {!compact && onDelete && (
                <td className="px-4 py-3 text-right">
                  <button onClick={() => onDelete(p.id!)} className="text-red-600 hover:underline text-sm">
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
          {payments.length === 0 && (
            <tr>
              <td colSpan={compact ? 3 : 5} className="px-4 py-8 text-center text-gray-400">
                No payments found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
