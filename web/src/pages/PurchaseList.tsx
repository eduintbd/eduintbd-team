import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePurchases, useDeletePurchase } from '../hooks/usePurchases';
import PurchaseTable from '../components/PurchaseTable';
import toast from 'react-hot-toast';

export default function PurchaseList() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const { data: res, isLoading } = usePurchases({ status: statusFilter || undefined, page });
  const deleteMutation = useDeletePurchase();

  const handleDelete = (id: number) => {
    if (!confirm('Delete this purchase?')) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Purchase deleted'),
      onError: () => toast.error('Failed to delete'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Purchases</h2>
        <Link
          to="/purchases/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          + New Purchase
        </Link>
      </div>

      <div className="flex gap-2">
        {['', 'paid', 'credit', 'partial'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : (
        <>
          <PurchaseTable purchases={res?.data || []} onDelete={handleDelete} />
          {res?.total > 20 && (
            <div className="flex justify-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded border disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">Page {page}</span>
              <button
                disabled={page * 20 >= res.total}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded border disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
