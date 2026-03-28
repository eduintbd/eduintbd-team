export interface Payment {
  id?: number;
  date: string;
  amount: number;
  payment_method: 'cash' | 'bkash' | 'bank';
  notes?: string;
  company_id?: number;
  employee_id?: number;
  company_name?: string;
  employee_name?: string;
  created_at?: string;
}

export interface CreatePaymentRequest {
  date: string;
  amount: number;
  payment_method: 'cash' | 'bkash' | 'bank';
  notes?: string;
  company_id?: number;
  employee_id?: number;
}
