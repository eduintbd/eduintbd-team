import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePayments, useDeletePayment } from '../hooks/usePayments';
import PaymentTable from '../components/PaymentTable';
import toast from 'react-hot-toast';

export default function PaymentList() {
  const [page, setPage] = useState(1);
  const { data: res, isLoading } = usePayments({ page });
  const deleteMutation = useDeletePayment();

  const handleDelete = (id: number) => {
    if (!confirm('Delete this payment?')) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Payment deleted'),
      onError: () => toast.error('Failed to delete'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Payments to Bhai Bhai Store</h2>
        <Link
          to="/payments/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + Record Payment
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : (
        <>
          <PaymentTable payments={res?.data || []} onDelete={handleDelete} />
          {res?.total > 20 && (
            <div className="flex justify-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border disabled:opacity-50">Previous</button>
              <span className="px-3 py-1 text-sm text-gray-600">Page {page}</span>
              <button disabled={page * 20 >= res.total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
