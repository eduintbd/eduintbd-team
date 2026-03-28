import { useParams, Link } from 'react-router-dom';
import { usePurchase } from '../hooks/usePurchases';
import { formatCurrency, formatDate } from '@bhai-store/shared';

export default function PurchaseDetail() {
  const { id } = useParams();
  const { data: res, isLoading } = usePurchase(Number(id));

  if (isLoading) return <div className="text-center py-8 text-gray-400">Loading...</div>;

  const purchase = res?.data;
  if (!purchase) return <div className="text-center py-8 text-gray-400">Purchase not found</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Purchase #{purchase.id}</h2>
        <Link to="/purchases" className="text-primary-600 hover:underline text-sm">Back to list</Link>
      </div>

      <div className="bg-white border rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Date</p>
            <p className="font-medium">{formatDate(purchase.date)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-medium capitalize">{purchase.payment_status}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="font-medium text-lg">{formatCurrency(purchase.total_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Paid</p>
            <p className="font-medium text-green-600">{formatCurrency(purchase.paid_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Credit</p>
            <p className="font-medium text-red-600">{formatCurrency(purchase.credit_amount)}</p>
          </div>
          {purchase.notes && (
            <div>
              <p className="text-sm text-gray-500">Notes</p>
              <p className="font-medium">{purchase.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-700">Items</h3>
        </div>
        <table className="w-full">
          <thead className="border-b">
            <tr>
              <th className="text-left px-6 py-3 text-sm text-gray-600">Item</th>
              <th className="text-right px-6 py-3 text-sm text-gray-600">Qty</th>
              <th className="text-right px-6 py-3 text-sm text-gray-600">Unit Price</th>
              <th className="text-right px-6 py-3 text-sm text-gray-600">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {purchase.items?.map((item: any) => (
              <tr key={item.id}>
                <td className="px-6 py-3 text-sm">{item.item_name}</td>
                <td className="px-6 py-3 text-sm text-right">{item.quantity}</td>
                <td className="px-6 py-3 text-sm text-right">{formatCurrency(item.unit_price)}</td>
                <td className="px-6 py-3 text-sm text-right font-medium">{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
