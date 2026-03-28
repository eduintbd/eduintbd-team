export interface Employee {
  id?: number;
  company_id: number;
  company_name?: string;
  name: string;
  designation?: string;
  phone?: string;
  is_active: boolean;
  created_at?: string;
}

export interface CreateEmployeeRequest {
  company_id: number;
  name: string;
  designation?: string;
  phone?: string;
}

export interface EmployeeStatement {
  employee: Employee;
  company_name: string;
  total_purchases: number;
  total_spent: number;
  total_paid: number;
  total_credit: number;
  total_payments_made: number;
  outstanding_balance: number;
  purchases: any[];
  payments: any[];
}
