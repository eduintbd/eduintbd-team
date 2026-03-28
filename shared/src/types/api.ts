export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface SummaryReport {
  total_purchases: number;
  total_spent: number;
  total_paid: number;
  total_credit: number;
  total_payments_made: number;
  outstanding_balance: number;
}

export interface MonthlyReport {
  month: string;
  year: number;
  total_spent: number;
  total_paid: number;
  total_credit: number;
  purchase_count: number;
}

export interface TopItem {
  item_name: string;
  total_quantity: number;
  total_spent: number;
  purchase_count: number;
}
