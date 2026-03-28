import { formatCurrency, formatDate } from '@bhai-store/shared';
import type { Purchase } from '@bhai-store/shared';
import { Link } from 'react-router-dom';

interface Props {
  purchases: Purchase[];
  onDelete?: (id: number) => void;
  compact?: boolean;
}

const statusColors: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  credit: 'bg-red-100 text-red-700',
  partial: 'bg-yellow-100 text-yellow-700',
};

export default function PurchaseTable({ purchases, onDelete, compact }: Props) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Date</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Total</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Paid</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Credit</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
            {!compact && <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Notes</th>}
            {!compact && <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y">
          {purchases.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm">{formatDate(p.date)}</td>
              <td className="px-4 py-3 text-sm font-medium">{formatCurrency(p.total_amount)}</td>
              <td className="px-4 py-3 text-sm text-green-600">{formatCurrency(p.paid_amount)}</td>
              <td className="px-4 py-3 text-sm text-red-600">{formatCurrency(p.credit_amount)}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[p.payment_status]}`}>
                  {p.payment_status}
                </span>
              </td>
              {!compact && <td className="px-4 py-3 text-sm text-gray-500">{p.notes || '-'}</td>}
              {!compact && (
                <td className="px-4 py-3 text-right space-x-2">
                  <Link to={`/purchases/${p.id}`} className="text-primary-600 hover:underline text-sm">
                    View
                  </Link>
                  <Link to={`/purchases/${p.id}/edit`} className="text-blue-600 hover:underline text-sm">
                    Edit
                  </Link>
                  {onDelete && (
                    <button onClick={() => onDelete(p.id!)} className="text-red-600 hover:underline text-sm">
                      Delete
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
          {purchases.length === 0 && (
            <tr>
              <td colSpan={compact ? 5 : 7} className="px-4 py-8 text-center text-gray-400">
                No purchases found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
