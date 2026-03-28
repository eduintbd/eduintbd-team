import { formatCurrency } from '@bhai-store/shared';
import type { SummaryReport } from '@bhai-store/shared';

interface Props {
  summary: SummaryReport;
}

export default function CreditSummaryCard({ summary }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-600 text-sm font-medium">Outstanding Balance</p>
        <p className="text-3xl font-bold text-red-700 mt-2">
          {formatCurrency(summary.outstanding_balance)}
        </p>
        <p className="text-red-400 text-xs mt-1">Payable to Bhai Bhai Store</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <p className="text-blue-600 text-sm font-medium">Total Spent</p>
        <p className="text-2xl font-bold text-blue-700 mt-2">
          {formatCurrency(summary.total_spent)}
        </p>
        <p className="text-blue-400 text-xs mt-1">{summary.total_purchases} purchases</p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <p className="text-green-600 text-sm font-medium">Total Paid</p>
        <p className="text-2xl font-bold text-green-700 mt-2">
          {formatCurrency(summary.total_paid + summary.total_payments_made)}
        </p>
        <p className="text-green-400 text-xs mt-1">At purchase + separate payments</p>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
        <p className="text-orange-600 text-sm font-medium">Total Credit Given</p>
        <p className="text-2xl font-bold text-orange-700 mt-2">
          {formatCurrency(summary.total_credit)}
        </p>
        <p className="text-orange-400 text-xs mt-1">Payments made: {formatCurrency(summary.total_payments_made)}</p>
      </div>
    </div>
  );
}
