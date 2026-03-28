export interface Company {
  id?: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  is_active: boolean;
  created_at?: string;
}

export interface CreateCompanyRequest {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
}

export interface CompanyStatement {
  company: Company;
  total_purchases: number;
  total_spent: number;
  total_paid: number;
  total_credit: number;
  total_payments_made: number;
  outstanding_balance: number;
  employees: EmployeeStatementSummary[];
}

export interface EmployeeStatementSummary {
  employee_id: number;
  employee_name: string;
  designation?: string;
  total_spent: number;
  total_paid: number;
  total_credit: number;
  total_payments_made: number;
  outstanding_balance: number;
}
