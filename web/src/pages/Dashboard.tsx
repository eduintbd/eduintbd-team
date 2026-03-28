import { Link } from 'react-router-dom';
import { useSummary } from '../hooks/useReports';
import { usePurchases } from '../hooks/usePurchases';
import { usePayments } from '../hooks/usePayments';
import CreditSummaryCard from '../components/CreditSummaryCard';
import PurchaseTable from '../components/PurchaseTable';
import PaymentTable from '../components/PaymentTable';

export default function Dashboard() {
  const { data: summaryRes, isLoading: summaryLoading } = useSummary();
  const { data: purchasesRes } = usePurchases({ page: 1 });
  const { data: paymentsRes } = usePayments({ page: 1 });

  if (summaryLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  }

  const summary = summaryRes?.data;
  const recentPurchases = (purchasesRes?.data || []).slice(0, 5);
  const recentPayments = (paymentsRes?.data || []).slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <div className="flex gap-3">
          <Link
            to="/purchases/new"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            + New Purchase
          </Link>
          <Link
            to="/payments/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            + Record Payment
          </Link>
        </div>
      </div>

      {summary && <CreditSummaryCard summary={summary} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Recent Purchases</h3>
            <Link to="/purchases" className="text-primary-600 hover:underline text-sm">View all</Link>
          </div>
          <PurchaseTable purchases={recentPurchases} compact />
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Recent Payments</h3>
            <Link to="/payments" className="text-primary-600 hover:underline text-sm">View all</Link>
          </div>
          <PaymentTable payments={recentPayments} compact />
        </div>
      </div>
    </div>
  );
}
